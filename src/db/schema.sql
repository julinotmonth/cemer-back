-- =============================================
-- GYM CEMERLANG - Database Schema
-- =============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: admin_users
-- =============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL DEFAULT 'Admin',
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: trainers
-- =============================================
CREATE TABLE IF NOT EXISTS trainers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  specialization VARCHAR(255) NOT NULL,
  experience VARCHAR(100) NOT NULL,
  avatar VARCHAR(10) NOT NULL,
  rating DECIMAL(2,1) NOT NULL DEFAULT 0,
  certifications TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  inactive_reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: trainer_schedules
-- =============================================
CREATE TABLE IF NOT EXISTS trainer_schedules (
  id VARCHAR(50) PRIMARY KEY,
  trainer_id VARCHAR(50) REFERENCES trainers(id) ON DELETE CASCADE,
  day VARCHAR(100) NOT NULL,
  time VARCHAR(100) NOT NULL,
  slots INTEGER NOT NULL DEFAULT 4,
  booked_slots INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: members
-- =============================================
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  birth_date DATE NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
  address TEXT NOT NULL,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('basic', 'regular', 'premium')),
  duration VARCHAR(5) NOT NULL CHECK (duration IN ('1', '3', '6', '12')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'expired')),
  registered_at DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reference_number VARCHAR(50) UNIQUE NOT NULL,
  trainer_id VARCHAR(50) REFERENCES trainers(id) ON DELETE SET NULL,
  trainer_schedule_id VARCHAR(50) REFERENCES trainer_schedules(id) ON DELETE SET NULL,
  height_cm INTEGER,
  weight_kg INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: notifications
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'promo')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: gym_settings
-- =============================================
CREATE TABLE IF NOT EXISTS gym_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  gym_name VARCHAR(255) NOT NULL DEFAULT 'Gym Cemerlang',
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- =============================================
-- TABLE: equipment (alat gym yang dimonitor)
-- =============================================
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  icon VARCHAR(10) NOT NULL DEFAULT '🏋️',
  last_maintenance DATE,
  maintenance_tips TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: equipment_issues (catatan kerusakan per kejadian)
