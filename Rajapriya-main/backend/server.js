require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. CONNECT DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ DB Error:', err));

// 2. SCHEMAS
const serviceSchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number
});
const Service = mongoose.model('Service', serviceSchema);

const appointmentSchema = new mongoose.Schema({
  clientName: String,
  clientPhone: String,
  serviceName: String,
  price: Number,
  date: String,
  time: String,
  status: String,
  paymentStatus: { type: String, default: 'Unpaid' },
  gst: Number,
  totalAmount: Number,
  paymentMethod: String
});
const Appointment = mongoose.model('Appointment', appointmentSchema);

// 3. ROUTES

// --- SERVICES (The Missing Part) ---
app.get('/api/services', async (req, res) => {
  const services = await Service.find();
  res.json(services);
});
app.post('/api/services', async (req, res) => {
  try {
    const newService = new Service(req.body);
    await newService.save();
    res.json(newService);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/services/:id', async (req, res) => {
  await Service.findByIdAndUpdate(req.params.id, req.body);
  res.json({ success: true });
});
app.delete('/api/services/:id', async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// --- APPOINTMENTS ---
app.get('/api/appointments', async (req, res) => {
  const apps = await Appointment.find().sort({ _id: -1 });
  res.json(apps);
});
app.post('/api/bookings', async (req, res) => {
  try {
    const newApp = new Appointment(req.body);
    await newApp.save();
    res.json(newApp);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/appointments/:id', async (req, res) => {
  const updated = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});
app.delete('/api/appointments/:id', async (req, res) => {
  await Appointment.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});
app.get('/api/appointments/:id', async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  res.json(appt);
});

// --- LOGIN ---
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
