const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  centerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true },
  name: { type: String, required: true },
  category: { type: String, required: true }, // Hair, Skin, Nail, Spa, etc.
  gender: { type: String, enum: ['male', 'female', 'unisex'], default: 'unisex' },
  price: { type: Number, required: true },
  duration: { type: Number, default: 30 }, // in minutes
  description: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.Service || mongoose.model('Service', serviceSchema);
