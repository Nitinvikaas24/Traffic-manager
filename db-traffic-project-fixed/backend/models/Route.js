const mongoose = require('mongoose');

const RouteSchema = new mongoose.Schema({
  routeId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  corridorName: {
    type: String,
    required: true
  },
  signalIds: {
    type: [String],
    required: true
  },
  pathCoordinates: {
    type: [[Number]],
    required: true
  },
  color: {
    type: String,
    default: '#1976d2'
  },
  description: {
    type: String,
    default: ''
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Route', RouteSchema);