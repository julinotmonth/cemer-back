const pool = require('../db/pool')

const getNotifications = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications ORDER BY date DESC, created_at DESC')
    res.json({
      success: true,
      data: result.rows.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        date: n.date,
        read: n.read,
      }))
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const markRead = async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET read = TRUE WHERE id = $1 RETURNING *',
      [req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Notifikasi tidak ditemukan' })
    res.json({ success: true, message: 'Notifikasi ditandai sudah dibaca' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const markAllRead = async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = TRUE WHERE read = FALSE')
    res.json({ success: true, message: 'Semua notifikasi sudah dibaca' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getNotifications, markRead, markAllRead }
