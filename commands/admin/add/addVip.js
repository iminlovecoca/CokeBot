const User = require("../../../models/User");
require("dotenv").config();
const BaseCommand = require("../../../core/BaseCommand");
class AddVipCommand extends BaseCommand {
  constructor() {
    super({
  name: "setvip",
  description: "Chỉ **Owner** được dùng để set hoặc gỡ VIP cho người chơi",
        cooldown: 0
    });
  }
  async execute(message, args) {
    if (message.author.id !== process.env.OWNER_ID) {
      return message.reply("❌ Lệnh này chỉ dành cho **Owner** bot.");
    }
    const [mode, targetArg] = args;
    let removeMode = false;
    let target;
    if (mode?.toLowerCase() === "remove") {
      removeMode = true;
      target = targetArg;
    } else {
      target = mode;
    }
    if (!target) {
      return message.reply(
        `⚠️ Dùng đúng cú pháp:\n\`${config.prefix}setvip all\`\n\`${config.prefix}setvip <userId>\`\n\`${config.prefix}setvip remove all\`\n\`${config.prefix}setvip remove <userId>\``,
      );
    }
    const vipLevel = removeMode ? 0 : 1;
    try {
      if (target.toLowerCase() === "all") {
        const result = await User.updateMany({}, { $set: { vipLevel } });
        return message.reply(
          `✅ Đã ${removeMode ? "xóa VIP" : "set VIP"} cho **${result.modifiedCount}** người dùng.`,
        );
      } else {
        const userId = target.replace(/[<@!>]/g, "");
        const user = await User.findOneAndUpdate(
          { userId },
          { $set: { vipLevel } },
          { new: true, upsert: true },
        );
        if (!user) return message.reply("❌ Không tìm thấy người dùng.");
        return message.reply(
          `✅ Đã ${removeMode ? "xóa VIP" : "set VIP"} cho người dùng <@${userId}>.`,
        );
      }
    } catch (err) {
      console.error(err);
      return message.reply("❌ Có lỗi xảy ra khi xử lý VIP.");
    }
    }
}
module.exports = new AddVipCommand();