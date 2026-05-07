const router = require('express').Router();
const Appointment = require('../models/Appointment');
const { auth } = require('../middleware/auth');

const getCenter = (req) => req.query.centerId || req.body.centerId || req.user.centerId;

router.get('/', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    const { date } = req.query;
    const query = { centerId };
    if (date) query.date = date;
    res.json(await Appointment.find(query).sort({ date: -1, time: 1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    res.status(201).json(await new Appointment(req.body).save());
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    res.json(await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'manager') return res.status(403).json({ message: 'Access denied' });
    await Appointment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
