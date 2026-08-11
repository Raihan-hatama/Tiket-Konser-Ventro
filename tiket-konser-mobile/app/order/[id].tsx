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
import { Order } from '@/types';
import { formatDate, formatRupiah } from '@/utils/format';
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

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.orderCode}>{order.order_code}</Text>
          <StatusBadge status={order.status} />
        </View>
        <Text style={styles.eventTitle}>{order.event_title}</Text>
        <Text style={styles.date}>{formatDate(order.created_at)}</Text>
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
        {(order.items ?? []).map((item) => (
          <View key={item.id} style={styles.itemBlock}>
            <Text style={styles.itemName}>
              {item.category_name} x{item.quantity}
            </Text>
            {(item.tickets ?? []).map((ticket) => (
              <View key={ticket.ticket_code} style={styles.ticketCard}>
                {ticket.qr_code_url ? (
                  <Image
                    source={{ uri: ticket.qr_code_url }}
                    style={styles.qrImage}
                  />
                ) : null}
                <Text style={styles.ticketCode}>{ticket.ticket_code}</Text>
                <StatusBadge status={ticket.status} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorText: { color: '#991B1B', textAlign: 'center' },
  scroll: { padding: 16, paddingBottom: 32, backgroundColor: '#F9FAFB' },
  headerCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderCode: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  eventTitle: { fontSize: 19, fontWeight: '800', color: '#111827', marginTop: 8 },
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
  qrImage: { width: 140, height: 140 },
  ticketCode: { fontSize: 13, fontWeight: '700', letterSpacing: 1, color: '#111827' },
});
