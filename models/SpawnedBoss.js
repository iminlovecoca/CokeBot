const mongoose = require('mongoose');

const SpawnedBossSchema = new mongoose.Schema({
  bossId: { type: String, required: true },
  channelId: { type: String, required: true },
  boss: { type: mongoose.Schema.Types.Mixed, required: true },
  hp: { type: Number, required: true },
  maxHp: { type: Number, required: true },
  defeated: { type: Boolean, default: false },
  expired: { type: Boolean, default: false },
  rewarded: { type: Boolean, default: false },
  rewardedUserIds: { type: [String], default: [] },
  participants: { type: mongoose.Schema.Types.Mixed, default: {} },
  lastHitUserId: { type: String, default: null },
  spawnedAt: { type: Number, required: true },
  expiresAt: { type: Number, required: true },
  messageId: { type: String, default: null },
  messageIds: { type: [String], default: [] },
  imageUrl: { type: String, default: null },
  phase: { type: Number, default: 1 },
  effects: { type: mongoose.Schema.Types.Mixed, default: {} },
  allowSoulRealm: { type: Boolean, default: false },
  triggerEventBoss: { type: String, default: null },
  poise: { type: Number, default: 0 },
  poiseMax: { type: Number, default: 0 },
  poiseBroken: { type: Boolean, default: false }
}, { versionKey: false, timestamps: true });

SpawnedBossSchema.index({ bossId: 1 });
SpawnedBossSchema.index({ defeated: 1, expired: 1, rewarded: 1 });

module.exports = mongoose.model('SpawnedBoss', SpawnedBossSchema);
