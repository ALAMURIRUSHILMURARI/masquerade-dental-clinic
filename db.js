const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/masquerade_dental');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    console.log('Ensure MongoDB is installed and running, or configure MONGODB_URI in the .env file.');
    process.exit(1);
  }
};

module.exports = connectDB;
