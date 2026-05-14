const router = require('express').Router();
const Campaign = require('../models/Campaign');
const { auth } = require('../middleware/auth');

const getCenter = (req) => req.query.centerId || req.body.centerId || req.user.centerId?.toString();

router.get('/', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    if (!centerId) return res.json([]);
    const campaigns = await Campaign.find({ centerId }).populate('applicableServices', 'name price');
    res.json(campaigns);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/active', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    if (!centerId) return res.json([]);
    const now = new Date();
    const campaigns = await Campaign.find({
      centerId, isActive: true,
      startDate: { $lte: now }, endDate: { $gte: now }
    }).populate('applicableServices', 'name price');
    res.json(campaigns);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Export CSV
router.get('/export/csv', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    const campaigns = await Campaign.find({ centerId }).populate('applicableServices', 'name');
    const csv = ['Name,Discount Type,Discount Value,Start Date,End Date,Status,Services',
      ...campaigns.map(c => `"${c.name}","${c.discountType}",${c.discountValue},"${c.startDate?.toISOString().split('T')[0]}","${c.endDate?.toISOString().split('T')[0]}","${c.isActive ? 'Active' : 'Inactive'}","${c.applicableServices?.map(s => s.name).join('; ') || 'All'}"`)
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=campaigns.csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });
    const centerId = getCenter(req);
    if (!centerId) return res.status(400).json({ message: 'centerId is required' });
    res.status(201).json(await new Campaign({ ...req.body, centerId }).save());
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });
    res.json(await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
