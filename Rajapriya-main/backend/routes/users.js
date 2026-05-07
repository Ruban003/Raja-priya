const router = require('express').Router();
const User = require('../models/User');
const { auth, isRVOwner, isRVLevel } = require('../middleware/auth');

// Get all users (RV level) or center users (center owner)
router.get('/', auth, async (req, res) => {
  try {
    let query = { isActive: true };
    if (req.user.role === 'center_owner') {
      query.centerId = req.user.centerId;
    } else if (!['rv_owner', 'rv_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create user
// RV Owner can create any role
// Center Owner can create center_admin and manager for their center
router.post('/', auth, async (req, res) => {
  try {
    const { role } = req.body;
    const rvRoles = ['rv_owner', 'rv_admin'];
    const centerRoles = ['center_owner', 'center_admin', 'manager'];

    if (req.user.role === 'rv_owner') {
      // Can create any role
    } else if (req.user.role === 'center_owner') {
      if (!['center_admin', 'manager'].includes(role)) {
        return res.status(403).json({ message: 'Center owner can only create admin or manager' });
      }
      req.body.centerId = req.user.centerId;
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await new User(req.body).save();
    const userObj = user.toObject();
    delete userObj.password;
    res.status(201).json(userObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update user
router.put('/:id', auth, async (req, res) => {
  try {
    if (!['rv_owner', 'center_owner'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.body.password) {
      const User = require('../models/User');
      const user = await User.findById(req.params.id);
      user.set(req.body);
      await user.save();
      const userObj = user.toObject();
      delete userObj.password;
      return res.json(userObj);
    }
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete user (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!['rv_owner', 'center_owner'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
