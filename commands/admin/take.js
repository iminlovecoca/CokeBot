const { getUser, isDev, isAdmin } = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const { formatVNCurrency } = require("../../utils/format");
const config = require("../../data/config");

module.exports = {
  name: "take",
  description: "Rút coke hoặc thu hồi vật phẩm từ người dùng.",
  usage: `${config.prefix}take @user <coke> hoặc ${config.prefix}take item @user <itemId> [số lượng]`,
  async execute(message, args) {
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không đủ quyền hạn để sử dụng lệnh.`,
      );
    }

    const isItemMode = args[0]?.toLowerCase() === "item";

    if (isItemMode) {
      const targetUser =
        message.mentions.users.first() ||
        (await message.client.users.fetch(args[1]).catch(() => null));
      const itemId = args[2]?.toLowerCase();
      let qty = parseInt(args[3]);
      if (isNaN(qty)) qty = 1;

      if (!targetUser || !itemId || qty <= 0) {
        throw new UserFriendlyError(
          `${config.emoji.no} Vui lòng nhập đúng cú pháp: \`${config.prefix}take item @user <itemId> [số lượng]\``,
        );
      }

      const item = message.client.allItems.find((i) => i.item_id === itemId);
      if (!item) {
        throw new UserFriendlyError(
          `${config.emoji.no} Vật phẩm không tồn tại trong hệ thống.`,
        );
      }

      const user = await getUser(targetUser.id);
      if (!user.inventory) {
        user.inventory = new Map();
      }

      const currentQty = user.inventory.get(itemId) || 0;
      if (currentQty < qty) {
        throw new UserFriendlyError(
          `${config.emoji.no} Người dùng không có đủ vật phẩm này để thu hồi! (Hiện có: **${currentQty}**).`,
        );
      }

      const newQty = currentQty - qty;
      if (newQty <= 0) {
        user.inventory.delete(itemId);
      } else {
        user.inventory.set(itemId, newQty);
      }
      user.markModified("inventory");
      await user.save();

      return message.reply(
        `✅ Đã thu hồi **${qty} x ${item.name}** ${item.emoji} từ **<@${targetUser.id}>**.`
      );
    } else {
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
    }
  },
};
