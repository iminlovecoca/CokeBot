const BaseCommand = require("../../core/BaseCommand");
const { useItem } = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

class WcCommand extends BaseCommand {
  constructor() {
    super({
      name: "wc",
      description: "Mở hộp vũ khí (wc) nhanh.",
      usage: `${config.prefix}wc [số lượng / all]`,
      examples: [
        {
          intent: "Mở 1 hộp vũ khí",
          command: `${config.prefix}wc`,
        },
        {
          intent: "Mở 5 hộp vũ khí",
          command: `${config.prefix}wc 5`,
        },
        {
          intent: "Mở toàn bộ hộp vũ khí",
          command: `${config.prefix}wc all`,
        },
      ],
      cooldown: 0
    });
  }
  async execute(message, args) {
    let quantity = 1;
    if (args[0]?.toLowerCase() === "all") {
      quantity = "all";
    } else if (args[0]) {
      quantity = parseInt(args[0]) || 1;
    }

    if (quantity !== "all" && quantity <= 0) {
      throw new UserFriendlyError(
        `${config.emoji.no} Số lượng phải là một số dương hoặc \`all\`.`,
      );
    }

    const { resultMessage, itemType } = await useItem(
      message.client,
      message.author,
      message.channel.id,
      "wc",
      null,
      quantity,
    );

    if (resultMessage) {
      await message.reply(resultMessage);
    }
  }
}

module.exports = new WcCommand();
