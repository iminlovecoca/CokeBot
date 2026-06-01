const { buyItem } = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

module.exports = {
  name: "buy",
  description: "Mua một vật phẩm từ cửa hàng.",
  usage: `${config.prefix}buy <id> [số lượng]`,
  examples: [
    {
      intent: "Mua 1 vật phẩm (ví dụ: sun-stone)",
      command: `${config.prefix}buy sun-stone`,
    },
    {
      intent: "Mua 3 vật phẩm cùng lúc",
      command: `${config.prefix}buy sun-stone 3`,
    },
  ],
  async execute(message, args) {
    const itemId = args[0];
    let quantity = 1; // Default quantity is 1

    if (!itemId) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn cần chỉ định ID của vật phẩm để mua. Ví dụ: \`${config.prefix}buy lure-flame\``,
      );
    }
    if (args[1]) {
      quantity = parseInt(args[1]);
      if (isNaN(quantity) || quantity <= 0) {
        throw new UserFriendlyError(
          `${config.emoji.no} Số lượng không hợp lệ. Vui lòng nhập một số lớn hơn 0.`,
        );
      }
    }

    const { item, cost } = await buyItem(
      message.client,
      message.author.id,
      itemId,
      quantity,
    );
    await message.reply(
      `${config.emoji.yes} **${message.author.username}** đã mua thành công **${quantity} x ${item.name}** ${item.emoji} với giá ${config.emoji.money} **${cost}**!`,
    );
  },
};
