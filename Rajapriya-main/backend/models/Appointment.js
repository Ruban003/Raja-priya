const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  centerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  clientName: { type: String, required: true },
  clientPhone: String,
  clientGender: String,
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  staffName: { type: String, default: 'Unassigned' },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
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

module.exports = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
