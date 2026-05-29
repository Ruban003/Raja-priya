const router = require('express').Router();
const Bill = require('../models/Bill');
const Appointment = require('../models/Appointment');
const { auth, getAuthorizedCenterId, handleAuthzError } = require('../middleware/auth');

router.get('/daily', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req, { required: false });
    if (!centerId) return res.json({ date: req.query.date, totalRevenue: 0, totalBills: 0, totalAppointments: 0, bills: [] });

    const date = req.query.date || new Date().toISOString().split('T')[0];
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    const bills = await Bill.find({ centerId, createdAt: { $gte: start, $lt: end } });
    const appointments = await Appointment.find({ centerId, date });

    res.json({
      date,
      totalRevenue: bills.reduce((sum, b) => sum + (b.grandTotal || 0), 0),
      totalBills: bills.length,
      totalAppointments: appointments.length,
      bills
    });
  } catch (err) { handleAuthzError(res, err); }
});

router.get('/monthly', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req, { required: false });
    const { month, year } = req.query;
    const m = parseInt(month, 10) || new Date().getMonth() + 1;
    const y = parseInt(year, 10) || new Date().getFullYear();
    const daysInMonth = new Date(y, m, 0).getDate();

    if (!centerId) {
      return res.json({ month: m, year: y, totalRevenue: 0, totalBills: 0, dailyData: Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, revenue: 0 })) });
    }

    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    const bills = await Bill.find({ centerId, createdAt: { $gte: start, $lt: end } });
    const totalRevenue = bills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);

    const dailyMap = {};
    bills.forEach(b => {
      const day = new Date(b.createdAt).getDate();
      dailyMap[day] = (dailyMap[day] || 0) + (b.grandTotal || 0);
    });

    const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      revenue: dailyMap[i + 1] || 0
    }));

    res.json({ month: m, year: y, totalRevenue, totalBills: bills.length, dailyData });
  } catch (err) { handleAuthzError(res, err); }
});

router.get('/dashboard', auth, async (req, res) => {
  try {
    const centerId = getAuthorizedCenterId(req, { required: false });
    if (!centerId) {
      return res.json({ todayRevenue: 0, todayBills: 0, todayAppointments: 0, monthRevenue: 0, pendingAppointments: 0 });
    }

    const today = new Date().toISOString().split('T')[0];
    const start = new Date(today);
    const end = new Date(today);
    end.setDate(end.getDate() + 1);

    const [todayBills, todayAppointments, monthBills] = await Promise.all([
      Bill.find({ centerId, createdAt: { $gte: start, $lt: end } }),
      Appointment.find({ centerId, date: today }),
      Bill.find({ centerId, createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } })
    ]);

    res.json({
      todayRevenue: todayBills.reduce((s, b) => s + (b.grandTotal || 0), 0),
      todayBills: todayBills.length,
      todayAppointments: todayAppointments.length,
      monthRevenue: monthBills.reduce((s, b) => s + (b.grandTotal || 0), 0),
      pendingAppointments: todayAppointments.filter(a => a.status === 'pending').length
    });
  } catch (err) { handleAuthzError(res, err); }
});

module.exports = router;
