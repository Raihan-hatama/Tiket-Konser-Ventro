import api from './client';

export interface CreatePaymentResult {
  order_id: number;
  order_code: string;
  payment_method: string;
  amount: number;
  snap_token: string;
  redirect_url: string;
}

export const createPayment = async (
  orderId: number | string,
  paymentMethod: string
) => {
  console.log('PAYMENT URL:', `/payments/${orderId}/create`);
  console.log('PAYMENT METHOD:', paymentMethod);

  const { data } = await api.post<{
    success: boolean;
    message: string;
    data: CreatePaymentResult;
  }>(
    `/payments/${orderId}/create`,
    {
      payment_method: paymentMethod,
    }
  );

  return data.data;
};