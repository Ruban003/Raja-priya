const router = require('express').Router();
const Service = require('../models/Service');
const { auth, canManageCenter, canAccessCenter } = require('../middleware/auth');

const getCenter = (req) => req.query.centerId || req.body.centerId || req.user.centerId;

router.get('/', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    res.json(await Service.find({ centerId, isActive: true }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    if (['manager'].includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
    const service = await new Service(req.body).save();
    res.status(201).json(service);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (['manager'].includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
    res.json(await Service.findByIdAndUpdate(req.params.id, req.body, { new: true }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (['manager'].includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
    await Service.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
