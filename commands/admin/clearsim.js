const StockSymbol = require('../../models/StockSymbol');
const StockOrder = require('../../models/StockOrder');
const StockHolding = require('../../models/StockHolding');
const StockTx = require('../../models/StockTx');

module.exports = {
    name: 'clearsim',
    description: 'Xoá toàn bộ dữ liệu stock mô phỏng (symbol, order, holding, transaction)',
    async execute(message, args) {
        try {
            // 1. Lấy danh sách symbol mô phỏng
            const simSymbols = await StockSymbol.find({
                $or: [
                    { symbol: /^SIM_/i },  // Tên bắt đầu bằng SIM_
                    { isSimulated: true }  // Hoặc flag đánh dấu mô phỏng
                ]
            }).select('symbol');

            if (simSymbols.length === 0) {
                return message.channel.send('✅ Không có symbol mô phỏng nào để xoá.');
            }

            const symbolList = simSymbols.map(s => s.symbol);

            // 2. Xoá trong từng collection
            const deletedSymbols = await StockSymbol.deleteMany({ symbol: { $in: symbolList } });
            const deletedOrders = await StockOrder.deleteMany({ symbol: { $in: symbolList } });
            const deletedHoldings = await StockHolding.deleteMany({ symbol: { $in: symbolList } });
            const deletedTxs = await StockTx.deleteMany({ symbol: { $in: symbolList } });

            await message.channel.send(
                `🗑 Đã xoá dữ liệu mô phỏng:\n` +
                `• Symbols: **${deletedSymbols.deletedCount}**\n` +
                `• Orders: **${deletedOrders.deletedCount}**\n` +
                `• Holdings: **${deletedHoldings.deletedCount}**\n` +
                `• Transactions: **${deletedTxs.deletedCount}**`
            );
        } catch (err) {
            console.error('❌ Lỗi khi xoá stock mô phỏng:', err);
            await message.channel.send('⚠ Có lỗi xảy ra khi xoá dữ liệu stock mô phỏng.');
        }
    }
};
