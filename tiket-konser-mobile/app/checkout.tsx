import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { createOrder } from '@/api/orders';
import { formatRupiah } from '@/utils/format';
import PrimaryButton from '@/components/PrimaryButton';
import { useCart } from '@/context/CartContext';

export default function CheckoutScreen() {
  const router = useRouter();
  const { eventId, eventTitle, cart, clear } = useCart();
  const [loading, setLoading] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleConfirm = async () => {
    if (!eventId || cart.length === 0) {
      Alert.alert('Keranjang kosong', 'Silakan pilih tiket dari halaman event dulu.');
      router.back();
      return;
    }
    setLoading(true);
    try {
      const result = await createOrder({
        event_id: eventId,
        items: cart.map((item) => ({
          ticket_category_id: item.ticket_category_id,
          quantity: item.quantity,
        })),
      });
      clear();
      router.replace(`/order/${result.order_id}`);
    } catch (err: any) {
      Alert.alert('Gagal membuat pesanan', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        <Text style={styles.eventTitle}>{eventTitle}</Text>
        <Text style={styles.sectionTitle}>Ringkasan Pesanan</Text>

        {cart.map((item) => (
          <View key={item.ticket_category_id} style={styles.row}>
            <View>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQty}>
                {item.quantity} x {formatRupiah(item.price)}
              </Text>
            </View>
            <Text style={styles.itemSubtotal}>
              {formatRupiah(item.price * item.quantity)}
            </Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatRupiah(total)}</Text>
        </View>

        <Text style={styles.note}>
          Setelah pesanan dibuat, kamu akan mendapat kode pesanan dan bisa
          langsung upload bukti transfer di halaman detail pesanan.
        </Text>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title="Konfirmasi & Buat Pesanan"
          onPress={handleConfirm}
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'space-between' },
  body: { padding: 20 },
  eventTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginBottom: 10, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemQty: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  itemSubtotal: { fontSize: 15, fontWeight: '700', color: '#111827' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#4F46E5' },
  note: { fontSize: 12, color: '#9CA3AF', marginTop: 20, lineHeight: 18 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#fff' },
});
