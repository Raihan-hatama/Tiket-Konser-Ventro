const db = require('../config/db');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');

const QR_DIR = path.join(__dirname, '..', 'uploads', 'qrcodes');

// Error dengan status HTTP agar bisa dibedakan dari error tak terduga.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const generateOrderCode = () => {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');

  const suffix = uuidv4().slice(0, 6).toUpperCase();

  return `ORD-${date}-${suffix}`;
};

const ensureQrDir = () => {
  if (!fs.existsSync(QR_DIR)) {
    fs.mkdirSync(QR_DIR, { recursive: true });
  }
};

// ============================================================
// POST /api/orders
// CUSTOMER - Membuat order
//
// Stok dikurangi secara atomik di dalam transaksi database sehingga
// dua pembeli yang memesan tiket terakhir secara bersamaan tidak
// menyebabkan overselling.
// ============================================================
const create = async (req, res) => {
  let conn;

  try {
    const { event_id, items } = req.body;

    // --------------------------------------------------------
    // VALIDASI REQUEST
    // --------------------------------------------------------
    if (!event_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'event_id dan items wajib diisi',
      });
    }

    conn = await db.connect();
    await conn.query('BEGIN');

    // --------------------------------------------------------
    // CEK EVENT
    // --------------------------------------------------------
    const { rows: eventRows } = await conn.query(
      `
      SELECT id, title, status
      FROM events
      WHERE id = $1
      `,
      [event_id]
    );

    if (eventRows.length === 0) {
      throw new HttpError(404, 'Event tidak ditemukan');
    }

    if (eventRows[0].status !== 'open') {
      throw new HttpError(
        400,
        'Event tidak tersedia atau penjualan sudah ditutup'
      );
    }

    let total_price = 0;
    const validatedItems = [];

    // --------------------------------------------------------
    // VALIDASI TIKET + KURANGI STOK (ATOMIK)
    // --------------------------------------------------------
    for (const item of items) {
      const categoryId = Number(item?.ticket_category_id);
      const quantity = Number(item?.quantity);

      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        throw new HttpError(400, 'Kategori tiket tidak valid');
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new HttpError(400, 'Jumlah tiket tidak valid');
      }

      // Satu query atomik: hanya mengurangi stok jika sisa masih cukup.
      // Jika tidak ada baris yang ter-update, berarti stok tidak cukup
      // atau kategori bukan milik event ini.
      const stock = await conn.query(
        `
        UPDATE ticket_categories
        SET sold = sold + $1
        WHERE id = $2
          AND event_id = $3
          AND (quota - sold) >= $1
        RETURNING id, name, price
        `,
        [quantity, categoryId, event_id]
      );

      if (stock.rowCount === 0) {
        const check = await conn.query(
          `SELECT name, quota, sold
           FROM ticket_categories
           WHERE id = $1 AND event_id = $2`,
          [categoryId, event_id]
        );

        if (check.rowCount === 0) {
          throw new HttpError(
            400,
            `Kategori tiket ID ${categoryId} tidak ditemukan pada event ini`
          );
        }

        const cat = check.rows[0];
        const available = Number(cat.quota) - Number(cat.sold);

        throw new HttpError(
          409,
          `Stok tiket "${cat.name}" tidak mencukupi (tersisa ${available})`
        );
      }

      const category = stock.rows[0];
      const price = Number(category.price);

      total_price += price * quantity;

      validatedItems.push({
        ticket_category_id: category.id,
        name: category.name,
        quantity,
        price,
      });
    }

    // --------------------------------------------------------
    // BUAT ORDER
    // --------------------------------------------------------
    const order_code = generateOrderCode();

    const { rows: orderRows } = await conn.query(
      `
      INSERT INTO orders
      (
        user_id,
        event_id,
        order_code,
        total_price,
        status
      )
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id, order_code, total_price, status, created_at
      `,
      [req.user.id, event_id, order_code, total_price]
    );

    const order = orderRows[0];
    const order_id = order.id;

    // --------------------------------------------------------
    // BUAT ORDER ITEMS + TIKET
    // --------------------------------------------------------
    if (!fs.existsSync(QR_DIR)) {
      ensureQrDir();
    }

    for (const item of validatedItems) {
      const { rows: itemRows } = await conn.query(
        `
        INSERT INTO order_items
        (
          order_id,
          ticket_category_id,
          quantity,
          unit_price
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id
        `,
        [order_id, item.ticket_category_id, item.quantity, item.price]
      );

      const order_item_id = itemRows[0].id;

      // ------------------------------------------------------
      // GENERATE TIKET
      // STATUS = pending
      // BARU AKTIF SETELAH PEMBAYARAN BERHASIL
      // ------------------------------------------------------
      for (let i = 0; i < item.quantity; i += 1) {
        const ticket_code = `TIK-${uuidv4()
          .slice(0, 8)
          .toUpperCase()}`;

        const qr_filename = `${ticket_code}.png`;
        const qr_path = path.join(QR_DIR, qr_filename);

        await QRCode.toFile(qr_path, ticket_code, { width: 300 });

        const qr_code_url = BASE
          ? `${BASE}/uploads/qrcodes/${qr_filename}`
          : `/uploads/qrcodes/${qr_filename}`;

        await conn.query(
          `
          INSERT INTO tickets
          (
            order_item_id,
            ticket_code,
            qr_code_url,
            status
          )
          VALUES ($1, $2, $3, 'pending')
          `,
          [order_item_id, ticket_code, qr_code_url]
        );
      }
    }

    // --------------------------------------------------------
    // SIMPAN PAYMENT (SNAP DIBUAT SAAT USER MEMILIH METODE)
    // --------------------------------------------------------
    await conn.query(
      `
      INSERT INTO payments
      (
        order_id,
        payment_method,
        amount,
        status,
        transaction_status
      )
      VALUES ($1, 'midtrans', $2, 'pending', 'pending')
      `,
      [order_id, total_price]
    );

    await conn.query('COMMIT');

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------
    return res.status(201).json({
      success: true,
      message: 'Pesanan berhasil dibuat',
      data: {
        order_id,
        order_code,
        total_price,
      },
    });

  } catch (err) {
    if (conn) {
      await conn.query('ROLLBACK').catch(() => {});
    }

    if (err instanceof HttpError) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }

    console.error('CREATE ORDER ERROR:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Gagal membuat pesanan. Silakan coba lagi.',
    });

  } finally {
    if (conn) conn.release();
  }
};


