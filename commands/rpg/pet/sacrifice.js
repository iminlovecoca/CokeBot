const BaseCommand = require("../../../core/BaseCommand");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const { getAnimal, getRank, ZOO_RANKS, PET_SPECIES } = require("../../../data/animals");

const WEAPON_KEYWORDS = new Set([
  "cw", "rw", "ew", "lw", "mw", "aw", "dw", "fw",
  "allw", "allweapons", "allweapon", "allgear", "weapons", "gear"
]);

class SacrificeCommand extends BaseCommand {
  constructor() {
    super({
      name: "sacrifice",
      aliases: ["sac", "sc", "xsac", "xsacrifice", "xsc"],
      description: "Hiến tế thú trong sở thú (Zoo) để đổi lấy Essence nâng cấp HuntBot.",
      usage: `${config.prefix}sacrifice <rank | all | tên thú> [số lượng]`,
      examples: [
        { intent: "Hiến tế tất cả thú trong sở thú", command: `${config.prefix}sacrifice all` },
        { intent: "Hiến tế thú rank Common", command: `${config.prefix}sacrifice common` },
        { intent: "Hiến tế nhiều rank cùng lúc", command: `${config.prefix}sac c r e` },
        { intent: "Hiến tế theo loài thú", command: `${config.prefix}sacrifice bee 5` },
        { intent: "Hiến tế toàn bộ 1 loài thú", command: `${config.prefix}sc bee all` },
      ],
      cooldown: 2,
    });
  }

