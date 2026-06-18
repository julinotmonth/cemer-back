const pool = require('../db/pool')

const getSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gym_settings WHERE id = 1')
    const settings = result.rows[0] || {}
    res.json({
      success: true,
      data: {
        gymName: settings.gym_name,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const updateSettings = async (req, res) => {
  const { gymName, address, phone, email } = req.body
  try {
    await pool.query(
      `INSERT INTO gym_settings (id, gym_name, address, phone, email, updated_at)
       VALUES (1, $1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET
         gym_name = EXCLUDED.gym_name,
         address = EXCLUDED.address,
         phone = EXCLUDED.phone,
         email = EXCLUDED.email,
         updated_at = NOW()`,
      [gymName || 'Gym Cemerlang', address || null, phone || null, email || null]
    )
    res.json({ success: true, message: 'Pengaturan berhasil disimpan' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getSettings, updateSettings }
