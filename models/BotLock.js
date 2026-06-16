const mongoose = require('mongoose');

const BotLockSchema = new mongoose.Schema({
  _id: { type: String, default: 'singleton' },
  locked: { type: Boolean, default: false },
  lockedFeatures: { type: [String], default: [] },
  lockedBy: { type: String, default: null },
  lockedAt: { type: Date, default: null }
}, { versionKey: false });

module.exports = mongoose.model('BotLock', BotLockSchema);
