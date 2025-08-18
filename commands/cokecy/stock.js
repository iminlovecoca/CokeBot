// const { EmbedBuilder } = require('discord.js');
// const { setCooldown, getRemainingCooldown } = require('../../utils/cooldown');
// const { adjustCoke, getCoke, debitIfEnough } = require('../../utils/cokeManager');
// const { ensureSymbols, getQuote, listQuotes, tickPrices } = require('../../utils/stockEngine');
// const StockHolding = require('../../models/StockHolding');
// const StockOrder = require('../../models/StockOrder');
// const StockTx = require('../../models/StockTx');
// const PendingWithdrawal = require('../../models/PendingWithdrawal');

// const FEE_RATE = 0.1;
// const MAX_QTY_PER_ORDER = 1_000_000;

// function vnTime(date) {
//   return new Date(date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
// }
// function fmt(n) { return Number(n).toLocaleString(); }

// module.exports = {
//   name: 'stock',
//   description: 'Sàn chứng khoán ảo: mua/bán/giá/ví',
//   async execute(message, args) {
//     const userId = message.author.id;
//     const cd = getRemainingCooldown(userId, 'stock');
//     if (cd > 0) return message.reply(`⏱ | Hãy đợi **${cd}s** để thao tác lại.`);
//     setCooldown(userId, 'stock', 3);

//     const sub = (args[0] || '').toLowerCase();
//     try {
//       await ensureSymbols();
//       await tickPrices(); // cập nhật giá biến động mỗi khi lệnh stock chạy

//       if (!sub || sub === 'help') return help(message);
//       if (sub === 'list') return listCmd(message);
//       if (sub === 'price') return priceCmd(message, (args[1] || '').toUpperCase());
//       if (sub === 'buy') return buyCmd(message, userId, (args[1] || '').toUpperCase(), parseInt(args[2]));
//       if (sub === 'sell') return sellCmd(message, userId, (args[1] || '').toUpperCase(), parseInt(args[2]));
//       if (sub === 'portfolio' || sub === 'pf') return portfolioCmd(message, userId);

//       return help(message);
//     } catch (e) {
//       console.error('Stock cmd error:', e);
//       return message.reply('❌ | Lỗi hệ thống chứng khoán.');
//     }
//   }
// };

// // ===== HELP / LIST / PRICE =====
// async function help(message) {
//   return message.reply([
//     '📈 **Chứng khoán ảo (coke)**',
//     '`!stock list` — danh sách mã & giá',
//     '`!stock price <MÃ>` — xem giá hiện tại',
//     '`!stock buy <MÃ> <SL>` — đặt lệnh mua',
//     '`!stock sell <MÃ> <SL>` — đặt lệnh bán',
//     '`!stock portfolio ` hoặc `pf` — ví cổ phiếu của bạn',
//     '💡 Giá biến động theo thời gian. **Phí giao dịch 10% mỗi lệnh**.'
//   ].join('\n'));
// }

// async function listCmd(message) {
//   const quotes = await listQuotes();
//   if (!quotes.length) return message.reply('Chưa có mã nào.');

//   const lines = quotes.map(q => {
//     const chg = q.price - (q.prevPrice || q.price * 0.99);
//     const pct = (chg / (q.prevPrice || q.price * 0.99) * 100);
//     const sign = chg >= 0 ? '<:up:1405548221580836934>' : '🔻';
//     return `• **${q.symbol}** — ${fmt(q.price)} (${sign} ${chg >= 0 ? '+' : ''}${fmt(chg)} | ${pct.toFixed(2)}%)`;
//   });

//   return message.reply({
//     embeds: [new EmbedBuilder()
//       .setColor('Blue')
//       .setTitle('Danh sách mã & giá')
//       .setDescription(lines.join('\n') || 'Chưa có dữ liệu.')
//     ]
//   });
// }

// async function priceCmd(message, symbol) {
//   if (!symbol) return message.reply('❌ | Cú pháp: `!stock price <MÃ>`');
//   const q = await getQuote(symbol);
//   if (!q) return message.reply('❌ | Mã không tồn tại.');
//   const chg = q.price - (q.prevPrice || q.price * 0.99);
//   const pct = chg / (q.prevPrice || q.price * 0.99) * 100;

//   return message.reply({
//     embeds: [new EmbedBuilder()
//       .setColor(chg >= 0 ? 'Green' : 'Red')
//       .setTitle(`${q.symbol} — ${q.name}`)
//       .setDescription(`Giá hiện tại: **${fmt(q.price)} coke**\nThay đổi: **${chg >= 0 ? '+' : ''}${fmt(chg)}** (${pct.toFixed(2)}%)\nCập nhật: ${vnTime(q.lastUpdate)})`)]
//   });
// }

// // ===== BUY / SELL =====
// async function buyCmd(message, userId, symbol, qty) {
//   if (!symbol || !qty || qty <= 0 || qty > MAX_QTY_PER_ORDER)
//     return message.reply('❌ | Cú pháp: !stock buy <MÃ> <SL>');

//   const q = await getQuote(symbol);
//   if (!q) return message.reply('❌ | Mã không tồn tại.');
//   const price = q.price;
//   const cost = Math.round(price * qty);
//   const fee = Math.max(1, Math.floor(cost * FEE_RATE));
//   const total = cost + fee;

//   if ((await getCoke(userId)) < total) return message.reply(`❌ | Không đủ coke.\n💰 Tổng: ${fmt(total)} coke (bao gồm phí ${fmt(fee)} coke)`);

//   await debitIfEnough(userId, total);
//   await StockOrder.create({ userId, symbol, side: 'BUY', qty, price });

