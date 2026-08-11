"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";

import useEvent from "@/hooks/useEvent";
import { deleteEvent } from "@/services/event";

import EventTable from "@/components/tables/EventTable";
import Loading from "@/components/ui/Loading";
import Pagination from "@/components/ui/Pagination";

export default function EventsPage() {
  const { events, loading, reload } = useEvent();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const perPage = 5;

  const filtered = useMemo(() => {
    return events.filter(
      (item) =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.venue.toLowerCase().includes(search.toLowerCase())
    );
  }, [events, search]);

  const totalPage = Math.ceil(filtered.length / perPage);

  const currentData = filtered.slice(
    (page - 1) * perPage,
    page * perPage
  );

  const remove = async (id: number) => {
    if (!confirm("Yakin ingin menghapus event?")) return;

    await deleteEvent(id);

    reload();
  };

  if (loading) return <Loading />;

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
          margin: 0 -32px 0;
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

        .cdx-header-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          padding: 36px 32px 24px;
          flex-wrap: wrap;
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

        .cdx-add-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--blue-600);
          color: var(--white);
          font-weight: 600;
          font-size: 14px;
          padding: 12px 20px;
          border-radius: 10px;
          transition: background 0.15s ease, transform 0.15s ease;
          white-space: nowrap;
        }
        .cdx-add-btn:hover {
          background: var(--blue-700);
          transform: translateY(-1px);
        }

        .cdx-panel {
          margin: 0 32px;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(10, 30, 77, 0.04);
        }

        .cdx-search-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--line);
          background: var(--blue-50);
        }
        .cdx-search-bar svg {
          color: var(--blue-600);
          flex-shrink: 0;
        }
        .cdx-search-bar input {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
          font-size: 14px;
          color: var(--ink);
        }
        .cdx-search-bar input::placeholder {
          color: #8A93AD;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          letter-spacing: 0.02em;
        }
        .cdx-search-count {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
          letter-spacing: 0.06em;
          color: var(--blue-700);
          background: var(--blue-100);
          padding: 3px 10px;
          border-radius: 999px;
          flex-shrink: 0;
        }

        .cdx-table-wrap {
          padding: 8px 20px 20px;
        }

        .cdx-pagination-wrap {
          padding: 4px 20px 20px;
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

      <div className="cdx-header-row">
        <div>
          <p className="cdx-eyebrow">Panel Admin — Manajemen Acara</p>
          <h1 className="cdx-title">Events</h1>
          <p className="cdx-subtitle">Kelola seluruh event konser</p>
        </div>

        <Link href="/events/create" className="cdx-add-btn">
          <Plus size={16} />
          Tambah Event
        </Link>
      </div>

      <div className="cdx-panel">
        <div className="cdx-search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Cari berdasarkan nama event atau venue..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <span className="cdx-search-count">{filtered.length} HASIL</span>
        </div>

        <div className="cdx-table-wrap">
          <EventTable events={currentData} onDelete={remove} />
        </div>

        <div className="cdx-pagination-wrap">
          <Pagination
            currentPage={page}
            totalPages={totalPage}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}