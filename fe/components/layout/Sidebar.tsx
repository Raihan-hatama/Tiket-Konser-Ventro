"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Mic2,
  Ticket,
  ShoppingCart,
  CreditCard,
  LogOut,
} from "lucide-react";

const menus = [
  { code: "01", title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { code: "02", title: "Events", href: "/events", icon: CalendarDays },
  { code: "03", title: "Artists", href: "/artists", icon: Mic2 },
  { code: "04", title: "Categories", href: "/categories", icon: Ticket },
  { code: "05", title: "Orders", href: "/orders", icon: ShoppingCart },
  { code: "06", title: "Payments", href: "/payments", icon: CreditCard },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="cdx-sidebar">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');

        .cdx-sidebar {
          --blue-900: #0A1E4D;
          --blue-800: #10285F;
          --blue-600: #1D4ED8;
          --blue-500: #3B6CF0;

          width: 256px;
          height: 100vh;
          background: var(--blue-900);
          color: #FFFFFF;
          position: fixed;
          left: 0;
          top: 0;
          display: flex;
          flex-direction: column;
          font-family: 'Inter', system-ui, sans-serif;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.04);
        }

        .cdx-brand {
          padding: 20px 16px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          flex-shrink: 0;
        }
        .cdx-brand-logo {
          width: 120px;
          height: 120px;
          object-fit: contain;
          margin-bottom: 0px;
        }
        .cdx-brand-name {
          font-family: 'Oswald', sans-serif;
          font-weight: 700;
          font-size: 26px;
          letter-spacing: 0.08em;
        }
        .cdx-brand-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.22em;
          color: rgba(255,255,255,0.5);
          margin-top: 3px;
        }

        .cdx-rig {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 10px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          flex-shrink: 0;
        }
        .cdx-rig-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--blue-500);
          opacity: 0.4;
        }
        .cdx-rig-dot.is-lit {
          background: #FFFFFF;
          opacity: 0.85;
        }

        .cdx-nav {
          margin-top: 16px;
          padding: 0 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          overflow-y: auto;
        }

        .cdx-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          border-radius: 10px;
          color: rgba(255,255,255,0.7);
          font-size: 14.5px;
          font-weight: 500;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .cdx-nav-item:hover {
          background: var(--blue-800);
          color: #FFFFFF;
        }
        .cdx-nav-item.is-active {
          background: #FFFFFF;
          color: var(--blue-900);
          font-weight: 600;
        }
        .cdx-nav-code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.06em;
          margin-left: auto;
          opacity: 0.5;
        }
        .cdx-nav-item.is-active .cdx-nav-code {
          color: var(--blue-600);
          opacity: 0.85;
        }

        .cdx-logout {
          margin: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.18);
          background: transparent;
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 600;
          transition: background 0.15s ease, border-color 0.15s ease;
          flex-shrink: 0;
        }
        .cdx-logout:hover {
          background: var(--blue-800);
          border-color: rgba(255,255,255,0.32);
        }
      `}</style>

      <div className="cdx-brand">
        <Image
          src="/icons/voltra.png"
          alt="Voltra"
          width={120}
          height={120}
          className="cdx-brand-logo"
          priority
        />
        <h1 className="cdx-brand-name">VENTRO</h1>
        <span className="cdx-brand-tag">ADMIN CONSOLE</span>
      </div>

      <div className="cdx-rig">
        {Array.from({ length: 22 }).map((_, i) => (
          <span
            key={i}
            className={`cdx-rig-dot ${i % 5 === 0 ? "is-lit" : ""}`}
          />
        ))}
      </div>

      <nav className="cdx-nav">
        {menus.map((menu) => {
          const Icon = menu.icon;
          const isActive = pathname === menu.href;

          return (
            <Link
              key={menu.title}
              href={menu.href}
              className={`cdx-nav-item ${isActive ? "is-active" : ""}`}
            >
              <Icon size={19} />
              <span>{menu.title}</span>
              <span className="cdx-nav-code">{menu.code}</span>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }}
        className="cdx-logout"
      >
        <LogOut size={17} />
        Logout
      </button>
    </aside>
  );
}