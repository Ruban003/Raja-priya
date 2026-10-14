const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const Center = require('../models/Center');
const logger = require('../utils/logger');

// In-memory conversation session cache (stores last 10 turns per sessionId)
const sessionCache = new Map();

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
    description: 'Books and reserves a confirmed appointment slot for the client in the salon calendar.',
    input_schema: {
      type: 'object',
      properties: {
        clientName: { type: 'string', description: 'Full name of the client' },
        clientPhone: { type: 'string', description: 'Contact phone number of the client' },
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
    description: 'Cancels an existing appointment by appointment ID or client phone number.',
    input_schema: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string', description: 'Optional specific appointment ID' },
        clientPhone: { type: 'string', description: 'Client phone number to look up pending bookings' },
        reason: { type: 'string', description: 'Reason for cancellation' }
      }
    }
  }
];

// Tool Execution Dispatcher (Strictly scoped to centerId)
async function executeTool(name, input, centerId) {
  try {
    if (name === 'list_services') {
      const query = { centerId, isActive: true };
      if (input.category) {
        query.category = new RegExp(input.category, 'i');
      }
      const services = await Service.find(query).select('name category price duration description');
      return { services };
    }

    if (name === 'check_availability') {
      const existing = await Appointment.find({
        centerId,
        date: input.date,
        status: { $in: ['pending', 'confirmed', 'in_progress'] }
      }).select('time duration serviceName');

      // Standard salon hours: 9:00 AM to 8:00 PM in 30-min intervals
      const standardSlots = [
        '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
        '12:00 PM', '12:30 PM', '01:00 PM', '02:00 PM', '02:30 PM', '03:00 PM',
        '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM',
        '06:30 PM', '07:00 PM', '07:30 PM'
      ];
      const bookedTimes = new Set(existing.map(a => a.time));
      const availableSlots = standardSlots.filter(t => !bookedTimes.has(t));

      return {
        date: input.date,
        availableSlots,
        totalBookingsOnDate: existing.length
      };
    }

    if (name === 'create_appointment') {
      let service = await Service.findOne({
        centerId,
        name: new RegExp(input.serviceName, 'i'),
        isActive: true
      });

      const newAppt = new Appointment({
        centerId,
        clientName: input.clientName,
        clientPhone: input.clientPhone,
        serviceId: service ? service._id : null,
        serviceName: service ? service.name : input.serviceName,
        price: service ? service.price : 0,
        date: input.date,
        time: input.time,
        duration: service ? service.duration : 45,
        type: 'prebooked',
        status: 'confirmed',
        notes: `AI WhatsApp Receptionist: ${input.notes || 'Booked via Claude Assistant'}`
      });

      await newAppt.save();
      return {
        success: true,
        appointmentId: newAppt._id,
        clientName: newAppt.clientName,
        serviceName: newAppt.serviceName,
        date: newAppt.date,
        time: newAppt.time,
        status: 'confirmed'
      };
    }

    if (name === 'cancel_appointment') {
      const query = { centerId };
      if (input.appointmentId) {
        query._id = input.appointmentId;
      } else if (input.clientPhone) {
        query.clientPhone = input.clientPhone;
        query.status = { $in: ['pending', 'confirmed'] };
      }

      const appt = await Appointment.findOneAndUpdate(
        query,
        { status: 'cancelled', notes: `Cancelled via AI: ${input.reason || 'Client request'}` },
        { new: true }
      );

      if (!appt) {
        return { success: false, message: 'No matching appointment found to cancel.' };
      }
      return { success: true, message: `Appointment for ${appt.clientName} on ${appt.date} at ${appt.time} was cancelled.` };
    }

    return { error: `Unknown tool: ${name}` };
  } catch (err) {
    logger.error('Tool execution error', { tool: name, error: err.message });
    return { error: err.message };
  }
}

// POST /api/ai/receptionist
router.post('/receptionist', async (req, res) => {
  try {
    const { centerId, sessionId = 'default-session', message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'A valid message string is required.' });
    }

    const resolvedCenterId = centerId || '650000000000000000000001';

    // Retrieve conversation history
    let history = sessionCache.get(sessionId) || [];
    history.push({ role: 'user', content: message });
    if (history.length > 10) history = history.slice(-10);

    // Fallback if ANTHROPIC_API_KEY is not configured
    if (!process.env.ANTHROPIC_API_KEY) {
      const simulatedReply = `Hello! ✨ I am your Glam Pro AI receptionist. I can help you check available salon slots, view our beauty & hair care services, or book an appointment. How may I assist you today?`;
      return res.json({
        reply: simulatedReply,
        sessionId,
        mode: 'simulated',
        model: 'claude-3-5-sonnet-latest'
      });
    }

    // Initialize Anthropic Client
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';

    const systemPrompt = `You are Glam Pro AI, an intelligent, charming, and highly efficient salon and spa receptionist.
Your job is to greet clients, answer questions about beauty, skin, and hair services, check real-time availability, and help clients book or reschedule appointments.
Rules:
- Be courteous, warm, and helpful with appropriate salon emojis (✨, 💇‍♀️, 💅).
- Always use the tools provided to look up service prices and check slot availability before confirming an appointment.
- Never make medical or clinical diagnoses for dermatological issues; recommend a consultation with the master stylist or aesthetician.
- Keep responses concise, clear, and easy to read on mobile/WhatsApp.`;

    // 1st Turn: Call Claude with tools
    let response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      tools: receptionistTools,
      messages: history
    });

    const toolCallsExecuted = [];

    // Check if Claude requested tool calls
    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      const toolResults = [];

      for (const block of toolUseBlocks) {
        const result = await executeTool(block.name, block.input, resolvedCenterId);
        toolCallsExecuted.push({ tool: block.name, input: block.input, result });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result)
        });
      }

      // 2nd Turn: Feed tool results back to Claude
      const followUpMessages = [
        ...history,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults }
      ];

      response = await anthropic.messages.create({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: followUpMessages
      });
    }

    // Extract text reply
    const textBlock = response.content.find(b => b.type === 'text');
    const replyText = textBlock ? textBlock.text : 'I processed your request! How else can I help?';

    // Save turn in session cache
    history.push({ role: 'assistant', content: replyText });
    sessionCache.set(sessionId, history);

    res.json({
      reply: replyText,
      sessionId,
      toolCalls: toolCallsExecuted,
      model,
      usage: response.usage
    });
  } catch (err) {
    logger.error('Claude receptionist error', { error: err.message });
    res.status(500).json({ message: 'AI receptionist temporarily unavailable', error: err.message });
  }
});

module.exports = router;
