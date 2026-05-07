const router = require('express').Router();
const Bill = require('../models/Bill');
const Appointment = require('../models/Appointment');
const { auth } = require('../middleware/auth');

const getCenter = (req) => req.query.centerId || req.user.centerId;

// Daily summary
router.get('/daily', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const start = new Date(date);
    const end = new Date(new Date(date).setDate(start.getDate() + 1));

    const bills = await Bill.find({ centerId, createdAt: { $gte: start, $lt: end } });
    const appointments = await Appointment.find({ centerId, date });

    const totalRevenue = bills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
    const totalBills = bills.length;
    const totalAppointments = appointments.length;

    res.json({ date, totalRevenue, totalBills, totalAppointments, bills });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Monthly summary
router.get('/monthly', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);

    const bills = await Bill.find({ centerId, createdAt: { $gte: start, $lt: end } });
    const totalRevenue = bills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);

    // Group by day
    const dailyMap = {};
    bills.forEach(b => {
      const day = new Date(b.createdAt).getDate();
      if (!dailyMap[day]) dailyMap[day] = 0;
      dailyMap[day] += b.grandTotal || 0;
    });

    const dailyData = Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => ({
      day: i + 1,
      revenue: dailyMap[i + 1] || 0
    }));

    res.json({ month: m, year: y, totalRevenue, totalBills: bills.length, dailyData });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Dashboard stats
router.get('/dashboard', auth, async (req, res) => {
  try {
    const centerId = getCenter(req);
    const today = new Date().toISOString().split('T')[0];
    const start = new Date(today);
    const end = new Date(new Date(today).setDate(start.getDate() + 1));

    const [todayBills, todayAppointments, monthStart] = await Promise.all([
      Bill.find({ centerId, createdAt: { $gte: start, $lt: end } }),
      Appointment.find({ centerId, date: today }),
      Bill.find({ centerId, createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } })
    ]);

    res.json({
      todayRevenue: todayBills.reduce((s, b) => s + (b.grandTotal || 0), 0),
      todayBills: todayBills.length,
      todayAppointments: todayAppointments.length,
      monthRevenue: monthStart.reduce((s, b) => s + (b.grandTotal || 0), 0),
      pendingAppointments: todayAppointments.filter(a => a.status === 'pending').length
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
