-- ============================================================
-- 001_payments_midtrans_columns.sql
--
-- Menambahkan kolom yang dibutuhkan integrasi Midtrans pada tabel
-- `payments`. Sebelumnya controller sudah menulis kolom-kolom ini
-- tetapi kolomnya belum ada di database PostgreSQL.
--
-- Aman dijalankan berulang (IF NOT EXISTS) dan tidak menghapus data.
-- ============================================================

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS snap_token        varchar,
  ADD COLUMN IF NOT EXISTS midtrans_order_id varchar,
  ADD COLUMN IF NOT EXISTS transaction_id    varchar,
  ADD COLUMN IF NOT EXISTS transaction_status varchar,
  ADD COLUMN IF NOT EXISTS payment_type      varchar,
  ADD COLUMN IF NOT EXISTS redirect_url      text;

CREATE INDEX IF NOT EXISTS idx_payments_midtrans_order_id
  ON payments (midtrans_order_id);
