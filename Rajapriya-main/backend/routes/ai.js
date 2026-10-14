const router = require('express').Router();
const crypto = require('crypto');
const mongoose = require('mongoose');
const Anthropic = require('@anthropic-ai/sdk');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const Center = require('../models/Center');
const AiSession = require('../models/AiSession');
const logger = require('../utils/logger');

// Regex escaping utility to prevent ReDoS / RegExp Injection vulnerabilities
function escapeRegex(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// Phone masking utility for privacy-safe audit logging
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '***';
  return phone.replace(/(\d{2,3})\d+(\d{4})/, '$1****$2');
}

// Standard salon operating hours (30-min intervals)
const STANDARD_SALON_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '02:00 PM', '02:30 PM', '03:00 PM',
  '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM',
  '06:30 PM', '07:00 PM', '07:30 PM'
];

// Tool definitions for Anthropic Claude Function Calling
const receptionistTools = [
  {
    name: 'list_services',
    description: 'Lists all available salon, spa, and beauty services along with their duration, category, and pricing.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional category filter, e.g. "Hair", "Skin", "Spa", "Bridal"'
        }
      }
    }
  },
  {
    name: 'check_availability',
    description: 'Checks available appointment time slots on a given date for a requested service.',
    input_schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format (e.g. "2026-10-15")'
        },
        serviceName: {
          type: 'string',
          description: 'Name of the service the client is inquiring about'
        }
      },
      required: ['date']
    }
  },
  {
    name: 'create_appointment',
    description: 'Books and reserves a confirmed appointment slot for the client in the salon calendar after validating slot availability.',
    input_schema: {
      type: 'object',
      properties: {
        clientName: { type: 'string', description: 'Full name of the client' },
        clientPhone: { type: 'string', description: 'Contact phone number of the client (10-15 digits)' },
        serviceName: { type: 'string', description: 'Name of the booked service' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        time: { type: 'string', description: 'Time of appointment (e.g. "10:30 AM", "02:00 PM")' },
        notes: { type: 'string', description: 'Special requests, allergies, or styling notes' }
      },
      required: ['clientName', 'clientPhone', 'serviceName', 'date', 'time']
    }
  },
  {
    name: 'cancel_appointment',
    description: 'Cancels an existing appointment. Explicit confirmation from the client is required to prevent accidental cancellation.',
    input_schema: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string', description: 'Optional specific appointment ID' },
        clientPhone: { type: 'string', description: 'Client phone number to verify appointment ownership' },
        confirmCancellation: {
          type: 'boolean',
          description: 'Must be explicitly true after the client has confirmed they want to cancel'
        },
        reason: { type: 'string', description: 'Reason for cancellation' }
      },
      required: ['clientPhone', 'confirmCancellation']
    }
  }
];

