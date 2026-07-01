const BaseCommand = require("../../core/BaseCommand");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder,
} = require("discord.js");
const path = require("path");
const config = require("../../data/config");
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
} = require("../../utils/rpgUtil");

const ITEMS_PER_PAGE = 10;

const slotEmoji = {
  weapon: "🗡️",
  armor: "🛡️",
  helmet: "🪖",
  boots: "🥾",
  ring: "💍",
  necklace: "📿",
};

const rarityColor = {
  Common: "#95A5A6",
  Rare: "#3498DB",
  Epic: "#9B59B6",
  Legendary: "#F1C40F",
  Mythic: "#E67E22",
  Ancient: "#E74C3C",
  Divine: "#FFFFFF",
};

const bracketEmoji = {
  Common: "<:Common:1390024590347997245>",
  Rare: "<:Rare:1390024624380706916>",
  Epic: "<:Epic:1390024749517770832>",
  Legendary: "<:Legendary:1390024772200567026>",
  Mythic: "<:Mythic:1390024789279772833>",
  Ancient: "<:Ancient:1390024806535004333>",
  Divine: "<:Divine:1512512382507683880>",
};

const buildGearLine = (item, isEquipped = false) => {
  const idStr = String(item.id).padStart(3, "0");
  const displayName = getGearDisplayName(item);
  const quality = getItemQuality(item);
  const equippedIndicator = isEquipped ? " ✨" : "";
  return `\`G${idStr}\` **${displayName}** ${quality}%${equippedIndicator}`;
};

const formatGearStats = (stats = {}) =>
  Object.entries(stats)
    .filter(([, value]) => value)
    .map(([key, value]) => `**${key.toUpperCase()}:** **+${value}**`)
    .join("   |   ");

