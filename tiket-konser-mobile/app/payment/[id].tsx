import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import { getOrder } from '@/api/orders';
import { api } from '../../services/api';
import { formatRupiah } from '@/utils/format';
import { Order } from '@/types';
import PrimaryButton from '@/components/PrimaryButton';

type PaymentMethod =
  | 'qris'
  | 'bank'
  | 'ewallet';

export default function PaymentScreen() {
  const router = useRouter();

  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [paying, setPaying] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  // ============================================================
  // PAYMENT METHOD
  // ============================================================

  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethod>('qris');

  // ============================================================
  // LOAD ORDER
  // ============================================================

  const loadOrder =
    useCallback(async () => {
      try {
        setError(null);

        const data =
          await getOrder(id);

        setOrder(data);
      } catch (err: any) {
        console.error(
          'GET ORDER ERROR:',
          err
        );

        setError(
          err?.message ||
            'Gagal mengambil data pesanan.'
        );
      }
    }, [id]);

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      await loadOrder();

      setLoading(false);
    };

    init();
  }, [loadOrder]);

  // ============================================================
  // BAYAR SEKARANG
  // ============================================================

  const handlePayment = async () => {
    if (!order) {
      return;
    }

    try {
      setPaying(true);

      console.log(
        '===================================='
      );

      console.log(
        'CREATE MIDTRANS PAYMENT'
      );

      console.log(
        'ORDER ID:',
        order.id
      );

      console.log(
        'METHOD:',
        selectedMethod
      );

      console.log(
        '===================================='
      );

      // --------------------------------------------------------
      // REQUEST SNAP TOKEN SESUAI METODE
      // --------------------------------------------------------

      const response =
        await api.post(
          `/payments/${order.id}/create-snap`,
          {
            payment_method:
              selectedMethod,
          }
        );

      console.log(
        'CREATE SNAP RESPONSE:',
        response.data
      );

      if (
        !response.data?.success
      ) {
        throw new Error(
          response.data?.message ||
            'Gagal membuat pembayaran.'
        );
      }

      const {
        snap_token,
        redirect_url,
      } =
        response.data.data;

      // --------------------------------------------------------
      // VALIDASI
      // --------------------------------------------------------

      if (!snap_token) {
        throw new Error(
          'Snap Token tidak ditemukan.'
        );
      }

      // --------------------------------------------------------
      // MIDTRANS SANDBOX
      // --------------------------------------------------------

      const paymentUrl =
        redirect_url ||
        `https://app.sandbox.midtrans.com/snap/v2/vtweb/${encodeURIComponent(
          snap_token
        )}`;

      console.log(
        'MIDTRANS PAYMENT URL:',
        paymentUrl
      );

      // --------------------------------------------------------
      // CEK URL
      // --------------------------------------------------------

      const supported =
        await Linking.canOpenURL(
          paymentUrl
        );

      if (!supported) {
        throw new Error(
          'Halaman pembayaran Midtrans tidak dapat dibuka di perangkat ini.'
        );
      }

      // --------------------------------------------------------
      // BUKA MIDTRANS
      // --------------------------------------------------------

      await Linking.openURL(
        paymentUrl
      );
    } catch (err: any) {
      console.error(
        'PAYMENT ERROR:',
        err
      );

      Alert.alert(
        'Pembayaran gagal',
        err?.response?.data?.message ||
          err?.message ||
          'Gagal membuka halaman pembayaran.'
      );
    } finally {
      setPaying(false);
    }
  };

  // ============================================================
  // ORDER DETAIL
  // ============================================================

  const handleOrderDetail = () => {
    router.replace(
      `/order/${id}`
    );
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#4F46E5"
        />

        <Text
          style={styles.loadingText}
        >
          Memuat pesanan...
        </Text>
      </View>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error || !order) {
    return (
      <View style={styles.center}>
        <Text
          style={styles.errorTitle}
        >
          Pesanan tidak ditemukan
        </Text>

        <Text
          style={styles.errorText}
        >
          {error ||
            'Data pesanan tidak tersedia.'}
        </Text>

        <View
          style={styles.buttonWrapper}
        >
          <PrimaryButton
            title="Kembali"
            onPress={() =>
              router.back()
            }
          />
        </View>
      </View>
    );
  }

  // ============================================================
  // PAYMENT STATUS
  // ============================================================

  const paymentStatus =
    order.payment?.status ||
    'pending';

  const isPaid =
    order.status === 'paid' ||
    paymentStatus === 'verified';

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >

        {/* ====================================================
            HEADER
        ==================================================== */}

        <View style={styles.header}>
          <Text
            style={styles.title}
          >
            Pembayaran
          </Text>

          <Text
            style={styles.subtitle}
          >
            Selesaikan pembayaran
            pesanan kamu
          </Text>
        </View>

        {/* ====================================================
            ORDER
        ==================================================== */}

        <View style={styles.card}>
          <Text
            style={styles.label}
          >
            KODE PESANAN
          </Text>

          <Text
            style={styles.orderCode}
          >
            {order.order_code}
          </Text>

          {order.event_title ? (
            <>
              <Text
                style={
                  styles.eventLabel
                }
              >
                EVENT
              </Text>

              <Text
                style={
                  styles.eventTitle
                }
              >
                {order.event_title}
              </Text>
            </>
          ) : null}
        </View>

        {/* ====================================================
            TOTAL
        ==================================================== */}

        <View
          style={styles.totalCard}
        >
          <Text
            style={styles.totalLabel}
          >
            Total Pembayaran
          </Text>

          <Text
            style={styles.total}
          >
            {formatRupiah(
              order.total_price
            )}
          </Text>
        </View>

        {/* ====================================================
            STATUS
        ==================================================== */}

        <View style={styles.card}>
          <Text
            style={styles.sectionTitle}
          >
            Status Pembayaran
          </Text>

          <View
            style={[
              styles.statusBox,
              isPaid
                ? styles.statusPaid
                : styles.statusPending,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isPaid
                  ? styles.statusTextPaid
                  : styles.statusTextPending,
              ]}
            >
              {isPaid
                ? '✓ Pembayaran berhasil'
                : 'Menunggu pembayaran'}
            </Text>
          </View>
        </View>

        {/* ====================================================
            PAYMENT METHODS
        ==================================================== */}

        {!isPaid && (
          <View
            style={styles.card}
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Pilihan Pembayaran
            </Text>

            <Text
              style={styles.description}
            >
              Pilih metode pembayaran
              yang ingin kamu gunakan.
              Setelah itu tekan Bayar
              Sekarang.
            </Text>

            <View
              style={styles.methods}
            >

              {/* =================================================
                  QRIS
              ================================================= */}

              <Pressable
                onPress={() =>
                  setSelectedMethod(
                    'qris'
                  )
                }
                style={[
                  styles.method,
                  selectedMethod ===
                    'qris' &&
                    styles.methodSelected,
                ]}
              >
                <View
                  style={[
                    styles.radio,
                    selectedMethod ===
                      'qris' &&
                      styles.radioSelected,
                  ]}
                >
                  {selectedMethod ===
                    'qris' && (
                    <View
                      style={
                        styles.radioDot
                      }
                    />
                  )}
                </View>

                <Text
                  style={
                    styles.methodIcon
                  }
                >
                  ▣
                </Text>

                <View
                  style={
                    styles.methodContent
                  }
                >
                  <Text
                    style={
                      styles.methodTitle
                    }
                  >
                    QRIS
                  </Text>

                  <Text
                    style={
                      styles.methodDescription
                    }
                  >
                    Scan menggunakan
                    aplikasi pembayaran
                  </Text>
                </View>
              </Pressable>

              {/* =================================================
                  BANK
              ================================================= */}

              <Pressable
                onPress={() =>
                  setSelectedMethod(
                    'bank'
                  )
                }
                style={[
                  styles.method,
                  selectedMethod ===
                    'bank' &&
                    styles.methodSelected,
                ]}
              >
                <View
                  style={[
                    styles.radio,
                    selectedMethod ===
                      'bank' &&
                      styles.radioSelected,
                  ]}
                >
                  {selectedMethod ===
                    'bank' && (
                    <View
                      style={
                        styles.radioDot
                      }
                    />
                  )}
                </View>

                <Text
                  style={
                    styles.methodIcon
                  }
                >
                  💳
                </Text>

                <View
                  style={
                    styles.methodContent
                  }
                >
                  <Text
                    style={
                      styles.methodTitle
                    }
                  >
                    Transfer Bank
                  </Text>

                  <Text
                    style={
                      styles.methodDescription
                    }
                  >
                    BCA / BNI / BRI /
                    Permata VA
                  </Text>
                </View>
              </Pressable>

              {/* =================================================
                  E-WALLET
              ================================================= */}

              <Pressable
                onPress={() =>
                  setSelectedMethod(
                    'ewallet'
                  )
                }
                style={[
                  styles.method,
                  selectedMethod ===
                    'ewallet' &&
                    styles.methodSelected,
                ]}
              >
                <View
                  style={[
                    styles.radio,
                    selectedMethod ===
                      'ewallet' &&
                      styles.radioSelected,
                  ]}
                >
                  {selectedMethod ===
                    'ewallet' && (
                    <View
                      style={
                        styles.radioDot
                      }
                    />
                  )}
                </View>

                <Text
                  style={
                    styles.methodIcon
                  }
                >
                  📱
                </Text>

                <View
                  style={
                    styles.methodContent
                  }
                >
                  <Text
                    style={
                      styles.methodTitle
                    }
                  >
                    E-Wallet
                  </Text>

                  <Text
                    style={
                      styles.methodDescription
                    }
                  >
                    GoPay / ShopeePay /
                    e-wallet lainnya
                  </Text>
                </View>
              </Pressable>

            </View>
          </View>
        )}

        {/* ====================================================
            INFO
        ==================================================== */}

        <View style={styles.info}>
          <Text
            style={styles.infoText}
          >
            {isPaid
              ? 'Pembayaran kamu sudah berhasil.'
              : 'Setelah menekan Bayar Sekarang, kamu akan diarahkan ke halaman pembayaran Midtrans sesuai metode yang dipilih.'}
          </Text>
        </View>

      </ScrollView>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <View
        style={styles.footer}
      >
        {isPaid ? (
          <PrimaryButton
            title="Lihat Tiket Saya"
            onPress={
              handleOrderDetail
            }
          />
        ) : (
          <PrimaryButton
            title={
              paying
                ? 'Membuka Pembayaran...'
                : 'Bayar Sekarang'
            }
            onPress={
              handlePayment
            }
            loading={paying}
          />
        )}
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    screen: {
      flex: 1,
      backgroundColor:
        '#F9FAFB',
    },

    content: {
      padding: 20,
      paddingBottom: 130,
    },

    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor:
        '#F9FAFB',
    },

    loadingText: {
      marginTop: 12,
      color: '#6B7280',
      fontSize: 14,
    },

    errorTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#111827',
      textAlign: 'center',
    },

    errorText: {
      fontSize: 14,
      color: '#6B7280',
      textAlign: 'center',
      marginTop: 8,
    },

    buttonWrapper: {
      width: '100%',
      marginTop: 20,
    },

    header: {
      marginBottom: 20,
    },

    title: {
      fontSize: 27,
      fontWeight: '900',
      color: '#111827',
    },

    subtitle: {
      fontSize: 14,
      color: '#6B7280',
      marginTop: 5,
    },

    card: {
      backgroundColor:
        '#FFFFFF',
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
      fontWeight: '800',
      color: '#9CA3AF',
      letterSpacing: 1,
    },

    orderCode: {
      fontSize: 19,
      fontWeight: '900',
      color: '#111827',
      marginTop: 6,
    },

    eventLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#9CA3AF',
      letterSpacing: 1,
      marginTop: 18,
    },

    eventTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#111827',
      marginTop: 5,
    },

    totalCard: {
      backgroundColor:
        '#EEF2FF',
      borderRadius: 16,
      padding: 20,
      marginBottom: 14,
    },

    totalLabel: {
      fontSize: 13,
      color: '#6B7280',
    },

    total: {
      fontSize: 27,
      fontWeight: '900',
      color: '#4F46E5',
      marginTop: 5,
    },

    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#111827',
      marginBottom: 12,
    },

    statusBox: {
      borderRadius: 10,
      padding: 13,
    },

    statusPending: {
      backgroundColor:
        '#FEF3C7',
    },

    statusPaid: {
      backgroundColor:
        '#DCFCE7',
    },

    statusText: {
      fontSize: 14,
      fontWeight: '700',
    },

    statusTextPending: {
      color: '#92400E',
    },

    statusTextPaid: {
      color: '#166534',
    },

    description: {
      fontSize: 13,
      color: '#6B7280',
      lineHeight: 19,
      marginBottom: 14,
    },

    methods: {
      gap: 10,
    },

    method: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        '#F9FAFB',
      borderRadius: 12,
      padding: 13,
      borderWidth: 2,
      borderColor:
        'transparent',
    },

    methodSelected: {
      borderColor:
        '#4F46E5',
      backgroundColor:
        '#EEF2FF',
    },

    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor:
        '#D1D5DB',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    radioSelected: {
      borderColor:
        '#4F46E5',
    },

    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor:
        '#4F46E5',
    },

    methodIcon: {
      fontSize: 22,
      width: 40,
    },

    methodContent: {
      flex: 1,
    },

    methodTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#111827',
    },

    methodDescription: {
      fontSize: 11,
      color: '#6B7280',
      marginTop: 2,
    },

    info: {
      paddingHorizontal: 4,
      marginTop: 2,
    },

    infoText: {
      fontSize: 12,
      color: '#9CA3AF',
      lineHeight: 18,
    },

    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,

      backgroundColor:
        '#FFFFFF',

      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 24,

      borderTopWidth: 1,
      borderTopColor:
        '#E5E7EB',

      elevation: 8,
    },
  });