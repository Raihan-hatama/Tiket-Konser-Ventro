"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Mic2,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  Ticket,
  Clock3,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";

import { getDashboard } from "@/services/dashboard";

interface DashboardSummary {
  total_events: number;
  total_artists: number;
  total_orders: number;
  total_payments: number;
  total_revenue: number | string;
}

interface TicketPerEvent {
  title: string;
  sold: number | string;
  quota: number | string;
}

interface RecentOrder {
  order_code: string;
  total_price: number | string;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
  customer_name: string;
  event_title: string;
}

interface DashboardData {
  summary: DashboardSummary;
  tickets_per_event: TicketPerEvent[];
  recent_orders: RecentOrder[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await getDashboard();
      if (res.success) setData(res.data);
    } catch (error) {
      console.error("Gagal mengambil dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (value: number | string) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const getStatus = (status: RecentOrder["status"]) => {
    if (status === "paid")
      return { text: "Paid", className: "cdx-badge-paid", icon: <CheckCircle2 size={13} /> };
    if (status === "cancelled")
      return { text: "Cancelled", className: "cdx-badge-cancel", icon: <XCircle size={13} /> };
    return { text: "Pending", className: "cdx-badge-pending", icon: <Clock3 size={13} /> };
  };

  const summary = data?.summary;

  const maxSold =
    data && data.tickets_per_event.length > 0
      ? Math.max(...data.tickets_per_event.map((i) => Number(i.sold)))
      : 1;

  const totalSold = data?.tickets_per_event.reduce((t, i) => t + Number(i.sold), 0) ?? 0;
  const totalQuota = data?.tickets_per_event.reduce((t, i) => t + Number(i.quota), 0) ?? 0;

  const paidOrders = data?.recent_orders.filter((o) => o.status === "paid").length ?? 0;
  const pendingOrders = data?.recent_orders.filter((o) => o.status === "pending").length ?? 0;
  const cancelledOrders = data?.recent_orders.filter((o) => o.status === "cancelled").length ?? 0;

  const cards: { code: string; title: string; value: number; icon: LucideIcon }[] = [
    { code: "EVT", title: "Total Acara", value: Number(summary?.total_events || 0), icon: CalendarDays },
    { code: "ART", title: "Total Artis", value: Number(summary?.total_artists || 0), icon: Mic2 },
    { code: "ORD", title: "Total Pesanan", value: Number(summary?.total_orders || 0), icon: ShoppingCart },
    { code: "PAY", title: "Total Pembayaran", value: Number(summary?.total_payments || 0), icon: CreditCard },
  ];

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
        }

