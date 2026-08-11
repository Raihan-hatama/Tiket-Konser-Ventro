import api from "./api";

export interface Payment {
  id: number;
  order_id: number;
  order_code: string;
  total_price: number;
  payment_method: string;
  amount: number;
  proof_url: string | null;
  status: "pending" | "verified" | "rejected";
  customer_name: string;
  event_title: string;
  created_at: string;
  paid_at: string | null;
}

export const getPayments = async () => {
  const res = await api.get("/payments");
  return res.data;
};

export const verifyPayment = async (
  orderId: number,
  status: "verified" | "rejected"
) => {
  const res = await api.patch(
    `/payments/${orderId}/verify`,
    { status }
  );

  return res.data;
};