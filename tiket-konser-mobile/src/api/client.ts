import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/config';

export const TOKEN_KEY = 'tiket_konser_token';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize error messages coming from the backend's { success, message } shape
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err?.response?.data?.message ||
      err?.message ||
      'Terjadi kesalahan, coba lagi.';
    return Promise.reject(new Error(message));
  }
);

export default api;
