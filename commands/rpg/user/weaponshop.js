const BaseCommand = require("../../../core/BaseCommand");
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const { DateTime } = require("luxon");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const {
  requireRpgCharacter,
  generateRpgGearDrop,
  addRpgGearToUser,
  generateGearStats,
} = require("../../../utils/rpgUtil");
const { getWeaponPassive } = require("../../../data/rpg/weaponPassives");
const {
  getWeaponQualityFactor,
  computeFixedWeaponPassive,
  computeRandomPassiveSpec,
  RANDOM_PASSIVE_POOL,
} = require("../../../utils/rpgPassiveUtil");
const {
  getRpgColor,
  formatRpgFooter,
  formatRpgTitle,
  safeInteractionReply,
} = require("../../../utils/rpgUi");

const TIMEZONE = config.rpg?.boss?.spawn_timezone || "Asia/Ho_Chi_Minh";
const SOUL_EMOJI = "<:souls:1518749776538243082>";

const NORMAL_SUBTYPES = [
  { name: "Longsword", key: "longsword", emoji: "<:longsword:1514231939865903104>" },
  { name: "Dagger", key: "dagger", emoji: "<:dagger:1514231934191009853>" },
  { name: "Staff", key: "staff", emoji: "<:staff:1514231936581898240>" },
  { name: "Warhammer", key: "warhammer", emoji: "<:warhammer:1544258404812460082>" },
];

const SPECIAL_SUBTYPES = [
  { name: "Shadow Dagger", key: "shadowdagger", emoji: "<:shadowdagger:1514232151766339635>" },
  { name: "Poison Dagger", key: "poisondagger", emoji: "<:poisondagger:1514232154173866004>" },
  { name: "Fire Sword", key: "firesword", emoji: "<:firesword:1514232156279406682>" },
  { name: "Green Staff", key: "greenstaff", emoji: "<:greenstaff:1514232158502518945>" },
  { name: "Blue Staff", key: "bluestaff", emoji: "<:bluestaff:1514232160897339442>" },
  { name: "Crimson Dagger", key: "crimsondagger", emoji: "<:crimsondagger:1514232163158065252>" },
  { name: "Holy Sword", key: "holysword", emoji: "<:Holysword:1523379675076755556>" },
  { name: "Dark Sword", key: "darksword", emoji: "<:darksword:1514232167595769949>" },
  { name: "Dark Staff", key: "darkstaff", emoji: "<:darkstaff:1514232169529348106>" },
  { name: "Gravity Bow", key: "gravitybow", emoji: "<:GravityBow:1516389241347641415>" },
  { name: "Dusk and Dawn", key: "duskanddawn", emoji: "<:DuskandDawn:1517552769270153277>" },
  { name: "River of Blood", key: "riverofblood", emoji: "<:RiverofBlood:1517552771824615424>" },
  { name: "Axesnake", key: "axesnake", emoji: "<:Axesnake:1518746343999406240>" },
  { name: "Sun Bow", key: "sunbow", emoji: "<:Sunbow:1518746354728304720>" },
  { name: "Clawhex", key: "clawhex", emoji: "<:Clawhex:1518746346352545792>" },
  { name: "Spearhex", key: "spearhex", emoji: "<:Spearhex:1518746351784034366>" },
  { name: "Shieldhex", key: "shieldhex", emoji: "<:Shieldhex:1518746348973850818>" },
  { name: "Lunashard", key: "lunashard", emoji: "<:Lunashard:1523374307986772088>" },
  { name: "Eclipsesoul", key: "eclipsesoul", emoji: "<:Eclipsesoul:1523374305256280065>" },
  { name: "Bladesorrow", key: "bladesorrow", emoji: "<:Bladesorrow:1523374302685298848>" },
  { name: "Fallenangel", key: "fallenangel", emoji: "<:Fallenangel:1523380721098559630>" },
  { name: "Greeddagger", key: "greeddagger", emoji: "<:Greeddagger:1523380718510543150>" },
  { name: "Asmodeus", key: "asmodeus", emoji: "<:Asmodeus:1523380716027645962>" },
  { name: "Soulreaper", key: "soulreaper", emoji: "<:Soulreaper:1523374310608207882>" },
  { name: "Beelzebub", key: "beelzebub", emoji: "<:Beelzebub:1523380713032913006>" },
  { name: "Satan", key: "satan", emoji: "<:Satan:1523380709476274176>" },
  { name: "Găng Tay Băng Giá", key: "frostgauntlet", emoji: "<:frostgauntlet:1544258397564567602>" },
  { name: "Quỷ Thư", key: "demonbook", emoji: "<:darkhold:1544258394695934002>" },
  { name: "Búa Lôi Thần Thor", key: "thorshammer", emoji: "<:ligthammer:1544258402434293810>" },
  { name: "Búa Toàn Tri Odin", key: "odinhammer", emoji: "<:lawhammer:1544258399649271909>" },
  { name: "Darkhold", key: "darkhold", emoji: "<:darkhold:1544258394695934002>" },
];

