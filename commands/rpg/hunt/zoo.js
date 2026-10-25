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
const { findPetSpecies } = require("../../../data/pets");

class ZooCommand extends BaseCommand {
  constructor() {
    super({
      name: "zoo",
      aliases: ["z"],
      description: "Hiển thị sở thú (zoo) hoặc xem chi tiết chỉ số Linh Thú.",
      usage: `${config.prefix}zoo [all / display / @User / tên_thú]`,
      examples: [
        { intent: "Xem zoo cá nhân", command: `${config.prefix}zoo` },
        { intent: "Xem zoo bằng alias", command: `${config.prefix}z` },
        { intent: "Xem chi tiết thú", command: `${config.prefix}zoo ong` },
        { intent: "Xem toàn bộ lịch sử thú đã từng bắt", command: `${config.prefix}zoo display` },
        { intent: "Xem zoo người khác", command: `${config.prefix}zoo @User` },
      ],
      cooldown: 5,
    });
  }

  async execute(message, args = []) {
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

    // If the user passed a specific pet name/alias (e.g. `xzoo ong`), delegate to PetCommand's detail view
    const query = args.join(" ").trim();
    if (query && !isDisplayAll && !mentioned && findPetSpecies(query)) {
      const petCommand = require("../pet/pet");
      return petCommand.execute(message, args);
    }

    const dbUser = await getUser(targetUser.id);
    if (!dbUser.zoo || typeof dbUser.zoo !== "object") {
      dbUser.zoo = {};
    }
    const zoo = dbUser.zoo;

    // One-time migration for legacy RPG pets not yet recorded in dbUser.zoo
    let zooModified = false;
    if (Array.isArray(dbUser.rpg?.pets)) {
      for (const pet of dbUser.rpg.pets) {
        if (pet?.key && !zoo[pet.key]) {
          zoo[pet.key] = { count: 1, totalCount: 1 };
          zooModified = true;
        }
      }
    }
    if (zooModified) {
      dbUser.markModified("zoo");
      await dbUser.save().catch(() => {});
    }

    let biggest = 0;
    for (const [, val] of Object.entries(zoo)) {
      const count = typeof val === "object" && val !== null
        ? (isDisplayAll ? (val.totalCount ?? val.count ?? 0) : (val.count ?? 0))
        : Number(val) || 0;
      if (count > biggest) biggest = count;
    }
    // Dynamic superscript digits (1 digit for 0-9, 2 digits for 10-99, 3 digits for 100-999, etc.)
    const digits = Math.trunc(Math.log10(biggest || 1) + 1);

    // Tiers order: Common -> Rare -> Epic -> Generation (G) -> Legendary -> Mythic -> Ancient -> Divine -> Secret (S)
    const tiersOrder = [
      "Common",
      "Rare",
      "Epic",
      "Generation",
      "Legendary",
      "Mythic",
      "Ancient",
      "Divine",
      "Secret",
    ];

    const targetName = message.guild?.members?.cache?.get(targetUser.id)?.displayName || targetUser.username;
    let response = `🌿 🌱 🌳 **${targetName}'s zoo!** 🌳 🌱 🌿\n\n`;

    for (const tierName of tiersOrder) {
      const rank = ZOO_RANKS[tierName];
      if (!rank) continue;

      const speciesList = PET_SPECIES.filter((s) => s.tier === tierName);
      const badge = rank.emoji || `\`${rank.letter}\``;

      if (speciesList.length === 0) {
        continue;
      }

      const tierDiscovered = speciesList.filter((a) => {
        const stored = zoo[a.key];
        if (!stored) return false;
        if (typeof stored === "object") {
          return (stored.totalCount || 0) > 0 || (stored.count || 0) > 0;
        }
        return Number(stored) > 0;
      });

      // Higher tiers are hidden until at least 1 animal in that tier is discovered (unless `display` / `all` is passed)
      if (tierName !== "Common" && tierDiscovered.length === 0 && !isDisplayAll) {
        continue;
      }

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

        if (!isDiscovered) {
          return `❓${toSmallNum(0, digits)}`;
        }

        return `${a.emoji}${toSmallNum(cnt, digits)}`;
      });

      response += `${badge}    ${rowItems.join("  ")}\n`;
    }

    const computedPoints = calculateZooPoints(zoo);
    const allTimePoints = Math.max(dbUser.zooPoints || 0, computedPoints);
    if (allTimePoints !== dbUser.zooPoints) {
      dbUser.zooPoints = allTimePoints;
      await dbUser.save().catch(() => {});
    }
    const scoreText = formatZooScoreText(zoo);

    response += `\n**Zoo Points: __${allTimePoints.toLocaleString()}__**\n`;
    response += `\t**${scoreText}**`;

    return message.channel.send(response);
  }
}

module.exports = new ZooCommand();
