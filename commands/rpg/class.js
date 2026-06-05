const {
  ActionRowBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const config = require("../../data/config");
const { getUser } = require("../../utils/userUtil");
const path = require("path");
const {
  classEntries,
  calculateRpgPower,
  getEquippedItems,
  getRpgClass,
  getRpgXpNeeded,
  hasRpgCharacter,
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

const buildClassEmbed = (classKey, rpgClass, userData = null, customAvatar = null) => {
  const statsValue = userData
    ? statLineWithBonus(rpgClass.stats, getEffectiveRpgStats(userData))
    : statLine(rpgClass.stats);

  const assetName = customAvatar || rpgClass.asset;

  const embed = new EmbedBuilder()
    .setColor(rpgClass.color)
    .setTitle(`${rpgClass.name} - ${rpgClass.title}`)
    .setDescription(rpgClass.description)
    .setImage(`attachment://${assetName}`)
    .addFields(
      {
        name: "Chỉ số khởi đầu",
        value: statsValue,
      },
      {
        name: "Thiên hướng",
        value: Object.entries(rpgClass.bonuses || {})
          .map(([key, value]) =>
            typeof value === "number" && value < 1
              ? `${key}: +${Math.round(value * 100)}%`
              : `${key}: +${value}`
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

const buildClassSelectRow = (selectedClassKey, disabled = false) => {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("rpg_class_select_menu")
    .setPlaceholder("Chọn Class nhân vật")
    .setDisabled(disabled)
    .addOptions(
      classEntries().map(([key, rpgClass]) => ({
        label: rpgClass.name,
        value: key,
        description: rpgClass.title,
        default: key === selectedClassKey,
      }))
    );
  return new ActionRowBuilder().addComponents(menu);
};

const buildAvatarSelectRow = (selectedAvatar, disabled = false) => {
  const charFiles = Array.from({ length: 21 }, (_, i) => i + 1)
    .filter((num) => num !== 6) // character_06.png is missing
    .map((num) => {
      const pad = String(num).padStart(2, "0");
      return `character_${pad}.png`;
    });

  const menu = new StringSelectMenuBuilder()
    .setCustomId("rpg_avatar_select_menu")
    .setPlaceholder("Chọn Avatar nhân vật")
    .setDisabled(disabled)
    .addOptions(
      charFiles.map((file) => ({
        label: `Avatar ${file.split(".")[0].split("_")[1]}`,
        value: file,
        default: file === selectedAvatar,
      }))
    );
  return new ActionRowBuilder().addComponents(menu);
};

const buildConfirmationRow = (disabled = false) => {
  const acceptBtn = new ButtonBuilder()
    .setCustomId("rpg_class_accept")
    .setLabel("Chốt (Accept)")
    .setStyle(ButtonStyle.Success)
    .setDisabled(disabled);

  const cancelBtn = new ButtonBuilder()
    .setCustomId("rpg_class_cancel")
    .setLabel("Hủy")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled);

  return new ActionRowBuilder().addComponents(acceptBtn, cancelBtn);
};

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
      const avatarFile = userData.rpg.characterAsset || rpgClass.asset;
      const assetPath = path.join(__dirname, "../../assets/characters", avatarFile);
      const attachment = new AttachmentBuilder(assetPath, {
        name: avatarFile,
      });
      return message.reply({
        embeds: [buildClassEmbed(userData.rpg.classKey, rpgClass, userData, avatarFile)],
        files: [attachment],
      });
    }

    // Default selections
    let currentClassKey = classEntries()[0][0];
    let currentAvatar = getRpgClass(currentClassKey).asset;

    const renderMessagePayload = (disabled = false) => {
      const rpgClass = getRpgClass(currentClassKey);
      const assetPath = path.join(__dirname, "../../assets/characters", currentAvatar);
      const attachment = new AttachmentBuilder(assetPath, {
        name: currentAvatar,
      });
      const embed = buildClassEmbed(currentClassKey, rpgClass, null, currentAvatar);

      return {
        content: "Hãy chọn class và avatar của bạn. Bấm **Chốt (Accept)** để bắt đầu cuộc hành trình!",
        embeds: [embed],
        files: [attachment],
        components: [
          buildClassSelectRow(currentClassKey, disabled),
          buildAvatarSelectRow(currentAvatar, disabled),
          buildConfirmationRow(disabled),
        ],
      };
    };

    const prompt = await message.reply({
      ...renderMessagePayload(false),
      fetchReply: true,
    });

    const collector = prompt.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === message.author.id,
      time: 180000, // 3 minutes to choose
    });

    collector.on("collect", async (interaction) => {
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === "rpg_class_select_menu") {
          currentClassKey = interaction.values[0];
          currentAvatar = getRpgClass(currentClassKey).asset;
        } else if (interaction.customId === "rpg_avatar_select_menu") {
          currentAvatar = interaction.values[0];
        }
        await interaction.update(renderMessagePayload(false));
      } else if (interaction.isButton()) {
        if (interaction.customId === "rpg_class_accept") {
          collector.stop("accepted");

          const rpgClass = getRpgClass(currentClassKey);
          const user = await getUser(message.author.id);

          user.set("rpg", {
            classKey: currentClassKey,
            characterAsset: currentAvatar,
            level: config.rpg.starting_level || 1,
            exp: 0,
            power: 0,
            stats: rpgClass.stats,
            rank: "Novice",
            equipped: {},
            items: [],
            lastItemId: 0,
            lastHuntAt: null,
            lastBossAt: null,
            createdAt: new Date(),
          });
          await user.save();

          await interaction.update({
            content: `Đã khởi tạo nhân vật thành công! Bạn là **${rpgClass.name}**. Hãy gõ \`${config.prefix}hunt\` hoặc \`${config.prefix}h\` để bắt đầu chiến đấu!`,
            ...renderMessagePayload(true),
          });
        } else if (interaction.customId === "rpg_class_cancel") {
          collector.stop("cancelled");
          await interaction.update({
            content: "Đã hủy phiên chọn nhân vật.",
            components: [],
            embeds: [],
            files: [],
          });
        }
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "accepted" || reason === "cancelled") return;
      await prompt.edit({
        content: "Phiên chọn class đã hết hạn. Hãy dùng lại lệnh khi sẵn sàng.",
        components: [
          buildClassSelectRow(currentClassKey, true),
          buildAvatarSelectRow(currentAvatar, true),
          buildConfirmationRow(true),
        ],
      }).catch(() => {});
    });
  },
};
