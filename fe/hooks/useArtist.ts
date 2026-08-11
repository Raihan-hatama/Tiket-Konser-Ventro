"use client";

import { useEffect, useState } from "react";
import { getArtists } from "@/services/artist";
import { Artist } from "@/types/artist";

export default function useArtist() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  const loadArtists = async () => {
    try {
      const res = await getArtists();
      setArtists(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArtists();
  }, []);

  return {
    artists,
    loading,
    reload: loadArtists,
  };
}