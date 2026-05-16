const router = require('express').Router();
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const { auth } = require('../middleware/auth');

const getCenter = (req) => req.query.centerId || req.body.centerId || req.user.centerId?.toString();

const generateBillNumber = async (centerId) => {
  const count = await Bill.countDocuments({ centerId });
  const date = new Date();
  return `RV-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}-${String(count+1).padStart(4,'0')}`;
};

router.get('/', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
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
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try { res.json(await Bill.findById(req.params.id)); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// Get bills by customer
router.get('/customer/:customerId', auth, async (req, res) => {
  try {
    const bills = await Bill.find({ customerId: req.params.customerId }).sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    if (!centerId) return res.status(400).json({ message: 'centerId required' });

    const billNumber = await generateBillNumber(centerId);

    // Build items array properly
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

    // Update customer history
    if (bill.customerId) {
      await Customer.findByIdAndUpdate(bill.customerId, {
        $inc: { totalVisits: 1, totalSpent: grandTotal },
        $set: { lastVisit: new Date() }
      });
    }

    res.status(201).json(bill);
  } catch (err) {
    console.error('Bill error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
