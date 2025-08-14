const mongoose = require('mongoose');

const StockSymbolSchema = new mongoose.Schema({
  symbol: { type: String, unique: true, index: true },
  name: { type: String, default: '' },
  price: { type: Number, default: 100 },       // giá hiện tại
  prevPrice: { type: Number, default: 100 },   // giá trước
  volatility: { type: Number, default: 0.015 },// độ biến động mặc định 1.5%/tick
  lastUpdate: { type: Date, default: Date.now },
  dailyBuyVolume: { type: Number, default: 0 }, // khối lượng mua trong ngày
  dailySellVolume: { type: Number, default: 0 } // khối lượng bán trong ngày
});

module.exports = mongoose.model('StockSymbol', StockSymbolSchema);
