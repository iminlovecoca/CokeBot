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
  findRpgItem,
  findRpgItemGlobal,
  formatStats,
  getEffectiveRpgStats,
  getEquippedItems,
  getRpgClass,
  getRpgItems,
  getRpgXpNeeded,
  requireRpgCharacter,
  getItemQuality,
  getGearDisplayName,
  getItemImageFile,
  getWeaponPower,
  getWeaponScaling,
  getDungeonWeaponKey,
  WEAPON_SETS,
} = require("../../../utils/rpgUtil");
const {
  ui,
  getRarityEmoji,
  getRarityColor,
  getStatLabel,
  formatRpgFooter,
  formatRpgTitle,
  safeInteractionReply,
  safeInteractionUpdate,
} = require("../../../utils/rpgUi");
const ITEMS_PER_PAGE = 10;
const buildGearLine = (item, isEquipped = false) => {
  const displayName = getGearDisplayName(item);
  const quality = getItemQuality(item);
  const itemId = `G${String(item.id).padStart(3, "0")}`;
  const equippedIndicator = isEquipped ? " · **đang mặc**" : "";
  // getGearDisplayName already contains the single rarity/item icon pair.
  return `\`${itemId}\` ${displayName} · ${quality}%${equippedIndicator}`;
};
const formatGearStats = (stats = {}) =>
  Object.entries(stats)
    .filter(([, value]) => value)
    .map(([key, value]) => `**${getStatLabel(key)}:** +${value}`)
    .join(" • ");
