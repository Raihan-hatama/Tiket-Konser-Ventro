import api from './client';
import { ApiResponse, Order } from '../types';

export interface CreateOrderPayload {
  event_id: number;
  items: {
    ticket_category_id: number;
    quantity: number;
  }[];
}

export interface CreateOrderResult {
  order_id: number;
  order_code: string;
  total_price: number;
}

export const createOrder = async (
  payload: CreateOrderPayload
): Promise<CreateOrderResult> => {
  const { data } = await api.post<ApiResponse<CreateOrderResult>>(
    '/orders',
    payload
  );

  return data.data;
};

export const getOrders = async (): Promise<Order[]> => {
  const { data } = await api.get<ApiResponse<Order[]>>('/orders');

  return data.data;
};

export const getOrder = async (
  id: number | string
): Promise<Order> => {
  const { data } = await api.get<ApiResponse<Order>>(
    `/orders/${id}`
  );

  return data.data;
};