const router = require('express').Router();
const Customer = require('../models/Customer');
const { auth, getAuthorizedCenterId, ensureRecordCenterAccess, handleAuthzError } = require('../middleware/auth');

const csvEscape = (value = '') => `"${String(value).replace(/"/g, '""')}"`;

router.get('/', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req, { required: false });
    if (!centerId) return res.json([]);
    const limit = Number(req.query.limit) || 1000;
    res.json(await Customer.find({ centerId }).sort({ name: 1 }).limit(limit));
  } catch (err) { handleAuthzError(res, err); }
});

router.post('/', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req);
    const { name, phone, email, gender, dob } = req.body;
    const customer = new Customer({ name, phone, email, gender, dob, centerId });
    res.status(201).json(await customer.save());
  } catch (err) { handleAuthzError(res, err); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const existing = await Customer.findById(req.params.id);
    ensureRecordCenterAccess(req, existing);

    const { name, phone, email, gender, dob } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (gender !== undefined) updates.gender = gender;
    if (dob !== undefined) updates.dob = dob;

    res.json(await Customer.findByIdAndUpdate(req.params.id, updates, { new: true }));
  } catch (err) { handleAuthzError(res, err); }
});

router.get('/export/csv', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req, { required: false });
    if (!centerId) return res.status(400).json({ message: 'centerId is required' });

    const customers = await Customer.find({ centerId });
    const csv = ['Name,Phone,Email,Gender,DOB,Total Visits,Total Spent,Loyalty Points',
      ...customers.map(c => [
        csvEscape(c.name),
        csvEscape(c.phone),
        csvEscape(c.email || ''),
        csvEscape(c.gender || ''),
        csvEscape(c.dob ? new Date(c.dob).toLocaleDateString('en-IN') : ''),
        c.totalVisits || 0,
        c.totalSpent || 0,
        c.loyaltyPoints || 0
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send(csv);
  } catch (err) { handleAuthzError(res, err); }
});

router.post('/import/csv', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req);
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const inserted = [];

    for (const row of rows) {
      if (!row.phone || !row.name) continue;
      const exists = await Customer.findOne({ phone: row.phone, centerId });
      if (!exists) inserted.push(await new Customer({ ...row, centerId }).save());
    }

    res.json({ success: true, count: inserted.length });
  } catch (err) { handleAuthzError(res, err); }
});

module.exports = router;
