const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const connectDB = require('./src/config/db.js');
const appointmentRoutes = require('./src/routes/appointmentRoutes.js');
const adminRoutes = require('./src/routes/adminRoutes.js');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Database
// The DB connection is skipped or mocked in our frontend demo if MongoDB is not running, 
// but we initialize it here for backend operational use.
const runServer = async () => {
  if (process.env.NODE_ENV !== 'test') {
    await connectDB();
  }
};
runServer();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static assets from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);

// Fallback direct paths for HTML pages
app.get('/booking', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'booking.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Basic check route
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Masquerade Dental Hospital API is fully healthy!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'An internal server error occurred!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Listen on server port
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open booking portal at: http://localhost:${PORT}`);
  console.log(`Open admin dashboard at: http://localhost:${PORT}/admin.html`);
});
