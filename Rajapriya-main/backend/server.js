/* backend/server.js - FINAL SAFE VERSION */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. CONNECT TO DATABASE ---
const LOCAL_DB = "mongodb://127.0.0.1:27017/glampro_db";
mongoose.connect(LOCAL_DB)
  .then(() => console.log('✅ Connected to LOCAL MongoDB'))
  .catch(err => console.error('❌ DB Error:', err));

// --- 2. SAFE SCHEMAS (Prevents "Overwrite" Errors) ---
// This checks if the model exists before creating it. Vital for stability.

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

// --- 3. API ROUTES ---

// STAFF
app.get('/api/staff', async (req, res) => {
  try { res.json(await Staff.find({ isActive: true })); } 
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/staff', async (req, res) => {
  try { 
    const newStaff = new Staff(req.body);
    await newStaff.save();
    console.log("✅ Staff Added:", newStaff.name);
    res.json(newStaff); 
  } 
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/staff/:id', async (req, res) => {
  await Staff.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// LOGIN
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || user.password !== password) return res.status(401).json({ success: false });
  res.json({ success: true, role: user.role });
});

// SERVICES
app.get('/api/services', async (req, res) => res.json(await Service.find()));
app.post('/api/services', async (req, res) => { await new Service(req.body).save(); res.json({success:true}); });
app.delete('/api/services/:id', async (req, res) => { await Service.findByIdAndDelete(req.params.id); res.json({success:true}); });

// APPOINTMENTS
app.get('/api/appointments', async (req, res) => res.json(await Appointment.find().sort({_id:-1})));
app.post('/api/bookings', async (req, res) => { await new Appointment(req.body).save(); res.json({success:true}); });
app.put('/api/appointments/:id', async (req, res) => { await Appointment.findByIdAndUpdate(req.params.id, req.body); res.json({success:true}); });
app.get('/api/appointments/:id', async (req, res) => res.json(await Appointment.findById(req.params.id)));

// --- 4. START ---
const PORT = 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));