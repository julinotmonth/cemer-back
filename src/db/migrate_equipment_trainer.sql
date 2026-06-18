-- =============================================
-- MIGRASI: Fitur Rekap Kerusakan Alat + Manajemen Trainer
-- Jalankan ini jika database "gym_cemerlang" Anda sudah ada sebelumnya
-- (tidak perlu drop database / kehilangan data member yang sudah ada)
-- =============================================

-- 1. Tambah kolom status aktif/non-aktif ke tabel trainers
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS inactive_reason VARCHAR(255);

-- 2. Tambah kolom status aktif/non-aktif ke tabel trainer_schedules
ALTER TABLE trainer_schedules ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. Buat tabel equipment (alat gym yang dimonitor)
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

-- 4. Buat tabel equipment_issues (catatan kerusakan per kejadian)
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

-- 5. Seed data contoh untuk equipment (skip jika sudah ada data)
DO $$
DECLARE
  eq_count INTEGER;
  eq_treadmill UUID;
  eq_cable UUID;
  eq_rowing UUID;
BEGIN
  SELECT COUNT(*) INTO eq_count FROM equipment;
  IF eq_count = 0 THEN
    INSERT INTO equipment (name, category, icon, last_maintenance, maintenance_tips)
    VALUES ('Treadmill', 'Kardio', '🏃', CURRENT_DATE - INTERVAL '2 months',
      ARRAY['Lumasi belt setiap 3 bulan sekali', 'Bersihkan motor dari debu setiap bulan', 'Periksa tegangan belt secara rutin', 'Ganti belt setiap 1-2 tahun tergantung pemakaian'])
    RETURNING id INTO eq_treadmill;

    INSERT INTO equipment_issues (equipment_id, issue_date, description) VALUES
      (eq_treadmill, CURRENT_DATE - INTERVAL '5 months', 'Belt slip'),
      (eq_treadmill, CURRENT_DATE - INTERVAL '4 months', 'Display mati'),
      (eq_treadmill, CURRENT_DATE - INTERVAL '4 months', 'Belt aus'),
      (eq_treadmill, CURRENT_DATE - INTERVAL '3 months', 'Motor berisik'),
      (eq_treadmill, CURRENT_DATE - INTERVAL '2 months', 'Belt slip'),
      (eq_treadmill, CURRENT_DATE - INTERVAL '1 month', 'Motor overheat'),
      (eq_treadmill, CURRENT_DATE - INTERVAL '5 days', 'Belt aus');

    INSERT INTO equipment (name, category, icon, last_maintenance, maintenance_tips)
    VALUES ('Cable Machine', 'Mesin Beban', '🔄', CURRENT_DATE - INTERVAL '3 months',
      ARRAY['Periksa kondisi kabel setiap minggu', 'Lumasi pulley setiap 2 bulan', 'Ganti kabel setiap 12-18 bulan', 'Cek pin selector setiap bulan'])
    RETURNING id INTO eq_cable;

    INSERT INTO equipment_issues (equipment_id, issue_date, description) VALUES
      (eq_cable, CURRENT_DATE - INTERVAL '4 months', 'Pulley macet'),
      (eq_cable, CURRENT_DATE - INTERVAL '3 months', 'Pin selector rusak'),
      (eq_cable, CURRENT_DATE - INTERVAL '1 month', 'Kabel putus'),
      (eq_cable, CURRENT_DATE - INTERVAL '5 days', 'Kabel fraying');

    INSERT INTO equipment (name, category, icon, last_maintenance, maintenance_tips)
    VALUES ('Rowing Machine', 'Kardio', '🚣', CURRENT_DATE - INTERVAL '3 months',
      ARRAY['Bersihkan rel setiap minggu', 'Lumasi chain setiap bulan', 'Cek seat roller setiap 2 bulan', 'Kalibrasi damper setiap 6 bulan'])
    RETURNING id INTO eq_rowing;

    INSERT INTO equipment_issues (equipment_id, issue_date, description) VALUES
      (eq_rowing, CURRENT_DATE - INTERVAL '4 months', 'Chain berisik'),
      (eq_rowing, CURRENT_DATE - INTERVAL '2 months', 'Seat roller aus'),
      (eq_rowing, CURRENT_DATE - INTERVAL '1 month', 'Damper macet');
  END IF;
END $$;

-- Verifikasi
SELECT 'trainers' as tabel, COUNT(*) as jumlah FROM trainers
UNION ALL
SELECT 'equipment', COUNT(*) FROM equipment
UNION ALL
SELECT 'equipment_issues', COUNT(*) FROM equipment_issues;
