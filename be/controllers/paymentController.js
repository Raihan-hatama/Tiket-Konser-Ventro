const crypto = require('crypto');
const db = require('../config/db');
const snap = require('../config/midtrans');

const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');

// ============================================================
// METODE PEMBAYARAN
//
// Mobile mengirim grup metode ("qris" / "bank" / "ewallet").
// Backend menerjemahkannya menjadi kode metode Midtrans.
// ============================================================
const PAYMENT_METHOD_GROUPS = {
  qris: ['qris'],
  bank: ['bca_va', 'bni_va', 'bri_va', 'permata_va', 'other_va'],
  ewallet: ['gopay', 'shopeepay'],
};

const SINGLE_PAYMENT_METHODS = [
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

const resolvePaymentMethods = (method) => {
  if (PAYMENT_METHOD_GROUPS[method]) {
    return PAYMENT_METHOD_GROUPS[method];
  }

  if (SINGLE_PAYMENT_METHODS.includes(method)) {
    return [method];
  }

  return null;
};

// ============================================================
// CREATE MIDTRANS PAYMENT
// POST /api/payments/:orderId/create
// CUSTOMER
// ============================================================
const createPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const payment_method = String(req.body?.payment_method ?? '').trim();

    if (!payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Metode pembayaran wajib dipilih',
      });
    }

    const enabledPayments = resolvePaymentMethods(payment_method);

    if (!enabledPayments) {
      return res.status(400).json({
        success: false,
        message: 'Metode pembayaran tidak tersedia',
      });
    }

    // --------------------------------------------------------
    // CARI ORDER
    // CUSTOMER HANYA BOLEH BAYAR ORDER MILIK SENDIRI
    // --------------------------------------------------------
    const { rows: orders } = await db.query(
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
      WHERE o.id = $1
        AND o.user_id = $2
      `,
      [orderId, req.user.id]
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
    const { rows: items } = await db.query(
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
    // ID TRANSAKSI MIDTRANS
    //
    // Midtrans tidak mengizinkan order_id yang sama dipakai ulang
    // untuk transaksi baru. Karena itu setiap percobaan pembayaran
    // memakai sufiks unik, dan nilainya disimpan agar webhook bisa
    // menemukan order yang tepat.
    // --------------------------------------------------------
    const midtransOrderId = `${order.order_code}-${String(
      Date.now()
    ).slice(-6)}`;

    // --------------------------------------------------------
    // PARAMETER MIDTRANS
    // --------------------------------------------------------
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

      enabled_payments: enabledPayments,
    };

    // --------------------------------------------------------
    // CREATE TRANSACTION MIDTRANS
    // --------------------------------------------------------
    const transaction = await snap.createTransaction(midtransParameter);

    const snap_token = transaction.token;
    const redirect_url = transaction.redirect_url;

    // --------------------------------------------------------
    // SIMPAN / UPDATE PAYMENT
    // --------------------------------------------------------
    const updated = await db.query(
      `
      UPDATE payments
      SET
        payment_method = $1,
        amount = $2,
        snap_token = $3,
        midtrans_order_id = $4,
        redirect_url = $5,
        transaction_status = 'pending',
        status = 'pending'
      WHERE order_id = $6
      `,
      [
        payment_method,
        Number(order.total_price),
        snap_token,
        midtransOrderId,
        redirect_url,
        order.id,
      ]
    );

    if (updated.rowCount === 0) {
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
          transaction_status,
          redirect_url
        )
        VALUES ($1, $2, $3, 'pending', $4, $5, 'pending', $6)
        `,
        [
          order.id,
          payment_method,
          Number(order.total_price),
          snap_token,
          midtransOrderId,
          redirect_url,
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
    console.error('CREATE PAYMENT ERROR:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Gagal membuat pembayaran Midtrans. Silakan coba lagi.',
    });
  }
};


