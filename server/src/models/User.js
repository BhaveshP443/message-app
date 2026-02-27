const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true },
    about: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    lastSeenAt: { type: Date, default: null },
    isOnline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ displayName: 'text' });

module.exports = mongoose.model('User', userSchema);

