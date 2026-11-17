import api from "./api";

export interface ScannedTicket {
  id?: number;
  ticket_code: string;
  status: string;
  used_at?: string | null;
  created_at?: string;
  category_name?: string;
  event_title?: string;
  event_date?: string;
  event_time?: string | null;
  venue?: string;
  customer_name?: string;
  order_code?: string;
  scanned_by_name?: string | null;
}

export interface ScanResponse {
  success: boolean;
  status: "valid" | "used" | "invalid" | "cancelled" | "unpaid" | "error" | string;
  message: string;
  data?: ScannedTicket | null;
}

/**
 * 4xx adalah hasil validasi yang normal (tiket sudah dipakai, tidak
 * ditemukan, dsb.), jadi tidak dilempar sebagai exception. Hanya
 * error 5xx / jaringan yang dianggap gagal request.
 */
export const validateTicket = async (
  ticket_code: string
): Promise<ScanResponse> => {
  const res = await api.post<ScanResponse>(
    "/tickets/validate",
    { ticket_code },
    { validateStatus: (status) => status < 500 }
  );

  return res.data;
};

/**
 * Check-in atomik di backend. Satu tiket hanya bisa berhasil sekali.
 */
export const checkInTicket = async (
  ticket_code: string
): Promise<ScanResponse> => {
  const res = await api.post<ScanResponse>(
    "/tickets/check-in",
    { ticket_code },
    { validateStatus: (status) => status < 500 }
  );

  return res.data;
};
