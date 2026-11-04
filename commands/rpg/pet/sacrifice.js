const BaseCommand = require("../../../core/BaseCommand");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const { getAnimal, getRank, ZOO_RANKS, PET_SPECIES } = require("../../../data/animals");

const WEAPON_KEYWORDS = new Set([
  "cw", "rw", "ew", "lw", "mw", "aw", "dw", "fw",
  "allw", "allweapons", "allweapon", "allgear", "weapons", "weapon", "gear",
]);

const WEAPON_RARITY_MAP = {
  cw: "Common",
  commonweapons: "Common",
  commonweapon: "Common",
  cweapon: "Common",
  cweapons: "Common",

  rw: "Rare",
  rareweapons: "Rare",
  rareweapon: "Rare",
  rweapon: "Rare",
  rweapons: "Rare",

  ew: "Epic",
  epicweapons: "Epic",
  epicweapon: "Epic",
  eweapon: "Epic",
  eweapons: "Epic",

  lw: "Legendary",
  legendaryweapons: "Legendary",
  legendaryweapon: "Legendary",
  lweapon: "Legendary",
  lweapons: "Legendary",

  mw: "Mythic",
  mythicweapons: "Mythic",
  mythicweapon: "Mythic",
  mythicalweapons: "Mythic",
  mweapon: "Mythic",
  mweapons: "Mythic",

  aw: "Ancient",
  ancientweapons: "Ancient",
  ancientweapon: "Ancient",
  aweapon: "Ancient",
  aweapons: "Ancient",
  fw: "Ancient",
  fabledweapons: "Ancient",
  fabledweapon: "Ancient",

  dw: "Divine",
  divineweapons: "Divine",
  divineweapon: "Divine",
  dweapon: "Divine",
  dweapons: "Divine",

  allw: "ALL",
  allweapons: "ALL",
  allweapon: "ALL",
  allgear: "ALL",
  weapons: "ALL",
  weapon: "ALL",
};

// Định mức Linh Hồn cố định chuẩn OwO theo rank (không cộng thêm bonus wear/quality)
const WEAPON_SOUL_RATES = {
  Common: 1,
  Rare: 5,
  Epic: 25,
  Mythic: 300,
  Legendary: 1000,
  Ancient: 5000,
  Divine: 10000,
};

