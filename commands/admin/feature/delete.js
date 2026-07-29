const User = require("../../../models/User");
const config = require("../../../data/config");
const { isOwner } = require("../../../utils/userUtil");
const BaseCommand = require("../../../core/BaseCommand");

async function resetUserData(user) {
  const keepLevel = user.level;
  const keepXp = user.xp;
  user.coke = 0;
  user.cokeGC = 0;
  user.dailyStreak = 0;
  user.lastDaily = null;
  user.dailyXp = 0;
  user.lastXpReset = null;
  user.vipLevel = 0;
  user.vipUntil = null;
  user.bannedUntil = null;
  user.bannedReason = "";
  user.cookieDailyCount = 0;
  user.cookieDailyDate = "";
  user.cookie = 0;
  user.tea = 0;
  user.luck = 0;
  user.transferHistory = [];
  user.receiveHistory = [];
  user.dailyGive = {};
  user.dailyReceive = {};
  user.lastWork = 0;
  user.zoo = {};
  user.zooPoints = 0;
  user.huntStones = { boost: {}, multi: {}, fixed: {} };
  user.inventory = new Map();
  user.last_cokemon_id = 0;
  user.cokedex = new Map();
  user.active_cokemon_id = null;
  user.anticheat = { verification_code: null, last_flag_reason: null, verification_attempts: 0 };
  user.warned = false;
  user.warnedAt = null;
  user.noituStats = {};
  user.noituWins = 0;
  user.noituCorrect = 0;
  user.noituAttempts = 0;
  user.noituLastPlayedAt = null;
  user.rpg = {};
  user.level = keepLevel;
  user.xp = keepXp;
  await user.save();
}

class DeleteCommand extends BaseCommand {
  constructor() {
    super({
      name: "delete",
      description: "Reset dữ liệu người chơi (chỉ dành cho Owner)",
      cooldown: 0
    });
  }
  async execute(message, args) {
    if (!isOwner(message.author.id))
      return message.reply("❌ | Lệnh này chỉ dành cho **Owner**.");
    const target = message.mentions.users.first();
    const isDeleteAll = args[0] === "all";
    if (isDeleteAll) {
      const confirm = await message.reply(
        "⚠️ Bạn có chắc muốn reset toàn bộ dữ liệu người chơi? Gõ `yes` để xác nhận.",
      );
      const filter = (m) => m.author.id === message.author.id;
      const collected = await message.channel.awaitMessages({
        filter,
        max: 1,
        time: 15000,
      });
      if (
        !collected.size ||
        collected.first().content.toLowerCase() !== "yes"
      ) {
        return message.channel.send("❌ Huỷ thao tác reset toàn bộ.");
      }
      const users = await User.find({});
      for (const u of users) {
        await resetUserData(u);
      }
      return message.channel.send(
        "✅ Đã reset toàn bộ dữ liệu người chơi trong DB!",
      );
    }
    if (!target)
      return message.reply(
        "❌ | Vui lòng tag người dùng để reset. Ví dụ: `xdelete @user` hoặc `xdelete all`",
      );
    const user = await User.findOne({ userId: target.id });
    if (!user) return message.reply("❌ | Không tìm thấy người dùng trong DB.");
    await resetUserData(user);
    return message.reply(`✅ | Đã reset toàn bộ dữ liệu của ${target.username}.`);
  }
}
module.exports = new DeleteCommand();