const router = require('express').Router();
const Customer = require('../models/Customer');
const { auth } = require('../middleware/auth');
const getCenter = (req) => req.query.centerId || req.body.centerId || req.user.centerId;

router.get('/', auth, async (req, res) => {
  try { res.json(await Customer.find({ centerId: getCenter(req) }).sort({ name: 1 })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try { res.status(201).json(await new Customer(req.body).save()); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try { res.json(await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
