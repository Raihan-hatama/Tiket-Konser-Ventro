"use client";

import { useEffect, useState } from "react";
import { getCategories } from "../services/categorie";
import { Category } from "@/types/category";

export default function useCategory(eventId: number) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    try {
      const res = await getCategories(eventId);
      setCategories(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      loadCategories();
    }
  }, [eventId]);

  return {
    categories,
    loading,
    reload: loadCategories,
  };
}