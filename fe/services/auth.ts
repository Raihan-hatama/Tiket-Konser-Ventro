import api from "./api";

export interface LoginData {
  email: string;
  password: string;
}

export const login = async (data: LoginData) => {
  const res = await api.post("/auth/login", data);
  return res.data;
};

export const getProfile = async () => {
  const res = await api.get("/auth/me");
  return res.data;
};