        /* --- top rig / truss line --- */
        .cdx-truss {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 32px;
          background: var(--blue-900);
          overflow: hidden;
          white-space: nowrap;
        }
        .cdx-truss-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--blue-500);
          opacity: 0.35;
          flex-shrink: 0;
        }
        .cdx-truss-dot.is-lit { background: var(--white); opacity: 0.9; }
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
          width: 7px; height: 7px; border-radius: 50%;
          background: #4ADE80;
          animation: cdx-blink 2.2s ease-in-out infinite;
        }
        @keyframes cdx-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        .cdx-truss-status span {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; letter-spacing: 0.08em; color: var(--white);
        }

        /* --- header --- */
        .cdx-header { padding: 40px 32px 8px; }
        .cdx-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--blue-700); font-weight: 700;
        }
        .cdx-title {
          font-family: 'Oswald', sans-serif;
          font-weight: 700; font-size: 40px; letter-spacing: 0.01em;
          text-transform: uppercase; color: var(--ink); margin-top: 6px;
        }
        .cdx-subtitle { color: #4B5670; margin-top: 6px; font-size: 14.5px; }

        /* --- stat grid --- */
        .cdx-grid {
          display: grid; grid-template-columns: 1fr; gap: 20px;
          padding: 24px 32px 0;
        }
        @media (min-width: 640px) { .cdx-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .cdx-grid { grid-template-columns: repeat(4, 1fr); } }

        /* --- ticket stub card --- */
        .cdx-stub {
          position: relative; display: flex; background: var(--white);
          border: 1px solid var(--line); border-radius: 14px; overflow: hidden;
          box-shadow: 0 1px 2px rgba(10, 30, 77, 0.04);
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }
        .cdx-stub:hover { box-shadow: 0 10px 24px rgba(10, 30, 77, 0.10); transform: translateY(-2px); }
        .cdx-stub-main { flex: 1; padding: 22px 20px; min-width: 0; }
        .cdx-stub-top { display: flex; align-items: center; justify-content: space-between; }
        .cdx-stub-code {
          font-family: 'JetBrains Mono', monospace; font-size: 11px;
          letter-spacing: 0.14em; color: var(--blue-600); font-weight: 700;
        }
        .cdx-stub-icon-wrap {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 9px;
          background: var(--blue-100); color: var(--blue-700); flex-shrink: 0;
        }
        .cdx-stub-value {
          font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 30px;
          color: var(--ink); margin-top: 14px; line-height: 1;
        }
        .cdx-stub-label { margin-top: 8px; font-size: 13px; color: #4B5670; }

        .cdx-perf {
          position: relative; width: 1px;
          background-image: repeating-linear-gradient(
            to bottom, var(--line) 0px, var(--line) 6px, transparent 6px, transparent 12px
          );
        }
        .cdx-perf::before, .cdx-perf::after {
          content: ""; position: absolute; left: 50%; transform: translateX(-50%);
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--blue-50); border: 1px solid var(--line);
        }
        .cdx-perf::before { top: -9px; }
        .cdx-perf::after { bottom: -9px; }
        .cdx-perf.on-dark::before, .cdx-perf.on-dark::after { background: var(--blue-50); }

        .cdx-stub-tab {
          width: 46px; display: flex; align-items: center; justify-content: center;
          background: var(--blue-900); flex-shrink: 0;
        }
        .cdx-stub-tab span {
          font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.28em;
          color: rgba(255,255,255,0.85); writing-mode: vertical-rl; transform: rotate(180deg);
        }

        /* --- revenue ticket (full width, dark) --- */
        .cdx-revenue {
          margin: 24px 32px 0;
          display: flex;
          background: linear-gradient(135deg, var(--blue-900), #132D6E);
          border-radius: 16px;
          overflow: hidden;
          color: var(--white);
        }
        .cdx-revenue-main {
          flex: 1;
          padding: 28px 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }
        .cdx-revenue-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
          color: #93B4FF; font-weight: 700;
        }
        .cdx-revenue-value {
          font-family: 'Oswald', sans-serif;
          font-size: 36px; font-weight: 700; margin-top: 8px;
        }
        .cdx-revenue-caption { margin-top: 6px; font-size: 13px; color: #B7C8F7; }
        .cdx-revenue-icon {
          display: flex; align-items: center; justify-content: center;
          width: 56px; height: 56px; border-radius: 14px;
          background: rgba(255,255,255,0.1); flex-shrink: 0;
        }
        .cdx-revenue-tab {
          width: 46px; display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.06); flex-shrink: 0;
        }
        .cdx-revenue-tab span {
          font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.28em;
          color: rgba(255,255,255,0.7); writing-mode: vertical-rl; transform: rotate(180deg);
        }

        /* --- panel row --- */
        .cdx-row { display: grid; grid-template-columns: 1fr; gap: 20px; margin: 24px 32px 0; }
        @media (min-width: 1024px) { .cdx-row { grid-template-columns: 2fr 1fr; } }

        .cdx-panel {
          background: var(--white); border: 1px solid var(--line);
          border-radius: 16px; padding: 24px;
        }
        .cdx-panel-title { font-family: 'Oswald', sans-serif; font-size: 19px; font-weight: 600; color: var(--ink); }
        .cdx-panel-caption { font-size: 13px; color: #8592AD; margin-top: 2px; }

        .cdx-sold-chip {
          background: var(--blue-100); border-radius: 10px; padding: 8px 14px; text-align: right;
        }
        .cdx-sold-chip small { font-size: 11px; color: #6B7690; }
        .cdx-sold-chip strong {
          display: block; font-family: 'JetBrains Mono', monospace;
          color: var(--blue-700); font-size: 16px; margin-top: 2px;
        }

        .cdx-bar-row { margin-top: 20px; }
        .cdx-bar-head { display: flex; justify-content: space-between; font-size: 13.5px; margin-bottom: 6px; }
        .cdx-bar-head span:first-child { font-weight: 600; color: #333F5C; max-width: 65%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cdx-bar-head span:last-child { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #8592AD; }
        .cdx-bar-track { height: 9px; background: var(--blue-50); border-radius: 999px; overflow: hidden; }
        .cdx-bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--blue-600), var(--blue-500)); transition: width 0.7s ease; }

        .cdx-status-row { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; }
        .cdx-status-row:first-of-type { margin-top: 22px; }
        .cdx-status-left { display: flex; align-items: center; gap: 12px; }
        .cdx-status-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .cdx-status-icon.paid { background: #ECFDF5; color: #059669; }
        .cdx-status-icon.pending { background: #FFFBEB; color: #D97706; }
        .cdx-status-icon.cancel { background: #FEF2F2; color: #E11D48; }
        .cdx-status-label { font-size: 13.5px; font-weight: 600; color: #333F5C; }
        .cdx-status-value { font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700; color: var(--ink); }

        /* --- orders table --- */
        .cdx-orders { margin: 24px 32px 40px; background: var(--white); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
        .cdx-orders-head { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--blue-50); }
        .cdx-orders-link { display: flex; align-items: center; gap: 4px; font-size: 13.5px; font-weight: 600; color: var(--blue-600); background: none; border: none; cursor: pointer; }
        table.cdx-table { width: 100%; border-collapse: collapse; }
        table.cdx-table th {
          text-align: left; padding: 12px 24px; font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: #A0AAC2;
        }
        table.cdx-table td { padding: 14px 24px; font-size: 13.5px; border-top: 1px solid var(--blue-50); }
        table.cdx-table tr:hover td { background: var(--blue-50); }
        .cdx-order-code { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--blue-600); }

        .cdx-badge {
          display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px;
          border-radius: 999px; font-size: 12px; font-weight: 600;
        }
        .cdx-badge-paid { background: #ECFDF5; color: #059669; }
        .cdx-badge-pending { background: #FFFBEB; color: #D97706; }
        .cdx-badge-cancel { background: #FEF2F2; color: #E11D48; }

        .cdx-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 0; color: #A0AAC2; }

        /* --- skeleton --- */
        .cdx-skel-line { background: var(--blue-100); border-radius: 6px; animation: cdx-shimmer 1.4s ease-in-out infinite; }
        @keyframes cdx-shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

        @media (prefers-reduced-motion: reduce) {
          .cdx-pulse, .cdx-skel-line { animation: none; }
          .cdx-stub:hover { transform: none; }
        }
        @media (max-width: 480px) { .cdx-title { font-size: 30px; } }
      `}</style>

      {/* signature: lighting truss strip */}
      <div className="cdx-truss">
        {Array.from({ length: 34 }).map((_, i) => (
          <span key={i} className={`cdx-truss-dot ${i % 4 === 0 ? "is-lit" : ""}`} />
        ))}
        <div className="cdx-truss-status">
          <span className="cdx-pulse" />
          <span>SEMUA SISTEM AKTIF</span>
        </div>
      </div>

      <div className="cdx-header">
        <p className="cdx-eyebrow">Panel Admin — Operasional Konser</p>
        <h1 className="cdx-title">Dashboard</h1>
        <p className="cdx-subtitle">Ringkasan aktivitas dan statistik terbaru</p>
      </div>

      {/* STAT CARDS */}
      <div className="cdx-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.code} className="cdx-stub">
              <div className="cdx-stub-main">
                <div className="cdx-stub-top">
                  <span className="cdx-stub-code">{card.code} — 01</span>
                  <span className="cdx-stub-icon-wrap"><Icon size={17} /></span>
                </div>

                {loading ? (
                  <>
                    <div className="cdx-skel-line" style={{ width: "60%", height: 26, marginTop: 16 }} />
                    <div className="cdx-skel-line" style={{ width: "80%", height: 12, marginTop: 10 }} />
                  </>
                ) : (
                  <>
                    <p className="cdx-stub-value">{card.value.toLocaleString("id-ID")}</p>
                    <p className="cdx-stub-label">{card.title}</p>
                  </>
                )}
              </div>
              <div className="cdx-perf" />
              <div className="cdx-stub-tab"><span>ADMIT ONE</span></div>
            </div>
          );
        })}
      </div>

      {/* REVENUE */}
      <div className="cdx-revenue">
        <div className="cdx-revenue-main">
          <div>
            <p className="cdx-revenue-eyebrow">Total Revenue</p>
            <p className="cdx-revenue-value">
              {loading ? "—" : formatRupiah(summary?.total_revenue ?? 0)}
            </p>
            <p className="cdx-revenue-caption">Total pembayaran yang sudah diverifikasi</p>
          </div>
          <div className="cdx-revenue-icon"><TrendingUp size={26} /></div>
        </div>
        <div className="cdx-perf on-dark" style={{ background: "rgba(255,255,255,0.15)" }} />
        <div className="cdx-revenue-tab"><span>ADMIT ONE</span></div>
      </div>

      {/* CHART + PAYMENT STATUS */}
      <div className="cdx-row">
        <div className="cdx-panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p className="cdx-panel-title">Penjualan Tiket</p>
              <p className="cdx-panel-caption">Per acara</p>
            </div>
            <div className="cdx-sold-chip">
              <small>TERJUAL</small>
              <strong>{totalSold}</strong>
            </div>
          </div>

          {!loading && data && data.tickets_per_event.length === 0 && (
            <div className="cdx-empty">
              <Ticket size={30} />
              <p style={{ marginTop: 8, fontSize: 13 }}>Belum ada data tiket</p>
            </div>
          )}

          {(loading ? [] : data?.tickets_per_event.slice(0, 6) ?? []).map((event) => {
            const sold = Number(event.sold);
            const quota = Number(event.quota);
            const percentage = maxSold > 0 ? (sold / maxSold) * 100 : 0;
            return (
              <div key={event.title} className="cdx-bar-row">
                <div className="cdx-bar-head">
                  <span>{event.title}</span>
                  <span>{sold} / {quota}</span>
                </div>
                <div className="cdx-bar-track">
                  <div className="cdx-bar-fill" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginTop: 22, paddingTop: 16, borderTop: "1px solid var(--blue-50)" }}>
            <span style={{ color: "#8592AD" }}>Total kuota</span>
            <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{totalQuota} tiket</span>
          </div>
        </div>

        <div className="cdx-panel">
          <p className="cdx-panel-title">Status Pembayaran</p>
          <p className="cdx-panel-caption">Ringkasan pesanan terbaru</p>

          <div className="cdx-status-row">
            <div className="cdx-status-left">
              <div className="cdx-status-icon paid"><CheckCircle2 size={17} /></div>
              <span className="cdx-status-label">Paid</span>
            </div>
            <span className="cdx-status-value">{paidOrders}</span>
          </div>

          <div className="cdx-status-row">
            <div className="cdx-status-left">
              <div className="cdx-status-icon pending"><Clock3 size={17} /></div>
              <span className="cdx-status-label">Pending</span>
            </div>
            <span className="cdx-status-value">{pendingOrders}</span>
          </div>

          <div className="cdx-status-row">
            <div className="cdx-status-left">
              <div className="cdx-status-icon cancel"><XCircle size={17} /></div>
              <span className="cdx-status-label">Cancelled</span>
            </div>
            <span className="cdx-status-value">{cancelledOrders}</span>
          </div>
        </div>
      </div>

      {/* RECENT ORDERS */}
      <div className="cdx-orders">
        <div className="cdx-orders-head">
          <div>
            <p className="cdx-panel-title">Pesanan Terbaru</p>
            <p className="cdx-panel-caption">Aktivitas transaksi terkini</p>
          </div>
          <button className="cdx-orders-link">
            Lihat semua <ArrowUpRight size={14} />
          </button>
        </div>

        {!loading && data && data.recent_orders.length === 0 ? (
          <div className="cdx-empty">Belum ada pesanan.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="cdx-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Customer</th>
                  <th>Event</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent_orders ?? []).map((order) => {
                  const status = getStatus(order.status);
                  return (
                    <tr key={order.order_code}>
                      <td className="cdx-order-code">{order.order_code}</td>
                      <td style={{ fontWeight: 600, color: "#333F5C" }}>{order.customer_name}</td>
                      <td style={{ color: "#8592AD", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.event_title}</td>
                      <td style={{ fontWeight: 700 }}>{formatRupiah(order.total_price)}</td>
                      <td>
                        <span className={`cdx-badge ${status.className}`}>
                          {status.icon}
                          {status.text}
                        </span>
                      </td>
                      <td style={{ color: "#A0AAC2" }}>{formatDate(order.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}