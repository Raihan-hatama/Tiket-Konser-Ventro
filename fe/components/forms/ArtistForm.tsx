"use client";

import { useState } from "react";

interface Props {
  initialData?: any;
  onSubmit: (data: FormData) => Promise<void>;
}

export default function ArtistForm({
  initialData,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialData?.name || "");
  const [bio, setBio] = useState(initialData?.bio || "");
  const [photo, setPhoto] = useState<File | null>(null);

  const [preview, setPreview] = useState(
    initialData?.photo_url
      ? `http://localhost:3000/${initialData.photo_url}`
      : ""
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();

    formData.append("name", name);
    formData.append("bio", bio);

    if (photo) {
      formData.append("photo", photo);
    }

    await onSubmit(formData);
  };

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-xl shadow-lg p-6 space-y-5"
    >
      <div>
        <label className="font-medium block mb-2">
          Nama Artist
        </label>

        <input
          className="w-full border rounded-lg p-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="font-medium block mb-2">
          Bio
        </label>

        <textarea
          rows={5}
          className="w-full border rounded-lg p-3"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>

      <div>
        <label className="font-medium block mb-2">
          Foto
        </label>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (!file) return;

            setPhoto(file);
            setPreview(URL.createObjectURL(file));
          }}
        />

        {preview && (
          <img
            src={preview}
            className="w-44 mt-4 rounded-xl border"
            alt="Preview"
          />
        )}
      </div>

      <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg">
        Simpan Artist
      </button>
    </form>
    );
}