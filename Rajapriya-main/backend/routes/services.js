const router = require('express').Router();
const Service = require('../models/Service');
const { auth, getAuthorizedCenterId, ensureRecordCenterAccess, handleAuthzError } = require('../middleware/auth');

const csvEscape = (value = '') => `"${String(value).replace(/"/g, '""')}"`;

router.get('/', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req, { required: false });
    if (!centerId) return res.json([]);
    res.json(await Service.find({ centerId, isActive: true }));
  } catch (err) { handleAuthzError(res, err); }
});

router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });
    const centerId = getAuthorizedCenterId(req);
    const service = await new Service({ ...req.body, centerId }).save();
    res.status(201).json(service);
  } catch (err) { handleAuthzError(res, err); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });

    const existing = await Service.findById(req.params.id);
    ensureRecordCenterAccess(req, existing);

    const updates = { ...req.body };
    delete updates.centerId;

    res.json(await Service.findByIdAndUpdate(req.params.id, updates, { new: true }));
  } catch (err) { handleAuthzError(res, err); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });

    const existing = await Service.findById(req.params.id);
    ensureRecordCenterAccess(req, existing);

    await Service.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) { handleAuthzError(res, err); }
});

router.get('/export/csv', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req, { required: false });
    if (!centerId) return res.status(400).json({ message: 'centerId is required' });

    const services = await Service.find({ centerId, isActive: true });
    const csv = ['Name,Category,Gender,Price,Duration,GST Rate,Description',
      ...services.map(s => [
        csvEscape(s.name),
        csvEscape(s.category),
        csvEscape(s.gender),
        s.price,
        s.duration,
        s.gstRate || 0,
        csvEscape(s.description || '')
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=services.csv');
    res.send(csv);
  } catch (err) { handleAuthzError(res, err); }
});

router.post('/import/csv', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });

    const centerId = getAuthorizedCenterId(req);
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const inserted = [];

    for (const row of rows) {
      if (!row.name || row.price === undefined) continue;
      inserted.push(await new Service({ ...row, centerId, isActive: true }).save());
    }

    res.json({ success: true, count: inserted.length });
  } catch (err) { handleAuthzError(res, err); }
});

module.exports = router;
