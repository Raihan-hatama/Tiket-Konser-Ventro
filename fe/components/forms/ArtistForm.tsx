"use client";

import { useEffect, useRef, useState } from "react";

interface ArtistData {
  name?: string;
  bio?: string;
  photo_url?: string;
}

interface Props {
  initialData?: ArtistData;
  onSubmit: (data: FormData) => Promise<void>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const MAX_BIO = 1000;
const MAX_PHOTO_MB = 2;

export default function ArtistForm({ initialData, onSubmit }: Props) {
  const [name, setName] = useState(initialData?.name || "");
  const [bio, setBio] = useState(initialData?.bio || "");

  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState(
    initialData?.photo_url ? `${API_BASE}/${initialData.photo_url}` : ""
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Bersihkan object URL supaya tidak bocor memori
  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar.");
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setError(`Ukuran foto maksimal ${MAX_PHOTO_MB} MB.`);
      return;
    }

    setError("");
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhoto(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("bio", bio.trim());
      if (photo) formData.append("photo", photo);

      await onSubmit(formData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menyimpan artist. Coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 " +
    "placeholder:text-gray-400 transition " +
    "focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 " +
    "disabled:bg-gray-50 disabled:text-gray-500";

  const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-2xl bg-white p-6 shadow-lg sm:p-7"
    >

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Nama */}
      <div>
        <label htmlFor="artist-name" className={labelClass}>
          Nama Artist
        </label>
        <input
          id="artist-name"
          type="text"
          className={inputClass}
          placeholder="Contoh: Tulus"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      {/* Bio */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="artist-bio" className="text-sm font-medium text-gray-700">
            Bio
          </label>
          <span
            className={`text-xs ${
              bio.length > MAX_BIO * 0.9 ? "text-amber-600" : "text-gray-400"
            }`}
          >
            {bio.length}/{MAX_BIO}
          </span>
        </div>
        <textarea
          id="artist-bio"
          rows={5}
          maxLength={MAX_BIO}
          className={`${inputClass} resize-none`}
          placeholder="Ceritakan singkat tentang artist ini..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Foto */}
      <div>
        <span className={labelClass}>Foto</span>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          id="artist-photo"
          onChange={(e) => handleFile(e.target.files?.[0])}
          disabled={loading}
        />

        {preview ? (
          <div className="flex items-start gap-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <img
              src={preview}
              alt="Preview foto artist"
              className="h-40 w-28 rounded-lg border border-white object-cover shadow-md"
            />
            <div className="space-y-2">
              <p className="max-w-[16rem] truncate text-sm text-gray-600">
                {photo ? photo.name : "Foto saat ini"}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  Ganti
                </button>
                <button
                  type="button"
                  onClick={removePhoto}
                  disabled={loading}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ) : (
          <label
            htmlFor="artist-photo"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
              dragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50"
            }`}
          >
            <svg
              className="mb-3 h-10 w-10 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.16-5.16a2.25 2.25 0 013.18 0l5.16 5.16m-1.5-1.5l1.41-1.41a2.25 2.25 0 013.18 0l2.25 2.25M3.75 19.5h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25z"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              Klik untuk pilih foto, atau tarik ke sini
            </span>
            <span className="mt-1 text-xs text-gray-500">
              PNG, JPG, atau WEBP. Maks. {MAX_PHOTO_MB} MB
            </span>
          </label>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end border-t border-gray-100 pt-5">
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden="true"
            />
          )}
          {loading ? "Menyimpan..." : "Simpan Artist"}
        </button>
      </div>
    </form>
  );
}