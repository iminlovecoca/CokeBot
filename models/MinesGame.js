const mongoose = require('mongoose');

const minesSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  bet: { type: Number, required: true },
  minesCount: { type: Number, required: true, default: 3 },
  grid: { type: [String], required: true }, // Mảng 9 phần tử chứa 'diamond' hoặc 'mine'
  revealed: { type: [Boolean], default: [false, false, false, false, false, false, false, false, false] },
  cashOut: { type: Number, required: true },
  status: { type: String, default: 'active' }, // 'active', 'processing'
  explodedCellIndex: { type: Number, default: -1 },
  isWon: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MinesGame', minesSchema);
