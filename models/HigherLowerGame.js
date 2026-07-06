const mongoose = require('mongoose');

const higherLowerSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  bet: { type: Number, required: true },
  streak: { type: Number, default: 0 },
  cashOut: { type: Number, required: true },
  currentCard: { type: String, required: true },
  cardHistory: { type: [String], default: [] },
  status: { type: String, default: 'active' }, // 'active', 'processing'
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HigherLowerGame', higherLowerSchema);
