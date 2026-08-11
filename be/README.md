# Tiket Konser API

REST API untuk Aplikasi Pemesanan Tiket Konser  
UKK XII RPL — SMK Taruna Bhakti 2026/2027

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Buat file .env dari contoh
cp .env.example .env
# Edit .env sesuai konfigurasi database kamu

# 3. Import database
mysql -u root -p < ../db_tiket_konser.sql

# 4. Jalankan server
npm run dev
```

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
| GET | /api/payments | Admin | Semua data pembayaran |
| POST | /api/payments/:orderId/upload | Login | Upload bukti transfer |
| PATCH | /api/payments/:orderId/verify | Admin | Verifikasi / tolak pembayaran |

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

### Verifikasi Pembayaran
```json
PATCH /api/payments/1/verify
Authorization: Bearer <token_admin>
{
  "status": "verified"
}
```
