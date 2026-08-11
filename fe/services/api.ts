import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.43.99:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  console.log("TOKEN =", token);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;