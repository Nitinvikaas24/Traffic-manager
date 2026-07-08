const express = require('express');
const router = express.Router();
const Occasion = require('../models/Occasion');
const Signal = require('../models/Signal');
const { authenticateToken, requireOfficer } = require('../middleware/auth');
const { default: mongoose } = require('mongoose');

// Get all occasions
router.get('/', async (req, res) => {
  try {
    const occasions = await mongoose.connection.db.collection('occasions').find({}).toArray();
    res.json(occasions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single occasion
router.get('/:id', async (req, res) => {
  try {
    const occasion = await Occasion.findOne({ occasionId: req.params.id });
    if (!occasion) {
      return res.status(404).json({ message: 'Occasion not found' });
    }
    res.json(occasion);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new occasion
router.post('/', authenticateToken, requireOfficer, async (req, res) => {
  const occasion = new Occasion(req.body);
  try {
    occasion.createdBy = req.user.username;
    occasion.updatedBy = req.user.username;
    const newOccasion = await occasion.save();
    
    // Apply the occasion's timing rules to affected signals
    if (req.body.isActive) {
      await applyOccasionToSignals(newOccasion);
    }
    
    res.status(201).json(newOccasion);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update an occasion
router.put('/:id', authenticateToken, requireOfficer, async (req, res) => {
  try {
    const updatedOccasion = await Occasion.findOneAndUpdate(
      { occasionId: req.params.id },
      { ...req.body, updatedBy: req.user.username },
      { new: true, runValidators: true }
    );
    
    if (!updatedOccasion) {
      return res.status(404).json({ message: 'Occasion not found' });
    }
    
    // If the occasion is active, apply its timing rules to affected signals
    if (updatedOccasion.isActive) {
      await applyOccasionToSignals(updatedOccasion);
    } else {
      // If the occasion is deactivated, reset affected signals
      await resetSignals(updatedOccasion.affectedSignalIds);
    }
    
    res.json(updatedOccasion);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete an occasion
router.delete('/:id', authenticateToken, requireOfficer, async (req, res) => {
  try {
    const occasion = await Occasion.findOne({ occasionId: req.params.id });
    
    if (!occasion) {
      return res.status(404).json({ message: 'Occasion not found' });
    }
    
    // Reset affected signals
    await resetSignals(occasion.affectedSignalIds);
    
    // Delete the occasion
    await Occasion.deleteOne({ occasionId: req.params.id });
    
    res.json({ message: 'Occasion deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Activate an occasion
router.patch('/:id/activate', authenticateToken, requireOfficer, async (req, res) => {
  try {
    const occasion = await Occasion.findOneAndUpdate(
      { occasionId: req.params.id },
      { isActive: true },
      { new: true }
    );
    
    if (!occasion) {
      return res.status(404).json({ message: 'Occasion not found' });
    }
    
    // Apply the occasion's timing rules to affected signals
    await applyOccasionToSignals(occasion);
    
    res.json(occasion);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Deactivate an occasion
router.patch('/:id/deactivate', authenticateToken, requireOfficer, async (req, res) => {
  try {
    const occasion = await Occasion.findOneAndUpdate(
      { occasionId: req.params.id },
      { isActive: false },
      { new: true }
    );
    
    if (!occasion) {
      return res.status(404).json({ message: 'Occasion not found' });
    }
    
    // Reset affected signals
    await resetSignals(occasion.affectedSignalIds);
    
    res.json(occasion);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Helper functions

// Apply occasion timing rules to affected signals
async function applyOccasionToSignals(occasion) {
  try {
    // Get the adjustment rules
    const { cycleLength, phases } = occasion.adjustmentRules;
    
    // Update each affected signal
    for (const signalId of occasion.affectedSignalIds) {
      const signal = await Signal.findOne({ signalId });
      
      if (signal) {
        // Apply the timing adjustment
        signal.currentTiming = {
          cycleLength,
          phases
        };
        signal.status = 'altered';
        signal.lastUpdated = new Date();
        
        await signal.save();
      }
    }
  } catch (error) {
    console.error('Error applying occasion to signals:', error);
  }
}

// Reset signals to their default timing
async function resetSignals(signalIds) {
  try {
    for (const signalId of signalIds) {
      const signal = await Signal.findOne({ signalId });
      
      if (signal) {
        signal.currentTiming = signal.defaultTiming;
        signal.status = 'normal';
        signal.lastUpdated = new Date();
        
        await signal.save();
      }
    }
  } catch (error) {
    console.error('Error resetting signals:', error);
  }
}

module.exports = router; 