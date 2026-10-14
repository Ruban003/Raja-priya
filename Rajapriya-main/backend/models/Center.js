const mongoose = require('mongoose');
const crypto = require('crypto');

const centerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  phone: String,
  email: String,
  gstNumber: String,
  gstRate: { type: Number, default: 18 },
  logo: String,
  isActive: { type: Boolean, default: true },
  staffRoles: {
    type: [String],
    default: ["Therapist", "Senior Therapist", "Manager", "Receptionist", "Makeup Artist", "Beautician"]
  },
  // Per-center public widget key with automatic secure default generation
  widgetKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
    default: () => 'wgk_' + crypto.randomBytes(16).toString('hex')
  },
  // Allowed website domains for the AI receptionist widget (CORS & Referer checks)
  allowedDomains: {
    type: [String],
    default: []
  },
  // Salon operating timezone (default: Asia/Kolkata for Indian Standard Time)
  timeZone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  // Total styling chairs / treatment rooms available for concurrent bookings
  chairCount: {
    type: Number,
    default: 3
  },
  // Daily cap on AI receptionist queries to prevent token budget exhaustion
  dailyAiTurnLimit: {
    type: Number,
    default: 500
  }
}, { timestamps: true });

module.exports = mongoose.models.Center || mongoose.model('Center', centerSchema);
