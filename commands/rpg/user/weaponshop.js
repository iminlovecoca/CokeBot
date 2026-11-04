const BaseCommand = require("../../../core/BaseCommand");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { DateTime } = require("luxon");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const {
  requireRpgCharacter,
  generateRpgGearDrop,
  addRpgGearToUser,
  dungeonWeapons,
} = require("../../../utils/rpgUtil");
const { getWeaponPassive } = require("../../../data/rpg/weaponPassives");
const {
  getRpgColor,
  formatRpgFooter,
  formatRpgTitle,
  safeInteractionReply,
  safeInteractionUpdate,
} = require("../../../utils/rpgUi");

const TIMEZONE = config.rpg?.boss?.spawn_timezone || "Asia/Ho_Chi_Minh";

const NORMAL_SUBTYPES = [
  { name: "Longsword", key: "longsword", emoji: "<:longsword:1514231939865903104>" },
  { name: "Dagger", key: "dagger", emoji: "<:dagger:1514231934191009853>" },
  { name: "Staff", key: "staff", emoji: "<:staff:1514231936581898240>" },
  { name: "Warhammer", key: "warhammer", emoji: "🔨" },
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
  { name: "Búa Lôi Thần Thor", key: "thorshammer", emoji: "<:Holysword:1523379675076755556>" },
  { name: "Búa Toàn Tri Odin", key: "odinhammer", emoji: "<:bluestaff:1514232160897339442>" },
  { name: "Darkhold", key: "darkhold", emoji: "<:darkhold:1544258394695934002>" },
];

const RARITY_BRACKETS = {
  Common: "<:common:1530878565489311826>",
  Rare: "<:rare:1530878574104547378>",
  Epic: "<:epic:1530878567955566642>",
  Legendary: "<:legendary:1530878570858287205>",
  Mythic: "<a:mythic:1530878614843686912>",
  Ancient: "<a:ancient:1530878606656540814>",
  Divine: "<a:divine:1530878610515165365>",
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
  const countdownStr = `${hours}h ${minutes}m ${seconds}s`;
  return { now, dateKey, countdownStr };
}

