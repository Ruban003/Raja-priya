const router = require('express').Router();
const logger = require('../utils/logger');

// GET /api/whatsapp/webhook - Webhook Verification for Meta WhatsApp Cloud API
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'rvsmps_glampro_webhook_secret_2026';

  if (mode && token) {
    if (mode === 'subscribe' && token === expectedToken) {
      logger.info('WhatsApp webhook verified successfully');
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }
  res.sendStatus(400);
});

// POST /api/whatsapp/webhook - Inbound WhatsApp Message Handler
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // Acknowledge Meta immediately with 200 OK
    res.status(200).json({ status: 'received' });

    if (body.object && body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
      const messageData = body.entry[0].changes[0].value.messages[0];
      const from = messageData.from; // Customer's phone number
      const messageText = messageData.text ? messageData.text.body : '';

      logger.info('Received WhatsApp message', { from, messageText });

      // In production, invoke the internal Claude AI assistant and send reply via Meta Cloud API:
      // await axios.post(`https://graph.facebook.com/v19.0/${phone_number_id}/messages`, ...)
    }
  } catch (err) {
    logger.error('WhatsApp webhook processing error', { error: err.message });
  }
});

module.exports = router;