const PASSIVE_TYPE_EMOJIS = {
  damage_mult: "<:atkup:1521938477359300648>",
  armor_pierce: "<:ArmorPierce:1563844554728276018>",
  mr_pierce: "<:dispe:1521938483730710578>",
  armor_shred: "<:break:1521938480337391736>",
  mr_shred: "<:dispe:1521938483730710578>",
  poison: "<:poisonous:1522374367542247424>",
  burn: "<:burn:1521938494094835774>",
  bleed: "<:bleed:1521938497642958889>",
  freeze: "<:freeze:1521938500478566639>",
  stun: "<:stun:1521938490605178910>",
  lifesteal: "<:LifeSteal:1563844557026893924>",
  heal_on_skill: "<:heal:1521938487907975198>",
  heal_ban: "<:healreduction:1523340558855045190>",
  deflect: "<:break:1521938480337391736>",
  reflect: "<:taunt:1521938510485917796>",
  double_hit: "<:atkup:1521938477359300648>",
  random_effect: "<:dispe:1521938483730710578>",
};

const RARITY_BRACKETS = {
  Common: "<:common:1530878565489311826>",
  Rare: "<:rare:1530878574104547378>",
  Epic: "<:epic:1530878567955566642>",
  Legendary: "<:legendary:1530878570858287205>",
  Mythic: "<a:mythic:1530878614843686912>",
  Ancient: "<a:ancient:1530878606656540814>",
  Divine: "<a:divine:1530878610515165365>",
};

// Base Soul prices matching OwO markup (shardPrice * 2.5)
const BASE_SOUL_PRICES = {
  Common: 3,
  Rare: 13,
  Epic: 63,
  Mythic: 750,
  Legendary: 2500,
  Ancient: 12500,
  Divine: 25000,
};

function createSeededRng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h >>> 0) / 4294967296;
  };
}

function getDailyShopDateInfo() {
  const now = DateTime.now().setZone(TIMEZONE);
  const dateKey = now.toFormat("yyyy-MM-dd");
  const nextMidnight = now.plus({ days: 1 }).startOf("day");
  const diff = nextMidnight.diff(now, ["hours", "minutes", "seconds"]).toObject();
  const hours = Math.floor(diff.hours || 0);
  const minutes = Math.floor(diff.minutes || 0);
  const seconds = Math.floor(diff.seconds || 0);
  const countdownStr = `${hours}H ${minutes}M ${seconds}S`;
  return { now, dateKey, countdownStr };
}

