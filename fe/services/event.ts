import api from "./api";

export const getEvents = async () => {
  const res = await api.get("/events");
  return res.data;
};

export const getEvent = async (id: number) => {
  const res = await api.get(`/events/${id}`);
  return res.data;
};

export const createEvent = async (data: FormData) => {
  const res = await api.post("/events", data);
  return res.data;
};

export const updateEvent = async (
  id: number,
  data: FormData
) => {
  const res = await api.put(`/events/${id}`, data);
  return res.data;
};

export const deleteEvent = async (id: number) => {
  const res = await api.delete(`/events/${id}`);
  return res.data;
};