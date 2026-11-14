-- ============================================================
-- 002_tickets_pending_status.sql
--
-- Tiket dibuat dengan status 'pending' saat order dibuat dan baru
-- menjadi 'active' setelah pembayaran terkonfirmasi Midtrans.
-- CHECK constraint lama hanya mengizinkan active/used/cancelled
-- sehingga INSERT tiket selalu gagal.
--
-- Perubahan hanya memperluas nilai yang diizinkan; data lama tetap
-- valid dan tidak ada data yang dihapus.
-- ============================================================

ALTER TABLE tickets
  DROP CONSTRAINT IF EXISTS tickets_status_check;

ALTER TABLE tickets
  ADD CONSTRAINT tickets_status_check
  CHECK (status IN ('pending', 'active', 'used', 'cancelled'));
