const router = require('express').Router();
const Service = require('../models/Service');
const { auth } = require('../middleware/auth');

const getCenter = (req) => req.query.centerId || req.body.centerId || req.user.centerId?.toString();

router.get('/', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    if (!centerId) return res.json([]);
    res.json(await Service.find({ centerId, isActive: true }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });
    const centerId = getCenter(req);
    if (!centerId) return res.status(400).json({ message: 'centerId is required' });
    const service = await new Service({ ...req.body, centerId }).save();
    res.status(201).json(service);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });
    res.json(await Service.findByIdAndUpdate(req.params.id, req.body, { new: true }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });
    await Service.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Export CSV
router.get('/export/csv', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    const services = await Service.find({ centerId, isActive: true });
    const csv = ['Name,Category,Gender,Price,Duration,GST Rate,Description',
      ...services.map(s => `"${s.name}","${s.category}","${s.gender}",${s.price},${s.duration},${s.gstRate || 0},"${s.description || ''}"`)
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=services.csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Import CSV
router.post('/import/csv', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });
    const centerId = getCenter(req);
    const { rows } = req.body; // array of objects
    const inserted = [];
    for (const row of rows) {
      const svc = await new Service({ ...row, centerId, isActive: true }).save();
      inserted.push(svc);
    }
    res.json({ success: true, count: inserted.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
