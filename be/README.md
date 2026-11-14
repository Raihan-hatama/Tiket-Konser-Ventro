# Tiket Konser API

REST API untuk Aplikasi Pemesanan Tiket Konser  
UKK XII RPL — SMK Taruna Bhakti 2026/2027

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Buat file .env dari contoh
cp .env.example .env

# 3. Isi DATABASE_URL dengan connection string PostgreSQL (Supabase)
#    Ambil dari dashboard Supabase:
#    Project Settings -> Database -> Connection string
#    Contoh format: postgresql://<user>:<password>@<host>:<port>/<database>

# 4. Jalankan server
npm run dev
```

## Konfigurasi Database

Database project ini adalah **PostgreSQL** yang di-host di **Supabase**.
Koneksi dibuat di `config/db.js` menggunakan driver `pg` (`new Pool(...)`)
dan hanya membaca satu variabel lingkungan, yaitu `DATABASE_URL`:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
```

Koneksi memakai SSL (`rejectUnauthorized: false`) karena Supabase
mewajibkan koneksi terenkripsi.

Variabel lama seperti `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, dan
`DB_NAME` sudah tidak dipakai lagi, dan driver `mysql2` tidak digunakan
oleh kode aplikasi. Pada saat server dijalankan, `config/db.js` akan
mencetak pesan berhasil/gagal terhubung ke Supabase di console.

## Environment Variables

| Variabel | Wajib | Keterangan |
|----------|-------|------------|
| `PORT` | Tidak | Port server Express. Default `3000` (lihat `app.js`). |
| `DATABASE_URL` | Ya | Connection string PostgreSQL Supabase yang dibaca `config/db.js`. |
| `JWT_SECRET` | Ya | Secret untuk menandatangani dan memverifikasi token JWT. |
| `JWT_EXPIRES_IN` | Tidak | Masa berlaku token, contoh `7d`. |
| `BASE_URL` | Ya | URL publik backend; dipakai untuk membentuk URL foto artis, QR code tiket, dan bukti pembayaran (`<BASE_URL>/uploads/...`). |
| `MIDTRANS_SERVER_KEY` | Ya (untuk pembayaran) | Server key Midtrans yang dibaca `config/midtrans.js`. |
| `MIDTRANS_CLIENT_KEY` | Ya (untuk pembayaran) | Client key Midtrans yang dibaca `config/midtrans.js`. |
| `MIDTRANS_IS_PRODUCTION` | Tidak | Isi `true` untuk mode produksi Midtrans; selain itu berjalan di sandbox. |

## Endpoint

### Auth
| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| POST | /api/auth/register | Public | Daftar akun pelanggan |
| POST | /api/auth/login | Public | Login (dapat token JWT) |
| GET | /api/auth/me | Login | Info user yang sedang login |

### Artists
| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| GET | /api/artists | Public | Daftar semua artis |
| GET | /api/artists/:id | Public | Detail artis |
| POST | /api/artists | Admin | Tambah artis (form-data: name, bio, photo) |
| PUT | /api/artists/:id | Admin | Edit artis |
| DELETE | /api/artists/:id | Admin | Hapus artis |

### Events
| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| GET | /api/events | Public | Daftar semua konser |
| GET | /api/events/:id | Public | Detail konser + artis + kategori tiket |
| POST | /api/events | Admin | Buat konser baru |
| PUT | /api/events/:id | Admin | Edit konser |
| DELETE | /api/events/:id | Admin | Hapus konser |
| PATCH | /api/events/:id/close | Admin | Tutup penjualan tiket |

### Ticket Categories
| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| GET | /api/events/:eventId/categories | Public | Kategori tiket per event |
| POST | /api/events/:eventId/categories | Admin | Tambah kategori (name, price, quota) |
| PUT | /api/categories/:id | Admin | Edit kategori |
| DELETE | /api/categories/:id | Admin | Hapus kategori |

### Orders
| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| POST | /api/orders | Login | Buat pesanan (otomatis generate QR Code) |
| GET | /api/orders | Login | Riwayat pesanan (admin: semua, customer: milik sendiri) |
| GET | /api/orders/:id | Login | Detail pesanan + tiket + QR Code |

### Payments
| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| POST | /api/payments/:orderId/create | Login | Membuat transaksi Midtrans (Snap token + redirect URL) |
| POST | /api/payments/midtrans/webhook | Publik (signature) | Menerima notifikasi Midtrans dan memperbarui status order/tiket |
| GET | /api/payments | Admin | Semua data pembayaran |
| GET | /api/payments/:id | Login | Detail pembayaran (customer hanya miliknya) |
| POST | /api/payments/:orderId/upload | Login | Upload bukti transfer manual (fallback) |
| PATCH | /api/payments/:orderId/verify | Admin | Tidak dipakai lagi (verifikasi hanya lewat webhook Midtrans) |

### Dashboard
| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| GET | /api/dashboard | Admin | Statistik: revenue, tiket terjual, pesanan terbaru |

## Contoh Request

### Login
```json
POST /api/auth/login
{
  "email": "admin@taruna.sch.id",
  "password": "passwordkamu"
}
```

### Buat Pesanan
```json
POST /api/orders
Authorization: Bearer <token>
{
  "event_id": 1,
  "items": [
    { "ticket_category_id": 2, "quantity": 2 }
  ]
}
```

### Membuat Pembayaran (Midtrans)
```json
POST /api/payments/1/create
Authorization: Bearer <token>
{
  "payment_method": "qris"
}
```

`payment_method` menerima grup `qris`, `bank`, atau `ewallet`, atau kode
spesifik seperti `gopay`, `bca_va`, dan `shopeepay`. Response berisi
`snap_token` dan `redirect_url` yang dibuka di aplikasi mobile.

### Webhook Midtrans
```
POST /api/payments/midtrans/webhook
```
Signature diverifikasi dengan SHA-512
(`order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY`).
Order baru berubah menjadi `paid` dan tiket menjadi `active` setelah
notifikasi `settlement`/`capture` yang valid diterima.