function generateDailyWeapons(dateKey) {
  const slots = [];
  for (let i = 1; i <= 4; i++) {
    const rng = createSeededRng(`ws_${dateKey}_slot_${i}`);
    const isSpecial = rng() < 0.05; // 5% chance for special weapon (gacha, dungeon, boss)

    let subTypeObj;
    let rarity;
    let price;

    if (isSpecial) {
      const idx = Math.floor(rng() * SPECIAL_SUBTYPES.length);
      subTypeObj = SPECIAL_SUBTYPES[idx];
      const rRoll = rng();
      if (rRoll < 0.50) {
        rarity = "Epic";
        price = 1500000;
      } else if (rRoll < 0.85) {
        rarity = "Legendary";
        price = 2500000;
      } else if (rRoll < 0.96) {
        rarity = "Mythic";
        price = 4000000;
      } else {
        rarity = "Ancient";
        price = 6000000;
      }
    } else {
      const idx = Math.floor(rng() * NORMAL_SUBTYPES.length);
      subTypeObj = NORMAL_SUBTYPES[idx];
      const rRoll = rng();
      if (rRoll < 0.60) {
        rarity = "Common";
        price = 50000;
      } else if (rRoll < 0.85) {
        rarity = "Rare";
        price = 150000;
      } else if (rRoll < 0.97) {
        rarity = "Epic";
        price = 500000;
      } else {
        rarity = "Legendary";
        price = 1200000;
      }
    }

    const basePassive = getWeaponPassive(subTypeObj.key);
    slots.push({
      slotIndex: i,
      name: subTypeObj.name,
      subType: subTypeObj.name,
      key: subTypeObj.key,
      emoji: subTypeObj.emoji,
      rarity,
      isSpecial,
      price,
      fixedPassiveName: basePassive?.name || "Nội Tại Vũ Khí",
    });
  }
  return slots;
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
      description: "Cửa hàng vũ khí hàng ngày (làm mới mỗi 24H theo giờ game).",
      usage: `${config.prefix}weaponshop [buy <1-4>]`,
      category: "rpg",
      cooldown: 0,
    });
  }

  buildShopPayload(user, dateInfo, weapons) {
    const purchasedSlots = getUserShopPurchases(user, dateInfo.dateKey);

    const embed = new EmbedBuilder()
      .setColor("#E67E22")
      .setTitle(formatRpgTitle("Cửa Hàng Vũ Khí 24H • Daily Weapon Shop", "🗡️"))
      .setDescription(
        `Chào mừng bạn đến với **Cửa Hàng Vũ Khí Hàng Ngày**!\n` +
        `⏳ Làm mới sau: **${dateInfo.countdownStr}** (00:00 hàng ngày theo giờ game)\n` +
        `💰 Số dư của bạn: **${user.coke.toLocaleString()} Coke**\n\n` +
        `🌟 **Tỉ lệ vũ khí đặc biệt (Gacha, Dungeon, Boss):** **5%**\n` +
        `*Mỗi lượt mua sẽ nhận ngẫu nhiên chất lượng và chỉ số nội tại scale theo phẩm chất & chất lượng!*`
      );

    const row = new ActionRowBuilder();

    weapons.forEach((w) => {
      const isBought = purchasedSlots.includes(w.slotIndex);
      const bracket = RARITY_BRACKETS[w.rarity] || "<:common:1530878565489311826>";
      const specialBadge = w.isSpecial ? " 🌟 **[ĐẶC BIỆT 5%]**" : "";
      const statusText = isBought ? "✅ *Đã mua hôm nay*" : `💰 **${w.price.toLocaleString()} Coke**`;

      embed.addFields({
        name: `Ô #${w.slotIndex} • ${bracket} ${w.emoji} **${w.name}** [${w.rarity}]${specialBadge}`,
        value:
          `• Giá: ${statusText}\n` +
          `• Nội tại cố định: **${w.fixedPassiveName}** *(Tự scale theo chất lượng khi mua)*\n` +
          `• Nội tại ngẫu nhiên: 🎲 *Random passive kèm theo*\n` +
          `• Phù hợp: Dùng chiến đấu PvP/Boss hoặc trang bị cho Pet`,
        inline: false,
      });

      const btn = new ButtonBuilder()
        .setCustomId(`ws_buy_${w.slotIndex}`)
        .setLabel(`Mua Ô #${w.slotIndex} (${(w.price / 1000).toFixed(0)}k)`)
        .setStyle(w.isSpecial ? ButtonStyle.Danger : ButtonStyle.Primary)
        .setDisabled(isBought || user.coke < w.price);

      row.addComponents(btn);
    });

    embed.setFooter(
      formatRpgFooter(`Dùng nút bên dưới hoặc ${config.prefix}ws buy <1-4> để mua`)
    );

    return { embeds: [embed], components: [row] };
  }

  async processBuy(user, slotIndex, channel) {
    const { dateKey } = getDailyShopDateInfo();
    const weapons = generateDailyWeapons(dateKey);
    const item = weapons.find((w) => w.slotIndex === slotIndex);
    if (!item) {
      return { ok: false, message: "❌ Ô vũ khí không hợp lệ! Vui lòng chọn từ 1 đến 4." };
    }

    const purchasedSlots = getUserShopPurchases(user, dateKey);
    if (purchasedSlots.includes(slotIndex)) {
      return {
        ok: false,
        message: `❌ Bạn đã mua vũ khí ở ô **#${slotIndex}** hôm nay rồi! Hãy quay lại vào ngày mai khi shop làm mới.`,
      };
    }

    if (user.coke < item.price) {
      return {
        ok: false,
        message: `❌ Bạn không đủ Coke! Cần **${item.price.toLocaleString()} Coke** nhưng bạn chỉ có **${user.coke.toLocaleString()} Coke**.`,
      };
    }

    user.coke -= item.price;
    user.rpg.dailyWeaponShop.slots.push(slotIndex);
    user.markModified("rpg");

    const weapon = await generateRpgGearDrop(user, {
      forceDrop: true,
      slot: "weapon",
      subType: item.subType,
      rarity: item.rarity,
      fromWc: true,
      fromDungeon: true,
      fromEvent: true,
      fromAdmin: true,
    });

    if (!weapon) {
      user.coke += item.price;
      user.rpg.dailyWeaponShop.slots = user.rpg.dailyWeaponShop.slots.filter((s) => s !== slotIndex);
      user.markModified("rpg");
      return { ok: false, message: "❌ Đã có lỗi xảy ra khi rèn vũ khí. Vui lòng thử lại!" };
    }

    addRpgGearToUser(user, weapon);
    await user.save();

    return { ok: true, weapon, item, remainingCoke: user.coke };
  }

  buildSuccessEmbed(user, weapon, item) {
    const bracket = RARITY_BRACKETS[weapon.rarity] || "<:common:1530878565489311826>";
    const specialTag = item.isSpecial ? " 🌟 **[ĐẶC BIỆT 5%]**" : "";

    const embed = new EmbedBuilder()
      .setColor(getRpgColor("success"))
      .setTitle(formatRpgTitle(`Mua Vũ Khí Thành Công • Ô #${item.slotIndex}`, "🎉"))
      .setDescription(
        `Chúc mừng **${user.username || "bạn"}** đã sở hữu thành công vũ khí từ Shop Hàng Ngày!\n\n` +
        `${bracket} ${weapon.emoji} **${weapon.name}** [${weapon.wear?.name || "Worn"} • **${weapon.quality.toFixed(1)}%**]${specialTag}\n` +
        `• Sức mạnh cơ bản: **${weapon.power.toLocaleString()} Power**\n` +
        `• Giá mua: **-${item.price.toLocaleString()} Coke** • Số dư còn lại: **${user.coke.toLocaleString()} Coke**\n\n` +
        `🛡️ **Nội tại cố định:**\n` +
        `> **${weapon.fixedPassive?.name || "Nội tại"}**: ${weapon.fixedPassive?.description || "Không có"}\n\n` +
        `🎲 **Nội tại ngẫu nhiên (Random Passive):**\n` +
        `> ${weapon.randomPassive?.description || "Không có"}\n\n` +
        `💡 *Cả 2 nội tại đều đã được tính toán tỉ lệ scale theo chất lượng (${weapon.quality.toFixed(1)}%) và phẩm chất (${weapon.rarity}) của vũ khí!*`
      )
      .setFooter(formatRpgFooter(`Dùng ${config.prefix}gear để xem và trang bị`))
      .setTimestamp();

    return embed;
  }

  async execute(message, args = []) {
    await requireRpgCharacter(message.author.id);
    const user = await getUser(message.author.id);

    // Direct buy via text: coke ws buy 1
    if (args[0]?.toLowerCase() === "buy" && args[1]) {
      const slotNum = parseInt(args[1], 10);
      const buyRes = await this.processBuy(user, slotNum, message.channel);
      if (!buyRes.ok) {
        return message.reply(buyRes.message);
      }
      const successEmbed = this.buildSuccessEmbed(user, buyRes.weapon, buyRes.item);
      return message.reply({ embeds: [successEmbed] });
    }

    const dateInfo = getDailyShopDateInfo();
    const weapons = generateDailyWeapons(dateInfo.dateKey);
    const payload = this.buildShopPayload(user, dateInfo, weapons);

    const shopMsg = await message.reply(payload);

    const collector = shopMsg.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === message.author.id,
      time: 120000,
    });

    collector.on("collect", async (interaction) => {
      const u = await getUser(message.author.id);
      if (interaction.customId.startsWith("ws_buy_")) {
        const slotIdx = parseInt(interaction.customId.replace("ws_buy_", ""), 10);
        const buyRes = await this.processBuy(u, slotIdx, message.channel);
        if (!buyRes.ok) {
          return safeInteractionReply(interaction, { content: buyRes.message, flags: 64 });
        }

        const successEmbed = this.buildSuccessEmbed(u, buyRes.weapon, buyRes.item);
        const updatedDateInfo = getDailyShopDateInfo();
        const updatedWeapons = generateDailyWeapons(updatedDateInfo.dateKey);
        const updatedPayload = this.buildShopPayload(u, updatedDateInfo, updatedWeapons);

        await safeInteractionReply(interaction, { embeds: [successEmbed], flags: 64 });
        await shopMsg.edit(updatedPayload).catch(() => null);
      }
    });

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ws_expired")
          .setLabel("Phiên tương tác cửa hàng đã hết hạn")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );
      await shopMsg.edit({ components: [disabledRow] }).catch(() => null);
    });
  }
}

module.exports = new WeaponShopCommand();
