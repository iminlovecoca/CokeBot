const BaseCommand = require('../../core/BaseCommand');
const User = require('../../models/User');
const config = require('../../data/config');

class TopCommand extends BaseCommand {
  constructor() {
    super({
      name: 'top',
      description: 'Xem bảng xếp hạng theo cash, level, rank, luck, tea hoặc gw',
      usage: `${config.prefix}top [cash|level|rank|luck|tea] [số lượng]`,
      examples: [
        { intent: 'Xem top đại gia coke', command: `${config.prefix}top cash` },
        { intent: 'Xem top level (10 người)', command: `${config.prefix}top level 10` }
      ],
      category: 'user'
    });
  }

  async execute(message, args, client, locator) {
    const userService = locator.get('userService');
    const type = args[0]?.toLowerCase() || 'cash';
    const inputLimit = parseInt(args[1]);
    const limit = (!inputLimit || inputLimit <= 0) ? 5 : Math.min(inputLimit, 50);
    const authorId = message.author.id;
    const authorData = await userService.getUser(authorId);

    let topUsers = [], unit = '', getValue;
    let title = `Bảng Xếp Hạng`;
    const guildName = message.guild?.name || 'Máy chủ';
    const guild = message.guild;

    const baseFilter = {
      isBattleBot: { $ne: true },
      userId: { $not: /^bot_/ },
      vipLevel: { $lte: 0 }
    };

    switch (type) {
      case 'lvl':
      case 'level':
        title = `Top Level - ${guildName}`;
        unit = 'Level';
        getValue = u => u.level || 0;
        topUsers = await User.find(baseFilter, { userId: 1, level: 1, luck: 1, tea: 1, coke: 1, "rpg.name": 1, "rpg.power": 1 }).sort({ level: -1 }).limit(limit).lean();
        break;

      case 'rank':
        title = `Top Rank - ${guildName}`;
        unit = 'Rank';
        getValue = u => u.level || 0;
        topUsers = await User.find(baseFilter, { userId: 1, level: 1, luck: 1, tea: 1, coke: 1, "rpg.name": 1, "rpg.power": 1 }).sort({ level: -1 }).limit(limit).lean();
        break;

      case 'luck':
        title = `Top Luck - ${guildName}`;
        unit = 'Luck';
        getValue = u => u.luck || 0;
        topUsers = await User.find(baseFilter, { userId: 1, level: 1, luck: 1, tea: 1, coke: 1, "rpg.name": 1, "rpg.power": 1 }).sort({ luck: -1 }).limit(limit).lean();
        break;

      case 'tea':
        title = `Top Tea - ${guildName}`;
        unit = 'Tea';
        getValue = u => u.tea || 0;
        topUsers = await User.find(baseFilter, { userId: 1, level: 1, luck: 1, tea: 1, coke: 1, "rpg.name": 1, "rpg.power": 1 }).sort({ tea: -1 }).limit(limit).lean();
        break;

      case 'rpg':
        title = `Top Lực Chiến RPG - ${guildName}`;
        unit = 'Lực chiến';
        getValue = u => Math.floor(u.rpg?.power || 0);
        topUsers = await User.find({ ...baseFilter, "rpg.classKey": { $ne: null }, "rpg.godsetBackup": null }, { userId: 1, "rpg.power": 1, "rpg.name": 1, level: 1, luck: 1, tea: 1, coke: 1 }).sort({ "rpg.power": -1 }).limit(limit).lean();
        break;

      case 'cash':
      default:
        title = `Top Coke - ${guildName}`;
        unit = 'Coke';
        getValue = u => u.coke || 0;
        topUsers = await User.find(baseFilter, { userId: 1, level: 1, luck: 1, tea: 1, coke: 1, "rpg.name": 1, "rpg.power": 1 }).sort({ coke: -1 }).limit(limit).lean();
        break;
    }

    if (!topUsers || topUsers.length === 0)
      return message.reply('❌ **|** Không có dữ liệu người chơi nào.').catch(() => {});

    // Resolve user display names safely without blocking on GuildMembersTimeout
    // or making N sequential Discord API calls (client.users.fetch per user is slow).
    const userNames = [];
    for (const u of topUsers) {
      const member = guild?.members?.cache?.get(u.userId);
      let username = member?.user?.username || client.users?.cache?.get(u.userId)?.username || null;
      if (username) {
        username = `@${username}`;
      } else if (u.rpg?.name) {
        username = `@${u.rpg.name}`;
      } else {
        username = `@Người chơi #${(u.userId || "").slice(-4)}`;
      }
      userNames.push(username);
    }

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
      const username = userNames[i] || 'Ẩn danh';
      const value = getValue(u).toLocaleString();

      if (type === 'rank') {
        const icon = userService.getRankEmoji(u.level);
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
    return message.channel.send(text).catch(() => {});
  }
}

module.exports = new TopCommand();
