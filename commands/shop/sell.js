const BaseCommand = require("../../core/BaseCommand");
const { sellItem, getUser } = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");
const { getAnimal, getRank, ZOO_RANKS, PET_SPECIES } = require("../../data/animals");
const { getItem } = require("../../data/items");
const {
  sellRpgItem,
  getGearDisplayName,
  calculateRpgPower,
  findRpgItem,
} = require("../../utils/rpgUtil");
const { getRarityEmoji } = require("../../utils/rpgUi");

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
};

class SellCommand extends BaseCommand {
  constructor() {
    super({
      name: "sell",
      aliases: ["sellgear", "sg"],
      description: "Bán thú trong Zoo, vũ khí RPG, hoặc vật phẩm từ túi đồ chuẩn OwO Bot.",
      usage: `${config.prefix}sell <rank | all | tên thú | cw,rw,dw... | w<id> | vật phẩm> [số lượng]`,
      examples: [
        { intent: "Bán tất cả thú trong sở thú", command: `${config.prefix}sell all` },
        { intent: "Bán tất cả thú theo rank", command: `${config.prefix}sell common` },
        { intent: "Bán nhiều rank thú cùng lúc", command: `${config.prefix}sell c r e` },
        { intent: "Bán vũ khí theo độ hiếm (cw, rw, dw...)", command: `${config.prefix}sell cw rw` },
        { intent: "Bán tất cả vũ khí", command: `${config.prefix}sell allweapons` },
        { intent: "Bán vũ khí theo ID", command: `${config.prefix}sell w5` },
        { intent: "Bán theo tên thú", command: `${config.prefix}sell bee 5` },
        { intent: "Bán 1 vật phẩm shop", command: `${config.prefix}sell sun-stone 1` },
      ],
      cooldown: 2,
    });
  }

  async execute(message, args) {
    const displayName = message.member?.displayName || message.author.username;
    const moneyEmoji = config.emoji?.money || "<:cokecy:1509951335016173662>";

    if (!args[0]) {
      throw new UserFriendlyError(
        `**🚫 | ${displayName}**, vui lòng chỉ định rank, loài thú hoặc vũ khí cần bán!\nVí dụ:\n• Bán thú: \`${config.prefix}sell common\`, \`${config.prefix}sell all\`, \`${config.prefix}sell bee 5\`\n• Bán vũ khí: \`${config.prefix}sell cw\`, \`${config.prefix}sell rw\`, \`${config.prefix}sell dw\`, \`${config.prefix}sell w5\``,
      );
    }

    const user = await getUser(message.author.id);

    // ==========================================
    // 1. KIỂM TRA BÁN VŨ KHÍ RPG (WEAPONS / GEAR)
    // ==========================================

    // 1a. Bán hàng loạt vũ khí theo rank (e.g. `sell cw`, `sell rw`, `sell dw`, `sell cw rw`, `sell cw,rw,ew`, `sell allweapons`)
    const tokens = args.flatMap((a) => a.toLowerCase().split(",")).map((s) => s.trim()).filter(Boolean);
    const weaponRarities = [];
    let isAllWeapons = false;

    for (const t of tokens) {
      const mapped = WEAPON_RARITY_MAP[t];
      if (mapped) {
        if (mapped === "ALL") {
          isAllWeapons = true;
        } else if (!weaponRarities.includes(mapped)) {
          weaponRarities.push(mapped);
        }
      }
    }

    if (isAllWeapons) {
      weaponRarities.length = 0;
      weaponRarities.push("Common", "Rare", "Epic", "Legendary", "Mythic", "Ancient", "Divine");
    }

    if (weaponRarities.length > 0 && tokens.every((t) => Boolean(WEAPON_RARITY_MAP[t]))) {
      if (!user.rpg) {
        return message.reply(`**🚫 | ${displayName}**, bạn chưa tạo nhân vật RPG để sở hữu vũ khí!`);
      }
      const equippedIds = new Set(Object.values(user.rpg.equipped || {}));
      const userItems = user.rpg.items || [];
      const itemsToSell = userItems.filter(
        (item) => weaponRarities.includes(item.rarity) && !equippedIds.has(item.id) && !item.isGodset && !item.isFavorite
      );

      if (itemsToSell.length === 0) {
        return message.reply(
          `**🚫 | ${displayName}**, không tìm thấy vũ khí nào thuộc cấp độ này trong rương đồ để bán (hoặc tất cả đều đang được trang bị/khóa ⭐)!`
        );
      }

      const totalCoke = itemsToSell.reduce((sum, item) => sum + (item.sellPrice || 0), 0);
      const sellIds = new Set(itemsToSell.map((item) => item.id));
      user.rpg.items = userItems.filter((item) => !sellIds.has(item.id));
      user.coke = (user.coke || 0) + totalCoke;
      user.rpg.power = calculateRpgPower(user);
      user.markModified("rpg");
      await user.save();

      const countsByRarity = {};
      for (const item of itemsToSell) {
        countsByRarity[item.rarity] = (countsByRarity[item.rarity] || 0) + 1;
      }
      const rarityPieces = Object.entries(countsByRarity)
        .map(([rarity, count]) => `${getRarityEmoji(rarity)}x${count}`)
        .join(" ");

      return message.reply(
        `**🗡️ | ${displayName}** đã bán **${rarityPieces}** (${itemsToSell.length} vũ khí) và nhận được tổng cộng **${moneyEmoji} ${totalCoke.toLocaleString()} Coke**!`
      );
    }

    // 1b. Bán 1 vũ khí theo ID (ví dụ: `sell w5`, `sell g5`, hoặc `sell 5` nếu khớp ID vũ khí đang sở hữu)
    const isExplicitWeaponId = /^[wg]\d+$/i.test(args[0]);
    const isNumericId = /^\d+$/.test(args[0]);
    let targetWeaponItem = null;

    if (isExplicitWeaponId) {
      const weaponId = Number(args[0].replace(/^[wgWG]/, ""));
      targetWeaponItem = findRpgItem(user, weaponId);
    } else if (isNumericId && !getItem(args[0])) {
      const weaponId = Number(args[0]);
      targetWeaponItem = findRpgItem(user, weaponId);
    }

    if (targetWeaponItem) {
      const { item, cokeGain } = await sellRpgItem(message.author.id, targetWeaponItem.id);
      return message.reply(
        `**🗡️ | ${displayName}** đã bán **${getGearDisplayName(item)}** (\`G${String(item.id).padStart(3, "0")}\`) và nhận được tổng cộng **${moneyEmoji} ${cokeGain.toLocaleString()} Coke**!`
      );
    }

    // ==========================================
    // 2. KIỂM TRA BÁN THÚ TRONG SỞ THÚ (ZOO)
    // ==========================================
    const zoo = user.zoo || {};

    // 2a. Bán theo rank thú hoặc bán toàn bộ thú (`sell all`, `sell c`, `sell common`, `sell c r`)
    let isRankSell = false;
    let targetRanks = [];

    const lowerFirst = args[0].toLowerCase();
    if (lowerFirst === "all") {
      isRankSell = true;
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
          totalSold += rankCount;
          totalCokeGain += rankCount * r.price;
          rankPieces.push(`${r.emoji}x${rankCount}`);
        }
      }

