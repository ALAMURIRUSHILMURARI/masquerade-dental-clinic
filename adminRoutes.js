const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Public admin login
router.post('/login', adminController.login);

// Protected routes (apply verifyAdminToken middleware)
router.use(adminController.verifyAdminToken);

// Dashboard statistics
router.get('/stats', adminController.getDashboardStats);

// Get, search and filter appointments
router.get('/appointments', adminController.getAppointments);

// Approve / Reject appointments
router.put('/appointments/:id/approve', adminController.approveAppointment);
router.put('/appointments/:id/reject', adminController.rejectAppointment);

// Block dates management
router.get('/blocked-dates', adminController.getBlockedDates);
router.post('/blocked-dates', adminController.blockDate);
router.delete('/blocked-dates/:date', adminController.unblockDate);

// Export appointments data
router.get('/export-csv', adminController.exportToCSV);

module.exports = router;
