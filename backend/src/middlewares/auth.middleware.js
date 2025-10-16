const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.user = null;
    return next(); // Cho phép truy cập public
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('-password');
    req.user = user || null;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ msg: 'Unauthorized' });
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });
  next();
}

module.exports = { authMiddleware, adminOnly };
