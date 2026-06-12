const {
  ActionRowBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const config = require("../../data/config");
const { getUser } = require("../../utils/userUtil");
const path = require("path");
const fs = require("fs");
const {
  classEntries,
  calculateRpgPower,
  getEquippedItems,
  getRpgClass,
  getRpgXpNeeded,
  hasRpgCharacter,
  getEffectiveRpgStats,
  getGearDisplayName,
  getAvailablePoints,
  getWeaponPower,
  getStartingStats,
} = require("../../utils/rpgUtil");

const statLabels = {
  vigor: "Vigor",
  pr: "PR",
  mr: "MR",
  str: "STR",
  dex: "DEX",
  int: "INT",
  arc: "ARC",
};

const statLine = (stats) => {
  const format = (key) => `**${statLabels[key]}:** **${stats[key] || 0}**`;
  return `${format("vigor")}   |   ${format("pr")}   |   ${format("mr")}   |   ${format("str")}   |   ${format("dex")}   |   ${format("int")}   |   ${format("arc")}`;
};

const statLineWithBonus = (baseStats, effectiveStats) => {
  const format = (key) => {
    const base = baseStats[key] || 0;
    const eff = effectiveStats[key] || 0;
    const bonus = eff - base;
    const label = statLabels[key] || key.toUpperCase();
    if (bonus > 0) {
      return `**${label}:** **${eff}** *(+${bonus})*`;
    }
    return `**${label}:** **${eff}**`;
  };
  return `${format("vigor")}   |   ${format("pr")}   |   ${format("mr")}   |   ${format("str")}   |   ${format("dex")}   |   ${format("int")}   |   ${format("arc")}`;
};

const buildClassEmbed = (classKey, rpgClass, userData = null, customAvatar = null) => {
  let statsValue;
  if (userData) {
    const startingStats = getStartingStats(userData);
    const baseStats = {};
    for (const key of Object.keys(statLabels)) {
      baseStats[key] = userData.rpg.stats?.[key] !== undefined
        ? userData.rpg.stats[key]
        : (startingStats[key] || 0);
    }
    statsValue = statLineWithBonus(baseStats, getEffectiveRpgStats(userData));
  } else {
    statsValue = statLine(rpgClass.stats);
  }

  const assetName = customAvatar || rpgClass.asset;

  const title = userData?.rpg?.name
    ? `👤 ${userData.rpg.name} (${rpgClass.name})`
    : `${rpgClass.name} - ${rpgClass.title}`;

  const embed = new EmbedBuilder()
    .setColor(rpgClass.color)
    .setTitle(title)
    .setDescription(rpgClass.description)
    .setImage(`attachment://${assetName}`)
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
              : `${key}: +${value}`
          )
          .join("\n"),
        inline: true,
      },
    );

  if (userData?.rpg?.classKey === classKey) {
    const nameLine = `Tên nhân vật: **${userData.rpg.name || "Chưa đặt"}**\n`;
    const currentPower = calculateRpgPower(userData);
    const availablePoints = getAvailablePoints(userData);

    embed.addFields({
      name: "Nhân vật của bạn",
      value:
        nameLine +
        `Level: **${userData.rpg.level}**\n` +
        `Rank: **${userData.rpg.rank}**\n` +
        `Lực chiến: **${Math.floor(currentPower).toLocaleString()}**\n` +
        `EXP: **${userData.rpg.exp}/${getRpgXpNeeded(userData.rpg.level)}**\n` +
        `Điểm chưa cộng: **${availablePoints}**`,
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
        const ownerStats = getEffectiveRpgStats(userData);
        const finalPower = item.slot === "weapon" ? getWeaponPower(item, ownerStats) : item.power;
        return `• ${slotName}: **${getGearDisplayName(item)}** (+${finalPower.toLocaleString()} Lực chiến)`;
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

const buildAvatarSelectRow = (classKey, selectedAvatar, disabled = false) => {
  const classNamesMap = {
    warrior: "Warrior",
    archer: "Archer",
    mage: "Mage",
    assassin: "Assassin",
    paladin: "Paladin",
    wretch: "Wretch",
  };
  const className = classNamesMap[classKey] || "Warrior";
  const options = [
    { label: "Nam (Male)", value: `${className}_male.png` },
    { label: "Nữ (Female)", value: `${className}_female.png` },
  ];

  const menu = new StringSelectMenuBuilder()
    .setCustomId("rpg_avatar_select_menu")
    .setPlaceholder("Chọn giới tính nhân vật")
    .setDisabled(disabled)
    .addOptions(
      options.map((opt) => ({
        label: opt.label,
        value: opt.value,
        default: opt.value === selectedAvatar,
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
  aliases: ["hero", "char", "character", "xclass"],
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
      let avatarFile = userData.rpg.characterAsset || rpgClass.asset;
      let assetPath = path.join(__dirname, "../../assets/characters", avatarFile);

      if (!fs.existsSync(assetPath)) {
        avatarFile = rpgClass.asset || "Warrior_male.png";
        assetPath = path.join(__dirname, "../../assets/characters", avatarFile);
        userData.rpg.characterAsset = avatarFile;
        userData.markModified("rpg");
        await userData.save();
      }

      const attachment = new AttachmentBuilder(assetPath, {
        name: avatarFile,
      });

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("rpg_class_action_classes")
          .setLabel("Classes")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🛡️"),
        new ButtonBuilder()
          .setCustomId("rpg_class_action_name")
          .setLabel("Name")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("📝")
      );

      const prompt = await message.reply({
        embeds: [buildClassEmbed(userData.rpg.classKey, rpgClass, userData, avatarFile)],
        files: [attachment],
        components: [actionRow],
      });

      const collector = prompt.createMessageComponentCollector({
        filter: (interaction) => interaction.user.id === message.author.id,
        time: 180000, // 3 minutes
      });

      collector.on("collect", async (interaction) => {
        if (interaction.customId === "rpg_class_action_classes") {
          const user = await getUser(message.author.id);
          const isFree = !user.rpg.freeClassChangeUsed;
          const changeCost = isFree ? 0 : 100000;

          // Confirmation to change class
          const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("rpg_class_change_confirm")
              .setLabel(isFree ? "Confirm (Miễn phí)" : "Confirm (100k Coke)")
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId("rpg_class_change_cancel")
              .setLabel("Hủy")
              .setStyle(ButtonStyle.Secondary)
          );

          await interaction.update({
            content: isFree
              ? `⚠️ Bạn có muốn chọn lại Class nhân vật của mình không? (Lần đầu **Miễn phí**)\nCoke hiện tại của bạn: **${user.coke.toLocaleString()} Coke**`
              : `⚠️ Bạn có muốn dùng **100,000 Coke** để chọn lại Class nhân vật của mình không?\nCoke hiện tại của bạn: **${user.coke.toLocaleString()} Coke**`,
            components: [confirmRow],
          });
        } else if (interaction.customId === "rpg_class_change_cancel") {
          const rpgClass = getRpgClass(userData.rpg.classKey);
          await interaction.update({
            content: "Đã hủy yêu cầu đổi Class.",
            embeds: [buildClassEmbed(userData.rpg.classKey, rpgClass, userData, avatarFile)],
            components: [actionRow],
          });
        } else if (interaction.customId === "rpg_class_change_confirm") {
          const user = await getUser(message.author.id);
          const isFree = !user.rpg.freeClassChangeUsed;
          const changeCost = isFree ? 0 : 100000;
          if (user.coke < changeCost) {
            return interaction.reply({
              content: `❌ Bạn không đủ Coke để đổi class. (Yêu cầu: **${changeCost.toLocaleString()} Coke**, hiện có: **${user.coke.toLocaleString()} Coke**)`,
              flags: 64,
            });
          }

          user.coke -= changeCost;
          await user.save();

          // Now start class choosing flow
          let currentClassKey = classEntries()[0][0];
          let currentAvatar = getRpgClass(currentClassKey).asset;

          const renderChangePayload = (disabled = false) => {
            const rpgClass = getRpgClass(currentClassKey);
            const embed = buildClassEmbed(currentClassKey, rpgClass, null, currentAvatar);
            const assetPath = path.join(__dirname, "../../assets/characters", currentAvatar);
            const attachment = new AttachmentBuilder(assetPath, {
              name: currentAvatar,
            });

            return {
              content: isFree
                ? `⚔️ **Đổi Class (Miễn phí)**\nHãy chọn Class và Avatar mới của bạn. Bấm **Chốt (Accept)** để xác nhận!`
                : `⚔️ **Đổi Class (Đã trừ 100k Coke)**\nHãy chọn Class và Avatar mới của bạn. Bấm **Chốt (Accept)** để xác nhận!`,
              embeds: [embed],
              files: [attachment],
              components: [
                buildClassSelectRow(currentClassKey, disabled),
                buildAvatarSelectRow(currentClassKey, currentAvatar, disabled),
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId("rpg_class_change_accept")
                    .setLabel("Chốt (Accept)")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(disabled),
                  new ButtonBuilder()
                    .setCustomId("rpg_class_change_abort")
                    .setLabel("Hủy và giữ Class cũ")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled)
                ),
              ],
            };
          };

          await interaction.update(renderChangePayload(false));
          collector.stop("sub-collector");

          const changeCollector = prompt.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 120000,
          });

          changeCollector.on("collect", async (i) => {
            if (i.isStringSelectMenu()) {
              if (i.customId === "rpg_class_select_menu") {
                currentClassKey = i.values[0];
                const classNameCapital = currentClassKey.charAt(0).toUpperCase() + currentClassKey.slice(1);
                currentAvatar = `${classNameCapital}_male.png`;
              } else if (i.customId === "rpg_avatar_select_menu") {
                currentAvatar = i.values[0];
              }
              await i.update(renderChangePayload(false));
            } else if (i.isButton()) {
              if (i.customId === "rpg_class_change_accept") {
                changeCollector.stop("accepted");
                const updatedUser = await getUser(message.author.id);
                const rpgClass = getRpgClass(currentClassKey);

                updatedUser.rpg.classKey = currentClassKey;
                updatedUser.rpg.characterAsset = currentAvatar;
                updatedUser.rpg.stats = rpgClass.stats;
                updatedUser.rpg.freeClassChangeUsed = true;
                updatedUser.rpg.power = calculateRpgPower(updatedUser);
                updatedUser.markModified("rpg");
                await updatedUser.save();

                await i.update({
                  content: `🎉 Đổi Class thành công! Bạn hiện là **${rpgClass.name}**.`,
                  components: [],
                  embeds: [buildClassEmbed(currentClassKey, rpgClass, updatedUser, currentAvatar)],
                });
              } else if (i.customId === "rpg_class_change_abort") {
                changeCollector.stop("aborted");
                const refundedUser = await getUser(message.author.id);
                refundedUser.coke += changeCost;
                await refundedUser.save();

                const originalClass = getRpgClass(refundedUser.rpg.classKey);
                const originalAvatar = refundedUser.rpg.characterAsset || originalClass.asset;
                const originalAssetPath = path.join(__dirname, "../../assets/characters", originalAvatar);
                const originalAttachment = new AttachmentBuilder(originalAssetPath, {
                  name: originalAvatar,
                });

                await i.update({
                  content: isFree
                    ? "Đã hủy đổi Class."
                    : "Đã hủy đổi Class. Bạn đã được hoàn lại 100k Coke.",
                  embeds: [buildClassEmbed(refundedUser.rpg.classKey, originalClass, refundedUser, originalAvatar)],
                  files: [originalAttachment],
                  components: [actionRow],
                });
              }
            }
          });

          changeCollector.on("end", async (c, reason) => {
            if (reason === "accepted" || reason === "aborted") return;
            const refundedUser = await getUser(message.author.id);
            refundedUser.coke += changeCost;
            await refundedUser.save();

            await prompt.edit({
              content: isFree
                ? "Phiên chọn class đã hết hạn."
                : "Phiên chọn class đã hết hạn. Bạn đã được hoàn lại 100k Coke.",
              components: [],
            }).catch(() => {});
          });
        } else if (interaction.customId === "rpg_class_action_name") {
          const user = await getUser(message.author.id);
          const isFree = !user.rpg.nameChanged;
          const renameCost = isFree ? 0 : 100000;

          const confirmRenameRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("rpg_name_change_confirm")
              .setLabel(isFree ? "Confirm (Miễn phí)" : "Confirm (100k Coke)")
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId("rpg_name_change_cancel")
              .setLabel("Hủy")
              .setStyle(ButtonStyle.Secondary)
          );

          await interaction.update({
            content: isFree
              ? `📝 **Đổi tên nhân vật** (Lần đầu **Miễn phí**)\nBạn có muốn đổi tên nhân vật không?`
              : `📝 **Đổi tên nhân vật** (Phí: **100,000 Coke**)\nCoke hiện tại của bạn: **${user.coke.toLocaleString()} Coke**\nBạn có muốn đổi tên nhân vật không?`,
            components: [confirmRenameRow],
          });
        } else if (interaction.customId === "rpg_name_change_cancel") {
          const rpgClass = getRpgClass(userData.rpg.classKey);
          await interaction.update({
            content: "Đã hủy yêu cầu đổi tên.",
            embeds: [buildClassEmbed(userData.rpg.classKey, rpgClass, userData, avatarFile)],
            components: [actionRow],
          });
        } else if (interaction.customId === "rpg_name_change_confirm") {
          const user = await getUser(message.author.id);
          const isFree = !user.rpg.nameChanged;
          const renameCost = isFree ? 0 : 100000;

          if (user.coke < renameCost) {
            return interaction.reply({
              content: `❌ Bạn không đủ Coke để đổi tên. (Yêu cầu: **${renameCost.toLocaleString()} Coke**, hiện có: **${user.coke.toLocaleString()} Coke**)`,
              flags: 64,
            });
          }

          const modal = new ModalBuilder()
            .setCustomId("rpg_name_change_modal")
            .setTitle("Đổi tên nhân vật RPG");

          const nameInput = new TextInputBuilder()
            .setCustomId("rpg_char_name_input")
            .setLabel(`Nhập tên mới (${isFree ? "Miễn phí" : "Phí 100k Coke"}):`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Tên mới của bạn...")
            .setMinLength(2)
            .setMaxLength(20)
            .setRequired(true);

          const actionRowModal = new ActionRowBuilder().addComponents(nameInput);
          modal.addComponents(actionRowModal);

          await interaction.showModal(modal);

          const modalSubmit = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === "rpg_name_change_modal" && i.user.id === interaction.user.id,
            time: 60000,
          }).catch(() => null);

          if (!modalSubmit) return;

          const newName = modalSubmit.fields.getTextInputValue("rpg_char_name_input").trim();
          if (!newName) {
            return modalSubmit.reply({
              content: "❌ Tên nhân vật không được để trống.",
              flags: 64,
            });
          }

          const finalUser = await getUser(message.author.id);
          if (finalUser.coke < renameCost) {
            return modalSubmit.reply({
              content: `❌ Có lỗi xảy ra: Bạn không đủ Coke.`,
              flags: 64,
            });
          }

          finalUser.coke -= renameCost;
          finalUser.rpg.name = newName;
          finalUser.rpg.nameChanged = true;
          finalUser.markModified("rpg");
          await finalUser.save();

          collector.stop("accepted");

          const rpgClass = getRpgClass(finalUser.rpg.classKey);
          const currentAvatar = finalUser.rpg.characterAsset || rpgClass.asset;
          const assetPath = path.join(__dirname, "../../assets/characters", currentAvatar);
          const attachment = new AttachmentBuilder(assetPath, {
            name: currentAvatar,
          });

          await modalSubmit.update({
            content: `🎉 Đã đổi tên nhân vật thành công! Tên mới: **${newName}** (Đã trừ ${renameCost.toLocaleString()} Coke).`,
            embeds: [buildClassEmbed(finalUser.rpg.classKey, rpgClass, finalUser, currentAvatar)],
            files: [attachment],
            components: [actionRow],
          });
        }
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "accepted" || reason === "sub-collector") return;
        await prompt.edit({
          components: [],
        }).catch(() => {});
      });

      return;
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
          buildAvatarSelectRow(currentClassKey, currentAvatar, disabled),
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
          const classNameCapital = currentClassKey.charAt(0).toUpperCase() + currentClassKey.slice(1);
          currentAvatar = `${classNameCapital}_male.png`;
        } else if (interaction.customId === "rpg_avatar_select_menu") {
          currentAvatar = interaction.values[0];
        }
        await interaction.update(renderMessagePayload(false));
      } else if (interaction.isButton()) {
        if (interaction.customId === "rpg_class_accept") {
          const modal = new ModalBuilder()
            .setCustomId("rpg_class_create_modal")
            .setTitle("Đặt tên nhân vật RPG");

          const nameInput = new TextInputBuilder()
            .setCustomId("rpg_char_name_input")
            .setLabel("Tên nhân vật của bạn:")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Tên của bạn...")
            .setMinLength(2)
            .setMaxLength(20)
            .setRequired(true);

          const actionRow = new ActionRowBuilder().addComponents(nameInput);
          modal.addComponents(actionRow);

          await interaction.showModal(modal);

          const modalSubmit = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === "rpg_class_create_modal" && i.user.id === interaction.user.id,
            time: 60000,
          }).catch(() => null);

          if (!modalSubmit) return;

          const characterName = modalSubmit.fields.getTextInputValue("rpg_char_name_input").trim();
          if (!characterName) {
            return modalSubmit.reply({
              content: "❌ Tên nhân vật không được để trống.",
              flags: 64,
            });
          }

          collector.stop("accepted");

          const rpgClass = getRpgClass(currentClassKey);
          const user = await getUser(message.author.id);

          user.set("rpg", {
            name: characterName,
            nameChanged: false,
            freeClassChangeUsed: false,
            migratedToWarrior: true,
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

          await modalSubmit.update({
            content: `🎉 Đã khởi tạo nhân vật thành công! Bạn là **${rpgClass.name}** tên là **${characterName}**. Hãy gõ \`${config.prefix}hunt\` hoặc \`${config.prefix}h\` để bắt đầu chiến đấu!`,
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
      if (reason === "accepted" || reason === "cancelled" || reason === "sub-collector") return;
      await prompt.edit({
        content: "Phiên chọn class đã hết hạn. Hãy dùng lại lệnh khi sẵn sàng.",
        components: [
          buildClassSelectRow(currentClassKey, true),
          buildAvatarSelectRow(currentClassKey, currentAvatar, true),
          buildConfirmationRow(true),
        ],
      }).catch(() => {});
    });
  },
};
