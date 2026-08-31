const db = require('../config/db');
const snap = require('../config/midtrans');

const BASE = process.env.BASE_URL;

// ============================================================
// CREATE MIDTRANS PAYMENT
// POST /api/payments/:orderId/create
// CUSTOMER
// ============================================================
const createPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { payment_method } = req.body;

    console.log('====================================');
    console.log('CREATE MIDTRANS PAYMENT');
    console.log('ORDER ID:', orderId);
    console.log('METHOD:', payment_method);
    console.log('====================================');

    // --------------------------------------------------------
    // VALIDASI PAYMENT METHOD
    // --------------------------------------------------------
    const allowedMethods = [
      'qris',
      'gopay',
      'shopeepay',
      'bca_va',
      'bni_va',
      'bri_va',
      'permata_va',
      'other_va',
      'credit_card',
    ];

    if (!payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Metode pembayaran wajib dipilih',
      });
    }

    if (!allowedMethods.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: 'Metode pembayaran tidak tersedia',
      });
    }

    // --------------------------------------------------------
    // CARI ORDER
    // CUSTOMER HANYA BOLEH BAYAR ORDER MILIK SENDIRI
    // --------------------------------------------------------
    const [orders] = await db.query(
      `
      SELECT
        o.*,
        u.name AS customer_name,
        u.email AS customer_email,
        e.title AS event_title
      FROM orders o
      JOIN users u
        ON u.id = o.user_id
      JOIN events e
        ON e.id = o.event_id
      WHERE o.id = ?
        AND o.user_id = ?
      `,
      [
        orderId,
        req.user.id,
      ]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pesanan tidak ditemukan',
      });
    }

    const order = orders[0];

    // --------------------------------------------------------
    // CEK STATUS ORDER
    // --------------------------------------------------------
    if (order.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Pesanan ini sudah dibayar',
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Pesanan ini sudah dibatalkan',
      });
    }

    // --------------------------------------------------------
    // AMBIL ORDER ITEMS
    // --------------------------------------------------------
    const [items] = await db.query(
      `
      SELECT
        oi.*,
        tc.name AS category_name
      FROM order_items oi
      JOIN ticket_categories tc
        ON tc.id = oi.ticket_category_id
      WHERE oi.order_id = ?
      `,
      [order.id]
    );

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Item tiket pada pesanan tidak ditemukan',
      });
    }

    // --------------------------------------------------------
    // BUAT ITEM DETAILS MIDTRANS
    // --------------------------------------------------------
    const item_details = items.map((item) => ({
      id: String(item.ticket_category_id),
      price: Number(item.unit_price),
      quantity: Number(item.quantity),
      name: String(item.category_name).substring(0, 50),
    }));

    // --------------------------------------------------------
    // PARAMETER MIDTRANS
    // --------------------------------------------------------
    const midtransParameter = {
      transaction_details: {
        order_id: order.order_code,
        gross_amount: Number(order.total_price),
      },

      item_details,

      customer_details: {
        first_name: order.customer_name || 'Customer',
        email: order.customer_email || '',
      },

      enabled_payments: [
        payment_method,
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

    // --------------------------------------------------------
    // CREATE TRANSACTION MIDTRANS
    // --------------------------------------------------------
    const transaction =
      await snap.createTransaction(
        midtransParameter
      );

    const snap_token =
      transaction.token;

    const redirect_url =
      transaction.redirect_url;

    console.log(
      'MIDTRANS TOKEN:',
      snap_token
    );

    console.log(
      'MIDTRANS REDIRECT:',
      redirect_url
    );

    // --------------------------------------------------------
    // CEK PAYMENT YANG SUDAH ADA
    // --------------------------------------------------------
    const [payments] = await db.query(
      `
      SELECT *
      FROM payments
      WHERE order_id = ?
      `,
      [order.id]
    );

    if (payments.length > 0) {
      // ------------------------------------------------------
      // UPDATE PAYMENT
      // ------------------------------------------------------
      await db.query(
        `
        UPDATE payments
        SET
          payment_method = ?,
          amount = ?,
          snap_token = ?,
          midtrans_order_id = ?,
          transaction_status = 'pending',
          status = 'pending'
        WHERE order_id = ?
        `,
        [
          payment_method,
          Number(order.total_price),
          snap_token,
          order.order_code,
          order.id,
        ]
      );
    } else {
      // ------------------------------------------------------
      // INSERT PAYMENT
      // ------------------------------------------------------
      await db.query(
        `
        INSERT INTO payments
        (
          order_id,
          payment_method,
          amount,
          status,
          snap_token,
          midtrans_order_id,
          transaction_status
        )
        VALUES (?, ?, ?, 'pending', ?, ?, 'pending')
        `,
        [
          order.id,
          payment_method,
          Number(order.total_price),
          snap_token,
          order.order_code,
        ]
      );
    }

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------
    return res.json({
      success: true,
      message: 'Pembayaran berhasil dibuat',
      data: {
        order_id: order.id,
        order_code: order.order_code,
        payment_method,
        amount: Number(order.total_price),
        snap_token,
        redirect_url,
      },
    });

  } catch (err) {
    console.error(
      'CREATE PAYMENT ERROR:',
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err?.message ||
        'Gagal membuat pembayaran Midtrans',
    });
  }
};


