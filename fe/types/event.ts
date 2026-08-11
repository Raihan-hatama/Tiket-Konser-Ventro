export interface Event {
  id: number;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  venue: string;
  poster_url: string | null;
  status: "open" | "closed" | "completed";
  created_at: string;
}

export interface EventFormData {
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  venue: string;
  status: string;
  poster?: File | null;
}