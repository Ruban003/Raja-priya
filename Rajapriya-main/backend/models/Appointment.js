const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  centerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null, set: v => (v === '' ? null : v) },
  clientName: { type: String, required: true },
  clientPhone: String,
  clientGender: String,
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null, set: v => (v === '' ? null : v) },
  staffName: { type: String, default: 'Unassigned' },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null, set: v => (v === '' ? null : v) },
  services: [{
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', set: v => (v === '' ? null : v) },
    serviceName: String,
    price: Number,
    duration: Number
  }],
  serviceName: String,
  price: Number,
  date: String,
  time: String,
  duration: { type: Number, default: 30 },
  status: { type: String, enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
  type: { type: String, enum: ['walkin', 'prebooked'], default: 'walkin' },
  notes: String,
  color: { type: String, default: '#3498db' }
}, { timestamps: true });

// Unique partial index per stylist: prevents double-booking a stylist at the same slot while allowing parallel bookings across multiple stylists/chairs
appointmentSchema.index(
  { centerId: 1, staffId: 1, date: 1, time: 1 },
  {
    unique: true,
    partialFilterExpression: {
      staffId: { $type: 'objectId' },
      status: { $in: ['pending', 'confirmed', 'in_progress'] }
    }
  }
);

// General compound index for slot availability lookups and calendar queries
appointmentSchema.index({ centerId: 1, date: 1, time: 1 });

module.exports = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
