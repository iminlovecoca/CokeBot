const { EmbedBuilder } = require("discord.js");
const config = require("../../data/config");
const {
  calculateRpgPower,
  findRpgItem,
  formatStats,
  getEffectiveRpgStats,
  getEquippedItems,
  getRpgClass,
  getRpgItems,
  getRpgXpNeeded,
  requireRpgCharacter,
} = require("../../utils/rpgUtil");

const ITEMS_PER_PAGE = 10;
const PREV_EMOJI = "⬅️";
const NEXT_EMOJI = "➡️";

const slotEmoji = {
  weapon: "🗡️",
  armor: "🛡️",
  helmet: "🪖",
  boots: "🥾",
  ring: "💍",
  necklace: "📿",
};

const rarityEmoji = {
  Common: "⚪",
  Rare: "🔵",
  Epic: "🟣",
  Legendary: "🟡",
  Mythic: "🔴",
  Ancient: "🟤",
  Divine: "💠",
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

const truncate = (text, length) => {
  const value = String(text || "");
  if (value.length <= length) return value;
  return `${value.slice(0, Math.max(0, length - 3))}...`;
};

const buildGearLine = (item) => {
  const id = String(item.id).padStart(3, "0");
  const icon = `${slotEmoji[item.slot] || "🎒"}${rarityEmoji[item.rarity] || "⚪"}`;
  const itemLabel = truncate(`${icon} ${item.name}`, 32);
  return `**${id}** • ${itemLabel} • **PWR ${Number(item.power || 0).toLocaleString()}**`;
};

const formatGearStats = (stats = {}) =>
  Object.entries(stats)
    .filter(([, value]) => value)
    .map(([key, value]) => `**${key.toUpperCase()}:** **+${value}**`)
    .join("   |   ");

const buildGuide = () =>
  [
    "RPG gear increases your Power.",
    `Equip: \`${config.prefix}equip {id}\` | Unequip: \`${config.prefix}unequip <slot>\``,
    `Check: \`${config.prefix}gear {id}\` | Sell: \`${config.prefix}sellgear {id}\``,
  ].join("\n");

const buildGearListEmbed = ({ user, rpgClass, items, page, totalPages }) => {
  const effectiveStats = getEffectiveRpgStats(user);
  const start = page * ITEMS_PER_PAGE;
  const pageItems = items.slice(start, start + ITEMS_PER_PAGE);
  const list = pageItems.length
    ? pageItems.map(buildGearLine).join("\n")
    : "No RPG gear yet.";

  return new EmbedBuilder()
    .setColor(getRpgClass(user.rpg.classKey)?.color || rpgClass.color)
    .setTitle(`${rpgClass.name} Gear Inventory`)
    .setDescription(
      `${buildGuide()}\n` +
        "==============================\n" +
        `Power: **${user.rpg.power.toLocaleString()}** | Level: **${user.rpg.level}** | EXP: **${user.rpg.exp}/${getRpgXpNeeded(user.rpg.level)}**\n` +
        `Stats: **${formatStats(effectiveStats) || "No stats"}**\n\n` +
        `${list}\n\n` +
        `Page **${page + 1}/${totalPages}**`,
    );
};

const sendPagedGearList = async (message, payload) => {
  let page = 0;
  const totalPages = Math.max(
    1,
    Math.ceil(payload.items.length / ITEMS_PER_PAGE),
  );
  const render = () => buildGearListEmbed({ ...payload, page, totalPages });

  const sentMessage = await message.reply({ embeds: [render()] });
  await sentMessage.react(PREV_EMOJI).catch(() => {});
  await sentMessage.react(NEXT_EMOJI).catch(() => {});

  const collector = sentMessage.createReactionCollector({
    filter: (reaction, user) =>
      [PREV_EMOJI, NEXT_EMOJI].includes(reaction.emoji.name) &&
      user.id === message.author.id,
    time: 5 * 60 * 1000,
  });

  collector.on("collect", async (reaction) => {
    if (totalPages <= 1) {
      await reaction.users.remove(message.author.id).catch(() => {});
      return;
    }

    if (reaction.emoji.name === PREV_EMOJI) {
      page = page > 0 ? page - 1 : totalPages - 1;
    } else if (reaction.emoji.name === NEXT_EMOJI) {
      page = page < totalPages - 1 ? page + 1 : 0;
    }

    await sentMessage.edit({ embeds: [render()] });
    await reaction.users.remove(message.author.id).catch(() => {});
  });

  collector.on("end", async () => {
    await sentMessage.reactions.removeAll().catch(() => {});
  });

  return sentMessage;
};

module.exports = {
  name: "gear",
  aliases: ["equipment", "power"],
  description: "Xem trang bi nhan vat RPG dang mac va Power hien tai.",
  usage: `${config.prefix}gear [itemId]`,
  examples: [
    { intent: "Xem danh sach trang bi", command: `${config.prefix}gear` },
    { intent: "Xem chi tiet mot mon", command: `${config.prefix}gear 3` },
  ],

  async execute(message, args = []) {
    const { user, rpgClass } = await requireRpgCharacter(message.author.id);

    const itemId = Number(args[0]);
    if (Number.isInteger(itemId) && itemId > 0) {
      const item = findRpgItem(user, itemId);
      if (!item) {
        return message.reply(
          `${config.emoji.no} Khong tim thay trang bi RPG ID \`${itemId}\`.`,
        );
      }

      const equippedEntry = Object.entries(user.rpg.equipped || {}).find(
        ([, equippedItemId]) => equippedItemId === item.id,
      );

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(rarityColor[item.rarity] || rpgClass.color)
            .setTitle(`${slotEmoji[item.slot] || "🎒"} ${item.name}`)
            .setDescription(
              `ID: \`${item.id}\`\n` +
                `Slot: **${config.rpg.gear_slot_names[item.slot]}**\n` +
                `Rarity: **${item.rarity}**\n` +
                `Power: **+${item.power.toLocaleString()}**\n` +
                `Stats: **${formatGearStats(item.stats) || "No stats"}**\n` +
                `Equipped: **${equippedEntry ? "Yes" : "No"}**\n` +
                `Sell: **${item.sellPrice.toLocaleString()} Coke**\n` +
                `Image key: \`${item.imageKey}\``,
            )
            .addFields({
              name: "Commands",
              value:
                `Equip: \`${config.prefix}equip ${item.id}\`\n` +
                `Unequip: \`${config.prefix}unequip ${item.slot}\`\n` +
                `Sell: \`${config.prefix}sellgear ${item.id}\``,
            }),
        ],
      });
    }

    user.rpg.power = calculateRpgPower(user);
    await user.save();

    const equippedItems = getEquippedItems(user);
    const allItems = getRpgItems(user).sort((a, b) => a.id - b.id);
    const equippedIds = new Set(Object.values(user.rpg.equipped || {}));
    const unequippedItems = allItems.filter((item) => !equippedIds.has(item.id));
    const listItems = [...Object.values(equippedItems), ...unequippedItems].filter(Boolean);

    return sendPagedGearList(message, {
      user,
      rpgClass,
      items: listItems,
    });
  },
};
