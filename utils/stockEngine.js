const StockSymbol = require('../models/StockSymbol');
const StockHolding = require('../models/StockHolding');
const { adjustCoke } = require('./cokeManager');

const DEFAULT_SYMBOLS = [
  { symbol: 'COKE', name: 'Coke Corp', price: 100, volatility: 0.015, lastUpdate: new Date() },
  { symbol: 'GEM', name: 'Gemstone Ltd', price: 250, volatility: 0.02, lastUpdate: new Date() },
  { symbol: 'RICE', name: 'Rice Holdings', price: 75, volatility: 0.012, lastUpdate: new Date() },
  { symbol: 'MOON', name: 'Moon Co', price: 500, volatility: 0.03, lastUpdate: new Date() },
  { symbol: 'OWO', name: 'OwO Inc', price: 200, volatility: 0.018, lastUpdate: new Date() },
  { symbol: 'BTC', name: 'Bitcoin', price: 68000, volatility: 0.05, lastUpdate: new Date() },
  { symbol: 'BIT', name: 'Bit Corp', price: 350, volatility: 0.025, lastUpdate: new Date() },
  { symbol: 'ETH', name: 'Ethereum', price: 3200, volatility: 0.04, lastUpdate: new Date() },
  { symbol: 'VIE', name: 'Viet Nam Corp', price: 150, volatility: 0.012, lastUpdate: new Date() },
  { symbol: 'FPT', name: 'FPT Group', price: 850, volatility: 0.02, lastUpdate: new Date() },
  { symbol: 'NYC', name: 'New York Corp', price: 1200, volatility: 0.018, lastUpdate: new Date() },
  { symbol: 'ACB', name: 'ACB Bank', price: 350, volatility: 0.015, lastUpdate: new Date() },
  { symbol: 'GAS', name: 'Gas Holdings', price: 500, volatility: 0.02, lastUpdate: new Date() },
  { symbol: 'SHB', name: 'SHB Bank', price: 300, volatility: 0.015, lastUpdate: new Date() },
  { symbol: 'TCB', name: 'Techcombank', price: 400, volatility: 0.015, lastUpdate: new Date() },
  { symbol: 'CTG', name: 'VietinBank', price: 420, volatility: 0.015, lastUpdate: new Date() },
  { symbol: 'VIB', name: 'VIB Bank', price: 380, volatility: 0.015, lastUpdate: new Date() },
  { symbol: 'TEC', name: 'Tec Holdings', price: 600, volatility: 0.02, lastUpdate: new Date() }
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function gaussianRandom(mean = 0, stdev = 1) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

// đảm bảo symbols tồn tại
async function ensureSymbols() {
  for (const s of DEFAULT_SYMBOLS) {
    await StockSymbol.updateOne(
      { symbol: s.symbol },
      { $setOnInsert: s },
      { upsert: true }
    );
  }
}

async function tickPrices() {
  const symbols = await StockSymbol.find({});
  const now = Date.now();

  for (const s of symbols) {
    const last = s.lastUpdate ? new Date(s.lastUpdate).getTime() : now;
    const dt = Math.max(1, (now - last) / 1000);

    let sigma = s.volatility * Math.sqrt(dt / 60);
    const drift = gaussianRandom(0, sigma);
    const microFluctuation = Math.random() * 0.004 - 0.002;

    const buyPressure = s.dailyBuyVolume || 0;
    const sellPressure = s.dailySellVolume || 0;
    let demandFactor = 1;

    if (buyPressure > sellPressure) demandFactor += Math.min((buyPressure - sellPressure)/8000, 0.05);
    else if (sellPressure > buyPressure) demandFactor -= Math.min((sellPressure - buyPressure)/8000, 0.05);

    let newPrice = clamp(Number((s.price * demandFactor * (1 + drift + microFluctuation)).toFixed(2)), 1, 10_000_000);

    // Chỉ update giá, không auto sell
    await StockSymbol.updateOne({ symbol: s.symbol }, {
      $set: {
        prevPrice: s.price,
        price: newPrice,
        lastUpdate: new Date(),
        dailySellVolume: s.dailySellVolume || 0
      }
    });
  }
}

// reset volume hằng ngày
async function resetDailyVolume() {
  await StockSymbol.updateMany({}, { $set: { dailyBuyVolume: 0, dailySellVolume: 0 } });
}

async function getQuote(symbol) {
  return StockSymbol.findOne({ symbol: symbol.toUpperCase() });
}

async function listQuotes() {
  return StockSymbol.find({}).sort({ symbol: 1 });
}

module.exports = { ensureSymbols, tickPrices, resetDailyVolume, getQuote, listQuotes };
