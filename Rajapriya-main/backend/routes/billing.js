const router = require('express').Router();
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const Counter = require('../models/Counter');
const { auth, getAuthorizedCenterId, ensureRecordCenterAccess, handleAuthzError } = require('../middleware/auth');
const logger = require('../utils/logger');

const generateBillNumber = async (centerId) => {
  const counterId = `bill_${centerId.toString()}`;
  const counter = await Counter.findByIdAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  
  const date = new Date();
  const centerSuffix = centerId.toString().slice(-4).toUpperCase();
  return `RV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${centerSuffix}-${String(counter.seq).padStart(4, '0')}`;
};

router.get('/', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req, { required: false });
    if (!centerId) return res.json([]);

    const { date, startDate, endDate, limit = 100 } = req.query;
    const query = { centerId };
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.createdAt = { $gte: start, $lt: end };
    }
    if (startDate && endDate) query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };

    res.json(await Bill.find(query).sort({ createdAt: -1 }).limit(Number(limit) || 100));
  } catch (err) { handleAuthzError(res, err); }
});

router.get('/customer/:customerId', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req, { required: false });
    if (!centerId) return res.json([]);

    const bills = await Bill.find({ customerId: req.params.customerId, centerId }).sort({ createdAt: -1 }).limit(100);
    res.json(bills);
  } catch (err) { handleAuthzError(res, err); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    ensureRecordCenterAccess(req, bill);
    res.json(bill);
  } catch (err) { handleAuthzError(res, err); }
});

router.post('/', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req);
    const billNumber = await generateBillNumber(centerId);

    const items = (req.body.items || []).map(item => {
      const originalPrice = parseFloat(item.originalPrice);
      const discountValue = parseFloat(item.discountValue);
      const discountedPrice = parseFloat(item.discountedPrice);
      
      if (isNaN(originalPrice)) throw new Error('Invalid originalPrice');

      return {
        serviceName: item.serviceName || '',
        staffName: item.staffName || '',
        originalPrice: originalPrice || 0,
        discountType: item.discountType || '',
        discountValue: isNaN(discountValue) ? 0 : discountValue,
        discountedPrice: isNaN(discountedPrice) ? originalPrice : discountedPrice,
        campaignName: item.campaignName || ''
      };
    });

    const subtotal = items.reduce((s, i) => s + (i.discountedPrice || i.originalPrice || 0), 0);
    const totalDiscount = items.reduce((s, i) => s + ((i.originalPrice || 0) - (i.discountedPrice || i.originalPrice || 0)), 0);
    const gstRate = parseFloat(req.body.gstRate) || 0;
    const gstAmount = subtotal * gstRate / 100;
    const grandTotal = subtotal + gstAmount;

    // Prevent mass assignment by picking specific fields
    const billData = {
      centerId,
      billNumber,
      clientName: String(req.body.clientName || ''),
      clientPhone: String(req.body.clientPhone || ''),
      customerId: req.body.customerId || null,
      items,
      subtotal,
      totalDiscount,
      gstRate,
      gstAmount,
      grandTotal,
      paymentMethod: ['cash', 'upi', 'card', 'split'].includes(req.body.paymentMethod) ? req.body.paymentMethod : 'cash',
      cashAmount: parseFloat(req.body.cashAmount) || 0,
      upiAmount: parseFloat(req.body.upiAmount) || 0,
      cardAmount: parseFloat(req.body.cardAmount) || 0,
      paymentStatus: 'paid',
      createdBy: req.user._id
    };

    const bill = await new Bill(billData).save();

    if (bill.customerId) {
      await Customer.findOneAndUpdate({ _id: bill.customerId, centerId }, {
        $inc: { totalVisits: 1, totalSpent: grandTotal },
        $set: { lastVisit: new Date() }
      });
    }

    res.status(201).json(bill);
  } catch (err) {
    logger.error('Bill create failed', { error: err.message, userId: req.user?._id?.toString() });
    res.status(400).json({ message: err.message || 'Error creating bill' });
  }
});

module.exports = router;
