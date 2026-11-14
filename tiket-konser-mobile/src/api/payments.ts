import { Platform } from 'react-native';
import api from './client';

export interface CreatePaymentResult {
  order_id: number;
  order_code: string;
  payment_method: string;
  amount: number;
  snap_token: string;
  redirect_url: string;
}

export interface PaymentProofFile {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

export const createPayment = async (
  orderId: number | string,
  paymentMethod: string
) => {
  const { data } = await api.post<{
    success: boolean;
    message: string;
    data: CreatePaymentResult;
  }>(`/payments/${orderId}/create`, {
    payment_method: paymentMethod,
  });

  return data.data;
};

/**
 * Upload bukti pembayaran manual (fallback transfer bank).
 * Endpoint: POST /payments/:orderId/upload (field: "proof").
 */
export const uploadPaymentProof = async (
  orderId: number | string,
  file: PaymentProofFile
) => {
  const formData = new FormData();

  const name =
    file.fileName ||
    `bukti-${orderId}.${file.mimeType === 'image/png' ? 'png' : 'jpg'}`;

  if (Platform.OS === 'web') {
    // Di web, FormData membutuhkan Blob/File asli.
    const response = await fetch(file.uri);
    const blob = await response.blob();
    formData.append('proof', blob, name);
  } else {
    // React Native menerima objek { uri, name, type }.
    formData.append('proof', {
      uri: file.uri,
      name,
      type: file.mimeType || 'image/jpeg',
    } as unknown as Blob);
  }

  const { data } = await api.post<{
    success: boolean;
    message: string;
    data: { proof_url: string };
  }>(`/payments/${orderId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data.data;
};