// Tool Execution Dispatcher (strictly isolated to resolved centerId)
async function executeTool(name, input, centerId, session) {
  try {
    if (name === 'list_services') {
      const query = { centerId, isActive: true };
      if (input.category && typeof input.category === 'string') {
        const safeCategory = escapeRegex(input.category.trim());
        query.category = new RegExp(safeCategory, 'i');
      }
      const services = await Service.find(query).select('name category price duration description');
      return { count: services.length, services };
    }

    if (name === 'check_availability') {
      // Validate date format YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!input.date || !dateRegex.test(input.date)) {
        return { error: 'Invalid date format. Expected YYYY-MM-DD.' };
      }

      const existing = await Appointment.find({
        centerId,
        date: input.date,
        status: { $in: ['pending', 'confirmed', 'in_progress'] }
      }).select('time duration serviceName');

      const bookedTimes = new Set(existing.map(a => a.time));
      const availableSlots = STANDARD_SALON_SLOTS.filter(t => !bookedTimes.has(t));

      return {
        date: input.date,
        availableSlots,
        totalBookedOnDate: existing.length
      };
    }

    if (name === 'create_appointment') {
      // 1. Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!input.date || !dateRegex.test(input.date)) {
        return { success: false, message: 'Invalid date format. Expected YYYY-MM-DD.' };
      }

      // 2. Validate client phone (10-15 digits)
      const cleanPhone = (input.clientPhone || '').replace(/[\s-]/g, '');
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return { success: false, message: 'Invalid client phone number. Please provide a 10 to 15 digit phone number.' };
      }

      // 3. Validate client name
      if (!input.clientName || input.clientName.trim().length < 2) {
        return { success: false, message: 'Please provide a valid client name.' };
      }

      // 4. Double-Booking Slot Recheck: verify no conflicting appointment exists
      const conflictingAppt = await Appointment.findOne({
        centerId,
        date: input.date,
        time: input.time,
        status: { $in: ['pending', 'confirmed', 'in_progress'] }
      });

      if (conflictingAppt) {
        return {
          success: false,
          conflict: true,
          message: `The slot at ${input.time} on ${input.date} is already booked. Please ask the client to select another available slot.`
        };
      }

      // 5. Look up service by safely escaped regex (exact match first, then substring)
      const safeServiceName = escapeRegex(input.serviceName.trim());
      let service = await Service.findOne({
        centerId,
        name: new RegExp(`^${safeServiceName}$`, 'i'),
        isActive: true
      });

      if (!service) {
        service = await Service.findOne({
          centerId,
          name: new RegExp(safeServiceName, 'i'),
          isActive: true
        });
      }

      const newAppt = new Appointment({
        centerId,
        clientName: input.clientName.trim(),
        clientPhone: cleanPhone,
        serviceId: service ? service._id : null,
        serviceName: service ? service.name : input.serviceName.trim(),
        price: service ? service.price : 0,
        date: input.date,
        time: input.time,
        duration: service ? service.duration : 45,
        type: 'prebooked',
        status: 'confirmed',
        notes: `AI Receptionist booking: ${input.notes || 'Confirmed via Claude AI'}`
      });

      await newAppt.save();

      // Update session with verified client phone
      if (session) {
        session.clientPhone = cleanPhone;
        session.clientName = newAppt.clientName;
      }

      logger.info('Appointment created by Claude receptionist', {
        appointmentId: newAppt._id,
        centerId,
        maskedPhone: maskPhone(cleanPhone),
        date: newAppt.date,
        time: newAppt.time
      });

      return {
        success: true,
        appointmentId: newAppt._id,
        clientName: newAppt.clientName,
        serviceName: newAppt.serviceName,
        date: newAppt.date,
        time: newAppt.time,
        price: newAppt.price,
        status: 'confirmed'
      };
    }

    if (name === 'cancel_appointment') {
      const cleanPhone = (input.clientPhone || '').replace(/[\s-]/g, '');

      // Verify cancellation confirmation flag
      if (input.confirmCancellation !== true) {
        return {
          success: false,
          requiresConfirmation: true,
          message: 'Cancellation requires explicit confirmation from the client. Please ask the client to confirm cancellation.'
        };
      }

      const query = {
        centerId,
        clientPhone: cleanPhone,
        status: { $in: ['pending', 'confirmed'] }
      };

      if (input.appointmentId && mongoose.Types.ObjectId.isValid(input.appointmentId)) {
        query._id = input.appointmentId;
      }

      const appt = await Appointment.findOneAndUpdate(
        query,
        {
          status: 'cancelled',
          notes: `Cancelled via AI Receptionist: ${input.reason || 'Client requested'}`
        },
        { new: true }
      );

      if (!appt) {
        return {
          success: false,
          message: 'No active upcoming appointment was found matching that phone number to cancel.'
        };
      }

      logger.info('Appointment cancelled by Claude receptionist', {
        appointmentId: appt._id,
        centerId,
        maskedPhone: maskPhone(cleanPhone)
      });

      return {
        success: true,
        message: `Appointment for ${appt.clientName} for ${appt.serviceName} on ${appt.date} at ${appt.time} was cancelled successfully.`
      };
    }

    return { error: `Unknown tool: ${name}` };
  } catch (err) {
    logger.error('Tool execution error', { tool: name, error: err.message });
    return { error: 'An error occurred while executing the salon operation tool.' };
  }
}

