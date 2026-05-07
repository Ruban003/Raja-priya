const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  centerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true },
  billNumber: { type: String, required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  clientName: { type: String, required: true },
  clientPhone: String,
  items: [{
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    serviceName: String,
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    staffName: String,
    originalPrice: Number,
    discountType: String,      // 'percentage', 'flat', or null
    discountValue: Number,
    discountedPrice: Number,
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
    campaignName: String
  }],
  subtotal: Number,
  totalDiscount: Number,
  gstRate: { type: Number, default: 18 },
  gstAmount: Number,
  grandTotal: Number,
  paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'split'], default: 'cash' },
  cashAmount: { type: Number, default: 0 },
  upiAmount: { type: Number, default: 0 },
  cardAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['paid', 'unpaid', 'partial'], default: 'paid' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.models.Bill || mongoose.model('Bill', billSchema);
