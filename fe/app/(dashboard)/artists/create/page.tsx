"use client";

import { useRouter } from "next/navigation";
import ArtistForm from "@/components/forms/ArtistForm";
import { createArtist } from "@/services/artist";

export default function CreateArtistPage() {
  const router = useRouter();

  const submit = async (data: FormData) => {
    try {
      await createArtist(data);

      alert("Artist berhasil ditambahkan");

      router.push("/artists");
    } catch (err) {
      console.error(err);
      alert("Gagal menambahkan artist");
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">
        Tambah Artist
      </h1>

      <ArtistForm onSubmit={submit} />
    </div>
  );
}