const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
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
  slot_weapon: "Vũ khí",
  slot_armor: "Giáp ngực",
  slot_helmet: "Mũ bảo vệ",
  slot_boots: "Giày",
  slot_ring: "Nhẫn",
  slot_necklace: "Dây chuyền",
  rarity_Common: "Cấp Common",
  rarity_Rare: "Cấp Rare",
  rarity_Epic: "Cấp Epic",
  rarity_Legendary: "Cấp Legendary",
  rarity_Mythic: "Cấp Mythic",
  rarity_Ancient: "Cấp Ancient",
  rarity_Divine: "Cấp Divine",
};

const buildGearListEmbed = ({ user, memberName, items, page, totalPages, filterType, sortBy, rpgClass }) => {
  const start = page * ITEMS_PER_PAGE;
  const pageItems = items.slice(start, start + ITEMS_PER_PAGE);
  const equippedIds = new Set(Object.values(user.rpg.equipped || {}));
  const list = pageItems.length
    ? pageItems.map((item) => buildGearLine(item, equippedIds.has(item.id))).join("\n")
    : "*Chưa có trang bị nào khớp bộ lọc.*";

  const filterLabel = filterLabels[filterType] || "None";

  return new EmbedBuilder()
    .setColor(getRpgClass(user.rpg.classKey)?.color || rpgClass.color)
    .setTitle(`🗡️ @${memberName}'s Weapons`)
    .setDescription(
      `Weapon Filters: **${filterLabel}**\n\n` +
        `${list}`
    );
};

module.exports = {
  name: "gear",
  aliases: ["equipment", "power", "tui", "ruong", "ruongdo"],
  description: "Xem trang bị nhân vật RPG đang mặc và Lực chiến hiện tại.",
  usage: `${config.prefix}gear [itemId]`,
  examples: [
    { intent: "Xem danh sách trang bị", command: `${config.prefix}gear` },
    { intent: "Xem chi tiết một món", command: `${config.prefix}gear 3` },
  ],

  async execute(message, args = []) {
    const { user, rpgClass } = await requireRpgCharacter(message.author.id);

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

      const equippedEntry = Object.entries(owner.rpg.equipped || {}).find(
        ([, equippedItemId]) => equippedItemId === item.id,
      );

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(rarityColor[item.rarity] || rpgClass.color)
            .setTitle(getGearDisplayName(item))
            .setDescription(
              `ID: \`${item.id}\`\n` +
                `UID: \`${item.uid || "N/A"}\`\n` +
                `Sở hữu bởi: <@${owner.userId}>\n` +
                `Slot: **${config.rpg.gear_slot_names[item.slot]}**\n` +
                `Rarity: **${item.rarity}**\n` +
                `Chất lượng: **${getItemQuality(item)}%**\n` +
                `Lực chiến: **+${item.power.toLocaleString()}**\n` +
                `Stats: **${formatGearStats(item.stats) || "Không có"}**\n` +
                `Đang mặc: **${equippedEntry ? "Có ✨" : "Không"}**\n` +
                `Giá bán: **${item.sellPrice.toLocaleString()} Coke**\n` +
                `Image key: \`${item.imageKey}\``,
            )
            .addFields({
              name: "Lệnh tương tác",
              value:
                `Trang bị: \`${config.prefix}equip ${item.id}\`\n` +
                `Tháo: \`${config.prefix}unequip ${item.slot}\`\n` +
                `Bán: \`${config.prefix}sellgear ${item.id}\``,
            }),
        ],
      });
    }

    user.rpg.power = calculateRpgPower(user);
    await user.save();

    const allItems = getRpgItems(user);
    const memberName = message.member?.displayName || message.author.username;

    let page = 0;
    let sortBy = "id";
    let filterType = "none";

    const getFilteredAndSortedItems = () => {
      let filtered = [...allItems];
      if (filterType.startsWith("slot_")) {
        const slot = filterType.slice(5);
        filtered = filtered.filter((item) => item.slot === slot);
      } else if (filterType.startsWith("rarity_")) {
        const rarity = filterType.slice(7);
        filtered = filtered.filter((item) => item.rarity === rarity);
      }

      if (sortBy === "id") {
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
            { label: "Sắp xếp theo ID", value: "id", default: sortBy === "id" },
            { label: "Sắp xếp theo Lực chiến", value: "power", default: sortBy === "power" },
            { label: "Sắp xếp theo Độ hiếm", value: "rarity", default: sortBy === "rarity" },
            { label: "Sắp xếp theo Chất lượng (%)", value: "quality", default: sortBy === "quality" }
          )
      );

      const filterRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("gear_filter")
          .setPlaceholder("Bộ lọc trang bị")
          .addOptions(
            { label: "Không lọc (None)", value: "none", default: filterType === "none" },
            { label: "Lọc: Vũ khí", value: "slot_weapon", default: filterType === "slot_weapon" },
            { label: "Lọc: Giáp ngực", value: "slot_armor", default: filterType === "slot_armor" },
            { label: "Lọc: Mũ bảo vệ", value: "slot_helmet", default: filterType === "slot_helmet" },
            { label: "Lọc: Giày", value: "slot_boots", default: filterType === "slot_boots" },
            { label: "Lọc: Nhẫn", value: "slot_ring", default: filterType === "slot_ring" },
            { label: "Lọc: Dây chuyền", value: "slot_necklace", default: filterType === "slot_necklace" },
            { label: "Lọc: Common", value: "rarity_Common", default: filterType === "rarity_Common" },
            { label: "Lọc: Rare", value: "rarity_Rare", default: filterType === "rarity_Rare" },
            { label: "Lọc: Epic", value: "rarity_Epic", default: filterType === "rarity_Epic" },
            { label: "Lọc: Legendary", value: "rarity_Legendary", default: filterType === "rarity_Legendary" },
            { label: "Lọc: Mythic", value: "rarity_Mythic", default: filterType === "rarity_Mythic" },
            { label: "Lọc: Ancient", value: "rarity_Ancient", default: filterType === "rarity_Ancient" },
            { label: "Lọc: Divine", value: "rarity_Divine", default: filterType === "rarity_Divine" }
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
        filterType,
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
        filterType = interaction.values[0];
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
  },
};
