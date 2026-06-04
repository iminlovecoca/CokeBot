const {
  ActionRowBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const config = require("../../data/config");
const { getUser } = require("../../utils/userUtil");
const {
  classEntries,
  calculateRpgPower,
  getClassAssetPath,
  getEquippedItems,
  getRpgClass,
  getRpgXpNeeded,
  hasRpgCharacter,
  selectRpgClass,
  getEffectiveRpgStats,
} = require("../../utils/rpgUtil");

const statLine = (stats) =>
  `**STR:** **${stats.str}**   |   **INT:** **${stats.int}**   |   **AGI:** **${stats.agi}**   |   **VIT:** **${stats.vit}**   |   **DEF:** **${stats.def}**   |   **LUCK:** **${stats.luck}**`;

const statLineWithBonus = (baseStats, effectiveStats) => {
  const format = (key) => {
    const base = baseStats[key] || 0;
    const eff = effectiveStats[key] || 0;
    const bonus = eff - base;
    const label = key.toUpperCase();
    if (bonus > 0) {
      return `**${label}:** **${eff}** *(+${bonus})*`;
    }
    return `**${label}:** **${eff}**`;
  };
  return `${format("str")}   |   ${format("int")}   |   ${format("agi")}   |   ${format("vit")}   |   ${format("def")}   |   ${format("luck")}`;
};

const buildClassEmbed = (classKey, rpgClass, userData = null) => {
  const statsValue = userData
    ? statLineWithBonus(rpgClass.stats, getEffectiveRpgStats(userData))
    : statLine(rpgClass.stats);

  const embed = new EmbedBuilder()
    .setColor(rpgClass.color)
    .setTitle(`${rpgClass.name} - ${rpgClass.title}`)
    .setDescription(rpgClass.description)
    .setImage(`attachment://${rpgClass.asset}`)
    .addFields(
      {
        name: "Chỉ số",
        value: statsValue,
      },
      {
        name: "Thiên hướng",
        value: Object.entries(rpgClass.bonuses || {})
          .map(([key, value]) =>
            typeof value === "number" && value < 1
              ? `${key}: +${Math.round(value * 100)}%`
              : `${key}: +${value}`,
          )
          .join("\n"),
        inline: true,
      },
    );

  if (userData?.rpg?.classKey === classKey) {
    const currentPower = calculateRpgPower(userData);
    embed.addFields({
      name: "Nhân vật của bạn",
      value:
        `Level: **${userData.rpg.level}**\n` +
        `Rank: **${userData.rpg.rank}**\n` +
        `Power: **${Math.floor(currentPower).toLocaleString()}**\n` +
        `EXP: **${userData.rpg.exp}/${getRpgXpNeeded(userData.rpg.level)}**`,
      inline: true,
    });

    const equippedItems = getEquippedItems(userData);
    const slots = Object.keys(config.rpg.gear_slot_names || {
      weapon: "Weapon",
      armor: "Armor",
      helmet: "Helmet",
      boots: "Boots",
      ring: "Ring",
      necklace: "Necklace",
    });
    const equipLines = slots.map((slot) => {
      const slotName = config.rpg.gear_slot_names[slot] || slot;
      const item = equippedItems[slot];
      if (item) {
        return `• ${slotName}: **${item.name}** (+${item.power.toLocaleString()} Power)`;
      } else {
        return `• ${slotName}: ❎`;
      }
    }).join("\n");

    embed.addFields({
      name: "Trang bị hiện tại",
      value: equipLines,
      inline: false,
    });
  }

  return embed;
};

const buildSelectRow = (disabled = false) =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("rpg_class_select")
      .setPlaceholder("Chọn class khởi đầu")
      .setDisabled(disabled)
      .addOptions(
        classEntries().map(([key, rpgClass]) => ({
          label: rpgClass.name,
          value: key,
          description: rpgClass.title,
        })),
      ),
  );

module.exports = {
  name: "class",
  aliases: ["hero", "char", "character"],
  description: "Chọn hoặc xem class nhân vật RPG của bạn.",
  usage: `${config.prefix}class`,
  examples: [
    { intent: "Chọn nhân vật lần đầu", command: `${config.prefix}class` },
    { intent: "Xem nhân vật hiện tại", command: `${config.prefix}class` },
  ],

  async execute(message) {
    const userData = await getUser(message.author.id);

    if (hasRpgCharacter(userData)) {
      const rpgClass = getRpgClass(userData.rpg.classKey);
      const attachment = new AttachmentBuilder(getClassAssetPath(rpgClass), {
        name: rpgClass.asset,
      });
      return message.reply({
        embeds: [buildClassEmbed(userData.rpg.classKey, rpgClass, userData)],
        files: [attachment],
      });
    }

    const firstClass = classEntries()[0];
    const initialClass = firstClass[1];
    const attachment = new AttachmentBuilder(getClassAssetPath(initialClass), {
      name: initialClass.asset,
    });

    const prompt = await message.reply({
      content: "Hãy chọn class đầu tiên của bạn. Lựa chọn này hiện chưa thể đổi.",
      embeds: [buildClassEmbed(firstClass[0], initialClass)],
      files: [attachment],
      components: [buildSelectRow()],
      fetchReply: true,
    });

    const collector = prompt.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === message.author.id,
      time: 120000,
      max: 1,
    });

    collector.on("collect", async (interaction) => {
      if (!interaction.isStringSelectMenu()) return;
      const classKey = interaction.values[0];
      const { user, rpgClass } = await selectRpgClass(message.author.id, classKey);
      const selectedAttachment = new AttachmentBuilder(getClassAssetPath(rpgClass), {
        name: rpgClass.asset,
      });

      await interaction.update({
        content: `Đã chọn **${rpgClass.name}**. Dùng \`${config.prefix}hunt\` hoặc \`${config.prefix}h\` để bắt đầu cày Power.`,
        embeds: [buildClassEmbed(classKey, rpgClass, user)],
        files: [selectedAttachment],
        components: [buildSelectRow(true)],
      });
    });

    collector.on("end", async (collected) => {
      if (collected.size > 0) return;
      await prompt.edit({
        content: "Phiên chọn class đã hết hạn. Dùng lại `uclass` khi bạn sẵn sàng.",
        components: [buildSelectRow(true)],
      });
    });
  },
};
