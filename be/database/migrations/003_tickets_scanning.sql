-- ============================================================
-- 003_tickets_scanning.sql
--
-- Menambahkan kolom yang dibutuhkan fitur scan / check-in tiket:
-- - used_at    : waktu tiket dipakai (check-in)
-- - scanned_by : admin/petugas yang melakukan check-in
--
-- Tabel `tickets` sudah ada dan dipakai aplikasi, sehingga migration
-- ini hanya menambah kolom + index. Tidak ada tabel/data yang dihapus.
-- Aman dijalankan berulang (IF NOT EXISTS).
-- ============================================================

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS used_at    timestamptz,
  ADD COLUMN IF NOT EXISTS scanned_by bigint;

-- Foreign key ke users. Ditambahkan terpisah agar aman dijalankan ulang.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tickets_scanned_by_fkey'
      AND conrelid = 'tickets'::regclass
  ) THEN
    ALTER TABLE tickets
      ADD CONSTRAINT tickets_scanned_by_fkey
      FOREIGN KEY (scanned_by)
      REFERENCES users (id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Pencarian tiket berdasarkan kode sudah memakai unique index
-- `tickets_ticket_code_key`. Index berikut membantu filter status
-- (mis. daftar tiket aktif) dan laporan check-in.
CREATE INDEX IF NOT EXISTS idx_tickets_status
  ON tickets (status);

CREATE INDEX IF NOT EXISTS idx_tickets_used_at
  ON tickets (used_at);
