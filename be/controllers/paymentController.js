const db = require('../config/db');

const BASE = process.env.BASE_URL;

// POST /api/payments/:orderId/upload
// Customer — upload bukti pembayaran QRIS
const uploadProof = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Bukti pembayaran wajib diupload',
      });
    }

    const { orderId } = req.params;

    // Pastikan order milik user yang sedang login
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, req.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pesanan tidak ditemukan',
      });
    }

    const order = orders[0];

    // URL bukti pembayaran
    const proof_url = `${BASE}/uploads/payments/${req.file.filename}`;

    // Pastikan payment untuk order tersebut memang ada
    const [payments] = await db.query(
      'SELECT * FROM payments WHERE order_id = ?',
      [orderId]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data pembayaran untuk pesanan ini tidak ditemukan',
      });
    }

    // Simpan bukti pembayaran
    await db.query(
      `UPDATE payments
       SET proof_url = ?,
           payment_method = 'QRIS',
           status = 'pending',
           paid_at = NULL
       WHERE order_id = ?`,
      [proof_url, orderId]
    );

    res.json({
      success: true,
      message: 'Bukti pembayaran QRIS berhasil diupload',
      data: {
        order_id: order.id,
        payment_method: 'QRIS',
        proof_url,
        status: 'pending',
      },
    });
  } catch (err) {
    console.error('UPLOAD PAYMENT ERROR:', err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// PATCH /api/payments/:orderId/verify
// Admin — verifikasi pembayaran
const verify = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { orderId } = req.params;
    const { status } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      await conn.rollback();

      return res.status(400).json({
        success: false,
        message: 'Status harus "verified" atau "rejected"',
      });
    }

    // Cek payment
    const [payments] = await conn.query(
      'SELECT * FROM payments WHERE order_id = ?',
      [orderId]
    );

    if (payments.length === 0) {
      await conn.rollback();

      return res.status(404).json({
        success: false,
        message: 'Pembayaran tidak ditemukan',
      });
    }

    // Update payment
    await conn.query(
      `UPDATE payments
       SET status = ?,
           paid_at = ?
       WHERE order_id = ?`,
      [
        status,
        status === 'verified' ? new Date() : null,
        orderId,
      ]
    );

    // Jika verified → order menjadi paid
    // Jika rejected → order menjadi cancelled
    const orderStatus =
      status === 'verified'
        ? 'paid'
        : 'cancelled';

    await conn.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [orderStatus, orderId]
    );

    // Jika pembayaran ditolak,
    // kembalikan jumlah tiket yang sebelumnya terjual
    if (status === 'rejected') {
      const [items] = await conn.query(
        `SELECT *
         FROM order_items
         WHERE order_id = ?`,
        [orderId]
      );

      for (const item of items) {
        await conn.query(
          `UPDATE ticket_categories
           SET sold = GREATEST(sold - ?, 0)
           WHERE id = ?`,
          [
            item.quantity,
            item.ticket_category_id,
          ]
        );
      }

      // Batalkan tiket yang sudah dibuat
      await conn.query(
        `UPDATE tickets
         SET status = 'cancelled'
         WHERE order_item_id IN (
           SELECT id
           FROM order_items
           WHERE order_id = ?
         )`,
        [orderId]
      );
    }

    await conn.commit();

    res.json({
      success: true,
      message:
        status === 'verified'
          ? 'Pembayaran QRIS berhasil diverifikasi'
          : 'Pembayaran QRIS ditolak',
    });

  } catch (err) {
    await conn.rollback();

    console.error('VERIFY PAYMENT ERROR:', err);

    res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    conn.release();
  }
};


// GET /api/payments
// Admin — melihat semua pembayaran
const getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        p.*,
        o.order_code,
        o.total_price,
        u.name AS customer_name,
        e.title AS event_title
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      JOIN users u ON u.id = o.user_id
      JOIN events e ON e.id = o.event_id
      ORDER BY p.id DESC
    `);

    res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    console.error('GET PAYMENTS ERROR:', err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


module.exports = {
  uploadProof,
  verify,
  getAll,
};