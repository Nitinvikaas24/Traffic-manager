const mongoose = require('mongoose');

const TimeWindowSchema = new mongoose.Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6  // 0 = Sunday, 6 = Saturday
  },
  startHour: {
    type: Number,
    required: true,
    min: 0,
    max: 23
  },
  endHour: {
    type: Number,
    required: true,
    min: 0,
    max: 23
  }
});

const PhaseAdjustmentSchema = new mongoose.Schema({
  phaseId: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  }
});

const AdjustmentRulesSchema = new mongoose.Schema({
  cycleLength: {
    type: Number,
    required: true
  },
  phases: [PhaseAdjustmentSchema]
});

const OccasionSchema = new mongoose.Schema({
  occasionId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  dates: {
    type: [Date],
    required: true
  },
  timeWindows: {
    type: [TimeWindowSchema],
    required: true
  },
  affectedSignalIds: {
    type: [String],
    required: true
  },
  adjustmentRules: {
    type: AdjustmentRulesSchema,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    default: 'system'
  },
  updatedBy: {
    type: String,
    default: 'system'
  }
}, { timestamps: true });

module.exports = mongoose.model('Occasion', OccasionSchema); 