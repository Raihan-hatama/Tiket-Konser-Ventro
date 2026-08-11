import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getEvents } from '@/api/events';
import { EventItem } from '@/types';
import { formatDate } from '@/utils/format';
import StatusBadge from '@/components/StatusBadge';

const PLACEHOLDER =
  'https://placehold.co/600x400/4F46E5/FFFFFF?text=Konser';

export default function HomeScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getEvents();
      setEvents(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Konser Mendatang</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={events}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !error ? (
            <Text style={styles.empty}>Belum ada event tersedia.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/event/${item.id}`)}
          >
            <Image
              source={{ uri: item.poster_url || PLACEHOLDER }}
              style={styles.poster}
            />
            <View style={styles.cardBody}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.cardMeta}>{formatDate(item.event_date)}</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                📍 {item.venue}
              </Text>
              {!!item.artists?.length && (
                <Text style={styles.cardArtists} numberOfLines={1}>
                  {item.artists.map((a) => a.name).join(', ')}
                </Text>
              )}
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
  listContent: { padding: 16, gap: 14 },
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
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  poster: { width: '100%', height: 160, backgroundColor: '#E5E7EB' },
  cardBody: { padding: 14, gap: 4 },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827', flex: 1 },
  cardMeta: { fontSize: 13, color: '#6B7280' },
  cardArtists: { fontSize: 13, color: '#4F46E5', fontWeight: '600', marginTop: 2 },
});
