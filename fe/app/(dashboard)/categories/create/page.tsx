"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import CategoryForm from "@/components/forms/CategoryForm";
import { createCategory } from "@/services/categorie";

export default function CreateCategoryPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (data: any) => {
    setSubmitting(true);
    try {
      await createCategory(
        data.event_id,
        {
          name: data.name,
          price: data.price,
          quota: data.quota,
        }
      );

      alert("Kategori berhasil dibuat");

      router.push("/categories");
    } catch (err: any) {
      alert(
        err.response?.data?.message ??
          "Gagal membuat kategori"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cdx-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');

        .cdx-root {
          --ink: #0B0F19;
          --blue-900: #0A1E4D;
          --blue-700: #143FA6;
          --blue-600: #1D4ED8;
          --blue-500: #3B6CF0;
          --blue-100: #E7EDFC;
          --blue-50: #F4F7FE;
          --line: #D6E0F7;
          --white: #FFFFFF;

          min-height: 100vh;
          background: var(--blue-50);
          color: var(--ink);
          font-family: 'Inter', system-ui, sans-serif;
          padding-bottom: 48px;
        }

        .cdx-truss {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 32px;
          background: var(--blue-900);
          overflow: hidden;
        }
        .cdx-truss-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--blue-500);
          opacity: 0.35;
          flex-shrink: 0;
        }
        .cdx-truss-dot.is-lit {
          background: var(--white);
          opacity: 0.9;
        }
        .cdx-truss-status {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          flex-shrink: 0;
        }
        .cdx-pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4ADE80;
          animation: cdx-blink 2.2s ease-in-out infinite;
        }
        @keyframes cdx-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        .cdx-truss-status span {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.08em;
          color: var(--white);
        }

        .cdx-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.06em;
          color: var(--blue-700);
          margin: 28px 32px 0;
        }
        .cdx-back:hover {
          color: var(--blue-600);
        }

        .cdx-header {
          padding: 12px 32px 24px;
        }
        .cdx-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--blue-700);
          font-weight: 700;
        }
        .cdx-title {
          font-family: 'Oswald', sans-serif;
          font-weight: 700;
          font-size: 36px;
          letter-spacing: 0.01em;
          text-transform: uppercase;
          color: var(--ink);
          margin-top: 6px;
        }
        .cdx-subtitle {
          color: #4B5670;
          margin-top: 6px;
          font-size: 14.5px;
        }

        .cdx-panel {
          margin: 0 32px;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 1px 2px rgba(10, 30, 77, 0.04);
        }
      `}</style>

      <div className="cdx-truss">
        {Array.from({ length: 34 }).map((_, i) => (
          <span
            key={i}
            className={`cdx-truss-dot ${i % 4 === 0 ? "is-lit" : ""}`}
          />
        ))}
        <div className="cdx-truss-status">
          <span className="cdx-pulse" />
          <span>SEMUA SISTEM AKTIF</span>
        </div>
      </div>

      <Link href="/categories" className="cdx-back">
        <ArrowLeft size={13} />
        Kembali ke Categories
      </Link>

      <div className="cdx-header">
        <p className="cdx-eyebrow">Panel Admin — Kategori Baru</p>
        <h1 className="cdx-title">Tambah Category</h1>
        <p className="cdx-subtitle">Lengkapi detail kategori tiket untuk event terkait.</p>
      </div>

      <div className="cdx-panel">
        <fieldset disabled={submitting} className={submitting ? "opacity-60" : ""}>
          <CategoryForm onSubmit={submit} />
        </fieldset>
      </div>
    </div>
  );
}