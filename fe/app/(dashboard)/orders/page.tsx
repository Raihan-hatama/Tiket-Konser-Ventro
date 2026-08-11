"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { Search, ShoppingCart, Eye } from "lucide-react";

import Pagination from "@/components/ui/Pagination";

interface Order {
  id: number;
  order_code: string;
  total_price: number;
  status: string;
  created_at: string;
  customer_name?: string;
  event_title?: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const perPage = 8;

  const loadOrders = async () => {
    try {
      setLoading(true);

      const res = await api.get("/orders");

      console.log("ORDERS RESPONSE:", res.data);

      setOrders(res.data.data || []);
    } catch (error: any) {
      console.error("Gagal mengambil orders:", error);

      alert(
        error.response?.data?.message ||
          "Gagal mengambil data pesanan"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const keyword = search.toLowerCase();

    return orders.filter(
      (order) =>
        order.order_code?.toLowerCase().includes(keyword) ||
        order.customer_name?.toLowerCase().includes(keyword) ||
        order.event_title?.toLowerCase().includes(keyword)
    );
  }, [orders, search]);

  const totalPage = Math.ceil(filteredOrders.length / perPage);

  const currentData = filteredOrders.slice(
    (page - 1) * perPage,
    page * perPage
  );

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (date: string) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "cdx-status paid";

      case "pending":
        return "cdx-status pending";

      case "cancelled":
      case "canceled":
        return "cdx-status cancelled";

      case "expired":
        return "cdx-status expired";

      default:
        return "cdx-status";
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
          margin: 0 -50px 0;
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

        .cdx-page-body {
          padding: 34px 50px 0;
        }

        .cdx-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .cdx-eyebrow {
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          color: var(--blue-600);
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .cdx-title {
          font-family: "Oswald", sans-serif;
          font-size: 38px;
          font-weight: 700;
          text-transform: uppercase;
          margin: 0;
        }

        .cdx-subtitle {
          margin-top: 7px;
          color: #53617d;
          font-size: 14px;
        }

        .cdx-count {
          background: var(--blue-100);
          color: var(--blue-700);
          padding: 8px 14px;
          border-radius: 20px;
          font-family: "JetBrains Mono", monospace;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .cdx-card {
          background: white;
          border: 1px solid var(--line);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 25px rgba(10, 30, 77, 0.04);
        }

        .cdx-toolbar {
          padding: 18px;
          border-bottom: 1px solid #e1e7f5;
        }

        .cdx-search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 0 14px;
          max-width: 450px;
          height: 44px;
        }

        .cdx-search-box svg {
          color: var(--blue-600);
          flex-shrink: 0;
        }

        .cdx-search-box input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 14px;
          color: var(--ink);
        }

        .cdx-search-box input::placeholder {
          color: #98a3bb;
        }

        .cdx-table-wrapper {
          overflow-x: auto;
        }

        .cdx-orders-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 850px;
        }

        .cdx-orders-table thead {
          background: var(--blue-900);
          color: white;
        }

        .cdx-orders-table th {
          padding: 15px 18px;
          text-align: left;
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .cdx-orders-table td {
          padding: 18px;
          border-bottom: 1px solid #edf1f8;
          font-size: 13px;
          color: #33415f;
        }

        .cdx-orders-table tbody tr:last-child td {
          border-bottom: none;
        }

        .cdx-orders-table tbody tr:hover {
          background: #f8faff;
        }

        .cdx-order-code {
          font-family: "JetBrains Mono", monospace;
          font-size: 12px;
          font-weight: 700;
          color: var(--blue-700);
        }

        .cdx-customer {
          font-weight: 600;
          color: var(--ink);
        }

        .cdx-event {
          color: #53617d;
        }

        .cdx-price {
          font-weight: 700;
          color: var(--ink);
          white-space: nowrap;
        }

        .cdx-status {
          display: inline-flex;
          padding: 6px 11px;
          border-radius: 20px;
          background: var(--blue-100);
          color: #53617d;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .cdx-status.paid {
          background: #dcfce7;
          color: #15803d;
        }

        .cdx-status.pending {
          background: #fef3c7;
          color: #b45309;
        }

        .cdx-status.cancelled,
        .cdx-status.expired {
          background: #fee2e2;
          color: #dc2626;
        }

        .cdx-date {
          white-space: nowrap;
          color: #66738d;
        }

        .cdx-detail-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          background: var(--blue-600);
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .cdx-detail-button:hover {
          background: var(--blue-700);
        }

        .cdx-empty {
          text-align: center;
          padding: 65px 20px;
          color: #7b879f;
        }

        .cdx-empty-icon {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          background: var(--blue-100);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
          color: var(--blue-600);
        }

        .cdx-empty-title {
          font-weight: 700;
          color: #33415f;
          margin-bottom: 5px;
        }

        .cdx-loading {
          text-align: center;
          padding: 65px;
          color: #53617d;
        }

        .cdx-pagination-wrap {
          padding: 4px 18px 18px;
        }

        @media (max-width: 800px) {
          .cdx-page-body {
            padding: 25px 20px 0;
          }

          .cdx-header {
            align-items: flex-start;
          }

          .cdx-title {
            font-size: 32px;
          }
        }
      `}</style>

      {/* SIGNATURE TRUSS STRIP */}
      <div className="cdx-truss" style={{ margin: 0 }}>
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

      <div className="cdx-page-body">
        {/* HEADER */}
        <div className="cdx-header">
          <div>
            <div className="cdx-eyebrow">PANEL ADMIN — TRANSAKSI</div>
            <h1 className="cdx-title">Orders</h1>
            <p className="cdx-subtitle">Kelola seluruh pesanan tiket konser</p>
          </div>

          <div className="cdx-count">{filteredOrders.length} PESANAN</div>
        </div>

        {/* CARD */}
        <div className="cdx-card">
          {/* SEARCH */}
          <div className="cdx-toolbar">
            <div className="cdx-search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Cari kode order, customer, atau event..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* TABLE */}
          <div className="cdx-table-wrapper">
            {loading ? (
              <div className="cdx-loading">Memuat data pesanan...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="cdx-empty">
                <div className="cdx-empty-icon">
                  <ShoppingCart size={23} />
                </div>
                <div className="cdx-empty-title">Belum ada pesanan</div>
                <div>Data pesanan akan muncul di sini.</div>
              </div>
            ) : (
              <table className="cdx-orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Event</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {currentData.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <span className="cdx-order-code">{order.order_code}</span>
                      </td>

                      <td>
                        <span className="cdx-customer">
                          {order.customer_name || "-"}
                        </span>
                      </td>

                      <td>
                        <span className="cdx-event">
                          {order.event_title || "-"}
                        </span>
                      </td>

                      <td>
                        <span className="cdx-price">
                          {formatRupiah(order.total_price)}
                        </span>
                      </td>

                      <td>
                        <span className={getStatusClass(order.status)}>
                          {order.status || "-"}
                        </span>
                      </td>

                      <td>
                        <span className="cdx-date">
                          {formatDate(order.created_at)}
                        </span>
                      </td>

                      <td>
                        <button
                          className="cdx-detail-button"
                          onClick={() =>
                            (window.location.href = `/orders/${order.id}`)
                          }
                        >
                          <Eye size={14} />
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!loading && filteredOrders.length > 0 && (
            <div className="cdx-pagination-wrap">
              <Pagination
                currentPage={page}
                totalPages={totalPage}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}