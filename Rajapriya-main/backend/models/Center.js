const mongoose = require('mongoose');

const centerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  phone: String,
  email: String,
  gstNumber: String,
  gstRate: { type: Number, default: 18 },
  logo: String,
  isActive: { type: Boolean, default: true },
  staffRoles: { type: [String], default: ["Therapist", "Senior Therapist", "Manager", "Receptionist", "Makeup Artist", "Beautician"] }
}, { timestamps: true });

module.exports = mongoose.models.Center || mongoose.model('Center', centerSchema);
