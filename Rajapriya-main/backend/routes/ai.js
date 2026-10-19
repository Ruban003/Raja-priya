const router = require('express').Router();
const crypto = require('crypto');
const mongoose = require('mongoose');
const Anthropic = require('@anthropic-ai/sdk');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const Center = require('../models/Center');
const Staff = require('../models/Staff');
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

// Parse standard 12-hour salon time string to minutes from midnight
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return -1;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return -1;
  let [_, hours, mins, modifier] = match;
  hours = parseInt(hours, 10);
  mins = parseInt(mins, 10);
  if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
}

// Get center local date (YYYY-MM-DD) and current minutes in center's timezone (default: Asia/Kolkata)
function getCenterDateTime(timeZone = 'Asia/Kolkata') {
  const now = new Date();
  const todayDate = now.toLocaleDateString('en-CA', { timeZone });
  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const currentMinutes = timeToMinutes(timeStr);
  return { todayDate, currentMinutes };
}

// Standard salon operating hours (30-min intervals) including 01:30 PM
const STANDARD_SALON_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM'
];

// Calculate sequential 30-min slots occupied by a service duration
function getOccupiedSlots(startTime, durationMinutes = 30) {
  const startIdx = STANDARD_SALON_SLOTS.indexOf(startTime);
  if (startIdx === -1) return [];
  const blocks = Math.max(1, Math.ceil(durationMinutes / 30));
  return STANDARD_SALON_SLOTS.slice(startIdx, startIdx + blocks);
}

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
    description: 'Checks available appointment time slots on a given date for a requested service, taking into account service duration, stylist capacity, and current local time.',
    input_schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format (must be today or a future date)'
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
    description: 'Books and reserves a confirmed appointment slot for the client in the salon calendar after validating slot availability and salon chair capacity.',
    input_schema: {
      type: 'object',
      properties: {
        clientName: { type: 'string', description: 'Full name of the client' },
        clientPhone: { type: 'string', description: 'Contact phone number of the client (10-15 digits)' },
        serviceName: { type: 'string', description: 'Name of the booked service' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (must be today or in the future)' },
        time: { type: 'string', description: 'Time of appointment (e.g. "10:30 AM", "01:30 PM", "02:00 PM")' },
        notes: { type: 'string', description: 'Special requests, allergies, or styling notes' }
      },
      required: ['clientName', 'clientPhone', 'serviceName', 'date', 'time']
    }
  },
  {
    name: 'cancel_appointment',
    description: 'Cancels an existing appointment. Strict identity verification requires the exact client name and phone number on the booking, plus explicit confirmation.',
    input_schema: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string', description: 'Optional specific appointment ID' },
        clientPhone: { type: 'string', description: 'Client phone number on the booking' },
        clientName: { type: 'string', description: 'Full name of the client on the booking for identity verification (minimum 2 characters)' },
        confirmCancellation: {
          type: 'boolean',
          description: 'Must be explicitly true after the client has confirmed they want to cancel'
        },
        reason: { type: 'string', description: 'Reason for cancellation' }
      },
      required: ['clientPhone', 'clientName', 'confirmCancellation']
    }
  }
];