async function handleWeaponSacrifice(message, args, user, displayName) {
  const SOUL_EMOJI = "<:souls:1518749776538243082>";
  const { calculateRpgPower } = require("../../../utils/rpgUtil");

  if (!user.rpg || !Array.isArray(user.rpg.items) || user.rpg.items.length === 0) {
    return message.reply(`**🚫 | ${displayName}**, bạn chưa sở hữu vũ khí nào trong rương đồ để hiến tế!`);
  }

  let rawTokens = args.map((a) => a.toLowerCase().trim());
  if (rawTokens[0] === "weapon" || rawTokens[0] === "weapons") {
    rawTokens = rawTokens.slice(1);
    if (rawTokens.length === 0) rawTokens = ["allw"];
  }

  const tokens = rawTokens.flatMap((t) => t.split(",")).map((s) => s.trim()).filter(Boolean);
  const equippedIds = new Set(Object.values(user.rpg.equipped || {}));

  // 1. Single weapon ID sacrifice (e.g. w5, g5, or number 5)
  const isSingleId = tokens.length === 1 && (/^[wg]\d+$/i.test(tokens[0]) || /^\d+$/i.test(tokens[0]));
  if (isSingleId) {
    const rawIdStr = tokens[0].replace(/^[wg]/i, "");
    const targetId = parseInt(rawIdStr, 10);
    const item = user.rpg.items.find((i) => i.id === targetId);

    if (!item) {
      return message.reply(`**🚫 | ${displayName}**, không tìm thấy vũ khí với mã **#${tokens[0]}** trong rương đồ!`);
    }
    if (equippedIds.has(item.id)) {
      return message.reply(`**🚫 | ${displayName}**, vũ khí này đang được trang bị! Vui lòng tháo trang bị trước khi hiến tế.`);
    }
    if (item.isGodset || item.isFavorite) {
      return message.reply(`**🚫 | ${displayName}**, vũ khí này đang được khóa bảo vệ hoặc thuộc Godset!`);
    }

    // Định mức cố định theo phẩm chất (không phụ thuộc wear hay quality)
    const soulsEarned = WEAPON_SOUL_RATES[item.rarity] || 1;

    user.rpg.items = user.rpg.items.filter((i) => i.id !== item.id);
    if (!user.inventory) user.inventory = new Map();
    const currentSouls = (user.inventory instanceof Map ? user.inventory.get("souls") : user.inventory.souls) || 0;
    if (user.inventory instanceof Map) {
      user.inventory.set("souls", currentSouls + soulsEarned);
    } else {
      user.inventory.souls = currentSouls + soulsEarned;
    }

    user.rpg.power = calculateRpgPower(user);
    user.markModified("rpg");
    user.markModified("inventory");
    await user.save();

    return message.reply(
      `🔨 | **${displayName}**, bạn đã hiến tế thành công **${item.name}** [${item.wear?.name || "Worn"} • ${(item.quality || 50).toFixed(1)}% • ${item.rarity}] và nhận được **+${soulsEarned.toLocaleString()}** Linh Hồn ${SOUL_EMOJI}!\nSố dư hiện tại: **${((user.inventory instanceof Map ? user.inventory.get("souls") : user.inventory.souls) || 0).toLocaleString()}** Linh Hồn.`
    );
  }

  // 2. Batch sacrifice by rarity (cw, rw, ew, mw, lw, aw, dw, allw)
  const targetRarities = [];
  let isAllWeapons = false;

  for (const t of tokens) {
    if (t === "all") {
      isAllWeapons = true;
      continue;
    }
    const mapped = WEAPON_RARITY_MAP[t];
    if (mapped) {
      if (mapped === "ALL") {
        isAllWeapons = true;
      } else if (!targetRarities.includes(mapped)) {
        targetRarities.push(mapped);
      }
    }
  }

  if (isAllWeapons) {
    targetRarities.length = 0;
    targetRarities.push("Common", "Rare", "Epic", "Legendary", "Mythic", "Ancient", "Divine");
  }

  if (targetRarities.length === 0) {
    return message.reply(
      `**🚫 | ${displayName}**, vui lòng chỉ định rank vũ khí cần hiến tế!\nVí dụ: \`${config.prefix}sac cw\`, \`${config.prefix}sac rw\`, \`${config.prefix}sac ew\`, \`${config.prefix}sac allw\`, hoặc \`${config.prefix}sac w<id>\``
    );
  }

  const itemsToSac = user.rpg.items.filter(
    (item) => targetRarities.includes(item.rarity) && !equippedIds.has(item.id) && !item.isGodset && !item.isFavorite
  );

  if (itemsToSac.length === 0) {
    return message.reply(
      `**🚫 | ${displayName}**, không tìm thấy vũ khí nào thuộc cấp độ này để hiến tế (hoặc tất cả đều đang được trang bị/khóa ⭐)!`
    );
  }

  let totalSouls = 0;
  const countsByRarity = {};
  itemsToSac.forEach((item) => {
    // Định mức cố định theo phẩm chất (không phụ thuộc wear hay quality)
    const souls = WEAPON_SOUL_RATES[item.rarity] || 1;
    totalSouls += souls;
    countsByRarity[item.rarity] = (countsByRarity[item.rarity] || 0) + 1;
  });

  const sacIds = new Set(itemsToSac.map((i) => i.id));
  user.rpg.items = user.rpg.items.filter((i) => !sacIds.has(i.id));

  if (!user.inventory) user.inventory = new Map();
  const currentSouls = (user.inventory instanceof Map ? user.inventory.get("souls") : user.inventory.souls) || 0;
  if (user.inventory instanceof Map) {
    user.inventory.set("souls", currentSouls + totalSouls);
  } else {
    user.inventory.souls = currentSouls + totalSouls;
  }

  user.rpg.power = calculateRpgPower(user);
  user.markModified("rpg");
  user.markModified("inventory");
  await user.save();

  const raritySummary = Object.entries(countsByRarity)
    .map(([rar, count]) => `**${count}x ${rar}**`)
    .join(" • ");

  return message.reply(
    `🔨 | **${displayName}**, bạn đã hiến tế thành công **${itemsToSac.length}** vũ khí (${raritySummary}) và nhận được **+${totalSouls.toLocaleString()}** Linh Hồn ${SOUL_EMOJI}!\nSố dư hiện tại: **${((user.inventory instanceof Map ? user.inventory.get("souls") : user.inventory.souls) || 0).toLocaleString()}** Linh Hồn.`
  );
}

