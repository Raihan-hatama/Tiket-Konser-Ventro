
const db = require('../config/db');
const snap = require('../config/midtrans');
const crypto = require('crypto');
const ticketService = require('../services/ticketService');

const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');

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

const createPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { payment_method } = req.body;

    if (!allowedMethods.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: 'Metode pembayaran tidak valid atau tidak tersedia',
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

    const midtransOrderId = `${order.order_code}-${Date.now()}`;

    const midtransParameter = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: Number(order.total_price),
      },
      item_details,
      customer_details: {
        first_name: order.customer_name || 'Customer',
        email: order.customer_email || '',
      },
      enabled_payments: [payment_method],
    };

    const transaction = await snap.createTransaction(
      midtransParameter
    );

    const snap_token = transaction.token;
    const redirect_url = transaction.redirect_url;

    const paymentResult = await db.query(
      `
      UPDATE payments
      SET
        payment_method = $1,
        amount = $2,
        snap_token = $3,
        midtrans_order_id = $4,
        transaction_status = 'pending',
        status = 'pending',
        paid_at = NULL
      WHERE order_id = $5
      RETURNING id
      `,
      [
        payment_method,
        Number(order.total_price),
        snap_token,
        midtransOrderId,
        order.id,
      ]
    );

    if (paymentResult.rows.length === 0) {
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
        VALUES ($1, $2, $3, 'pending', $4, $5, 'pending')
        `,
        [
          order.id,
          payment_method,
          Number(order.total_price),
          snap_token,
          midtransOrderId,
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
      message: err.message || 'Gagal membuat pembayaran Midtrans',
    });
  }
};

const webhook = async (req, res) => {
  let client;

  try {
    const notification = req.body;

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
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

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey || !signature_key) {
      return res.status(401).json({
        success: false,
        message: 'Signature Midtrans tidak valid',
      });
    }

    const signature = crypto
      .createHash('sha512')
      .update(
        `${order_id}${status_code}${gross_amount}${serverKey}`
      )
      .digest('hex');

    const receivedSignature = Buffer.from(signature_key);
    const expectedSignature = Buffer.from(signature);

    if (
      receivedSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(receivedSignature, expectedSignature)
    ) {
      return res.status(401).json({
        success: false,
        message: 'Signature Midtrans tidak valid',
      });
    }

    client = await db.connect();

    await client.query('BEGIN');

    const paymentResult = await client.query(
      `
      SELECT
        p.*,
        o.order_code,
        o.status AS order_status,
        o.total_price
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      WHERE p.midtrans_order_id = $1
      FOR UPDATE OF p, o
      `,
      [order_id]
    );

    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Pembayaran tidak ditemukan',
      });
    }

    const payment = paymentResult.rows[0];
    const orderId = payment.order_id;

    // Nominal notifikasi harus sama dengan total order. Signature saja
    // sudah mengikat gross_amount, tetapi pengecekan ini mencegah
    // notifikasi dengan nominal tidak wajar diproses.
    if (
      !Number.isFinite(Number(gross_amount)) ||
      Math.abs(
        Number(gross_amount) - Number(payment.total_price)
      ) > 0.01
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message: 'Nominal pembayaran tidak sesuai',
      });
    }

    const successPayment =
      transaction_status === 'settlement' ||
      (
        transaction_status === 'capture' &&
        fraud_status !== 'challenge'
      );

    const failedPayment = [
      'cancel',
      'deny',
      'expire',
    ].includes(transaction_status);

    if (
      successPayment &&
      payment.order_status === 'paid'
    ) {
      // Order sudah lunas. Pastikan tiket tetap lengkap (mis. webhook
      // pertama sempat terputus setelah order di-update) tanpa
      // membuat tiket duplikat.
      await ticketService.syncTicketsForPaidOrder(
        client,
        orderId
      );

      await client.query('COMMIT');

      return res.json({
        success: true,
        message: 'Pembayaran sudah diproses sebelumnya',
      });
    }

    if (
      failedPayment &&
      payment.order_status === 'cancelled'
    ) {
      await client.query('COMMIT');

      return res.json({
        success: true,
        message: 'Pembatalan sudah diproses sebelumnya',
      });
    }

    if (
      failedPayment &&
      payment.order_status === 'paid'
    ) {
      await client.query('COMMIT');

      return res.json({
        success: true,
        message: 'Order sudah lunas, notifikasi diabaikan',
      });
    }

    let paymentStatus = 'pending';
    let orderStatus = payment.order_status;

    if (successPayment) {
      paymentStatus = 'verified';
      orderStatus = 'paid';
    }

    if (failedPayment) {
      paymentStatus = 'rejected';
      orderStatus = 'cancelled';
    }

    await client.query(
      `
      UPDATE payments
      SET
        payment_type = $1,
        transaction_id = $2,
        transaction_status = $3,
        status = $4,
        paid_at = CASE
          WHEN $5::boolean THEN NOW()
          ELSE NULL
        END
      WHERE order_id = $6
      `,
      [
        payment_type || null,
        transaction_id || null,
        transaction_status || null,
        paymentStatus,
        paymentStatus === 'verified',
        orderId,
      ]
    );

    if (successPayment || failedPayment) {
      await client.query(
        `
        UPDATE orders
        SET status = $1
        WHERE id = $2
        `,
        [orderStatus, orderId]
      );
    }

    if (successPayment) {
      // Buat kode tiket unik + QR untuk setiap tiket yang dibeli,
      // lalu aktifkan. Idempoten: aman jika webhook terkirim ulang.
      await ticketService.syncTicketsForPaidOrder(
        client,
        orderId
      );
    }

    if (failedPayment) {
      const itemsResult = await client.query(
        `
        SELECT
          ticket_category_id,
          quantity
        FROM order_items
        WHERE order_id = $1
        `,
        [orderId]
      );

      for (const item of itemsResult.rows) {
        await client.query(
          `
          UPDATE ticket_categories
          SET sold = GREATEST(sold - $1, 0)
          WHERE id = $2
          `,
          [
            item.quantity,
            item.ticket_category_id,
          ]
        );
      }

      await client.query(
        `
        UPDATE tickets
        SET status = 'cancelled'
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
      message: 'Notification Midtrans berhasil diproses',
    });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('ROLLBACK ERROR:', rollbackError);
      }
    }

    console.error('MIDTRANS WEBHOOK ERROR:', err);

    return res.status(500).json({
      success: false,
      message: 'Gagal memproses notifikasi pembayaran',
    });
  } finally {
    if (client) {
      client.release();
    }
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
      message: 'Gagal mengambil data pembayaran',
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
      message: 'Gagal mengambil data pembayaran',
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
      [
        orderId,
        req.user.id,
      ]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pesanan tidak ditemukan',
      });
    }

    const proof_url =
      `${BASE}/uploads/payments/${req.file.filename}`;

    const result = await db.query(
      `
      UPDATE payments
      SET proof_url = $1
      WHERE order_id = $2
      RETURNING id
      `,
      [
        proof_url,
        orderId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data pembayaran tidak ditemukan',
      });
    }

    return res.json({
      success: true,
      message: 'Bukti transfer berhasil diupload',
      data: {
        proof_url,
      },
    });
  } catch (err) {
    console.error('UPLOAD PROOF ERROR:', err);

    return res.status(500).json({
      success: false,
      message: 'Gagal mengupload bukti transfer',
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
          WHEN $2::boolean THEN NOW()
          ELSE NULL
        END
      WHERE order_id = $3
      `,
      [
        status,
        status === 'verified',
        orderId,
      ]
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

      // Verifikasi pembayaran manual (legacy) juga membuat tiket
      // dan QR karena tiket tidak lagi dibuat saat order dibuat.
      await ticketService.syncTicketsForPaidOrder(
        client,
        orderId
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
