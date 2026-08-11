import api from "./client";
import type { ApiResponse, EventItem } from "../types";

export const getEvents = async () => {
  const { data } = await api.get<ApiResponse<EventItem[]>>(
    "/events"
  );

  return data.data;
};

export const getEvent = async (id: number | string) => {
  const { data } = await api.get<ApiResponse<EventItem>>(
    `/events/${id}`
  );

  return data.data;
};