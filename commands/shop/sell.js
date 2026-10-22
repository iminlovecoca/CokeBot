const BaseCommand = require("../../core/BaseCommand");
const { sellItem, getUser } = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");
const { getAnimal, getRank, ZOO_RANKS, PET_SPECIES } = require("../../data/animals");

class SellCommand extends BaseCommand {
  constructor() {
    super({
      name: "sell",
      description: "Bán vật phẩm từ túi đồ hoặc thú săn được trong Zoo (theo các bậc của CokeBot).",
      usage: `${config.prefix}sell <vật phẩm | tên thú | rank | all> [số lượng]`,
      examples: [
        { intent: "Bán 1 vật phẩm", command: `${config.prefix}sell sun-stone 1` },
        { intent: "Bán thú trong zoo", command: `${config.prefix}sell bee` },
        { intent: "Bán nhiều thú", command: `${config.prefix}sell duck 5` },
        { intent: "Bán tất cả thú của 1 loài", command: `${config.prefix}sell snail all` },
        { intent: "Bán tất cả thú theo rank", command: `${config.prefix}sell common` },
        { intent: "Bán tất cả thú thường và hiếm", command: `${config.prefix}sell all` },
      ],
      cooldown: 2,
    });
  }

  async execute(message, args) {
    if (!args[0]) {
      throw new UserFriendlyError(
        `${config.emoji.no} Vui lòng chỉ định vật phẩm hoặc loài thú/rank cần bán.\nVí dụ:\n- \`${config.prefix}sell bee 1\`\n- \`${config.prefix}sell common\`\n- \`${config.prefix}sell all\`\n- \`${config.prefix}sell sun-stone 3\``,
      );
    }

    const firstArg = args[0].toLowerCase();
    const secondArg = args[1]?.toLowerCase();

    // Check if selling all animals or a specific animal rank
    let isRankSell = false;
    let targetRanks = [];

    if (firstArg === "all") {
      isRankSell = true;
      // Default 'sell all' sells Common, Rare, Epic (protects Legendary, Mythic, Ancient, Divine)
      targetRanks = [ZOO_RANKS.Common, ZOO_RANKS.Rare, ZOO_RANKS.Epic];
    } else {
      const foundRank = getRank(firstArg);
      if (foundRank) {
        isRankSell = true;
        targetRanks = [foundRank];
      }
    }

    const user = await getUser(message.author.id);
    const zoo = user.zoo || {};
    const displayName = message.member?.displayName || message.author.username;

    if (isRankSell) {
      let totalSold = 0;
      let totalCokeGain = 0;
      const soldDetails = [];

      for (const r of targetRanks) {
        const speciesInRank = PET_SPECIES.filter((s) => s.tier === r.name);
        for (const a of speciesInRank) {
          const entry = zoo[a.key];
          const count = typeof entry === "object" ? (entry.count || 0) : Number(entry) || 0;
          if (count > 0) {
            totalSold += count;
            totalCokeGain += count * r.price;
            if (typeof entry === "object") {
              entry.count = 0; // count decreases, totalCount is preserved!
            } else {
              zoo[a.key] = { count: 0, totalCount: count };
            }
            soldDetails.push(`${a.emoji}x${count}`);
          }
        }
      }

      if (totalSold <= 0) {
        return message.reply(`${config.emoji.no} Bạn không có con thú nào thuộc rank này để bán!`);
      }

      user.coke = (user.coke || 0) + totalCokeGain;
      user.markModified("zoo");
      await user.save();

      const rankNames = targetRanks.map((r) => r.name).join(", ");
      const sampleList = soldDetails.slice(0, 10).join(" ") + (soldDetails.length > 10 ? "..." : "");
      return message.reply(
        `🔪 **| ${displayName}** đã bán **${totalSold}** thú (\`${rankNames}\`): ${sampleList} và nhận được **${totalCokeGain.toLocaleString()} Coke**! (Zoo Points tích lũy được bảo lưu vĩnh viễn)`,
      );
    }

    // Check if selling a single animal
    const targetAnimal = getAnimal(firstArg);
    if (targetAnimal) {
      const entry = zoo[targetAnimal.key];
      const available = typeof entry === "object" ? (entry.count || 0) : Number(entry) || 0;

      if (available <= 0) {
        return message.reply(`${config.emoji.no} Bạn không sở hữu con thú ${targetAnimal.emoji} **${targetAnimal.name}** nào trong Zoo để bán.`);
      }

      let quantityToSell = 1;
      if (secondArg === "all") {
        quantityToSell = available;
      } else if (secondArg) {
        quantityToSell = parseInt(secondArg, 10);
        if (isNaN(quantityToSell) || quantityToSell <= 0) {
          throw new UserFriendlyError(`${config.emoji.no} Số lượng bán không hợp lệ.`);
        }
      }

      if (quantityToSell > available) {
        throw new UserFriendlyError(
          `${config.emoji.no} Bạn chỉ có **${available}** ${targetAnimal.emoji} **${targetAnimal.name}**, không đủ để bán **${quantityToSell}**!`,
        );
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

      return message.reply(
        `🔪 **| ${displayName}** đã bán **${targetAnimal.emoji} x${quantityToSell}** nhận được **${cokeGain.toLocaleString()} Coke**! (Zoo Points tích lũy không đổi)`,
      );
    }

    // Fall back to shop item selling
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
      firstArg,
      quantity,
    );
    return message.reply(
      `${config.emoji.yes} Bạn đã bán thành công **${quantity} x ${item.name}** ${item.emoji} và nhận được ${config.emoji.money} **${gain}**!`,
    );
  }
}

module.exports = new SellCommand();
