const mongoose = require('mongoose');

if (!process.env.DB) {
  throw new Error('DB environment variable is not set');
}

const db = mongoose.connect(process.env.DB).catch((error) => {
  console.error('Database connection failed:', error.message);
  return null;
});

module.exports = db;