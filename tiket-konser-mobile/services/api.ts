import axios from "axios";
import { API_BASE_URL } from "../src/config";

// Gunakan instance API yang sama dengan seluruh aplikasi mobile agar token
// dan base URL konsisten. File ini dipertahankan untuk kompatibilitas.
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export default api;
