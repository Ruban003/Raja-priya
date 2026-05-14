const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  centerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female', 'unisex'], default: 'unisex' },
  price: { type: Number, required: true },
  duration: { type: Number, default: 30 },
  gstRate: { type: Number, default: 0 }, // per-service GST %
  description: String,
  isPackage: { type: Boolean, default: false },
  packageItems: [{ // for packages: link individual services
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    serviceName: String,
    originalPrice: Number
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.Service || mongoose.model('Service', serviceSchema);
