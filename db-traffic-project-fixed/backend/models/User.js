const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['officer', 'admin'],
      default: 'officer',
    },
    badgeId: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
