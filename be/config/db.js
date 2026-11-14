const { Pool, types } = require('pg');

require('dotenv').config();

// ============================================================
// TIPE DATA POSTGRESQL
//
// - BIGINT (OID 20): driver `pg` mengembalikan string. Semua id dan
//   hasil COUNT pada aplikasi ini jauh di bawah Number.MAX_SAFE_INTEGER,
//   jadi aman dikonversi menjadi number agar konsisten dengan frontend.
// - NUMERIC (OID 1700): digunakan untuk kolom harga. Semua nilai harga
//   di aplikasi ini adalah rupiah tanpa desimal, sehingga aman diubah
//   menjadi number supaya formatRupiah() di mobile bekerja langsung.
// ============================================================

types.setTypeParser(20, (value) => (value === null ? null : Number(value)));
types.setTypeParser(1700, (value) => (value === null ? null : Number(value)));

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    '[db] DATABASE_URL belum diatur. Salin .env.example menjadi .env lalu isi connection string Supabase.'
  );
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  // Supabase pooler membatasi jumlah koneksi; 5 koneksi cukup untuk
  // kebutuhan aplikasi ini dan menghindari "too many connections".
  max: Number(process.env.PG_POOL_MAX) || 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  application_name: 'tiket-konser-api',
});

pool.on('error', (err) => {
  // Jangan pernah mencetak connection string / password ke log.
  console.error('[db] Koneksi idle bermasalah:', err.message);
});

// Pemeriksaan koneksi saat server start (tidak menghentikan proses
// jika database sedang tidak dapat dijangkau).
pool
  .query('SELECT 1')
  .then(() => {
    console.log('[db] Berhasil terhubung ke PostgreSQL (Supabase)');
  })
  .catch((err) => {
    console.error('[db] Gagal terhubung ke database:', err.message);
  });

module.exports = pool;
