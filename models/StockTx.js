const mongoose = require('mongoose');

const StockTxSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  symbol: { type: String, index: true },
  side: { type: String, enum: ['BUY', 'SELL'] },
  qty: Number,
  price: Number,
  fee: Number,
  total: Number, // tổng tiền coke đã trừ nhận 
  at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('StockTx', StockTxSchema);
