const { getUser, isDev } = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

module.exports = {
  name: "unban",
  description: "Gỡ cấm người dùng khỏi bot.",
  usage: `${config.prefix}unban <@user|userId>`,
  async execute(message, args) {
    if (!isDev(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không có quyền dùng lệnh này!`,
      );
    }

    const target =
      message.mentions.users.first() ||
      (await message.client.users.fetch(args[0]).catch(() => null));
    if (!target) {
      throw new UserFriendlyError(
        `${config.emoji.no} Không tìm thấy người dùng.`,
      );
    }

    const user = await getUser(target.id);
    if (!user.bannedUntil || user.bannedUntil < new Date()) {
      throw new UserFriendlyError(
        `${config.emoji.no} Người dùng này hiện không bị cấm.`,
      );
    }

    user.bannedUntil = null;
    if (user.anticheat) {
      user.anticheat.verification_code = null;
      user.anticheat.last_flag_reason = null;
      user.anticheat.verification_attempts = 0;
    }
    await user.save();
    await message.reply(`${config.emoji.yes} Đã gỡ cấm cho <@${target.id}>.`);
  },
};
