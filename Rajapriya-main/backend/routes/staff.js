const router = require('express').Router();
const Staff = require('../models/Staff');
const { auth, getAuthorizedCenterId, ensureRecordCenterAccess, handleAuthzError } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req, { required: false });
    if (!centerId) return res.json([]);
    res.json(await Staff.find({ centerId, isActive: true }));
  } catch (err) { handleAuthzError(res, err); }
});

router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });
    const centerId = getAuthorizedCenterId(req);
    res.status(201).json(await new Staff({ ...req.body, centerId }).save());
  } catch (err) { handleAuthzError(res, err); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });

    const existing = await Staff.findById(req.params.id);
    ensureRecordCenterAccess(req, existing);

    const updates = { ...req.body };
    delete updates.centerId;

    res.json(await Staff.findByIdAndUpdate(req.params.id, updates, { new: true }));
  } catch (err) { handleAuthzError(res, err); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });

    const existing = await Staff.findById(req.params.id);
    ensureRecordCenterAccess(req, existing);

    await Staff.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) { handleAuthzError(res, err); }
});

module.exports = router;
