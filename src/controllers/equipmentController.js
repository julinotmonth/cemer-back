const pool = require('../db/pool')

// Determine status based on total issues in last 6 months
function getStatus(totalIssues) {
  if (totalIssues >= 13) return 'kritis'
  if (totalIssues >= 6) return 'perlu-perhatian'
  return 'baik'
}

// GET /api/equipment — list with aggregated 6-month issue stats (for Laporan page)
const getEquipmentReport = async (req, res) => {
  try {
    const equipmentRes = await pool.query('SELECT * FROM equipment ORDER BY created_at ASC')

    const result = []
    for (const eq of equipmentRes.rows) {
      const issuesRes = await pool.query(
        `SELECT TO_CHAR(DATE_TRUNC('month', issue_date), 'Mon') as month,
                DATE_TRUNC('month', issue_date) as month_date,
                COUNT(*) as count,
                STRING_AGG(description, ', ') as description
         FROM equipment_issues
         WHERE equipment_id = $1 AND issue_date >= CURRENT_DATE - INTERVAL '6 months'
         GROUP BY DATE_TRUNC('month', issue_date)
         ORDER BY month_date ASC`,
        [eq.id]
      )

      const totalRes = await pool.query(
        `SELECT COUNT(*) FROM equipment_issues WHERE equipment_id = $1 AND issue_date >= CURRENT_DATE - INTERVAL '6 months'`,
        [eq.id]
      )
      const totalIssues = parseInt(totalRes.rows[0].count)

      result.push({
        id: eq.id,
        name: eq.name,
        category: eq.category,
        icon: eq.icon,
        lastMaintenance: eq.last_maintenance,
        maintenanceTips: eq.maintenance_tips,
        totalIssues,
        status: getStatus(totalIssues),
        issues: issuesRes.rows.map(r => ({
          month: r.month,
          count: parseInt(r.count),
          description: r.description,
        })),
      })
    }

    // Summary counts
    const summary = {
      kritis: result.filter(r => r.status === 'kritis').length,
      perluPerhatian: result.filter(r => r.status === 'perlu-perhatian').length,
      baik: result.filter(r => r.status === 'baik').length,
    }

    res.json({ success: true, data: result, summary })
  } catch (err) {
    console.error('getEquipmentReport error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// GET /api/equipment/list — simple list for admin management (CRUD page)
const getEquipmentList = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipment ORDER BY created_at ASC')
    res.json({
      success: true,
      data: result.rows.map(eq => ({
        id: eq.id,
        name: eq.name,
        category: eq.category,
        icon: eq.icon,
        lastMaintenance: eq.last_maintenance,
        maintenanceTips: eq.maintenance_tips,
      }))
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// POST /api/equipment — create new equipment
const createEquipment = async (req, res) => {
  const { name, category, icon, lastMaintenance, maintenanceTips } = req.body
  if (!name || !category) {
    return res.status(400).json({ success: false, message: 'Nama dan kategori alat wajib diisi' })
  }
  try {
    const result = await pool.query(
      `INSERT INTO equipment (name, category, icon, last_maintenance, maintenance_tips)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, category, icon || '🏋️', lastMaintenance || null, maintenanceTips || []]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('createEquipment error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PATCH /api/equipment/:id — update equipment
const updateEquipment = async (req, res) => {
  const { name, category, icon, lastMaintenance, maintenanceTips } = req.body
  try {
    const result = await pool.query(
      `UPDATE equipment SET
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        icon = COALESCE($3, icon),
        last_maintenance = COALESCE($4, last_maintenance),
        maintenance_tips = COALESCE($5, maintenance_tips),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name, category, icon, lastMaintenance, maintenanceTips, req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Alat tidak ditemukan' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// DELETE /api/equipment/:id
const deleteEquipment = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM equipment WHERE id = $1 RETURNING id', [req.params.id])
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Alat tidak ditemukan' })
    res.json({ success: true, message: 'Alat berhasil dihapus' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// POST /api/equipment/:id/issues — log a new damage/issue report
const addEquipmentIssue = async (req, res) => {
  const { description, issueDate } = req.body
  if (!description) {
    return res.status(400).json({ success: false, message: 'Deskripsi kerusakan wajib diisi' })
  }
  try {
    const eqCheck = await pool.query('SELECT id FROM equipment WHERE id = $1', [req.params.id])
    if (!eqCheck.rows[0]) return res.status(404).json({ success: false, message: 'Alat tidak ditemukan' })

    const result = await pool.query(
      `INSERT INTO equipment_issues (equipment_id, issue_date, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, issueDate || new Date().toISOString().split('T')[0], description]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('addEquipmentIssue error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// GET /api/equipment/:id/issues — list all issue records for one equipment
const getEquipmentIssues = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM equipment_issues WHERE equipment_id = $1 ORDER BY issue_date DESC',
      [req.params.id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// DELETE /api/equipment/issues/:issueId — remove a single issue record
const deleteEquipmentIssue = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM equipment_issues WHERE id = $1 RETURNING id',
      [req.params.issueId]
    )
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Catatan kerusakan tidak ditemukan' })
    res.json({ success: true, message: 'Catatan kerusakan berhasil dihapus' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PATCH /api/equipment/:id/maintenance — log a maintenance event (updates last_maintenance date)
const logMaintenance = async (req, res) => {
  const { date } = req.body
  try {
    const result = await pool.query(
      `UPDATE equipment SET last_maintenance = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [date || new Date().toISOString().split('T')[0], req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Alat tidak ditemukan' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  getEquipmentReport,
  getEquipmentList,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  addEquipmentIssue,
  getEquipmentIssues,
  deleteEquipmentIssue,
  logMaintenance,
}