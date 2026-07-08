const mongoose = require('mongoose');

const OfficerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['officer', 'admin'],
    default: 'officer'
  }
}, { timestamps: true });

module.exports = mongoose.model('Officer', OfficerSchema);