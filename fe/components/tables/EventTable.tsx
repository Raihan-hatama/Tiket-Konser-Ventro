"use client";

import Link from "next/link";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

import { Event } from "@/types/event";
import { API_URL } from "@/utils/constants";
import formatDate from "../../utils/formatDate";

interface Props {
  events: Event[];
  onDelete: (id: number) => void;
}

export default function EventTable({
  events,
  onDelete,
}: Props) {
  return (
    <div className="cdx-table-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');

        .cdx-table-shell {
          --ink: #0B0F19;
          --blue-900: #0A1E4D;
          --blue-700: #143FA6;
          --blue-600: #1D4ED8;
          --blue-50: #F4F7FE;
          --line: #D6E0F7;

          overflow-x: auto;
          border: 1px solid var(--line);
          border-radius: 14px;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .cdx-table {
          width: 100%;
          border-collapse: collapse;
        }

        .cdx-table thead {
          background: var(--blue-900);
        }
        .cdx-table th {
          padding: 14px 16px;
          text-align: left;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.85);
          font-weight: 600;
          white-space: nowrap;
        }
        .cdx-table th.is-center {
          text-align: center;
        }

        .cdx-table tbody tr {
          border-bottom: 1px solid var(--line);
          transition: background 0.12s ease;
        }
        .cdx-table tbody tr:last-child {
          border-bottom: none;
        }
        .cdx-table tbody tr:hover {
          background: var(--blue-50);
        }
        .cdx-table td {
          padding: 12px 16px;
          font-size: 13.5px;
          color: var(--ink);
          vertical-align: middle;
        }

        .cdx-poster {
          width: 60px;
          height: 60px;
          border-radius: 10px;
          object-fit: cover;
          border: 1px solid var(--line);
          background: var(--blue-50);
        }

        .cdx-title {
          font-weight: 600;
          color: var(--ink);
        }

        .cdx-venue {
          color: #4B5670;
        }

        .cdx-date {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12.5px;
          color: var(--blue-700);
          white-space: nowrap;
        }

        .cdx-actions {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .cdx-empty {
          text-align: center;
          padding: 48px 16px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12.5px;
          letter-spacing: 0.04em;
          color: #8A93AD;
        }
      `}</style>

      <table className="cdx-table">
        <thead>
          <tr>
            <th>Poster</th>
            <th>Judul</th>
            <th>Venue</th>
            <th>Tanggal</th>
            <th className="is-center">Status</th>
            <th className="is-center">Aksi</th>
          </tr>
        </thead>

        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>
                <img
                  src={
                        event.poster_url
                         ? `${API_URL}${event.poster_url}`
                            : "/images/no-image.png"
                      }
                  alt={event.title}
                  className="cdx-poster"
                />
              </td>

              <td className="cdx-title">{event.title}</td>

              <td className="cdx-venue">{event.venue}</td>

              <td className="cdx-date">{formatDate(event.event_date)}</td>

              <td style={{ textAlign: "center" }}>
                <Badge status={event.status} />
              </td>

              <td>
                <div className="cdx-actions">
                  <Link href={`/events/${event.id}`}>
                    <Button>
                      Edit
                    </Button>
                  </Link>

                  <Button
                    variant="danger"
                    onClick={() => onDelete(event.id)}
                  >
                    Hapus
                  </Button>
                </div>
              </td>
            </tr>
          ))}

          {events.length === 0 && (
            <tr>
              <td colSpan={6} className="cdx-empty">
                Tidak ada data event.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}