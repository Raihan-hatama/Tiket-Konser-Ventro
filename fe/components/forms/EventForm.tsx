"use client";

import { useState } from "react";

interface Props {
  initialData?: any;
  onSubmit: (data: FormData) => Promise<void>;
}

export default function EventForm({
  initialData,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [eventDate, setEventDate] = useState(initialData?.event_date || "");
  const [eventTime, setEventTime] = useState(initialData?.event_time || "");
  const [venue, setVenue] = useState(initialData?.venue || "");
  const [status, setStatus] = useState(initialData?.status || "open");

  const [poster, setPoster] = useState<File | null>(null);

  const [preview, setPreview] = useState(
    initialData?.poster_url
      ? `http://localhost:3000/${initialData.poster_url}`
      : ""
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();

    formData.append("title", title);
    formData.append("description", description);
    formData.append("event_date", eventDate);
    formData.append("event_time", eventTime);
    formData.append("venue", venue);
    formData.append("status", status);

    if (poster) {
      formData.append("poster", poster);
    }

    await onSubmit(formData);
  };

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-xl shadow-lg p-6 space-y-5"
    >
      <div>
        <label className="block mb-2 font-medium">
          Judul Event
        </label>

        <input
          type="text"
          className="w-full border rounded-lg p-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block mb-2 font-medium">
          Deskripsi
        </label>

        <textarea
          rows={5}
          className="w-full border rounded-lg p-3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block mb-2 font-medium">
            Tanggal
          </label>

          <input
            type="date"
            className="w-full border rounded-lg p-3"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">
            Jam
          </label>

          <input
            type="time"
            className="w-full border rounded-lg p-3"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="block mb-2 font-medium">
          Venue
        </label>

        <input
          type="text"
          className="w-full border rounded-lg p-3"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block mb-2 font-medium">
          Status
        </label>

        <select
          className="w-full border rounded-lg p-3"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div>
        <label className="block mb-2 font-medium">
          Poster
        </label>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (!file) return;

            setPoster(file);

            setPreview(URL.createObjectURL(file));
          }}
        />

        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="mt-4 w-52 rounded-xl border shadow"
          />
        )}
      </div>

      <button
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
      >
        Simpan Event
      </button>
    </form>
  );
}