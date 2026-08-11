import api from './client';
import { ApiResponse } from '../types';

interface UploadProofResult {
  proof_url: string;
}

// `asset` comes straight from expo-image-picker's result.assets[0]
export const uploadPaymentProof = async (
  orderId: number | string,
  asset: { uri: string; fileName?: string | null; mimeType?: string | null }
) => {
  const formData = new FormData();
  const fileName = asset.fileName || `proof-${Date.now()}.jpg`;
  const mimeType = asset.mimeType || 'image/jpeg';

  // React Native's FormData expects this shape for file uploads
  formData.append('proof', {
    uri: asset.uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
  formData.append('payment_method', 'transfer');

  const { data } = await api.post<ApiResponse<UploadProofResult>>(
    `/payments/${orderId}/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data.data;
};
