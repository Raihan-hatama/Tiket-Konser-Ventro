import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getEvent } from '@/api/events';
import { useCart } from '@/context/CartContext';
import { EventItem, TicketCategory, CartItem } from '@/types';

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { setCheckout } = useCart();

  const [event, setEventData] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Menyimpan jumlah tiket berdasarkan ID kategori
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    if (!id) {
      setError('ID event tidak ditemukan');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await getEvent(Number(id));

      // Menyesuaikan kemungkinan bentuk response API
      const data = (result as any)?.data ?? result;

      setEventData(data);
    } catch (err: any) {
      console.error('Gagal mengambil detail event:', err);
      setError(err?.message || 'Gagal mengambil detail event');
    } finally {
      setLoading(false);
    }
  };

  const increaseQuantity = (category: TicketCategory) => {
    const current = quantities[category.id] || 0;

    const available =
      category.available ??
      Math.max(Number(category.quota) - Number(category.sold || 0), 0);

    if (current >= available) {
      Alert.alert(
        'Tiket tidak tersedia',
        `Sisa tiket ${category.name} hanya ${available}.`
      );
      return;
    }

    setQuantities((prev) => ({
      ...prev,
      [category.id]: current + 1,
    }));
  };

  const decreaseQuantity = (category: TicketCategory) => {
    const current = quantities[category.id] || 0;

    if (current <= 0) return;

    setQuantities((prev) => ({
      ...prev,
      [category.id]: current - 1,
    }));
  };

  const selectedCategories: TicketCategory[] = useMemo(() => {
    return (
      event?.categories?.filter(
        (category) => (quantities[category.id] || 0) > 0
      ) ?? []
    );
  }, [event?.categories, quantities]);

  const cartItems: CartItem[] = useMemo(() => {
    return selectedCategories.map((category) => ({
      ticket_category_id: category.id,
      name: category.name,
      price: Number(category.price),
      quantity: quantities[category.id] || 0,
    }));
  }, [selectedCategories, quantities]);

  const total = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      return sum + Number(item.price) * item.quantity;
    }, 0);
  }, [cartItems]);

  const totalQuantity = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      return sum + item.quantity;
    }, 0);
  }, [cartItems]);

  const handleCheckout = () => {
    if (!event) return;

    if (cartItems.length === 0) {
      Alert.alert(
        'Pilih tiket',
        'Silakan pilih minimal satu tiket terlebih dahulu.'
      );
      return;
    }

    setCheckout(event.id, event.title, cartItems);

    router.push('/checkout');
  };

  const formatPrice = (price: number) => {
    return `Rp ${Number(price).toLocaleString('id-ID')}`;
  };

  const formatDate = (date: string) => {
    if (!date) return '-';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Memuat detail event...</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={54} color="#EF4444" />

        <Text style={styles.errorTitle}>Gagal memuat event</Text>

        <Text style={styles.errorText}>
          {error || 'Event tidak ditemukan'}
        </Text>

        <Pressable style={styles.retryButton} onPress={loadEvent}>
          <Text style={styles.retryText}>Coba Lagi</Text>
        </Pressable>
      </View>
    );
  }

  const categories = event.categories ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Detail Event',
          headerBackTitle: 'Kembali',
        }}
      />

      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* POSTER */}
          {event.poster_url ? (
            <Image
              source={{ uri: event.poster_url }}
              style={styles.poster}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Ionicons
                name="musical-notes"
                size={60}
                color="#A5B4FC"
              />
              <Text style={styles.posterPlaceholderText}>
                Poster Event
              </Text>
            </View>
          )}

          {/* TITLE */}
          <Text style={styles.title}>{event.title}</Text>

          {/* EVENT INFO */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Text style={styles.iconText}>📅</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tanggal Event</Text>
              <Text style={styles.infoValue}>
                {formatDate(event.event_date)}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Text style={styles.iconText}>📍</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Lokasi</Text>
              <Text style={styles.infoValue}>{event.venue}</Text>
            </View>
          </View>

          {event.event_time ? (
            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Text style={styles.iconText}>⏰</Text>
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Waktu</Text>
                <Text style={styles.infoValue}>
                  {event.event_time}
                </Text>
              </View>
            </View>
          ) : null}

          {/* DESCRIPTION */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tentang Event</Text>

            <Text style={styles.description}>
              {event.description || 'Tidak ada deskripsi event.'}
            </Text>
          </View>

          {/* TICKET */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pilih Tiket</Text>

            {categories.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="ticket-outline"
                  size={42}
                  color="#9CA3AF"
                />

                <Text style={styles.emptyTitle}>
                  Tiket belum tersedia
                </Text>

                <Text style={styles.emptyText}>
                  Kategori tiket untuk event ini belum tersedia.
                </Text>
              </View>
            ) : (
              categories.map((category) => {
                const quantity = quantities[category.id] || 0;

                const available =
                  category.available ??
                  Math.max(
                    Number(category.quota) -
                      Number(category.sold || 0),
                    0
                  );

                const soldOut = available <= 0;

                return (
                  <View
                    key={category.id}
                    style={[
                      styles.ticketCard,
                      quantity > 0 && styles.ticketCardSelected,
                    ]}
                  >
                    <View style={styles.ticketTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ticketName}>
                          {category.name}
                        </Text>

                        <Text style={styles.ticketPrice}>
                          {formatPrice(category.price)}
                        </Text>

                        <Text style={styles.ticketStock}>
                          {soldOut
                            ? 'Tiket habis'
                            : `${available} tiket tersedia`}
                        </Text>
                      </View>

                      {quantity > 0 && (
                        <View style={styles.selectedBadge}>
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color="#4F46E5"
                          />
                        </View>
                      )}
                    </View>

                    <View style={styles.ticketBottom}>
                      <Text style={styles.quantityLabel}>
                        Jumlah
                      </Text>

                      <View style={styles.quantityContainer}>
                        <Pressable
                          style={[
                            styles.quantityButton,
                            quantity <= 0 &&
                              styles.quantityButtonDisabled,
                          ]}
                          disabled={quantity <= 0}
                          onPress={() =>
                            decreaseQuantity(category)
                          }
                        >
                          <Ionicons
                            name="remove"
                            size={20}
                            color={
                              quantity <= 0
                                ? '#9CA3AF'
                                : '#4F46E5'
                            }
                          />
                        </Pressable>

                        <Text style={styles.quantityText}>
                          {quantity}
                        </Text>

                        <Pressable
                          style={[
                            styles.quantityButton,
                            soldOut &&
                              styles.quantityButtonDisabled,
                          ]}
                          disabled={soldOut}
                          onPress={() =>
                            increaseQuantity(category)
                          }
                        >
                          <Ionicons
                            name="add"
                            size={20}
                            color={
                              soldOut ? '#9CA3AF' : '#4F46E5'
                            }
                          />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* INFO */}
          {categories.length > 0 && (
            <View style={styles.informationCard}>
              <Text style={styles.informationTitle}>
                🎟️ Informasi Tiket
              </Text>

              <Text style={styles.informationText}>
                Pilih kategori dan jumlah tiket yang ingin kamu
                beli. Pastikan jumlah tiket sudah sesuai sebelum
                melanjutkan ke checkout.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* BOTTOM CHECKOUT */}
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.totalLabel}>
              {totalQuantity} Tiket
            </Text>

            <Text style={styles.totalPrice}>
              {formatPrice(total)}
            </Text>
          </View>

          <Pressable
            style={[
              styles.checkoutButton,
              cartItems.length === 0 &&
                styles.checkoutButtonDisabled,
            ]}
            disabled={cartItems.length === 0}
            onPress={handleCheckout}
          >
            <Text style={styles.checkoutText}>
              Pilih Tiket
            </Text>

            <Ionicons
              name="arrow-forward"
              size={20}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    padding: 20,
    paddingBottom: 130,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },

  errorTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  errorText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    color: '#6B7280',
  },

  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  poster: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    marginBottom: 20,
    backgroundColor: '#E5E7EB',
  },

  posterPlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
  },

  posterPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 20,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    marginRight: 14,
  },

  iconText: {
    fontSize: 23,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  section: {
    marginTop: 28,
  },

  sectionTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 14,
  },

  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#6B7280',
  },

  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  ticketCardSelected: {
    borderColor: '#6366F1',
    borderWidth: 2,
  },

  ticketTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  ticketName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },

  ticketPrice: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '800',
    color: '#4F46E5',
  },

  ticketStock: {
    marginTop: 5,
    fontSize: 13,
    color: '#6B7280',
  },

  selectedBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
  },

  ticketBottom: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  quantityLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },

  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  quantityButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
  },

  quantityButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },

  quantityText: {
    minWidth: 22,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },

  emptyCard: {
    padding: 28,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    color: '#9CA3AF',
  },

  informationCard: {
    marginTop: 24,
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
  },

  informationTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#4338CA',
    marginBottom: 8,
  },

  informationText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#6366F1',
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  totalLabel: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  totalPrice: {
    marginTop: 3,
    fontSize: 19,
    fontWeight: '900',
    color: '#111827',
  },

  checkoutButton: {
    minWidth: 170,
    height: 54,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  checkoutButtonDisabled: {
    backgroundColor: '#C7D2FE',
  },

  checkoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});