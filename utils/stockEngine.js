const StockSymbol = require('../models/StockSymbol');

const DEFAULT_SYMBOLS = [
  { symbol: 'COKE', name: 'Coke Corp', price: 100, volatility: 0.015 },
  { symbol: 'GEM',  name: 'Gemstone Ltd', price: 250, volatility: 0.02 },
  { symbol: 'RICE', name: 'Rice Holdings', price: 75, volatility: 0.012 },
  { symbol: 'MOON', name: 'Moon Co', price: 500, volatility: 0.03 },
  { symbol: 'OWO', name: 'OwO Inc', price: 200, volatility: 0.018 },
  { symbol: 'BTC', name: 'Bitcoin', price: 68000, volatility: 0.05 },
  { symbol: 'BIT', name: 'Bit Corp', price: 350, volatility: 0.025 },
  { symbol: 'ETH', name: 'Ethereum', price: 3200, volatility: 0.04 },
  { symbol: 'VIE', name: 'Viet Nam Corp', price: 150, volatility: 0.012 },
  { symbol: 'FPT', name: 'FPT Group', price: 850, volatility: 0.02 },
  { symbol: 'NYC', name: 'New York Corp', price: 1200, volatility: 0.018 },
  { symbol: 'ACB', name: 'ACB Bank', price: 350, volatility: 0.015 },
  { symbol: 'GAS', name: 'Gas Holdings', price: 500, volatility: 0.02 },
  { symbol: 'SHB', name: 'SHB Bank', price: 300, volatility: 0.015 },
  { symbol: 'TCB', name: 'Techcombank', price: 400, volatility: 0.015 },
  { symbol: 'CTG', name: 'VietinBank', price: 420, volatility: 0.015 },
  { symbol: 'VIB', name: 'VIB Bank', price: 380, volatility: 0.015 },
  { symbol: 'TEC', name: 'Tec Holdings', price: 600, volatility: 0.02 }
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Random chuẩn (Gaussian) để mô phỏng thực tế hơn
function gaussianRandom(mean = 0, stdev = 1) {
  let u = 1 - Math.random();
  let v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

async function ensureSymbols() {
  for (const s of DEFAULT_SYMBOLS) {
    await StockSymbol.updateOne(
      { symbol: s.symbol },
      { $setOnInsert: s },
      { upsert: true }
    );
  }
}

// Tick giá có ảnh hưởng cung cầu và auto-sell khi giảm mạnh
async function tickPrices() {
  const symbols = await StockSymbol.find({});
  const now = Date.now();

  const ops = symbols.map((s) => {
    const dt = Math.max(1, (now - new Date(s.lastUpdate).getTime()) / 1000);

    // 1. Gaussian biến động + drift tăng nhẹ (0.1%)
    const sigma = s.volatility * Math.sqrt(dt / 60);
    const rnd = gaussianRandom(0.001, sigma);

    // 2. Ảnh hưởng cung cầu
    const buyPressure = s.dailyBuyVolume || 0;
    const sellPressure = s.dailySellVolume || 0;
    let demandFactor = 1;

    if (buyPressure > sellPressure) {
      demandFactor += Math.min((buyPressure - sellPressure) / 8000, 0.05);
    } else if (sellPressure > buyPressure) {
      demandFactor -= Math.min((sellPressure - buyPressure) / 8000, 0.05);
    }

    // 3. Tính giá mới
    let newPrice = clamp(
      Number((s.price * demandFactor * (1 + rnd)).toFixed(2)),
      1,
      10_000_000
    );

    // 4. Auto-sell nếu giảm > 10%
    if (newPrice < s.price * 0.9) {
      console.log(`[AUTO SELL] ${s.symbol} giảm mạnh, bán tháo`);
      const extraSell = (s.dailySellVolume || 0) + s.price * 500;
      newPrice = Math.max(newPrice * 0.97, 1); // giảm thêm 3%
      return {
        updateOne: {
          filter: { symbol: s.symbol },
          update: {
            $set: {
              prevPrice: s.price,
              price: newPrice,
              lastUpdate: new Date(),
              dailySellVolume: extraSell
            }
          }
        }
      };
    }

    return {
      updateOne: {
        filter: { symbol: s.symbol },
        update: {
          $set: {
            prevPrice: s.price,
            price: newPrice,
            lastUpdate: new Date()
          }
        }
      }
    };
  });

  if (ops.length) await StockSymbol.bulkWrite(ops).catch(() => {});
}

// Reset volume mỗi ngày
async function resetDailyVolume() {
  await StockSymbol.updateMany({}, { 
    $set: { dailyBuyVolume: 0, dailySellVolume: 0 } 
  });
}

async function getQuote(symbol) {
  return StockSymbol.findOne({ symbol: symbol.toUpperCase() });
}

async function listQuotes() {
  return StockSymbol.find({}).sort({ symbol: 1 });
}

module.exports = { ensureSymbols, tickPrices, resetDailyVolume, getQuote, listQuotes };
