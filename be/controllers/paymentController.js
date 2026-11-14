
const db = require('../config/db');
const snap = require('../config/midtrans');

const BASE = process.env.BASE_URL;

const createPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { payment_method } = req.body;

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

    const orderResult = await db.query(
      `
        SELECT
          o.*,
          u.name AS customer_name,
          u.email AS customer_email,
          e.title AS event_title
        FROM orders o
        JOIN users u ON u.id = o.user_id
        JOIN events e ON e.id = o.event_id
        WHERE o.id = $1
          AND o.user_id = $2
      `,
      [orderId, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pesanan tidak ditemukan',
      });
    }

    const order = orderResult.rows[0];

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

    const itemsResult = await db.query(
      `
        SELECT
          oi.*,
          tc.name AS category_name
        FROM order_items oi
        JOIN ticket_categories tc
          ON tc.id = oi.ticket_category_id
        WHERE oi.order_id = $1
      `,
      [order.id]
    );

    const items = itemsResult.rows;

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Item tiket pada pesanan tidak ditemukan',
      });
    }

    const item_details = items.map((item) => ({
      id: String(item.ticket_category_id),
      price: Number(item.unit_price),
      quantity: Number(item.quantity),
      name: String(item.category_name).substring(0, 50),
    }));

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
      enabled_payments: [payment_method],
    };

    const transaction = await snap.createTransaction(midtransParameter);

    const snap_token = transaction.token;
    const redirect_url = transaction.redirect_url;

    const paymentResult = await db.query(
      `
        SELECT id
        FROM payments
        WHERE order_id = $1
      `,
      [order.id]
    );

    if (paymentResult.rows.length > 0) {
      await db.query(
        `
          UPDATE payments
          SET
            payment_method = $1,
            amount = $2,
            snap_token = $3,
            midtrans_order_id = $4,
            transaction_status = 'pending',
            status = 'pending'
          WHERE order_id = $5
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
      await db.query(
        `
          INSERT INTO payments (
            order_id,
            payment_method,
            amount,
            status,
            snap_token,
            midtrans_order_id,
            transaction_status
          )
          VALUES ($1, $2, $3, 'pending', $4, $5, 'pending')
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
    console.error('CREATE PAYMENT ERROR:', err);

    return res.status(500).json({
      success: false,
      message: err?.message || 'Gagal membuat pembayaran Midtrans',
    });
  }
};

const webhook = async (req, res) => {
  try {
    const notification = req.body;

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

    const orderResult = await db.query(
      `
        SELECT *
        FROM orders
        WHERE order_code = $1
      `,
      [order_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order tidak ditemukan',
      });
    }

    const order = orderResult.rows[0];

    let paymentStatus = 'pending';
    let orderStatus = 'pending';

    const successPayment =
      transaction_status === 'settlement' ||
      (transaction_status === 'capture' && fraud_status !== 'challenge');

    const failedPayment = [
      'cancel',
      'deny',
      'expire',
    ].includes(transaction_status);

    if (successPayment) {
      paymentStatus = 'verified';
      orderStatus = 'paid';
    }

    if (failedPayment) {
      paymentStatus = 'rejected';
      orderStatus = 'cancelled';
    }

    await db.query(
      `
        UPDATE payments
        SET
          payment_type = $1,
          transaction_id = $2,
          transaction_status = $3,
          status = $4,
          paid_at = $5
        WHERE order_id = $6
      `,
      [
        payment_type || null,
        transaction_id || null,
        transaction_status || null,
        paymentStatus,
        paymentStatus === 'verified' ? new Date() : null,
        order.id,
      ]
    );

    await db.query(
      `
        UPDATE orders
        SET status = $1
        WHERE id = $2
      `,
      [orderStatus, order.id]
    );

    if (orderStatus === 'paid') {
      await db.query(
        `
          UPDATE tickets
          SET status = 'active'
          WHERE order_item_id IN (
            SELECT oi.id
            FROM order_items oi
            WHERE oi.order_id = $1
          )
        `,
        [order.id]
      );
    }

    if (orderStatus === 'cancelled' && order.status !== 'cancelled') {
      const itemsResult = await db.query(
        `
          SELECT *
          FROM order_items
          WHERE order_id = $1
        `,
        [order.id]
      );

      for (const item of itemsResult.rows) {
        await db.query(
          `
            UPDATE ticket_categories
            SET sold = GREATEST(COALESCE(sold, 0) - $1, 0)
            WHERE id = $2
          `,
          [item.quantity, item.ticket_category_id]
        );
      }

      await db.query(
        `
          UPDATE tickets
          SET status = 'cancelled'
          WHERE order_item_id IN (
            SELECT oi.id
            FROM order_items oi
            WHERE oi.order_id = $1
          )
        `,
        [order.id]
      );
    }

    return res.json({
      success: true,
      message: 'Notification Midtrans berhasil diproses',
    });
  } catch (err) {
    console.error('MIDTRANS WEBHOOK ERROR:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getOne = async (req, res) => {
  try {
    const result = await db.query(
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
        JOIN orders o ON o.id = p.order_id
        JOIN events e ON e.id = o.event_id
        WHERE p.id = $1
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment tidak ditemukan',
      });
    }

    const payment = result.rows[0];

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
    console.error('GET PAYMENT ERROR:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getAll = async (req, res) => {
  try {
    const result = await db.query(
      `
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
      `
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error('GET ALL PAYMENT ERROR:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const uploadProof = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File bukti transfer wajib diupload',
      });
    }

    const { orderId } = req.params;

    const orderResult = await db.query(
      `
        SELECT *
        FROM orders
        WHERE id = $1
          AND user_id = $2
      `,
      [orderId, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pesanan tidak ditemukan',
      });
    }

    const proof_url = `${BASE}/uploads/payments/${req.file.filename}`;

    await db.query(
      `
        UPDATE payments
        SET proof_url = $1
        WHERE order_id = $2
      `,
      [proof_url, orderId]
    );

    return res.json({
      success: true,
      message: 'Bukti transfer berhasil diupload',
      data: {
        proof_url,
      },
    });
  } catch (err) {
    console.error('UPLOAD PAYMENT PROOF ERROR:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const verify = async (req, res) => {
  let client;

  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status pembayaran tidak valid',
      });
    }

    client = await db.connect();

    await client.query('BEGIN');

    const paymentResult = await client.query(
      `
        SELECT *
        FROM payments
        WHERE order_id = $1
        FOR UPDATE
      `,
      [orderId]
    );

    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Pembayaran tidak ditemukan',
      });
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== 'pending') {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message: 'Pembayaran ini sudah diproses',
      });
    }

    await client.query(
      `
        UPDATE payments
        SET
          status = $1,
          paid_at = CASE
            WHEN $3::boolean THEN NOW()
            ELSE NULL
          END
        WHERE order_id = $2
      `,
      [status, orderId, status === 'verified']
    );

    if (status === 'verified') {
      await client.query(
        `
          UPDATE orders
          SET status = 'paid'
          WHERE id = $1
        `,
        [orderId]
      );

      await client.query(
        `
          UPDATE tickets
          SET status = 'active'
          WHERE order_item_id IN (
            SELECT id
            FROM order_items
            WHERE order_id = $1
          )
        `,
        [orderId]
      );
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message:
        status === 'verified'
          ? 'Pembayaran berhasil diverifikasi'
          : 'Pembayaran berhasil ditolak',
    });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('ROLLBACK ERROR:', rollbackError);
      }
    }

    console.error('VERIFY PAYMENT ERROR:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

module.exports = {
  createPayment,
  webhook,
  getOne,
  getAll,
  uploadProof,
  verify,
};
