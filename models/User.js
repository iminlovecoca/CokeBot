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
    freeClassChangeUsed: { type: Boolean, default: false },
    migratedToWarrior: { type: Boolean, default: false },
    classKey: { type: String, default: null },
    characterAsset: { type: String, default: null },
    level: { type: Number, default: 1 },
    exp: { type: Number, default: 0 },
    power: { type: Number, default: 0 },
    stats: { type: Object, default: {} },
    rank: { type: String, default: "Novice" },
    equipped: { type: Object, default: {} },
    claimedBossWeapons: { type: [String], default: [] },
    clearedDungeons: { type: [Number], default: [] },
    claimedEvents: { type: [String], default: [] },
    isGodMode: { type: Boolean, default: false },
    godsetBackup: { type: Object, default: null },
    items: { type: [Object], default: [] },
    lastItemId: { type: Number, default: 0, index: true },
    lastHuntAt: { type: Date, default: null },
    lastBossAt: { type: Date, default: null },
    pvpStreak: { type: Number, default: 0 },
    battleRank: { type: String, default: "Unranked" },
    battleLp: { type: Number, default: 0 },
    seasonWins: { type: Number, default: 0 },
    seasonLosses: { type: Number, default: 0 },
    seasonRewardClaimed: { type: Boolean, default: false },
    createdAt: { type: Date, default: null },
    autohunt: {
      isActive: { type: Boolean, default: false },
      startTime: { type: Date, default: null },
      durationHours: { type: Number, default: 0 },
      essence: { type: Number, default: 0 },
      totalEssence: { type: Number, default: 0 },
      captchaCode: { type: String, default: null },
      pendingDuration: { type: Number, default: 0 },
      dmReminder: { type: Boolean, default: false },
      levels: {
        efficiency: { type: Number, default: 1 },
        duration: { type: Number, default: 1 },
        cost: { type: Number, default: 1 },
        gain: { type: Number, default: 1 },
        experience: { type: Number, default: 1 },
        radar: { type: Number, default: 1 },
      },
      xp: {
        efficiency: { type: Number, default: 0 },
        duration: { type: Number, default: 0 },
        cost: { type: Number, default: 0 },
        gain: { type: Number, default: 0 },
        experience: { type: Number, default: 0 },
        radar: { type: Number, default: 0 },
      },
    },
    quests: {
      type: Object,
      default: {
        active: [],
        lastDailyAt: null,
        rerollsLeft: 1,
      },
    },
    settings: {
      battleDisplay: { type: String, default: "image" },
      battleSpeed: { type: String, default: "instant" },
      battleLogs: { type: String, default: "false" },
    },
    gachaWpPity: { type: Number, default: 0 },
    gachaWpGuaranteed: { type: Boolean, default: false },
    gachaSkinPity: { type: Number, default: 0 },
    gachaSkinGuaranteed: { type: Boolean, default: false },
    ownedSkins: { type: [String], default: [] },
    pets: { type: [Object], default: [] },
    equippedPet: { type: Object, default: null },
  },
});
// Indexes for ranking and fast lookups
userSchema.index({ coke: -1 });
userSchema.index({ level: -1 });
userSchema.index({ luck: -1 });
userSchema.index({ tea: -1 });
userSchema.index({ "rpg.power": -1 });
userSchema.index({ "rpg.autohunt.totalEssence": -1 });
userSchema.index({ "rpg.autohunt.isActive": 1 });

module.exports = mongoose.model("User", userSchema);
