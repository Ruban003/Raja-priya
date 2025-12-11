/* backend/server.js - FINAL COMPLETE VERSION */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ DB Error:', err));

// 2. SCHEMAS

// Service Schema (Includes Gender)
const serviceSchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number,
  gender: String // 'Male', 'Female', 'Unisex'
});
const Service = mongoose.model('Service', serviceSchema);

// Appointment Schema (Includes Split Payment Fields)
const appointmentSchema = new mongoose.Schema({
  clientName: String,
  clientPhone: String,
  clientGender: String,
  serviceName: String,
  price: Number,
  date: String,
  time: String,
  status: String,
  paymentStatus: { type: String, default: 'Unpaid' },
  
  // BILLING FIELDS
  gst: Number,
  totalAmount: Number,
  paymentMethod: String,        // 'Cash', 'UPI', 'Split'
  cashAmount: { type: Number, default: 0 }, // Track how much Cash paid
  upiAmount: { type: Number, default: 0 }   // Track how much UPI paid
});
const Appointment = mongoose.model('Appointment', appointmentSchema);

// 3. ROUTES

// --- SERVICES MANAGEMENT ---
// Get all services
app.get('/api/services', async (req, res) => {
  const services = await Service.find();
  res.json(services);
});

// Add new service
app.post('/api/services', async (req, res) => {
  try {
    const newService = new Service(req.body);
    await newService.save();
    res.json(newService);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update service (Price/Name/Gender)
app.put('/api/services/:id', async (req, res) => {
  try {
    const updated = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete service
app.delete('/api/services/:id', async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// --- APPOINTMENTS & BILLING ---
// Get all appointments
app.get('/api/appointments', async (req, res) => {
  const apps = await Appointment.find().sort({ _id: -1 });
  res.json(apps);
});

// Get single appointment
app.get('/api/appointments/:id', async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  res.json(appt);
});

// Create new booking
app.post('/api/bookings', async (req, res) => {
  try {
    const newApp = new Appointment(req.body);
    await newApp.save();
    res.json(newApp);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update booking (Used for Edit AND Billing)
app.put('/api/appointments/:id', async (req, res) => {
  try {
    const updated = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete booking
app.delete('/api/appointments/:id', async (req, res) => {
  await Appointment.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// --- CLIENT HISTORY ---
// Find all visits by phone number
app.get('/api/clients/:phone', async (req, res) => {
  try {
    const history = await Appointment.find({ clientPhone: req.params.phone }).sort({ date: -1 });
    res.json(history);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ADMIN LOGIN ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === "Glam" && password === "Glam@123") {
    res.json({ success: true, token: "secure_" + Date.now() });
  } else {
    res.status(401).json({ success: false });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
