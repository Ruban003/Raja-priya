/* backend/server.js */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ DB Error:', err));

const appointmentSchema = new mongoose.Schema({
  clientName: String,
  clientPhone: String,
  serviceName: String, // Can hold "Haircut + Facial"
  price: Number,       // Total Price
  date: String,
  time: String,
  status: String,
  paymentStatus: { type: String, default: 'Unpaid' },
  paymentMethod: String,
  gst: Number,         // New: Tax Amount
  totalAmount: Number  // New: Price + Tax
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// --- ROUTES ---
app.get('/api/appointments', async (req, res) => {
  const apps = await Appointment.find().sort({ _id: -1 });
  res.json(apps);
});

app.get('/api/appointments/:id', async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  res.json(appt);
});

app.post('/api/bookings', async (req, res) => {
  const newApp = new Appointment(req.body);
  await newApp.save();
  res.json(newApp);
});

app.put('/api/appointments/:id', async (req, res) => {
  const updated = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

// ✅ NEW: DELETE ROUTE
app.delete('/api/appointments/:id', async (req, res) => {
  await Appointment.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// ADMIN LOGIN
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === "Glam" && password === "Glam@123") {
    res.json({ success: true, token: "secure_token_" + Date.now() });
  } else {
    res.status(401).json({ success: false });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));