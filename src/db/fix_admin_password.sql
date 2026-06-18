-- =============================================
-- FIX: Update password admin yang sudah ada
-- Jalankan ini jika database sudah dibuat sebelumnya
-- dan login gagal dengan kredensial demo
-- =============================================

UPDATE admin_users
SET password_hash = '$2a$10$gHqfWchDpmW3BU9Yi26BDeQGJivvEhlEbUT2U4JFJdnZJ07SjglWe'
WHERE email = 'admin@gymcemerlang.com';

-- Verifikasi (harus muncul 1 baris)
SELECT email, name, role FROM admin_users WHERE email = 'admin@gymcemerlang.com';
