// Ambil dari .env lewat variabel EXPO_PUBLIC_API_URL (didukung native oleh Expo SDK 49+)
// Contoh isi .env: EXPO_PUBLIC_API_URL=http://192.168.1.10:5000/api
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.43.99:5000/api';