class SacrificeCommand extends BaseCommand {
  constructor() {
    super({
      name: "sacrifice",
      aliases: ["sac", "sc", "xsac", "xsacrifice", "xsc"],
      description: "Hiến tế thú trong Zoo đổi Essence hoặc hiến tế vũ khí RPG đổi Linh Hồn (Soul).",
      usage: `${config.prefix}sacrifice <rank | all | tên thú | cw,rw... | w<id>> [số lượng]`,
      examples: [
        { intent: "Hiến tế vũ khí Common lấy Linh Hồn", command: `${config.prefix}sacrifice cw` },
        { intent: "Hiến tế tất cả vũ khí thường lấy Linh Hồn", command: `${config.prefix}sacrifice allw` },
        { intent: "Hiến tế tất cả thú trong sở thú lấy Essence", command: `${config.prefix}sacrifice all` },
        { intent: "Hiến tế thú rank Common lấy Essence", command: `${config.prefix}sacrifice common` },
      ],
      cooldown: 2,
    });
  }

  async execute(message, args = []) {
    const displayName = message.member?.displayName || message.author.username;
    const essenceEmoji = "<:Essence:1517230428828995594>";
    const soulEmoji = "<:souls:1518749776538243082>";

    if (!args[0]) {
      return message.reply(
        `**🌱 | ${displayName}**, vui lòng chỉ định mục tiêu cần hiến tế!\n\n` +
          `**1. Hiến tế Thú trong Zoo (Nhận Essence ${essenceEmoji}):**\n` +
          `• Cú pháp: \`${config.prefix}sc <rank | all | tên thú> [số lượng]\`\n` +
          `• Ví dụ: \`${config.prefix}sc common\`, \`${config.prefix}sc c r e\`, \`${config.prefix}sc all\`, \`${config.prefix}sc bee 5\`\n` +
          `• Mục đích: Dùng nâng cấp HuntBot (\`${config.prefix}autohunt\`, \`${config.prefix}up\`).\n\n` +
          `**2. Hiến tế Vũ Khí RPG (Nhận Linh Hồn ${soulEmoji}):**\n` +
          `• Cú pháp: \`${config.prefix}sc <cw | rw | ew | mw | lw | aw | dw | allw | w<id>>\` *(hoặc \`${config.prefix}dismantle <...>\`)*\n` +
          `• Ví dụ: \`${config.prefix}sc cw\`, \`${config.prefix}sc rw\`, \`${config.prefix}sc allw\`, \`${config.prefix}sc w5\`\n` +
          `• Bảng Linh Hồn cố định: Common: **1** • Rare: **5** • Epic: **25** • Mythic: **300** • Legendary: **1.000** • Ancient: **5.000** • Divine: **10.000**\n` +
          `• Mục đích: Dùng mua vũ khí và hòm trong Cửa Hàng Vũ Khí (\`${config.prefix}ws\`).`
      );
    }

    const firstArgLower = args[0].toLowerCase();
    const isExplicitWeaponId = /^[wg]\d+$/i.test(firstArgLower);
    const isWeaponCommand =
      WEAPON_KEYWORDS.has(firstArgLower) ||
      isExplicitWeaponId ||
      firstArgLower === "weapon" ||
      firstArgLower === "weapons";

    const user = await getUser(message.author.id);

    // ==========================================
    // 1. HIẾN TẾ VŨ KHÍ RPG ĐỔI LINH HỒN (SOULS)
    // ==========================================
    if (isWeaponCommand) {
      return handleWeaponSacrifice(message, args, user, displayName);
    }

    // ==========================================
    // 2. HIẾN TẾ THÚ TRONG SỞ THÚ (ZOO) ĐỔI ESSENCE
    // ==========================================
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

    let isRankSacrifice = false;
    let targetRanks = [];

    if (firstArgLower === "all") {
      isRankSacrifice = true;
      targetRanks = Object.values(ZOO_RANKS).sort((a, b) => a.order - b.order);
    } else {
      const matchedRanks = [];
      for (const arg of args) {
        if (!arg || arg.toLowerCase() === "all") continue;
        const found = getRank(arg);
        if (found) {
          if (!matchedRanks.some((r) => r.name === found.name)) {
            matchedRanks.push(found);
          }
        }
      }
      if (matchedRanks.length > 0) {
        isRankSacrifice = true;
        targetRanks = matchedRanks;
      }
    }

    if (isRankSacrifice) {
      let totalEssenceGained = 0;
      let totalAnimalsSacrificed = 0;
      const rankPieces = [];

      for (const r of targetRanks) {
        const speciesInRank = PET_SPECIES.filter(
          (s) => (s.tier || s.rank || "").toLowerCase() === (r.name || r.id).toLowerCase(),
        );
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
          totalAnimalsSacrificed += rankCount;
          const essencePerPet = r.essence || 1;
          const totalEssenceGain = rankCount * essencePerPet;
          totalEssenceGained += totalEssenceGain;
          rankPieces.push(`${r.emoji || r.name}x${rankCount}`);
        }
      }

      if (totalAnimalsSacrificed === 0) {
        const rankNames = targetRanks.map((r) => r.name).join(", ");
        return message.reply(
          `**🚫 | ${displayName}**, bạn không có thú nào thuộc rank **${rankNames}** để hiến tế!`,
        );
      }

      user.zoo = zoo;
      user.markModified("zoo");

      user.rpg.autohunt.essence = (user.rpg.autohunt.essence || 0) + totalEssenceGained;
      user.rpg.autohunt.totalEssence = (user.rpg.autohunt.totalEssence || 0) + totalEssenceGained;
      user.markModified("rpg");

      await user.save();

      return message.reply(
        `✨ | **${displayName}**, bạn đã hiến tế **${rankPieces.join(" ")}** (${totalAnimalsSacrificed.toLocaleString()} thú) và nhận được **+${totalEssenceGained.toLocaleString()}** Essence ${essenceEmoji}!
` +
          `Số dư Essence hiện tại: **${user.rpg.autohunt.essence.toLocaleString()}** Essence.`,
      );
    }

