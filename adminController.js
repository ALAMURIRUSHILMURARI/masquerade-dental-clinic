const jwt = require('jsonwebtoken');
const Appointment = require('../models/Appointment');
const BlockedDate = require('../models/BlockedDate');
const { sendConfirmationEmail, sendRejectionEmail } = require('../utils/emailService');

// Retrieve admin credentials from environment or use defaults
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'dentaladmin123';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_masquerade_dental_token_key_12345';

/**
 * Helper middleware to verify admin token
 */
exports.verifyAdminToken = (req, res, next) => {
  let token = req.cookies.adminToken || req.headers.authorization;
  
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7, token.length);
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No admin token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.admin = verified;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid admin token.' });
  }
};

/**
 * Admin authentication / login
 * POST /api/admin/login
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Sign JWT
    const token = jwt.sign({ username: ADMIN_USER }, JWT_SECRET, { expiresIn: '24h' });

    // Set cookie
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return res.json({
      success: true,
      message: 'Login successful.',
      token
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error during login.', error: error.message });
  }
};

/**
 * Retrieve all statistics for admin dashboard
 * GET /api/admin/stats
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const totalRequests = await Appointment.countDocuments({});
    const approved = await Appointment.countDocuments({ status: 'Approved' });
    const pending = await Appointment.countDocuments({ status: 'Pending' });
    const rejected = await Appointment.countDocuments({ status: 'Rejected' });

    return res.json({
      success: true,
      stats: {
        totalRequests,
        approved,
        pending,
        rejected
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error retrieving statistics.', error: error.message });
  }
};

/**
 * List, search, and filter appointments
 * GET /api/admin/appointments
 */
exports.getAppointments = async (req, res) => {
  try {
    const { search, date, status } = req.query;
    let query = {};

    // Filter by exact status if provided
    if (status) {
      query.status = status;
    }

    // Filter by exact date if provided
    if (date) {
      query.date = date;
    }

    // Search by name or reference number
    if (search) {
      query.$or = [
        { patientName: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const appointments = await Appointment.find(query).sort({ date: 1, timeSlot: 1 });

    return res.json({
      success: true,
      count: appointments.length,
      appointments
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching appointments.', error: error.message });
  }
};

/**
 * Approve appointment request
 * PUT /api/admin/appointments/:id/approve
 */
exports.approveAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    if (appointment.status === 'Approved') {
      return res.status(400).json({ success: false, message: 'Appointment is already approved.' });
    }

    // 1. Verify that no other appointment is APPROVED for the same date and slot
    const doubleBooked = await Appointment.findOne({
      _id: { $ne: id },
      date: appointment.date,
      timeSlot: appointment.timeSlot,
      status: 'Approved'
    });

    if (doubleBooked) {
      return res.status(400).json({ success: false, message: 'Cannot approve: this slot is already approved for another patient.' });
    }

    // 2. Mark this appointment as Approved
    appointment.status = 'Approved';
    await appointment.save();

    // 3. Automatically reject any other pending requests for the same date and slot
    const conflictingPending = await Appointment.find({
      _id: { $ne: id },
      date: appointment.date,
      timeSlot: appointment.timeSlot,
      status: 'Pending'
    });

    for (let pendingApp of conflictingPending) {
      pendingApp.status = 'Rejected';
      await pendingApp.save();
      // Send rejection notification
      await sendRejectionEmail(pendingApp);
    }

    // 4. Send approval email to patient
    await sendConfirmationEmail(appointment);

    return res.json({
      success: true,
      message: 'Appointment approved. Confirmation email sent, and conflicts auto-rejected.',
      data: appointment
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error approving appointment.', error: error.message });
  }
};

/**
 * Reject appointment request
 * PUT /api/admin/appointments/:id/reject
 */
exports.rejectAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    appointment.status = 'Rejected';
    await appointment.save();

    // Send rejection email to patient
    await sendRejectionEmail(appointment);

    return res.json({
      success: true,
      message: 'Appointment rejected. Notification email sent.',
      data: appointment
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error rejecting appointment.', error: error.message });
  }
};

/**
 * Block a new date
 * POST /api/admin/blocked-dates
 */
exports.blockDate = async (req, res) => {
  try {
    const { date, reason } = req.body;

    if (!date || !reason) {
      return res.status(400).json({ success: false, message: 'Please provide a date and a reason.' });
    }

    const alreadyBlocked = await BlockedDate.findOne({ date });
    if (alreadyBlocked) {
      return res.status(400).json({ success: false, message: 'This date is already blocked.' });
    }

    const newBlock = new BlockedDate({ date, reason });
    await newBlock.save();

    // Auto-reject any pending appointments for this date
    const pendingOnBlockedDate = await Appointment.find({ date, status: 'Pending' });
    for (let app of pendingOnBlockedDate) {
      app.status = 'Rejected';
      await app.save();
      await sendRejectionEmail(app);
    }

    return res.status(201).json({
      success: true,
      message: `Date ${date} successfully blocked. Conflicting pending appointments have been auto-rejected.`,
      data: newBlock
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error blocking date.', error: error.message });
  }
};

/**
 * Get all blocked dates
 * GET /api/admin/blocked-dates
 */
exports.getBlockedDates = async (req, res) => {
  try {
    const dates = await BlockedDate.find({}).sort({ date: 1 });
    return res.json({ success: true, count: dates.length, blockedDates: dates });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching blocked dates.', error: error.message });
  }
};

/**
 * Unblock a date
 * DELETE /api/admin/blocked-dates/:date
 */
exports.unblockDate = async (req, res) => {
  try {
    const { date } = req.params;

    const blocked = await BlockedDate.findOneAndDelete({ date });
    if (!blocked) {
      return res.status(404).json({ success: false, message: 'Date was not blocked.' });
    }

    return res.json({
      success: true,
      message: `Date ${date} has been unblocked. Slots are now available again.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error unblocking date.', error: error.message });
  }
};

/**
 * Export all appointments to CSV
 * GET /api/admin/export-csv
 */
exports.exportToCSV = async (req, res) => {
  try {
    const appointments = await Appointment.find({}).sort({ date: 1, timeSlot: 1 });

    // CSV Headers
    let csvContent = 'Reference ID,Patient Name,Phone,Email,Date,Time Slot,Treatment,Status,Notes,Created At\n';

    // Populate lines
    appointments.forEach(app => {
      // Escape quotes for security in CSV representation
      const name = `"${app.patientName.replace(/"/g, '""')}"`;
      const phone = `"${app.phone.replace(/"/g, '""')}"`;
      const email = `"${app.email.replace(/"/g, '""')}"`;
      const notes = `"${(app.notes || '').replace(/"/g, '""')}"`;
      
      csvContent += `${app.referenceNumber},${name},${phone},${email},${app.date},"${app.timeSlot}","${app.treatment}",${app.status},${notes},"${app.createdAt.toISOString()}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="masquerade_appointments_export.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error exporting appointments.', error: error.message });
  }
};
