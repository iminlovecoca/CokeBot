const { useItem } = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

module.exports = {
  name: "use",
  description: "Sử dụng một vật phẩm từ túi đồ của bạn.",
  usage: `${config.prefix}use <item-id> [số lượng] [target_id]`,
  examples: [
    {
      intent: "Sử dụng 1 vật phẩm (ví dụ: catch-net)",
      command: `${config.prefix}use catch-net`,
    },
    {
      intent: "Sử dụng kẹo hiếm (rare-candy) cho Cokemon ID 12",
      command: `${config.prefix}use rare-candy 1 12`,
    },
  ],
  async execute(message, args) {
    const itemId = args[0]?.toLowerCase();
    if (!itemId) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn cần chỉ định ID của vật phẩm để sử dụng. Ví dụ: \`${config.prefix}use lure-flame\``,
      );
    }

    let targetId = null;
    let quantity = 1;
    if (itemId === "rare-candy") {
      targetId = args[1];
      quantity = parseInt(args[2]) || 1;
    } else {
      targetId = null;
      quantity = parseInt(args[1]) || 1;
    }

    if (quantity <= 0) {
      throw new UserFriendlyError(
        `${config.emoji.no} Số lượng phải là một số dương.`,
      );
    }

    const { resultMessage, itemType } = await useItem(
      message.client,
      message.author,
      message.channel.id,
      itemId,
      targetId,
      quantity,
    );
    if (itemType === "lure") {
      await message.channel.send(resultMessage);
    } else {
      await message.reply(resultMessage);
    }
  },
};
