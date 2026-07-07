const mongoose = require('mongoose');

const horseRaceSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  bet: { type: Number, required: true },
  winningHorses: { type: [Number], required: true }, // Array of 6 numbers representing the winning horse of each round (1-6)
  round: { type: Number, default: 0 }, // Current completed round / correct streak (0-6)
  selectedHorses: { type: [Number], default: [] }, // Horses chosen by the player (1-6)
  cashOut: { type: Number, required: true }, // Current withdrawable reward
  status: { type: String, default: 'active' }, // 'active', 'processing'
  isWon: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HorseRaceGame', horseRaceSchema);
