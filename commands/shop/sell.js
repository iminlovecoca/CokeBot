const BaseCommand = require("../../core/BaseCommand");
const { sellItem, getUser } = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");
const { getAnimal, getRank, ZOO_RANKS, PET_SPECIES } = require("../../data/animals");

class SellCommand extends BaseCommand {
  constructor() {
    super({
      name: "sell",
      description: "Bán thú trong Zoo hoặc vật phẩm từ túi đồ chuẩn OwO Bot.",
      usage: `${config.prefix}sell <rank | all | tên thú | vật phẩm> [số lượng]`,
      examples: [
        { intent: "Bán tất cả thú thường & hiếm & sử thi", command: `${config.prefix}sell all` },
        { intent: "Bán tất cả thú theo rank", command: `${config.prefix}sell common` },
        { intent: "Bán nhiều rank", command: `${config.prefix}sell c r` },
        { intent: "Bán theo tên thú", command: `${config.prefix}sell bee 5` },
        { intent: "Bán 1 vật phẩm shop", command: `${config.prefix}sell sun-stone 1` },
      ],
      cooldown: 2,
    });
  }

  async execute(message, args) {
    if (!args[0]) {
      throw new UserFriendlyError(
        `**🚫 | ${message.member?.displayName || message.author.username}**, Vui lòng chỉ định rank hoặc loài thú cần bán!\nVí dụ: \`${config.prefix}sell common\`, \`${config.prefix}sell all\`, \`${config.prefix}sell bee 5\``,
      );
    }

    const user = await getUser(message.author.id);
    const zoo = user.zoo || {};
    const displayName = message.member?.displayName || message.author.username;
    const moneyEmoji = config.emoji?.money || "🪙";

    // 1. Check if argument is "all" or matches one or more ranks
    let isRankSell = false;
    let targetRanks = [];

    if (args[0].toLowerCase() === "all") {
      isRankSell = true;
      // Default 'sell all' sells Common, Rare, Epic (protects high-tier Legendary+)
      targetRanks = [ZOO_RANKS.Common, ZOO_RANKS.Rare, ZOO_RANKS.Epic];
    } else {
      // Check if all provided args are valid ranks (supports: "sell c r" or "sell common rare")
      const matchedRanks = [];
      for (const arg of args) {
        const found = getRank(arg);
        if (found) {
          if (!matchedRanks.some((r) => r.name === found.name)) {
            matchedRanks.push(found);
          }
        }
      }
      if (matchedRanks.length > 0 && matchedRanks.length === args.length) {
        isRankSell = true;
        targetRanks = matchedRanks;
      } else if (matchedRanks.length === 1 && args.length === 1) {
        isRankSell = true;
        targetRanks = matchedRanks;
      }
    }

    if (isRankSell) {
      let totalSold = 0;
      let totalCokeGain = 0;
      const rankPieces = [];

      for (const r of targetRanks) {
        const speciesInRank = PET_SPECIES.filter((s) => s.tier === r.name);
        let rankCount = 0;
        for (const a of speciesInRank) {
          const entry = zoo[a.key];
          const count = typeof entry === "object" ? (entry.count || 0) : Number(entry) || 0;
          if (count > 0) {
            rankCount += count;
            if (typeof entry === "object") {
              entry.count = 0;
            } else {
              zoo[a.key] = { count: 0, totalCount: count };
            }
          }
        }
        if (rankCount > 0) {
          totalSold += rankCount;
          totalCokeGain += rankCount * r.price;
          rankPieces.push(`${r.emoji}x${rankCount}`);
        }
      }

      if (totalSold <= 0) {
        return message.reply(`**🚫 | ${displayName}**, You don't have enough animals! >:c`);
      }

      user.coke = (user.coke || 0) + totalCokeGain;
      user.markModified("zoo");
      await user.save();

      return message.reply(
        `**🔪 | ${displayName}** sold **${rankPieces.join(" ")}** for a total of **${moneyEmoji} ${totalCokeGain.toLocaleString()}**`,
      );
    }

    // 2. Check if selling a single animal (e.g. "sell bee 5" or "sell 5 bee" or "sell bee all")
    let animalArg = args[0].toLowerCase();
    let countArg = args[1]?.toLowerCase();

    // Support reverse order: "sell 5 bee" or "sell all bee"
    if (getAnimal(countArg) && (!isNaN(parseInt(animalArg, 10)) || animalArg === "all")) {
      const temp = animalArg;
      animalArg = countArg;
      countArg = temp;
    }

    const targetAnimal = getAnimal(animalArg);
    if (targetAnimal) {
      const entry = zoo[targetAnimal.key];
      const available = typeof entry === "object" ? (entry.count || 0) : Number(entry) || 0;

      if (available <= 0) {
        return message.reply(`**🚫 | ${displayName}**, You don't have enough animals! >:c`);
      }

      let quantityToSell = 1;
      if (countArg === "all") {
        quantityToSell = available;
      } else if (countArg) {
        quantityToSell = parseInt(countArg, 10);
        if (isNaN(quantityToSell) || quantityToSell <= 0) {
          throw new UserFriendlyError(`**🚫 | ${displayName}**, Số lượng bán không hợp lệ.`);
        }
      }

      if (quantityToSell > available) {
        return message.reply(`**🚫 | ${displayName}**, You can't sell more than you have silly! >:c`);
      }

      const cokeGain = quantityToSell * targetAnimal.price;
      if (typeof entry === "object") {
        entry.count = Math.max(0, entry.count - quantityToSell);
      } else {
        zoo[targetAnimal.key] = {
          count: Math.max(0, available - quantityToSell),
          totalCount: available,
        };
      }

      user.coke = (user.coke || 0) + cokeGain;
      user.markModified("zoo");
      await user.save();

      const rank = ZOO_RANKS[targetAnimal.rankName || targetAnimal.tier] || ZOO_RANKS.Common;
      return message.reply(
        `**🔪 | ${displayName}** sold **${rank.emoji}x${quantityToSell}** for a total of **${moneyEmoji} ${cokeGain.toLocaleString()}**`,
      );
    }

    // 3. Fall back to shop item selling
    let quantity = 1;
    if (args[1]) {
      quantity = parseInt(args[1], 10);
      if (isNaN(quantity) || quantity <= 0) {
        throw new UserFriendlyError(
          `${config.emoji.no} Số lượng không hợp lệ. Vui lòng nhập một số lớn hơn 0.`,
        );
      }
    }

    const { item, gain } = await sellItem(
      message.client,
      message.author.id,
      args[0].toLowerCase(),
      quantity,
    );
    return message.reply(
      `${config.emoji.yes} Bạn đã bán thành công **${quantity} x ${item.name}** ${item.emoji} và nhận được ${moneyEmoji} **${gain}**!`,
    );
  }
}

module.exports = new SellCommand();
