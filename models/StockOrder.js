const mongoose = require('mongoose');

const StockOrderSchema = new mongoose.Schema({
  userId: String,
  symbol: String,
  side: { type: String, enum: ['BUY','SELL','SELL_SHORT','BUY_TO_COVER'] },
  qty: Number,
  price: Number, // giá đặt lệnh (market order = giá hiện tại)
  filled: { type: Number, default: 0 },
  status: { type: String, enum: ['OPEN','FILLED','CANCELLED'], default: 'OPEN' }
}, { timestamps: true });

module.exports = mongoose.model('StockOrder', StockOrderSchema);
