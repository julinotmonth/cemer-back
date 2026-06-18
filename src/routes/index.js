const express = require('express')
const router = express.Router()
const { getDashboardStats, getChartData, getPlanDistribution } = require('../controllers/dashboardController')
const { getTrainers } = require('../controllers/trainerController')
const { getNotifications, markRead, markAllRead } = require('../controllers/notificationController')
const { getSettings, updateSettings } = require('../controllers/settingsController')
const { getReports } = require('../controllers/reportsController')
const {
  getEquipmentReport, getEquipmentList, createEquipment, updateEquipment, deleteEquipment,
  addEquipmentIssue, getEquipmentIssues, deleteEquipmentIssue, logMaintenance
} = require('../controllers/equipmentController')
const {
  getAllTrainersAdmin, createTrainer, updateTrainer, setTrainerStatus, deleteTrainer,
  addSchedule, updateSchedule, deleteSchedule
} = require('../controllers/trainerAdminController')
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

// Equipment maintenance (admin) — Rekap Kerusakan Alat
router.get('/equipment/report', auth, getEquipmentReport)
router.get('/equipment/list', auth, getEquipmentList)
router.post('/equipment', auth, createEquipment)
router.patch('/equipment/:id', auth, updateEquipment)
router.delete('/equipment/:id', auth, deleteEquipment)
router.patch('/equipment/:id/maintenance', auth, logMaintenance)
router.get('/equipment/:id/issues', auth, getEquipmentIssues)
router.post('/equipment/:id/issues', auth, addEquipmentIssue)
router.delete('/equipment/issues/:issueId', auth, deleteEquipmentIssue)

// Trainer management (admin)
router.get('/admin/trainers', auth, getAllTrainersAdmin)
router.post('/admin/trainers', auth, createTrainer)
router.patch('/admin/trainers/:id', auth, updateTrainer)
router.patch('/admin/trainers/:id/status', auth, setTrainerStatus)
router.delete('/admin/trainers/:id', auth, deleteTrainer)
router.post('/admin/trainers/:id/schedules', auth, addSchedule)
router.patch('/admin/schedules/:scheduleId', auth, updateSchedule)
router.delete('/admin/schedules/:scheduleId', auth, deleteSchedule)

module.exports = router
