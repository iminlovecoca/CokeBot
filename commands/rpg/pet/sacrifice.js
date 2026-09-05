const BaseCommand = require("../../../core/BaseCommand");
const config = require("../../../data/config");
const User = require("../../../models/User");
const {
  requireRpgCharacter,
  calculateRpgPower,
} = require("../../../utils/rpgUtil");
const { checkAndSetCooldown, notifyCooldown } = require("../../../utils/cooldown");
const { getRarityEmoji } = require("../../../utils/rpgUi");
const rarityMapping = {
  c: "Common",
  r: "Rare",
  e: "Epic",
  l: "Legendary",
  m: "Mythic",
  a: "Ancient",
  d: "Divine",
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
  ancient: "Ancient",
  divine: "Divine",
};
const sacrificeEssenceYield = {
  Common: 10,
  Rare: 40,
  Epic: 200,
  Legendary: 1000,
  Mythic: 5000,
  Ancient: 25000,
  Divine: 150000,
};
class SacrificeCommand extends BaseCommand {
  constructor() {
    super({
      name: "sacrifice",
      aliases: ["sac", "xsac", "xsacrifice"],
      description: "Hiến tế trang bị RPG chưa mặc để đổi lấy Coke Essence.",
      usage: `${config.prefix}sacrifice <độ hiếm> [số lượng/all]`,
      examples: [
        {
          intent: "Hiến tế 1 trang bị Common",
          command: `${config.prefix}sacrifice common`,
        },
        {
          intent: "Hiến tế toàn bộ trang bị Common",
          command: `${config.prefix}sac common all`,
        },
      ],
      cooldown: 0
    });
  }
  async execute(message, args = []) {
    const remaining = checkAndSetCooldown(message.author.id, "autohunt", 3);
    if (remaining > 0) {
      return notifyCooldown(message, remaining);
    }
    const { user } = await requireRpgCharacter(message.author.id);
    if (!user.rpg.autohunt) {
      user.rpg.autohunt = {
        isActive: false,
        startTime: null,
        durationHours: 0,
        essence: 0,
        totalEssence: 0,
        captchaCode: null,
        pendingDuration: 0,
        levels: {
          efficiency: 1,
          duration: 1,
          cost: 1,
          gain: 1,
          experience: 1,
          radar: 1,
        },
        xp: {
          efficiency: 0,
          duration: 0,
          cost: 0,
          gain: 0,
          experience: 0,
          radar: 0,
        }
      };
      user.markModified("rpg");
      await user.save();
    }
    const targetRarityAbbr = args[0]?.toLowerCase();
    const targetRarity = rarityMapping[targetRarityAbbr];
    if (!targetRarity) {
      return message.reply(
        `${config.emoji.no} Cú pháp hiến tế không hợp lệ! Hãy dùng: \`${config.prefix}sacrifice {rarity} {count|all}\`\n` +
          `Các độ hiếm hợp lệ: \`c\`, \`r\`, \`e\`, \`l\`, \`m\`, \`a\`, \`d\``,
      );
    }
    const countArg = args[1]?.toLowerCase() || "1";
    const isAll = countArg === "all";
    const count = parseInt(countArg);
    if (!isAll && (!Number.isInteger(count) || count <= 0)) {
      return message.reply(
        `${config.emoji.no} Số lượng trang bị hiến tế không hợp lệ.`,
      );
    }
    const equippedIds = new Set(Object.values(user.rpg.equipped || {}));
    const userItems = user.rpg.items || [];
    const eligibleItems = userItems.filter(
      (item) => item.rarity === targetRarity && !equippedIds.has(item.id) && !item.isGodset,
    );
    if (eligibleItems.length === 0) {
      return message.reply(
        `${config.emoji.warning} Không tìm thấy trang bị nào độ hiếm **${targetRarity}** chưa mặc trong rương đồ để hiến tế.`,
      );
    }
    const sellCount = isAll
      ? eligibleItems.length
      : Math.min(count, eligibleItems.length);
    const itemsToSacrifice = eligibleItems.slice(0, sellCount);
    const essencePerItem = sacrificeEssenceYield[targetRarity] || 10;
    const totalEssenceGain = itemsToSacrifice.length * essencePerItem;
    const sacIds = new Set(itemsToSacrifice.map((it) => it.id));
    user.rpg.items = userItems.filter((it) => !sacIds.has(it.id));
    user.rpg.autohunt.essence = (user.rpg.autohunt.essence || 0) + totalEssenceGain;
    user.rpg.autohunt.totalEssence = (user.rpg.autohunt.totalEssence || 0) + totalEssenceGain;
    user.rpg.power = calculateRpgPower(user);
    user.markModified("rpg");
    await user.save();
    return message.reply(
      `🌌 **Tế Đàn Tinh Hoa RPG**\n` +
        `Bạn đã hiến tế **${itemsToSacrifice.length}** trang bị ${getRarityEmoji(targetRarity)} **${targetRarity}** và nhận được **+${totalEssenceGain.toLocaleString()} Essence**!`,
    );
  }
}
module.exports = new SacrificeCommand();
