const BaseCommand = require("../../../core/BaseCommand");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder,
} = require("discord.js");
const path = require("path");
const fs = require("fs");
const config = require("../../../data/config");
const {
  calculateRpgPower,
  findRpgItemGlobal,
  getEffectiveRpgStats,
  getEquippedItems,
  getEquippedPet,
  getRpgClass,
  getRpgItems,
  requireRpgCharacter,
  getItemQuality,
  getItemImageFile,
  getWeaponPower,
  getWeaponScaling,
  getDungeonWeaponKey,
  getLegacyMapping,
  WEAPON_SETS,
} = require("../../../utils/rpgUtil");
const {
  ui,
  getClassEmoji,
  getRarityEmoji,
  getRarityColor,
  getStatLabel,
  formatRpgFooter,
  formatRpgTitle,
  safeInteractionReply,
  safeInteractionUpdate,
} = require("../../../utils/rpgUi");
const {
  getWeaponPassiveEmojis,
  formatWeaponRichDescription,
  getStatEmojis,
  getStatusEmojis,
} = require("../../../data/rpg/weaponPassives");

const ITEMS_PER_PAGE = 15;

const getWearTier = (quality) => {
  const q = Number(quality) || 0;
  if (q >= 95) return "PRISTINE";
  if (q >= 80) return "FINE";
  if (q >= 60) return "DECENT";
  if (q >= 40) return "WORN";
  return "JAGGED";
};

const resolveItemDisplayMeta = (item) => {
  const slotEmoji = {
    weapon: "<:longsword:1514231939865903104>",
    armor: "<:heavyarmor:1514232237724401716>",
    helmet: "<:warriorhelmet:1514232262793629836>",
    boots: "<:knightboot:1514232296000192582>",
    ring: "<:ring:1514236487707791391>",
    necklace: "<:necklace:1514236494859206729>",
  };
  const defaultUnicodeSet = new Set(["🗡️", "🛡️", "🪖", "🥾", "💍", "📿", "📖", "🔨", "🦉", "⚡"]);
  let subTypeName = item.subType || item.subtype || "";
  let emoji = item.emoji || "";

  const { dungeonWeapons } = require("../../../utils/rpgUtil");
  const dungKey = getDungeonWeaponKey(subTypeName);
  const dungWeapon = dungKey ? dungeonWeapons.find((dw) => dw.key === dungKey) : null;
  if (dungWeapon) {
    subTypeName = dungWeapon.name;
    emoji = dungWeapon.emoji;
  } else if (!subTypeName || !emoji || defaultUnicodeSet.has(emoji)) {
    const mapping = getLegacyMapping(item.slot);
    if (mapping.subType && !subTypeName) subTypeName = mapping.subType;
    if (mapping.emoji && (!emoji || defaultUnicodeSet.has(emoji))) emoji = mapping.emoji;
  }

  subTypeName = subTypeName || (item.slot ? item.slot.toUpperCase() : "ITEM");
  emoji = (!emoji || defaultUnicodeSet.has(emoji)) ? (slotEmoji[item.slot] || "<:heavyarmor:1514232237724401716>") : emoji;
  return { subTypeName, emoji };
};

const getGearStatBadges = (item) => {
  const se = getStatEmojis();
  if (item.slot === "weapon") {
    return getWeaponPassiveEmojis(item.subType || item.subtype || item.name);
  }
  const stats = item.stats || {};
  const badges = [];
  for (const [k, v] of Object.entries(stats)) {
    if (!v) continue;
    const norm = k.toLowerCase();
    if (norm === "vigor" || norm === "vit") badges.push(se.hp);
    else if (norm === "pr" || norm === "def") badges.push(se.pr);
    else if (norm === "mr") badges.push(se.mr);
    else if (norm === "str" || norm === "dex" || norm === "agi") badges.push(se.att);
    else if (norm === "int") badges.push(se.mag);
    else if (norm === "arc" || norm === "luck") badges.push(se.wp);
  }
  return [...new Set(badges)].slice(0, 2).join("");
};

