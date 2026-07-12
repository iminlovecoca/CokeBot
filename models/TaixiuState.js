const mongoose = require('mongoose');

const taixiuStateSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true },
  messageId: { type: String, default: null },
  round: { type: Number, default: 1 },
  status: { type: String, default: 'betting' }, // 'betting', 'rolling', 'result'
  countdown: { type: Number, default: 60 },
  taiPool: { type: Number, default: 0 },
  xiuPool: { type: Number, default: 0 },
  playersTai: { type: Map, of: Number, default: {} },
  playersXiu: { type: Map, of: Number, default: {} },
  history: { type: [String], default: [] }, // 'tai' or 'xiu'
  lastRoll: { type: [Number], default: [1, 2, 3] }, // the three dice rolled
  lastActive: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TaixiuState', taixiuStateSchema);
