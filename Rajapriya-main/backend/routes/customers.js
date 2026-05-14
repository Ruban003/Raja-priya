const router = require('express').Router();
const Customer = require('../models/Customer');
const { auth } = require('../middleware/auth');

const getCenter = (req) => req.query.centerId || req.body.centerId || req.user.centerId?.toString();

router.get('/', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    if (!centerId) return res.json([]);
    res.json(await Customer.find({ centerId }).sort({ name: 1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    if (!centerId) return res.status(400).json({ message: 'centerId is required' });
    res.status(201).json(await new Customer({ ...req.body, centerId }).save());
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    res.json(await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Export CSV
router.get('/export/csv', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    const customers = await Customer.find({ centerId });
    const csv = ['Name,Phone,Email,Gender,DOB,Total Visits,Total Spent,Loyalty Points',
      ...customers.map(c => `"${c.name}","${c.phone}","${c.email || ''}","${c.gender || ''}","${c.dob ? new Date(c.dob).toLocaleDateString('en-IN') : ''}",${c.totalVisits || 0},${c.totalSpent || 0},${c.loyaltyPoints || 0}`)
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Import CSV
router.post('/import/csv', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    const { rows } = req.body;
    const inserted = [];
    for (const row of rows) {
      const exists = await Customer.findOne({ phone: row.phone, centerId });
      if (!exists) {
        const c = await new Customer({ ...row, centerId }).save();
        inserted.push(c);
      }
    }
    res.json({ success: true, count: inserted.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
