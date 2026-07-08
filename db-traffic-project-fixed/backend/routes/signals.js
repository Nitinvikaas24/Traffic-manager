const express = require('express');
const router = express.Router();
const Signal = require('../models/Signal');
const { authenticateToken, requireOfficer } = require('../middleware/auth');

// Get all signals
router.get('/', async (req, res) => {
  try {
    const signals = await Signal.find();
    res.json(signals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all altered signals
router.get('/status/altered', async (req, res) => {
  try {
    const alteredSignals = await Signal.find({ status: 'altered' });
    res.json(alteredSignals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single signal
router.get('/:id', async (req, res) => {
  try {
    const signal = await Signal.findOne({ signalId: req.params.id });
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    res.json(signal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new signal
router.post('/', async (req, res) => {
  const signal = new Signal(req.body);
  try {
    const newSignal = await signal.save();
    res.status(201).json(newSignal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a signal
router.put('/:id', async (req, res) => {
  try {
    const updatedSignal = await Signal.findOneAndUpdate(
      { signalId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedSignal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    
    res.json(updatedSignal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a signal
router.delete('/:id', async (req, res) => {
  try {
    const signal = await Signal.findOneAndDelete({ signalId: req.params.id });
    
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    
    res.json({ message: 'Signal deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update signal timing
router.patch('/:id/timing', authenticateToken, requireOfficer, async (req, res) => {
  try {
    const { currentTiming, status } = req.body;
    
    const updatedSignal = await Signal.findOneAndUpdate(
      { signalId: req.params.id },
      { 
        currentTiming, 
        status: status || 'altered',
        lastUpdated: new Date(),
        lastUpdatedBy: req.user.username
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedSignal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    
    res.json(updatedSignal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Reset signal timing to default
router.post('/:id/reset', authenticateToken, requireOfficer, async (req, res) => {
  try {
    const signal = await Signal.findOne({ signalId: req.params.id });
    
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    
    signal.currentTiming = signal.defaultTiming;
    signal.status = 'normal';
    signal.lastUpdated = new Date();
    signal.lastUpdatedBy = req.user.username;
    
    const updatedSignal = await signal.save();
    res.json(updatedSignal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router; 