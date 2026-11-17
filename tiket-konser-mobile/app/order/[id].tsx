import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { getOrder } from '@/api/orders';
import { uploadPaymentProof } from '@/api/payments';
import { resolveAssetUrl } from '@/api/events';
import { Order } from '@/types';
import { formatDate, formatRupiah, formatTime } from '@/utils/format';
import StatusBadge from '@/components/StatusBadge';
import PrimaryButton from '@/components/PrimaryButton';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getOrder(id);
      setOrder(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const handlePickAndUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin diperlukan', 'Izinkan akses galeri untuk upload bukti transfer.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      await uploadPaymentProof(id, result.assets[0]);
      Alert.alert('Berhasil', 'Bukti transfer berhasil diupload. Menunggu verifikasi admin.');
      await load();
    } catch (err: any) {
      Alert.alert('Upload gagal', err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Pesanan tidak ditemukan'}</Text>
      </View>
    );
  }

  const paymentStatus = order.payment?.status ?? 'pending';
  const canUpload = paymentStatus === 'pending' || paymentStatus === 'rejected';

  const hasTickets = (order.items ?? []).some(
    (item) => (item.tickets ?? []).length > 0
  );

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.headerCard}>
        {order.event_poster_url ? (
          <Image
            source={{ uri: resolveAssetUrl(order.event_poster_url)! }}
            style={styles.eventPoster}
          />
        ) : null}

        <View style={styles.headerTop}>
          <Text style={styles.orderCode}>{order.order_code}</Text>
          <StatusBadge status={order.status} />
        </View>

        <Text style={styles.eventTitle}>{order.event_title}</Text>

        <Text style={styles.meta}>
          📅{' '}
          {order.event_date ? formatDate(order.event_date) : 'Tanggal menyusul'}
        </Text>

        {order.event_time ? (
          <Text style={styles.meta}>🕒 {formatTime(order.event_time)}</Text>
        ) : null}

        <Text style={styles.meta}>📍 {order.venue || '-'}</Text>

        <Text style={styles.customer}>
          Atas nama: {order.customer_name || '-'}
        </Text>

        <Text style={styles.date}>Dipesan {formatDate(order.created_at)}</Text>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Pembayaran</Text>
          <Text style={styles.totalValue}>{formatRupiah(order.total_price)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Pembayaran</Text>
          <StatusBadge status={paymentStatus} />
        </View>

        {order.payment?.proof_url ? (
          <Image source={{ uri: order.payment.proof_url }} style={styles.proofImage} />
        ) : (
          <Text style={styles.hint}>Belum ada bukti transfer yang diupload.</Text>
        )}

        {canUpload && (
          <PrimaryButton
            title={
              order.payment?.proof_url
                ? 'Upload Ulang Bukti Transfer'
                : 'Upload Bukti Transfer'
            }
            onPress={handlePickAndUpload}
            loading={uploading}
            style={{ marginTop: 12 }}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tiket Kamu</Text>

        {!hasTickets ? (
          <Text style={styles.hint}>
            {order.status === 'paid'
              ? 'Tiket sedang disiapkan. Tarik untuk menyegarkan halaman ini.'
              : 'Tiket dan QR akan muncul otomatis setelah pembayaran berhasil dikonfirmasi.'}
          </Text>
        ) : null}

        {(order.items ?? []).map((item) => {
          const itemTickets = item.tickets ?? [];

          if (itemTickets.length === 0) return null;

          return (
            <View key={item.id} style={styles.itemBlock}>
              <Text style={styles.itemName}>
                {item.category_name} × {item.quantity}
              </Text>

              {itemTickets.map((ticket) => {
                const showQr =
                  !!ticket.qr_code_url &&
                  (ticket.status === 'active' || ticket.status === 'used');

                return (
                  <View
                    key={ticket.id ?? ticket.ticket_code}
                    style={styles.ticketCard}
                  >
                    <View style={styles.ticketTopRow}>
                      <Text style={styles.ticketCategory}>
                        {item.category_name}
                      </Text>
                      <StatusBadge status={ticket.status} />
                    </View>

                    {showQr ? (
                      <Image
                        source={{ uri: resolveAssetUrl(ticket.qr_code_url)! }}
                        style={[
                          styles.qrImage,
                          ticket.status === 'used' && styles.qrUsed,
                        ]}
                      />
                    ) : (
                      <View style={styles.noQr}>
                        <Text style={styles.noQrText}>
                          QR tersedia setelah pembayaran dikonfirmasi
                        </Text>
                      </View>
                    )}

                    <Text style={styles.ticketCode}>
                      {ticket.ticket_code}
                    </Text>

                    <Text style={styles.ticketOwner}>
                      {order.customer_name || '-'}
                    </Text>

                    {ticket.status === 'used' && ticket.used_at ? (
                      <Text style={styles.usedText}>
                        Dipakai: {formatDate(ticket.used_at)}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorText: { color: '#991B1B', textAlign: 'center' },
  scroll: { padding: 16, paddingBottom: 32, backgroundColor: '#F9FAFB' },
  headerCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  eventPoster: {
    width: '100%',
    height: 190,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginBottom: 14,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderCode: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  eventTitle: { fontSize: 19, fontWeight: '800', color: '#111827', marginTop: 8 },
  meta: { fontSize: 13, color: '#4B5563', marginTop: 4 },
  customer: { fontSize: 13, color: '#111827', fontWeight: '600', marginTop: 10 },
  date: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  totalLabel: { fontSize: 14, color: '#6B7280' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#4F46E5' },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginTop: 14 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  hint: { fontSize: 13, color: '#9CA3AF' },
  proofImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#F3F4F6' },
  itemBlock: { marginBottom: 16 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  ticketCard: {
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  ticketTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketCategory: { fontSize: 13, fontWeight: '700', color: '#374151' },
  qrImage: { width: 160, height: 160 },
  qrUsed: { opacity: 0.28 },
  noQr: {
    width: 160,
    height: 160,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  noQrText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '600',
  },
  ticketCode: { fontSize: 13, fontWeight: '700', letterSpacing: 1, color: '#111827' },
  ticketOwner: { fontSize: 12, color: '#6B7280' },
  usedText: { fontSize: 11, fontWeight: '600', color: '#4F46E5' },
});
