const db = require('../config/db');
const ticketService = require('../services/ticketService');

// ============================================================
// QUERY DASAR
//
// Semua data yang dibutuhkan mobile & scanner diambil langsung
// dari database. Status pembayaran tidak pernah dipercaya dari
// frontend.
// ============================================================

const TICKET_SELECT = `
  SELECT
    t.id,
    t.ticket_code,
    t.qr_code_url,
    t.status,
    t.used_at,
    t.created_at,
    t.order_item_id,
    oi.quantity,
    oi.unit_price,
    tc.id   AS ticket_category_id,
    tc.name AS category_name,
    o.id    AS order_id,
    o.order_code,
    o.status AS order_status,
    o.created_at AS order_created_at,
    e.id    AS event_id,
    e.title AS event_title,
    e.event_date,
    e.event_time,
    e.venue,
    e.poster_url,
    e.status AS event_status,
    u.id    AS customer_id,
    u.name  AS customer_name,
    u.email AS customer_email,
    sb.id   AS scanned_by_id,
    sb.name AS scanned_by_name
  FROM tickets t
  JOIN order_items oi
    ON oi.id = t.order_item_id
  JOIN orders o
    ON o.id = oi.order_id
  JOIN ticket_categories tc
    ON tc.id = oi.ticket_category_id
  JOIN events e
    ON e.id = o.event_id
  JOIN users u
    ON u.id = o.user_id
  LEFT JOIN users sb
    ON sb.id = t.scanned_by
`;

/**
 * Melengkapi satu baris tiket dengan QR terbaru.
 *
 * QR hanya diberikan untuk tiket yang sudah dibayar dan berstatus
 * active/used. Order yang belum dibayar tidak boleh menampilkan QR.
 */
const decorateTicket = async (row) => {
  if (!row) return null;

  const isPaid = row.order_status === 'paid';
  const canShowQr =
    isPaid && (row.status === 'active' || row.status === 'used');

  if (!canShowQr) {
    row.qr_code_url = null;
    return row;
  }

  const storedUrl = row.qr_code_url;

  try {
    const freshUrl = await ticketService.ensureTicketQr(
      row.ticket_code
    );

    row.qr_code_url = freshUrl;

    if (storedUrl !== freshUrl) {
      await db.query(
        'UPDATE tickets SET qr_code_url = $1 WHERE id = $2',
        [freshUrl, row.id]
      );
    }
  } catch (err) {
    // Jangan gagalkan seluruh request hanya karena file QR gagal
    // dibuat; URL lama (jika ada) tetap dikembalikan.
    console.error('ENSURE TICKET QR ERROR:', err.message);
    row.qr_code_url = storedUrl || null;
  }

  return row;
};

const loadTicketByCode = async (ticketCode) => {
  const { rows } = await db.query(
    `${TICKET_SELECT} WHERE t.ticket_code = $1`,
    [ticketCode]
  );

  return rows[0] || null;
};

const loadTicketById = async (ticketId) => {
  const { rows } = await db.query(
    `${TICKET_SELECT} WHERE t.id = $1`,
    [ticketId]
  );

  return rows[0] || null;
};

const readTicketCode = (body) =>
  ticketService.normalizeTicketCode(body?.ticket_code);

const invalidCodeResponse = (res) =>
  res.status(400).json({
    success: false,
    status: 'invalid',
    message: 'Kode tiket wajib diisi',
  });

// ============================================================
// GET /api/tickets/my
// Semua tiket milik user yang sedang login.
// ============================================================
const getMy = async (req, res) => {
  try {
    const { rows } = await db.query(
      `
      ${TICKET_SELECT}
      WHERE o.user_id = $1
      ORDER BY e.event_date ASC, t.id ASC
      `,
      [req.user.id]
    );

    const tickets = [];

    for (const row of rows) {
      tickets.push(await decorateTicket(row));
    }

    return res.json({
      success: true,
      data: tickets,
    });
  } catch (err) {
    console.error('GET MY TICKETS ERROR:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data tiket',
    });
  }
};

// ============================================================
// GET /api/tickets/:id
// Detail tiket, hanya pemilik atau admin.
// ============================================================
const getOne = async (req, res) => {
  try {
    const row = await loadTicketById(req.params.id);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Tiket tidak ditemukan',
      });
    }

    if (
      req.user.role !== 'admin' &&
      Number(row.customer_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak',
      });
    }

    const ticket = await decorateTicket(row);

    return res.json({
      success: true,
      data: ticket,
    });
  } catch (err) {
    console.error('GET TICKET ERROR:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail tiket',
    });
  }
};

