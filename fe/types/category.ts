export interface Category {
  id: number;
  event_id: number;
  name: string;
  price: number;
  quota: number;
  sold: number;
  created_at: string;
}

export interface CategoryFormData {
  event_id: number;
  name: string;
  price: number;
  quota: number;
}