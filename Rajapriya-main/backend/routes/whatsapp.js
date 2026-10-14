const router = require('express').Router();
const crypto = require('crypto');
const logger = require('../utils/logger');

// Phone masking utility for privacy-safe logging
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '***';
  return phone.replace(/(\d{2,3})\d+(\d{4})/, '$1****$2');
}

// Middleware: Verify Meta Webhook Signature (X-Hub-Signature-256)
function verifyMetaSignature(req, res, next) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // In production, when WHATSAPP_APP_SECRET is set, strictly enforce HMAC-SHA256
  if (appSecret) {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      logger.warn('Meta WhatsApp webhook rejected: Missing x-hub-signature-256 header');
      return res.status(401).json({ message: 'Missing webhook signature' });
    }

    const [prefix, hash] = signature.split('=');
    if (prefix !== 'sha256' || !hash) {
      logger.warn('Meta WhatsApp webhook rejected: Malformed signature header');
      return res.status(401).json({ message: 'Malformed signature header' });
    }

    const payload = req.rawBody || JSON.stringify(req.body);
    const expectedHash = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');

    try {
      const isMatch = crypto.timingSafeEqual(
        Buffer.from(hash, 'utf8'),
        Buffer.from(expectedHash, 'utf8')
      );
      if (!isMatch) {
        logger.warn('Meta WhatsApp webhook rejected: Invalid signature');
        return res.status(403).json({ message: 'Invalid webhook signature' });
      }
    } catch {
      logger.warn('Meta WhatsApp webhook rejected: Signature comparison error');
      return res.status(403).json({ message: 'Invalid webhook signature length' });
    }
  }

  next();
}

// GET /api/whatsapp/webhook - Webhook Verification for Meta WhatsApp Cloud API
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!expectedToken) {
    logger.warn('WHATSAPP_VERIFY_TOKEN is not configured on this server');
    return res.status(503).json({ message: 'WhatsApp integration is not configured on this server.' });
  }

  if (mode && token) {
    if (mode === 'subscribe' && token === expectedToken) {
      logger.info('WhatsApp webhook verified successfully with Meta Cloud API');
      return res.status(200).send(challenge);
    }
    logger.warn('WhatsApp webhook verification rejected: Token mismatch');
    return res.sendStatus(403);
  }
  return res.sendStatus(400);
});

// POST /api/whatsapp/webhook - Inbound WhatsApp Message Handler (Pilot / Roadmap)
router.post('/webhook', verifyMetaSignature, async (req, res) => {
  try {
    const body = req.body;

    // Immediately acknowledge Meta with 200 OK
    res.status(200).json({ status: 'received' });

    if (body.object && body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
      const messageData = body.entry[0].changes[0].value.messages[0];
      const from = messageData.from; // Customer's phone number

      // Privacy: Mask phone number and avoid logging full raw personal message in production logs
      logger.info('Received WhatsApp message', {
        fromMasked: maskPhone(from),
        messageLength: messageData.text?.body?.length || 0,
        status: 'queued_for_processing'
      });

      // NOTE: WhatsApp Meta Cloud API bidirectional auto-reply is currently in development / pilot roadmap.
      // Once Meta Business Verification is finalized, incoming messages dispatch to the internal
      // /api/ai/receptionist agent loop and reply via:
      // POST https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages
      // Authorization: Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}
    }
  } catch (err) {
    logger.error('WhatsApp webhook processing error', { error: err.message });
  }
});

module.exports = router;
