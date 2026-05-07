const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  centerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'Stylist' },
  phone: String,
  color: { type: String, default: '#3498db' },
  commissionRate: { type: Number, default: 0 }, // percentage
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.Staff || mongoose.model('Staff', staffSchema);
