import api from "./api";

export interface DashboardSummary {
  total_events: number;
  total_artists: number;
  total_orders: number;
  total_payments: number;
  total_revenue: number | string;
}

export interface TicketPerEvent {
  title: string;
  sold: number | string;
  quota: number | string;
}

export interface RecentOrder {
  order_code: string;
  total_price: number | string;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
  customer_name: string;
  event_title: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  tickets_per_event: TicketPerEvent[];
  recent_orders: RecentOrder[];
}

export const getDashboard = async () => {
  const res = await api.get("/dashboard");
  return res.data;
};