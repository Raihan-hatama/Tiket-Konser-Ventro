const db = require('../config/db');

const BASE = process.env.BASE_URL;

// POST /api/payments/:orderId/upload  (customer — upload bukti transfer)
const uploadProof = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'File bukti transfer wajib diupload' });

    const { orderId } = req.params;

    // Pastikan order milik user sendiri
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, req.user.id]
    );
    if (orders.length === 0)
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });

    const proof_url = `${BASE}/uploads/payments/${req.file.filename}`;
    await db.query(
      'UPDATE payments SET proof_url = ?, payment_method = ? WHERE order_id = ?',
      [proof_url, req.body.payment_method || 'transfer', orderId]
    );

    res.json({ success: true, message: 'Bukti transfer berhasil diupload', data: { proof_url } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/payments/:orderId/verify  (admin — verifikasi pembayaran)
const verify = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { status } = req.body; // 'verified' atau 'rejected'
    if (!['verified', 'rejected'].includes(status))
      return res.status(400).json({ success: false, message: 'Status harus "verified" atau "rejected"' });

    await conn.query(
      'UPDATE payments SET status = ?, paid_at = ? WHERE order_id = ?',
      [status, status === 'verified' ? new Date() : null, req.params.orderId]
    );

    // Update status order
    const orderStatus = status === 'verified' ? 'paid' : 'cancelled';
    await conn.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [orderStatus, req.params.orderId]
    );

    // Jika ditolak, kembalikan kuota tiket
    if (status === 'rejected') {
      const [items] = await conn.query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [req.params.orderId]
      );
      for (const item of items) {
        await conn.query(
          'UPDATE ticket_categories SET sold = sold - ? WHERE id = ?',
          [item.quantity, item.ticket_category_id]
        );
      }
      // Batalkan tiket
      await conn.query(
        `UPDATE tickets SET status = 'cancelled'
         WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = ?)`,
        [req.params.orderId]
      );
    }

    await conn.commit();
    res.json({ success: true, message: `Pembayaran berhasil ${status === 'verified' ? 'diverifikasi' : 'ditolak'}` });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

// GET /api/payments  (admin — semua pembayaran)
const getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, o.order_code, o.total_price, u.name AS customer_name,
             e.title AS event_title
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      JOIN users u ON u.id = o.user_id
      JOIN events e ON e.id = o.event_id
      ORDER BY p.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { uploadProof, verify, getAll };
