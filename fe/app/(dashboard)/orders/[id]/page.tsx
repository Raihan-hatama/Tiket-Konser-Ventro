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
  MapPin,
  CheckCircle,
  Clock,
  XCircle,
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

  const orderId = params.id;

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const res = await api.get(`/orders/${orderId}`);

        console.log("ORDER DETAIL:", res.data);

        setOrder(res.data.data);
      } catch (error: any) {
        console.error("GAGAL LOAD ORDER:", error);

        if (error.response?.status === 401) {
          alert("Session login sudah habis. Silakan login kembali.");
          router.push("/login");
          return;
        }

        alert(
          error.response?.data?.message ||
            "Gagal mengambil detail pesanan"
        );
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      loadOrder();
    }
  }, [orderId, router]);

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
      case "verified":
      case "success":
        return "status success";

      case "pending":
        return "status pending";

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
        return <CheckCircle size={15} />;

      case "cancelled":
      case "failed":
        return <XCircle size={15} />;

      default:
        return <Clock size={15} />;
    }
  };

  if (loading) {
    return (
      <div className="order-page">
        <div className="loading">
          Memuat detail pesanan...
        </div>

        <style jsx>{styles}</style>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-page">
        <div className="empty">
          <Ticket size={50} />
          <h2>Pesanan tidak ditemukan</h2>

          <button onClick={() => router.push("/orders")}>
            Kembali ke Orders
          </button>
        </div>

        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="order-page">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <button
            className="back-button"
            onClick={() => router.push("/orders")}
          >
            <ArrowLeft size={18} />
            Kembali
          </button>

          <div className="eyebrow">
            ORDER DETAIL
          </div>

          <h1>Detail Pesanan</h1>

          <p>
            Informasi lengkap pesanan pelanggan.
          </p>
        </div>
      </div>

      {/* ORDER INFO */}
      <div className="top-grid">
        <div className="card">
          <div className="card-title">
            <Ticket size={20} />
            Informasi Pesanan
          </div>

          <div className="info-list">
            <div className="info-row">
              <span>Kode Pesanan</span>
              <strong>{order.order_code}</strong>
            </div>

            <div className="info-row">
              <span>Event</span>
              <strong>{order.event_title}</strong>
            </div>

            <div className="info-row">
              <span>Tanggal Pesanan</span>
              <strong>
                {formatDate(order.created_at)}
              </strong>
            </div>

            <div className="info-row">
              <span>Total</span>
              <strong className="price">
                {formatRupiah(order.total_price)}
              </strong>
            </div>

            <div className="info-row">
              <span>Status Pesanan</span>

              <span className={getStatusClass(order.status)}>
                {getStatusIcon(order.status)}
                {order.status}
              </span>
            </div>
          </div>
        </div>

        {/* CUSTOMER */}
        <div className="card">
          <div className="card-title">
            <User size={20} />
            Informasi Customer
          </div>

          <div className="customer-box">
            <div className="avatar">
              {order.customer_name
                ?.charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <h3>{order.customer_name}</h3>
              <p>Customer</p>
            </div>
          </div>

          <div className="event-box">
            <CalendarDays size={20} />

            <div>
              <span>Event</span>
              <strong>{order.event_title}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ITEMS */}
      <div className="card tickets-card">
        <div className="card-title">
          <Ticket size={20} />
          Tiket Pesanan
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Jumlah</th>
                <th>Subtotal</th>
              </tr>
            </thead>

            <tbody>
              {order.items?.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.category_name}</strong>
                  </td>

                  <td>
                    {formatRupiah(item.unit_price)}
                  </td>

                  <td>
                    {item.quantity}
                  </td>

                  <td>
                    <strong>
                      {formatRupiah(
                        item.unit_price *
                          item.quantity
                      )}
                    </strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* INDIVIDUAL TICKETS */}
      <div className="card">
        <div className="card-title">
          <Ticket size={20} />
          Daftar Tiket
        </div>

        <div className="ticket-grid">
          {order.items?.flatMap((item) =>
            item.tickets?.map((ticket) => (
              <div
                className="ticket-card"
                key={ticket.ticket_code}
              >
                <div className="ticket-left">
                  <span className="ticket-label">
                    TICKET
                  </span>

                  <h3>{item.category_name}</h3>

                  <p>
                    {ticket.ticket_code}
                  </p>

                  <span
                    className={getStatusClass(
                      ticket.status
                    )}
                  >
                    {getStatusIcon(ticket.status)}
                    {ticket.status}
                  </span>
                </div>

                <div className="qr">
                  {ticket.qr_code_url ? (
                    <img
                      src={ticket.qr_code_url}
                      alt={ticket.ticket_code}
                    />
                  ) : (
                    <div className="no-qr">
                      QR
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PAYMENT */}
      <div className="card">
        <div className="card-title">
          <CreditCard size={20} />
          Informasi Pembayaran
        </div>

        {order.payment ? (
          <div className="payment-box">
            <div className="info-row">
              <span>Metode Pembayaran</span>

              <strong>
                {order.payment.payment_method}
              </strong>
            </div>

            <div className="info-row">
              <span>Jumlah</span>

              <strong className="price">
                {formatRupiah(
                  order.payment.amount
                )}
              </strong>
            </div>

            <div className="info-row">
              <span>Status</span>

              <span
                className={getStatusClass(
                  order.payment.status
                )}
              >
                {getStatusIcon(
                  order.payment.status
                )}

                {order.payment.status}
              </span>
            </div>

            {order.payment.proof_url && (
              <div className="proof">
                <span>Bukti Pembayaran</span>

                <img
                  src={order.payment.proof_url}
                  alt="Bukti pembayaran"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="no-payment">
            Belum ada data pembayaran.
          </div>
        )}
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .order-page {
    min-height: 100vh;
    background: #f4f7fe;
    padding: 34px;
    color: #0b0f19;
  }

  .page-header {
    margin-bottom: 28px;
  }

  .back-button {
    border: none;
    background: transparent;
    color: #1d4ed8;
    display: flex;
    align-items: center;
    gap: 7px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 24px;
    padding: 0;
  }

  .eyebrow {
    color: #1d4ed8;
    font-family: monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .2em;
  }

  h1 {
    margin: 7px 0;
    font-size: 34px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .page-header p {
    margin: 0;
    color: #64748b;
  }

  .top-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }

  .card {
    background: white;
    border: 1px solid #dbe4f5;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 5px 18px rgba(15, 45, 100, .05);
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #143fa6;
    font-size: 17px;
    font-weight: 700;
    margin-bottom: 22px;
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
    border-bottom: 1px solid #edf1f7;
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-row span:first-child {
    color: #64748b;
    font-size: 14px;
  }

  .info-row strong {
    text-align: right;
  }

  .price {
    color: #1d4ed8;
  }

  .status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: fit-content;
    padding: 6px 11px;
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

  .customer-box {
    display: flex;
    align-items: center;
    gap: 15px;
    padding-bottom: 20px;
    border-bottom: 1px solid #edf1f7;
  }

  .avatar {
    width: 50px;
    height: 50px;
    border-radius: 12px;
    background: #1d4ed8;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 800;
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
  }

  .event-box span {
    display: block;
    color: #64748b;
    font-size: 12px;
    margin-bottom: 3px;
  }

  .event-box strong {
    display: block;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    background: #1d4ed8;
    color: white;
    text-align: left;
    padding: 14px 16px;
    font-size: 13px;
  }

  th:first-child {
    border-radius: 9px 0 0 9px;
  }

  th:last-child {
    border-radius: 0 9px 9px 0;
  }

  td {
    padding: 16px;
    border-bottom: 1px solid #edf1f7;
    font-size: 14px;
  }

  .ticket-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
    gap: 16px;
  }

  .ticket-card {
    display: flex;
    justify-content: space-between;
    gap: 15px;
    border: 1px solid #dbe4f5;
    border-radius: 14px;
    padding: 18px;
    background: #f8faff;
  }

  .ticket-label {
    color: #1d4ed8;
    font-family: monospace;
    font-size: 10px;
    letter-spacing: .15em;
    font-weight: 700;
  }

  .ticket-card h3 {
    margin: 7px 0;
    font-size: 17px;
  }

  .ticket-card p {
    font-family: monospace;
    font-size: 12px;
    color: #64748b;
    margin-bottom: 12px;
  }

  .qr {
    width: 110px;
    height: 110px;
    background: white;
    padding: 6px;
    border-radius: 10px;
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
  }

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
    max-height: 400px;
    border-radius: 10px;
    border: 1px solid #dbe4f5;
  }

  .no-payment {
    padding: 20px;
    border-radius: 10px;
    background: #f8fafc;
    color: #64748b;
  }

  .loading {
    min-height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
  }

  .empty {
    min-height: 70vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #64748b;
    gap: 12px;
  }

  .empty h2 {
    color: #0b0f19;
  }

  .empty button {
    border: none;
    background: #1d4ed8;
    color: white;
    padding: 11px 18px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
  }

  @media (max-width: 800px) {
    .order-page {
      padding: 20px;
    }

    .top-grid {
      grid-template-columns: 1fr;
    }

    .ticket-grid {
      grid-template-columns: 1fr;
    }
  }
`;