// ============================================================
// POST /api/tickets/validate
// ADMIN - memeriksa tiket tanpa mengubah status.
// ============================================================
const validate = async (req, res) => {
  try {
    const ticketCode = readTicketCode(req.body);

    if (!ticketCode) {
      return invalidCodeResponse(res);
    }

    const ticket = await loadTicketByCode(ticketCode);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        status: 'invalid',
        message: 'Tiket tidak ditemukan',
        data: null,
      });
    }

    if (ticket.status === 'used') {
      return res.status(409).json({
        success: false,
        status: 'used',
        message: 'Tiket sudah pernah digunakan',
        data: await decorateTicket(ticket),
      });
    }

    if (ticket.status === 'cancelled') {
      return res.status(409).json({
        success: false,
        status: 'cancelled',
        message: 'Tiket sudah dibatalkan',
        data: await decorateTicket(ticket),
      });
    }

    if (ticket.order_status !== 'paid') {
      return res.status(400).json({
        success: false,
        status: 'unpaid',
        message: 'Pesanan belum dibayar, tiket belum aktif',
        data: await decorateTicket(ticket),
      });
    }

    if (ticket.status !== 'active') {
      return res.status(400).json({
        success: false,
        status: 'invalid',
        message: 'Tiket belum aktif',
        data: await decorateTicket(ticket),
      });
    }

    return res.json({
      success: true,
      status: 'valid',
      message: 'Tiket valid dan belum digunakan',
      data: await decorateTicket(ticket),
    });
  } catch (err) {
    console.error('VALIDATE TICKET ERROR:', err.message);

    return res.status(500).json({
      success: false,
      status: 'error',
      message: 'Gagal memvalidasi tiket',
    });
  }
};

// ============================================================
// POST /api/tickets/check-in
// ADMIN - memakai tiket secara atomik.
//
// Satu query UPDATE memastikan hanya satu petugas yang berhasil
// ketika dua scanner memindai tiket yang sama bersamaan.
// ============================================================
const checkIn = async (req, res) => {
  try {
    const ticketCode = readTicketCode(req.body);

    if (!ticketCode) {
      return invalidCodeResponse(res);
    }

    const updated = await db.query(
      `
      UPDATE tickets t
      SET
        status = 'used',
        used_at = NOW(),
        scanned_by = $2
      WHERE t.ticket_code = $1
        AND t.status = 'active'
        AND EXISTS (
          SELECT 1
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.id = t.order_item_id
            AND o.status = 'paid'
        )
      RETURNING t.id
      `,
      [ticketCode, req.user.id]
    );

    if (updated.rowCount > 0) {
      const ticket = await loadTicketById(updated.rows[0].id);

      return res.json({
        success: true,
        status: 'valid',
        message: 'Tiket berhasil digunakan',
        data: await decorateTicket(ticket),
      });
    }

    // Update gagal: cari tahu penyebabnya untuk pesan yang jelas.
    const ticket = await loadTicketByCode(ticketCode);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        status: 'invalid',
        message: 'Tiket tidak ditemukan',
        data: null,
      });
    }

    if (ticket.status === 'used') {
      return res.status(409).json({
        success: false,
        status: 'used',
        message: 'Tiket sudah pernah digunakan',
        data: await decorateTicket(ticket),
      });
    }

    if (ticket.status === 'cancelled') {
      return res.status(409).json({
        success: false,
        status: 'cancelled',
        message: 'Tiket sudah dibatalkan',
        data: await decorateTicket(ticket),
      });
    }

    if (ticket.order_status !== 'paid') {
      return res.status(400).json({
        success: false,
        status: 'unpaid',
        message: 'Pesanan belum dibayar, tiket belum aktif',
        data: await decorateTicket(ticket),
      });
    }

    return res.status(400).json({
      success: false,
      status: 'invalid',
      message: 'Tiket belum aktif',
      data: await decorateTicket(ticket),
    });
  } catch (err) {
    console.error('CHECK-IN TICKET ERROR:', err.message);

    return res.status(500).json({
      success: false,
      status: 'error',
      message: 'Gagal melakukan check-in tiket',
    });
  }
};

module.exports = {
  getMy,
  getOne,
  validate,
  checkIn,
};
