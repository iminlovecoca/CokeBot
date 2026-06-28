const User = require("../../models/User");
const {
  isDev,
  addToBlacklist,
  removeFromBlacklist,
} = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

const BaseCommand = require('../../core/BaseCommand');

class BlacklistCommand extends BaseCommand {
  constructor() {
    super({
  name: "blacklist",
  description: "Thêm hoặc xóa người dùng khỏi danh sách đen đặc biệt.",
  usage: `${config.prefix}blacklist <add|remove> <@user>`,
  hidden: true,
        cooldown: 0
    });
  }

  async execute(message, args) {
    if (!isDev(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không đủ quyền hạn để sử dụng lệnh.`,
      );
    }

    const [action, mention] = args;
    const targetUser = message.mentions.users.first();
    if (!action || !["add", "remove"].includes(action.toLowerCase())) {
      throw new UserFriendlyError(
        `${config.emoji.no} Vui lòng chỉ định hành động: \`add\` hoặc \`remove\`.`,
      );
    }
    if (!targetUser) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn phải tag một người dùng.`,
      );
    }

    if (action.toLowerCase() === "add") {
      await addToBlacklist(targetUser.id, message);
      await message.reply(
        `${config.emoji.yes} **${targetUser.tag}** đã được thêm vào danh sách đen.`,
      );
    } else {
      await removeFromBlacklist(targetUser.id, message);
      await message.reply(
        `${config.emoji.yes} **${targetUser.tag}** đã được xóa khỏi danh sách đen.`,
      );
    }
    }
}

module.exports = new BlacklistCommand();
