const User = require('../../models/User');
const StockHolding = require('../../models/StockHolding');

function getRankEmoji(level) {
  if (level <= 10) return 'Common';
  if (level <= 20) return 'Uncommon';
  if (level <= 30) return 'Rare';
  if (level <= 40) return 'Epic';
  if (level <= 50) return 'Mysthic';
  if (level <= 60) return 'Legendary';
  return 'Ancient';
}

module.exports = {
  name: 'top',
  description: 'Xem bảng xếp hạng theo cash, level, rank, luck, tea hoặc stock',

  async execute(message, args) {
    const type = args[0]?.toLowerCase() || 'cash';
    const inputLimit = parseInt(args[1]);
    const limit = (!inputLimit || inputLimit <= 0) ? 5 : Math.min(inputLimit, 50);
    const authorId = message.author.id;
    const authorData = await User.findOne({ userId: authorId });

    let topUsers = [], unit = '', getValue;
    let title = `Bảng Xếp Hạng`;
    const guildName = message.guild?.name || 'Máy chủ';

    switch (type) {
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

      case 'stock':
        title = `Top Chứng Khoán - ${guildName}`;
        unit = 'MV';
        // Lấy tổng giá trị cổ phiếu của người chơi
        const agg = await StockHolding.aggregate([
          { $match:{ qty:{$gt:0} } },
          { $group:{ _id:'$userId', totalMV:{ $sum:{ $multiply:['$qty','$avgPrice'] } } } },
          { $sort:{ totalMV:-1 } },
          { $limit: 50 }
        ]);
        topUsers = [];
        for(const g of agg){
          topUsers.push({ userId:g._id, totalMV:g.totalMV });
        }
        getValue = u => u.totalMV || 0;
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
      return message.reply('❌ | Không có dữ liệu người chơi nào.');

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
      const fetchedUser = await message.client.users.fetch(u.userId).catch(() => null);
      const username = fetchedUser ? `@${fetchedUser.username}` : 'Người chơi đã rời';
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
