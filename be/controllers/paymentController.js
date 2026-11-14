const db = require('../config/db');
const snap = require('../config/midtrans');

const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');

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
          midtransOrderId,
          redirect_url,
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

const webhook = async (req, res) => {
  let client;

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

    if (orderResult.rows.length === 0) {
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
      (transaction_status === 'capture' && fraud_status !== 'challenge');

    const failedPayment = [
      'cancel',
      'deny',
      'expire',
    ].includes(transaction_status);

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
    await db.query(
      `
      UPDATE orders
      SET status = ?
      WHERE id = ?
      `,
      [orderStatus, order.id]
    );

    // --------------------------------------------------------
    // JIKA BERHASIL BAYAR
    // TIKET PENDING -> ACTIVE
    // --------------------------------------------------------
    if (orderStatus === 'paid') {
      await client.query(
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
          [item.quantity, item.ticket_category_id]
        );
      }

      await client.query(
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

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Notification Midtrans berhasil diproses',
    });
  } catch (err) {
    console.error(
      'MIDTRANS WEBHOOK ERROR:',
      err
    );

    return res.status(500).json({
      success: false,
      message: 'Gagal memproses notifikasi pembayaran',
    });
  } finally {
    if (client) client.release();
  }
};

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
    console.error(
      'GET PAYMENT ERROR:',
      err
    );

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data pembayaran',
    });
  }
};

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
    console.error(
      'GET ALL PAYMENT ERROR:',
      err
    );

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data pembayaran',
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
        message: 'File bukti transfer wajib diupload',
      });
    }

    const { orderId } = req.params;

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

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pesanan tidak ditemukan',
      });
    }

    const proof_url =
      `${BASE}/uploads/payments/${req.file.filename}`;

    const { rowCount } = await db.query(
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
      message: 'Bukti transfer berhasil diupload',
      data: {
        proof_url,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengupload bukti transfer',
    });
  }
};


// ============================================================
// VERIFY MANUAL LAMA
// ============================================================
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
