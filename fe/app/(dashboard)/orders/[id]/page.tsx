"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Ticket,
  User,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  Check,
} from "lucide-react";

interface TicketData {
  ticket_code: string;
  qr_code_url: string;
  status: string;
}

interface OrderItem {
  id: number;
  category_name: string;
  quantity: number;
  unit_price: number;
  tickets: TicketData[];
}

interface Payment {
  id: number;
  payment_method: string;
  amount: number;
  status: string;
  proof_url?: string;
  created_at: string;
}

interface Order {
  id: number;
  order_code: string;
  total_price: number;
  status: string;
  created_at: string;
  customer_name: string;
  event_title: string;
  items: OrderItem[];
  payment: Payment | null;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const orderId = params.id;

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const res = await api.get(`/orders/${orderId}`);
        setOrder(res.data.data);
      } catch (error: any) {
        console.error("GAGAL LOAD ORDER:", error);

        if (error.response?.status === 401) {
          alert("Session login sudah habis. Silakan login kembali.");
          router.push("/login");
          return;
        }

        alert(
          error.response?.data?.message || "Gagal mengambil detail pesanan"
        );
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      loadOrder();
    }
  }, [orderId, router]);

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  const getStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
      case "verified":
      case "success":
        return "status success";
      case "cancelled":
      case "failed":
        return "status danger";
      default:
        return "status pending";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
      case "verified":
      case "success":
        return <CheckCircle size={14} />;
      case "cancelled":
      case "failed":
        return <XCircle size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  if (loading) {
    return (
      <div className="order-page">
        <div className="skeleton-wrap" aria-busy="true" aria-label="Memuat">
          <div className="sk sk-title" />
          <div className="sk sk-hero" />
          <div className="sk sk-block" />
          <div className="sk sk-block" />
        </div>

        <style jsx>{styles}</style>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-page">
        <div className="empty">
          <Ticket size={44} />
          <h2>Pesanan tidak ditemukan</h2>
          <p>Pesanan mungkin sudah dihapus atau tautannya salah.</p>

          <button onClick={() => router.push("/orders")}>
            Kembali ke daftar pesanan
          </button>
        </div>

        <style jsx>{styles}</style>
      </div>
    );
  }

  const totalTickets =
    order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <div className="order-page">
      <div className="container">
        <button
          className="back-button"
          onClick={() => router.push("/orders")}
        >
          <ArrowLeft size={18} />
          Kembali ke pesanan
        </button>

        {/* HERO */}
        <header className="hero">
          <div className="hero-main">
            <p className="hero-sub">Detail pesanan</p>
            <h1>{order.order_code}</h1>
            <p className="hero-event">{order.event_title}</p>
          </div>

          <div className="hero-side">
            <span className={getStatusClass(order.status)}>
              {getStatusIcon(order.status)}
              {order.status}
            </span>
            <strong className="hero-total">
              {formatRupiah(order.total_price)}
            </strong>
            <span className="hero-meta">
              {totalTickets} tiket · {formatDate(order.created_at)}
            </span>
          </div>
        </header>

        {/* INFO + CUSTOMER */}
        <div className="top-grid">
          <section className="card">
            <h2 className="card-title">
              <Ticket size={19} />
              Informasi pesanan
            </h2>

            <div className="info-list">
              <div className="info-row">
                <span>Kode pesanan</span>
                <strong className="mono">{order.order_code}</strong>
              </div>

              <div className="info-row">
                <span>Event</span>
                <strong>{order.event_title}</strong>
              </div>

              <div className="info-row">
                <span>Tanggal pesanan</span>
                <strong>{formatDate(order.created_at)}</strong>
              </div>

              <div className="info-row">
                <span>Status pesanan</span>
                <span className={getStatusClass(order.status)}>
                  {getStatusIcon(order.status)}
                  {order.status}
                </span>
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">
              <User size={19} />
              Customer
            </h2>

            <div className="customer-box">
              <div className="avatar">
                {order.customer_name?.charAt(0).toUpperCase()}
              </div>

              <div>
                <h3>{order.customer_name}</h3>
                <p>Pemesan tiket</p>
              </div>
            </div>

            <div className="event-box">
              <CalendarDays size={20} />

              <div>
                <span>Event</span>
                <strong>{order.event_title}</strong>
              </div>
            </div>
          </section>
        </div>

        {/* ITEMS */}
        <section className="card">
          <h2 className="card-title">
            <Ticket size={19} />
            Rincian pesanan
          </h2>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th className="num">Harga</th>
                  <th className="num">Jumlah</th>
                  <th className="num">Subtotal</th>
                </tr>
              </thead>

              <tbody>
                {order.items?.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.category_name}</strong>
                    </td>
                    <td className="num">{formatRupiah(item.unit_price)}</td>
                    <td className="num">{item.quantity}</td>
                    <td className="num">
                      <strong>
                        {formatRupiah(item.unit_price * item.quantity)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan={3}>Total</td>
                  <td className="num total-cell">
                    {formatRupiah(order.total_price)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* INDIVIDUAL TICKETS */}
        <section className="card">
          <h2 className="card-title">
            <Ticket size={19} />
            Daftar tiket
          </h2>

          <div className="ticket-grid">
            {order.items?.flatMap((item) =>
              (item.tickets ?? []).map((ticket) => (
                <article className="ticket-card" key={ticket.ticket_code}>
                  <div className="ticket-left">
                    <h3>{item.category_name}</h3>

                    <button
                      type="button"
                      className="code-chip"
                      onClick={() => copyCode(ticket.ticket_code)}
                      title="Salin kode tiket"
                    >
                      <span>{ticket.ticket_code}</span>
                      {copiedCode === ticket.ticket_code ? (
                        <Check size={13} />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>

                    <span className={getStatusClass(ticket.status)}>
                      {getStatusIcon(ticket.status)}
                      {ticket.status}
                    </span>
                  </div>

                  <div className="qr">
                    {ticket.qr_code_url ? (
                      <img src={ticket.qr_code_url} alt={ticket.ticket_code} />
                    ) : (
                      <div className="no-qr">QR</div>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* PAYMENT */}
        <section className="card">
          <h2 className="card-title">
            <CreditCard size={19} />
            Pembayaran
          </h2>

          {order.payment ? (
            <div className="payment-box">
              <div className="info-row">
                <span>Metode pembayaran</span>
                <strong>{order.payment.payment_method}</strong>
              </div>

              <div className="info-row">
                <span>Jumlah</span>
                <strong className="price">
                  {formatRupiah(order.payment.amount)}
                </strong>
              </div>

              <div className="info-row">
                <span>Status</span>
                <span className={getStatusClass(order.payment.status)}>
                  {getStatusIcon(order.payment.status)}
                  {order.payment.status}
                </span>
              </div>

              {order.payment.proof_url && (
                <div className="proof">
                  <span>Bukti pembayaran</span>
                  <a
                    href={order.payment.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={order.payment.proof_url}
                      alt="Bukti pembayaran"
                    />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="no-payment">Belum ada data pembayaran.</div>
          )}
        </section>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .order-page {
    min-height: 100vh;
    background: #f3f6fc;
    padding: 32px 24px 56px;
    color: #111827;
  }

  .container {
    max-width: 1080px;
    margin: 0 auto;
  }

  button:focus-visible,
  a:focus-visible {
    outline: 3px solid #6f8fd8;
    outline-offset: 2px;
  }

  .back-button {
    border: none;
    background: transparent;
    color: #0a1e4d;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    margin-bottom: 18px;
    padding: 6px 10px 6px 0;
    border-radius: 8px;
    transition: gap .15s ease;
  }

  .back-button:hover {
    gap: 10px;
  }

  /* HERO */
  .hero {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    padding: 30px 32px;
    margin-bottom: 20px;
    border-radius: 20px;
    color: white;
    background: linear-gradient(135deg, #0a1e4d 0%, #0c2559 100%);
    box-shadow: 0 14px 34px rgba(10, 30, 77, .28);
  }

  .hero-sub {
    margin: 0 0 6px;
    font-size: 13px;
    color: #bfd1ff;
  }

  .hero h1 {
    margin: 0;
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -.01em;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    word-break: break-all;
  }

  .hero-event {
    margin: 8px 0 0;
    color: #dbe6ff;
    font-size: 15px;
  }

  .hero-side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    text-align: right;
    flex-shrink: 0;
  }

  .hero-total {
    font-size: 28px;
    font-weight: 800;
    line-height: 1.1;
  }

  .hero-meta {
    font-size: 12.5px;
    color: #bfd1ff;
  }

  /* LAYOUT */
  .top-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }

  .top-grid .card {
    margin-bottom: 0;
  }

  .card {
    background: white;
    border: 1px solid #e0e7f5;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 1px 2px rgba(15, 45, 100, .04), 0 8px 24px rgba(15, 45, 100, .05);
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #0a1e4d;
    font-size: 17px;
    font-weight: 700;
    margin: 0 0 18px;
  }

  .info-list {
    display: flex;
    flex-direction: column;
  }

  .info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 14px 0;
    border-bottom: 1px solid #eef2f8;
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-row > span:first-child {
    color: #64748b;
    font-size: 14px;
  }

  .info-row strong {
    text-align: right;
  }

  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 14px;
  }

  .price {
    color: #0a1e4d;
  }

  /* STATUS */
  .status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: fit-content;
    padding: 5px 11px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    text-transform: capitalize;
  }

  .status.success {
    color: #15803d;
    background: #dcfce7;
  }

  .status.pending {
    color: #b45309;
    background: #fef3c7;
  }

  .status.danger {
    color: #dc2626;
    background: #fee2e2;
  }

  .hero .status {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, .25);
  }

  /* CUSTOMER */
  .customer-box {
    display: flex;
    align-items: center;
    gap: 15px;
    padding-bottom: 20px;
    border-bottom: 1px solid #eef2f8;
  }

  .avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #0a1e4d;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 800;
    flex-shrink: 0;
  }

  .customer-box h3 {
    margin: 0 0 3px;
    font-size: 17px;
  }

  .customer-box p {
    margin: 0;
    color: #64748b;
    font-size: 13px;
  }

  .event-box {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 20px;
    padding: 14px;
    border-radius: 12px;
    background: #f3f6fc;
    color: #0a1e4d;
  }

  .event-box span {
    display: block;
    color: #64748b;
    font-size: 12px;
    margin-bottom: 3px;
  }

  .event-box strong {
    display: block;
    color: #111827;
  }

  /* TABLE */
  .table-wrapper {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    background: #eef3ff;
    color: #0a1e4d;
    text-align: left;
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 700;
  }

  th:first-child {
    border-radius: 10px 0 0 10px;
  }

  th:last-child {
    border-radius: 0 10px 10px 0;
  }

  td {
    padding: 16px;
    border-bottom: 1px solid #eef2f8;
    font-size: 14px;
  }

  tbody tr:hover td {
    background: #fafcff;
  }

  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  tfoot td {
    border-bottom: none;
    padding-top: 18px;
    font-weight: 700;
  }

  tfoot td:first-child {
    text-align: right;
    color: #64748b;
  }

  .total-cell {
    color: #0a1e4d;
    font-size: 18px;
  }

  /* TICKETS */
  .ticket-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
    gap: 16px;
  }

  .ticket-card {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    border: 1px solid #dbe4f5;
    border-radius: 14px;
    padding: 18px 18px 18px 20px;
    background: #f8faff;
    overflow: hidden;
  }

  .ticket-card::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 5px;
    background: #0a1e4d;
  }

  .ticket-left {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
  }

  .ticket-card h3 {
    margin: 0;
    font-size: 17px;
  }

  .code-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    max-width: 100%;
    padding: 5px 10px;
    border: 1px dashed #aebfe3;
    border-radius: 8px;
    background: white;
    color: #475569;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    cursor: pointer;
  }

  .code-chip span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .code-chip:hover {
    border-color: #0a1e4d;
    color: #0a1e4d;
  }

  .qr {
    width: 108px;
    height: 108px;
    background: white;
    padding: 6px;
    border-radius: 10px;
    border: 1px solid #e0e7f5;
    flex-shrink: 0;
  }

  .qr img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .no-qr {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-weight: 700;
  }

  /* PAYMENT */
  .payment-box {
    max-width: 700px;
  }

  .proof {
    margin-top: 20px;
  }

  .proof > span {
    display: block;
    font-weight: 700;
    margin-bottom: 10px;
  }

  .proof img {
    max-width: 350px;
    width: 100%;
    max-height: 400px;
    object-fit: contain;
    border-radius: 10px;
    border: 1px solid #dbe4f5;
    background: #f8fafc;
  }

  .no-payment {
    padding: 20px;
    border-radius: 10px;
    background: #f8fafc;
    color: #64748b;
  }

  /* LOADING + EMPTY */
  .skeleton-wrap {
    max-width: 1080px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .sk {
    border-radius: 16px;
    background: linear-gradient(90deg, #e6ecf7 25%, #f1f5fb 50%, #e6ecf7 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite linear;
  }

  .sk-title { height: 20px; width: 140px; }
  .sk-hero { height: 130px; }
  .sk-block { height: 180px; }

  @keyframes shimmer {
    to { background-position: -200% 0; }
  }

  .empty {
    min-height: 70vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #64748b;
    gap: 10px;
    text-align: center;
  }

  .empty h2 {
    margin: 6px 0 0;
    color: #111827;
  }

  .empty p {
    margin: 0 0 8px;
  }

  .empty button {
    border: none;
    background: #0a1e4d;
    color: white;
    padding: 11px 18px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
  }

  .empty button:hover {
    background: #0a1e4d;
  }

  @media (prefers-reduced-motion: reduce) {
    .sk { animation: none; }
    .back-button { transition: none; }
  }

  @media (max-width: 800px) {
    .order-page {
      padding: 20px 16px 40px;
    }

    .hero {
      flex-direction: column;
      align-items: flex-start;
      padding: 24px;
    }

    .hero-side {
      align-items: flex-start;
      text-align: left;
    }

    .hero h1 {
      font-size: 26px;
    }

    .top-grid {
      grid-template-columns: 1fr;
    }

    .ticket-grid {
      grid-template-columns: 1fr;
    }
  }
`;