// ============================================================
// MIDTRANS WEBHOOK
// POST /api/payments/midtrans/webhook
// TIDAK MEMAKAI AUTHENTICATE
// ============================================================
const webhook = async (req, res) => {
  try {
    const notification = req.body;

    console.log(
      '===================================='
    );

    console.log(
      'MIDTRANS NOTIFICATION'
    );

    console.log(
      JSON.stringify(
        notification,
        null,
        2
      )
    );

    console.log(
      '===================================='
    );

    const {
      order_id,
      transaction_id,
      transaction_status,
      payment_type,
      fraud_status,
    } = notification;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: 'order_id tidak ditemukan',
      });
    }

    // --------------------------------------------------------
    // CARI ORDER
    // --------------------------------------------------------
    const [orders] = await db.query(
      `
      SELECT *
      FROM orders
      WHERE order_code = ?
      `,
      [order_id]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order tidak ditemukan',
      });
    }

    const order = orders[0];

    // --------------------------------------------------------
    // TENTUKAN STATUS
    // --------------------------------------------------------
    let paymentStatus = 'pending';
    let orderStatus = 'pending';

    const successPayment =
      transaction_status === 'settlement' ||
      (
        transaction_status === 'capture' &&
        fraud_status !== 'challenge'
      );

    const failedPayment =
      transaction_status === 'cancel' ||
      transaction_status === 'deny' ||
      transaction_status === 'expire';

    if (successPayment) {
      paymentStatus = 'verified';
      orderStatus = 'paid';
    }

    if (failedPayment) {
      paymentStatus = 'rejected';
      orderStatus = 'cancelled';
    }

    // --------------------------------------------------------
    // UPDATE PAYMENT
    // --------------------------------------------------------
    await db.query(
      `
      UPDATE payments
      SET
        payment_type = ?,
        transaction_id = ?,
        transaction_status = ?,
        status = ?,
        paid_at = ?
      WHERE order_id = ?
      `,
      [
        payment_type || null,
        transaction_id || null,
        transaction_status || null,
        paymentStatus,
        paymentStatus === 'verified'
          ? new Date()
          : null,
        order.id,
      ]
    );

    // --------------------------------------------------------
    // UPDATE ORDER
    // --------------------------------------------------------
    await db.query(
      `
      UPDATE orders
      SET status = ?
      WHERE id = ?
      `,
      [
        orderStatus,
        order.id,
      ]
    );

    // --------------------------------------------------------
    // JIKA BERHASIL BAYAR
    // TIKET PENDING -> ACTIVE
    // --------------------------------------------------------
    if (orderStatus === 'paid') {
      await db.query(
        `
        UPDATE tickets t
        JOIN order_items oi
          ON oi.id = t.order_item_id
        SET t.status = 'active'
        WHERE oi.order_id = ?
        `,
        [order.id]
      );
    }

    // --------------------------------------------------------
    // JIKA GAGAL / EXPIRED
    // KEMBALIKAN STOK
    // --------------------------------------------------------
    if (orderStatus === 'cancelled') {
      const [items] = await db.query(
        `
        SELECT *
        FROM order_items
        WHERE order_id = ?
        `,
        [order.id]
      );

      for (const item of items) {
        await db.query(
          `
          UPDATE ticket_categories
          SET sold =
            GREATEST(
              sold - ?,
              0
            )
          WHERE id = ?
          `,
          [
            item.quantity,
            item.ticket_category_id,
          ]
        );
      }

      await db.query(
        `
        UPDATE tickets t
        JOIN order_items oi
          ON oi.id = t.order_item_id
        SET t.status = 'cancelled'
        WHERE oi.order_id = ?
        `,
        [order.id]
      );
    }

    return res.json({
      success: true,
      message:
        'Notification Midtrans berhasil diproses',
    });

  } catch (err) {
    console.error(
      'MIDTRANS WEBHOOK ERROR:',
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// ============================================================
// GET /api/payments/:id
// CUSTOMER MELIHAT PAYMENT MILIKNYA
// ============================================================
const getOne = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT
        p.*,
        o.order_code,
        o.user_id,
        o.event_id,
        o.total_price,
        o.status AS order_status,
        e.title AS event_title
      FROM payments p
      JOIN orders o
        ON o.id = p.order_id
      JOIN events e
        ON e.id = o.event_id
      WHERE p.id = ?
      `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment tidak ditemukan',
      });
    }

    const payment = rows[0];

    // Customer hanya boleh melihat payment miliknya
    if (
      req.user.role !== 'admin' &&
      Number(payment.user_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak',
      });
    }

    return res.json({
      success: true,
      data: payment,
    });

  } catch (err) {
    console.error(
      'GET PAYMENT ERROR:',
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// ============================================================
// GET /api/payments
// ADMIN
// ============================================================
const getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT
        p.*,
        o.order_code,
        o.total_price,
        u.name AS customer_name,
        e.title AS event_title
      FROM payments p
      JOIN orders o
        ON o.id = p.order_id
      JOIN users u
        ON u.id = o.user_id
      JOIN events e
        ON e.id = o.event_id
      ORDER BY p.id DESC
      `
    );

    return res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    console.error(
      'GET ALL PAYMENT ERROR:',
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// ============================================================
// UPLOAD BUKTI LAMA
// ============================================================
const uploadProof = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          'File bukti transfer wajib diupload',
      });
    }

    const { orderId } =
      req.params;

    const [orders] =
      await db.query(
        `
        SELECT *
        FROM orders
        WHERE id = ?
          AND user_id = ?
        `,
        [
          orderId,
          req.user.id,
        ]
      );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          'Pesanan tidak ditemukan',
      });
    }

    const proof_url =
      `${BASE}/uploads/payments/${req.file.filename}`;

    await db.query(
      `
      UPDATE payments
      SET proof_url = ?
      WHERE order_id = ?
      `,
      [
        proof_url,
        orderId,
      ]
    );

    return res.json({
      success: true,
      message:
        'Bukti transfer berhasil diupload',
      data: {
        proof_url,
      },
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// ============================================================
// VERIFY MANUAL LAMA
// ============================================================
const verify = async (req, res) => {
  return res.status(400).json({
    success: false,
    message:
      'Verifikasi manual tidak digunakan pada pembayaran Midtrans.',
  });
};


// ============================================================
// EXPORT
// ============================================================
module.exports = {
  createPayment,
  webhook,
  getOne,
  getAll,
  uploadProof,
  verify,
};