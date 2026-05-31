const mongoose = require('mongoose');

const blackJackSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  bet: Number,
  date: { type: Date, default: Date.now },
  player: { type: [String], default: [] },
  dealer: { type: [String], default: [] },
  deck: { type: [String], default: [] },
  status: { type: String, default: 'active' }
});

module.exports = mongoose.model('BlackJackGame', blackJackSchema);
