require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: ['https://raja-priya.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Connect DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ DB Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/centers', require('./routes/centers'));
app.use('/api/users', require('./routes/users'));
app.use('/api/services', require('./routes/services'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/reports', require('./routes/reports'));

app.get('/', (req, res) => res.json({ message: 'RV Salon Management API v2.0' }));

// ONE-TIME SEED ROUTE — remove after use
app.get('/api/seed', async (req, res) => {
  try {
    const User = require('./models/User');
    const Center = require('./models/Center');

    let center = await Center.findOne({ name: 'Glam' });
    if (!center) {
      center = await new Center({ name: 'Glam', address: 'Chennai', gstNumber: 'GST000000', gstRate: 18 }).save();
    }

    const users = [
      { name: 'RV Owner', username: 'rvowner', password: 'RVOwner@123', role: 'rv_owner' },
      { name: 'Glam Owner', username: 'glamowner', password: 'GlamOwner@123', role: 'center_owner', centerId: center._id },
      { name: 'Glam Manager', username: 'glammanager', password: 'GlamMgr@123', role: 'manager', centerId: center._id }
    ];

    const results = [];
    for (const u of users) {
      const exists = await User.findOne({ username: u.username });
      if (!exists) {
        await new User(u).save();
        results.push(`✅ Created: ${u.username}`);
      } else {
        results.push(`ℹ️ Exists: ${u.username}`);
      }
    }

    res.json({ success: true, center: center.name, users: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
