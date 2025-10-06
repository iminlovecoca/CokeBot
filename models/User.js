const mongoose = require('mongoose');

const cokedexEntrySchema = new mongoose.Schema({
  caught: { type: Number, default: 0 },
  has_shiny: { type: Boolean, default: false }
}, { _id: false })

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
  vipUntil: { type: Date, default: null },

  bannedUntil: { type: Number, default: null },
  bannedReason: { type: String, default: '' },

  cookieDailyCount: { type: Number, default: 0 },
  cookieDailyDate: { type: String, default: '' },
  cookie: { type: Number, default: 0 },
  tea: { type: Number, default: 0 },
  luck: { type: Number, default: 0 },
  guesswordWins: { type: Number, default: 0 },


  // bank: { type: Number, default: 0 },
  // bankLastUpdate: { type: Date },
  // transferHistory: { type: [Object], default: [] },
  // receiveHistory: { type: [Object], default: [] },

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

  inventory: {
    type: Map,
    of: Number,
    default: {}
  },
  last_cokemon_id: {
    type: Number,
    default: 0
  },
  cokedex: {
    type: Map,
    of: cokedexEntrySchema,
    default: {}
  },

  warned: { type: Boolean, default: false },
  warnedAt: { type: Number, default: null },
  isBlacklisted: { type: Boolean, default: false }

});

module.exports = mongoose.model('User', userSchema);
