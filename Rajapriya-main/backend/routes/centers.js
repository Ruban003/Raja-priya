const router = require('express').Router();
const Center = require('../models/Center');
const { auth, isRVLevel, isRVOwner } = require('../middleware/auth');

// Get all centers (RV level sees all, others see their own)
router.get('/', auth, async (req, res) => {
  try {
    if (['rv_owner', 'rv_admin'].includes(req.user.role)) {
      return res.json(await Center.find({ isActive: true }));
    }
    const center = await Center.findById(req.user.centerId);
    res.json(center ? [center] : []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single center
router.get('/:id', auth, async (req, res) => {
  try {
    const center = await Center.findById(req.params.id);
    if (!center) return res.status(404).json({ message: 'Center not found' });
    res.json(center);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create center (RV Owner only)
router.post('/', auth, isRVOwner, async (req, res) => {
  try {
    const center = await new Center(req.body).save();
    res.status(201).json(center);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update center (RV level or center owner)
router.put('/:id', auth, async (req, res) => {
  try {
    const allowed = ['rv_owner', 'rv_admin', 'center_owner'];
    if (!allowed.includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
    const center = await Center.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(center);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete center (RV Owner only)
router.delete('/:id', auth, isRVOwner, async (req, res) => {
  try {
    await Center.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
