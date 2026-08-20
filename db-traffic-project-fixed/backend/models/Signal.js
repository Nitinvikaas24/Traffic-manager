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

const OverrideSchema = new mongoose.Schema({
  active: {
    type: Boolean,
    default: false
  },
  forcedPhase: {
    type: String,
    enum: ['red', 'green'],
    required: false
  },
  reason: {
    type: String,
    required: false
  },
  officerName: {
    type: String,
    required: false
  },
  setAt: {
    type: Date,
    required: false
  }
}, { _id: false });

const AuditLogEntrySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },
  officerName: {
    type: String,
    required: false
  },
  reason: {
    type: String,
    required: false
  },
  previousStatus: {
    type: String,
    required: false
  },
  newStatus: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

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
    enum: ['normal', 'altered', 'offline', 'maintenance', 'blocked', 'overridden'],
    default: 'normal'
  },
  override: {
    type: OverrideSchema,
    required: false,
    default: () => ({ active: false })
  },
  auditLog: {
    type: [AuditLogEntrySchema],
    default: []
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create 2dsphere index for spatial queries
SignalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Signal', SignalSchema); 