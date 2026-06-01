const { getUser, isDev, isAdmin } = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const { formatVNCurrency } = require("../../utils/format");
const config = require("../../data/config");

module.exports = {
  name: "take",
  description: "Rút coke từ người dùng.",
  async execute(message, args) {
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không đủ quyền hạn để sử dụng lệnh.`,
      );
    }

    const targetUser =
      message.mentions.users.first() ||
      (await message.client.users.fetch(args[0]).catch(() => null));
    const amount = parseInt(args[1]);
    if (!targetUser || isNaN(amount) || amount <= 0) {
      throw new UserFriendlyError(
        `${config.emoji.no} Vui lòng nhập đúng cú pháp: \`${config.prefix}take @user <coke>\``,
      );
    }

    const user = await getUser(targetUser.id);
    let taken = 0;
    if (user.coke >= amount) {
      user.coke -= amount;
      taken = amount;
    } else {
      throw new UserFriendlyError(
        `${config.emoji.no} Người dùng hiện không đủ coke!`,
      );
    }
    await user.save();
    await message.reply(
      `💸 Đã thu hồi **${formatVNCurrency(taken)} coke** từ **<@${targetUser.id}>**.`,
    );
  },
};
