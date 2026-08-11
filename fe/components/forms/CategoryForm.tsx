"use client";

import { useEffect, useState } from "react";
import { getEvents } from "@/services/event";

interface Props {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
}

export default function CategoryForm({
  initialData,
  onSubmit,
}: Props) {
  const [events, setEvents] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    event_id: initialData?.event_id || "",
    name: initialData?.name || "",
    price: initialData?.price || "",
    quota: initialData?.quota || "",
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const res = await getEvents();
    setEvents(res.data);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-800">
          Event
        </label>

        <select
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
          value={form.event_id}
          onChange={(e) =>
            setForm({
              ...form,
              event_id: Number(e.target.value),
            })
          }
          required
        >
          <option value="" className="text-gray-400">
            Pilih Event
          </option>

          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-800">
          Nama Kategori
        </label>

        <input
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
          placeholder="Contoh: VIP, Reguler, VVIP"
          value={form.name}
          onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value,
            })
          }
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-800">
            Harga
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              Rp
            </span>
            <input
              type="number"
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
              placeholder="0"
              value={form.price}
              onChange={(e) =>
                setForm({
                  ...form,
                  price: Number(e.target.value),
                })
              }
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-800">
            Kuota
          </label>

          <input
            type="number"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
            placeholder="0"
            value={form.quota}
            onChange={(e) =>
              setForm({
                ...form,
                quota: Number(e.target.value),
              })
            }
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Menyimpan..." : "Simpan Category"}
      </button>
    </form>
  );
}