const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, default: 'Stylist' }, // e.g., Senior Stylist, Junior
  color: { type: String, default: '#3498db' }, // Each staff gets a color
  phone: String,
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Staff', staffSchema);