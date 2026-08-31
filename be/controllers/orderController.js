const db = require('../config/db');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const snap = require('../config/midtrans');

const BASE = process.env.BASE_URL;

const generateOrderCode = () => {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');

  return `ORD-${date}-${Math.floor(Math.random() * 9000 + 1000)}`;
};

// ============================================================
// POST /api/orders
// CUSTOMER - Membuat order + transaksi Midtrans
// ============================================================
const create = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { event_id, items } = req.body;

    // --------------------------------------------------------
    // VALIDASI REQUEST
    // --------------------------------------------------------
    if (
      !event_id ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'event_id dan items wajib diisi',
      });
    }

    // --------------------------------------------------------
    // CEK EVENT
    // --------------------------------------------------------
    const [events] = await conn.query(
      `
      SELECT *
      FROM events
      WHERE id = ?
        AND status = 'open'
      `,
      [event_id]
    );

    if (events.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Event tidak tersedia atau penjualan sudah ditutup',
      });
    }

    const event = events[0];

    let total_price = 0;
    const validatedItems = [];

    // --------------------------------------------------------
    // VALIDASI TIKET + HITUNG TOTAL
    // --------------------------------------------------------
    for (const item of items) {
      const categoryId = Number(item.ticket_category_id);
      const quantity = Number(item.quantity);

      if (!categoryId || !quantity || quantity <= 0) {
        throw new Error('Data tiket tidak valid');
      }

      const [cats] = await conn.query(
        `
        SELECT *
        FROM ticket_categories
        WHERE id = ?
          AND event_id = ?
        `,
        [categoryId, event_id]
      );

      if (cats.length === 0) {
        throw new Error(
          `Kategori tiket ID ${categoryId} tidak ditemukan`
        );
      }

      const cat = cats[0];

      const available = Number(cat.quota) - Number(cat.sold);

      if (available < quantity) {
        throw new Error(
          `Stok tiket "${cat.name}" tidak mencukupi`
        );
      }

      const price = Number(cat.price);

      total_price += price * quantity;

      validatedItems.push({
        ticket_category_id: categoryId,
        name: cat.name,
        quantity,
        price,
      });
    }

    // --------------------------------------------------------
    // BUAT ORDER
    // --------------------------------------------------------
    const order_code = generateOrderCode();

    const [orderResult] = await conn.query(
      `
      INSERT INTO orders
      (
        user_id,
        event_id,
        order_code,
        total_price,
        status
      )
      VALUES (?, ?, ?, ?, 'pending')
      `,
      [
        req.user.id,
        event_id,
        order_code,
        total_price,
      ]
    );

    const order_id = orderResult.insertId;

    // --------------------------------------------------------
    // BUAT ORDER ITEMS + TIKET
    // --------------------------------------------------------
    for (const item of validatedItems) {
      const [itemResult] = await conn.query(
        `
        INSERT INTO order_items
        (
          order_id,
          ticket_category_id,
          quantity,
          unit_price
        )
        VALUES (?, ?, ?, ?)
        `,
        [
          order_id,
          item.ticket_category_id,
          item.quantity,
          item.price,
        ]
      );

      const order_item_id = itemResult.insertId;

      // Update jumlah terjual
      await conn.query(
        `
        UPDATE ticket_categories
        SET sold = sold + ?
        WHERE id = ?
        `,
        [
          item.quantity,
          item.ticket_category_id,
        ]
      );

      // ------------------------------------------------------
      // GENERATE TIKET
      // STATUS = pending
      // BELUM ACTIVE SEBELUM BAYAR
      // ------------------------------------------------------
      for (let i = 0; i < item.quantity; i++) {
        const ticket_code =
          `TIK-${uuidv4().slice(0, 8).toUpperCase()}`;

        const qr_filename = `${ticket_code}.png`;

        const qrDir = path.join(
          process.cwd(),
          'uploads',
          'qrcodes'
        );

        const qr_path = path.join(
          qrDir,
          qr_filename
        );

        const fs = require('fs');

        if (!fs.existsSync(qrDir)) {
          fs.mkdirSync(qrDir, {
            recursive: true,
          });
        }

        await QRCode.toFile(
          qr_path,
          ticket_code,
          {
            width: 300,
          }
        );

        const qr_code_url =
          `${BASE}/uploads/qrcodes/${qr_filename}`;

        await conn.query(
          `
          INSERT INTO tickets
          (
            order_item_id,
            ticket_code,
            qr_code_url,
            status
          )
          VALUES (?, ?, ?, 'pending')
          `,
          [
            order_item_id,
            ticket_code,
            qr_code_url,
          ]
        );
      }
    }

    // --------------------------------------------------------
    // BUAT TRANSAKSI MIDTRANS
    // --------------------------------------------------------
    const midtransParameter = {
      transaction_details: {
        order_id: order_code,
        gross_amount: Number(total_price),
      },

      item_details: validatedItems.map((item) => ({
        id: String(item.ticket_category_id),
        price: Number(item.price),
        quantity: Number(item.quantity),
        name: String(item.name).substring(0, 50),
      })),

      customer_details: {
        first_name: req.user.name || 'Customer',
        email: req.user.email || '',
      },

      enabled_payments: [
        'qris',
        'gopay',
        'shopeepay',
        'bca_va',
        'bni_va',
        'bri_va',
        'permata_va',
        'other_va',
        'credit_card',
      ],
    };

    console.log(
      'MIDTRANS PARAMETER:',
      JSON.stringify(
        midtransParameter,
        null,
        2
      )
    );

    const transaction =
      await snap.createTransaction(
        midtransParameter
      );

    const snap_token = transaction.token;
    const redirect_url = transaction.redirect_url;

    // --------------------------------------------------------
    // SIMPAN PAYMENT
    // --------------------------------------------------------
    await conn.query(
      `
   INSERT INTO payments
(
  order_id,
  payment_method,
  amount,
  status,
  snap_token,
  midtrans_order_id,
  transaction_status,
  redirect_url
)
      VALUES (?, ?, ?, 'pending', ?, ?, 'pending', ?)
      `,
      [
  order_id,
  'midtrans',
  total_price,
  snap_token,
  order_code,
  redirect_url,
]
    );

    await conn.commit();

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
        snap_token,
        redirect_url,
      },
    });

  } catch (err) {
    await conn.rollback();

    console.error(
      'CREATE ORDER ERROR:',
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    conn.release();
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
        WHERE o.user_id = ?
      `;

      values.push(req.user.id);
    }

    query += `
      ORDER BY o.created_at DESC
    `;

    const [rows] =
      await db.query(
        query,
        values
      );

    return res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// ============================================================
// GET /api/orders/:id
// ============================================================
const getOne = async (req, res) => {
  try {
    const [rows] = await db.query(
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
      WHERE o.id = ?
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
    const [items] = await db.query(
      `
      SELECT
        oi.*,
        tc.name AS category_name,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'ticket_code', t.ticket_code,
            'qr_code_url', t.qr_code_url,
            'status', t.status
          )
        ) AS tickets
      FROM order_items oi
      JOIN ticket_categories tc
        ON tc.id = oi.ticket_category_id
      LEFT JOIN tickets t
        ON t.order_item_id = oi.id
      WHERE oi.order_id = ?
      GROUP BY oi.id
      `,
      [order.id]
    );

    // --------------------------------------------------------
    // PAYMENT
    // --------------------------------------------------------
    const [payment] =
      await db.query(
        `
        SELECT *
        FROM payments
        WHERE order_id = ?
        `,
        [order.id]
      );

    // Parse JSON tickets
    for (const item of items) {
      if (typeof item.tickets === 'string') {
        try {
          item.tickets =
            JSON.parse(item.tickets);
        } catch {
          item.tickets = [];
        }
      }

      if (!item.tickets) {
        item.tickets = [];
      }

      // Hapus object kosong dari LEFT JOIN
      item.tickets =
        item.tickets.filter(
          (ticket) =>
            ticket.ticket_code
        );
    }

    order.items = items;
    order.payment =
      payment[0] || null;

    return res.json({
      success: true,
      data: order,
    });

  } catch (err) {
    console.error(
      'GET ORDER ERROR:',
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


module.exports = {
  create,
  getAll,
  getOne,
};