const filterLabels = {
  none: "None",
  favorite: "Yêu thích (⭐)",
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
  const equippedIds = new Set(Object.values(user.rpg.equipped || {}));
  const list = pageItems.length
    ? pageItems.map((item) => buildGearLine(item, equippedIds.has(item.id))).join("\n")
    : "*Chưa có trang bị nào khớp bộ lọc.*";

  const filterLabel = filterTypes.includes("none")
    ? "None"
    : filterTypes.map((f) => filterLabels[f] || f).join(", ");

  return new EmbedBuilder()
    .setColor(getRpgClass(user.rpg.classKey)?.color || rpgClass.color)
    .setTitle(`🗡️ @${memberName}'s Weapons`)
    .setDescription(
      `Weapon Filters: **${filterLabel}**\n\n` +
        `${list}`
    );
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
      const equippedEntry = Object.entries(freshOwner.rpg.equipped || {}).find(
        ([, equippedItemId]) => equippedItemId === freshItem.id,
      );

      const imageFile = getItemImageFile(freshItem);
      let subTypeName = freshItem.subType || freshItem.subtype;
      if (!subTypeName) {
        const { getLegacyMapping } = require("../../utils/rpgUtil");
        const mapping = getLegacyMapping(freshItem.slot, freshItem.subType || freshItem.subtype);
        subTypeName = mapping.subType || freshItem.slot.toUpperCase();
      }
      const upgradeStr = freshItem.upgradeLevel && freshItem.upgradeLevel > 0 ? ` +${freshItem.upgradeLevel}` : "";
      
      const ownerName = freshOwner.rpg.name || freshOwner.userId;
      const titleText = `${ownerName}'s ${freshItem.rarity} ${subTypeName}${upgradeStr}`;

      let desc = `**Name:** ${subTypeName}\n` +
                 `**Owner:** <@${freshOwner.userId}>\n` +
                 `**ID:** \`${freshItem.id}\`\n` +
                 `**Sell Value:** 💵 ${freshItem.sellPrice.toLocaleString()} Coke\n` +
                 `**Quality:** 📈 ${getItemQuality(freshItem)}%\n` +
                 `**Wear:** \`${freshItem.rarity.toUpperCase()}\`\n\n`;

      if (freshItem.slot === "weapon") {
        const ownerStats = getEffectiveRpgStats(freshOwner);
        const finalPower = getWeaponPower(freshItem, ownerStats);
        const bonusPower = finalPower - freshItem.power;
        const powerText = `**${finalPower.toLocaleString()}** (+${bonusPower.toLocaleString()})`;

        const scaling = getWeaponScaling(freshItem);
        const scalingText = `STR (${scaling.str})  |  DEX (${scaling.dex})  |  INT (${scaling.int})  |  ARC (${scaling.arc})`;

        desc += `**Lực chiến cơ bản:** ${freshItem.power.toLocaleString()}\n` +
                `**Lực chiến thực tế:** ${powerText}\n` +
                `**Scale:** \`${scalingText}\`\n\n`;

        desc += `__**Description**__\n`;
        
        const dungKey = getDungeonWeaponKey(freshItem.subType || freshItem.subtype);
        if (dungKey) {
          const passives = {
            shadowdagger: "Giảm 30% giáp vật lý của boss/đối thủ vĩnh viễn (Đồng đội cùng hưởng)",
            poisondagger: "Tăng 50% sát thương cho đòn tiếp theo",
            firesword: "Giảm 30% hồi máu của boss/đối thủ trong 2 lượt (30 giây đối với World Boss)",
            greenstaff: "Hồi phục HP bằng 15% sát thương gây ra",
            bluestaff: "Đòn đánh xuyên 50% kháng phép",
            crimsondagger: "Đòn đánh xuyên 50% giáp vật lý",
            holysword: "Đòn đánh thứ 3 gây gấp đôi (2.0x) sát thương",
            darksword: "Giảm 30% sát thương gây ra của boss/đối thủ lượt đó",
            darkstaff: "Áp dụng ngẫu nhiên hiệu ứng burn/weakness/pierce",
            gravitybow: "Lực bắn cực mạnh với hệ số Scale vượt trội DEX (S) | ARC (S) | INT (A) (Không có nội tại kích hoạt)",
            duskanddawn: "Vũ khí giới hạn banner, sở hữu hệ số scale kết hợp độc đáo. Không có nội tại kích hoạt.",
            riverofblood: "Đòn đánh hồi phục HP cho bản thân bằng 2% sát thương gây ra",
            axesnake: "Phá 10% giáp vật lý của đối thủ mỗi khi tấn công hoặc dùng kỹ năng (Cộng dồn)",
            sunbow: "Đòn đánh xuyên 10% giáp vật lý và 10% kháng phép của đối thủ",
            clawhex: "Gây chảy máu khiến đối thủ chịu sát thương bằng 50% Str + 50% Dex mỗi lượt trong 3 lượt",
            spearhex: "Xuyên giáp bỏ qua 10% PR (phòng ngự vật lý) của đối thủ",
            shieldhex: "Hấp thụ sát thương trong 3 round, phản lại 90% sát thương đã nhận ở round 4"
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
        desc += `__**Description**__\n` +
                `**Lực chiến:** +${freshItem.power.toLocaleString()}\n` +
                `**Chỉ số cộng thêm:** ${statsText}\n`;
      }

      const embed = new EmbedBuilder()
        .setColor(rarityColor[freshItem.rarity] || rpgClass.color)
        .setTitle(titleText)
        .setDescription(desc);

      if (imageFile) {
        embed.setThumbnail(`attachment://${path.basename(imageFile)}`);
      }

      const row = new ActionRowBuilder();

      if (equippedEntry) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`gear_uneq_${freshItem.id}`)
            .setLabel("Tháo")
            .setEmoji("🛡️")
            .setStyle(ButtonStyle.Secondary)
        );
      } else {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`gear_equip_${freshItem.id}`)
            .setLabel("Trang bị")
            .setEmoji("🗡️")
            .setStyle(ButtonStyle.Primary)
        );
      }

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`gear_sell_${freshItem.id}`)
          .setLabel("Bán")
          .setEmoji("💰")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(!!freshItem.isFavorite || !!freshItem.isGodset)
      );

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`gear_fav_${freshItem.id}`)
          .setEmoji("⭐")
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
        const assetPath = path.join(__dirname, "../../assets/items", imageFile);
        attachment = new AttachmentBuilder(assetPath, { name: path.basename(imageFile) });
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
          return interaction.reply({ content: "❌ Chỉ chủ sở hữu trang bị mới có quyền thực hiện hành động này!", ephemeral: true });
        }

        if (interaction.customId.startsWith("gear_fav_")) {
          item.isFavorite = !item.isFavorite;
          owner.markModified("rpg");
          await owner.save();

          const updated = getDetailEmbedAndComponents(item, owner);
          await interaction.update({ embeds: [updated.embed], components: [updated.row] });
        }
        else if (interaction.customId.startsWith("gear_equip_")) {
          const { equipRpgItem } = require("../../utils/rpgUtil");
          try {
            const { user: updatedOwner } = await equipRpgItem(owner.userId, item.id);
            const updated = getDetailEmbedAndComponents(item, updatedOwner);
            await interaction.update({ embeds: [updated.embed], components: [updated.row] });
          } catch (err) {
            await interaction.reply({ content: `❌ Lỗi: ${err.message}`, ephemeral: true });
          }
        }
        else if (interaction.customId.startsWith("gear_uneq_")) {
          const { unequipRpgSlot } = require("../../utils/rpgUtil");
          try {
            const { user: updatedOwner } = await unequipRpgSlot(owner.userId, item.slot);
            const updated = getDetailEmbedAndComponents(item, updatedOwner);
            await interaction.update({ embeds: [updated.embed], components: [updated.row] });
          } catch (err) {
            await interaction.reply({ content: `❌ Lỗi: ${err.message}`, ephemeral: true });
          }
        }
        else if (interaction.customId.startsWith("gear_sell_")) {
          const { sellRpgItem } = require("../../utils/rpgUtil");
          try {
            const { cokeGain } = await sellRpgItem(owner.userId, item.id);
            const soldEmbed = new EmbedBuilder()
              .setColor("#95A5A6")
              .setTitle("Trang bị đã được bán")
              .setDescription(`Trang bị này đã được bán lấy **${cokeGain.toLocaleString()} Coke**.`);
            await interaction.update({ embeds: [soldEmbed], components: [] });
            favCollector.stop();
          } catch (err) {
            await interaction.reply({ content: `❌ Lỗi: ${err.message}`, ephemeral: true });
          }
        }
      });

      favCollector.on("end", async () => {
        const updated = getDetailEmbedAndComponents(item, owner);
        const disabledRow = new ActionRowBuilder();
        
        const isUneq = Object.values(owner.rpg.equipped || {}).includes(item.id);
        disabledRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`gear_btn_dis1_${item.id}`)
            .setLabel(isUneq ? "Tháo" : "Trang bị")
            .setEmoji(isUneq ? "🛡️" : "🗡️")
            .setStyle(isUneq ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`gear_btn_dis2_${item.id}`)
            .setLabel("Bán")
            .setEmoji("💰")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`gear_btn_dis3_${item.id}`)
            .setEmoji("⭐")
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
            { label: "Không lọc (None)", value: "none", default: filterTypes.includes("none") },
            { label: "Lọc: Yêu thích (⭐)", value: "favorite", default: filterTypes.includes("favorite") },
            { label: "Lọc: Vũ khí", value: "slot_weapon", default: filterTypes.includes("slot_weapon") },
            { label: "Lọc: Giáp ngực", value: "slot_armor", default: filterTypes.includes("slot_armor") },
            { label: "Lọc: Mũ bảo vệ", value: "slot_helmet", default: filterTypes.includes("slot_helmet") },
            { label: "Lọc: Giày", value: "slot_boots", default: filterTypes.includes("slot_boots") },
            { label: "Lọc: Nhẫn", value: "slot_ring", default: filterTypes.includes("slot_ring") },
            { label: "Lọc: Dây chuyền", value: "slot_necklace", default: filterTypes.includes("slot_necklace") },
            { label: "Lọc: Độ hiếm (Cao -> Thấp)", value: "rarity_all", default: filterTypes.includes("rarity_all") },
            { label: "Lọc chỉ số: Vigor", value: "stat_vigor", default: filterTypes.includes("stat_vigor") },
            { label: "Lọc chỉ số: PR (Physical Resist)", value: "stat_pr", default: filterTypes.includes("stat_pr") },
            { label: "Lọc chỉ số: MR (Magic Resist)", value: "stat_mr", default: filterTypes.includes("stat_mr") },
            { label: "Lọc chỉ số: Strength", value: "stat_str", default: filterTypes.includes("stat_str") },
            { label: "Lọc chỉ số: Dexterity", value: "stat_dex", default: filterTypes.includes("stat_dex") },
            { label: "Lọc chỉ số: Intelligence", value: "stat_int", default: filterTypes.includes("stat_int") },
            { label: "Lọc chỉ số: Arcane", value: "stat_arc", default: filterTypes.includes("stat_arc") }
          )
      );

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("gear_prev")
          .setLabel("◀️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(totalPages <= 1),
        new ButtonBuilder()
          .setCustomId("gear_page_num")
          .setLabel(`${page + 1}/${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("gear_next")
          .setLabel("▶️")
          .setStyle(ButtonStyle.Primary)
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
        await interaction.update(render());
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
        await interaction.update(render());
      } else if (interaction.customId === "gear_prev") {
        const items = getFilteredAndSortedItems();
        const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
        page = page > 0 ? page - 1 : totalPages - 1;
        await interaction.update(render());
      } else if (interaction.customId === "gear_next") {
        const items = getFilteredAndSortedItems();
        const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
        page = page < totalPages - 1 ? page + 1 : 0;
        await interaction.update(render());
      } else if (interaction.customId === "gear_help") {
        const helpText = [
          "**Hướng dẫn rương đồ RPG:**",
          `• Mặc trang bị: \`${config.prefix}equip [ID]\` (Ví dụ: \`${config.prefix}equip 5\`)`,
          `• Tháo trang bị: \`${config.prefix}unequip [Slot]\` (Ví dụ: \`${config.prefix}unequip weapon\`)`,
          `• Bán trang bị lẻ: \`${config.prefix}sellgear [ID]\` (Ví dụ: \`${config.prefix}sellgear 5\`)`,
          `• Bán hàng loạt theo cấp: \`${config.prefix}sellgear [Viết tắt]\` (Ví dụ: \`${config.prefix}sellgear c,r\`)`,
          `• Xem chi tiết trang bị: \`${config.prefix}gear [ID]\` (Ví dụ: \`${config.prefix}gear 5\`)`,
        ].join("\n");
        await interaction.reply({ content: helpText, ephemeral: true });
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