function generateDailyWeapons(dateKey) {
  const items = [];

  // Item 100: Weapon Crate (40 Souls matching OwO's 40 Weapon Shards)
  items.push({
    slotIndex: 100,
    isCrate: true,
    name: "Weapon Crate",
    emoji: "<:crate:1512793698025603282>",
    price: 40,
  });

  // Items 101 to 110: 10 Daily Weapons
  for (let slotId = 101; slotId <= 110; slotId++) {
    const rng = createSeededRng(`ws_${dateKey}_slot_${slotId}`);
    const isSpecial = rng() < 0.05; // 5% chance for special weapon

    let subTypeObj;
    let rarity;
    let baseSoulPrice;

    if (isSpecial) {
      const idx = Math.floor(rng() * SPECIAL_SUBTYPES.length);
      subTypeObj = SPECIAL_SUBTYPES[idx];
      const rRoll = rng();
      if (rRoll < 0.50) {
        rarity = "Epic";
        baseSoulPrice = BASE_SOUL_PRICES.Epic;
      } else if (rRoll < 0.85) {
        rarity = "Legendary";
        baseSoulPrice = BASE_SOUL_PRICES.Legendary;
      } else if (rRoll < 0.95) {
        rarity = "Mythic";
        baseSoulPrice = BASE_SOUL_PRICES.Mythic;
      } else if (rRoll < 0.99) {
        rarity = "Ancient";
        baseSoulPrice = BASE_SOUL_PRICES.Ancient;
      } else {
        rarity = "Divine";
        baseSoulPrice = BASE_SOUL_PRICES.Divine;
      }
    } else {
      const idx = Math.floor(rng() * NORMAL_SUBTYPES.length);
      subTypeObj = NORMAL_SUBTYPES[idx];
      const rRoll = rng();
      if (rRoll < 0.60) {
        rarity = "Common";
        baseSoulPrice = BASE_SOUL_PRICES.Common;
      } else if (rRoll < 0.85) {
        rarity = "Rare";
        baseSoulPrice = BASE_SOUL_PRICES.Rare;
      } else if (rRoll < 0.97) {
        rarity = "Epic";
        baseSoulPrice = BASE_SOUL_PRICES.Epic;
      } else {
        rarity = "Legendary";
        baseSoulPrice = BASE_SOUL_PRICES.Legendary;
      }
    }

    // Wear condition
    const wearRoll = rng();
    let wear;
    if (wearRoll < 0.03) {
      wear = { id: "pristine", name: "Pristine", prefix: "[P] ", bonus: 5 };
    } else if (wearRoll < 0.15) {
      wear = { id: "fine", name: "Fine", prefix: "[F] ", bonus: 3 };
    } else if (wearRoll < 0.40) {
      wear = { id: "decent", name: "Decent", prefix: "[D] ", bonus: 1 };
    } else {
      wear = { id: "worn", name: "Worn", prefix: "[W] ", bonus: 0 };
    }

    // Quality
    const baseQ = Math.floor((rng() * 79 + 20) * 10) / 10;
    const finalQuality = Math.min(105, Math.round((baseQ + wear.bonus) * 10) / 10);

    // Passives: Vũ khí thường (cho Pet) chỉ có 1 random passive, vũ khí đặc biệt mới có fixed passive
    let fixedPassive = null;
    let fixedPassiveEmoji = null;
    if (isSpecial) {
      const basePassive = getWeaponPassive(subTypeObj.key);
      fixedPassive = computeFixedWeaponPassive(subTypeObj.name, rarity, finalQuality, wear);
      fixedPassiveEmoji = PASSIVE_TYPE_EMOJIS[basePassive?.type] || "<:atkup:1521938477359300648>";
    }

    const randIdx = Math.floor(rng() * RANDOM_PASSIVE_POOL.length);
    const randDef = RANDOM_PASSIVE_POOL[randIdx];
    const randomPassive = computeRandomPassiveSpec(randDef.type, rarity, finalQuality, wear);
    const randomPassiveEmoji = randDef.emoji;

    // Proportional power, stats & soul price
    const { powerStatMultiplier } = getWeaponQualityFactor(rarity, finalQuality, wear);
    const price = Math.max(1, Math.round(baseSoulPrice * powerStatMultiplier));
    const powerRarityConfig = config.rpg.gear_rarities[rarity] || { power: 100, sell: 100 };
    const power = Math.floor((powerRarityConfig.power + 4) * powerStatMultiplier);
    const stats = generateGearStats("weapon", rarity, finalQuality, subTypeObj.name, wear);

    items.push({
      slotIndex: slotId,
      isCrate: false,
      isSpecial,
      name: subTypeObj.name,
      subType: subTypeObj.name,
      key: subTypeObj.key,
      emoji: subTypeObj.emoji,
      rarity,
      wear,
      quality: finalQuality,
      price,
      power,
      stats,
      fixedPassive,
      fixedPassiveEmoji,
      randomPassive,
      randomPassiveEmoji,
    });
  }

  return items;
}

