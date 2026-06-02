const mongoose = require('mongoose');

const blockedDateSchema = new mongoose.Schema({
  date: {
    type: String, // YYYY-MM-DD format
    required: true,
    unique: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('BlockedDate', blockedDateSchema);
