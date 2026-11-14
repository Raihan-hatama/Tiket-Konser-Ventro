  import axios from "axios";

  // Gunakan NEXT_PUBLIC_API_URL dari .env.local (lihat .env.example).
  // Fallback ke localhost untuk pengembangan di komputer yang sama.
  const api = axios.create({
    baseURL: "http://10.2.9.221:5000/api",
  });

  api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  export default api;