function getUserSouls(user) {
  if (!user.inventory) return 0;
  if (user.inventory instanceof Map) {
    return user.inventory.get("souls") || 0;
  }
  return user.inventory.souls || 0;
}

function deductUserSouls(user, amount) {
  if (!user.inventory) user.inventory = new Map();
  const current = getUserSouls(user);
  const nextVal = Math.max(0, current - amount);
  if (user.inventory instanceof Map) {
    user.inventory.set("souls", nextVal);
  } else {
    user.inventory.souls = nextVal;
  }
  user.markModified("inventory");
}

function getUserShopPurchases(user, dateKey) {
  if (!user.rpg) user.rpg = {};
  if (!user.rpg.dailyWeaponShop || user.rpg.dailyWeaponShop.date !== dateKey) {
    user.rpg.dailyWeaponShop = {
      date: dateKey,
      slots: [],
    };
    user.markModified("rpg");
  }
  return user.rpg.dailyWeaponShop.slots || [];
}

class WeaponShopCommand extends BaseCommand {
  constructor() {
    super({
      name: "weaponshop",
      aliases: ["ws", "wshop", "shopweapon", "shopvk"],
      description: "Cửa hàng vũ khí hàng ngày mua bằng Linh Hồn (Soul).",
      usage: `${config.prefix}weaponshop [buy <100-110>]`,
      category: "rpg",
      cooldown: 0,
    });
  }

  buildShopPayload(user, dateInfo, weapons) {
    const purchasedSlots = getUserShopPurchases(user, dateInfo.dateKey);

    const lines = [];
    weapons.forEach((item) => {
      if (item.isCrate) {
        // Offset dashes to align price with weapon rows
        const dashCount = Math.max(3, 35 - item.name.length);
        const dashes = "-".repeat(dashCount);
        lines.push(`\`${item.slotIndex}\` ${item.emoji} \`${item.name}\` ${dashes} \`${item.price.toLocaleString()}\` ${SOUL_EMOJI}`);
      } else {
        const isBought = purchasedSlots.includes(item.slotIndex);
        const rankEmoji = RARITY_BRACKETS[item.rarity] || "<:common:1530878565489311826>";
        const displayName = `${item.wear.prefix}${item.rarity} ${item.name}`;
        const passivesStr = item.isSpecial && item.fixedPassiveEmoji
          ? `${item.fixedPassiveEmoji} ${item.randomPassiveEmoji}`
          : `${item.randomPassiveEmoji}`;
        const dashCount = Math.max(3, (item.isSpecial ? 26 : 28) - displayName.length);
        const dashes = "-".repeat(dashCount);
        if (isBought) {
          lines.push(`\`${item.slotIndex}\` ${rankEmoji} ${item.emoji} ${passivesStr} \`${displayName}\` ${dashes} \`[ĐÃ MUA]\` ✅`);
        } else {
          lines.push(`\`${item.slotIndex}\` ${rankEmoji} ${item.emoji} ${passivesStr} \`${displayName}\` ${dashes} \`${item.price.toLocaleString()}\` ${SOUL_EMOJI}`);
        }
      }
    });

    const divider = "══════════════════════════════════════════════════";

    const description =
      `Dùng Linh Hồn để mua vũ khí và hòm vũ khí!\n` +
      `Vũ khí được làm mới ngẫu nhiên mỗi ngày!\n` +
      `• \`${config.prefix}buy {id}\` để mua một vũ khí\n` +
      `• \`${config.prefix}ws\` để xem danh sách vũ khí\n` +
      `${divider}\n` +
      lines.join("\n") +
      `\n${divider}`;

    const embed = new EmbedBuilder()
      .setColor("#2F3136")
      .setTitle("Cửa Hàng: Vũ Khí")
      .setDescription(description)
      .setFooter({ text: `Trang 1/1 | Làm mới sau: ${dateInfo.countdownStr}` });

    return { embeds: [embed], components: [] };
  }

