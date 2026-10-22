const BaseCommand = require("../../../core/BaseCommand");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const {
  ZOO_RANKS,
  PET_SPECIES,
  toSmallNum,
  calculateZooPoints,
  formatZooScoreText,
} = require("../../../data/animals");

class ZooCommand extends BaseCommand {
  constructor() {
    super({
      name: "zoo",
      aliases: ["z"],
      description: "Hiển thị sở thú (zoo) với các loài thú đã thu phục theo bậc của CokeBot.",
      usage: `${config.prefix}zoo [all / display / @User]`,
      examples: [
        { intent: "Xem zoo cá nhân", command: `${config.prefix}zoo` },
        { intent: "Xem zoo bằng alias", command: `${config.prefix}z` },
        { intent: "Xem toàn bộ lịch sử thú đã từng bắt", command: `${config.prefix}zoo display` },
        { intent: "Xem zoo người khác", command: `${config.prefix}zoo @User` },
      ],
      cooldown: 5,
    });
  }

  async execute(message, args) {
    let targetUser = message.author;
    let isDisplayAll = false;

    for (const arg of args) {
      const lower = arg.toLowerCase();
      if (lower === "all" || lower === "display" || lower === "-display" || lower === "d") {
        isDisplayAll = true;
      }
    }

    const mentioned = message.mentions.users.first();
    if (mentioned) {
      targetUser = mentioned;
    }

    const dbUser = await getUser(targetUser.id);
    const zoo = dbUser.zoo || {};

    // Synchronize with existing RPG pets if any
    if (Array.isArray(dbUser.rpg?.pets)) {
      for (const pet of dbUser.rpg.pets) {
        if (pet?.key && !zoo[pet.key]) {
          zoo[pet.key] = { count: 1, totalCount: 1 };
        }
      }
    }

    let biggest = 0;
    for (const [, val] of Object.entries(zoo)) {
      const count = typeof val === "object"
        ? (isDisplayAll ? (val.totalCount ?? val.count ?? 0) : (val.count ?? 0))
        : Number(val) || 0;
      if (count > biggest) biggest = count;
    }
    const digits = Math.max(3, String(biggest || 1).length);

    // Tiers order: Common -> Rare -> Epic -> Legendary -> Mythic -> Ancient -> Divine
    const tiersOrder = ["Common", "Rare", "Epic", "Legendary", "Mythic", "Ancient", "Divine"];

    const targetName = message.guild?.members?.cache?.get(targetUser.id)?.displayName || targetUser.username;
    let response = `🌿 🌱 🌳 **${targetName}'s zoo!** 🌳 🌱 🌿\n\n`;

    let displayedRowCount = 0;

    for (const tierName of tiersOrder) {
      const rank = ZOO_RANKS[tierName];
      if (!rank) continue;

      const speciesList = PET_SPECIES.filter((s) => s.tier === tierName);
      if (!speciesList || speciesList.length === 0) continue;

      // Check how many animals in this tier have been discovered (totalCount > 0 or count > 0)
      const tierDiscovered = speciesList.filter((a) => {
        const stored = zoo[a.key];
        if (!stored) return false;
        if (typeof stored === "object") {
          return (stored.totalCount || 0) > 0 || (stored.count || 0) > 0;
        }
        return Number(stored) > 0;
      });

      // Higher tiers (Rare, Epic, Legendary, Mythic, Ancient, Divine) are hidden until at least 1 animal is discovered!
      if (tierName !== "Common" && tierDiscovered.length === 0) {
        continue;
      }

      displayedRowCount++;
      const badge = rank.emoji || `\`${rank.letter}\``;
      const rowItems = speciesList.map((a) => {
        const stored = zoo[a.key];
        let cnt = 0;
        let isDiscovered = false;

        if (typeof stored === "object" && stored !== null) {
          isDiscovered = (stored.totalCount || 0) > 0 || (stored.count || 0) > 0;
          cnt = isDisplayAll ? (stored.totalCount ?? stored.count ?? 0) : (stored.count ?? 0);
        } else if (typeof stored === "number" && stored > 0) {
          isDiscovered = true;
          cnt = stored;
        }

        // If never owned before, do NOT reveal the animal emoji! Show as mystery question mark
        if (!isDiscovered) {
          return `❓${toSmallNum(0, digits)}`;
        }

        // If discovered (even if currently 0 due to selling), show the revealed emoji!
        return `${a.emoji}${toSmallNum(cnt, digits)}`;
      });

      response += `${badge}    ${rowItems.join("  ")}\n`;
    }

    const allTimePoints = dbUser.zooPoints && dbUser.zooPoints > 0
      ? dbUser.zooPoints
      : calculateZooPoints(zoo);
    const scoreText = formatZooScoreText(zoo);

    response += `\n**Zoo Points: __${allTimePoints.toLocaleString()}__**\n`;
    response += `\t**${scoreText}**`;

    return message.reply({ content: response, allowedMentions: { repliedUser: false } });
  }
}

module.exports = new ZooCommand();
