const router = require('express').Router();
const User = require('../models/User');
const { auth, isRVLevelUser, handleAuthzError } = require('../middleware/auth');

const canManageUserRecord = (actor, target) => {
  if (actor.role === 'rv_owner') return true;
  if (actor.role === 'center_owner') {
    return target.centerId?.toString() === actor.centerId?.toString() && !['rv_owner', 'rv_admin', 'center_owner'].includes(target.role);
  }
  return false;
};

router.get('/', auth, async (req, res) => {
  try {
    let query = { isActive: true };

    if (req.user.role === 'center_owner') {
      query.centerId = req.user.centerId;
    } else if (!isRVLevelUser(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { role } = req.body;

    if (req.user.role === 'rv_owner') {
      // RV owner can create all roles.
    } else if (req.user.role === 'center_owner') {
      if (!['center_admin', 'manager'].includes(role)) {
        return res.status(403).json({ message: 'Center owner can only create center admin or manager users' });
      }
      req.body.centerId = req.user.centerId;
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await new User(req.body).save();
    const userObj = user.toObject();
    delete userObj.password;
    res.status(201).json(userObj);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!canManageUserRecord(req.user, user)) return res.status(403).json({ message: 'Access denied' });

    const updates = { ...req.body };

    if (req.user.role === 'center_owner') {
      delete updates.centerId;
      if (updates.role && !['center_admin', 'manager'].includes(updates.role)) {
        return res.status(403).json({ message: 'Center owner can only manage center admin or manager users' });
      }
    }

    user.set(updates);
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    res.json(userObj);
  } catch (err) { handleAuthzError(res, err); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!canManageUserRecord(req.user, user)) return res.status(403).json({ message: 'Access denied' });

    user.isActive = false;
    await user.save();
    res.json({ success: true });
  } catch (err) { handleAuthzError(res, err); }
});

module.exports = router;
