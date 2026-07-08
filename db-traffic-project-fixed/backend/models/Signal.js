const mongoose = require('mongoose');

const PhaseSchema = new mongoose.Schema({
  phaseId: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  }
});

const TimingSchema = new mongoose.Schema({
  cycleLength: {
    type: Number,
    required: true
  },
  phases: [PhaseSchema]
});

const SignalSchema = new mongoose.Schema({
  signalId: {
    type: String,
    required: true,
    unique: true
  },
  intersectionName: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  defaultTiming: {
    type: TimingSchema,
    required: true
  },
  currentTiming: {
    type: TimingSchema,
    required: true
  },
  status: {
    type: String,
    enum: ['normal', 'altered', 'offline', 'maintenance'],
    default: 'normal'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastUpdatedBy: {
    type: String,
    default: 'system'
  }
}, { timestamps: true });

// Create 2dsphere index for spatial queries
SignalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Signal', SignalSchema); 