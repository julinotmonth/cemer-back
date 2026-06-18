require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
// FRONTEND_URL bisa berisi satu atau beberapa origin dipisah koma,
// contoh: "http://localhost:5173,https://nama-app-anda.netlify.app"
// Domain default disertakan sebagai fallback supaya deploy tetap berfungsi
// walaupun env var FRONTEND_URL belum/lupa di-set di Railway.
const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'https://gym-cemerlang.netlify.app',
]

// Normalisasi: hilangkan trailing slash & lowercase, supaya
// "https://app.netlify.app/" tetap cocok dengan "https://app.netlify.app"
function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '').toLowerCase()
}

const envOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

const allowAll = envOrigins.includes('*')
const allowedOrigins = Array.from(
  new Set([...envOrigins.filter(o => o !== '*'), ...DEFAULT_ORIGINS].map(normalizeOrigin))
)

app.use(cors({
  origin(origin, callback) {
    // Request tanpa origin header (curl, server-to-server, mobile app) → izinkan
    if (!origin) return callback(null, true)

    if (allowAll || allowedOrigins.includes(normalizeOrigin(origin))) {
      return callback(null, true)
    }

    console.warn(`🚫 CORS blocked request from origin: ${origin}`)
    console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`)
    return callback(new Error(`Origin ${origin} tidak diizinkan oleh CORS`))
  },
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/members', require('./routes/members'))
app.use('/api', require('./routes/index'))

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// 404
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.path} tidak ditemukan` }))

// Error handler
app.use((err, req, res, next) => {
  if (err && /tidak diizinkan oleh CORS/.test(err.message || '')) {
    return res.status(403).json({ success: false, message: err.message })
  }
  console.error(err.stack)
  res.status(500).json({ success: false, message: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`🚀 Cemer Backend running on http://localhost:${PORT}`)
})

module.exports = app