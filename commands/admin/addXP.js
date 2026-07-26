const User = require("../../models/User");

function getXpNeeded(level) {
  return 2000 + (level - 1) * 1000;
}

function getRankEmoji(level) {
  if (level >= 71) return "<a:divine:1530878610515165365>";
  if (level >= 61) return "<a:ancient:1530878606656540814>";
  if (level >= 51) return "<a:mythic:1530878614843686912>";
  if (level >= 41) return "<:legendary:1530878570858287205>";
  if (level >= 31) return "<:epic:1530878567955566642>";
  if (level >= 21) return "<:rare:1530878574104547378>";
  return "<:common:1530878565489311826>";
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