  async execute(message, args = []) {
    const displayName = message.member?.displayName || message.author.username;
    const essenceEmoji = "<:Essence:1517230428828995594>";

    if (!args[0]) {
      return message.reply(
        `**🌱 | ${displayName}**, vui lòng chỉ định rank hoặc loài thú trong Zoo cần hiến tế!\n` +
          `**Cú pháp:** \`${config.prefix}sacrifice <rank | all | tên thú> [số lượng]\` *(hoặc alias: \`${config.prefix}sc\`, \`${config.prefix}sac\`)*\n` +
          `**Ví dụ:**\n` +
          `• Hiến tế theo rank: \`${config.prefix}sc common\`, \`${config.prefix}sc c\`, \`${config.prefix}sc c r e\`\n` +
          `• Hiến tế tất cả thú: \`${config.prefix}sc all\`\n` +
          `• Hiến tế theo loài: \`${config.prefix}sc bee 5\`, \`${config.prefix}sc bee all\`\n\n` +
          `**Bảng tỉ lệ Essence chuẩn OwO:**\n` +
          `• Common: **1** | Rare: **20** | Epic: **250**\n` +
          `• Generation: **5.000** | Legendary: **10.000** | Mythic: **20.000**\n` +
          `• Ancient: **100.000** | Divine: **200.000** | Secret: **500.000**`,
      );
    }

    // Kiểm tra nếu người dùng gõ cú pháp vũ khí cũ
    const firstArgLower = args[0].toLowerCase();
    const isExplicitWeaponId = /^[wg]\d+$/i.test(firstArgLower);
    if (WEAPON_KEYWORDS.has(firstArgLower) || isExplicitWeaponId) {
      return message.reply(
        `💡 **| ${displayName}**, tính năng hiến tế vũ khí đã được loại bỏ. Giờ đây bạn có thể dùng lệnh \`${config.prefix}sell ${args.join(" ")}\` để bán vũ khí lấy Coke!\nLệnh \`${config.prefix}sacrifice\` hiện tại dành riêng cho việc hiến tế thú trong Zoo đổi lấy Essence theo chuẩn OwO.`,
      );
    }

    const user = await getUser(message.author.id);
    const zoo = user.zoo || {};

    if (!user.rpg) user.rpg = {};
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
        },
      };
    }

    // ==========================================
    // 1. HIẾN TẾ THEO RANK HOẶC HIẾN TẾ TOÀN BỘ (all, c, common, c r e...)
    // ==========================================
    let isRankSacrifice = false;
    let targetRanks = [];

    if (firstArgLower === "all") {
      isRankSacrifice = true;
      targetRanks = Object.values(ZOO_RANKS).sort((a, b) => a.order - b.order);
    } else {
      const matchedRanks = [];
      for (const arg of args) {
        const found = getRank(arg);
        if (found) {
          if (!matchedRanks.some((r) => r.name === found.name)) {
            matchedRanks.push(found);
          }
        }
      }
      if (matchedRanks.length > 0 && (matchedRanks.length === args.length || args.length === 1)) {
        isRankSacrifice = true;
        targetRanks = matchedRanks;
      }
    }

    if (isRankSacrifice) {
      let totalSacrificed = 0;
      let totalEssenceGain = 0;
      const rankPieces = [];

      for (const r of targetRanks) {
        const speciesInRank = PET_SPECIES.filter((s) => s.tier === r.name);
        let rankCount = 0;

        for (const a of speciesInRank) {
          const entry = zoo[a.key];
          const count = typeof entry === "object" && entry !== null ? (entry.count || 0) : Number(entry) || 0;
          if (count > 0) {
            rankCount += count;
            if (typeof entry === "object" && entry !== null) {
              entry.count = 0;
            } else {
              zoo[a.key] = { count: 0, totalCount: count };
            }
          }
        }

        for (const [key, entry] of Object.entries(zoo)) {
          if (speciesInRank.some((s) => s.key.toLowerCase() === key.toLowerCase())) continue;
          const anim = getAnimal(key);
          const animRank = anim?.rankName || anim?.tier || (anim && ZOO_RANKS[anim.tier]?.name);
          if (animRank === r.name) {
            const count = typeof entry === "object" && entry !== null ? (entry.count || 0) : Number(entry) || 0;
            if (count > 0) {
              rankCount += count;
              if (typeof entry === "object" && entry !== null) {
                entry.count = 0;
              } else {
                zoo[key] = { count: 0, totalCount: count };
              }
            }
          }
        }

        if (rankCount > 0) {
          totalSacrificed += rankCount;
          const essencePerPet = r.essence || 1;
          totalEssenceGain += rankCount * essencePerPet;
          rankPieces.push(`${r.emoji}x${rankCount}`);
        }
      }

      if (totalSacrificed <= 0) {
        return message.reply(`**🚫 | ${displayName}**, bạn không có đủ thú để hiến tế! >:c`);
      }

      user.rpg.autohunt.essence = (user.rpg.autohunt.essence || 0) + totalEssenceGain;
      user.rpg.autohunt.totalEssence = (user.rpg.autohunt.totalEssence || 0) + totalEssenceGain;
      user.markModified("zoo");
      user.markModified("rpg");
      await user.save();

      return message.reply(
        `**🌱 | ${displayName}** đã hiến tế **${rankPieces.join(" ")}** (${totalSacrificed.toLocaleString()} thú) và nhận được ${essenceEmoji} **+${totalEssenceGain.toLocaleString()} Essence**!`,
      );
    }

    // ==========================================
    // 2. HIẾN TẾ 1 LOÀI THÚ THEO TÊN (ví dụ: `sac bee 5`, `sac 5 bee`, `sac bee all`)
    // ==========================================
    let animalArg = args[0].toLowerCase();
    let countArg = args[1]?.toLowerCase();

    if (getAnimal(countArg) && (!isNaN(parseInt(animalArg, 10)) || animalArg === "all")) {
      const temp = animalArg;
      animalArg = countArg;
      countArg = temp;
    }

    const targetAnimal = getAnimal(animalArg);
    if (targetAnimal) {
      const entry = zoo[targetAnimal.key];
      const available = typeof entry === "object" && entry !== null ? (entry.count || 0) : Number(entry) || 0;

      if (available <= 0) {
        return message.reply(`**🚫 | ${displayName}**, bạn không có đủ thú để hiến tế! >:c`);
      }

      let quantityToSac = 1;
      if (countArg === "all") {
        quantityToSac = available;
      } else if (countArg) {
        quantityToSac = parseInt(countArg, 10);
        if (isNaN(quantityToSac) || quantityToSac <= 0) {
          return message.reply(`**🚫 | ${displayName}**, bạn phải hiến tế từ 1 con thú trở lên ngốc ạ~`);
        }
      }

      if (quantityToSac > available) {
        return message.reply(`**🚫 | ${displayName}**, bạn không thể hiến tế nhiều hơn số lượng thú bạn đang có! >:c`);
      }

      const rank = ZOO_RANKS[targetAnimal.rankName || targetAnimal.tier] || ZOO_RANKS.Common;
      const essencePerPet = targetAnimal.essence || rank.essence || 1;
      const totalEssenceGain = quantityToSac * essencePerPet;

      if (typeof entry === "object" && entry !== null) {
        entry.count = Math.max(0, entry.count - quantityToSac);
      } else {
        zoo[targetAnimal.key] = {
          count: Math.max(0, available - quantityToSac),
          totalCount: available,
        };
      }

      user.rpg.autohunt.essence = (user.rpg.autohunt.essence || 0) + totalEssenceGain;
      user.rpg.autohunt.totalEssence = (user.rpg.autohunt.totalEssence || 0) + totalEssenceGain;
      user.markModified("zoo");
      user.markModified("rpg");
      await user.save();

      return message.reply(
        `**🌱 | ${displayName}** đã hiến tế **${rank.emoji} ${targetAnimal.name} x${quantityToSac}** và nhận được ${essenceEmoji} **+${totalEssenceGain.toLocaleString()} Essence**!`,
      );
    }

    return message.reply(
      `**🚫 | ${displayName}**, không tìm thấy loài thú hoặc rank hợp lệ!\nVí dụ: \`${config.prefix}sc common\`, \`${config.prefix}sc all\`, \`${config.prefix}sc bee 5\``,
    );
  }
}

module.exports = new SacrificeCommand();
