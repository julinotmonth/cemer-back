const express = require('express')
const router = express.Router()
const { login, getProfile, updatePassword } = require('../controllers/authController')
const auth = require('../middleware/auth')

router.post('/login', login)
router.get('/profile', auth, getProfile)
router.put('/password', auth, updatePassword)

module.exports = router
