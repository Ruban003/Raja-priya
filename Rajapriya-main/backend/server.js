require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

const app = express();

// Trust reverse proxy (Vercel, Cloudflare, AWS ALB) for accurate client IP rate limiting
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Global API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', apiLimiter);

// Strict rate limiter for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 login attempts per 15 mins
  message: { message: 'Too many login attempts, please try again in 15 minutes.' }
});

// Dedicated strict rate limiter for AI Receptionist to prevent token/spend abuse
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 AI receptionist queries per 15 mins per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'AI receptionist query limit reached. Please try again in 15 minutes.' }
});

const allowedOrigins = (process.env.CORS_ORIGINS || 'https://rvsmps.store,https://www.rvsmps.store,https://sheglam.rvsmps.store,https://raja-priya.vercel.app,http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Capture raw body for webhook HMAC signature verification (e.g. Meta WhatsApp)
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

if (!process.env.MONGO_URI) {
  logger.error('MONGO_URI is not configured');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => logger.error('MongoDB connection failed', { error: err.message }));

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/ai', aiLimiter, require('./routes/ai'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
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