// Tool Execution Dispatcher (strictly isolated to resolved center)
async function executeTool(name, input, center, session) {
  try {
    const centerId = center._id;
    const timeZone = center.timeZone || 'Asia/Kolkata';
    const { todayDate, currentMinutes } = getCenterDateTime(timeZone);

    if (name === 'list_services') {
      const query = { centerId, isActive: true };
      if (input.category && typeof input.category === 'string') {
        const safeCategory = escapeRegex(input.category.trim());
        query.category = new RegExp(safeCategory, 'i');
      }
      const services = await Service.find(query).select('name category price duration description');
      return {
        success: true,
        count: services.length,
        services
      };
    }

    if (name === 'check_availability') {
      // 1. Validate date format YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!input.date || !dateRegex.test(input.date)) {
        return { success: false, message: 'Invalid date format. Expected YYYY-MM-DD.' };
      }

      // 2. Reject past dates using center's timezone
      if (input.date < todayDate) {
        return {
          success: false,
          message: `Cannot check availability for past date "${input.date}". Please request today (${todayDate}) or a future date.`
        };
      }

      // 3. Resolve service duration if specified
      let durationMinutes = 30;
      if (input.serviceName && typeof input.serviceName === 'string') {
        const safeServiceName = escapeRegex(input.serviceName.trim());
        const svc = await Service.findOne({
          centerId,
          name: new RegExp(safeServiceName, 'i'),
          isActive: true
        });
        if (svc && svc.duration) {
          durationMinutes = svc.duration;
        }
      }

      const blocksNeeded = Math.max(1, Math.ceil(durationMinutes / 30));

      // 4. Retrieve active staff & salon chair capacity
      const activeStaff = await Staff.find({ centerId, isActive: true });
      const totalChairs = Math.max(1, activeStaff.length || (center.chairCount || 3));

      // 5. Retrieve existing active bookings on that date
      const existing = await Appointment.find({
        centerId,
        date: input.date,
        status: { $in: ['pending', 'confirmed', 'in_progress'] }
      }).select('time duration');

      // Count overlapping bookings per 30-min interval
      const slotBookingCounts = {};
      STANDARD_SALON_SLOTS.forEach(s => { slotBookingCounts[s] = 0; });

      for (const appt of existing) {
        const occupied = getOccupiedSlots(appt.time, appt.duration || 30);
        occupied.forEach(s => {
          if (slotBookingCounts[s] !== undefined) slotBookingCounts[s]++;
        });
      }

      // Filter available slots: must have capacity across all required consecutive blocks, and not be in past
      const availableSlots = [];
      const isToday = input.date === todayDate;

      for (let i = 0; i <= STANDARD_SALON_SLOTS.length - blocksNeeded; i++) {
        const slotTime = STANDARD_SALON_SLOTS[i];

        // Reject times that have already passed if checking today
        if (isToday && timeToMinutes(slotTime) <= currentMinutes) {
          continue;
        }

        const potentialSlots = STANDARD_SALON_SLOTS.slice(i, i + blocksNeeded);
        const hasCapacity = potentialSlots.every(s => (slotBookingCounts[s] || 0) < totalChairs);

        if (hasCapacity) {
          availableSlots.push(slotTime);
        }
      }

      return {
        success: true,
        date: input.date,
        durationMinutes,
        salonChairs: totalChairs,
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

      // 2. Reject past dates using center's timezone
      if (input.date < todayDate) {
        return {
          success: false,
          message: `Cannot book an appointment for past date "${input.date}". Please select today (${todayDate}) or a future date.`
        };
      }

      // 3. Validate time against standard salon slots
      if (!STANDARD_SALON_SLOTS.includes(input.time)) {
        return {
          success: false,
          message: `Invalid appointment time "${input.time}". Please select from standard salon hours: 9:00 AM to 7:30 PM in 30-minute intervals.`
        };
      }

      // 4. Reject past times on today's date
      if (input.date === todayDate && timeToMinutes(input.time) <= currentMinutes) {
        return {
          success: false,
          message: `The time slot ${input.time} has already passed for today. Please select an upcoming slot or another date.`
        };
      }

      // 5. Validate client phone (10-15 digits)
      const cleanPhone = (input.clientPhone || '').replace(/[\s-]/g, '');
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return { success: false, message: 'Invalid client phone number. Please provide a 10 to 15 digit phone number.' };
      }

      // 6. Validate client name (at least 2 characters)
      if (!input.clientName || input.clientName.trim().length < 2) {
        return { success: false, message: 'Please provide a valid client name (minimum 2 characters).' };
      }

      // 7. Look up service by safely escaped regex
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

      const duration = service ? service.duration : 45;
      const startIdx = STANDARD_SALON_SLOTS.indexOf(input.time);
      const blocksNeeded = Math.max(1, Math.ceil(duration / 30));

      if (startIdx + blocksNeeded > STANDARD_SALON_SLOTS.length) {
        return {
          success: false,
          message: `This service requires ${duration} minutes and cannot be accommodated starting at ${input.time} before closing at 8:00 PM.`
        };
      }

      const requestedSlots = STANDARD_SALON_SLOTS.slice(startIdx, startIdx + blocksNeeded);

      // 8. Multi-chair & stylist capacity verification
      const activeStaff = await Staff.find({ centerId, isActive: true });
      const totalChairs = Math.max(1, activeStaff.length || (center.chairCount || 3));

      const existing = await Appointment.find({
        centerId,
        date: input.date,
        status: { $in: ['pending', 'confirmed', 'in_progress'] }
      }).select('time duration staffId');

      // Check slot capacity
      const slotBookingCounts = {};
      STANDARD_SALON_SLOTS.forEach(s => { slotBookingCounts[s] = 0; });
      for (const appt of existing) {
        const occupied = getOccupiedSlots(appt.time, appt.duration || 30);
        occupied.forEach(s => {
          if (slotBookingCounts[s] !== undefined) slotBookingCounts[s]++;
        });
      }

      const hasCapacity = requestedSlots.every(s => (slotBookingCounts[s] || 0) < totalChairs);
      if (!hasCapacity) {
        return {
          success: false,
          conflict: true,
          message: `All styling chairs are occupied around ${input.time} on ${input.date}. Please choose another available time slot.`
        };
      }

      // Assign an available stylist who is free across all requested slots
      let assignedStaff = null;
      if (activeStaff.length > 0) {
        for (const st of activeStaff) {
          const isBusy = existing.some(a => {
            if (!a.staffId || a.staffId.toString() !== st._id.toString()) return false;
            const apptSlots = getOccupiedSlots(a.time, a.duration || 30);
            return apptSlots.some(s => requestedSlots.includes(s));
          });
          if (!isBusy) {
            assignedStaff = st;
            break;
          }
        }
      }

      const newAppt = new Appointment({
        centerId,
        clientName: input.clientName.trim(),
        clientPhone: cleanPhone,
        serviceId: service ? service._id : null,
        serviceName: service ? service.name : input.serviceName.trim(),
        staffId: assignedStaff ? assignedStaff._id : null,
        staffName: assignedStaff ? assignedStaff.name : 'Salon Team',
        price: service ? service.price : 0,
        date: input.date,
        time: input.time,
        duration,
        type: 'prebooked',
        status: 'confirmed',
        notes: `AI Receptionist booking: ${input.notes || 'Confirmed via Claude AI'}`
      });

      // Atomic save with MongoDB duplicate key conflict handling (stylist-specific unique partial index)
      try {
        await newAppt.save();
      } catch (err) {
        if (err.code === 11000) {
          return {
            success: false,
            conflict: true,
            message: `The slot at ${input.time} on ${input.date} was just reserved by another booking. Please choose another available slot.`
          };
        }
        throw err;
      }

      // Note: Do NOT treat self-reported booking phone as an unverified cancellation bypass
      if (session) {
        session.lastBookedPhone = cleanPhone;
        session.lastBookedName = newAppt.clientName;
      }

      logger.info('Appointment created by Claude receptionist', {
        appointmentId: newAppt._id,
        centerId,
        staffName: newAppt.staffName,
        maskedPhone: maskPhone(cleanPhone),
        date: newAppt.date,
        time: newAppt.time
      });

      return {
        success: true,
        appointmentId: newAppt._id,
        clientName: newAppt.clientName,
        serviceName: newAppt.serviceName,
        stylist: newAppt.staffName,
        date: newAppt.date,
        time: newAppt.time,
        durationMinutes: duration,
        price: newAppt.price,
        status: 'confirmed'
      };
    }

    if (name === 'cancel_appointment') {
      const cleanPhone = (input.clientPhone || '').replace(/[\s-]/g, '');

      // 1. Verify cancellation confirmation flag
      if (input.confirmCancellation !== true) {
        return {
          success: false,
          requiresConfirmation: true,
          message: 'Cancellation requires explicit confirmation from the client. Please ask the client to confirm cancellation.'
        };
      }

      // 2. Validate client name minimum length (prevent single-letter wildcard matching)
      const inputName = (input.clientName || '').trim().toLowerCase();
      if (!inputName || inputName.length < 2) {
        return {
          success: false,
          message: 'Client name verification required: Please provide the client full name (minimum 2 characters) used during booking.'
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

      const appt = await Appointment.findOne(query);

      if (!appt) {
        return {
          success: false,
          message: 'No active upcoming appointment was found matching that phone number to cancel.'
        };
      }

      // 3. Strict Name Verification: Always verify exact client name or first-and-last match (NEVER bypass based on self-reported session phone)
      const apptName = (appt.clientName || '').trim().toLowerCase();
      const exactMatch = apptName === inputName;
      const apptParts = apptName.split(/\s+/);
      const inputParts = inputName.split(/\s+/);
      const firstLastMatch = (inputParts.length >= 2 && apptParts.length >= 2) &&
        (inputParts[0] === apptParts[0] && inputParts[inputParts.length - 1] === apptParts[apptParts.length - 1]);

      if (!exactMatch && !firstLastMatch) {
        logger.warn('Cancellation rejected: Client name mismatch', {
          centerId,
          maskedPhone: maskPhone(cleanPhone)
        });
        return {
          success: false,
          message: 'Cancellation identity verification failed: The client name provided does not match the name on the appointment booking.'
        };
      }

      appt.status = 'cancelled';
      appt.notes = `Cancelled via AI Receptionist: ${input.reason || 'Client requested'}`;
      await appt.save();

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

    return { success: false, message: `Tool "${name}" is not recognized.` };
  } catch (err) {
    logger.error('Tool execution error', { tool: name, error: err.message });
    return {
      success: false,
      message: `Unable to complete ${name.replace('_', ' ')} at this moment. Please check your details and try again.`
    };
  }
}

// POST /api/ai/receptionist
router.post('/receptionist', async (req, res) => {
  try {
    const { widgetKey, sessionId: reqSessionId, message } = req.body;

    // 1. Validate user message input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: 'A valid message string is required.' });
    }

    // 2. Strict Widget Key Requirement: public widget callers MUST supply a valid widgetKey (drop raw centerId public fallback)
    const resolvedWidgetKey = widgetKey || req.headers['x-widget-key'];
    if (!resolvedWidgetKey || typeof resolvedWidgetKey !== 'string' || resolvedWidgetKey.trim().length === 0) {
      return res.status(400).json({
        message: 'A valid center widgetKey is required. Direct access via centerId is not permitted for public client widgets.'
      });
    }

    const center = await Center.findOne({ widgetKey: resolvedWidgetKey.trim(), isActive: { $ne: false } });
    if (!center) {
      return res.status(404).json({
        message: 'Salon center not found for the provided widget key or center is inactive.'
      });
    }

    // 3. Enforce Origin / Referer against center.allowedDomains if configured
    if (center.allowedDomains && center.allowedDomains.length > 0) {
      const originHeader = req.headers.origin || req.headers.referer;
      if (originHeader) {
        let requestHost = '';
        try {
          requestHost = new URL(originHeader).origin;
        } catch {
          requestHost = originHeader;
        }
        const isAllowed = center.allowedDomains.some(d => requestHost.includes(d) || d.includes(requestHost));
        if (!isAllowed) {
          logger.warn('AI receptionist call rejected: Origin not authorized', { origin: originHeader, widgetKey: resolvedWidgetKey });
          return res.status(403).json({ message: 'Request origin is not authorized for this salon widget.' });
        }
      }
    }

    // 4. Per-Center Daily Turn Cap to protect salon token budget from runaway spend
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTurns = await AiSession.aggregate([
      { $match: { centerId: center._id, updatedAt: { $gte: todayStart } } },
      { $group: { _id: null, totalTurns: { $sum: '$turnCount' } } }
    ]);

    const totalCenterTurnsToday = todayTurns.length > 0 ? todayTurns[0].totalTurns : 0;
    const centerLimit = center.dailyAiTurnLimit || 500;

    if (totalCenterTurnsToday >= centerLimit) {
      return res.status(429).json({
        message: 'Daily AI receptionist query capacity reached for this salon center. Please contact the front desk directly.'
      });
    }

    // 5. Generate crypto UUID for session ID if not provided
    const sessionId = (reqSessionId && typeof reqSessionId === 'string' && reqSessionId.trim().length > 0)
      ? reqSessionId.trim()
      : crypto.randomUUID();

    // 6. Load or initialize persistent session in MongoDB (with automatic 24-hr TTL)
    let session = await AiSession.findOne({ sessionId, centerId: center._id });
    if (!session) {
      session = new AiSession({
        sessionId,
        centerId: center._id,
        messages: [],
        turnCount: 0
      });
    }

    // Per-session conversation turn cap
    if (session.turnCount >= 25) {
      return res.status(429).json({
        message: 'This chat session has reached its turn limit (max 25 turns). Please start a new session or contact the salon directly.',
        sessionId
      });
    }

    // 7. Check if Claude API key is configured
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

    // 8. Prepare message history for Claude: last 10 messages, strictly guaranteed to start with role 'user'
    let contextMessages = session.messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    // Anthropic Messages API strictly requires messages[0] to have role 'user'
    while (contextMessages.length > 0 && contextMessages[0].role !== 'user') {
      contextMessages.shift();
    }

    // Fallback: Ensure at least the current user turn is present
    if (contextMessages.length === 0) {
      contextMessages.push({ role: 'user', content: message.trim() });
    }

    // 9. Initialize Anthropic Client with current model
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

    const systemPrompt = `You are Glam Pro AI, the intelligent, warm, and highly efficient receptionist for "${center.name}".
Your job is to greet clients, answer questions about beauty, skin, and hair services, check real-time availability, and help clients book or reschedule appointments.
Operating Center: ${center.name}
Phone: ${center.phone || 'Available at desk'}
Address: ${center.address || 'In salon'}
Timezone: ${center.timeZone || 'Asia/Kolkata'}

Rules:
- Be courteous, warm, concise, and helpful. Maintain a professional, premium tone without decorative emojis.
- Always use the tools provided to look up service prices and check slot availability before confirming an appointment.
- Double booking is strictly prevented: always verify availability using check_availability.
- Never make medical or clinical diagnoses for dermatological issues; recommend a consultation with a master stylist or aesthetician.
- For cancellations, strictly verify the client's registered name and phone number before executing cancel_appointment.
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
        const result = await executeTool(block.name, block.input, center, session);
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
