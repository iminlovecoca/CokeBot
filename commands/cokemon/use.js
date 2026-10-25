const { useItem, getUser } = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const { isGemId } = require("../../data/gems");
const { equipMultipleGems, formatActiveGemsBadges } = require("../../utils/gemUtil");
const config = require("../../data/config");

const BaseCommand = require("../../core/BaseCommand");

class UseCommand extends BaseCommand {
  constructor() {
    super({
      name: "use",
      description: "Sử dụng một vật phẩm hoặc kích hoạt ngọc săn thú từ túi đồ của bạn.",
      usage: `${config.prefix}use <item-id> [số lượng] [target_id] hoặc ${config.prefix}use <gem_id1> [gem_id2] [gem_id3]`,
      examples: [
        {
          intent: "Kích hoạt 1 ngọc săn thú (ví dụ: ngọc săn Common #51)",
          command: `${config.prefix}use 51`,
        },
        {
          intent: "Kích hoạt trọn bộ 3 ngọc cùng lúc (Hunting + Empowering + Lucky)",
          command: `${config.prefix}use 51 65 72`,
        },
        {
          intent: "Sử dụng 1 vật phẩm (ví dụ: catch-net)",
          command: `${config.prefix}use catch-net`,
        },
        {
          intent: "Sử dụng kẹo hiếm (rare-candy) cho Cokemon ID 12",
          command: `${config.prefix}use rare-candy 1 12`,
        },
      ],
      cooldown: 0,
    });
  }

  async execute(message, args) {
    const firstArg = args[0]?.toLowerCase();
    if (!firstArg) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn cần chỉ định ID của vật phẩm hoặc ngọc để sử dụng. Ví dụ: \`${config.prefix}use 51\` hoặc \`${config.prefix}use lure-flame\``,
      );
    }

    // 1. Kiểm tra nếu có bất kỳ argument nào là ID của Ngọc Săn Thú (OwO Gems)
    const gemArgs = args.filter((arg) => isGemId(arg));
    if (gemArgs.length > 0) {
      const dbUser = await getUser(message.author.id);
      const displayName = message.member?.displayName || message.author.username;
      const { getGemActivationDescription } = require("../../utils/gemUtil");
      const results = equipMultipleGems(dbUser, gemArgs);
      await dbUser.save();

      const lines = [];
      for (const res of results) {
        if (res.success) {
          lines.push(
            `${res.gem.emoji} **| ${displayName}**, bạn đã kích hoạt một viên **${res.gem.nameVi || res.gem.name}**!`,
          );
          lines.push(`   **|** ${getGemActivationDescription(res.gem)}`);
        } else if (res.code === "ALREADY_ACTIVE") {
          lines.push(`⚠️ **| ${displayName}**, bạn đã gắn loại ngọc này rồi!`);
        } else if (res.code === "NOT_OWNED") {
          lines.push(`❌ **| ${displayName}**, bạn không có viên ngọc này trong túi đồ!`);
        } else {
          lines.push(`❌ **| ${displayName}**, ${res.error}`);
        }
      }

      return message.reply(lines.join("\n"));
    }

    const { getItem } = require("../../data/items");
    const matchedItem = getItem(firstArg);
    const itemId = matchedItem?.key || firstArg;

    let targetId = null;
    let quantity = 1;
    if (itemId === "rare-candy") {
      targetId = args[1];
      quantity = parseInt(args[2], 10) || 1;
    } else {
      targetId = null;
      if (args[1]?.toLowerCase() === "all") {
        quantity = "all";
      } else {
        quantity = parseInt(args[1], 10) || 1;
      }
    }

    if (quantity !== "all" && quantity <= 0) {
      throw new UserFriendlyError(
        `${config.emoji.no} Số lượng phải là một số dương hoặc \`all\`.`,
      );
    }

    if (itemId === "lootbox" || itemId === "lb" || itemId === "box" || itemId === "050") {
      const lbCommand = require("../rpg/hunt/lootbox");
      return lbCommand.execute(message, [String(quantity)]);
    }

    if (itemId === "wc" || itemId === "crate" || itemId === "weaponcrate" || itemId === "099") {
      const wcCommand = require("../rpg/user/wc");
      return wcCommand.execute(message, [String(quantity)]);
    }

    const { resultMessage, itemType } = await useItem(
      message.client,
      message.author,
      message.channel.id,
      itemId,
      targetId,
      quantity,
    );
    if (resultMessage) {
      if (itemType === "lure") {
        await message.channel.send(resultMessage);
      } else {
        await message.reply(resultMessage);
      }
    }
  }
}

module.exports = new UseCommand();
