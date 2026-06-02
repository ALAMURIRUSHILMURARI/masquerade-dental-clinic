const Appointment = require('../models/Appointment');
const BlockedDate = require('../models/BlockedDate');
const generateReferenceNumber = require('../utils/referenceGenerator');

// Define standard operating time slots based on hospital hours
// Mon-Sat: 10am to 8:00pm, Sun: 10am to 4pm
const DEFAULT_WEEKDAY_SLOTS = [
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00',
  '17:00 - 18:00',
  '18:00 - 19:00',
  '19:00 - 20:00'
];

const DEFAULT_SUNDAY_SLOTS = [
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00'
];

/**
 * Get dynamic available slots for a given date
 * GET /api/appointments/slots?date=YYYY-MM-DD
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date parameter is required.' });
    }

    // 1. Check if the date is fully blocked by the admin (holiday, etc.)
    const blocked = await BlockedDate.findOne({ date });
    if (blocked) {
      return res.json({
        success: true,
        date,
        isBlocked: true,
        reason: blocked.reason,
        slots: [] // No slots available on blocked dates
      });
    }

    // Determine day of the week
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
    
    // Choose appropriate slots list
    const baseSlots = dayOfWeek === 0 ? DEFAULT_SUNDAY_SLOTS : DEFAULT_WEEKDAY_SLOTS;

    // 2. Fetch all appointments for this date
    const appointments = await Appointment.find({ date });

    // Map existing appointments for quick lookup
    const approvedSlots = new Set();
    const pendingSlots = new Set();

    appointments.forEach(app => {
      if (app.status === 'Approved') {
        approvedSlots.add(app.timeSlot);
      } else if (app.status === 'Pending') {
        pendingSlots.add(app.timeSlot);
      }
    });

    // 3. Map slot statuses
    // - Approved: Slot is permanently unavailable (Booked)
    // - Pending: Slot remains available to request, but UI can show it as 'Pending'
    // - Available: Standard open slot
    const slotsData = baseSlots.map(slot => {
      let status = 'Available';
      if (approvedSlots.has(slot)) {
        status = 'Booked';
      } else if (pendingSlots.has(slot)) {
        status = 'Pending';
      }

      return {
        timeSlot: slot,
        status // 'Available', 'Pending', 'Booked'
      };
    });

    return res.json({
      success: true,
      date,
      isBlocked: false,
      slots: slotsData
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving slots.', error: error.message });
  }
};

/**
 * Book an appointment (Patient Side)
 * POST /api/appointments
 */
exports.createAppointment = async (req, res) => {
  try {
    const { patientName, phone, email, date, timeSlot, treatment, notes } = req.body;

    // 1. Basic validation
    if (!patientName || !phone || !email || !date || !timeSlot || !treatment) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    // 2. Check if date is blocked
    const blocked = await BlockedDate.findOne({ date });
    if (blocked) {
      return res.status(400).json({ success: false, message: `Cannot book: this date is blocked. Reason: ${blocked.reason}` });
    }

    // 3. Prevent double booking of Approved slots
    const alreadyBooked = await Appointment.findOne({ date, timeSlot, status: 'Approved' });
    if (alreadyBooked) {
      return res.status(400).json({ success: false, message: 'This slot has already been booked and approved. Please select another time.' });
    }

    // 4. Generate unique reference number
    const referenceNumber = generateReferenceNumber(date);

    // 5. Save the appointment with Pending status
    const newAppointment = new Appointment({
      referenceNumber,
      patientName,
      phone,
      email,
      date,
      timeSlot,
      treatment,
      notes,
      status: 'Pending'
    });

    await newAppointment.save();

    return res.status(201).json({
      success: true,
      message: 'Appointment request submitted successfully. It is now pending approval.',
      data: {
        referenceNumber: newAppointment.referenceNumber,
        patientName: newAppointment.patientName,
        date: newAppointment.date,
        timeSlot: newAppointment.timeSlot,
        status: newAppointment.status
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error booking appointment.', error: error.message });
  }
};
