const router = require('express').Router();
const Center = require('../models/Center');
const { auth, isRVOwner, isRVLevelUser, canUseCenterId, handleAuthzError } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    if (isRVLevelUser(req.user)) {
      return res.json(await Center.find({ isActive: true }));
    }

    const center = await Center.findOne({ _id: req.user.centerId, isActive: true });
    res.json(center ? [center] : []);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    if (!canUseCenterId(req.user, req.params.id)) return res.status(403).json({ message: 'Access denied for this center' });

    const center = await Center.findOne({ _id: req.params.id, isActive: true });
    if (!center) return res.status(404).json({ message: 'Center not found' });
    res.json(center);
  } catch (err) { handleAuthzError(res, err); }
});

router.post('/', auth, isRVOwner, async (req, res) => {
  try {
    const center = await new Center(req.body).save();
    res.status(201).json(center);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const allowed = ['rv_owner', 'rv_admin', 'center_owner'];
    if (!allowed.includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
    if (!canUseCenterId(req.user, req.params.id)) return res.status(403).json({ message: 'Access denied for this center' });

    const center = await Center.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!center) return res.status(404).json({ message: 'Center not found' });
    res.json(center);
  } catch (err) { handleAuthzError(res, err); }
});

router.delete('/:id', auth, isRVOwner, async (req, res) => {
  try {
    await Center.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
