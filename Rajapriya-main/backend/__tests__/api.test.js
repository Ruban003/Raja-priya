const request = require('supertest');
const express = require('express');
const helmet = require('helmet');

// Create test express app
const app = express();
app.use(helmet());
app.use(express.json());

// Mount routes for unit testing
app.get('/', (req, res) => res.json({ message: 'RV Salon Management API v2.0' }));
app.use('/api/whatsapp', require('../routes/whatsapp'));
app.use('/api/ai', require('../routes/ai'));

describe('RVSMPS Glam Pro Backend Test Suite', () => {
  it('GET / should return 200 and API status message', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toContain('RV Salon Management API');
  });

  it('GET /api/whatsapp/webhook should respond 403 on invalid verification token', async () => {
    const res = await request(app)
      .get('/api/whatsapp/webhook')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong_token', 'hub.challenge': '12345' });
    expect(res.statusCode).toEqual(403);
  });

  it('GET /api/whatsapp/webhook should respond 200 and challenge on valid token', async () => {
    const res = await request(app)
      .get('/api/whatsapp/webhook')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'rvsmps_glampro_webhook_secret_2026', 'hub.challenge': 'CHALLENGE_ACCEPTED' });
    expect(res.statusCode).toEqual(200);
    expect(res.text).toEqual('CHALLENGE_ACCEPTED');
  });

  it('POST /api/ai/receptionist should reject requests with empty message with 400', async () => {
    const res = await request(app)
      .post('/api/ai/receptionist')
      .send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toContain('valid message string is required');
  });

  it('POST /api/ai/receptionist should respond with simulated reply when API key is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await request(app)
      .post('/api/ai/receptionist')
      .send({ message: 'Hello! What services do you offer?' });
    expect(res.statusCode).toEqual(200);
    expect(res.body.reply).toBeDefined();
    expect(res.body.mode).toEqual('simulated');
  });
});
