import { useEffect, useState } from "react";
import { getEvents } from "@/services/event";
import { Event } from "@/types/event";

export default function useEvent() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    try {
      const res = await getEvents();
      setEvents(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  return {
    events,
    loading,
    reload: loadEvents,
  };
}