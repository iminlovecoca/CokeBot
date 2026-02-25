const User = require('../../models/User');
const StockHolding = require('../../models/StockHolding');
const StockSymbol = require('../../models/StockSymbol');
const { getUser, getRankEmoji } = require('../../utils/userUtil')
const config = require('../../data/config')

module.exports = {
  name: 'top',
  description: 'Xem bảng xếp hạng theo cash, level, rank, luck, tea, stock hoặc gw',
  usage: `${config.prefix}top [cash|level|rank|luck|tea|stock] [số lượng]`,
  examples: [
    { intent: 'Xem top đại gia coke', command: `${config.prefix}top cash` },
    { intent: 'Xem top level (10 người)', command: `${config.prefix}top level 10` }
  ],

  async execute(message, args) {
    const type = args[0]?.toLowerCase() || 'cash';
    const inputLimit = parseInt(args[1]);
    const limit = (!inputLimit || inputLimit <= 0) ? 5 : Math.min(inputLimit, 50);
    const authorId = message.author.id;
    const authorData = await getUser(authorId);

    let topUsers = [], unit = '', getValue;
    let title = `Bảng Xếp Hạng`;
    const guildName = message.guild?.name || 'Máy chủ';
    const guild = message.guild;

    switch (type) {
      case 'stock':
        title = `Top Chứng Khoán - ${guildName}`;
        unit = 'MV';

        const holdings = await StockHolding.find({ qty: { $gt: 0 } });
        const symbols = await StockSymbol.find({});
        const priceMap = {};
        for (const s of symbols) priceMap[s.symbol] = s.price;

        const userMap = {};
        for (const h of holdings) {
          const curPrice = priceMap[h.symbol] || 0;
          const mv = h.qty * curPrice;
          if (!userMap[h.userId]) userMap[h.userId] = 0;
          userMap[h.userId] += mv;
        }

        topUsers = Object.entries(userMap)
          .map(([userId, totalMV]) => ({ userId, totalMV }))
          .sort((a, b) => b.totalMV - a.totalMV)
          .slice(0, 50);

        getValue = u => u.totalMV || 0;
        break;

      case 'lvl':
      case 'level':
        title = `Top Level - ${guildName}`;
        unit = 'Level';
        getValue = u => u.level || 0;
        topUsers = await User.find({ vipLevel: { $lte: 0 } }).sort({ level: -1 });
        break;

      case 'rank':
        title = `Top Rank - ${guildName}`;
        unit = 'Rank';
        getValue = u => u.level || 0;
        topUsers = await User.find({ vipLevel: { $lte: 0 } }).sort({ level: -1 });
        break;

      case 'luck':
        title = `Top Luck - ${guildName}`;
        unit = 'Luck';
        getValue = u => u.luck || 0;
        topUsers = await User.find({ vipLevel: { $lte: 0 } }).sort({ luck: -1 });
        break;

      case 'tea':
        title = `Top Tea - ${guildName}`;
        unit = 'Tea';
        getValue = u => u.tea || 0;
        topUsers = await User.find({ vipLevel: { $lte: 0 } }).sort({ tea: -1 });
        break;

      case 'cash':
      default:
        title = `Top Coke - ${guildName}`;
        unit = 'Coke';
        getValue = u => u.coke || 0;
        topUsers = await User.find({ vipLevel: { $lte: 0 } }).sort({ coke: -1 });
        break;
    }

    if (!topUsers || topUsers.length === 0)
      return message.reply('❌ **|** Không có dữ liệu người chơi nào.');

    topUsers = topUsers.filter(u => {
      const member = guild.members.cache.get(u.userId);
      return !!member;
    });

    if (topUsers.length === 0)
      return message.reply('❌ **|** Không có thành viên nào trong server để hiển thị.');

    const userRankIndex = topUsers.findIndex(u => u.userId === authorId);
    const userValue = userRankIndex >= 0 ? getValue(topUsers[userRankIndex]) : null;
    const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null;

    let text = `\`\`\`md\n< ${title} (${limit}) >\n`;

    if (authorData?.vipLevel > 0) {
      text += '> Bạn đang ở chế độ VIP, không hiển thị trên bảng xếp hạng.\n\n';
    } else if (userRank) {
      text += `> Xếp hạng: ${userRank}\n> ${unit}: ${userValue?.toLocaleString() ?? '0'}\n\n`;
    }

    for (let i = 0; i < Math.min(limit, topUsers.length); i++) {
      const u = topUsers[i];
      const member = guild.members.cache.get(u.userId);
      const username = member ? `@${member.user.username}` : 'Ẩn danh';
      const value = getValue(u).toLocaleString();

      if (type === 'rank') {
        const icon = getRankEmoji(u.level);
        text += `#${i + 1}\t${username}\n\t\t${icon} ${unit}: ${value}\n`;
      } else {
        text += `#${i + 1}\t${username}\n\t\t${unit}: ${value}\n`;
      }
    }

    const now = new Date();
    const dateStr = now.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    text += `\n${dateStr}\n\`\`\``;
    return message.channel.send(text);
  }
};
