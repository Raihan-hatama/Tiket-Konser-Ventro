"use client";

import Link from "next/link";

import Button from "@/components/ui/Button";
import { Artist } from "@/types/artist";
import { API_URL } from "@/utils/constants";

interface Props {
  artists: Artist[];
  onDelete: (id: number) => void;
}

export default function ArtistTable({
  artists,
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

        .cdx-photo {
          width: 60px;
          height: 60px;
          border-radius: 10px;
          object-fit: cover;
          border: 1px solid var(--line);
          background: var(--blue-50);
        }

        .cdx-name {
          font-weight: 600;
          color: var(--ink);
        }

        .cdx-bio {
          color: #4B5670;
          max-width: 320px;
          overflow: hidden;
          text-overflow: ellipsis;
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
            <th>Foto</th>
            <th>Nama</th>
            <th>Bio</th>
            <th className="is-center">Aksi</th>
          </tr>
        </thead>

        <tbody>
          {artists.map((artist) => (
            <tr key={artist.id}>
              <td>
                <img
                  src={
                       artist.photo_url
                       ? artist.photo_url
                      : "/images/no-image.png"
                    }
                  alt={artist.name}
                  className="cdx-photo"
                />
              </td>

              <td className="cdx-name">{artist.name}</td>

              <td className="cdx-bio">{artist.bio}</td>

              <td>
                <div className="cdx-actions">
                  <Link href={`/artists/${artist.id}`}>
                    <Button>Edit</Button>
                  </Link>

                  <Button
                    variant="danger"
                    onClick={() => onDelete(artist.id)}
                  >
                    Hapus
                  </Button>
                </div>
              </td>
            </tr>
          ))}

          {artists.length === 0 && (
            <tr>
              <td colSpan={4} className="cdx-empty">
                Belum ada artist.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}