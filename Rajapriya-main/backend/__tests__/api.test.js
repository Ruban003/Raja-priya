const request = require('supertest');
const express = require('express');
const helmet = require('helmet');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Mock Mongoose models
jest.mock('../models/Center');
jest.mock('../models/Service');
jest.mock('../models/Appointment');
jest.mock('../models/AiSession');

// Mock @anthropic-ai/sdk
const mockAnthropicCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => {
    return {
      messages: {
        create: mockAnthropicCreate
      }
    };
  });
});

const Center = require('../models/Center');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const AiSession = require('../models/AiSession');

// Create test express app
const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Mount routes
app.get('/', (req, res) => res.json({ message: 'RV Salon Management API v2.0' }));
app.use('/api/whatsapp', require('../routes/whatsapp'));
app.use('/api/ai', require('../routes/ai'));

describe('RVSMPS Glam Pro Comprehensive Test Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ==========================================
  // 1. Health & Root Check
  // ==========================================
  describe('GET / - API Health', () => {
    it('should return 200 and API status message', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toContain('RV Salon Management API');
    });
  });

  // ==========================================
  // 2. WhatsApp Webhook Security (Items 10, 11, 12)
  // ==========================================
  describe('WhatsApp Webhook Verification & Security', () => {
    it('should respond 503 when WHATSAPP_VERIFY_TOKEN is not configured', async () => {
      delete process.env.WHATSAPP_VERIFY_TOKEN;
      const res = await request(app)
        .get('/api/whatsapp/webhook')
        .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'any_token', 'hub.challenge': '123' });
      expect(res.statusCode).toEqual(503);
    });

    it('should respond 403 on invalid verification token', async () => {
      process.env.WHATSAPP_VERIFY_TOKEN = 'expected_secret_token_2026';
      const res = await request(app)
        .get('/api/whatsapp/webhook')
        .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong_token', 'hub.challenge': '12345' });
      expect(res.statusCode).toEqual(403);
    });

    it('should respond 200 and challenge on valid configured token', async () => {
      process.env.WHATSAPP_VERIFY_TOKEN = 'expected_secret_token_2026';
      const res = await request(app)
        .get('/api/whatsapp/webhook')
        .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'expected_secret_token_2026', 'hub.challenge': 'CHALLENGE_ACCEPTED' });
      expect(res.statusCode).toEqual(200);
      expect(res.text).toEqual('CHALLENGE_ACCEPTED');
    });

    it('should reject POST webhook with 401 if WHATSAPP_APP_SECRET is set but signature is missing', async () => {
      process.env.WHATSAPP_APP_SECRET = 'meta_test_secret_key';
      const res = await request(app)
        .post('/api/whatsapp/webhook')
        .send({ object: 'whatsapp_business_account' });
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toContain('Missing webhook signature');
    });

    it('should reject POST webhook with 403 if signature does not match payload', async () => {
      process.env.WHATSAPP_APP_SECRET = 'meta_test_secret_key';
      const res = await request(app)
        .post('/api/whatsapp/webhook')
        .set('x-hub-signature-256', 'sha256=invalidhash00000000000000000000000000000000000000000000000000000000')
        .send({ object: 'whatsapp_business_account' });
      expect(res.statusCode).toEqual(403);
    });

    it('should accept POST webhook with 200 when HMAC SHA-256 signature is valid', async () => {
      const secret = 'meta_test_secret_key';
      process.env.WHATSAPP_APP_SECRET = secret;
      const body = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '919876543210',
                text: { body: 'Hello, need an appointment' }
              }]
            }
          }]
        }]
      };
      const rawPayload = JSON.stringify(body);
      const validHash = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

      const res = await request(app)
        .post('/api/whatsapp/webhook')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', `sha256=${validHash}`)
        .send(rawPayload);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('received');
    });
  });

  // ==========================================
  // 3. AI Receptionist Route & Hardening (Items 1-9)
  // ==========================================
  describe('POST /api/ai/receptionist - Security & Validation', () => {
    it('should reject requests with empty message with 400', async () => {
      const res = await request(app)
        .post('/api/ai/receptionist')
        .send({ centerId: new mongoose.Types.ObjectId().toString(), message: '' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('valid message string is required');
    });

    it('should reject requests with missing or invalid centerId with 400', async () => {
      const res = await request(app)
        .post('/api/ai/receptionist')
        .send({ centerId: 'invalid-id-format', message: 'Hello!' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('valid centerId is required');
    });

    it('should return 404 when centerId is not found in database', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      Center.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/ai/receptionist')
        .send({ centerId: validId, message: 'Hello, are you open?' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toContain('Salon center not found');
    });

    it('should return 503 when ANTHROPIC_API_KEY is not configured', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const validCenterId = new mongoose.Types.ObjectId().toString();
      Center.findOne.mockResolvedValue({ _id: validCenterId, name: 'She GLAM Salon', isActive: true });
      AiSession.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/ai/receptionist')
        .send({ centerId: validCenterId, message: 'Hello! What services do you offer?' });

      expect(res.statusCode).toEqual(503);
      expect(res.body.configured).toEqual(false);
      expect(res.body.message).toContain('Claude AI receptionist service is not configured');
    });

    it('should return 429 when session turn count exceeds limit', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
      const validCenterId = new mongoose.Types.ObjectId().toString();
      Center.findOne.mockResolvedValue({ _id: validCenterId, name: 'She GLAM Salon', isActive: true });
      AiSession.findOne.mockResolvedValue({
        sessionId: 'test-session-123',
        centerId: validCenterId,
        turnCount: 26,
        messages: []
      });

      const res = await request(app)
        .post('/api/ai/receptionist')
        .send({ centerId: validCenterId, sessionId: 'test-session-123', message: 'More questions' });

      expect(res.statusCode).toEqual(429);
      expect(res.body.message).toContain('reached its turn limit');
    });

    it('should execute Claude tool loop and save persistent session', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
      const validCenterId = new mongoose.Types.ObjectId().toString();
      Center.findOne.mockResolvedValue({ _id: validCenterId, name: 'She GLAM Salon', isActive: true });

      const mockSession = {
        sessionId: 'test-session-abc',
        centerId: validCenterId,
        turnCount: 1,
        messages: [],
        save: jest.fn().mockResolvedValue(true)
      };
      AiSession.findOne.mockResolvedValue(mockSession);

      // Round 1: Claude decides to call list_services tool
      mockAnthropicCreate
        .mockResolvedValueOnce({
          stop_reason: 'tool_use',
          content: [
            {
              type: 'tool_use',
              id: 'tool_call_1',
              name: 'list_services',
              input: { category: 'Hair' }
            }
          ],
          usage: { input_tokens: 50, output_tokens: 25 }
        })
        // Round 2: Claude answers with final text
        .mockResolvedValueOnce({
          stop_reason: 'end_turn',
          content: [
            {
              type: 'text',
              text: 'We offer Hair Spa (₹1,499) and Keratin Silk (₹3,999) ✨ Would you like to check available slots?'
            }
          ],
          usage: { input_tokens: 60, output_tokens: 30 }
        });

      Service.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { name: 'Hair Spa', category: 'Hair', price: 1499, duration: 60 },
          { name: 'Keratin Silk', category: 'Hair', price: 3999, duration: 120 }
        ])
      });

      const res = await request(app)
        .post('/api/ai/receptionist')
        .send({ centerId: validCenterId, sessionId: 'test-session-abc', message: 'What hair services do you have?' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.reply).toContain('Hair Spa');
      expect(res.body.toolCalls).toHaveLength(1);
      expect(res.body.toolCalls[0].tool).toEqual('list_services');
      expect(mockSession.save).toHaveBeenCalled();
    });
  });
});
