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
          intent: "Mở tối đa 20 hộp vũ khí",
          command: `${config.prefix}wc 20`,
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

    const userRepository = message.client.services.get("userRepository");
    const user = await userRepository.getOrCreate(message.author.id);
    const wcCount = user.inventory.get("wc") || 0;

    if (wcCount <= 0) {
      return message.reply(`${config.emoji.no} Bạn không có hộp vũ khí (wc) nào để mở.`);
    }

    if (quantity === "all") {
      quantity = Math.min(20, wcCount);
    }

    if (quantity > 20) {
      return message.reply(`⚠️ **|** Giới hạn mở tối đa là **20** hộp vũ khí mỗi lần.`);
    }

    const { checkAndSetCooldown, notifyCooldown } = require("../../utils/cooldown");
    const remaining = checkAndSetCooldown(message.author.id, "wc_open", 15);
    if (remaining > 0) {
      return notifyCooldown(message, remaining);
    }

    const { resultMessage } = await useItem(
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