const buildGearLine = (item, isEquipped = false, user = null, memberName = "") => {
  const { subTypeName, emoji } = resolveItemDisplayMeta(item);
  const rankEmoji = getRarityEmoji(item.rarity);
  const badgeEmojis = getGearStatBadges(item);
  const quality = getItemQuality(item);
  const itemId = `G${String(item.id).padStart(4, "0")}`;
  const upgradeBracket = item.upgradeLevel && item.upgradeLevel > 0 ? ` [${item.upgradeLevel}]` : "";
  const favPrefix = item.isFavorite ? `${config.emoji.slots_heart} ` : "";

  let equippedIndicator = "";
  if (isEquipped) {
    const pet = user ? getEquippedPet(user) : null;
    if (pet) {
      equippedIndicator = ` ➤ ${pet.emoji || getClassEmoji(user?.rpg?.classKey)} ${pet.nickname || pet.name}`;
    } else {
      const classIcon = getClassEmoji(user?.rpg?.classKey);
      const charName = user?.rpg?.name || memberName || "Equipped";
      equippedIndicator = ` ➤ ${classIcon} ${charName}`;
    }
  }

  return `\`${itemId}\` ${rankEmoji}${emoji}${badgeEmojis} ${favPrefix}**${subTypeName}${upgradeBracket}** ${quality}%${equippedIndicator}`;
};

const filterLabels = {
  none: "None",
  favorite: "Favorite",
  slot_weapon: "Weapon",
  slot_armor: "Armor",
  slot_helmet: "Helmet",
  slot_boots: "Boots",
  slot_ring: "Ring",
  slot_necklace: "Necklace",
  rarity_all: "Rarity (High -> Low)",
  stat_vigor: "Vigor (HP)",
  stat_pr: "PR",
  stat_mr: "MR",
  stat_str: "STR",
  stat_dex: "DEX",
  stat_int: "INT",
  stat_arc: "ARC",
};

const buildGearListEmbed = ({ user, memberName, items, page, totalPages, filterTypes, rpgClass }) => {
  const start = page * ITEMS_PER_PAGE;
  const pageItems = items.slice(start, start + ITEMS_PER_PAGE);
  const equippedIds = new Set(
    Object.values(getEquippedItems(user)).map((item) => String(item.id)),
  );
  const list = pageItems.length
    ? pageItems.map((item) => buildGearLine(item, equippedIds.has(String(item.id)), user, memberName)).join("\n")
    : "*Chưa có vũ khí / trang bị nào khớp bộ lọc.*";

  const isWeaponOnly = filterTypes.length === 1 && filterTypes[0] === "slot_weapon";
  const headerTitle = isWeaponOnly
    ? `### <:longsword:1514231939865903104> <@${user.userId}>'s Weapons`
    : `### <:longsword:1514231939865903104> <@${user.userId}>'s Weapons & Gear`;

  const filterLabel = filterTypes.includes("none")
    ? "`None`"
    : filterTypes.map((f) => `\`${filterLabels[f] || f}\``).join(" ");

  const description = [
    headerTitle,
    `**Weapon Filters:** ${filterLabel}`,
    `──────────────────────────────────────`,
    list,
    `──────────────────────────────────────`,
  ].join("\n");

  return new EmbedBuilder()
    .setColor(getRpgClass(user.rpg.classKey)?.color || rpgClass.color)
    .setDescription(description)
    .setFooter(
      formatRpgFooter(
        `Trang ${page + 1}/${totalPages} • Tổng: ${items.length} món • Lực chiến: ${Math.floor(calculateRpgPower(user)).toLocaleString()}`
      )
    );
};

class GearCommand extends BaseCommand {
  constructor() {
    super({
      name: "gear",
      aliases: ["equipment", "power", "tui", "ruong", "ruongdo", "g", "weapon", "weapons", "w", "wp"],
      description: "Xem kho vũ khí, trang bị RPG và chi tiết nội tại/chỉ số.",
      usage: `${config.prefix}gear [itemId]`,
      examples: [
        { intent: "Xem danh sách vũ khí & trang bị", command: `${config.prefix}gear` },
        { intent: "Xem danh sách vũ khí", command: `${config.prefix}w` },
        { intent: "Xem chi tiết một vũ khí/trang bị", command: `${config.prefix}w G0003` },
      ],
      cooldown: 0,
    });
  }

