require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const logger = require('./utils/logger');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || 'https://raja-priya.vercel.app,http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

if (!process.env.MONGO_URI) {
  logger.error('MONGO_URI is not configured');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => logger.error('MongoDB connection failed', { error: err.message }));

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

app.use((err, req, res, next) => {
  logger.error('Unhandled request error', { path: req.path, error: err.message });
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => logger.info('Server started', { port: PORT }));
