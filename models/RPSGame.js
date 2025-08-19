const mongoose = require('mongoose');

const rpsGameSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  bet: Number,
  date: { type: Date, default: Date.now },
  botChoice: { type: String, enum: ['keo', 'bua', 'bao'], default: null },
});

module.exports = mongoose.model('RPSGame', rpsGameSchema);
