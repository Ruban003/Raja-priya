const router = require('express').Router();
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const { auth, getAuthorizedCenterId, ensureRecordCenterAccess, handleAuthzError } = require('../middleware/auth');
const logger = require('../utils/logger');

const generateBillNumber = async (centerId) => {
  const count = await Bill.countDocuments({ centerId });
  const date = new Date();
  const centerSuffix = centerId.toString().slice(-4).toUpperCase();
  return `RV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${centerSuffix}-${String(count + 1).padStart(4, '0')}`;
};

router.get('/', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req, { required: false });
    if (!centerId) return res.json([]);

    const { date, startDate, endDate } = req.query;
    const query = { centerId };
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.createdAt = { $gte: start, $lt: end };
    }
    if (startDate && endDate) query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };

    res.json(await Bill.find(query).sort({ createdAt: -1 }));
  } catch (err) { handleAuthzError(res, err); }
});

router.get('/customer/:customerId', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req, { required: false });
    if (!centerId) return res.json([]);

    const bills = await Bill.find({ customerId: req.params.customerId, centerId }).sort({ createdAt: -1 });
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

    const items = (req.body.items || []).map(item => ({
      serviceName: item.serviceName || '',
      staffName: item.staffName || '',
      originalPrice: Number(item.originalPrice) || 0,
      discountType: item.discountType || '',
      discountValue: Number(item.discountValue) || 0,
      discountedPrice: Number(item.discountedPrice) || Number(item.originalPrice) || 0,
      campaignName: item.campaignName || ''
    }));

    const subtotal = items.reduce((s, i) => s + (i.discountedPrice || i.originalPrice || 0), 0);
    const totalDiscount = items.reduce((s, i) => s + ((i.originalPrice || 0) - (i.discountedPrice || i.originalPrice || 0)), 0);
    const gstRate = Number(req.body.gstRate) || 0;
    const gstAmount = subtotal * gstRate / 100;
    const grandTotal = subtotal + gstAmount;

    const bill = await new Bill({
      centerId,
      billNumber,
      clientName: req.body.clientName,
      clientPhone: req.body.clientPhone || '',
      customerId: req.body.customerId || null,
      items,
      subtotal,
      totalDiscount,
      gstRate,
      gstAmount,
      grandTotal,
      paymentMethod: req.body.paymentMethod || 'cash',
      cashAmount: Number(req.body.cashAmount) || 0,
      upiAmount: Number(req.body.upiAmount) || 0,
      cardAmount: Number(req.body.cardAmount) || 0,
      paymentStatus: 'paid',
      createdBy: req.user._id
    }).save();

    if (bill.customerId) {
      await Customer.findOneAndUpdate({ _id: bill.customerId, centerId }, {
        $inc: { totalVisits: 1, totalSpent: grandTotal },
        $set: { lastVisit: new Date() }
      });
    }

    res.status(201).json(bill);
  } catch (err) {
    logger.error('Bill create failed', { error: err.message, userId: req.user?._id?.toString() });
    handleAuthzError(res, err);
  }
});

module.exports = router;