// POST /api/ai/receptionist
router.post('/receptionist', async (req, res) => {
  try {
    const { centerId, sessionId: reqSessionId, message } = req.body;

    // Validate user message input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: 'A valid message string is required.' });
    }

    // Resolve and verify Center server-side; NEVER trust arbitrary body or use hardcoded fallbacks
    if (!centerId || !mongoose.Types.ObjectId.isValid(centerId)) {
      return res.status(400).json({ message: 'A valid centerId is required.' });
    }

    const center = await Center.findOne({ _id: centerId, isActive: { $ne: false } });
    if (!center) {
      return res.status(404).json({ message: 'Salon center not found or is currently inactive.' });
    }

    // Generate crypto UUID for session ID if not provided
    const sessionId = (reqSessionId && typeof reqSessionId === 'string' && reqSessionId.trim().length > 0)
      ? reqSessionId.trim()
      : crypto.randomUUID();

    // Load or initialize persistent session in MongoDB (with automatic 24-hr TTL)
    let session = await AiSession.findOne({ sessionId, centerId: center._id });
    if (!session) {
      session = new AiSession({
        sessionId,
        centerId: center._id,
        messages: [],
        turnCount: 0
      });
    }

    // Per-session conversation turn cap to prevent infinite loops and runaway spend
    if (session.turnCount >= 25) {
      return res.status(429).json({
        message: 'This chat session has reached its turn limit (max 25 turns). Please start a new session or contact the salon directly.',
        sessionId
      });
    }

    // Check if Claude API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      logger.warn('Anthropic API key is not configured');
      return res.status(503).json({
        message: 'Claude AI receptionist service is not configured on this server. Please set ANTHROPIC_API_KEY in environment variables.',
        configured: false
      });
    }

    // Append incoming user message to session
    session.messages.push({ role: 'user', content: message.trim() });
    session.turnCount += 1;
    session.lastActive = new Date();

    // Prepare message history for Claude (last 10 turns for context efficiency)
    const contextMessages = session.messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    // Initialize Anthropic Client
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

    const systemPrompt = `You are Glam Pro AI, the intelligent, warm, and highly efficient receptionist for "${center.name}".
Your job is to greet clients, answer questions about beauty, skin, and hair services, check real-time availability, and help clients book or reschedule appointments.
Operating Center: ${center.name}
Phone: ${center.phone || 'Available at desk'}
Address: ${center.address || 'In salon'}

Rules:
- Be courteous, warm, and helpful with appropriate salon emojis (✨, 💇‍♀️, 💅).
- Always use the tools provided to look up service prices and check slot availability before confirming an appointment.
- Double booking is strictly prevented: always verify availability using check_availability.
- Never make medical or clinical diagnoses for dermatological issues; recommend a consultation with a master stylist or aesthetician.
- For cancellations, verify the client's phone number and confirm their intent before executing cancel_appointment.
- Keep responses concise, clear, and easy to read on mobile or WhatsApp.`;

    // Multi-turn tool execution loop (max 5 rounds)
    let loopRounds = 0;
    const MAX_TOOL_ROUNDS = 5;
    const toolCallsExecuted = [];
    let currentMessages = [...contextMessages];

    // Initial Claude API call
    let response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      tools: receptionistTools,
      messages: currentMessages
    });

    let totalInputTokens = response.usage?.input_tokens || 0;
    let totalOutputTokens = response.usage?.output_tokens || 0;

    // Loop until Claude stops requesting tool use or max rounds reached
    while (response.stop_reason === 'tool_use' && loopRounds < MAX_TOOL_ROUNDS) {
      loopRounds++;
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      const toolResults = [];

      for (const block of toolUseBlocks) {
        const result = await executeTool(block.name, block.input, center._id, session);
        toolCallsExecuted.push({ tool: block.name, input: block.input, result });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result)
        });
      }

      currentMessages.push({ role: 'assistant', content: response.content });
      currentMessages.push({ role: 'user', content: toolResults });

      // Follow-up Claude call: ALWAYS include tools array
      response = await anthropic.messages.create({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        tools: receptionistTools,
        messages: currentMessages
      });

      totalInputTokens += response.usage?.input_tokens || 0;
      totalOutputTokens += response.usage?.output_tokens || 0;
    }

    // Extract text reply
    const textBlock = response.content.find(b => b.type === 'text');
    const replyText = textBlock ? textBlock.text : 'I processed your request! How else may I assist you today?';

    // Append assistant response to persistent session
    session.messages.push({ role: 'assistant', content: replyText });
    session.totalTokensUsed = (session.totalTokensUsed || 0) + totalInputTokens + totalOutputTokens;
    await session.save();

    // Log token spend metrics for audit
    logger.info('Claude AI receptionist turn completed', {
      sessionId,
      centerId: center._id,
      rounds: loopRounds,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      model
    });

    return res.json({
      reply: replyText,
      sessionId,
      toolCalls: toolCallsExecuted,
      model,
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens
      }
    });
  } catch (err) {
    logger.error('Claude receptionist error', { error: err.message, stack: err.stack });
    return res.status(500).json({
      message: 'AI receptionist temporarily unavailable. Please try again or contact the salon directly.'
    });
  }
});

module.exports = router;
