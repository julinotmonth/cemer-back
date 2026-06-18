const pool = require('../db/pool')

// Helper: build a simple unique trainer id like t5, t6...
async function generateTrainerId() {
  const result = await pool.query(`SELECT id FROM trainers ORDER BY id DESC`)
  const nums = result.rows
    .map(r => parseInt(r.id.replace('t', '')))
    .filter(n => !isNaN(n))
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `t${next}`
}

async function generateScheduleId() {
  const result = await pool.query(`SELECT id FROM trainer_schedules ORDER BY id DESC`)
  const nums = result.rows
    .map(r => parseInt(r.id.replace('s', '')))
    .filter(n => !isNaN(n))
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `s${next}`
}

// GET /api/admin/trainers — full list for admin management (includes inactive)
const getAllTrainersAdmin = async (req, res) => {
  try {
    const trainersRes = await pool.query('SELECT * FROM trainers ORDER BY is_active DESC, name ASC')
    const schedulesRes = await pool.query('SELECT * FROM trainer_schedules ORDER BY trainer_id')

    const schedulesByTrainer = {}
    schedulesRes.rows.forEach(s => {
      if (!schedulesByTrainer[s.trainer_id]) schedulesByTrainer[s.trainer_id] = []
      schedulesByTrainer[s.trainer_id].push({
        id: s.id,
        day: s.day,
        time: s.time,
        slots: s.slots,
        bookedSlots: s.booked_slots,
        isActive: s.is_active,
      })
    })

    const trainers = trainersRes.rows.map(t => ({
      id: t.id,
      name: t.name,
      specialization: t.specialization,
      experience: t.experience,
      avatar: t.avatar,
      rating: parseFloat(t.rating),
      certifications: t.certifications,
      bio: t.bio,
      isActive: t.is_active,
      inactiveReason: t.inactive_reason,
      schedules: schedulesByTrainer[t.id] || [],
    }))

    res.json({ success: true, data: trainers })
  } catch (err) {
    console.error('getAllTrainersAdmin error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// POST /api/admin/trainers — create new trainer
const createTrainer = async (req, res) => {
  const { name, specialization, experience, avatar, rating, certifications, bio } = req.body
  if (!name || !specialization) {
    return res.status(400).json({ success: false, message: 'Nama dan spesialisasi wajib diisi' })
  }
  try {
    const id = await generateTrainerId()
    const autoAvatar = avatar || name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

    const result = await pool.query(
      `INSERT INTO trainers (id, name, specialization, experience, avatar, rating, certifications, bio, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE) RETURNING *`,
      [id, name, specialization, experience || '1 tahun', autoAvatar, rating || 4.5, certifications || [], bio || '']
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('createTrainer error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PATCH /api/admin/trainers/:id — update trainer info
const updateTrainer = async (req, res) => {
  const { name, specialization, experience, avatar, rating, certifications, bio } = req.body
  try {
    const result = await pool.query(
      `UPDATE trainers SET
        name = COALESCE($1, name),
        specialization = COALESCE($2, specialization),
        experience = COALESCE($3, experience),
        avatar = COALESCE($4, avatar),
        rating = COALESCE($5, rating),
        certifications = COALESCE($6, certifications),
        bio = COALESCE($7, bio)
       WHERE id = $8 RETURNING *`,
      [name, specialization, experience, avatar, rating, certifications, bio, req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Trainer tidak ditemukan' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('updateTrainer error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PATCH /api/admin/trainers/:id/status — activate/deactivate (resign, cuti, dll)
// Trainer non-aktif tidak akan muncul lagi di pilihan pendaftaran member baru,
// namun data member yang SUDAH terdaftar dengan trainer ini tetap aman (riwayat tidak hilang)
// karena kita TIDAK menghapus trainernya, hanya menandai is_active = false.
const setTrainerStatus = async (req, res) => {
  const { isActive, reason } = req.body
  try {
    const result = await pool.query(
      `UPDATE trainers SET is_active = $1, inactive_reason = $2 WHERE id = $3 RETURNING *`,
      [isActive, isActive ? null : (reason || 'Tidak aktif'), req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Trainer tidak ditemukan' })

    // Jika dinonaktifkan, otomatis nonaktifkan juga semua jadwalnya supaya tidak bisa dipilih member baru
    if (!isActive) {
      await pool.query(`UPDATE trainer_schedules SET is_active = FALSE WHERE trainer_id = $1`, [req.params.id])
    }

    res.json({ success: true, data: result.rows[0], message: isActive ? 'Trainer diaktifkan kembali' : 'Trainer dinonaktifkan' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// DELETE /api/admin/trainers/:id — hard delete (hanya jika tidak ada member yang terhubung)
const deleteTrainer = async (req, res) => {
  try {
    const memberCheck = await pool.query('SELECT COUNT(*) FROM members WHERE trainer_id = $1', [req.params.id])
    const memberCount = parseInt(memberCheck.rows[0].count)

    if (memberCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Trainer tidak dapat dihapus karena masih terhubung dengan ${memberCount} member. Nonaktifkan trainer ini sebagai gantinya.`
      })
    }

    const result = await pool.query('DELETE FROM trainers WHERE id = $1 RETURNING id', [req.params.id])
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Trainer tidak ditemukan' })
    res.json({ success: true, message: 'Trainer berhasil dihapus' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// POST /api/admin/trainers/:id/schedules — add new schedule slot
// Validasi: cek bentrok jadwal (hari sama + jam beririsan) untuk trainer yang sama
const addSchedule = async (req, res) => {
  const { day, time, slots } = req.body
  if (!day || !time) {
    return res.status(400).json({ success: false, message: 'Hari dan jam wajib diisi' })
  }
  try {
    // Cek bentrok: hari & jam yang identik untuk trainer yang sama
    const conflictCheck = await pool.query(
      `SELECT id FROM trainer_schedules WHERE trainer_id = $1 AND day = $2 AND time = $3 AND is_active = TRUE`,
      [req.params.id, day, time]
    )
    if (conflictCheck.rows[0]) {
      return res.status(409).json({
        success: false,
        message: `Jadwal bentrok: trainer ini sudah memiliki sesi pada ${day} jam ${time}.`
      })
    }

    const id = await generateScheduleId()
    const result = await pool.query(
      `INSERT INTO trainer_schedules (id, trainer_id, day, time, slots, booked_slots, is_active)
       VALUES ($1, $2, $3, $4, $5, 0, TRUE) RETURNING *`,
      [id, req.params.id, day, time, slots || 4]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('addSchedule error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PATCH /api/admin/schedules/:scheduleId — update a schedule
const updateSchedule = async (req, res) => {
  const { day, time, slots, isActive } = req.body
  try {
    // If updating day/time, check for conflicts excluding itself
    if (day && time) {
      const current = await pool.query('SELECT trainer_id FROM trainer_schedules WHERE id = $1', [req.params.scheduleId])
      if (current.rows[0]) {
        const conflictCheck = await pool.query(
          `SELECT id FROM trainer_schedules WHERE trainer_id = $1 AND day = $2 AND time = $3 AND is_active = TRUE AND id != $4`,
          [current.rows[0].trainer_id, day, time, req.params.scheduleId]
        )
        if (conflictCheck.rows[0]) {
          return res.status(409).json({
            success: false,
            message: `Jadwal bentrok: trainer ini sudah memiliki sesi pada ${day} jam ${time}.`
          })
        }
      }
    }

    const result = await pool.query(
      `UPDATE trainer_schedules SET
        day = COALESCE($1, day),
        time = COALESCE($2, time),
        slots = COALESCE($3, slots),
        is_active = COALESCE($4, is_active)
       WHERE id = $5 RETURNING *`,
      [day, time, slots, isActive, req.params.scheduleId]
    )
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('updateSchedule error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// DELETE /api/admin/schedules/:scheduleId
const deleteSchedule = async (req, res) => {
  try {
    const bookedCheck = await pool.query('SELECT booked_slots FROM trainer_schedules WHERE id = $1', [req.params.scheduleId])
    if (bookedCheck.rows[0] && bookedCheck.rows[0].booked_slots > 0) {
      return res.status(400).json({
        success: false,
        message: 'Jadwal ini masih memiliki member yang terdaftar. Nonaktifkan saja agar tidak dipilih member baru.'
      })
    }

    const result = await pool.query('DELETE FROM trainer_schedules WHERE id = $1 RETURNING id', [req.params.scheduleId])
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' })
    res.json({ success: true, message: 'Jadwal berhasil dihapus' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  getAllTrainersAdmin,
  createTrainer,
  updateTrainer,
  setTrainerStatus,
  deleteTrainer,
  addSchedule,
  updateSchedule,
  deleteSchedule,
}
