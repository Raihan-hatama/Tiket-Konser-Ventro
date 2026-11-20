import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getEvents } from '@/api/events';
import { EventItem } from '@/types';
import { formatDate } from '@/utils/format';
import StatusBadge from '@/components/StatusBadge';

const COLORS = {
  accent: '#4F46E5',
  accentSoft: '#EEF2FF',
  screen: '#F9FAFB',
  card: '#FFFFFF',
  ink: '#111827',
  muted: '#6B7280',
  faint: '#9CA3AF',
  line: '#E5E7EB',
  soft: '#F3F4F6',
};

export default function HomeScreen() {
  const router = useRouter();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getEvents();
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat daftar konser.');
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

  const retry = async () => {
    setLoading(true);
    await load();
    setLoading(false);
  };

  const filteredEvents = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) return events;

    return events.filter((event) => {
      const artists = (event.artists ?? []).map((artist) => artist.name).join(' ');

      return [event.title, event.venue, artists]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [events, query]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Konser Mendatang</Text>
        <Text style={styles.headerSubtitle}>
          Temukan konser favoritmu, lalu pesan tiketnya di sini.
        </Text>
      </View>

      {/* ---- pencarian ---- */}
      <View style={styles.searchBar}>
        <Feather name="search" size={17} color={COLORS.faint} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Cari konser, artis, atau lokasi..."
          placeholderTextColor={COLORS.faint}
          autoCorrect={false}
          returnKeyType="search"
        />
        {!!query && (
          <Pressable
            onPress={() => setQuery('')}
            hitSlop={10}
            accessibilityLabel="Hapus pencarian"
          >
            <Feather name="x-circle" size={17} color={COLORS.faint} />
          </Pressable>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Feather name="wifi-off" size={17} color="#991B1B" />
          <View style={styles.errorBody}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={retry} hitSlop={8}>
              <Text style={styles.errorRetry}>Coba lagi</Text>
            </Pressable>
          </View>
        </View>
      )}

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
        ListHeaderComponent={
          !error ? (
            <Text style={styles.countText}>
              {query
                ? `${filteredEvents.length} hasil untuk "${query.trim()}"`
                : `${events.length} konser tersedia`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          !error ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather
                  name={query ? 'search' : 'calendar'}
                  size={24}
                  color={COLORS.accent}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {query ? 'Konser tidak ditemukan' : 'Belum ada konser'}
              </Text>
              <Text style={styles.emptyText}>
                {query
                  ? 'Coba kata kunci lain, atau hapus pencarian untuk melihat semua konser.'
                  : 'Daftar konser akan muncul di sini setelah diumumkan.'}
              </Text>

              {!!query && (
                <Pressable
                  onPress={() => setQuery('')}
                  style={styles.emptyAction}
                >
                  <Text style={styles.emptyActionText}>Hapus pencarian</Text>
                </Pressable>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(`/event/${item.id}`)}
          >
            {item.poster_url ? (
              <Image source={{ uri: item.poster_url }} style={styles.poster} />
            ) : (
              <View style={[styles.poster, styles.posterFallback]}>
                <Text style={styles.posterFallbackText}>VENTRO</Text>
              </View>
            )}

            <View style={styles.cardBody}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <StatusBadge status={item.status} />
              </View>

              <View style={styles.metaRow}>
                <Feather name="calendar" size={13} color={COLORS.faint} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {formatDate(item.event_date)}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Feather name="map-pin" size={13} color={COLORS.faint} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.venue || 'Lokasi menyusul'}
                </Text>
              </View>

              {!!item.artists?.length && (
                <Text style={styles.cardArtists} numberOfLines={1}>
                  {item.artists.map((artist) => artist.name).join(', ')}
                </Text>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.detailText}>Lihat detail</Text>
                <Feather name="chevron-right" size={16} color={COLORS.accent} />
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.screen },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.ink },
  headerSubtitle: { fontSize: 13, color: COLORS.muted, marginTop: 4 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.ink,
    paddingVertical: 0,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  errorBody: { flex: 1 },
  errorText: { color: '#991B1B', fontSize: 13, lineHeight: 18 },
  errorRetry: {
    marginTop: 6,
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  listContent: { padding: 16, paddingBottom: 32, gap: 14 },
  countText: {
    fontSize: 12,
    color: COLORS.faint,
    marginBottom: 2,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardPressed: { opacity: 0.9 },
  poster: {
    width: '100%',
    height: 170,
    backgroundColor: COLORS.line,
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.ink,
  },
  posterFallbackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
  },
  cardBody: { padding: 14, gap: 6 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.ink,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: { flex: 1, fontSize: 13, color: COLORS.muted },
  cardArtists: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.soft,
  },
  detailText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.accent,
  },

  empty: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.muted,
    textAlign: 'center',
  },
  emptyAction: { marginTop: 14, paddingVertical: 6, paddingHorizontal: 4 },
  emptyActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
    textDecorationLine: 'underline',
  },
});
