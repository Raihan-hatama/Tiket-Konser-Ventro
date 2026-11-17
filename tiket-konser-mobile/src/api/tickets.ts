import api from './client';
import { resolveAssetUrl } from './events';
import { ApiResponse, MyTicket } from '../types';

/**
 * Backend mengirim URL QR/poster sebagai URL absolut (BASE_URL) atau
 * path relatif. resolveAssetUrl membuat keduanya aman dipakai <Image>.
 */
const normalizeTicket = (ticket: any): MyTicket => ({
  ...ticket,
  id: Number(ticket.id),
  ticket_code: String(ticket.ticket_code),
  qr_code_url: resolveAssetUrl(ticket.qr_code_url),
  poster_url: resolveAssetUrl(ticket.poster_url),
  event_time:
    ticket.event_time !== null && ticket.event_time !== undefined
      ? String(ticket.event_time)
      : null,
});

/**
 * Mengambil semua tiket milik user yang sedang login.
 * Tiket pending/cancelled tidak memiliki URL QR.
 */
export const getMyTickets = async (): Promise<MyTicket[]> => {
  const { data } = await api.get<ApiResponse<MyTicket[]>>('/tickets/my');

  return (data.data ?? []).map(normalizeTicket);
};

/**
 * Mengambil detail satu tiket (hanya pemilik atau admin).
 */
export const getTicket = async (
  id: number | string
): Promise<MyTicket> => {
  const { data } = await api.get<ApiResponse<MyTicket>>(`/tickets/${id}`);

  return normalizeTicket(data.data);
};