-- =============================================
CREATE TABLE IF NOT EXISTS equipment_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_issues_equipment_id ON equipment_issues(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_issues_date ON equipment_issues(issue_date);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_reference ON members(reference_number);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_plan ON members(plan);
CREATE INDEX IF NOT EXISTS idx_members_registered_at ON members(registered_at);

-- =============================================
-- SEED DATA
-- =============================================

-- Admin user (password: admin123)
INSERT INTO admin_users (email, name, role, password_hash) VALUES
  ('admin@gymcemerlang.com', 'Admin Gym', 'Super Admin', '$2a$10$gHqfWchDpmW3BU9Yi26BDeQGJivvEhlEbUT2U4JFJdnZJ07SjglWe')
ON CONFLICT (email) DO NOTHING;

-- Trainers
INSERT INTO trainers (id, name, specialization, experience, avatar, rating, certifications, bio) VALUES
  ('t1', 'Andi Firmansyah', 'Strength & Muscle Building', '8 tahun', 'AF', 4.9, ARRAY['ACE Certified PT', 'NSCA-CPT', 'Nutrition Coach'], 'Spesialis pembentukan otot dan kekuatan. Sudah melatih 200+ klien dengan hasil transformasi luar biasa.'),
  ('t2', 'Sari Dewi Kusuma', 'Cardio & Weight Loss', '6 tahun', 'SD', 4.8, ARRAY['ACSM CPT', 'Zumba Instructor', 'Yoga Alliance RYT 200'], 'Ahli cardio dan penurunan berat badan. Metode latihan menyenangkan namun sangat efektif untuk membakar lemak.'),
  ('t3', 'Bima Arjuna Putra', 'Functional Training & HIIT', '5 tahun', 'BA', 4.7, ARRAY['ISSA CPT', 'CrossFit L2', 'TRX Certified'], 'Pakar functional training dan HIIT. Membantu klien mencapai kebugaran optimal dengan latihan yang efisien dan dinamis.'),
  ('t4', 'Rini Wahyuni', 'Yoga, Pilates & Flexibility', '7 tahun', 'RW', 4.9, ARRAY['Yoga Alliance E-RYT 500', 'BASI Pilates', 'Meditation Coach'], 'Instruktur yoga dan pilates bersertifikat internasional. Fokus pada keseimbangan tubuh, fleksibilitas, dan kesehatan mental.')
ON CONFLICT (id) DO NOTHING;

-- Trainer schedules
INSERT INTO trainer_schedules (id, trainer_id, day, time, slots, booked_slots) VALUES
  ('s1', 't1', 'Senin & Rabu', '07:00 - 09:00', 4, 2),
  ('s2', 't1', 'Selasa & Kamis', '17:00 - 19:00', 4, 1),
  ('s3', 't1', 'Sabtu', '08:00 - 10:00', 6, 4),
  ('s4', 't2', 'Senin, Rabu & Jumat', '06:00 - 07:30', 5, 3),
  ('s5', 't2', 'Selasa & Kamis', '15:00 - 16:30', 5, 2),
  ('s6', 't2', 'Minggu', '07:00 - 09:00', 8, 5),
  ('s7', 't3', 'Senin & Jumat', '10:00 - 12:00', 4, 0),
  ('s8', 't3', 'Rabu', '18:00 - 20:00', 4, 2),
  ('s9', 't3', 'Sabtu & Minggu', '09:00 - 11:00', 6, 3),
  ('s10', 't4', 'Selasa & Kamis', '08:00 - 09:30', 8, 6),
  ('s11', 't4', 'Rabu & Jumat', '16:00 - 17:30', 8, 4),
  ('s12', 't4', 'Minggu', '08:00 - 10:00', 10, 7)
ON CONFLICT (id) DO NOTHING;

-- Sample members (registered_at relatif terhadap tanggal sekarang agar tampil di grafik 6 bulan)
INSERT INTO members (name, email, phone, birth_date, gender, address, plan, duration, status, registered_at, start_date, end_date, reference_number, trainer_id, trainer_schedule_id, height_cm, weight_kg) VALUES
  ('Budi Santoso', 'budi@example.com', '081234567890', '1990-05-15', 'male', 'Jl. Merdeka No. 12, Surabaya', 'premium', '12', 'active', CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE + INTERVAL '7 months', 'GYM-ABC123-XY1Z', 't1', 's1', 175, 80),
  ('Siti Rahayu', 'siti@example.com', '082345678901', '1995-08-22', 'female', 'Jl. Pahlawan No. 5, Surabaya', 'regular', '6', 'active', CURRENT_DATE - INTERVAL '4 months', CURRENT_DATE - INTERVAL '4 months', CURRENT_DATE + INTERVAL '2 months', 'GYM-DEF456-AB2C', NULL, NULL, 158, 55),
  ('Ahmad Fauzi', 'ahmad@example.com', '083456789012', '1988-12-03', 'male', 'Jl. Diponegoro No. 8, Surabaya', 'basic', '1', 'expired', CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE - INTERVAL '5 months', 'GYM-GHI789-CD3E', NULL, NULL, NULL, NULL),
  ('Dewi Kurniawati', 'dewi@example.com', '084567890123', '1998-03-18', 'female', 'Jl. Sudirman No. 25, Surabaya', 'regular', '3', 'pending', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE, 'GYM-JKL012-EF4G', NULL, NULL, NULL, NULL),
  ('Rizky Pratama', 'rizky@example.com', '085678901234', '1992-07-29', 'male', 'Jl. Ahmad Yani No. 15, Surabaya', 'premium', '6', 'active', CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE + INTERVAL '4 months', 'GYM-MNO345-GH5I', 't3', 's7', 170, 90),
  ('Maya Indah', 'maya@example.com', '086789012345', '1993-11-14', 'female', 'Jl. Gatot Subroto No. 7, Surabaya', 'basic', '3', 'active', CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE + INTERVAL '2 months', 'GYM-PQR678-IJ6K', NULL, NULL, 162, 48),
  ('Putri Lestari', 'putri@example.com', '087890123456', '1996-06-10', 'female', 'Jl. Kartini No. 3, Surabaya', 'premium', '3', 'active', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '3 months', 'GYM-STU901-KL7M', 't2', 's4', 160, 52),
  ('Eko Prasetyo', 'eko@example.com', '088901234567', '1991-09-25', 'male', 'Jl. Veteran No. 9, Surabaya', 'regular', '1', 'active', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '1 month', 'GYM-VWX234-NO8P', 't4', 's10', 172, 70)
ON CONFLICT (reference_number) DO NOTHING;

-- Notifications
INSERT INTO notifications (type, title, message, date, read) VALUES
  ('promo', '🎉 Promo Bulan April!', 'Daftar paket 6 bulan atau 12 bulan dan dapatkan 1 bulan gratis + bonus sesi personal trainer. Berlaku hingga 30 April 2026.', '2026-04-01', FALSE),
  ('info', '🏗️ Renovasi Area Kolam Renang', 'Area kolam renang akan ditutup untuk renovasi pada 15-22 April 2026. Mohon maaf atas ketidaknyamanannya. Fasilitas lain tetap beroperasi normal.', '2026-04-10', FALSE),
  ('success', '✅ Kelas Baru: HIIT Express', 'Kami menghadirkan kelas HIIT Express 30 menit setiap Senin, Rabu, Jumat pukul 12:00-12:30. Cocok untuk Anda yang punya waktu terbatas!', '2026-04-15', FALSE),
  ('warning', '⚠️ Jadwal Libur Nasional', 'Gym akan beroperasi dengan jam terbatas pada Hari Raya Idul Fitri (pukul 08:00-15:00). Pastikan Anda memeriksa jadwal sebelum berkunjung.', '2026-03-28', TRUE),
  ('info', '📱 Update Aplikasi Tersedia', 'Versi terbaru aplikasi Gym Cemerlang kini tersedia dengan fitur booking kelas online, tracking workout, dan notifikasi pengingat latihan.', '2026-03-20', TRUE)
ON CONFLICT DO NOTHING;

-- Gym settings
INSERT INTO gym_settings (id, gym_name, address, phone, email) VALUES
  (1, 'Gym Cemerlang', 'Jl. Raya Fitness No. 88, Surabaya', '+62 31 1234 5678', 'info@gymcemerlang.com')
ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

-- =============================================
-- SEED: Equipment & Issues (data contoh, tanggal relatif ke hari ini)
-- =============================================

DO $$
DECLARE
  eq_treadmill UUID;
  eq_cable UUID;
  eq_rowing UUID;
BEGIN
  -- Treadmill
  INSERT INTO equipment (name, category, icon, last_maintenance, maintenance_tips)
  VALUES ('Treadmill', 'Kardio', '🏃', CURRENT_DATE - INTERVAL '2 months',
    ARRAY['Lumasi belt setiap 3 bulan sekali', 'Bersihkan motor dari debu setiap bulan', 'Periksa tegangan belt secara rutin', 'Ganti belt setiap 1-2 tahun tergantung pemakaian'])
  RETURNING id INTO eq_treadmill;

  INSERT INTO equipment_issues (equipment_id, issue_date, description) VALUES
    (eq_treadmill, CURRENT_DATE - INTERVAL '5 months', 'Belt slip'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '5 months', 'Motor overheat'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '4 months', 'Display mati'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '4 months', 'Belt aus'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '4 months', 'Motor berisik'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '3 months', 'Motor berisik'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '3 months', 'Incline error'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '3 months', 'Sensor kecepatan rusak'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '3 months', 'Belt slip'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '2 months', 'Belt slip'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '2 months', 'Sensor kecepatan rusak'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '1 month', 'Motor overheat'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '1 month', 'Display error'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '1 month', 'Belt aus'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '1 month', 'Motor overheat'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '5 days', 'Belt aus'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '5 days', 'Papan bawah retak'),
    (eq_treadmill, CURRENT_DATE - INTERVAL '5 days', 'Belt aus');

  -- Cable Machine
  INSERT INTO equipment (name, category, icon, last_maintenance, maintenance_tips)
  VALUES ('Cable Machine', 'Mesin Beban', '🔄', CURRENT_DATE - INTERVAL '3 months',
    ARRAY['Periksa kondisi kabel setiap minggu', 'Lumasi pulley setiap 2 bulan', 'Ganti kabel setiap 12-18 bulan', 'Cek pin selector setiap bulan'])
  RETURNING id INTO eq_cable;

  INSERT INTO equipment_issues (equipment_id, issue_date, description) VALUES
    (eq_cable, CURRENT_DATE - INTERVAL '5 months', 'Kabel fraying'),
    (eq_cable, CURRENT_DATE - INTERVAL '4 months', 'Pulley macet'),
    (eq_cable, CURRENT_DATE - INTERVAL '4 months', 'Kabel putus'),
    (eq_cable, CURRENT_DATE - INTERVAL '3 months', 'Pin selector rusak'),
    (eq_cable, CURRENT_DATE - INTERVAL '3 months', 'Pulley aus'),
    (eq_cable, CURRENT_DATE - INTERVAL '2 months', 'Kabel fraying'),
    (eq_cable, CURRENT_DATE - INTERVAL '1 month', 'Pulley aus'),
    (eq_cable, CURRENT_DATE - INTERVAL '1 month', 'Kabel putus'),
    (eq_cable, CURRENT_DATE - INTERVAL '1 month', 'Pin selector'),
    (eq_cable, CURRENT_DATE - INTERVAL '5 days', 'Kabel putus'),
    (eq_cable, CURRENT_DATE - INTERVAL '5 days', 'Pulley macet'),
    (eq_cable, CURRENT_DATE - INTERVAL '5 days', 'Kabel fraying');

  -- Rowing Machine
  INSERT INTO equipment (name, category, icon, last_maintenance, maintenance_tips)
  VALUES ('Rowing Machine', 'Kardio', '🚣', CURRENT_DATE - INTERVAL '3 months',
    ARRAY['Bersihkan rel setiap minggu', 'Lumasi chain setiap bulan', 'Cek seat roller setiap 2 bulan', 'Kalibrasi damper setiap 6 bulan'])
  RETURNING id INTO eq_rowing;

  INSERT INTO equipment_issues (equipment_id, issue_date, description) VALUES
    (eq_rowing, CURRENT_DATE - INTERVAL '5 months', 'Seat roller aus'),
    (eq_rowing, CURRENT_DATE - INTERVAL '4 months', 'Chain berisik'),
    (eq_rowing, CURRENT_DATE - INTERVAL '3 months', 'Display error'),
    (eq_rowing, CURRENT_DATE - INTERVAL '3 months', 'Seat roller aus'),
    (eq_rowing, CURRENT_DATE - INTERVAL '2 months', 'Seat roller aus'),
    (eq_rowing, CURRENT_DATE - INTERVAL '1 month', 'Chain aus'),
    (eq_rowing, CURRENT_DATE - INTERVAL '1 month', 'Damper macet');
END $$;
