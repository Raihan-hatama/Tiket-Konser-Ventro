"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

import api from "@/services/api";

import CategoryForm from "@/components/forms/CategoryForm";

export default function EditCategoryPage() {
  const router = useRouter();

  const params = useParams();

  const [category, setCategory] =
    useState<any>();

  useEffect(() => {
    loadCategory();
  }, []);

  const loadCategory = async () => {
    try {
      const res = await api.get(
        `/categories/${params.id}`
      );

      setCategory(res.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  const submit = async (data: any) => {
    try {
      await api.put(
        `/categories/${params.id}`,
        data
      );

      alert("Kategori berhasil diperbarui");

      router.push("/categories");
    } catch (err: any) {
      alert(
        err.response?.data?.message ??
          "Gagal update"
      );
    }
  };

  if (!category) return null;

  return (
    <div className="space-y-6">

      <h1 className="text-3xl font-bold">
        Edit Ticket Category
      </h1>

      <CategoryForm
        initialData={category}
        onSubmit={submit}
      />

    </div>
  );
}