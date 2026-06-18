const express = require('express')
const router = express.Router()
const { getDashboardStats, getChartData, getPlanDistribution } = require('../controllers/dashboardController')
const { getTrainers } = require('../controllers/trainerController')
const { getNotifications, markRead, markAllRead } = require('../controllers/notificationController')
const { getSettings, updateSettings } = require('../controllers/settingsController')
const { getReports } = require('../controllers/reportsController')
const auth = require('../middleware/auth')

// Dashboard (admin)
router.get('/dashboard/stats', auth, getDashboardStats)
router.get('/dashboard/chart', auth, getChartData)
router.get('/dashboard/plan-distribution', auth, getPlanDistribution)

// Trainers (public — needed for registration)
router.get('/trainers', getTrainers)

// Notifications (admin)
router.get('/notifications', auth, getNotifications)
router.patch('/notifications/:id/read', auth, markRead)
router.patch('/notifications/mark-all-read', auth, markAllRead)

// Settings (admin)
router.get('/settings', auth, getSettings)
router.put('/settings', auth, updateSettings)

// Reports (admin)
router.get('/reports', auth, getReports)

module.exports = router
