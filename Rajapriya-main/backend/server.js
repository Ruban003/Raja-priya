/* =========================================
   GLAM SALON - BACKEND SERVER (Complete)
   ========================================= */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- SCHEMAS ---
const appointmentSchema = new mongoose.Schema({
  clientName: String,
  clientPhone: String,
  serviceId: String,
  serviceName: String,
  price: Number,
  date: String,
  time: String,
  type: String,     // 'Online' or 'Walk-in'
  status: String,   // 'Pending', 'Confirmed', 'Completed'
  paymentStatus: { type: String, default: 'Unpaid' },
  paymentMethod: String
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// --- ROUTES ---

// 1. Get All Appointments
app.get('/api/appointments', async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ _id: -1 }); // Newest first
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get Single Appointment (by ID)
app.get('/api/appointments/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    res.json(appointment);
  } catch (err) {
    res.status(404).json({ error: "Not found" });
  }
});

// 3. Create New Booking
app.post('/api/bookings', async (req, res) => {
  try {
    const newAppointment = new Appointment(req.body);
    await newAppointment.save();
    res.json(newAppointment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Update Appointment (Payment/Status)
app.put('/api/appointments/:id', async (req, res) => {
  try {
    const updated = await Appointment.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. ADMIN LOGIN (This was missing!)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // --- CREDENTIALS SETTING ---
  const ADMIN_USER = "Glam";
  const ADMIN_PASS = "Glam@123"; 

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.json({ success: true, token: "secure_session_token_" + Date.now() });
  } else {
    res.status(401).json({ success: false, message: "Invalid Credentials" });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));