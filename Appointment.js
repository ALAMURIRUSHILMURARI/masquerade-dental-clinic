const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  referenceNumber: {
    type: String,
    required: true,
    unique: true
  },
  patientName: {
    type: String,
    required: [true, 'Patient name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  date: {
    type: String, // YYYY-MM-DD format
    required: [true, 'Appointment date is required']
  },
  timeSlot: {
    type: String, // e.g., '09:00 - 10:00'
    required: [true, 'Time slot is required']
  },
  treatment: {
    type: String,
    required: [true, 'Treatment type is required']
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent double booking of approved slots
appointmentSchema.index({ date: 1, timeSlot: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
