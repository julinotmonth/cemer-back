const pool = require('../db/pool')

const getTrainers = async (req, res) => {
  try {
    // Hanya tampilkan trainer yang aktif (tidak resign/cuti) untuk publik
    const trainersRes = await pool.query('SELECT * FROM trainers WHERE is_active = TRUE ORDER BY name')
    const schedulesRes = await pool.query(
      'SELECT * FROM trainer_schedules WHERE is_active = TRUE ORDER BY trainer_id'
    )

    const schedulesByTrainer = {}
    schedulesRes.rows.forEach(s => {
      if (!schedulesByTrainer[s.trainer_id]) schedulesByTrainer[s.trainer_id] = []
      schedulesByTrainer[s.trainer_id].push({
        id: s.id,
        day: s.day,
        time: s.time,
        slots: s.slots,
        bookedSlots: s.booked_slots,
      })
    })

    const trainers = trainersRes.rows
      .map(t => ({
        id: t.id,
        name: t.name,
        specialization: t.specialization,
        experience: t.experience,
        avatar: t.avatar,
        rating: parseFloat(t.rating),
        certifications: t.certifications,
        bio: t.bio,
        availableSchedules: schedulesByTrainer[t.id] || [],
      }))
      // Sembunyikan trainer yang aktif tapi semua jadwalnya kosong/non-aktif
      .filter(t => t.availableSchedules.length > 0)

    res.json({ success: true, data: trainers })
  } catch (err) {
    console.error('getTrainers error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getTrainers }
