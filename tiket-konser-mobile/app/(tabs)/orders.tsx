import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter, Redirect } from "expo-router";

import { getOrders } from "@/api/orders";
import { getMyTickets } from "@/api/tickets";
import { MyTicket, Order } from "@/types";
import { formatDate, formatRupiah, formatTime } from "@/utils/format";
import StatusBadge from "@/components/StatusBadge";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuth } from "@/context/AuthContext";

type ViewMode = "tickets" | "orders";

export default function OrdersScreen() {
  const router = useRouter();

  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [view, setView] = useState<ViewMode>("tickets");
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setError(null);

      const [ticketData, orderData] = await Promise.all([
        getMyTickets(),
        getOrders(),
      ]);

      setTickets(ticketData);
      setOrders(orderData);
    } catch (err: any) {
      setError(err.message);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;

      (async () => {
        setLoading(true);
        await load();
        setLoading(false);
      })();
    }, [load, isAuthenticated])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Authentication guard
  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const header = (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Tiket Saya</Text>
      <Text style={styles.headerSubtitle}>
        Tunjukkan QR tiket ini kepada petugas saat masuk konser.
      </Text>

      <View style={styles.segment}>
        <Pressable
          style={[
            styles.segmentItem,
            view === "tickets" && styles.segmentItemActive,
          ]}
          onPress={() => setView("tickets")}
        >
          <Text
            style={[
              styles.segmentText,
              view === "tickets" && styles.segmentTextActive,
            ]}
          >
            Tiket ({tickets.length})
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.segmentItem,
            view === "orders" && styles.segmentItemActive,
          ]}
          onPress={() => setView("orders")}
        >
          <Text
            style={[
              styles.segmentText,
              view === "orders" && styles.segmentTextActive,
            ]}
          >
            Pesanan ({orders.length})
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const errorBox = error ? (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  ) : null;

  if (view === "orders") {
    return (
      <View style={styles.screen}>
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <>
              {header}
              {errorBox}
            </>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              Belum ada pesanan. Yuk pilih tiket konser favoritmu!
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.orderCard}
              onPress={() => router.push(`/order/${item.id}`)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.orderCode}>{item.order_code}</Text>
                <StatusBadge status={item.status} />
              </View>

              <Text style={styles.orderTitle}>
                {item.event_title || "Event"}
              </Text>

              <View style={styles.cardBottom}>
                <Text style={styles.date}>
                  {formatDate(item.created_at)}
                </Text>
                <Text style={styles.price}>
                  {formatRupiah(item.total_price)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={tickets}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            {header}
            {errorBox}
          </>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            Belum ada tiket. Tiket akan muncul otomatis setelah pembayaran
            berhasil dikonfirmasi.
          </Text>
        }
        renderItem={({ item }) => {
          const showQr =
            !!item.qr_code_url &&
            (item.status === "active" || item.status === "used");

          return (
            <Pressable
              style={styles.ticketCard}
              onPress={() =>
                item.order_id
                  ? router.push(`/order/${item.order_id}`)
                  : undefined
              }
            >
              <View style={styles.ticketHeader}>
                {item.poster_url ? (
                  <Image
                    source={{ uri: item.poster_url }}
                    style={styles.poster}
                  />
                ) : (
                  <View style={[styles.poster, styles.posterFallback]}>
                    <Text style={styles.posterFallbackText}>VENTRO</Text>
                  </View>
                )}

                <View style={styles.ticketHeadInfo}>
                  <StatusBadge status={item.status} />

                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {item.event_title || "Event"}
                  </Text>

                  <Text style={styles.meta} numberOfLines={1}>
                    📅{" "}
                    {item.event_date
                      ? formatDate(item.event_date)
                      : "Tanggal menyusul"}
                  </Text>

                  {item.event_time ? (
                    <Text style={styles.meta} numberOfLines={1}>
                      🕒 {formatTime(item.event_time)}
                    </Text>
                  ) : null}

                  <Text style={styles.meta} numberOfLines={1}>
                    📍 {item.venue || "-"}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.ticketBody}>
                <View style={styles.qrWrap}>
                  {showQr ? (
                    <Image
                      source={{ uri: item.qr_code_url! }}
                      style={[
                        styles.qr,
                        item.status === "used" && styles.qrUsed,
                      ]}
                    />
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <Text style={styles.qrPlaceholderText}>
                        {item.status === "cancelled"
                          ? "TIKET DIBATALKAN"
                          : "MENUNGGU PEMBAYARAN"}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.ticketDetail}>
                  <Text style={styles.label}>KATEGORI</Text>
                  <Text style={styles.value}>
                    {item.category_name || "-"}
                  </Text>

                  <Text style={styles.label}>PEMILIK</Text>
                  <Text style={styles.value} numberOfLines={1}>
                    {item.customer_name || "-"}
                  </Text>

                  <Text style={styles.label}>KODE TIKET</Text>
                  <Text style={styles.code}>{item.ticket_code}</Text>

                  {item.status === "used" && item.used_at ? (
                    <Text style={styles.usedAt}>
                      Dipakai: {formatDate(item.used_at)}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingTop: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#111827" },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 19,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    padding: 4,
    marginTop: 16,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
  },
  segmentItemActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  segmentTextActive: { color: "#4F46E5" },
  listContent: { padding: 16, gap: 12, paddingBottom: 32 },
  errorBox: {
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
  },
  errorText: { color: "#991B1B" },
  empty: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 40,
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  // Pesanan
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderCode: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  orderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  date: { fontSize: 12, color: "#9CA3AF" },
  price: { fontSize: 15, fontWeight: "700", color: "#4F46E5" },

  // Tiket
  ticketCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF0F4",
  },
  ticketHeader: { flexDirection: "row", gap: 12 },
  poster: {
    width: 86,
    height: 110,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  posterFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  posterFallbackText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  ticketHeadInfo: { flex: 1, gap: 3 },
  eventTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },
  meta: { fontSize: 12, color: "#6B7280" },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  ticketBody: { flexDirection: "row", gap: 14, alignItems: "center" },
  qrWrap: {
    width: 138,
    alignItems: "center",
    justifyContent: "center",
  },
  qr: { width: 138, height: 138, borderRadius: 8 },
  qrUsed: { opacity: 0.28 },
  qrPlaceholder: {
    width: 138,
    height: 138,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  qrPlaceholderText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "#9CA3AF",
    textAlign: "center",
  },
  ticketDetail: { flex: 1, gap: 2 },
  label: {
    fontSize: 9,
    letterSpacing: 1.1,
    fontWeight: "700",
    color: "#9CA3AF",
    marginTop: 6,
  },
  value: { fontSize: 13, fontWeight: "600", color: "#111827" },
  code: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#111827",
  },
  usedAt: { fontSize: 11, color: "#4F46E5", marginTop: 6, fontWeight: "600" },
});
