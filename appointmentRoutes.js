const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

// Route to get available slots for a date
router.get('/slots', appointmentController.getAvailableSlots);

// Route to submit appointment booking request
router.post('/', appointmentController.createAppointment);

module.exports = router;
