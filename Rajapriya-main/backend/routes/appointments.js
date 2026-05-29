const router = require('express').Router();
const Appointment = require('../models/Appointment');
const { auth, getAuthorizedCenterId, ensureRecordCenterAccess, handleAuthzError } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req, { required: false });
    if (!centerId) return res.json([]);

    const { date } = req.query;
    const query = { centerId };
    if (date) query.date = date;

    res.json(await Appointment.find(query).sort({ date: -1, time: 1 }));
  } catch (err) { handleAuthzError(res, err); }
});

router.post('/', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req);
    const appointment = await new Appointment({ ...req.body, centerId }).save();
    res.status(201).json(appointment);
  } catch (err) { handleAuthzError(res, err); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const existing = await Appointment.findById(req.params.id);
    ensureRecordCenterAccess(req, existing);

    const updates = { ...req.body };
    delete updates.centerId;

    res.json(await Appointment.findByIdAndUpdate(req.params.id, updates, { new: true }));
  } catch (err) { handleAuthzError(res, err); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });

    const existing = await Appointment.findById(req.params.id);
    ensureRecordCenterAccess(req, existing);

    await Appointment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { handleAuthzError(res, err); }
});

module.exports = router;
