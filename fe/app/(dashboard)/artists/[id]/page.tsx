"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Mic2 } from "lucide-react";

import ArtistForm from "@/components/forms/ArtistForm";

import { getArtist, updateArtist } from "@/services/artist";

import { Artist } from "@/types/artist";

export default function EditArtistPage() {
  const params = useParams();
  const router = useRouter();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadArtist();
  }, []);

  const loadArtist = async () => {
    try {
      const res = await getArtist(Number(params.id));
      setArtist(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (data: FormData) => {
    setSubmitting(true);
    try {
      await updateArtist(Number(params.id), data);
      alert("Artist berhasil diupdate");
      router.push("/artists");
    } catch (err) {
      console.error(err);
      alert("Gagal update artist");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc] p-8">
      <div className="mx-auto max-w-3xl">
        {/* BREADCRUMB / BACK */}
        <button
          onClick={() => router.push("/artists")}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-indigo-600"
        >
          <ArrowLeft size={16} />
          Kembali ke daftar artis
        </button>

        {/* HEADER */}
        <div className="mb-7 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-md">
            <Mic2 size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Edit Data
            </p>
            <h1 className="text-2xl font-bold text-gray-900">
              {loading ? "Memuat..." : artist?.name || "Edit Artist"}
            </h1>
          </div>
        </div>

        {/* CARD */}
        <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-100">
          {loading ? (
            <div className="animate-pulse space-y-5">
              <div className="h-11 w-full rounded-xl bg-gray-100" />
              <div className="h-11 w-full rounded-xl bg-gray-100" />
              <div className="h-28 w-full rounded-xl bg-gray-100" />
              <div className="h-11 w-40 rounded-xl bg-gray-100" />
            </div>
          ) : !artist ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-gray-500">
                Data artist tidak ditemukan
              </p>
              <button
                onClick={() => router.push("/artists")}
                className="mt-4 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Kembali ke daftar
              </button>
            </div>
          ) : (
            <fieldset disabled={submitting} className={submitting ? "opacity-60" : ""}>
              <ArtistForm initialData={artist} onSubmit={submit} />
            </fieldset>
          )}
        </div>
      </div>
    </div>
  );
}