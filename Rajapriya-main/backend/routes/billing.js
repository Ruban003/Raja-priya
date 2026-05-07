const router = require('express').Router();
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const { auth } = require('../middleware/auth');

const getCenter = (req) => req.query.centerId || req.body.centerId || req.user.centerId;

// Generate bill number
const generateBillNumber = async (centerId) => {
  const count = await Bill.countDocuments({ centerId });
  const date = new Date();
  return `RV-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}-${String(count+1).padStart(4,'0')}`;
};

router.get('/', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    const { date, startDate, endDate } = req.query;
    const query = { centerId };
    if (date) query.createdAt = { $gte: new Date(date), $lt: new Date(new Date(date).setDate(new Date(date).getDate()+1)) };
    if (startDate && endDate) query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    res.json(await Bill.find(query).sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    res.json(await Bill.findById(req.params.id));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    const billNumber = await generateBillNumber(centerId);
    const bill = await new Bill({ ...req.body, centerId, billNumber, createdBy: req.user._id }).save();

    // Update customer stats if customer exists
    if (bill.customerId) {
      await Customer.findByIdAndUpdate(bill.customerId, {
        $inc: { totalVisits: 1, totalSpent: bill.grandTotal }
      });
    }

    res.status(201).json(bill);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
