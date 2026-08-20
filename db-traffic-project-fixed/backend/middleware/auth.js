const jwt = require('jsonwebtoken');

// Verifies the Authorization: Bearer <token> header and attaches the decoded
// identity to req.user. Every mutating route derives officer attribution from
// req.user, never from the request body, so a caller can't claim to be
// someone else in the audit log.
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing or malformed Authorization header' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, username: payload.username, role: payload.role, badgeId: payload.badgeId };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// requireRole('admin') -> only admins pass; requireRole('admin', 'officer') -> either.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions for this action' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
