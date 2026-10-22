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
      description: "Hiển thị sở thú (zoo) phong cách OwO với các loài thú theo bậc của CokeBot.",
      usage: `${config.prefix}zoo [all / display / @User]`,
      examples: [
        { intent: "Xem zoo cá nhân", command: `${config.prefix}zoo` },
        { intent: "Xem zoo bằng alias", command: `${config.prefix}z` },
        { intent: "Xem toàn bộ lịch sử thú đã bắt", command: `${config.prefix}zoo display` },
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

    let biggest = 0;
    for (const [, val] of Object.entries(zoo)) {
      const count = typeof val === "object"
        ? (isDisplayAll ? (val.totalCount ?? val.count ?? 0) : (val.count ?? 0))
        : Number(val) || 0;
      if (count > biggest) biggest = count;
    }
    const digits = Math.max(3, String(biggest || 1).length);

    // Order from Common to Divine (as in OwO bottom to top or Common -> Divine)
    const tiersOrder = ["Common", "Rare", "Epic", "Legendary", "Mythic", "Ancient", "Divine"];

    const targetName = message.guild?.members?.cache?.get(targetUser.id)?.displayName || targetUser.username;
    let response = `🌿 🌱 🌳 **${targetName}'s zoo!** 🌳 🌱 🌿\n\n`;

    for (const tierName of tiersOrder) {
      const rank = ZOO_RANKS[tierName];
      if (!rank) continue;

      const speciesList = PET_SPECIES.filter((s) => s.tier === tierName);
      if (!speciesList || speciesList.length === 0) continue;

      const badge = rank.emoji || `\`${rank.letter}\``;
      const rowItems = speciesList.map((a) => {
        const stored = zoo[a.key];
        let cnt = 0;
        if (typeof stored === "object" && stored !== null) {
          cnt = isDisplayAll ? (stored.totalCount ?? stored.count ?? 0) : (stored.count ?? 0);
        } else if (typeof stored === "number") {
          cnt = stored;
        }
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
