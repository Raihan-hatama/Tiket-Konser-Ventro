"use client";

interface Payment {
  id: number;
  order_id: number;
  order_code: string;
  total_price: number;
  amount: number;
  payment_method: string;
  proof_url: string | null;
  status: "pending" | "verified" | "rejected";
  paid_at: string | null;
  customer_name: string;
  event_title: string;
}

interface Props {
  payments: Payment[];
  processing: number | null;
  onVerify: (
    orderId: number,
    status: "verified" | "rejected"
  ) => void;
}

export default function PaymentTable({
  payments,
  processing,
  onVerify,
}: Props) {
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusClass = (status: string) => {
    if (status === "verified") return "status verified";
    if (status === "rejected") return "status rejected";
    return "status pending";
  };

  return (
    <>
      <style jsx>{`
        .table-wrapper {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #d6e0f7;
          border-radius: 14px;
          background: white;
        }

        table {
          width: 100%;
          min-width: 1100px;
          border-collapse: collapse;
        }

        thead {
          background: #0a1e4d;
        }

        th {
          padding: 15px 16px;
          text-align: left;
          color: white;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        td {
          padding: 15px 16px;
          border-bottom: 1px solid #e5e7eb;
          color: #0b0f19;
          font-size: 14px;
          vertical-align: middle;
        }

        tbody tr:hover {
          background: #f4f7fe;
        }

        tbody tr:last-child td {
          border-bottom: none;
        }

        .order-code {
          color: #1d4ed8;
          font-weight: 700;
        }

        .customer {
          font-weight: 600;
        }

        .event {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #4b5670;
        }

        .amount {
          font-weight: 700;
          white-space: nowrap;
        }

        .method {
          text-transform: capitalize;
          color: #4b5670;
        }

        .proof {
          display: inline-block;
          padding: 7px 12px;
          border-radius: 7px;
          background: #eaf0ff;
          color: #1d4ed8;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
        }

        .proof:hover {
          background: #dbe5ff;
        }

        .no-proof {
          color: #9ca3af;
        }

        .status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 85px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .pending {
          background: #fef9c3;
          color: #a16207;
        }

        .verified {
          background: #dcfce7;
          color: #15803d;
        }

        .rejected {
          background: #fee2e2;
          color: #dc2626;
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .button {
          border: none;
          border-radius: 7px;
          padding: 8px 12px;
          color: white;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .verify {
          background: #16a34a;
        }

        .reject {
          background: #ef4444;
        }

        .already {
          color: #9ca3af;
          font-size: 12px;
        }

        .empty {
          text-align: center;
          padding: 50px 20px;
          color: #8a93ad;
          font-size: 14px;
        }
      `}</style>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Event</th>
              <th>Total</th>
              <th>Metode</th>
              <th>Bukti</th>
              <th>Status</th>
              <th>Tanggal Bayar</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>
                  <span className="order-code">
                    {payment.order_code}
                  </span>
                </td>

                <td>
                  <span className="customer">
                    {payment.customer_name}
                  </span>
                </td>

                <td>
                  <div className="event">
                    {payment.event_title}
                  </div>
                </td>

                <td>
                  <span className="amount">
                    {formatRupiah(
                      Number(
                        payment.amount || payment.total_price
                      )
                    )}
                  </span>
                </td>

                <td>
                  <span className="method">
                    {payment.payment_method || "-"}
                  </span>
                </td>

                <td>
                  {payment.proof_url ? (
                    <a
                      href={payment.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="proof"
                    >
                      Lihat Bukti
                    </a>
                  ) : (
                    <span className="no-proof">
                      Belum ada
                    </span>
                  )}
                </td>

                <td>
                  <span
                    className={getStatusClass(
                      payment.status
                    )}
                  >
                    {payment.status}
                  </span>
                </td>

                <td>
                  {formatDate(payment.paid_at)}
                </td>

                <td>
                  {payment.status === "pending" ? (
                    <div className="actions">
                      <button
                        className="button verify"
                        disabled={
                          processing === payment.order_id
                        }
                        onClick={() =>
                          onVerify(
                            payment.order_id,
                            "verified"
                          )
                        }
                      >
                        Verifikasi
                      </button>

                      <button
                        className="button reject"
                        disabled={
                          processing === payment.order_id
                        }
                        onClick={() =>
                          onVerify(
                            payment.order_id,
                            "rejected"
                          )
                        }
                      >
                        Tolak
                      </button>
                    </div>
                  ) : (
                    <span className="already">
                      Sudah diproses
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {payments.length === 0 && (
              <tr>
                <td colSpan={9} className="empty">
                  Belum ada data pembayaran.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}