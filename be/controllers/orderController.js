const db = require('../config/db');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

const generateOrderCode = () => {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');

  return `ORD-${date}-${Math.floor(Math.random() * 9000 + 1000)}`;
};

// ============================================================
// POST /api/orders
// Customer membuat pesanan
// ============================================================
const create = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { event_id, items } = req.body;

    // --------------------------------------------------------
    // Validasi input
    // --------------------------------------------------------
    if (
      !event_id ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      await conn.rollback();

      return res.status(400).json({
        success: false,
        message: 'event_id dan items wajib diisi',
      });
    }

    // --------------------------------------------------------
    // Validasi item
    // --------------------------------------------------------
    for (const item of items) {
      if (
        !item.ticket_category_id ||
        !item.quantity ||
        Number(item.quantity) <= 0
      ) {
        await conn.rollback();

        return res.status(400).json({
          success: false,
          message: 'ticket_category_id dan quantity harus valid',
        });
      }
    }

    // --------------------------------------------------------
    // Cek event masih open
    // PENTING:
    // gunakan parameter ? untuk nilai "open"
    // --------------------------------------------------------
    const [events] = await conn.query(
      `
      SELECT *
      FROM events
      WHERE id = ?
        AND status = ?
      `,
      [event_id, 'open']
    );

    if (events.length === 0) {
      await conn.rollback();

      return res.status(400).json({
        success: false,
        message:
          'Event tidak tersedia atau penjualan sudah ditutup',
      });
    }

    // --------------------------------------------------------
    // Hitung total harga
    // sekaligus cek stok
    // --------------------------------------------------------
    let total_price = 0;

    const validatedItems = [];

    for (const item of items) {
      const [cats] = await conn.query(
        `
        SELECT
          id,
          event_id,
          name,
          price,
          quota,
          sold
        FROM ticket_categories
        WHERE id = ?
          AND event_id = ?
        `,
        [item.ticket_category_id, event_id]
      );

      if (cats.length === 0) {
        throw new Error(
          `Kategori tiket ID ${item.ticket_category_id} tidak ditemukan`
        );
      }

      const cat = cats[0];

      const quantity = Number(item.quantity);
      const price = Number(cat.price);
      const available = Number(cat.quota) - Number(cat.sold);

      // Cek stok
      if (available < quantity) {
        throw new Error(
          `Stok tiket "${cat.name}" tidak mencukupi. Tersedia ${available} tiket.`
        );
      }

      validatedItems.push({
        ticket_category_id: cat.id,
        name: cat.name,
        quantity,
        price,
      });

      total_price += price * quantity;
    }

    // --------------------------------------------------------
    // Buat order
    // --------------------------------------------------------
    const order_code = generateOrderCode();

    const [orderResult] = await conn.query(
      `
      INSERT INTO orders
        (user_id, event_id, order_code, total_price)
      VALUES
        (?, ?, ?, ?)
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
    // Pastikan folder QR tersedia
    // --------------------------------------------------------
    const qrDir = path.join(
      process.cwd(),
      'uploads',
      'qrcodes'
    );

    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, {
        recursive: true,
      });
    }

    // --------------------------------------------------------
    // Buat order items + tiket + QR
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
        VALUES
          (?, ?, ?, ?)
        `,
        [
          order_id,
          item.ticket_category_id,
          item.quantity,
          item.price,
        ]
      );

      const order_item_id = itemResult.insertId;

      // ------------------------------------------------------
      // Update jumlah tiket terjual
      // ------------------------------------------------------
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
      // Generate tiket individual
      // ------------------------------------------------------
      for (let i = 0; i < item.quantity; i++) {
        const ticket_code =
          `TIK-${uuidv4().slice(0, 8).toUpperCase()}`;

        const qr_filename = `${ticket_code}.png`;

        const qr_path = path.join(
          qrDir,
          qr_filename
        );

        // Generate QR Code
        await QRCode.toFile(
          qr_path,
          ticket_code,
          {
            width: 300,
          }
        );

        const qr_code_url =
          `${BASE}/uploads/qrcodes/${qr_filename}`;

        // Simpan tiket
        await conn.query(
          `
          INSERT INTO tickets
            (
              order_item_id,
              ticket_code,
              qr_code_url
            )
          VALUES
            (?, ?, ?)
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
    // Buat payment
    // Default pending
    // --------------------------------------------------------
    await conn.query(
      `
      INSERT INTO payments
        (
          order_id,
          payment_method,
          amount,
          status
        )
      VALUES
        (?, ?, ?, ?)
      `,
      [
        order_id,
        'qris',
        total_price,
        'pending',
      ]
    );

    // --------------------------------------------------------
    // Commit transaksi
    // --------------------------------------------------------
    await conn.commit();

    return res.status(201).json({
      success: true,
      message: 'Pesanan berhasil dibuat',
      data: {
        order_id,
        order_code,
        total_price,
        payment_method: 'qris',
        payment_status: 'pending',
      },
    });

  } catch (err) {
    // Rollback kalau terjadi error
    try {
      await conn.rollback();
    } catch (rollbackError) {
      console.error(
        'Rollback error:',
        rollbackError
      );
    }

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
// Customer: pesanan sendiri
// Admin: semua pesanan
// ============================================================
const getAll = async (req, res) => {
  try {
    let query = `
      SELECT
        o.*,
        u.name AS customer_name,
        e.title AS event_title,
        p.status AS payment_status
      FROM orders o

      JOIN users u
        ON u.id = o.user_id

      JOIN events e
        ON e.id = o.event_id

      LEFT JOIN payments p
        ON p.order_id = o.id
    `;

    const values = [];

    // Customer hanya melihat pesanannya sendiri
    if (req.user.role !== 'admin') {
      query += `
        WHERE o.user_id = ?
      `;

      values.push(req.user.id);
    }

    query += `
      ORDER BY o.created_at DESC
    `;

    const [rows] = await db.query(
      query,
      values
    );

    return res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    console.error(
      'GET ORDERS ERROR:',
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// ============================================================
// GET /api/orders/:id
// Detail pesanan
// ============================================================
const getOne = async (req, res) => {
  try {
    // --------------------------------------------------------
    // Ambil order
    // --------------------------------------------------------
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

    // --------------------------------------------------------
    // Cek akses
    // --------------------------------------------------------
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
    // Ambil order items + tiket
    // --------------------------------------------------------
    const [items] = await db.query(
      `
      SELECT
        oi.*,
        tc.name AS category_name,

        JSON_ARRAYAGG(
          JSON_OBJECT(
            'ticket_code',
            t.ticket_code,

            'qr_code_url',
            t.qr_code_url,

            'status',
            t.status
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
    // Ambil payment
    // --------------------------------------------------------
    const [payment] = await db.query(
      `
      SELECT *
      FROM payments
      WHERE order_id = ?
      `,
      [order.id]
    );

    order.items = items;
    order.payment = payment[0] || null;

    return res.json({
      success: true,
      data: order,
    });

  } catch (err) {
    console.error(
      'GET ORDER DETAIL ERROR:',
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