      if (totalSold <= 0) {
        return message.reply(`**🚫 | ${displayName}**, bạn không có đủ thú để bán! >:c`);
      }

      user.coke = (user.coke || 0) + totalCokeGain;
      user.markModified("zoo");
      await user.save();

      return message.reply(
        `**🔪 | ${displayName}** đã bán **${rankPieces.join(" ")}** và nhận được tổng cộng **${moneyEmoji} ${totalCokeGain.toLocaleString()} Coke**!`,
      );
    }

    // 2b. Bán 1 loài thú theo tên (ví dụ: `sell bee 5`, `sell 5 bee`, `sell bee all`)
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
        return message.reply(`**🚫 | ${displayName}**, bạn không có đủ thú để bán! >:c`);
      }

      let quantityToSell = 1;
      if (countArg === "all") {
        quantityToSell = available;
      } else if (countArg) {
        quantityToSell = parseInt(countArg, 10);
        if (isNaN(quantityToSell) || quantityToSell <= 0) {
          return message.reply(`**🚫 | ${displayName}**, bạn phải bán từ 1 con thú trở lên ngốc ạ~`);
        }
      }

      if (quantityToSell > available) {
        return message.reply(`**🚫 | ${displayName}**, bạn không thể bán nhiều hơn số lượng thú bạn đang có! >:c`);
      }

      const cokeGain = quantityToSell * targetAnimal.price;
      if (typeof entry === "object" && entry !== null) {
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
        `**🔪 | ${displayName}** đã bán **${rank.emoji}x${quantityToSell}** và nhận được tổng cộng **${moneyEmoji} ${cokeGain.toLocaleString()} Coke**!`,
      );
    }

    // ==========================================
    // 3. BÁN VẬT PHẨM TÚI ĐỒ (SHOP / INVENTORY ITEM)
    // ==========================================
    let quantity = 1;
    if (args[1]) {
      quantity = parseInt(args[1], 10);
      if (isNaN(quantity) || quantity <= 0) {
        throw new UserFriendlyError(
          `**🚫 | ${displayName}**, số lượng không hợp lệ. Vui lòng nhập một số lớn hơn 0.`,
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
      `**🔪 | ${displayName}** đã bán **${item.emoji} ${item.name} x${quantity}** và nhận được tổng cộng **${moneyEmoji} ${gain.toLocaleString()} Coke**!`,
    );
  }
}

module.exports = new SellCommand();
