const mongoose = require('mongoose');

const StockHoldingSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  symbol: { type: String, index: true },
  qty: { type: Number, default: 0 },        // cổ phiếu nắm giữ
  avgPrice: { type: Number, default: 0 },   // giá vốn trung bình
  shortQty: { type: Number, default: 0 },   // số lượng bán khống
  shortPrice: { type: Number, default: 0 }  // giá trung bình bán khống
}, { timestamps: true });

StockHoldingSchema.index({ userId: 1, symbol: 1 }, { unique: true });

module.exports = mongoose.model('StockHolding', StockHoldingSchema);
