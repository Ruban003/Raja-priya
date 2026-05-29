const router = require('express').Router();
const Campaign = require('../models/Campaign');
const { auth, getAuthorizedCenterId, ensureRecordCenterAccess, handleAuthzError } = require('../middleware/auth');

const csvEscape = (value = '') => `"${String(value).replace(/"/g, '""')}"`;

router.get('/', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req, { required: false });
    if (!centerId) return res.json([]);
    const campaigns = await Campaign.find({ centerId }).populate('applicableServices', 'name price');
    res.json(campaigns);
  } catch (err) { handleAuthzError(res, err); }
});

router.get('/active', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req, { required: false });
    if (!centerId) return res.json([]);
    const now = new Date();
    const campaigns = await Campaign.find({
      centerId,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).populate('applicableServices', 'name price');
    res.json(campaigns);
  } catch (err) { handleAuthzError(res, err); }
});

router.get('/export/csv', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req, { required: false });
    if (!centerId) return res.status(400).json({ message: 'centerId is required' });

    const campaigns = await Campaign.find({ centerId }).populate('applicableServices', 'name');
    const csv = ['Name,Discount Type,Discount Value,Start Date,End Date,Status,Services',
      ...campaigns.map(c => [
        csvEscape(c.name),
        csvEscape(c.discountType),
        c.discountValue,
        csvEscape(c.startDate?.toISOString().split('T')[0] || ''),
        csvEscape(c.endDate?.toISOString().split('T')[0] || ''),
        csvEscape(c.isActive ? 'Active' : 'Inactive'),
        csvEscape(c.applicableServices?.map(s => s.name).join('; ') || 'All')
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=campaigns.csv');
    res.send(csv);
  } catch (err) { handleAuthzError(res, err); }
});

router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });
    const centerId = getAuthorizedCenterId(req);
    res.status(201).json(await new Campaign({ ...req.body, centerId }).save());
  } catch (err) { handleAuthzError(res, err); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });

    const existing = await Campaign.findById(req.params.id);
    ensureRecordCenterAccess(req, existing);

    const updates = { ...req.body };
    delete updates.centerId;

    res.json(await Campaign.findByIdAndUpdate(req.params.id, updates, { new: true }));
  } catch (err) { handleAuthzError(res, err); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });

    const existing = await Campaign.findById(req.params.id);
    ensureRecordCenterAccess(req, existing);

    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { handleAuthzError(res, err); }
});

module.exports = router;
