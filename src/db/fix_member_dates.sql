-- =============================================
-- FIX: Update tanggal registered_at member contoh
-- agar muncul di grafik "6 bulan terakhir"
-- Jalankan ini jika database sudah dibuat sebelumnya
-- dan grafik/chart dashboard kosong
-- =============================================

UPDATE members SET registered_at = CURRENT_DATE - INTERVAL '5 months', start_date = CURRENT_DATE - INTERVAL '5 months'
WHERE reference_number = 'GYM-ABC123-XY1Z';

UPDATE members SET registered_at = CURRENT_DATE - INTERVAL '4 months', start_date = CURRENT_DATE - INTERVAL '4 months'
WHERE reference_number = 'GYM-DEF456-AB2C';

UPDATE members SET registered_at = CURRENT_DATE - INTERVAL '6 months', start_date = CURRENT_DATE - INTERVAL '6 months'
WHERE reference_number = 'GYM-GHI789-CD3E';

UPDATE members SET registered_at = CURRENT_DATE - INTERVAL '3 months', start_date = CURRENT_DATE - INTERVAL '3 months'
WHERE reference_number = 'GYM-JKL012-EF4G';

UPDATE members SET registered_at = CURRENT_DATE - INTERVAL '2 months', start_date = CURRENT_DATE - INTERVAL '2 months'
WHERE reference_number = 'GYM-MNO345-GH5I';

UPDATE members SET registered_at = CURRENT_DATE - INTERVAL '1 month', start_date = CURRENT_DATE - INTERVAL '1 month'
WHERE reference_number = 'GYM-PQR678-IJ6K';

-- Tambahan: 2 member baru yang baru daftar (opsional, supaya data lebih variatif)
INSERT INTO members (name, email, phone, birth_date, gender, address, plan, duration, status, registered_at, start_date, end_date, reference_number, trainer_id, trainer_schedule_id, height_cm, weight_kg) VALUES
  ('Putri Lestari', 'putri@example.com', '087890123456', '1996-06-10', 'female', 'Jl. Kartini No. 3, Surabaya', 'premium', '3', 'active', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '3 months', 'GYM-STU901-KL7M', 't2', 's4', 160, 52),
  ('Eko Prasetyo', 'eko@example.com', '088901234567', '1991-09-25', 'male', 'Jl. Veteran No. 9, Surabaya', 'regular', '1', 'active', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '1 month', 'GYM-VWX234-NO8P', 't4', 's10', 172, 70)
ON CONFLICT (reference_number) DO NOTHING;

-- Verifikasi
SELECT name, plan, status, registered_at FROM members ORDER BY registered_at DESC;
