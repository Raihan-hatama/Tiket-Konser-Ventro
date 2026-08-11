"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, ChevronDown, User, Settings, LogOut } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="cdx-navbar">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');

        .cdx-navbar {
          --ink: #0B0F19;
          --blue-900: #0A1E4D;
          --blue-700: #143FA6;
          --blue-600: #1D4ED8;
          --blue-100: #E7EDFC;
          --blue-50: #F4F7FE;
          --line: #D6E0F7;

          height: 80px;
          background: #FFFFFF;
          border-bottom: 1px solid var(--line);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          position: sticky;
          top: 0;
          z-index: 40;
          font-family: 'Inter', system-ui, sans-serif;
          color: var(--ink);
        }

        .cdx-greet-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--blue-700);
          font-weight: 700;
        }
        .cdx-greet-title {
          font-size: 17px;
          font-weight: 600;
          color: var(--ink);
          margin-top: 2px;
        }
        .cdx-greet-sub {
          font-size: 12.5px;
          color: #6B7690;
          margin-top: 1px;
        }

        .cdx-right {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .cdx-bell {
          position: relative;
          height: 42px;
          width: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: var(--blue-50);
          border: 1px solid var(--line);
          color: var(--blue-700);
          transition: background 0.15s ease;
        }
        .cdx-bell:hover {
          background: var(--blue-100);
        }
        .cdx-bell-dot {
          position: absolute;
          top: 9px;
          right: 9px;
          height: 7px;
          width: 7px;
          border-radius: 50%;
          background: var(--blue-600);
          box-shadow: 0 0 0 2px #FFFFFF;
        }

        .cdx-divider {
          height: 30px;
          width: 1px;
          background: var(--line);
        }

        .cdx-user-wrap {
          position: relative;
        }
        .cdx-user-btn {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 6px 12px 6px 6px;
          border-radius: 999px;
          transition: background 0.15s ease;
        }
        .cdx-user-btn:hover {
          background: var(--blue-50);
        }
        .cdx-avatar {
          height: 38px;
          width: 38px;
          border-radius: 10px;
          background: var(--blue-600);
          color: #FFFFFF;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cdx-user-name {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--ink);
          line-height: 1.2;
          text-align: left;
        }
        .cdx-user-role {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          letter-spacing: 0.05em;
          color: #6B7690;
          line-height: 1.2;
        }
        .cdx-chevron {
          color: #9AA3BC;
          transition: transform 0.15s ease;
        }
        .cdx-chevron.is-open {
          transform: rotate(180deg);
        }

        .cdx-dropdown {
          position: absolute;
          right: 0;
          margin-top: 10px;
          width: 208px;
          background: #FFFFFF;
          border: 1px solid var(--line);
          border-radius: 12px;
          box-shadow: 0 12px 28px rgba(10, 30, 77, 0.12);
          padding: 6px;
          z-index: 50;
        }
        .cdx-dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 10px;
          border-radius: 8px;
          font-size: 13.5px;
          color: #333B4E;
          transition: background 0.15s ease;
        }
        .cdx-dropdown-item:hover {
          background: var(--blue-50);
          color: var(--blue-700);
        }
        .cdx-dropdown-divider {
          height: 1px;
          background: var(--line);
          margin: 6px 2px;
        }
        .cdx-dropdown-item.is-danger {
          color: var(--blue-700);
          font-weight: 600;
        }
        .cdx-dropdown-item.is-danger:hover {
          background: var(--blue-100);
        }
      `}</style>

      <div>
        <p className="cdx-greet-eyebrow">Ringkasan Hari Ini</p>
        <h2 className="cdx-greet-title">Selamat datang kembali</h2>
        <p className="cdx-greet-sub">Berikut ringkasan aktivitas hari ini</p>
      </div>

      <div className="cdx-right">
        <button className="cdx-bell">
          <Bell size={19} />
          <span className="cdx-bell-dot" />
        </button>

        <div className="cdx-divider" />

        <div className="cdx-user-wrap" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="cdx-user-btn"
          >
            <div className="cdx-avatar">A</div>
            <div className="hidden sm:block">
              <p className="cdx-user-name">Admin</p>
              <p className="cdx-user-role">ADMINISTRATOR</p>
            </div>
            <ChevronDown size={16} className={`cdx-chevron ${open ? "is-open" : ""}`} />
          </button>

          {open && (
            <div className="cdx-dropdown">
              <button className="cdx-dropdown-item">
                <User size={16} />
                Profil Saya
              </button>
              <button className="cdx-dropdown-item">
                <Settings size={16} />
                Pengaturan
              </button>

              <div className="cdx-dropdown-divider" />

              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  window.location.href = "/login";
                }}
                className="cdx-dropdown-item is-danger"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}