const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  centerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dob: Date,
  loyaltyPoints: { type: Number, default: 0 },
  totalVisits: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  notes: String
}, { timestamps: true });

module.exports = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