  async processBuy(user, slotIndex, channel) {
    const { dateKey } = getDailyShopDateInfo();
    const weapons = generateDailyWeapons(dateKey);
    const item = weapons.find((w) => w.slotIndex === slotIndex);
    if (!item) {
      return { ok: false, message: "❌ Ô vũ khí không hợp lệ! Vui lòng chọn từ `100` đến `110`." };
    }

    const userSouls = getUserSouls(user);

    // Item 100: Weapon Crate
    if (item.isCrate) {
      if (userSouls < item.price) {
        return {
          ok: false,
          message: `❌ Bạn không đủ Linh Hồn! Cần **${item.price.toLocaleString()} Linh Hồn** ${SOUL_EMOJI} nhưng bạn chỉ có **${userSouls.toLocaleString()} Linh Hồn**.\n💡 Bạn có thể hiến tế vũ khí thừa để lấy Linh Hồn (\`${config.prefix}sac cw\`, \`${config.prefix}sac rw\`, \`${config.prefix}dismantle\`)!`,
        };
      }
      deductUserSouls(user, item.price);
      if (!user.inventory) user.inventory = new Map();
      const currentWc = (user.inventory instanceof Map ? user.inventory.get("wc") : user.inventory.wc) || 0;
      if (user.inventory instanceof Map) {
        user.inventory.set("wc", currentWc + 1);
      } else {
        user.inventory.wc = currentWc + 1;
      }
      user.markModified("inventory");
      await user.save();
      return { ok: true, isCrate: true, price: item.price, remainingSouls: getUserSouls(user) };
    }

    // Items 101 to 110: Weapons
    const purchasedSlots = getUserShopPurchases(user, dateKey);
    if (purchasedSlots.includes(slotIndex)) {
      return {
        ok: false,
        message: `❌ Bạn đã mua vũ khí ở ô **#${slotIndex}** hôm nay rồi! Hãy quay lại vào ngày mai khi shop làm mới.`,
      };
    }

    if (userSouls < item.price) {
      return {
        ok: false,
        message: `❌ Bạn không đủ Linh Hồn! Cần **${item.price.toLocaleString()} Linh Hồn** ${SOUL_EMOJI} nhưng bạn chỉ có **${userSouls.toLocaleString()} Linh Hồn**.\n💡 Bạn có thể hiến tế vũ khí thừa để lấy Linh Hồn (\`${config.prefix}sac cw\`, \`${config.prefix}sac rw\`, \`${config.prefix}dismantle\`)!`,
      };
    }

    deductUserSouls(user, item.price);
    user.rpg.dailyWeaponShop.slots.push(slotIndex);
    user.markModified("rpg");

    const weapon = await generateRpgGearDrop(user, {
      forceDrop: true,
      slot: "weapon",
      subType: item.subType,
      rarity: item.rarity,
      quality: item.quality,
      wear: item.wear,
      randomPassive: item.randomPassive,
      fromWc: false,
      fromDungeon: item.isSpecial,
      fromEvent: true,
      fromAdmin: true,
    });

    if (!weapon) {
      // Refund souls
      if (user.inventory instanceof Map) {
        user.inventory.set("souls", getUserSouls(user) + item.price);
      } else {
        user.inventory.souls = getUserSouls(user) + item.price;
      }
      user.rpg.dailyWeaponShop.slots = user.rpg.dailyWeaponShop.slots.filter((s) => s !== slotIndex);
      user.markModified("rpg");
      user.markModified("inventory");
      return { ok: false, message: "❌ Đã có lỗi xảy ra khi rèn vũ khí. Vui lòng thử lại!" };
    }

    addRpgGearToUser(user, weapon);
    await user.save();

    return { ok: true, isCrate: false, weapon, item, remainingSouls: getUserSouls(user) };
  }