const filterLabels = {
  none: "Không lọc",
  favorite: "Yêu thích",
  slot_weapon: "Vũ khí",
  slot_armor: "Giáp ngực",
  slot_helmet: "Mũ bảo vệ",
  slot_boots: "Giày",
  slot_ring: "Nhẫn",
  slot_necklace: "Dây chuyền",
  rarity_all: "Độ hiếm: Cao -> Thấp",
  stat_vigor: "Chỉ số: Vigor",
  stat_pr: "Chỉ số: PR (Physical Resist)",
  stat_mr: "Chỉ số: MR (Magic Resist)",
  stat_str: "Chỉ số: Strength",
  stat_dex: "Chỉ số: Dexterity",
  stat_int: "Chỉ số: Intelligence",
  stat_arc: "Chỉ số: Arcane",
};
const buildGearListEmbed = ({ user, memberName, items, page, totalPages, filterTypes, sortBy, rpgClass }) => {
  const start = page * ITEMS_PER_PAGE;
  const pageItems = items.slice(start, start + ITEMS_PER_PAGE);
  const equippedIds = new Set(
    Object.values(getEquippedItems(user)).map((item) => String(item.id)),
  );
  const list = pageItems.length
    ? pageItems.map((item) => buildGearLine(item, equippedIds.has(String(item.id)))).join("\n")
    : "*Chưa có trang bị nào khớp bộ lọc.*";
  const filterLabel = filterTypes.includes("none")
    ? "Không lọc"
    : filterTypes.map((f) => filterLabels[f] || f).join(", ");
  return new EmbedBuilder()
    .setColor(getRpgClass(user.rpg.classKey)?.color || rpgClass.color)
    .setTitle(`Kho trang bị • ${memberName}`)
    .setDescription(list)
    .addFields(
      { name: "Lực chiến", value: `**${Math.floor(calculateRpgPower(user)).toLocaleString()}**`, inline: true },
      { name: "Bộ lọc", value: `**${filterLabel}**`, inline: true },
    )
    .setFooter(formatRpgFooter(`Trang ${page + 1}/${totalPages} • đang mặc`));
};
class GearCommand extends BaseCommand {
  constructor() {
    super({
      name: "gear",
      aliases: ["equipment", "power", "tui", "ruong", "ruongdo", "g"],
      description: "Xem trang bị nhân vật RPG đang mặc và Lực chiến hiện tại.",
      usage: `${config.prefix}gear [itemId]`,
      examples: [
        { intent: "Xem danh sách trang bị", command: `${config.prefix}gear` },
        { intent: "Xem chi tiết một món", command: `${config.prefix}gear 3` },
      ],
      cooldown: 0
    });
  }
  async execute(message, args = []) {
    const { user, rpgClass } = await requireRpgCharacter(message.author.id);
    const getDetailEmbedAndComponents = (freshItem, freshOwner) => {
      const equippedEntry = Object.values(getEquippedItems(freshOwner)).find(
        (equippedItem) => String(equippedItem.id) === String(freshItem.id),
      );
      const imageFile = getItemImageFile(freshItem);
      let subTypeName = freshItem.subType || freshItem.subtype;
      if (!subTypeName) {
        const { getLegacyMapping } = require("../../../utils/rpgUtil");
        const mapping = getLegacyMapping(freshItem.slot, freshItem.subType || freshItem.subtype);
        subTypeName = mapping.subType || freshItem.slot.toUpperCase();
      }
      const upgradeStr = freshItem.upgradeLevel && freshItem.upgradeLevel > 0 ? ` +${freshItem.upgradeLevel}` : "";
      const ownerName = freshOwner.rpg.name || freshOwner.userId;
      const titleIcon = freshItem.emoji || getRarityEmoji(freshItem.rarity);
      const titleText = `${titleIcon ? `${titleIcon} ` : ""}${ownerName} • ${subTypeName}${upgradeStr}`;
      let desc = `**Chủ sở hữu:** <@${freshOwner.userId}>\n` +
                 `**Mã trang bị:** \`G${String(freshItem.id).padStart(3, "0")}\`\n` +
                 `**Giá bán:** ${config.emoji.money || "💵"} ${freshItem.sellPrice.toLocaleString()} Coke\n` +
                 `**Chất lượng:** ${getItemQuality(freshItem)}%\n` +
                 `**Độ hiếm:** ${getRarityEmoji(freshItem.rarity)} **${freshItem.rarity}**\n\n`;
      if (freshItem.slot === "weapon") {
        const ownerStats = getEffectiveRpgStats(freshOwner);
        const finalPower = getWeaponPower(freshItem, ownerStats);
        const bonusPower = finalPower - freshItem.power;
        const powerText = `**${finalPower.toLocaleString()}** (+${bonusPower.toLocaleString()})`;
        const scaling = getWeaponScaling(freshItem);
        const scalingText = `STR (${scaling.str})  |  DEX (${scaling.dex})  |  INT (${scaling.int})  |  ARC (${scaling.arc})`;
         desc += `### Sức mạnh vũ khí\n` +
                 `Cơ bản: **${freshItem.power.toLocaleString()}**  •  Thực tế: ${powerText}\n` +
                 `Scale: \`${scalingText}\`\n\n`;
        const freshWeaponSubtype = freshItem.subType || freshItem.subtype;
        const freshWeaponKey = getDungeonWeaponKey(freshWeaponSubtype) || String(freshWeaponSubtype || "").toLowerCase().replace(/\s+/g, "");
        const setInfo = WEAPON_SETS[freshWeaponKey];
        if (setInfo) {
          const bonusText = Object.entries(setInfo.bonus).map(([k, v]) => {
            if (typeof v === "number") return k === "dual" ? "" : `+${Math.round(v * 100)}% ${k.replace(/([A-Z])/g, " $1").toLowerCase()}`;
            return "";
          }).filter(Boolean).join(", ");
           desc += `✦ **Bộ vũ khí:** \`${setInfo.name}\` — ${bonusText}\n\n`;
        }
        desc += `__**Description**__\n`;
        const dungKey = freshWeaponKey;
        if (dungKey) {
          const passives = {
            shadowdagger: "Giảm 30% giáp vật lý của boss/đối thủ vĩnh viễn (Đồng đội cùng hưởng)",
            poisondagger: "Tăng 50% sát thương cho đòn tiếp theo",
            firesword: "Giảm 30% hồi máu của boss/đối thủ trong 2 lượt (30 giây đối với World Boss)",
            greenstaff: "Hồi 10% HP đã mất khi dùng kỹ năng (PvP/World Boss: 45% hồi 10% HP đã mất khi chém thường)",
            bluestaff: "Đòn đánh xuyên 25% kháng phép",
            crimsondagger: "Đòn đánh xuyên 50% giáp vật lý",
            holysword: "Đòn đánh thứ 3 gây gấp đôi (2.0x) sát thương",
            darksword: "Giảm 30% sát thương gây ra của boss/đối thủ lượt đó",
            darkstaff: "Áp dụng ngẫu nhiên hiệu ứng burn/weakness/pierce",
            gravitybow: "Lực bắn cực mạnh với hệ số Scale vượt trội DEX (S) | ARC (B) | INT (A) (Không có nội tại kích hoạt)",
            duskanddawn: "Tấn công thường chém vật lý/phép xen kẽ, 30% cơ hội tấn công thêm 1 lần trong lượt",
            riverofblood: "Đòn đánh hồi phục HP cho bản thân bằng 2% sát thương gây ra",
            axesnake: "Phá 10% giáp vật lý của đối thủ mỗi khi tấn công hoặc dùng kỹ năng (Cộng dồn)",
            sunbow: "Đòn đánh xuyên 10% giáp vật lý và 10% kháng phép của đối thủ",
            clawhex: "Gây chảy máu khiến đối thủ chịu sát thương bằng 50% Str + 50% Dex mỗi lượt trong 3 lượt",
            spearhex: "Xuyên giáp bỏ qua 10% PR (phòng ngự vật lý) của đối thủ",
            shieldhex: "Hấp thụ sát thương trong 3 round, phản lại 90% sát thương đã nhận ở round 4",
            lunashard: "Tăng 15% Tỷ lệ Bạo kích & 25% Sát thương Bạo kích, 20% cơ hội xuyên 15% phòng thủ đối thủ",
            eclipsesoul: "Thiêu đốt giảm 15% sát thương đối thủ trong 2 lượt và gây thêm sát thương phép",
            bladesorrow: "Gây chảy máu trong 3 lượt và giảm 15% giáp mỗi lần kích hoạt (tối đa 30% trong Dungeon)",
            frostgauntlet: "30% cơ hội đóng băng đối thủ trong 1 lượt; Scale INT (S) / ARC (A) / DEX (B)",
            demonbook: "Giải phóng ngẫu nhiên Thiêu Đốt, Phá Giáp hoặc Choáng",
            thorshammer: "Sấm sét có 45% cơ hội làm Choáng đối thủ trong 1 lượt; Scale STR (S) / ARC (A) / DEX (B)",
            odinhammer: "Đòn đánh thứ 3 được tiên tri, gây 1.7x sát thương; Scale INT (S) / ARC (A) / STR (B)",
          };
          const passiveDesc = passives[dungKey] || "Chưa cập nhật nội tại";
          const noPassiveWeapons = ["gravitybow", "duskanddawn"];
          if (noPassiveWeapons.includes(dungKey)) {
            desc += `*${passiveDesc}*\n`;
          } else {
           desc += `*Nội tại (45% kích hoạt): ${passiveDesc}*\n`;
          }
        } else {
          desc += `*Vũ khí cơ bản, không có nội tại đặc biệt.*\n`;
        }
      } else {
        const statsText = formatStats(freshItem.stats) || "Không có";
        desc += `### Chỉ số cộng thêm\n` +
                `Lực chiến: **+${freshItem.power.toLocaleString()}**\n` +
                `${statsText}`;
      }
      const embed = new EmbedBuilder()
        .setColor(getRarityColor(freshItem.rarity, rpgClass.color))
        .setTitle(titleText)
        .setDescription(desc);
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
          .setDisabled(!!freshItem.isFavorite || !!freshItem.isGodset)
      );
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`gear_fav_${freshItem.id}`)
          .setLabel(freshItem.isFavorite ? "Bỏ yêu thích" : "Yêu thích")
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
          `${config.emoji.no} Không tìm thấy trang bị RPG ID \`${itemId}\`.`,
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
          return safeInteractionReply(interaction, { content: "❌ Chỉ chủ sở hữu trang bị mới có quyền thực hiện hành động này!", ephemeral: true });
        }
        if (interaction.customId.startsWith("gear_fav_")) {
          item.isFavorite = !item.isFavorite;
          owner.markModified("rpg");
          await owner.save();
          const updated = getDetailEmbedAndComponents(item, owner);
          await safeInteractionUpdate(interaction, { embeds: [updated.embed], components: [updated.row] });
        }
        else if (interaction.customId.startsWith("gear_equip_")) {
          const { equipRpgItem } = require("../../../utils/rpgUtil");
          try {
            const { user: updatedOwner } = await equipRpgItem(owner.userId, item.id);
            const updated = getDetailEmbedAndComponents(item, updatedOwner);
            await safeInteractionUpdate(interaction, { embeds: [updated.embed], components: [updated.row] });
          } catch (err) {
            await safeInteractionReply(interaction, { content: `❌ Lỗi: ${err.message}`, ephemeral: true });
          }
        }
        else if (interaction.customId.startsWith("gear_uneq_")) {
          const { unequipRpgSlot } = require("../../../utils/rpgUtil");
          try {
            const { user: updatedOwner } = await unequipRpgSlot(owner.userId, item.slot);
            const updated = getDetailEmbedAndComponents(item, updatedOwner);
            await safeInteractionUpdate(interaction, { embeds: [updated.embed], components: [updated.row] });
          } catch (err) {
            await safeInteractionReply(interaction, { content: `❌ Lỗi: ${err.message}`, ephemeral: true });
          }
        }
        else if (interaction.customId.startsWith("gear_sell_")) {
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
            await safeInteractionReply(interaction, { content: `❌ Lỗi: ${err.message}`, ephemeral: true });
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
            .setLabel(item.isFavorite ? "Bỏ yêu thích" : "Yêu thích")
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
    let page = 0;
    let sortBy = "newest";
    let filterTypes = ["none"];
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
          if (!item.stats) return false;
          const getStatVal = (k) => {
            const val = item.stats[k];
            if (typeof val === "number") return val;
            return 0;
          };
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
          .setPlaceholder("Sắp xếp trang bị")
          .addOptions(
            { label: "Sắp xếp theo: Mới nhất", value: "newest", default: sortBy === "newest" },
            { label: "Sắp xếp theo: Cũ nhất", value: "oldest", default: sortBy === "oldest" },
            { label: "Sắp xếp theo Lực chiến", value: "power", default: sortBy === "power" },
            { label: "Sắp xếp theo Độ hiếm", value: "rarity", default: sortBy === "rarity" },
            { label: "Sắp xếp theo Chất lượng (%)", value: "quality", default: sortBy === "quality" }
          )
      );
      const filterRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("gear_filter")
          .setPlaceholder("Bộ lọc trang bị")
          .setMinValues(1)
          .setMaxValues(5)
          .addOptions(
             { label: "Không lọc", value: "none", default: filterTypes.includes("none") },
            { label: "Lọc: Yêu thích", value: "favorite", default: filterTypes.includes("favorite") },
            { label: "Lọc: Vũ khí", value: "slot_weapon", default: filterTypes.includes("slot_weapon") },
            { label: "Lọc: Giáp ngực", value: "slot_armor", default: filterTypes.includes("slot_armor") },
            { label: "Lọc: Mũ bảo vệ", value: "slot_helmet", default: filterTypes.includes("slot_helmet") },
            { label: "Lọc: Giày", value: "slot_boots", default: filterTypes.includes("slot_boots") },
            { label: "Lọc: Nhẫn", value: "slot_ring", default: filterTypes.includes("slot_ring") },
            { label: "Lọc: Dây chuyền", value: "slot_necklace", default: filterTypes.includes("slot_necklace") },
            { label: "Lọc: Độ hiếm (Cao -> Thấp)", value: "rarity_all", default: filterTypes.includes("rarity_all") },
            { label: "Lọc chỉ số: Vigor", value: "stat_vigor", default: filterTypes.includes("stat_vigor") },
             { label: "Lọc chỉ số: PR", value: "stat_pr", default: filterTypes.includes("stat_pr") },
             { label: "Lọc chỉ số: MR", value: "stat_mr", default: filterTypes.includes("stat_mr") },
             { label: "Lọc chỉ số: STR", value: "stat_str", default: filterTypes.includes("stat_str") },
             { label: "Lọc chỉ số: DEX", value: "stat_dex", default: filterTypes.includes("stat_dex") },
             { label: "Lọc chỉ số: INT", value: "stat_int", default: filterTypes.includes("stat_int") },
             { label: "Lọc chỉ số: ARC", value: "stat_arc", default: filterTypes.includes("stat_arc") }
          )
      );
      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("gear_prev")
          .setEmoji(config.emoji.back || "◀️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(totalPages <= 1),
        new ButtonBuilder()
          .setCustomId("gear_page_num")
          .setLabel(`${page + 1}/${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("gear_next")
          .setEmoji(config.emoji.arrow_right || "▶️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(totalPages <= 1),
        new ButtonBuilder()
          .setCustomId("gear_help")
          .setLabel("Trợ giúp")
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
          "**Hướng dẫn rương đồ RPG:**",
          `• Mặc trang bị: \`${config.prefix}equip [ID]\` (Ví dụ: \`${config.prefix}equip 5\`)`,
          `• Tháo trang bị: \`${config.prefix}unequip [Slot]\` (Ví dụ: \`${config.prefix}unequip weapon\`)`,
          `• Bán trang bị lẻ: \`${config.prefix}sellgear [ID]\` (Ví dụ: \`${config.prefix}sellgear 5\`)`,
          `• Bán hàng loạt theo cấp: \`${config.prefix}sellgear [Viết tắt]\` (Ví dụ: \`${config.prefix}sellgear c,r\`)`,
          `• Xem chi tiết trang bị: \`${config.prefix}gear [ID]\` (Ví dụ: \`${config.prefix}gear 5\`)`,
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
