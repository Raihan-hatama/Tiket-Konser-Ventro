const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');

const QR_DIR = path.join(__dirname, '..', 'uploads', 'qrcodes');

const TICKET_PREFIX = 'VNT-';
const TICKET_RANDOM_BYTES = 8;
const MAX_CODE_ATTEMPTS = 8;

// ============================================================
// KODE TIKET
//
// Kode dibuat dari crypto.randomBytes (cryptographically secure),
// bukan dari ID berurutan, sehingga tidak bisa ditebak.
// Contoh: VNT-8F72A91C7B2D4E60
// ============================================================

const generateTicketCode = () =>
  `${TICKET_PREFIX}${crypto
    .randomBytes(TICKET_RANDOM_BYTES)
    .toString('hex')
    .toUpperCase()}`;

const normalizeTicketCode = (value) =>
  typeof value === 'string' ? value.trim().toUpperCase() : '';

const generateUniqueTicketCode = async (client) => {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateTicketCode();

    const { rowCount } = await client.query(
      'SELECT 1 FROM tickets WHERE ticket_code = $1',
      [code]
    );

    if (rowCount === 0) {
      return code;
    }
  }

  throw new Error('Gagal membuat kode tiket unik, silakan coba lagi');
};

// ============================================================
// QR CODE
//
// QR hanya berisi kode tiket. Gambar disimpan sebagai file di
// uploads/qrcodes agar tidak membebani database. Jika file hilang,
// QR dapat dibuat ulang dari kode tiket.
// ============================================================

const ensureQrDir = () => {
  if (!fs.existsSync(QR_DIR)) {
    fs.mkdirSync(QR_DIR, { recursive: true });
  }
};

const qrFileName = (ticketCode) => `${ticketCode}.png`;

const qrFilePath = (ticketCode) =>
  path.join(QR_DIR, qrFileName(ticketCode));

const qrCodeUrl = (ticketCode) => {
  const file = qrFileName(ticketCode);

  return BASE
    ? `${BASE}/uploads/qrcodes/${file}`
    : `/uploads/qrcodes/${file}`;
};

const generateQrFile = async (ticketCode) => {
  ensureQrDir();

  await QRCode.toFile(qrFilePath(ticketCode), ticketCode, {
    width: 360,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0A1E4D',
      light: '#FFFFFF',
    },
  });

  return qrCodeUrl(ticketCode);
};

/**
 * Memastikan file QR tersedia dan mengembalikan URL terbaru.
 * URL dihitung ulang dari BASE_URL agar tidak basi ketika alamat
 * server berubah.
 */
const ensureTicketQr = async (ticketCode) => {
  ensureQrDir();

  const expectedUrl = qrCodeUrl(ticketCode);

  if (!fs.existsSync(qrFilePath(ticketCode))) {
    await generateQrFile(ticketCode);
  }

  return expectedUrl;
};

/**
 * Membuat tiket untuk order yang sudah dibayar.
 *
 * - Idempoten: tiket yang sudah ada tidak dibuat ulang.
 * - Jumlah tiket mengikuti quantity pada order_items.
 * - Tiket baru langsung berstatus 'active' karena pembayaran sudah sah.
 * - Tiket pending/cancelled milik order ini diaktifkan kembali.
 *
 * HARUS dipanggil di dalam transaksi database yang sama dengan
 * perubahan status pembayaran.
 */
const syncTicketsForPaidOrder = async (client, orderId) => {
  const { rows: items } = await client.query(
    `
    SELECT
      oi.id,
      oi.quantity,
      COUNT(t.id)::int AS ticket_count
    FROM order_items oi
    LEFT JOIN tickets t ON t.order_item_id = oi.id
    WHERE oi.order_id = $1
    GROUP BY oi.id, oi.quantity
    ORDER BY oi.id ASC
    `,
    [orderId]
  );

  let created = 0;

  for (const item of items) {
    const quantity = Number(item.quantity) || 0;
    const existing = Number(item.ticket_count) || 0;
    const missing = Math.max(0, quantity - existing);

    for (let i = 0; i < missing; i += 1) {
      const ticketCode = await generateUniqueTicketCode(client);
      const qrUrl = await generateQrFile(ticketCode);

      await client.query(
        `
        INSERT INTO tickets
        (
          order_item_id,
          ticket_code,
          qr_code_url,
          status
        )
        VALUES ($1, $2, $3, 'active')
        `,
        [item.id, ticketCode, qrUrl]
      );

      created += 1;
    }
  }

  // Aktifkan tiket yang sebelumnya pending atau cancelled. Tiket
  // yang sudah 'used' tidak diubah agar riwayat check-in tetap utuh.
  await client.query(
    `
    UPDATE tickets
    SET status = 'active'
    WHERE status IN ('pending', 'cancelled')
      AND order_item_id IN (
        SELECT id
        FROM order_items
        WHERE order_id = $1
      )
    `,
    [orderId]
  );

  return created;
};

module.exports = {
  generateTicketCode,
  generateUniqueTicketCode,
  normalizeTicketCode,
  generateQrFile,
  ensureTicketQr,
  qrCodeUrl,
  syncTicketsForPaidOrder,
  QR_DIR,
};
