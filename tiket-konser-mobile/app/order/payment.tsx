import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { getOrder } from '@/api/orders';
import { uploadPaymentProof } from '@/api/payments';
import { Order } from '@/types';
import { formatRupiah } from '@/utils/format';

export default function PaymentScreen() {
  const router = useRouter();

  const { orderId } = useLocalSearchParams<{
    orderId: string;
  }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    uri: string;
    fileName?: string | null;
    mimeType?: string | null;
  } | null>(null);

  const loadOrder = async () => {
    try {
      if (!orderId) {
        throw new Error('Order ID tidak ditemukan');
      }

      const data = await getOrder(orderId);
      setOrder(data);
    } catch (error: any) {
      Alert.alert(
        'Gagal',
        error?.message || 'Gagal mengambil data pesanan'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const handlePickImage = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Izin diperlukan',
        'Izinkan akses galeri untuk memilih bukti pembayaran.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];

    setSelectedImage({
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    });
  };

  const handleUpload = async () => {
    if (!orderId) {
      Alert.alert('Error', 'Order ID tidak ditemukan.');
      return;
    }

    if (!selectedImage) {
      Alert.alert(
        'Bukti pembayaran',
        'Silakan pilih screenshot bukti pembayaran terlebih dahulu.'
      );
      return;
    }

    setUploading(true);

    try {
      await uploadPaymentProof(orderId, selectedImage);

      Alert.alert(
        'Berhasil',
        'Bukti pembayaran berhasil dikirim. Silakan tunggu verifikasi admin.',
        [
          {
            text: 'Lihat Pesanan',
            onPress: () => {
              router.replace(`/order/${orderId}`);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Upload gagal',
        error?.message || 'Gagal mengupload bukti pembayaran.'
      );
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>
          Memuat pembayaran...
        </Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Pesanan tidak ditemukan.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const paymentStatus = order.payment?.status ?? 'pending';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Pembayaran</Text>

          <Text style={styles.subtitle}>
            Selesaikan pembayaran pesanan kamu
          </Text>
        </View>

        {/* ORDER */}
        <View style={styles.card}>
          <Text style={styles.label}>KODE PESANAN</Text>

          <Text style={styles.orderCode}>
            {order.order_code}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.eventTitle}>
            {order.event_title}
          </Text>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Total Pembayaran
            </Text>

            <Text style={styles.totalValue}>
              {formatRupiah(order.total_price)}
            </Text>
          </View>
        </View>

        {/* QRIS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Bayar dengan QRIS
          </Text>

          <Text style={styles.description}>
            Scan QRIS di bawah menggunakan aplikasi pembayaran
            yang mendukung QRIS.
          </Text>

          <View style={styles.qrisContainer}>
            <Image
              source={require('../../assets/images/qris.png')}
              style={styles.qris}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.qrisHint}>
            Pastikan nominal pembayaran sesuai dengan total
            pesanan.
          </Text>
        </View>

        {/* BUKTI PEMBAYARAN */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Bukti Pembayaran
          </Text>

          <Text style={styles.description}>
            Setelah melakukan pembayaran, screenshot bukti
            pembayaran lalu upload di sini.
          </Text>

          {selectedImage ? (
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.preview}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.emptyUpload}>
              <Text style={styles.emptyIcon}>📷</Text>

              <Text style={styles.emptyTitle}>
                Belum ada bukti pembayaran
              </Text>

              <Text style={styles.emptyText}>
                Pilih screenshot bukti pembayaran dari galeri.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={handlePickImage}
            disabled={uploading}
          >
            <Text style={styles.outlineButtonText}>
              {selectedImage
                ? 'Pilih Bukti Lain'
                : 'Pilih Bukti Pembayaran'}
            </Text>
          </TouchableOpacity>

          {selectedImage && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Kirim Bukti Pembayaran
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* STATUS */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>
            Status Pembayaran
          </Text>

          <View
            style={[
              styles.statusBadge,
              paymentStatus === 'verified'
                ? styles.statusVerified
                : paymentStatus === 'rejected'
                  ? styles.statusRejected
                  : styles.statusPending,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                paymentStatus === 'verified'
                  ? styles.statusTextVerified
                  : paymentStatus === 'rejected'
                    ? styles.statusTextRejected
                    : styles.statusTextPending,
              ]}
            >
              {paymentStatus === 'verified'
                ? 'Pembayaran Terverifikasi'
                : paymentStatus === 'rejected'
                  ? 'Pembayaran Ditolak'
                  : 'Menunggu Pembayaran'}
            </Text>
          </View>

          <Text style={styles.statusDescription}>
            {paymentStatus === 'verified'
              ? 'Pembayaran kamu sudah diverifikasi. Tiket dapat digunakan.'
              : paymentStatus === 'rejected'
                ? 'Bukti pembayaran ditolak. Silakan upload bukti pembayaran yang benar.'
                : 'Silakan lakukan pembayaran melalui QRIS lalu upload bukti pembayaran.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  errorText: {
    fontSize: 16,
    color: '#991B1B',
    textAlign: 'center',
  },

  backButton: {
    marginTop: 20,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },

  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  header: {
    marginBottom: 18,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEF0F4',
  },

  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
  },

  orderCode: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginTop: 7,
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },

  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },

  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },

  totalValue: {
    fontSize: 19,
    fontWeight: '800',
    color: '#4F46E5',
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },

  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 8,
  },

  qrisContainer: {
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
  },

  qris: {
    width: 270,
    height: 270,
  },

  qrisHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 12,
  },

  emptyUpload: {
    marginTop: 16,
    minHeight: 170,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  emptyIcon: {
    fontSize: 35,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },

  emptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 5,
  },

  preview: {
    width: '100%',
    height: 250,
    borderRadius: 14,
    marginTop: 16,
    backgroundColor: '#F3F4F6',
  },

  outlineButton: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },

  outlineButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '700',
  },

  primaryButton: {
    marginTop: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },

  statusTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
  },

  statusPending: {
    backgroundColor: '#FEF3C7',
  },

  statusVerified: {
    backgroundColor: '#DCFCE7',
  },

  statusRejected: {
    backgroundColor: '#FEE2E2',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },

  statusTextPending: {
    color: '#92400E',
  },

  statusTextVerified: {
    color: '#166534',
  },

  statusTextRejected: {
    color: '#991B1B',
  },

  statusDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 10,
  },
});