// ============================================================
// MIDTRANS WEBHOOK
// POST /api/payments/midtrans/webhook
// TIDAK MEMAKAI AUTHENTICATE
// ============================================================
const webhook = async (req, res) => {
  let client;

  try {
    const notification = req.body || {};

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

    // --------------------------------------------------------
    // VERIFIKASI SIGNATURE MIDTRANS
    // sha512(order_id + status_code + gross_amount + server_key)
    // --------------------------------------------------------
    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      console.error(
        'WEBHOOK ERROR: MIDTRANS_SERVER_KEY belum dikonfigurasi'
      );

      return res.status(500).json({
        success: false,
        message: 'Konfigurasi pembayaran belum lengkap',
      });
    }

    const expectedSignature = crypto
      .createHash('sha512')
      .update(
        `${order_id}${status_code ?? ''}${gross_amount ?? ''}${serverKey}`
      )
      .digest('hex');

    if (
      !signature_key ||
      expectedSignature.length !== String(signature_key).length ||
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(String(signature_key))
      )
    ) {
      console.error('WEBHOOK ERROR: signature tidak valid');

      return res.status(401).json({
        success: false,
        message: 'Signature tidak valid',
      });
    }

    // --------------------------------------------------------
    // CARI ORDER (berdasarkan midtrans_order_id atau order_code)
    // --------------------------------------------------------
    const { rows: orders } = await db.query(
      `
      SELECT o.*
      FROM orders o
      LEFT JOIN payments p
        ON p.order_id = o.id
      WHERE p.midtrans_order_id = $1
         OR o.order_code = $1
      ORDER BY o.id DESC
      LIMIT 1
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
    // VALIDASI NOMINAL
    // --------------------------------------------------------
    if (
      gross_amount !== undefined &&
      Math.abs(Number(gross_amount) - Number(order.total_price)) > 0.01
    ) {
      console.error('WEBHOOK ERROR: nominal tidak sesuai');

      return res.status(400).json({
        success: false,
        message: 'Nominal pembayaran tidak sesuai dengan pesanan',
      });
    }

    // --------------------------------------------------------
    // TENTUKAN STATUS
    // --------------------------------------------------------
    const successPayment =
      transaction_status === 'settlement' ||
      (transaction_status === 'capture' && fraud_status !== 'challenge');

    const failedPayment =
      transaction_status === 'cancel' ||
      transaction_status === 'deny' ||
      transaction_status === 'expire';

    // --------------------------------------------------------
    // IDEMPOTENSI
    // Notifikasi yang sama tidak boleh memproses order dua kali.
    // --------------------------------------------------------
    if (successPayment && order.status === 'paid') {
      return res.json({
        success: true,
        message: 'Pembayaran sudah diproses sebelumnya',
      });
    }

    if (failedPayment && order.status === 'cancelled') {
      return res.json({
        success: true,
        message: 'Pembatalan sudah diproses sebelumnya',
      });
    }

    // Jangan menurunkan status order yang sudah lunas.
    if (failedPayment && order.status === 'paid') {
      return res.json({
        success: true,
        message: 'Order sudah lunas, notifikasi pembatalan diabaikan',
      });
    }

    let paymentStatus = 'pending';
    let orderStatus = 'pending';

    if (successPayment) {
      paymentStatus = 'verified';
      orderStatus = 'paid';
    }

    if (failedPayment) {
      paymentStatus = 'rejected';
      orderStatus = 'cancelled';
    }

    client = await db.connect();
    await client.query('BEGIN');

    // --------------------------------------------------------
    // UPDATE PAYMENT
    // --------------------------------------------------------
    const paymentUpdate = await client.query(
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

    if (paymentUpdate.rowCount === 0) {
      await client.query(
        `
        INSERT INTO payments
        (
          order_id,
          payment_method,
          amount,
          status,
          payment_type,
          transaction_id,
          transaction_status,
          paid_at
        )
        VALUES ($1, 'midtrans', $2, $3, $4, $5, $6, $7)
        `,
        [
          order.id,
          Number(order.total_price),
          paymentStatus,
          payment_type || null,
          transaction_id || null,
          transaction_status || null,
          paymentStatus === 'verified' ? new Date() : null,
        ]
      );
    }

    // --------------------------------------------------------
    // UPDATE ORDER
    // --------------------------------------------------------
    await client.query(
      `
      UPDATE orders
      SET status = $1
      WHERE id = $2
      `,
      [orderStatus, order.id]
    );

    // --------------------------------------------------------
    // JIKA BERHASIL BAYAR: TIKET PENDING -> ACTIVE
    // --------------------------------------------------------
    if (orderStatus === 'paid') {
      await client.query(
        `
        UPDATE tickets t
        SET status = 'active'
        FROM order_items oi
        WHERE oi.id = t.order_item_id
          AND oi.order_id = $1
        `,
        [order.id]
      );
    }

    // --------------------------------------------------------
    // JIKA GAGAL / EXPIRED: KEMBALIKAN STOK + BATALKAN TIKET
    // --------------------------------------------------------
    if (orderStatus === 'cancelled') {
      const { rows: items } = await client.query(
        `
        SELECT *
        FROM order_items
        WHERE order_id = $1
        `,
        [order.id]
      );

      for (const item of items) {
        await client.query(
          `
          UPDATE ticket_categories
          SET sold = GREATEST(sold - $1, 0)
          WHERE id = $2
          `,
          [item.quantity, item.ticket_category_id]
        );
      }

      await client.query(
        `
        UPDATE tickets t
        SET status = 'cancelled'
        FROM order_items oi
        WHERE oi.id = t.order_item_id
          AND oi.order_id = $1
        `,
        [order.id]
      );
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Notification Midtrans berhasil diproses',
    });

  } catch (err) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }

    console.error('MIDTRANS WEBHOOK ERROR:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Gagal memproses notifikasi pembayaran',
    });
  } finally {
    if (client) client.release();
  }
};


// ============================================================
// GET /api/payments/:id
// CUSTOMER MELIHAT PAYMENT MILIKNYA
// ============================================================
const getOne = async (req, res) => {
  try {
    const { rows } = await db.query(
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
      WHERE p.id = $1
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
    console.error('GET PAYMENT ERROR:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data pembayaran',
    });
  }
};


// ============================================================
// GET /api/payments
// ADMIN
// ============================================================
const getAll = async (req, res) => {
  try {
    const { rows } = await db.query(
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
    console.error('GET ALL PAYMENT ERROR:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data pembayaran',
    });
  }
};


// ============================================================
// UPLOAD BUKTI (LEGACY / FALLBACK)
// ============================================================
const uploadProof = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File bukti transfer wajib diupload',
      });
    }

    const { orderId } = req.params;

    const { rows: orders } = await db.query(
      `
      SELECT *
      FROM orders
      WHERE id = $1
        AND user_id = $2
      `,
      [orderId, req.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pesanan tidak ditemukan',
      });
    }

    const proof_url = BASE
      ? `${BASE}/uploads/payments/${req.file.filename}`
      : `/uploads/payments/${req.file.filename}`;

    const { rowCount } = await db.query(
      `
      UPDATE payments
      SET proof_url = $1
      WHERE order_id = $2
      `,
      [proof_url, orderId]
    );

    if (rowCount === 0) {
      await db.query(
        `
        INSERT INTO payments
        (
          order_id,
          payment_method,
          amount,
          status,
          proof_url
        )
        VALUES ($1, 'transfer', $2, 'pending', $3)
        `,
        [orderId, Number(orders[0].total_price), proof_url]
      );
    }

    return res.json({
      success: true,
      message: 'Bukti transfer berhasil diupload',
      data: {
        proof_url,
      },
    });

  } catch (err) {
    console.error('UPLOAD PROOF ERROR:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Gagal mengupload bukti transfer',
    });
  }
};


// ============================================================
// VERIFY MANUAL (TIDAK DIGUNAKAN PADA MIDTRANS)
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
