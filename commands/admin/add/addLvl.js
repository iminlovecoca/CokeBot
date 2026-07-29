const User = require("../../../models/User");
const config = require("../../../data/config");
const { hasRpgCharacter, getRpgRank, calculateRpgPower } = require("../../../utils/rpgUtil");
const BaseCommand = require("../../../core/BaseCommand");
class AddLvlCommand extends BaseCommand {
  constructor() {
    super({
  name: "setlvl",
  description:
    "📌 Chỉ owner mới có thể chỉnh cấp độ người chơi (có thể set/gỡ VIP hoặc chỉnh cấp độ RPG)",
        cooldown: 0
    });
  }
  async execute(message, args) {
    const { isOwner } = require("../../../utils/userUtil");
    if (!isOwner(message.author.id)) {
      return message.reply("❌ | Lệnh này chỉ dành cho **owner**.");
    }
    const isRpg = args.some(arg => arg.toLowerCase() === "rpg");
    if (isRpg) {
      const cleanArgs = args.filter(arg => arg.toLowerCase() !== "rpg");
      const target = message.mentions.users.first() || (cleanArgs[0] ? await message.client.users.fetch(cleanArgs[0]).catch(() => null) : null);
      const level = cleanArgs[1] ? parseInt(cleanArgs[1], 10) : NaN;
      if (!target || isNaN(level) || level <= 0) {
        return message.reply(
          `❌ | Dùng đúng cú pháp: \`${config.prefix}setlvl rpg @user <level>\` hoặc \`${config.prefix}setlvl @user <level> rpg\``,
        );
      }
      const userData = await User.findOne({ userId: target.id });
      if (!userData || !hasRpgCharacter(userData)) {
        return message.reply(`❌ | Người dùng **${target.username}** chưa chọn Class RPG (chưa tạo nhân vật).`);
      }
      const oldLevel = userData.rpg.level || 1;
      userData.rpg.level = level;
      userData.rpg.rank = getRpgRank(level);
      userData.rpg.power = calculateRpgPower(userData);
      userData.markModified("rpg");
      await userData.save();
      return message.reply(
        `✅ | Đã đặt **level RPG ${level}** (Rank: **${userData.rpg.rank}**) cho **${target.username}**.\n` +
        `📊 Cấp độ cũ: \`${oldLevel}\` → Cấp độ mới: \`${level}\` (Giữ nguyên mức exp hiện tại: \`${userData.rpg.exp || 0}\`).\n` +
        `⚔️ Lực chiến mới: \`${Math.floor(userData.rpg.power).toLocaleString()}\``
      );
    } else {
      const [mention, levelStr, flag] = args;
      const level = parseInt(levelStr);
      const target = message.mentions.users.first();
      if (!target || isNaN(level) || level <= 0) {
        return message.reply(
          `❌ | Dùng đúng cú pháp: \`${config.prefix}setlvl @user <level> [vip/novip]\``,
        );
      }
      const userData = await User.findOneAndUpdate(
        { userId: target.id },
        { $set: { level: level, xp: 0 } },
        { new: true, upsert: true },
      );
      let cokeReward = 0;
      for (let i = 1; i <= level; i++) {
        cokeReward += 10000 + (i - 1) * 5000;
      }
      userData.coke += cokeReward;
      let vipNote = "";
      if (flag?.toLowerCase() === "vip") {
        userData.vipLevel = 1;
        vipNote = "<:Vip:1395101517421215744> Gán thêm quyền **VIP**.";
      } else if (flag?.toLowerCase() === "novip") {
        userData.vipLevel = 0;
        vipNote = "🚫 Đã **gỡ quyền VIP**.";
      }
      await userData.save();
      return message.reply(
        `✅ | Đã đặt **level ${level}** cho **${target.username}**.\n` +
          `💰 Thưởng thêm **${cokeReward.toLocaleString()} coke** (cộng vào số dư hiện tại).\n` +
          (vipNote ? vipNote : ""),
      );
    }
    }
}
module.exports = new AddLvlCommand();