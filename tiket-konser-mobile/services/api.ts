import axios from "axios";

export const api = axios.create({
  baseURL: "http://10.114.145.206:3000/api",
  timeout: 15000,
});

export default api;