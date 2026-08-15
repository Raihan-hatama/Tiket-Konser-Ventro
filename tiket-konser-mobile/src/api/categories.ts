import api from './client';

export interface TicketCategory {
  id: number;
  event_id: number;
  name: string;
  price: number;
  quota: number;
  sold?: number;
}

export const getTicketCategories = async (
  eventId: number | string
): Promise<TicketCategory[]> => {
  const response = await api.get(`/events/${eventId}/categories`);

  // Backend kemungkinan mengembalikan:
  // { success: true, data: [...] }

  return response.data?.data ?? [];
};