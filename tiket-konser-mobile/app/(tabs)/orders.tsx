import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter, Redirect } from "expo-router";

import { getOrders } from "@/api/orders";
import { Order } from "@/types";
import { formatDate, formatRupiah } from "@/utils/format";
import StatusBadge from "@/components/StatusBadge";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuth } from "@/context/AuthContext";

export default function OrdersScreen() {
  const router = useRouter();

  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setError(null);

      const data = await getOrders();
      setOrders(data);
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
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Pesanan Saya</Text>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <Text style={styles.empty}>
              Belum ada pesanan. Yuk pilih tiket konser favoritmu!
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/order/${item.id}`)}
          >
            <View style={styles.cardTop}>
              <Text style={styles.orderCode}>{item.order_code}</Text>
              <StatusBadge status={item.status} />
            </View>

            <Text style={styles.eventTitle}>{item.event_title || 'Event'}</Text>

            <View style={styles.cardBottom}>
              <Text style={styles.date}>{formatDate(item.created_at)}</Text>
              <Text style={styles.price}>{formatRupiah(item.total_price)}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  listContent: { padding: 16, gap: 12 },
  errorBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
  },
  errorText: { color: '#991B1B' },
  empty: { textAlign: 'center', color: '#6B7280', marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderCode: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  eventTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  date: { fontSize: 12, color: '#9CA3AF' },
  price: { fontSize: 15, fontWeight: '700', color: '#4F46E5' },
});
