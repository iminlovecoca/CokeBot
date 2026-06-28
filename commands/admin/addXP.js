const User = require("../../models/User");

function getXpNeeded(level) {
  return 2000 + (level - 1) * 1000;
}

function getRankEmoji(level) {
  if (level >= 61) return "<:Ancient:1390024806535004333>";
  if (level >= 51) return "<:Legendary:1390024789279772833>";
  if (level >= 41) return "<:Mysthic:1390024772200567026>";
  if (level >= 31) return "<:Epic:1390024749517770832>";
  if (level >= 21) return "<:Rare:1390024624380706916>";
  if (level >= 11) return "<:Uncommon:1390024590347997245>";
  return "<:Common:1390024512774471902>";
}

const BaseCommand = require('../../core/BaseCommand');

class AddXPCommand extends BaseCommand {
  constructor() {
    super({
  name: "addxp",
  description: "Thêm XP cho 1 người chơi (admin only)",
        cooldown: 0
    });
  }

  async execute(message, args) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ | Bạn không có quyền dùng lệnh này.");
    }

    if (args.length < 2) {
      return message.reply(
        `❌ | Cú pháp: \`${config.prefix}addxp <@user|userId> <số XP>\``,
      );
    }

    const target =
      message.mentions.users.first() ||
      (await message.client.users.fetch(args[0]).catch(() => null));
    if (!target) return message.reply("❌ | Không tìm thấy user.");

    const userId = target.id;
    const xpToAdd = parseInt(args[1], 10);
    if (isNaN(xpToAdd) || xpToAdd <= 0) {
      return message.reply("❌ | Số XP phải là số dương.");
    }

    let user = await User.findOne({ userId });
    if (!user) {
      user = await User.create({
        userId,
        level: 1,
        xp: 0,
        coke: 0,
        dailyXp: 0,
      });
    }

    user.xp += xpToAdd;
    let leveledUp = false;
    let oldLevel = user.level;
    let totalReward = 0;

    while (user.xp >= getXpNeeded(user.level)) {
      user.xp -= getXpNeeded(user.level);
      user.level++;
      const reward = 10000 + (user.level - 1) * 5000;
      totalReward += reward;
      user.coke += reward;
      leveledUp = true;
    }

    await user.save();

    let msg = `✅ Đã cộng \`${xpToAdd}\` XP cho **<@${userId}>**.\n`;
    msg += `📊 Level hiện tại: \`${user.level}\` (${user.xp}/${getXpNeeded(user.level)} XP)`;

    if (leveledUp) {
      const emoji = getRankEmoji(user.level);
      message.channel.send(
        `🎉 **Chúc mừng <@${userId}> đã lên cấp!**\n` +
          `📈 Level: \`${oldLevel} → ${user.level}\`\n` +
          `💰 Thưởng: \`${totalReward.toLocaleString()} coke\`\n` +
          `🏅 Rank: ${emoji}`,
      );
    }

    return message.channel.send(msg);
    }
}

module.exports = new AddXPCommand();
