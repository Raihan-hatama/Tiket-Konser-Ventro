import api from './client';
import { ApiResponse, User } from '@/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

interface AuthResult {
  token: string;
  user?: User;
}

export const login = async (payload: LoginPayload) => {
  const { data } = await api.post<ApiResponse<never> & AuthResult>(
    '/auth/login',
    payload
  );
  return data;
};

export const register = async (payload: RegisterPayload) => {
  const { data } = await api.post<ApiResponse<never> & AuthResult>(
    '/auth/register',
    payload
  );
  return data;
};

export const me = async () => {
  const { data } = await api.get<ApiResponse<User>>('/auth/me');
  return data.data;
};
