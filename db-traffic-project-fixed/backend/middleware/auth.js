const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing access token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'traffic-signal-secret');
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired access token' });
  }
};

const requireOfficer = (req, res, next) => {
  if (!req.user || (req.user.role !== 'officer' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Officer access required' });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireOfficer
};