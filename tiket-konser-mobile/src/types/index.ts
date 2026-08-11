export type Role = 'admin' | 'customer';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  created_at?: string;
}

export interface Artist {
  id: number;
  name: string;
  bio?: string | null;
  photo_url?: string | null;
}

export interface TicketCategory {
  id: number;
  event_id: number;
  name: string;
  price: number;
  quota: number;
  sold: number;
  available?: number;
}

export interface EventItem {
  id: number;
  title: string;
  description?: string | null;
  event_date: string;
  event_time: string;
  venue: string;
  poster_url?: string | null;
  status: 'open' | 'closed';
  total_sold?: number;
  total_quota?: number;
  artists?: Artist[];
  categories?: TicketCategory[];
}

export interface TicketInfo {
  ticket_code: string;
  qr_code_url: string;
  status: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  ticket_category_id: number;
  category_name?: string;
  quantity: number;
  unit_price: number;
  tickets?: TicketInfo[];
}

export interface Payment {
  id: number;
  order_id: number;
  payment_method: string;
  amount: number;
  proof_url?: string | null;
  status: 'pending' | 'verified' | 'rejected';
  paid_at?: string | null;
}

export interface Order {
  id: number;
  order_code: string;
  user_id: number;
  event_id: number;
  total_price: number;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  customer_name?: string;
  event_title?: string;
  payment_status?: string;
  items?: OrderItem[];
  payment?: Payment | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface CartItem {
  ticket_category_id: number;
  name: string;
  price: number;
  quantity: number;
}
