"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  RefreshCw,
} from "lucide-react";

import {
  getPayments,
  verifyPayment,
  Payment,
} from "@/services/payment";

import PaymentTable from "@/components/tables/PaymentTable";
import Pagination from "@/components/ui/Pagination";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "verified" | "rejected"
  >("all");

  const [page, setPage] = useState(1);

  const perPage = 5;

  // =========================================================
  // LOAD PAYMENTS
  // =========================================================

  const loadPayments = async () => {
    try {
      setLoading(true);

      const response = await getPayments();

      console.log("PAYMENTS DATA:", response);

      setPayments(response.data || []);
    } catch (error) {
      console.error("Gagal mengambil data pembayaran:", error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  // =========================================================
  // VERIFY / REJECT
  // =========================================================

  const handleVerify = async (
    orderId: number,
    status: "verified" | "rejected"
  ) => {
    const message =
      status === "verified"
        ? "Apakah kamu yakin ingin memverifikasi pembayaran ini?"
        : "Apakah kamu yakin ingin menolak pembayaran ini?";

    const yakin = window.confirm(message);

    if (!yakin) return;

    try {
      setProcessing(orderId);

      await verifyPayment(orderId, status);

      alert(
        status === "verified"
          ? "Pembayaran berhasil diverifikasi."
          : "Pembayaran berhasil ditolak."
      );

      await loadPayments();
    } catch (error) {
      console.error(error);

      alert("Gagal memproses pembayaran.");
    } finally {
      setProcessing(null);
    }
  };

  // =========================================================
  // STATISTICS
  // =========================================================

  const stats = useMemo(() => {
    const total = payments.length;

    const pending = payments.filter(
      (payment) => payment.status === "pending"
    ).length;

    const verified = payments.filter(
      (payment) => payment.status === "verified"
    ).length;

    const rejected = payments.filter(
      (payment) => payment.status === "rejected"
    ).length;

    const revenue = payments
      .filter((payment) => payment.status === "verified")
      .reduce(
        (total, payment) =>
          total +
          Number(payment.amount || payment.total_price || 0),
        0
      );

    return {
      total,
      pending,
      verified,
      rejected,
      revenue,
    };
  }, [payments]);

  // =========================================================
  // FILTER
  // =========================================================

  const filteredPayments = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return payments.filter((payment) => {
      const matchSearch =
        !keyword ||
        payment.order_code?.toLowerCase().includes(keyword) ||
        payment.customer_name?.toLowerCase().includes(keyword) ||
        payment.event_title?.toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "all" ||
        payment.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [payments, search, statusFilter]);

  // =========================================================
  // PAGINATION
  // =========================================================

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPayments.length / perPage)
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedPayments = useMemo(() => {
    const start = (page - 1) * perPage;
    const end = start + perPage;

    return filteredPayments.slice(start, end);
  }, [filteredPayments, page]);

  // =========================================================
  // FORMAT RUPIAH
  // =========================================================

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  // =========================================================
  // RENDER
  // =========================================================

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
          --green-50: #F0FDF4;
          --green-100: #DCFCE7;
          --green-600: #16A34A;
          --green-700: #15803D;
          --red-50: #FEF2F2;
          --red-100: #FEE2E2;
          --red-600: #DC2626;
          --red-700: #B91C1C;
          --yellow-50: #FFFBEB;
          --yellow-100: #FEF9C3;
          --yellow-600: #CA8A04;
          --yellow-700: #A16207;

          min-height: 100vh;
          background: var(--blue-50);
          color: var(--ink);
          font-family: 'Inter', system-ui, sans-serif;
          padding: 0 0 48px;
        }

        /* ================= TRUSS ================= */
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

        /* ================= HEADER ================= */
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

        .cdx-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--white);
          border: 1px solid var(--line);
          color: var(--blue-700);
          font-weight: 600;
          font-size: 13.5px;
          padding: 11px 18px;
          border-radius: 10px;
          transition: background 0.15s ease;
          white-space: nowrap;
        }
        .cdx-refresh-btn:hover:not(:disabled) {
          background: var(--blue-50);
        }
        .cdx-refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .cdx-spin {
          animation: cdx-spin 1s linear infinite;
        }
        @keyframes cdx-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ================= STAT GRID ================= */
        .cdx-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin: 0 32px 24px;
        }
        @media (max-width: 1100px) {
          .cdx-stat-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .cdx-stat-grid { grid-template-columns: 1fr; }
        }

        .cdx-stat-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(10, 30, 77, 0.04);
        }
        .cdx-stat-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }
        .cdx-stat-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.14em;
        }
        .cdx-stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cdx-stat-number {
          font-family: 'Oswald', sans-serif;
          font-weight: 700;
          font-size: 30px;
          color: var(--blue-900);
          margin-top: 14px;
        }
        .cdx-stat-label {
          font-size: 13px;
          color: #4B5670;
          margin-top: 4px;
        }

        .cdx-stat-card--total .cdx-stat-tag { color: var(--blue-600); }
        .cdx-stat-card--total .cdx-stat-icon { background: var(--blue-100); color: var(--blue-700); }
        .cdx-stat-card--pending { border-color: #FDE68A; }
        .cdx-stat-card--pending .cdx-stat-tag { color: var(--yellow-600); }
        .cdx-stat-card--pending .cdx-stat-icon { background: var(--yellow-50); color: var(--yellow-600); }
        .cdx-stat-card--verified { border-color: #BBF7D0; }
        .cdx-stat-card--verified .cdx-stat-tag { color: var(--green-600); }
        .cdx-stat-card--verified .cdx-stat-icon { background: var(--green-50); color: var(--green-600); }
        .cdx-stat-card--rejected { border-color: #FECACA; }
        .cdx-stat-card--rejected .cdx-stat-tag { color: var(--red-600); }
        .cdx-stat-card--rejected .cdx-stat-icon { background: var(--red-50); color: var(--red-600); }

        /* ================= REVENUE ================= */
        .cdx-revenue {
          margin: 0 32px 24px;
          background: var(--blue-900);
          border-radius: 14px;
          padding: 22px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .cdx-revenue-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: var(--blue-500);
        }
        .cdx-revenue-value {
          font-family: 'Oswald', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: var(--white);
          margin-top: 8px;
        }
        .cdx-revenue-caption {
          font-size: 12.5px;
          color: #A9BCE8;
          margin-top: 4px;
        }
        .cdx-revenue-badge {
          background: rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 10px 20px;
        }
        .cdx-revenue-badge p:first-child {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--blue-500);
          letter-spacing: 0.1em;
        }
        .cdx-revenue-badge p:last-child {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          color: #4ADE80;
          margin-top: 2px;
          font-size: 13px;
          letter-spacing: 0.04em;
        }

        /* ================= FILTER BAR ================= */
        .cdx-filter-bar {
          margin: 0 32px 20px;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 16px 18px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          box-shadow: 0 1px 2px rgba(10, 30, 77, 0.04);
        }

        .cdx-search {
          position: relative;
          width: 100%;
          max-width: 360px;
        }
        .cdx-search svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--blue-600);
        }
        .cdx-search input {
          width: 100%;
          border: 1px solid var(--line);
          background: var(--blue-50);
          border-radius: 10px;
          padding: 10px 14px 10px 38px;
          font-size: 13.5px;
          outline: none;
          color: var(--ink);
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .cdx-search input::placeholder {
          color: #8A93AD;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12.5px;
        }
        .cdx-search input:focus {
          border-color: var(--blue-500);
          background: var(--white);
        }

        .cdx-filter-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .cdx-filter-chip {
          border: 1px solid transparent;
          border-radius: 999px;
          padding: 8px 16px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          transition: background 0.15s ease, color 0.15s ease;
          background: var(--blue-50);
          color: #4B5670;
        }
        .cdx-filter-chip.is-active-all {
          background: var(--blue-900);
          color: var(--white);
        }
        .cdx-filter-chip.is-pending {
          background: var(--yellow-50);
          color: var(--yellow-700);
        }
        .cdx-filter-chip.is-pending.is-active {
          background: var(--yellow-600);
          color: var(--white);
        }
        .cdx-filter-chip.is-verified {
          background: var(--green-50);
          color: var(--green-700);
        }
        .cdx-filter-chip.is-verified.is-active {
          background: var(--green-600);
          color: var(--white);
        }
        .cdx-filter-chip.is-rejected {
          background: var(--red-50);
          color: var(--red-700);
        }
        .cdx-filter-chip.is-rejected.is-active {
          background: var(--red-600);
          color: var(--white);
        }

        /* ================= TABLE PANEL ================= */
        .cdx-panel {
          margin: 0 32px;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(10, 30, 77, 0.04);
        }

        .cdx-loading-block {
          min-height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cdx-loading-block p {
          margin-top: 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12.5px;
          letter-spacing: 0.04em;
          color: #8A93AD;
          text-align: center;
        }

        /* ================= FOOTER ================= */
        .cdx-footer {
          margin: 16px 32px 0;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 16px 20px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .cdx-footer p {
          font-size: 12.5px;
          color: #4B5670;
        }
        .cdx-footer strong {
          color: var(--ink);
          font-weight: 700;
        }
      `}</style>

      {/* TRUSS */}
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

      {/* HEADER */}
      <div className="cdx-header-row">
        <div>
          <p className="cdx-eyebrow">Panel Admin — Manajemen Pembayaran</p>
          <h1 className="cdx-title">Payments</h1>
          <p className="cdx-subtitle">
            Kelola dan verifikasi pembayaran tiket konser.
          </p>
        </div>

        <button
          onClick={loadPayments}
          disabled={loading}
          className="cdx-refresh-btn"
        >
          <RefreshCw size={16} className={loading ? "cdx-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* STATISTICS */}
      <div className="cdx-stat-grid">
        <div className="cdx-stat-card cdx-stat-card--total">
          <div className="cdx-stat-top">
            <span className="cdx-stat-tag">PAY&nbsp;-&nbsp;01</span>
            <div className="cdx-stat-icon">
              <CreditCard size={20} />
            </div>
          </div>
          <p className="cdx-stat-number">{stats.total}</p>
          <p className="cdx-stat-label">Total Pembayaran</p>
        </div>

        <div className="cdx-stat-card cdx-stat-card--pending">
          <div className="cdx-stat-top">
            <span className="cdx-stat-tag">PAY&nbsp;-&nbsp;02</span>
            <div className="cdx-stat-icon">
              <Clock size={20} />
            </div>
          </div>
          <p className="cdx-stat-number">{stats.pending}</p>
          <p className="cdx-stat-label">Menunggu Verifikasi</p>
        </div>

        <div className="cdx-stat-card cdx-stat-card--verified">
          <div className="cdx-stat-top">
            <span className="cdx-stat-tag">PAY&nbsp;-&nbsp;03</span>
            <div className="cdx-stat-icon">
              <CheckCircle size={20} />
            </div>
          </div>
          <p className="cdx-stat-number">{stats.verified}</p>
          <p className="cdx-stat-label">Terverifikasi</p>
        </div>

        <div className="cdx-stat-card cdx-stat-card--rejected">
          <div className="cdx-stat-top">
            <span className="cdx-stat-tag">PAY&nbsp;-&nbsp;04</span>
            <div className="cdx-stat-icon">
              <XCircle size={20} />
            </div>
          </div>
          <p className="cdx-stat-number">{stats.rejected}</p>
          <p className="cdx-stat-label">Ditolak</p>
        </div>
      </div>

      {/* REVENUE */}
      <div className="cdx-revenue">
        <div>
          <p className="cdx-revenue-tag">VERIFIED REVENUE</p>
          <p className="cdx-revenue-value">{formatRupiah(stats.revenue)}</p>
          <p className="cdx-revenue-caption">
            Total pembayaran yang sudah diverifikasi
          </p>
        </div>

        <div className="cdx-revenue-badge">
          <p>STATUS</p>
          <p>VERIFIED</p>
        </div>
      </div>

      {/* SEARCH + FILTER */}
      <div className="cdx-filter-bar">
        <div className="cdx-search">
          <Search size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari order, customer, atau event..."
          />
        </div>

        <div className="cdx-filter-group">
          <button
            onClick={() => {
              setStatusFilter("all");
              setPage(1);
            }}
            className={`cdx-filter-chip ${
              statusFilter === "all" ? "is-active-all" : ""
            }`}
          >
            Semua
          </button>

          <button
            onClick={() => {
              setStatusFilter("pending");
              setPage(1);
            }}
            className={`cdx-filter-chip is-pending ${
              statusFilter === "pending" ? "is-active" : ""
            }`}
          >
            Pending
          </button>

          <button
            onClick={() => {
              setStatusFilter("verified");
              setPage(1);
            }}
            className={`cdx-filter-chip is-verified ${
              statusFilter === "verified" ? "is-active" : ""
            }`}
          >
            Verified
          </button>

          <button
            onClick={() => {
              setStatusFilter("rejected");
              setPage(1);
            }}
            className={`cdx-filter-chip is-rejected ${
              statusFilter === "rejected" ? "is-active" : ""
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="cdx-panel">
        {loading ? (
          <div className="cdx-loading-block">
            <div>
              <RefreshCw
                size={26}
                className="cdx-spin"
                style={{ margin: "0 auto", display: "block", color: "#1D4ED8" }}
              />
              <p>Memuat data pembayaran...</p>
            </div>
          </div>
        ) : (
          <PaymentTable
            payments={paginatedPayments}
            processing={processing}
            onVerify={handleVerify}
          />
        )}
      </div>

      {/* FOOTER / PAGINATION */}
      {!loading && filteredPayments.length > 0 && (
        <div className="cdx-footer">
          <p>
            Menampilkan{" "}
            <strong>{(page - 1) * perPage + 1}</strong> -{" "}
            <strong>
              {Math.min(page * perPage, filteredPayments.length)}
            </strong>{" "}
            dari <strong>{filteredPayments.length}</strong> pembayaran
          </p>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}