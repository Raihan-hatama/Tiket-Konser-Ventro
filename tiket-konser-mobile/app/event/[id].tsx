import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { getEvents } from "../../src/api/events";
import { EventItem } from "../../src/types";
import { formatDate, formatRupiah } from "../../src/utils/format";
import StatusBadge from "../../src/components/StatusBadge";
import PrimaryButton from "../../src/components/PrimaryButton";

const PLACEHOLDER =
  "https://placehold.co/600x400/4F46E5/FFFFFF?text=Konser";

interface TicketCategory {
  id: number;
  name: string;
  price: number;
  quota: number;
  sold: number;
}

interface SelectedTicket {
  ticket_category_id: number;
  quantity: number;
}

export default function EventDetailScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{ id: string }>();

  const [event, setEventData] = useState<EventItem | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [selectedTickets, setSelectedTickets] = useState<
    SelectedTicket[]
  >([]);

  /**
   * Ambil detail event
   */
  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const events = await getEvents();

      const found = events.find(
        (item: EventItem) =>
          String(item.id) === String(params.id)
      );

      if (!found) {
        setError("Event tidak ditemukan.");
        return;
      }

      setEventData(found);
    } catch (err: any) {
      console.error("Gagal mengambil event:", err);

      setError(
        err?.message || "Gagal mengambil data event."
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  /**
   * Ambil kategori tiket dari event.
   *
   * Karena EventItem kamu mungkin belum memiliki
   * property ticket_categories, sementara kita
   * gunakan casting any.
   */
  const ticketCategories: TicketCategory[] =
    ((event as any)?.ticket_categories ||
      (event as any)?.ticketCategories ||
      []) as TicketCategory[];

  /**
   * Jumlah tiket yang dipilih berdasarkan category ID
   */
  const getQuantity = (categoryId: number) => {
    const selected = selectedTickets.find(
      (item) =>
        item.ticket_category_id === categoryId
    );

    return selected?.quantity || 0;
  };

  /**
   * Tambah tiket
   */
  const increaseTicket = (category: TicketCategory) => {
    const available =
      Number(category.quota || 0) -
      Number(category.sold || 0);

    const currentQuantity = getQuantity(category.id);

    if (available <= 0) {
      Alert.alert(
        "Tiket Habis",
        `Tiket ${category.name} sudah habis.`
      );
      return;
    }

    if (currentQuantity >= available) {
      Alert.alert(
        "Stok Tidak Cukup",
        `Tiket yang tersedia hanya ${available}.`
      );
      return;
    }

    setSelectedTickets((prev) => {
      const exists = prev.find(
        (item) =>
          item.ticket_category_id === category.id
      );

      if (exists) {
        return prev.map((item) =>
          item.ticket_category_id === category.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...prev,
        {
          ticket_category_id: category.id,
          quantity: 1,
        },
      ];
    });
  };

  /**
   * Kurangi tiket
   */
  const decreaseTicket = (categoryId: number) => {
    setSelectedTickets((prev) => {
      const exists = prev.find(
        (item) =>
          item.ticket_category_id === categoryId
      );

      if (!exists) {
        return prev;
      }

      if (exists.quantity <= 1) {
        return prev.filter(
          (item) =>
            item.ticket_category_id !== categoryId
        );
      }

      return prev.map((item) =>
        item.ticket_category_id === categoryId
          ? {
              ...item,
              quantity: item.quantity - 1,
            }
          : item
      );
    });
  };

  /**
   * Total jumlah tiket
   */
  const totalTicketQuantity = selectedTickets.reduce(
    (total, item) => total + item.quantity,
    0
  );

  /**
   * Total harga tiket
   */
  const totalPrice = selectedTickets.reduce(
    (total, selected) => {
      const category = ticketCategories.find(
        (item) =>
          item.id === selected.ticket_category_id
      );

      if (!category) {
        return total;
      }

      return (
        total +
        Number(category.price || 0) *
          selected.quantity
      );
    },
    0
  );

  /**
   * Tombol pilih tiket
   */
  const handleBuy = () => {
    if (!event) {
      return;
    }

    /**
     * Event harus open
     */
    if (event.status !== "open") {
      Alert.alert(
        "Penjualan Ditutup",
        "Tiket untuk event ini belum tersedia atau penjualannya sudah ditutup."
      );

      return;
    }

    /**
     * Pastikan user memilih tiket
     */
    if (selectedTickets.length === 0) {
      Alert.alert(
        "Pilih Tiket",
        "Silakan pilih minimal 1 tiket terlebih dahulu."
      );

      return;
    }

    /**
     * Kirim data tiket ke checkout
     */
    const itemsParam = encodeURIComponent(
      JSON.stringify(selectedTickets)
    );

    router.push(
      `/checkout?eventId=${event.id}&title=${encodeURIComponent(
        event.title
      )}&items=${itemsParam}`
    );
  };

  /**
   * Loading
   */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#4F46E5"
        />

        <Text style={styles.loadingText}>
          Memuat event...
        </Text>
      </View>
    );
  }

  /**
   * Error
   */
  if (error || !event) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>
          Event tidak ditemukan
        </Text>

        <Text style={styles.errorText}>
          {error || "Data event tidak tersedia."}
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            Kembali
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* =========================
            POSTER
        ========================== */}
        <Image
          source={{
            uri:
              event.poster_url || PLACEHOLDER,
          }}
          style={styles.poster}
          resizeMode="cover"
        />

        {/* =========================
            DETAIL EVENT
        ========================== */}
        <View style={styles.body}>
          {/* Status */}
          <View style={styles.statusRow}>
            <StatusBadge status={event.status} />
          </View>

          {/* Judul */}
          <Text style={styles.title}>
            {event.title}
          </Text>

          {/* =========================
              TANGGAL
          ========================== */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>
              📅
            </Text>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                Tanggal Event
              </Text>

              <Text style={styles.infoValue}>
                {formatDate(event.event_date)}
              </Text>
            </View>
          </View>

          {/* =========================
              VENUE
          ========================== */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>
              📍
            </Text>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                Lokasi
              </Text>

              <Text style={styles.infoValue}>
                {event.venue ||
                  "Lokasi belum tersedia"}
              </Text>
            </View>
          </View>

          {/* =========================
              ARTIST
          ========================== */}
          {!!event.artists?.length && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Artis
              </Text>

              {event.artists.map((artist) => (
                <View
                  key={String(artist.id)}
                  style={styles.artistCard}
                >
                  <View style={styles.artistAvatar}>
                    <Text
                      style={
                        styles.artistAvatarText
                      }
                    >
                      {artist.name
                        ?.charAt(0)
                        ?.toUpperCase() || "A"}
                    </Text>
                  </View>

                  <Text
                    style={styles.artistName}
                  >
                    {artist.name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* =========================
              DESKRIPSI
          ========================== */}
          {!!(event as any).description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Tentang Event
              </Text>

              <Text style={styles.description}>
                {(event as any).description}
              </Text>
            </View>
          )}

          {/* =========================
              PILIH TIKET
          ========================== */}
          <View style={styles.section}>
            <View style={styles.ticketHeader}>
              <Text style={styles.sectionTitle}>
                Pilih Tiket
              </Text>

              {totalTicketQuantity > 0 && (
                <Text style={styles.selectedText}>
                  {totalTicketQuantity} tiket
                </Text>
              )}
            </View>

            {ticketCategories.length > 0 ? (
              ticketCategories.map(
                (category) => {
                  const available =
                    Number(category.quota || 0) -
                    Number(category.sold || 0);

                  const quantity =
                    getQuantity(category.id);

                  const isSoldOut =
                    available <= 0;

                  return (
                    <View
                      key={String(category.id)}
                      style={[
                        styles.ticketCard,
                        isSoldOut &&
                          styles.ticketCardDisabled,
                      ]}
                    >
                      {/* Info tiket */}
                      <View
                        style={
                          styles.ticketInfo
                        }
                      >
                        <Text
                          style={
                            styles.ticketName
                          }
                        >
                          {category.name}
                        </Text>

                        <Text
                          style={
                            styles.ticketPrice
                          }
                        >
                          {formatRupiah(
                            Number(
                              category.price || 0
                            )
                          )}
                        </Text>

                        <Text
                          style={
                            isSoldOut
                              ? styles.ticketSoldOut
                              : styles.ticketStock
                          }
                        >
                          {isSoldOut
                            ? "Tiket habis"
                            : `${available} tiket tersedia`}
                        </Text>
                      </View>

                      {/* Quantity */}
                      {!isSoldOut && (
                        <View
                          style={
                            styles.quantityContainer
                          }
                        >
                          <Pressable
                            style={
                              styles.quantityButton
                            }
                            onPress={() =>
                              decreaseTicket(
                                category.id
                              )
                            }
                            disabled={
                              quantity === 0
                            }
                          >
                            <Text
                              style={[
                                styles.quantityButtonText,
                                quantity === 0 &&
                                  styles.quantityButtonDisabled,
                              ]}
                            >
                              −
                            </Text>
                          </Pressable>

                          <Text
                            style={
                              styles.quantityText
                            }
                          >
                            {quantity}
                          </Text>

                          <Pressable
                            style={
                              styles.quantityButton
                            }
                            onPress={() =>
                              increaseTicket(
                                category
                              )
                            }
                          >
                            <Text
                              style={
                                styles.quantityButtonText
                              }
                            >
                              +
                            </Text>
                          </Pressable>
                        </View>
                      )}

                      {isSoldOut && (
                        <View
                          style={
                            styles.soldOutBadge
                          }
                        >
                          <Text
                            style={
                              styles.soldOutBadgeText
                            }
                          >
                            HABIS
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                }
              )
            ) : (
              <View style={styles.emptyTicket}>
                <Text
                  style={
                    styles.emptyTicketTitle
                  }
                >
                  Tiket belum tersedia
                </Text>

                <Text
                  style={
                    styles.emptyTicketText
                  }
                >
                  Kategori tiket untuk event ini
                  belum tersedia.
                </Text>
              </View>
            )}
          </View>

          {/* =========================
              RINGKASAN
          ========================== */}
          {totalTicketQuantity > 0 && (
            <View style={styles.summaryCard}>
              <View>
                <Text
                  style={styles.summaryLabel}
                >
                  Total Tiket
                </Text>

                <Text
                  style={styles.summaryQuantity}
                >
                  {totalTicketQuantity} tiket
                </Text>
              </View>

              <View style={styles.summaryRight}>
                <Text
                  style={styles.summaryLabel}
                >
                  Total
                </Text>

                <Text
                  style={styles.summaryPrice}
                >
                  {formatRupiah(totalPrice)}
                </Text>
              </View>
            </View>
          )}

          {/* =========================
              CATATAN
          ========================== */}
          <View style={styles.note}>
            <Text style={styles.noteTitle}>
              🎟️ Informasi Tiket
            </Text>

            <Text style={styles.noteText}>
              Pilih kategori dan jumlah tiket
              yang ingin kamu beli. Pastikan
              jumlah tiket sudah sesuai sebelum
              melanjutkan ke checkout.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* =========================
          BOTTOM BUTTON
      ========================== */}
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <View>
            <Text style={styles.footerLabel}>
              Total
            </Text>

            <Text style={styles.footerPrice}>
              {formatRupiah(totalPrice)}
            </Text>
          </View>

          <View style={styles.footerButton}>
            <PrimaryButton
              title={
                totalTicketQuantity > 0
                  ? "Lanjut Checkout"
                  : "Pilih Tiket"
              }
              onPress={handleBuy}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F9FAFB",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },

  errorText: {
    textAlign: "center",
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
  },

  backButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },

  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  content: {
    paddingBottom: 150,
  },

  poster: {
    width: "100%",
    height: 260,
    backgroundColor: "#E5E7EB",
  },

  body: {
    padding: 20,
  },

  statusRow: {
    marginBottom: 10,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
  },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 3,

    elevation: 1,
  },

  infoIcon: {
    fontSize: 24,
    marginRight: 14,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 3,
  },

  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  section: {
    marginTop: 24,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },

  artistCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },

  artistAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  artistAvatarText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#4F46E5",
  },

  artistName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  description: {
    fontSize: 14,
    lineHeight: 22,
    color: "#6B7280",
  },

  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectedText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4F46E5",
    marginBottom: 12,
  },

  ticketCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,

    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 5,

    elevation: 2,
  },

  ticketCardDisabled: {
    opacity: 0.65,
  },

  ticketInfo: {
    flex: 1,
    paddingRight: 12,
  },

  ticketName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 5,
  },

  ticketPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#4F46E5",
    marginBottom: 5,
  },

  ticketStock: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "600",
  },

  ticketSoldOut: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "700",
  },

  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  quantityButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },

  quantityButtonText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4F46E5",
    lineHeight: 25,
  },

  quantityButtonDisabled: {
    color: "#C7D2FE",
  },

  quantityText: {
    minWidth: 24,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  soldOutBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },

  soldOutBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#DC2626",
  },

  emptyTicket: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
  },

  emptyTicketTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 5,
  },

  emptyTicketText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },

  summaryCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#111827",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 4,
  },

  summaryQuantity: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  summaryRight: {
    alignItems: "flex-end",
  },

  summaryPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  note: {
    marginTop: 20,
    backgroundColor: "#EEF2FF",
    padding: 16,
    borderRadius: 14,
  },

  noteTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#3730A3",
    marginBottom: 5,
  },

  noteText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#4F46E5",
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  footerLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 2,
  },

  footerPrice: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  footerButton: {
    width: 170,
  },
});