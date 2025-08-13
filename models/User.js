const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  coke: { type: Number, default: 0 },
  cokeGC: { type: Number, default: 0 },
  dailyStreak: { type: Number, default: 0 },
  lastDaily: { type: Date },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  dailyXp: { type: Number, default: 0 },
  lastXpReset: { type: Date },
  vipLevel: { type: Number, default: 0 },
  bannedUntil: { type: Number, default: null },
  bannedReason: { type: String, default: '' },

  cookieDailyCount: { type: Number, default: 0 },
  cookieDailyDate: { type: String, default: '' },
  cookie: { type: Number, default: 0 },
  tea: { type: Number, default: 0 },
  luck: { type: Number, default: 0 },

  bank: { type: Number, default: 0 },
  bankLastUpdate: { type: Date },
  transferHistory: { type: [Object], default: [] },
  receiveHistory: { type: [Object], default: [] },

  dailyGive: { type: Object, default: {} },
  dailyReceive: { type: Object, default: {} },
  lastWork: { type: Number, default: 0 },

  zoo: { type: Object, default: {} },
  zooPoints: { type: Number, default: 0 },
  huntStones: {
    type: Object,
    default: {
      boost: {},
      multi: {},
      fixed: {}
    }
  },

  warned: { type: Boolean, default: false },
  warnedAt: { type: Number, default: null },

});

module.exports = mongoose.model('User', userSchema);
