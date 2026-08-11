import api from "./api";

export const getCategories = async (eventId: number) => {
  const res = await api.get(`/events/${eventId}/categories`);
  return res.data;
};

export const createCategory = async (
  eventId: number,
  data: any
) => {
  const res = await api.post(
    `/events/${eventId}/categories`,
    data
  );

  return res.data;
};

export const updateCategory = async (
  id: number,
  data: any
) => {
  const res = await api.put(`/categories/${id}`, data);

  return res.data;
};

export const deleteCategory = async (id: number) => {
  const res = await api.delete(`/categories/${id}`);

  return res.data;
};