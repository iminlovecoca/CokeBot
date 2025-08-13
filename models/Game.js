const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  card: Number,
  type: String
}, { _id: false });

const gameSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  bet: Number,
  date: { type: Date, default: Date.now },
  active: { type: Boolean, default: true },
  player: [cardSchema],
  dealer: [cardSchema]
});

module.exports = mongoose.model('Game', gameSchema);
