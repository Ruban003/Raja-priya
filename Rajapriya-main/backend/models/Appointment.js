const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  clientName: String, 
  clientPhone: String, 
  
  // NEW FIELDS FOR CALENDAR
  staffName: { type: String, default: 'Unassigned' }, // Who is doing it?
  duration: { type: Number, default: 60 }, // How long? (in minutes)
  color: { type: String, default: '#e67e22' }, // Block color
  
  serviceName: String, 
  price: Number,
  date: String, 
  time: String,
  status: String,
  paymentStatus: { type: String, default: 'Unpaid' },
  
  // Billing
  totalAmount: Number,
  paymentMethod: String,
  cashAmount: { type: Number, default: 0 },
  upiAmount: { type: Number, default: 0 }
});

module.exports = mongoose.model('Appointment', appointmentSchema);