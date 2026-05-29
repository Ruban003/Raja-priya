const jwt = require('jsonwebtoken');
const User = require('../models/User');

const rvRoles = ['rv_owner', 'rv_admin'];

const isRVLevelUser = (user) => rvRoles.includes(user?.role);

const getRequestedCenterId = (req) => (
  req.params.centerId ||
  req.body.centerId ||
  req.query.centerId ||
  req.user?.centerId
)?.toString();

const canUseCenterId = (user, centerId) => {
  if (!centerId) return false;
  if (isRVLevelUser(user)) return true;
  return user.centerId?.toString() === centerId.toString();
};

const getAuthorizedCenterId = (req, { required = true } = {}) => {
  const requestedCenterId = getRequestedCenterId(req);

  if (isRVLevelUser(req.user)) {
    if (required && !requestedCenterId) {
      const err = new Error('centerId is required');
      err.statusCode = 400;
      throw err;
    }
    return requestedCenterId || null;
  }

  const ownCenterId = req.user.centerId?.toString();
  if (!ownCenterId) {
    const err = new Error('User is not assigned to a center');
    err.statusCode = 403;
    throw err;
  }

  if (requestedCenterId && requestedCenterId !== ownCenterId) {
    const err = new Error('Access denied for this center');
    err.statusCode = 403;
    throw err;
  }

  return ownCenterId;
};

const ensureRecordCenterAccess = (req, record) => {
  if (!record) {
    const err = new Error('Record not found');
    err.statusCode = 404;
    throw err;
  }

  const recordCenterId = record.centerId?.toString();
  if (!canUseCenterId(req.user, recordCenterId)) {
    const err = new Error('Access denied for this center');
    err.statusCode = 403;
    throw err;
  }
};

const handleAuthzError = (res, err) => {
  res.status(err.statusCode || 500).json({ message: err.message });
};

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'JWT secret is not configured' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user || !req.user.isActive) return res.status(401).json({ message: 'Invalid token' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token expired or invalid' });
  }
};

const isRVLevel = (req, res, next) => {
  if (isRVLevelUser(req.user)) return next();
  res.status(403).json({ message: 'RV level access required' });
};

const isRVOwner = (req, res, next) => {
  if (req.user.role === 'rv_owner') return next();
  res.status(403).json({ message: 'RV Owner access required' });
};

const canManageCenter = (req, res, next) => {
  try {
    const centerId = getRequestedCenterId(req);
    if (isRVLevelUser(req.user) || canUseCenterId(req.user, centerId)) return next();
    res.status(403).json({ message: 'Access denied for this center' });
  } catch (err) {
    handleAuthzError(res, err);
  }
};

const canAccessCenter = canManageCenter;

module.exports = {
  auth,
  isRVLevel,
  isRVOwner,
  canManageCenter,
  canAccessCenter,
  isRVLevelUser,
  getAuthorizedCenterId,
  ensureRecordCenterAccess,
  handleAuthzError,
  canUseCenterId
};
