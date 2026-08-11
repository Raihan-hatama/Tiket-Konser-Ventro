import api from './client';
import { ApiResponse, Artist } from '@/types';

export const getArtists = async () => {
  const { data } = await api.get<ApiResponse<Artist[]>>('/artists');
  return data.data;
};

export const getArtist = async (id: number | string) => {
  const { data } = await api.get<ApiResponse<Artist>>(`/artists/${id}`);
  return data.data;
};
