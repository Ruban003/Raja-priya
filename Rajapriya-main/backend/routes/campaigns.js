const router = require('express').Router();
const Campaign = require('../models/Campaign');
const { auth } = require('../middleware/auth');

const getCenter = (req) => req.query.centerId || req.body.centerId || req.user.centerId;

// Get active campaigns for a center
router.get('/', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    const now = new Date();
    const campaigns = await Campaign.find({ centerId })
      .populate('applicableServices', 'name price');
    res.json(campaigns);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get currently active campaigns (for billing auto-apply)
router.get('/active', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    const now = new Date();
    const campaigns = await Campaign.find({
      centerId,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).populate('applicableServices', 'name price');
    res.json(campaigns);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });
    res.status(201).json(await new Campaign(req.body).save());
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
