const { getUser, isDev } = require("../../utils/userUtil");
const { formatDateTimeToVietnamese } = require("../../utils/miscUtil");
const { DateTime } = require("luxon");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

module.exports = {
  name: "ban",
  description: "Cấm người dùng sử dụng bot.",
  usage: `\`${config.prefix}ban <@user|userId> <số_giờ> [lý_do]\``,
  examples: `${config.prefix}ban @user 2.5 Spamming\n${config.prefix}ban <userId> 72`,
  async execute(message, args) {
    if (!isDev(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không có quyền dùng lệnh này!`,
      );
    }

    const target =
      message.mentions.users.first() ||
      (await message.client.users.fetch(args[0]).catch(() => null));
    const durationHours = parseFloat(args[1]);
    const reason = args.slice(2).join(" ") || "Không có lý do cụ thể.";
    if (!target || isNaN(durationHours) || durationHours <= 0) {
      throw new UserFriendlyError(
        `${config.emoji.no} Cú pháp không hợp lệ. Dùng: \`${this.usage}\``,
      );
    }

    if (isDev(target.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không thể cấm một quản trị viên khác!`,
      );
    }

    const user = await getUser(target.id);
    const bannedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    user.bannedUntil = bannedUntil;

    if (!user.anticheat) user.anticheat = {};
    user.anticheat.verification_code = null;
    user.anticheat.last_flag_reason = `Banned by admin: ${reason}`;
    user.anticheat.verification_attempts = 0;
    await user.save();
    message.client.bannedUsersCache?.set(target.id, bannedUntil.getTime());
    message.client.verificationCache?.delete(target.id);

    const banExpirationDate = formatDateTimeToVietnamese(
      DateTime.fromJSDate(new Date(user.bannedUntil)),
    );
    await message.reply(
      `🔒 Đã cấm <@${target.id}> sử dụng bot trong **${durationHours} giờ** (đến ${banExpirationDate}).\n**Lý do:** ${reason}`,
    );
  },
};
