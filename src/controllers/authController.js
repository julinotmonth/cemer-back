const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db/pool')

const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' })
  }

  try {
    const result = await pool.query(
      'SELECT * FROM admin_users WHERE email = $1',
      [email]
    )

    const user = result.rows[0]
    if (!user) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' })
    }

    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      token,
      user: { email: user.email, name: user.name, role: user.role }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM admin_users WHERE id = $1',
      [req.user.id]
    )
    const user = result.rows[0]
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' })
    res.json({ success: true, user })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi' })
  }

  try {
    const result = await pool.query('SELECT * FROM admin_users WHERE id = $1', [req.user.id])
    const user = result.rows[0]

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash)
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Password lama tidak sesuai' })
    }

    const hash = await bcrypt.hash(newPassword, 10)
    await pool.query(
      'UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hash, req.user.id]
    )

    res.json({ success: true, message: 'Password berhasil diubah' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { login, getProfile, updatePassword }
