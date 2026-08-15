import api from './client';
import type {
  EventItem,
  TicketCategory,
  Artist,
} from '@/types';

export interface EventDetail extends EventItem {
  artists?: Artist[];
  categories?: TicketCategory[];
}

/**
 * Mengambil semua event
 */
export const getEvents = async (): Promise<EventDetail[]> => {
  const response = await api.get('/events');

  const data = response.data?.data ?? response.data ?? [];

  return data.map((event: any) => ({
    ...event,

    id: Number(event.id),

    event_date: event.event_date
      ? String(event.event_date)
      : '',

    event_time:
      event.event_time !== null &&
      event.event_time !== undefined
        ? String(event.event_time)
        : null,

    status: String(event.status),

    categories: Array.isArray(event.categories)
      ? event.categories.map((category: any) => ({
          ...category,
          id: Number(category.id),
          event_id: Number(category.event_id ?? event.id),
          name: String(category.name),
          price: Number(category.price),
          quota: Number(category.quota ?? 0),
          sold: Number(category.sold ?? 0),
          available:
            category.available !== undefined &&
            category.available !== null
              ? Number(category.available)
              : Math.max(
                  0,
                  Number(category.quota ?? 0) -
                    Number(category.sold ?? 0)
                ),
        }))
      : [],

    artists: Array.isArray(event.artists)
      ? event.artists.map((artist: any) => ({
          ...artist,
          id: Number(artist.id),
          name: String(artist.name),
          bio: artist.bio ?? null,
          photo_url: artist.photo_url ?? null,
        }))
      : [],
  }));
};

/**
 * Mengambil detail event berdasarkan ID
 */
export const getEvent = async (
  id: number | string
): Promise<EventDetail> => {
  const response = await api.get(`/events/${id}`);

  const event = response.data?.data ?? response.data;

  return {
    ...event,

    id: Number(event.id),

    event_date: event.event_date
      ? String(event.event_date)
      : '',

    event_time:
      event.event_time !== null &&
      event.event_time !== undefined
        ? String(event.event_time)
        : null,

    status: String(event.status),

    categories: Array.isArray(event.categories)
      ? event.categories.map((category: any) => ({
          ...category,
          id: Number(category.id),
          event_id: Number(category.event_id ?? event.id),
          name: String(category.name),
          price: Number(category.price),
          quota: Number(category.quota ?? 0),
          sold: Number(category.sold ?? 0),
          available:
            category.available !== undefined &&
            category.available !== null
              ? Number(category.available)
              : Math.max(
                  0,
                  Number(category.quota ?? 0) -
                    Number(category.sold ?? 0)
                ),
        }))
      : [],

    artists: Array.isArray(event.artists)
      ? event.artists.map((artist: any) => ({
          ...artist,
          id: Number(artist.id),
          name: String(artist.name),
          bio: artist.bio ?? null,
          photo_url: artist.photo_url ?? null,
        }))
      : [],
  };
};

/**
 * Alias untuk getEvent
 *
 * Bisa dipakai jika file [id].tsx
 * menggunakan getEventById.
 */
export const getEventById = getEvent;