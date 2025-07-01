const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: String,
  coke: { type: Number, default: 0 },
  dailyStreak: { type: Number, default: 0 },
  lastDaily: Date,
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  dailyXp: { type: Number, default: 0 },
  lastXpReset: Date,

  beasts: {
    type: Object,
    default: {}
  }
});

module.exports = mongoose.model('User', userSchema);
