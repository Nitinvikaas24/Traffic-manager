const express = require('express');
const router = express.Router();
const Signal = require('../models/Signal');
const { isValidString, isValidNumber, isValidArray } = require('../utils/dataValidation');
const { requireRole } = require('../middleware/auth');

// Validates a currentTiming payload before it ever reaches the DB: positive
// cycle length, at least one phase, each phase a positive-duration string id.
function validateTimingPayload(currentTiming) {
  if (!currentTiming || typeof currentTiming !== 'object') return 'currentTiming is required';
  if (!isValidNumber(currentTiming.cycleLength, 1)) return 'cycleLength must be a positive number';
  if (!isValidArray(currentTiming.phases, 1)) return 'phases must be a non-empty array';
  for (const phase of currentTiming.phases) {
    if (!isValidString(phase?.phaseId)) return 'each phase requires a non-empty phaseId';
    if (!isValidNumber(phase?.duration, 1)) return 'each phase duration must be a positive number';
  }
  return null;
}

// Get all signals
router.get('/', async (req, res) => {
  try {
    const signals = await Signal.find();
    res.json(signals);
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

// Create a new signal (admin only — this manages the infrastructure record
// itself, distinct from day-to-day officer control actions below)
router.post('/', requireRole('admin'), async (req, res) => {
  const signal = new Signal(req.body);
  try {
    const newSignal = await signal.save();
    res.status(201).json(newSignal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a signal (admin only)
router.put('/:id', requireRole('admin'), async (req, res) => {
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

// Delete a signal (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
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

// Get all altered signals
router.get('/status/altered', async (req, res) => {
  try {
    const alteredSignals = await Signal.find({ status: 'altered' });
    res.json(alteredSignals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update signal timing (remotely change phase durations)
router.patch('/:id/timing', async (req, res) => {
  try {
    const { currentTiming, status, reason } = req.body;
    const officerName = req.user.username;

    const validationError = validateTimingPayload(currentTiming);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const signal = await Signal.findOne({ signalId: req.params.id });
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }

    const previousStatus = signal.status;
    signal.currentTiming = currentTiming;
    signal.status = status || 'altered';
    signal.lastUpdated = new Date();
    signal.auditLog.unshift({
      action: 'timing_change',
      officerName,
      reason,
      previousStatus,
      newStatus: signal.status,
      timestamp: new Date(),
    });
    signal.auditLog = signal.auditLog.slice(0, 50);

    const updatedSignal = await signal.save();
    res.json(updatedSignal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Force an override (manual red/green) with a reason and officer attribution
router.patch('/:id/override', async (req, res) => {
  try {
    const { forcedPhase, reason } = req.body;
    const officerName = req.user.username;

    if (!forcedPhase || !['red', 'green'].includes(forcedPhase)) {
      return res.status(400).json({ message: "forcedPhase must be 'red' or 'green'" });
    }
    if (!isValidString(reason)) {
      return res.status(400).json({ message: 'reason is required for an override' });
    }

    const signal = await Signal.findOne({ signalId: req.params.id });
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }

    const previousStatus = signal.status;
    signal.status = 'overridden';
    signal.override = { active: true, forcedPhase, reason, officerName, setAt: new Date() };
    signal.lastUpdated = new Date();
    signal.auditLog.unshift({
      action: 'override_set',
      officerName,
      reason,
      previousStatus,
      newStatus: 'overridden',
      timestamp: new Date(),
    });
    signal.auditLog = signal.auditLog.slice(0, 50);

    const updatedSignal = await signal.save();
    res.json(updatedSignal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Clear an active override, restoring normal/scheduled operation
router.post('/:id/override/clear', async (req, res) => {
  try {
    const { reason } = req.body;
    const officerName = req.user.username;

    const signal = await Signal.findOne({ signalId: req.params.id });
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }

    const previousStatus = signal.status;
    signal.status = 'normal';
    signal.override = { active: false };
    signal.lastUpdated = new Date();
    signal.auditLog.unshift({
      action: 'override_cleared',
      officerName,
      reason,
      previousStatus,
      newStatus: 'normal',
      timestamp: new Date(),
    });
    signal.auditLog = signal.auditLog.slice(0, 50);

    const updatedSignal = await signal.save();
    res.json(updatedSignal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// One-click Event/Incident Mode: block or unblock a single signal
router.patch('/:id/event-mode', async (req, res) => {
  try {
    const { blocked, reason } = req.body;
    const officerName = req.user.username;

    if (blocked && !isValidString(reason)) {
      return res.status(400).json({ message: 'reason is required to block a signal' });
    }

    const signal = await Signal.findOne({ signalId: req.params.id });
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }

    const previousStatus = signal.status;
    signal.status = blocked ? 'blocked' : 'normal';
    signal.lastUpdated = new Date();
    signal.auditLog.unshift({
      action: blocked ? 'event_mode_block' : 'event_mode_unblock',
      officerName,
      reason,
      previousStatus,
      newStatus: signal.status,
      timestamp: new Date(),
    });
    signal.auditLog = signal.auditLog.slice(0, 50);

    const updatedSignal = await signal.save();
    res.json(updatedSignal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// One-click Event/Incident Mode for a cluster of signals at once
router.post('/event-mode/bulk', async (req, res) => {
  try {
    const { signalIds, blocked, reason } = req.body;
    const officerName = req.user.username;

    if (!Array.isArray(signalIds) || signalIds.length === 0) {
      return res.status(400).json({ message: 'signalIds must be a non-empty array' });
    }
    if (blocked && !isValidString(reason)) {
      return res.status(400).json({ message: 'reason is required to block a signal cluster' });
    }

    const updated = [];
    for (const signalId of signalIds) {
      const signal = await Signal.findOne({ signalId });
      if (!signal) continue;

      const previousStatus = signal.status;
      signal.status = blocked ? 'blocked' : 'normal';
      signal.lastUpdated = new Date();
      signal.auditLog.unshift({
        action: blocked ? 'event_mode_block' : 'event_mode_unblock',
        officerName,
        reason,
        previousStatus,
        newStatus: signal.status,
        timestamp: new Date(),
      });
      signal.auditLog = signal.auditLog.slice(0, 50);

      updated.push(await signal.save());
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Reset signal timing to default
router.post('/:id/reset', async (req, res) => {
  try {
    const signal = await Signal.findOne({ signalId: req.params.id });
    
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }

    const previousStatus = signal.status;
    signal.currentTiming = signal.defaultTiming;
    signal.status = 'normal';
    signal.lastUpdated = new Date();
    signal.auditLog.unshift({
      action: 'reset_to_default',
      officerName: req.user.username,
      previousStatus,
      newStatus: 'normal',
      timestamp: new Date(),
    });
    signal.auditLog = signal.auditLog.slice(0, 50);

    const updatedSignal = await signal.save();
    res.json(updatedSignal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router; 