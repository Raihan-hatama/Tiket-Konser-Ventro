import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { createOrder } from '@/api/orders';
import { formatRupiah } from '@/utils/format';
import PrimaryButton from '@/components/PrimaryButton';
import { useCart } from '@/context/CartContext';

export default function CheckoutScreen() {
  const router = useRouter();

  const {
    eventId,
    eventTitle,
    cart,
    clear,
  } = useCart();

  const [loading, setLoading] = useState(false);

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    if (!eventId || cart.length === 0) {
      Alert.alert(
        'Keranjang kosong',
        'Silakan pilih tiket dari halaman event terlebih dahulu.'
      );

      router.back();
      return;
    }

    try {
      setLoading(true);

const result = await createOrder({
  event_id: eventId,
  items: cart.map((item) => ({
    ticket_category_id: item.ticket_category_id,
    quantity: item.quantity,
  })),
});

clear();

// Arahkan ke halaman pilihan pembayaran
router.push(`/order/payment?orderId=${result.order_id}`);
      router.replace(`/payment/${result.order_id}`);
    } catch (error: any) {
      Alert.alert(
        'Checkout gagal',
        error?.message || 'Gagal membuat pesanan. Silakan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Checkout
          </Text>

          <Text style={styles.headerSubtitle}>
            Periksa kembali pesanan kamu
          </Text>
        </View>

        {/* EVENT */}
        <View style={styles.card}>
          <Text style={styles.label}>
            EVENT
          </Text>

          <Text style={styles.eventTitle}>
            {eventTitle || 'Event'}
          </Text>
        </View>

        {/* TICKET */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Tiket
          </Text>

          {cart.length === 0 ? (
            <Text style={styles.emptyText}>
              Belum ada tiket yang dipilih.
            </Text>
          ) : (
            cart.map((item) => (
              <View
                key={item.ticket_category_id}
                style={styles.ticketRow}
              >
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketName}>
                    {item.name}
                  </Text>

                  <Text style={styles.ticketPrice}>
                    {item.quantity} ×{' '}
                    {formatRupiah(item.price)}
                  </Text>
                </View>

                <Text style={styles.subtotal}>
                  {formatRupiah(
                    item.price * item.quantity
                  )}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* PAYMENT INFO */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Pembayaran
          </Text>

          <View style={styles.paymentInfo}>
            <Text style={styles.paymentIcon}>
              💳
            </Text>

            <View style={styles.paymentTextContainer}>
              <Text style={styles.paymentTitle}>
                Pilih metode pembayaran setelah
                pesanan dibuat
              </Text>

              <Text style={styles.paymentDescription}>
                Kamu dapat memilih metode pembayaran
                yang tersedia pada halaman pembayaran.
              </Text>
            </View>
          </View>
        </View>

        {/* TOTAL */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Total Tiket
            </Text>

            <Text style={styles.totalValue}>
              {formatRupiah(total)}
            </Text>
          </View>
        </View>

        <Text style={styles.note}>
          Setelah checkout, kamu akan diarahkan ke
          halaman pembayaran untuk menyelesaikan
          pembayaran pesanan.
        </Text>
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerLabel}>
            Total Pembayaran
          </Text>

          <Text style={styles.footerPrice}>
            {formatRupiah(total)}
          </Text>
        </View>

        <PrimaryButton
          title={
            loading
              ? 'Membuat Pesanan...'
              : 'Lanjutkan Pembayaran'
          }
          onPress={handleCheckout}
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 180,
  },

  header: {
    marginBottom: 20,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },

  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 6,

    elevation: 2,
  },

  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 6,
  },

  eventTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 14,
  },

  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingVertical: 12,

    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  ticketInfo: {
    flex: 1,
    paddingRight: 10,
  },

  ticketName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  ticketPrice: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },

  subtotal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  paymentIcon: {
    fontSize: 28,
    marginRight: 12,
  },

  paymentTextContainer: {
    flex: 1,
  },

  paymentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 20,
  },

  paymentDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 18,
  },

  totalCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 18,
    marginTop: 4,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },

  totalValue: {
    fontSize: 21,
    fontWeight: '900',
    color: '#4F46E5',
  },

  note: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
    marginTop: 14,
    marginHorizontal: 4,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,

    backgroundColor: '#FFFFFF',

    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,

    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,

    elevation: 8,
  },

  footerTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  footerLabel: {
    fontSize: 13,
    color: '#6B7280',
  },

  footerPrice: {
    fontSize: 19,
    fontWeight: '900',
    color: '#111827',
  },
});