//   return message.reply(`📝 | Đã đặt lệnh **mua** ${qty} **${symbol}** @ **${fmt(price)}**. Tổng: ${fmt(total)} coke (đã gồm phí).`);
// }

// async function sellCmd(message, userId, symbol, qty) {
//   qty = parseInt(qty);
//   if (!symbol || !qty || isNaN(qty) || qty <= 0 || qty > MAX_QTY_PER_ORDER)
//     return message.reply('❌ | Cú pháp: !stock sell <MÃ> <SL>');

//   const holding = await StockHolding.findOne({ userId, symbol });
//   const holdingQty = holding?.qty || 0;
//   if (holdingQty < qty) return message.reply('❌ | Không đủ cổ phiếu để bán.');

//   const q = await getQuote(symbol);
//   if (!q) return message.reply('❌ | Mã không tồn tại.');

//   const price = q.price;
//   const fee = Math.max(1, Math.floor(price * qty * FEE_RATE));
//   const net = Math.round(price * qty * (1 - FEE_RATE));

//   holding.qty -= qty;
//   if (holding.qty <= 0) holding.avgPrice = 0;
//   await holding.save();

//   await StockOrder.create({ userId, symbol, side: 'SELL', qty, price });
//   await PendingWithdrawal.create({
//     userId,
//     amount: net,
//     note: `bán ${qty} ${symbol}`,
//     readyAt: Date.now() + 24 * 60 * 60 * 1000,
//     unlockAt: Date.now() + 24 * 60 * 60 * 1000,
//     claimed: false
//   });

//   return message.reply(`📝 | Đã đặt lệnh **bán** ${qty} **${symbol}** @ **${fmt(price)}**.\n💰 Tiền sẽ về ví sau 24h: **${fmt(net)} coke** (sau trừ phí).`);
// }

// // ===== PORTFOLIO =====
// async function portfolioCmd(message, userId) {
//   const holdings = await StockHolding.find({ userId, qty: { $gt: 0 } });
//   if (!holdings.length) return message.reply('📦 | Ví trống.');

//   let totalMV = 0;
//   const lines = [];

//   for (const h of holdings) {
//     const q = await getQuote(h.symbol);
//     if (!q) continue;

//     const mv = Math.round(q.price * h.qty);
//     const pnl = mv - Math.round(h.avgPrice * h.qty);
//     const pnlPercent = ((q.price - h.avgPrice) / h.avgPrice * 100).toFixed(2);

//     totalMV += mv;

//     lines.push(
//       `• **${h.symbol}** — SL: ${h.qty} | Giá vốn: ${h.avgPrice} | Giá: ${q.price} | MV: ${mv} | PnL: ${pnl >= 0 ? '<:up:1405548221580836934>' : '🔻'} ${pnl} (${pnlPercent}%)`
//     );
//   }

//   return message.reply({
//     embeds: [
//       new EmbedBuilder()
//         .setColor('Blue')
//         .setTitle(`📊 Ví của ${message.member.displayName}`)
//         .setDescription(lines.join('\n') || 'Chưa có dữ liệu.')
//         .addFields({ name: 'Tổng MV', value: fmt(totalMV) + ' coke' })
//     ]
//   });
// }

// // ===== MATCH ORDERS =====
// async function matchOrders() {
//   const orders = await StockOrder.find({ status: 'OPEN' });
//   for (const order of orders) {
//     const q = await getQuote(order.symbol);
//     if (!q) continue;

//     const mv = Math.round(order.qty * q.price);
//     const fee = Math.max(1, Math.floor(mv * FEE_RATE));
//     const net = order.side === 'SELL' ? mv - fee : -mv - fee;

//     if (order.side === 'BUY') {
//       const holding = await StockHolding.findOne({ userId: order.userId, symbol: order.symbol }) || new StockHolding({ userId: order.userId, symbol: order.symbol });
//       const prevQty = holding.qty || 0;
//       const prevAvg = holding.avgPrice || 0;
//       const newQty = prevQty + order.qty;
//       holding.qty = newQty;
//       holding.avgPrice = Number(((prevQty * prevAvg + mv) / newQty).toFixed(4));
//       await holding.save();
//     } else if (order.side === 'SELL') {
//       // tiền đã xử lý trong PendingWithdrawal
//     }

//     await StockTx.create({
//       userId: order.userId,
//       symbol: order.symbol,
//       side: order.side,
//       qty: order.qty,
//       price: q.price,
//       fee,
//       total: net
//     });

//     order.filled = order.qty;
//     order.status = 'FILLED';
//     await order.save();
//   }
// }
// setInterval(matchOrders, 5000);

// // ===== PENDING 24H + DM =====
// async function processPendingWithdrawals() {
//   const pendings = await PendingWithdrawal.find({ readyAt: { $lte: Date.now() }, claimed: false });
//   for (const p of pendings) {
//     await adjustCoke(p.userId, p.amount);
//     p.claimed = true;
//     await p.save();

//     try {
//       const user = await global.client.users.fetch(p.userId);
//       if (user) {
//         await user.send({
//           embeds: [new EmbedBuilder()
//             .setColor('Green')
//             .setTitle('💰 Tiền chứng khoán đã về ví')
//             .setDescription(`Số tiền **${fmt(p.amount)} coke** từ **${p.note}** đã được cộng vào tài khoản của bạn.`)
//             .setFooter({ text: 'Hãy kiểm tra ví bằng lệnh !stock pf' })
//             .setTimestamp()
//           ]
//         });
//       }
//     } catch (e) { console.error('Cannot DM user for pending withdrawal:', e); }
//   }
// }
// setInterval(processPendingWithdrawals, 60 * 1000);
