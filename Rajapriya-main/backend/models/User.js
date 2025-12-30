const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Simple string for now
  role: { type: String, enum: ['admin', 'manager'], default: 'manager' }
});

module.exports = mongoose.model('User', userSchema);