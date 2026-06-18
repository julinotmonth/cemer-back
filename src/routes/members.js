const express = require('express')
const router = express.Router()
const {
  getMembers, getMemberById, registerMember, updateMember, deleteMember, checkStatus, createMember
} = require('../controllers/memberController')
const auth = require('../middleware/auth')

// Public
router.post('/register', registerMember)
router.get('/check', checkStatus)

// Admin protected
router.get('/', auth, getMembers)
router.post('/', auth, createMember)
router.get('/:id', auth, getMemberById)
router.patch('/:id', auth, updateMember)
router.delete('/:id', auth, deleteMember)

module.exports = router
