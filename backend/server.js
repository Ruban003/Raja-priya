// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // Essential for parsing JSON bodies

// Connect to MongoDB Atlas (Get string from MongoDB Website)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// --- DEFINE SCHEMAS (Based on your js/db.js structures) ---

const AppointmentSchema = new mongoose.Schema({
  clientName: String,
  clientPhone: String,
  serviceId: String,
  serviceName: String,
  price: Number,
  date: String,
  time: String,
  status: { type: String, default: 'Pending' },
  paymentStatus: { type: String, default: 'Unpaid' }
});

const Appointment = mongoose.model('Appointment', AppointmentSchema);

// --- API ROUTES ---

// 1. Get All Appointments
app.get('/api/appointments', async (req, res) => {
  const appointments = await Appointment.find();
  res.json(appointments);
});

// 2. Create Booking
app.post('/api/bookings', async (req, res) => {
  const newBooking = new Appointment(req.body);
  await newBooking.save();
  res.json(newBooking);
});

// 3. Update Payment/Status
app.put('/api/appointments/:id', async (req, res) => {
  const updated = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
