const pool = require('../db/pool')

// Helper: generate reference number
function generateRefNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const part1 = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `GYM-${part1}-${part2}`
}

// Helper: add months to date
function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

// GET /api/members — admin list with filters
const getMembers = async (req, res) => {
  const { search, status, plan, page = 1, limit = 20 } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)

  let where = []
  let params = []
  let i = 1

  if (search) {
    where.push(`(m.name ILIKE $${i} OR m.email ILIKE $${i} OR m.phone ILIKE $${i} OR m.reference_number ILIKE $${i})`)
    params.push(`%${search}%`)
    i++
  }
  if (status) { where.push(`m.status = $${i++}`); params.push(status) }
  if (plan) { where.push(`m.plan = $${i++}`); params.push(plan) }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM members m ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].count)

    const result = await pool.query(
      `SELECT m.*,
        t.name as trainer_name, t.specialization as trainer_specialization,
        ts.day as schedule_day, ts.time as schedule_time
       FROM members m
       LEFT JOIN trainers t ON m.trainer_id = t.id
       LEFT JOIN trainer_schedules ts ON m.trainer_schedule_id = ts.id
       ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, parseInt(limit), offset]
    )

    res.json({
      success: true,
      data: result.rows.map(formatMember),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    })
  } catch (err) {
    console.error('getMembers error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// GET /api/members/:id
const getMemberById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*,
        t.name as trainer_name, t.specialization as trainer_specialization, t.avatar as trainer_avatar, t.experience as trainer_experience,
        ts.day as schedule_day, ts.time as schedule_time
       FROM members m
       LEFT JOIN trainers t ON m.trainer_id = t.id
       LEFT JOIN trainer_schedules ts ON m.trainer_schedule_id = ts.id
       WHERE m.id = $1`,
      [req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Member tidak ditemukan' })
    res.json({ success: true, data: formatMember(result.rows[0]) })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// POST /api/members/register — public registration
const registerMember = async (req, res) => {
  const {
    name, email, phone, birthDate, gender, address,
    plan, duration, trainerId, trainerSchedule,
    heightCm, weightKg
  } = req.body

  if (!name || !email || !phone || !birthDate || !gender || !address || !plan || !duration) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' })
  }

  try {
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = addMonths(startDate, parseInt(duration))
    let referenceNumber
    let attempts = 0

    // Ensure unique ref number
    while (attempts < 5) {
      referenceNumber = generateRefNumber()
      const check = await pool.query('SELECT id FROM members WHERE reference_number = $1', [referenceNumber])
      if (!check.rows[0]) break
      attempts++
    }

    const result = await pool.query(
      `INSERT INTO members
        (name, email, phone, birth_date, gender, address, plan, duration, status,
         registered_at, start_date, end_date, reference_number,
         trainer_id, trainer_schedule_id, height_cm, weight_kg)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        name, email, phone, birthDate, gender, address, plan, duration,
        startDate, endDate, referenceNumber,
        trainerId || null, trainerSchedule || null,
        heightCm || null, weightKg || null
      ]
    )

    // Increment booked slots if trainer schedule selected
    if (trainerSchedule) {
      await pool.query(
        'UPDATE trainer_schedules SET booked_slots = booked_slots + 1 WHERE id = $1 AND booked_slots < slots',
        [trainerSchedule]
      )
    }

    res.status(201).json({ success: true, data: formatMember(result.rows[0]) })
  } catch (err) {
    console.error('registerMember error:', err)
    res.status(500).json({ success: false, message: 'Server error: ' + err.message })
  }
}

// PATCH /api/members/:id — admin update
const updateMember = async (req, res) => {
  const allowed = ['name', 'email', 'phone', 'birth_date', 'gender', 'address',
    'plan', 'duration', 'status', 'trainer_id', 'trainer_schedule_id', 'height_cm', 'weight_kg',
    'start_date', 'end_date']

  const updates = []
  const params = []
  let i = 1

  // Map camelCase to snake_case
  const fieldMap = {
    birthDate: 'birth_date', trainerId: 'trainer_id', trainerScheduleId: 'trainer_schedule_id',
    heightCm: 'height_cm', weightKg: 'weight_kg', startDate: 'start_date', endDate: 'end_date'
  }

  const body = req.body
  const mapped = {}
  Object.keys(body).forEach(k => {
    const snake = fieldMap[k] || k
    mapped[snake] = body[k]
  })

  for (const key of allowed) {
    if (mapped[key] !== undefined) {
      updates.push(`${key} = $${i++}`)
      params.push(mapped[key] === '' ? null : mapped[key])
    }
  }

  if (!updates.length) return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah' })

  params.push(req.params.id)
  try {
    const result = await pool.query(
      `UPDATE members SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
      params
    )
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Member tidak ditemukan' })
    res.json({ success: true, data: formatMember(result.rows[0]) })
  } catch (err) {
    console.error('updateMember error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// DELETE /api/members/:id
const deleteMember = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM members WHERE id = $1 RETURNING id', [req.params.id])
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Member tidak ditemukan' })
    res.json({ success: true, message: 'Member berhasil dihapus' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// GET /api/members/check — public status check by ref/email/phone
const checkStatus = async (req, res) => {
  const { q } = req.query
  if (!q) return res.status(400).json({ success: false, message: 'Query diperlukan' })

  try {
    const result = await pool.query(
      `SELECT m.*,
        t.name as trainer_name, t.specialization as trainer_specialization, t.avatar as trainer_avatar, t.experience as trainer_experience,
        ts.day as schedule_day, ts.time as schedule_time
       FROM members m
       LEFT JOIN trainers t ON m.trainer_id = t.id
       LEFT JOIN trainer_schedules ts ON m.trainer_schedule_id = ts.id
       WHERE m.reference_number ILIKE $1 OR m.email ILIKE $1 OR m.phone ILIKE $1
       LIMIT 10`,
      [`%${q.trim()}%`]
    )
    res.json({ success: true, data: result.rows.map(formatMember) })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// POST /api/admin/members — admin create member
const createMember = async (req, res) => {
  const {
    name, email, phone, birthDate, gender, address,
    plan, duration, status, trainerId, trainerScheduleId,
    heightCm, weightKg, startDate
  } = req.body

  if (!name || !email || !phone || !birthDate || !gender || !address || !plan || !duration) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' })
  }

  try {
    const sd = startDate || new Date().toISOString().split('T')[0]
    const endDate = addMonths(sd, parseInt(duration))
    let referenceNumber = generateRefNumber()

    const result = await pool.query(
      `INSERT INTO members
        (name, email, phone, birth_date, gender, address, plan, duration, status,
         registered_at, start_date, end_date, reference_number,
         trainer_id, trainer_schedule_id, height_cm, weight_kg)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        name, email, phone, birthDate, gender, address, plan, duration,
        status || 'pending', sd, endDate, referenceNumber,
        trainerId || null, trainerScheduleId || null,
        heightCm || null, weightKg || null
      ]
    )

    res.status(201).json({ success: true, data: formatMember(result.rows[0]) })
  } catch (err) {
    console.error('createMember error:', err)
    res.status(500).json({ success: false, message: 'Server error: ' + err.message })
  }
}

// Helper: format member row to camelCase
function formatMember(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    birthDate: row.birth_date,
    gender: row.gender,
    address: row.address,
    plan: row.plan,
    duration: row.duration,
    status: row.status,
    registeredAt: row.registered_at,
    startDate: row.start_date,
    endDate: row.end_date,
    referenceNumber: row.reference_number,
    trainerId: row.trainer_id,
    trainerScheduleId: row.trainer_schedule_id,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    trainerName: row.trainer_name,
    trainerSpecialization: row.trainer_specialization,
    trainerAvatar: row.trainer_avatar,
    trainerExperience: row.trainer_experience,
    scheduleDay: row.schedule_day,
    scheduleTime: row.schedule_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

module.exports = { getMembers, getMemberById, registerMember, updateMember, deleteMember, checkStatus, createMember }