// ============================================================
// GET /api/orders
// CUSTOMER = pesanannya sendiri
// ADMIN = semua pesanan
// ============================================================
const getAll = async (req, res) => {
  try {
    let query = `
      SELECT
        o.*,
        u.name AS customer_name,
        e.title AS event_title,
        p.status AS payment_status,
        p.payment_method,
        p.payment_type,
        p.transaction_status
      FROM orders o
      JOIN users u
        ON u.id = o.user_id
      JOIN events e
        ON e.id = o.event_id
      LEFT JOIN payments p
        ON p.order_id = o.id
    `;

    const values = [];

    if (req.user.role !== 'admin') {
      query += `
        WHERE o.user_id = $1
      `;

      values.push(req.user.id);
    }

    query += `
      ORDER BY o.created_at DESC
    `;

    const { rows } = await db.query(query, values);

    return res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    console.error('GET ORDERS ERROR:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data pesanan',
    });
  }
};


// ============================================================
// GET /api/orders/:id
// ============================================================
const getOne = async (req, res) => {
  try {
    const { rows } = await db.query(
      `
      SELECT
        o.*,
        u.name AS customer_name,
        e.title AS event_title
      FROM orders o
      JOIN users u
        ON u.id = o.user_id
      JOIN events e
        ON e.id = o.event_id
      WHERE o.id = $1
      `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pesanan tidak ditemukan',
      });
    }

    // Customer hanya boleh melihat order miliknya
    if (
      req.user.role !== 'admin' &&
      Number(rows[0].user_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak',
      });
    }

    const order = rows[0];

    // --------------------------------------------------------
    // ITEMS + TIKET
    // --------------------------------------------------------
    const { rows: items } = await db.query(
      `
      SELECT
        oi.*,
        tc.name AS category_name,
        COALESCE(
          json_agg(
            json_build_object(
              'ticket_code', t.ticket_code,
              'qr_code_url', t.qr_code_url,
              'status', t.status
            )
            ORDER BY t.id
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) AS tickets
      FROM order_items oi
      JOIN ticket_categories tc
        ON tc.id = oi.ticket_category_id
      LEFT JOIN tickets t
        ON t.order_item_id = oi.id
      WHERE oi.order_id = $1
      GROUP BY oi.id, tc.name
      ORDER BY oi.id ASC
      `,
      [order.id]
    );

    // --------------------------------------------------------
    // PAYMENT
    // --------------------------------------------------------
    const { rows: payment } = await db.query(
      `
      SELECT *
      FROM payments
      WHERE order_id = $1
      `,
      [order.id]
    );

    // Pastikan field tickets selalu berupa array
    for (const item of items) {
      if (typeof item.tickets === 'string') {
        try {
          item.tickets = JSON.parse(item.tickets);
        } catch {
          item.tickets = [];
        }
      }

      if (!Array.isArray(item.tickets)) {
        item.tickets = [];
      }

      item.tickets = item.tickets.filter(
        (ticket) => ticket && ticket.ticket_code
      );
    }

    order.items = items;
    order.payment = payment[0] || null;

    return res.json({
      success: true,
      data: order,
    });

  } catch (err) {
    console.error('GET ORDER ERROR:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail pesanan',
    });
  }
};


module.exports = {
  create,
  getAll,
  getOne,
};