  async execute(message, args = []) {
    const { user, rpgClass } = await requireRpgCharacter(message.author.id);
    const se = getStatEmojis();
    const st = getStatusEmojis();

    const getDetailEmbedAndComponents = (freshItem, freshOwner) => {
      const equippedEntry = Object.values(getEquippedItems(freshOwner)).find(
        (equippedItem) => String(equippedItem.id) === String(freshItem.id),
      );
      const { subTypeName } = resolveItemDisplayMeta(freshItem);
      const upgradeStr = freshItem.upgradeLevel && freshItem.upgradeLevel > 0 ? ` [+${freshItem.upgradeLevel}]` : "";
      const ownerName = freshOwner.rpg?.name || message.member?.displayName || message.author.username;
      const quality = getItemQuality(freshItem);
      const wearLabel = getWearTier(quality);
      const itemIdCode = `G${String(freshItem.id).padStart(4, "0")}`;

      const titleText = `${ownerName}'s ${subTypeName}${upgradeStr}`;

      const infoLines = [
        `**Name:** ${subTypeName}${upgradeStr}`,
        `**Owner:** <@${freshOwner.userId}>`,
        `**ID:** \`${itemIdCode}\``,
        `**Sell Value:** ${config.emoji.money} ${freshItem.sellPrice.toLocaleString()}`,
        `**Quality:** ${getRarityEmoji(freshItem.rarity)} ${quality}%`,
        `**Wear:** \`${wearLabel}\``,
      ];

      if (freshItem.slot === "weapon") {
        const ownerStats = getEffectiveRpgStats(freshOwner);
        const finalPower = getWeaponPower(freshItem, ownerStats);
        const bonusPower = finalPower - freshItem.power;
        const scaling = getWeaponScaling(freshItem);

        const scalingBadges = [];
        if (scaling.str && scaling.str !== "-") scalingBadges.push(`${se.att} STR **${scaling.str}**`);
        if (scaling.dex && scaling.dex !== "-") scalingBadges.push(`${se.att} DEX **${scaling.dex}**`);
        if (scaling.int && scaling.int !== "-") scalingBadges.push(`${se.mag} INT **${scaling.int}**`);
        if (scaling.arc && scaling.arc !== "-") scalingBadges.push(`${se.wp} ARC **${scaling.arc}**`);
        if (scaling.pr && scaling.pr !== "-") scalingBadges.push(`${se.pr} PR **${scaling.pr}**`);
        if (scaling.mr && scaling.mr !== "-") scalingBadges.push(`${se.mr} MR **${scaling.mr}**`);

        infoLines.push(
          `**Weapon Power:** ${finalPower.toLocaleString()} ${se.wp} *(Base: ${freshItem.power.toLocaleString()} • +${bonusPower.toLocaleString()})*`,
          `**Scaling:** ${scalingBadges.length ? scalingBadges.join("  •  ") : "None"}`,
          "",
          `__**Description**__`
        );

        const freshWeaponSubtype = freshItem.subType || freshItem.subtype || subTypeName;
        const freshWeaponKey =
          getDungeonWeaponKey(freshWeaponSubtype) ||
          String(freshWeaponSubtype || "").toLowerCase().replace(/\s+/g, "");
        const setInfo = WEAPON_SETS[freshWeaponKey] || WEAPON_SETS[getDungeonWeaponKey(freshWeaponSubtype)] || null;

        infoLines.push(formatWeaponRichDescription(freshWeaponSubtype, setInfo));
      } else {
        infoLines.push(
          `**Gear Power:** +${freshItem.power.toLocaleString()} ${se.pr}`,
          "",
          `__**Description**__`,
          `Trang bị phòng hộ cấp **${freshItem.rarity}**, gia tăng trực tiếp chỉ số chiến đấu khi mặc lên người:`
        );

        const statLines = [];
        for (const [k, v] of Object.entries(freshItem.stats || {})) {
          if (!v) continue;
          const norm = k.toLowerCase();
          let icon = se.hp;
          if (norm === "pr" || norm === "def") icon = se.pr;
          else if (norm === "mr") icon = se.mr;
          else if (norm === "str" || norm === "dex" || norm === "agi") icon = se.att;
          else if (norm === "int") icon = se.mag;
          else if (norm === "arc" || norm === "luck") icon = se.wp;
          statLines.push(`> ${icon} __**${getStatLabel(norm)}**__ - Cộng thêm **+${v}** điểm chỉ số.`);
        }
        if (statLines.length === 0) {
          statLines.push(`> ${st.taunt} __**Phòng Hộ Cơ Bản**__ - Cung cấp **+${freshItem.power.toLocaleString()}** Lực chiến phòng ngự.`);
        }
        infoLines.push(...statLines);
      }

      const embed = new EmbedBuilder()
        .setColor(getRarityColor(freshItem.rarity, rpgClass.color))
        .setTitle(titleText)
        .setDescription(infoLines.join("\n"))
        .setFooter(
          formatRpgFooter(
            `Cường hóa: +${freshItem.upgradeLevel || 0}  •  Độ hiếm: ${freshItem.rarity}`
          )
        );

      const row = new ActionRowBuilder();
      if (equippedEntry) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`gear_uneq_${freshItem.id}`)
            .setLabel("Tháo")
            .setStyle(ButtonStyle.Secondary)
        );
      } else {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`gear_equip_${freshItem.id}`)
            .setLabel("Trang bị")
            .setStyle(ButtonStyle.Primary)
        );
      }
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`gear_sell_${freshItem.id}`)
          .setLabel("Bán")
          .setEmoji(config.emoji.money)
          .setStyle(ButtonStyle.Danger)
          .setDisabled(!!freshItem.isFavorite || !!freshItem.isGodset),
        new ButtonBuilder()
          .setCustomId(`gear_fav_${freshItem.id}`)
          .setEmoji(config.emoji.slots_heart)
          .setStyle(freshItem.isFavorite ? ButtonStyle.Success : ButtonStyle.Secondary)
      );
      return { embed, row };
    };

    const cleanArg = args[0] ? args[0].trim().replace(/^[gG]/, "") : "";
    const itemId = Number(cleanArg);
    if (Number.isInteger(itemId) && itemId > 0) {
      const result = await findRpgItemGlobal(itemId);
      if (!result) {
        return message.reply(
          `${config.emoji.no} Không tìm thấy vũ khí / trang bị RPG ID \`G${String(itemId).padStart(4, "0")}\`.`
        );
      }
      const { item, owner } = result;
      const { embed, row } = getDetailEmbedAndComponents(item, owner);
      const imageFile = getItemImageFile(item);
      let attachment = null;
      if (imageFile) {
        const assetPath = path.join(__dirname, "../../../assets/items", imageFile);
        if (fs.existsSync(assetPath)) {
          attachment = new AttachmentBuilder(assetPath, { name: path.basename(imageFile) });
          embed.setThumbnail(`attachment://${path.basename(imageFile)}`);
        }
      }
      const replyOptions = { embeds: [embed], components: [row] };
      if (attachment) {
        replyOptions.files = [attachment];
      }
      const detailMsg = await message.reply(replyOptions);
      const favCollector = detailMsg.createMessageComponentCollector({
        filter: (interaction) =>
          interaction.customId === `gear_fav_${item.id}` ||
          interaction.customId === `gear_equip_${item.id}` ||
          interaction.customId === `gear_uneq_${item.id}` ||
          interaction.customId === `gear_sell_${item.id}`,
        time: 5 * 60 * 1000,
      });
      favCollector.on("collect", async (interaction) => {
        if (interaction.user.id !== owner.userId) {
          return safeInteractionReply(interaction, {
            content: `${config.emoji.no} Chỉ chủ sở hữu trang bị mới có quyền thực hiện hành động này!`,
            ephemeral: true,
          });
        }
        if (interaction.customId.startsWith("gear_fav_")) {
          item.isFavorite = !item.isFavorite;
          owner.markModified("rpg");
          await owner.save();
          const updated = getDetailEmbedAndComponents(item, owner);
          await safeInteractionUpdate(interaction, { embeds: [updated.embed], components: [updated.row] });
        } else if (interaction.customId.startsWith("gear_equip_")) {
          const { equipRpgItem } = require("../../../utils/rpgUtil");
          try {
            const { user: updatedOwner } = await equipRpgItem(owner.userId, item.id);
            const updated = getDetailEmbedAndComponents(item, updatedOwner);
            await safeInteractionUpdate(interaction, { embeds: [updated.embed], components: [updated.row] });
          } catch (err) {
            await safeInteractionReply(interaction, { content: `${config.emoji.no} Lỗi: ${err.message}`, ephemeral: true });
          }
        } else if (interaction.customId.startsWith("gear_uneq_")) {
          const { unequipRpgSlot } = require("../../../utils/rpgUtil");
          try {
            const { user: updatedOwner } = await unequipRpgSlot(owner.userId, item.slot);
            const updated = getDetailEmbedAndComponents(item, updatedOwner);
            await safeInteractionUpdate(interaction, { embeds: [updated.embed], components: [updated.row] });
          } catch (err) {
            await safeInteractionReply(interaction, { content: `${config.emoji.no} Lỗi: ${err.message}`, ephemeral: true });
          }
        } else if (interaction.customId.startsWith("gear_sell_")) {
          const { sellRpgItem } = require("../../../utils/rpgUtil");
          try {
            const { cokeGain } = await sellRpgItem(owner.userId, item.id);
            const soldEmbed = new EmbedBuilder()
              .setColor(ui.colors?.neutral || "#747F8D")
              .setTitle(formatRpgTitle("Đã bán trang bị", ui.icons?.success))
              .setDescription(`Bạn nhận được ${config.emoji.money} **${cokeGain.toLocaleString()} Coke**.`)
              .setFooter(formatRpgFooter("Giao dịch hoàn tất"));
            await safeInteractionUpdate(interaction, { embeds: [soldEmbed], components: [] });
            favCollector.stop();
          } catch (err) {
            await safeInteractionReply(interaction, { content: `${config.emoji.no} Lỗi: ${err.message}`, ephemeral: true });
          }
        }
      });
      favCollector.on("end", async () => {
        const updated = getDetailEmbedAndComponents(item, owner);
        const disabledRow = new ActionRowBuilder();
        const isUneq = Object.values(getEquippedItems(owner)).some(
          (equippedItem) => String(equippedItem.id) === String(item.id),
        );
        disabledRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`gear_btn_dis1_${item.id}`)
            .setLabel(isUneq ? "Tháo" : "Trang bị")
            .setStyle(isUneq ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`gear_btn_dis2_${item.id}`)
            .setLabel("Bán")
            .setEmoji(config.emoji.money)
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`gear_btn_dis3_${item.id}`)
            .setEmoji(config.emoji.slots_heart)
            .setStyle(item.isFavorite ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(true)
        );
        await detailMsg.edit({ embeds: [updated.embed], components: [disabledRow] }).catch(() => {});
      });
      return detailMsg;
    }

    user.rpg.power = calculateRpgPower(user);
    await user.save();
    const allItems = getRpgItems(user);
    const memberName = message.member?.displayName || message.author.username;

    // If invoked via xw / xweapon / xweapons / xwp, default filter to weapons like OwO `ow`
    const rawCmd = message.content
      .slice(config.prefix.length)
      .trim()
      .split(/\s+/)[0]
      ?.toLowerCase();
    const isWeaponCommand = ["w", "wp", "weapon", "weapons"].includes(rawCmd);

    let page = 0;
    let sortBy = "newest";
    let filterTypes = isWeaponCommand ? ["slot_weapon"] : ["none"];

    const getFilteredAndSortedItems = () => {
      let filtered = [...allItems];
      if (filterTypes.includes("favorite")) {
        filtered = filtered.filter((item) => item.isFavorite);
      }
      const slotFilters = filterTypes.filter((f) => f.startsWith("slot_"));
      if (slotFilters.length > 0) {
        const slots = slotFilters.map((f) => f.slice(5));
        filtered = filtered.filter((item) => slots.includes(item.slot));
      }
      const rarityFilters = filterTypes.filter((f) => f.startsWith("rarity_"));
      if (rarityFilters.length > 0) {
        if (rarityFilters.includes("rarity_all")) {
          sortBy = "rarity";
        } else {
          const rarities = rarityFilters.map((f) => f.slice(7));
          filtered = filtered.filter((item) => rarities.includes(item.rarity));
        }
      }
      const statFilters = filterTypes.filter((f) => f.startsWith("stat_"));
      if (statFilters.length > 0) {
        const statsToFind = statFilters.map((f) => f.slice(5));
        filtered = filtered.filter((item) => {
          if (item.slot === "weapon") {
            const sc = getWeaponScaling(item);
            return statsToFind.every((statName) => sc[statName] && sc[statName] !== "-");
          }
          if (!item.stats) return false;
          const getStatVal = (k) => (typeof item.stats[k] === "number" ? item.stats[k] : 0);
          const hasStat = (statName) => {
            if (statName === "vigor") return getStatVal("vigor") > 0 || getStatVal("vit") > 0;
            if (statName === "pr") return getStatVal("pr") > 0 || getStatVal("def") > 0;
            if (statName === "dex") return getStatVal("dex") > 0 || getStatVal("agi") > 0;
            if (statName === "arc") return getStatVal("arc") > 0 || getStatVal("luck") > 0;
            return getStatVal(statName) > 0;
          };
          return statsToFind.every((statName) => hasStat(statName));
        });
      }
      if (sortBy === "newest") {
        filtered.sort((a, b) => b.id - a.id);
      } else if (sortBy === "oldest") {
        filtered.sort((a, b) => a.id - b.id);
      } else if (sortBy === "power") {
        filtered.sort((a, b) => b.power - a.power);
      } else if (sortBy === "rarity") {
        const rarityOrder = ["Common", "Rare", "Epic", "Legendary", "Mythic", "Ancient", "Divine"];
        filtered.sort((a, b) => rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity));
      } else if (sortBy === "quality") {
        filtered.sort((a, b) => getItemQuality(b) - getItemQuality(a));
      }
      return filtered;
    };

    const buildComponents = (total) => {
      const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
      const sortRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("gear_sort")
          .setPlaceholder("Sort by Weapon ID")
          .addOptions(
            { label: "Sort by Weapon ID (Newest)", value: "newest", default: sortBy === "newest" },
            { label: "Sort by Weapon ID (Oldest)", value: "oldest", default: sortBy === "oldest" },
            { label: "Sort by Quality (%)", value: "quality", default: sortBy === "quality" },
            { label: "Sort by Rarity", value: "rarity", default: sortBy === "rarity" },
            { label: "Sort by Power", value: "power", default: sortBy === "power" }
          )
      );
      const filterRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("gear_filter")
          .setPlaceholder("Filter Weapons & Gear")
          .setMinValues(1)
          .setMaxValues(5)
          .addOptions(
            { label: "None (Show All)", value: "none", default: filterTypes.includes("none") },
            { label: "Filter: Favorite", value: "favorite", default: filterTypes.includes("favorite") },
            { label: "Filter: Weapons Only", value: "slot_weapon", default: filterTypes.includes("slot_weapon") },
            { label: "Filter: Armor", value: "slot_armor", default: filterTypes.includes("slot_armor") },
            { label: "Filter: Helmet", value: "slot_helmet", default: filterTypes.includes("slot_helmet") },
            { label: "Filter: Boots", value: "slot_boots", default: filterTypes.includes("slot_boots") },
            { label: "Filter: Ring", value: "slot_ring", default: filterTypes.includes("slot_ring") },
            { label: "Filter: Necklace", value: "slot_necklace", default: filterTypes.includes("slot_necklace") },
            { label: "Filter: Rarity (High -> Low)", value: "rarity_all", default: filterTypes.includes("rarity_all") },
            { label: "Stat: Vigor (HP)", value: "stat_vigor", default: filterTypes.includes("stat_vigor") },
            { label: "Stat: PR", value: "stat_pr", default: filterTypes.includes("stat_pr") },
            { label: "Stat: MR", value: "stat_mr", default: filterTypes.includes("stat_mr") },
            { label: "Stat: STR (ATT)", value: "stat_str", default: filterTypes.includes("stat_str") },
            { label: "Stat: DEX (ATT)", value: "stat_dex", default: filterTypes.includes("stat_dex") },
            { label: "Stat: INT (MAG)", value: "stat_int", default: filterTypes.includes("stat_int") },
            { label: "Stat: ARC (WP)", value: "stat_arc", default: filterTypes.includes("stat_arc") }
          )
      );
      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("gear_prev")
          .setEmoji(config.emoji.arrow_left)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(totalPages <= 1),
        new ButtonBuilder()
          .setCustomId("gear_page_num")
          .setLabel(`${page + 1}/${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("gear_next")
          .setEmoji(config.emoji.arrow_right)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(totalPages <= 1),
        new ButtonBuilder()
          .setCustomId("gear_help")
          .setLabel("?")
          .setStyle(ButtonStyle.Secondary)
      );
      return [sortRow, filterRow, buttonRow];
    };

    const render = () => {
      const items = getFilteredAndSortedItems();
      const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
      if (page >= totalPages) page = totalPages - 1;
      if (page < 0) page = 0;
      const embed = buildGearListEmbed({
        user,
        memberName,
        items,
        page,
        totalPages,
        filterTypes,
        sortBy,
        rpgClass,
      });
      const components = buildComponents(items.length);
      return { embeds: [embed], components };
    };

    const payload = render();
    const sentMessage = await message.reply(payload);
    const collector = sentMessage.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === message.author.id,
      time: 5 * 60 * 1000,
    });
    collector.on("collect", async (interaction) => {
      if (interaction.customId === "gear_sort") {
        sortBy = interaction.values[0];
        page = 0;
        await safeInteractionUpdate(interaction, render());
      } else if (interaction.customId === "gear_filter") {
        let selected = interaction.values;
        if (selected.includes("none")) {
          if (selected.length > 1) {
            if (!filterTypes.includes("none")) {
              selected = ["none"];
            } else {
              selected = selected.filter((v) => v !== "none");
            }
          }
        }
        if (selected.includes("rarity_all")) {
          sortBy = "rarity";
        }
        filterTypes = selected;
        page = 0;
        await safeInteractionUpdate(interaction, render());
      } else if (interaction.customId === "gear_prev") {
        const items = getFilteredAndSortedItems();
        const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
        page = page > 0 ? page - 1 : totalPages - 1;
        await safeInteractionUpdate(interaction, render());
      } else if (interaction.customId === "gear_next") {
        const items = getFilteredAndSortedItems();
        const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
        page = page < totalPages - 1 ? page + 1 : 0;
        await safeInteractionUpdate(interaction, render());
      } else if (interaction.customId === "gear_help") {
        const helpText = [
          "**<:longsword:1514231939865903104> Hướng dẫn Kho Vũ Khí & Trang Bị:**",
          `• Xem kho vũ khí: \`${config.prefix}w\` hoặc \`${config.prefix}gear\``,
          `• Xem chi tiết vũ khí/trang bị: \`${config.prefix}w [ID]\` (Ví dụ: \`${config.prefix}w G0005\`)`,
          `• Trang bị nhanh: \`${config.prefix}equip [ID]\``,
          `• Tháo trang bị: \`${config.prefix}unequip [Slot]\``,
          `• Cường hóa vũ khí: \`${config.prefix}enhance [ID]\``,
          `• Bán trang bị: \`${config.prefix}sellgear [ID / c,r,e]\``,
        ].join("\n");
        await safeInteractionReply(interaction, { content: helpText, ephemeral: true });
      }
    });
    collector.on("end", async () => {
      const finalPayload = render();
      await sentMessage.edit({ embeds: finalPayload.embeds, components: [] }).catch(() => {});
    });
    return sentMessage;
  }
}

module.exports = new GearCommand();
