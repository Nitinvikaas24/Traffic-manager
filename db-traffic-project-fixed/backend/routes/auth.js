const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// Stricter limiter on login specifically, to slow down credential-stuffing/brute force.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Try again later.' },
});

// Public demo access: when DEMO_MODE=true, anyone can obtain a short-lived
// officer-role session without credentials. Never issues admin, and is a 404
// when disabled so it doesn't exist on a real deployment.
const demoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many demo sessions. Try again later.' },
});

router.post('/demo', demoLimiter, async (req, res) => {
  if (process.env.DEMO_MODE !== 'true') {
    return res.status(404).json({ message: 'Not found' });
  }
  try {
    const user = await User.findOne({ username: (process.env.DEMO_USERNAME || 'officer1').toLowerCase() });
    if (!user || user.role !== 'officer') {
      return res.status(503).json({ message: 'Demo account is not available' });
    }
    const payload = { id: user._id.toString(), username: user.username, role: user.role, badgeId: user.badgeId };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token, user: payload });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const payload = { id: user._id.toString(), username: user.username, role: user.role, badgeId: user.badgeId };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({ token, user: payload });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
