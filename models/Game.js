const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  bet: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  active: { type: Boolean, default: true },

  deck: { type: Array, default: [] },
  player: { type: Array, default: [] },
  dealer: { type: Array, default: [] }
});

module.exports = mongoose.model('Game', gameSchema);