    // ==========================================
    // 3. HIẾN TẾ THEO LOÀI CỤ THỂ
    // ==========================================
    let animalArg = args[0].toLowerCase();
    let countArg = args[1]?.toLowerCase();

    if (getAnimal(countArg) && (!isNaN(parseInt(animalArg, 10)) || animalArg === "all")) {
      const temp = animalArg;
      animalArg = countArg;
      countArg = temp;
    }

    const species = getAnimal(animalArg);
    if (!species) {
      return message.reply(
        `**🚫 | ${displayName}**, không tìm thấy loài thú hoặc rank \`${args[0]}\`! Hãy kiểm tra lại tên thú.`,
      );
    }

    const animalKey = species.key;
    const entry = zoo[animalKey];
    const currentCount = typeof entry === "object" && entry !== null ? (entry.count || 0) : Number(entry) || 0;
    if (currentCount <= 0) {
      return message.reply(
        `**🚫 | ${displayName}**, bạn không có con **${species.name}** nào trong sở thú!`,
      );
    }

    let countToSacrifice = 1;
    if (countArg) {
      if (countArg === "all") {
        countToSacrifice = currentCount;
      } else {
        const parsed = parseInt(countArg, 10);
        if (isNaN(parsed) || parsed <= 0) {
          return message.reply(
            `**🚫 | ${displayName}**, số lượng cần hiến tế phải là số nguyên dương!`,
          );
        }
        countToSacrifice = parsed;
      }
    }

    if (countToSacrifice > currentCount) {
      return message.reply(
        `**🚫 | ${displayName}**, bạn chỉ có **${currentCount}** con **${species.name}**, không đủ để hiến tế **${countToSacrifice}** con!`,
      );
    }

    const rankObj = ZOO_RANKS[species.rankName || species.tier] || getRank(species.rank || species.tier);
    const essencePerAnimal = species.essence || (rankObj ? rankObj.essence : 1);
    const essenceGained = countToSacrifice * essencePerAnimal;

    if (typeof entry === "object" && entry !== null) {
      entry.count = Math.max(0, (entry.count || 0) - countToSacrifice);
    } else {
      zoo[animalKey] = {
        count: Math.max(0, currentCount - countToSacrifice),
        totalCount: currentCount,
      };
    }

    user.zoo = zoo;
    user.markModified("zoo");

    user.rpg.autohunt.essence = (user.rpg.autohunt.essence || 0) + essenceGained;
    user.rpg.autohunt.totalEssence = (user.rpg.autohunt.totalEssence || 0) + essenceGained;
    user.markModified("rpg");

    await user.save();

    return message.reply(
      `✨ | **${displayName}**, bạn đã hiến tế **${countToSacrifice}x ${species.emoji || ""} ${species.name}** và nhận được **+${essenceGained.toLocaleString()}** Essence ${essenceEmoji}!
` +
        `Số dư Essence hiện tại: **${user.rpg.autohunt.essence.toLocaleString()}** Essence.`,
    );
  }
}

const sacrificeInstance = new SacrificeCommand();
sacrificeInstance.handleWeaponSacrifice = handleWeaponSacrifice;
module.exports = sacrificeInstance;
