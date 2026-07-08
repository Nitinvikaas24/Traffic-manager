const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Officer = require('../models/Officer');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const signToken = (officer) => jwt.sign(
  {
    id: officer._id.toString(),
    username: officer.username,
    fullName: officer.fullName,
    role: officer.role
  },
  process.env.JWT_SECRET || 'traffic-signal-secret',
  { expiresIn: '8h' }
);

router.post('/register', async (req, res) => {
  try {
    const { username, password, fullName, role } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({ message: 'username, password, and fullName are required' });
    }

    const existingOfficer = await Officer.findOne({ username });
    if (existingOfficer) {
      return res.status(409).json({ message: 'Officer username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const officer = await Officer.create({
      username,
      passwordHash,
      fullName,
      role: role === 'admin' ? 'admin' : 'officer'
    });

    const token = signToken(officer);
    res.status(201).json({
      token,
      officer: {
        id: officer._id,
        username: officer.username,
        fullName: officer.fullName,
        role: officer.role
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    const officer = await Officer.findOne({ username });
    if (!officer) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, officer.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = signToken(officer);
    res.json({
      token,
      officer: {
        id: officer._id,
        username: officer.username,
        fullName: officer.fullName,
        role: officer.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;