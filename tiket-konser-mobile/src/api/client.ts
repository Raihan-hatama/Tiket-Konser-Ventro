import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getToken, TOKEN_KEY } from '../utils/tokenStorage';

export { TOKEN_KEY };

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
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
