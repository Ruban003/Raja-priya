/* backend/server.js - FIXED VERSION */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: ['https://raja-priya.vercel.app', 'http://localhost:5173', 'http://localhost:5001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/glampro_db";
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ DB Error:', err));

const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager'], default: 'manager' }
}));

const Service = mongoose.models.Service || mongoose.model('Service', new mongoose.Schema({
  name: String, category: String, price: Number, gender: String,
  type: { type: String, default: 'single' },
  description: String
}));

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', new mongoose.Schema({
  clientName: String, clientPhone: String, clientGender: String,
  staffName: { type: String, default: 'Unassigned' },
  color: { type: String, default: '#3498db' },
  serviceName: String, price: Number,
  date: String, time: String, status: String,
  paymentStatus: { type: String, default: 'Unpaid' },
  totalAmount: Number, paymentMethod: String, cashAmount: Number, upiAmount: Number
}));

const Staff = mongoose.models.Staff || mongoose.model('Staff', new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, default: 'Stylist' },
  color: { type: String, default: '#3498db' },
  phone: String,
  isActive: { type: Boolean, default: true }
}));

// STAFF
app.get('/api/staff', async (req, res) => {
  try { res.json(await Staff.find({ isActive: true })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/staff/:id', async (req, res) => {
  try { await Staff.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    console.log('🔍 Login attempt:', username, password);
    console.log('🔍 User found:', user);
    if (!user || user.password !== password) return res.status(401).json({ success: false });
    res.json({ success: true, role: user.role });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// SERVICES
app.get('/api/services', async (req, res) => {
  try { res.json(await Service.find()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/services', async (req, res) => {
  try { await new Service(req.body).save(); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/services/:id', async (req, res) => {
  try { await Service.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// APPOINTMENTS
app.get('/api/appointments', async (req, res) => {
  try { res.json(await Appointment.find().sort({ _id: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/bookings', async (req, res) => {
  try { await new Appointment(req.body).save(); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/appointments/:id', async (req, res) => {
  try { await Appointment.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/appointments/:id', async (req, res) => {
  try { res.json(await Appointment.findById(req.params.id)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
