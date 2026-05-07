const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'Invalid token' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token expired or invalid' });
  }
};

// Check if user is RV level (rv_owner or rv_admin)
const isRVLevel = (req, res, next) => {
  if (['rv_owner', 'rv_admin'].includes(req.user.role)) return next();
  res.status(403).json({ message: 'RV level access required' });
};

// Check if user is RV Owner only
const isRVOwner = (req, res, next) => {
  if (req.user.role === 'rv_owner') return next();
  res.status(403).json({ message: 'RV Owner access required' });
};

// Check if user can manage a specific center
const canManageCenter = (req, res, next) => {
  const centerId = req.params.centerId || req.body.centerId || req.query.centerId;

  // RV owner and admin can manage all centers
  if (['rv_owner', 'rv_admin'].includes(req.user.role)) return next();

  // Center level roles can only manage their own center
  if (['center_owner', 'center_admin'].includes(req.user.role)) {
    if (req.user.centerId?.toString() === centerId?.toString()) return next();
    return res.status(403).json({ message: 'Access denied for this center' });
  }

  res.status(403).json({ message: 'Insufficient permissions' });
};

// Check if user can view a specific center (managers can view)
const canAccessCenter = (req, res, next) => {
  const centerId = req.params.centerId || req.body.centerId || req.query.centerId;

  if (['rv_owner', 'rv_admin'].includes(req.user.role)) return next();

  if (req.user.centerId?.toString() === centerId?.toString()) return next();

  res.status(403).json({ message: 'Access denied for this center' });
};

module.exports = { auth, isRVLevel, isRVOwner, canManageCenter, canAccessCenter };
