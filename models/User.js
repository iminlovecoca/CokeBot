const mongoose = require("mongoose");

const cokedexEntrySchema = new mongoose.Schema(
  {
    caught: { type: Number, default: 0 },
    has_shiny: { type: Boolean, default: false },
    owned: { type: Boolean, default: false },
  },
  { _id: false },
);

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

  cookieDailyCount: { type: Number, default: 0 },
  cookieDailyDate: { type: String, default: "" },
  cookie: { type: Number, default: 0 },
  tea: { type: Number, default: 0 },
  luck: { type: Number, default: 0 },

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
      fixed: {},
    },
  },

  inventory: {
    type: Map,
    of: Number,
    default: {},
  },
  last_cokemon_id: {
    type: Number,
    default: 0,
  },
  cokedex: {
    type: Map,
    of: cokedexEntrySchema,
    default: {},
  },
  active_cokemon_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cokemon",
    default: null,
  },

  anticheat: {
    verification_code: { type: String, default: null },
    last_flag_reason: { type: String, default: null },
    verification_attempts: { type: Number, default: 0 },
  },

  bannedUntil: { type: Number, default: null },
  bannedReason: { type: String, default: "" },

  warned: { type: Boolean, default: false },
  warnedAt: { type: Number, default: null },

  noituStats: { type: Object, default: {} },
  noituWins: { type: Number, default: 0 },
  noituCorrect: { type: Number, default: 0 },
  noituAttempts: { type: Number, default: 0 },
  noituLastPlayedAt: { type: Date, default: null },

  rpg: {
    name: { type: String, default: null },
    nameChanged: { type: Boolean, default: false },
    classKey: { type: String, default: null },
    characterAsset: { type: String, default: null },
    level: { type: Number, default: 1 },
    exp: { type: Number, default: 0 },
    power: { type: Number, default: 0 },
    stats: { type: Object, default: {} },
    rank: { type: String, default: "Novice" },
    equipped: { type: Object, default: {} },
    items: { type: [Object], default: [] },
    lastItemId: { type: Number, default: 0 },
    lastHuntAt: { type: Date, default: null },
    lastBossAt: { type: Date, default: null },
    pvpStreak: { type: Number, default: 0 },
    createdAt: { type: Date, default: null },
  },
});

module.exports = mongoose.model("User", userSchema);