  buildSuccessEmbed(user, weapon, item) {
    const bracket = RARITY_BRACKETS[weapon.rarity] || "<:common:1530878565489311826>";
    const specialTag = item.isSpecial ? " 🌟 **[ĐẶC BIỆT 5%]**" : "";
    const remainingSouls = getUserSouls(user);

    const embed = new EmbedBuilder()
      .setColor(getRpgColor("success"))
      .setTitle(formatRpgTitle(`Mua Vũ Khí Thành Công • Ô #${item.slotIndex}`, "🎉"))
      .setDescription(
        `Chúc mừng **${user.username || "bạn"}** đã sở hữu thành công vũ khí từ Cửa Hàng Hàng Ngày!\n\n` +
        `${bracket} ${weapon.emoji} **${weapon.name}** [${weapon.wear?.name || "Worn"} • **${weapon.quality.toFixed(1)}%** • ${weapon.rarity}]${specialTag}\n` +
        `• Sức mạnh: **${weapon.power.toLocaleString()} Power** • Giá bán lại: **${(weapon.sellPrice || 0).toLocaleString()} Coke**\n` +
        `• Chỉ số cộng thêm: **${Object.entries(weapon.stats || {}).map(([s, v]) => `+${v} ${s.toUpperCase()}`).join(" • ") || "Không có"}**\n` +
        `• Chi phí mua: **-${item.price.toLocaleString()} Linh Hồn** ${SOUL_EMOJI} • Số dư còn lại: **${remainingSouls.toLocaleString()} Linh Hồn**\n\n` +
        (weapon.fixedPassive ? `🛡️ **Nội tại cố định:**\n> **${weapon.fixedPassive.name}**: ${weapon.fixedPassive.description}\n\n` : "") +
        `🎲 **Nội tại ngẫu nhiên (Random Passive):**\n` +
        `> ${weapon.randomPassive?.description || "Không có"}\n\n` +
        `💡 *Cả 2 nội tại, sức mạnh, chỉ số, giá mua (Linh Hồn) và giá bán (Coke) đều tỉ lệ thuận theo Rarity (${weapon.rarity}), Wear (${weapon.wear?.name || "Worn"}) và Quality (${weapon.quality.toFixed(1)}%)!*`
      )
      .setFooter(formatRpgFooter(`Dùng ${config.prefix}gear để xem và trang bị`))
      .setTimestamp();

    return embed;
  }

  buildCrateSuccessEmbed(user, price, remainingSouls) {
    const embed = new EmbedBuilder()
      .setColor(getRpgColor("success"))
      .setTitle(formatRpgTitle("Mua Hộp Vũ Khí Thành Công • Ô #100", "🎉"))
      .setDescription(
        `Chúc mừng **${user.username || "bạn"}** đã mua thành công **Hộp Vũ Khí (Weapon Crate)**!\n\n` +
        `<:crate:1512793698025603282> **Hộp Vũ Khí (Weapon Crate)**\n` +
        `• Chi phí: **-${price.toLocaleString()} Linh Hồn** ${SOUL_EMOJI}\n` +
        `• Số dư còn lại: **${remainingSouls.toLocaleString()} Linh Hồn**\n\n` +
        `📦 *Dùng lệnh \`${config.prefix}wc\` để mở hộp và nhận vũ khí ngẫu nhiên!*`
      )
      .setFooter(formatRpgFooter(`Dùng ${config.prefix}wc để mở hộp`))
      .setTimestamp();

    return embed;
  }

  async execute(message, args = []) {
    await requireRpgCharacter(message.author.id);
    const user = await getUser(message.author.id);

    // Direct buy via text: xws buy <100-110> or xws buy <1-10>
    if (args[0]?.toLowerCase() === "buy" && args[1]) {
      let slotNum = parseInt(args[1], 10);
      if (slotNum >= 1 && slotNum <= 10) slotNum += 100;
      const buyRes = await this.processBuy(user, slotNum, message.channel);
      if (!buyRes.ok) {
        return message.reply(buyRes.message);
      }
      if (buyRes.isCrate) {
        return message.reply({ embeds: [this.buildCrateSuccessEmbed(user, buyRes.price, buyRes.remainingSouls)] });
      }
      const successEmbed = this.buildSuccessEmbed(user, buyRes.weapon, buyRes.item);
      return message.reply({ embeds: [successEmbed] });
    }

    const dateInfo = getDailyShopDateInfo();
    const weapons = generateDailyWeapons(dateInfo.dateKey);
    const payload = this.buildShopPayload(user, dateInfo, weapons);

    return message.reply(payload);
  }

  generateDailyWeapons(dateKey) {
    return generateDailyWeapons(dateKey);
  }

  getDailyShopDateInfo() {
    return getDailyShopDateInfo();
  }
}

module.exports = new WeaponShopCommand();
