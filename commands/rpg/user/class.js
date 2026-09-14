const BaseCommand = require("../../../core/BaseCommand");
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
const config = require("../../../data/config");
const { getUser, isDev, isAdmin } = require("../../../utils/userUtil");
const path = require("path");
const fs = require("fs");
const {
  classEntries,
  calculateRpgPower,
  getEquippedItems,
  getEquippedPet,
  getRpgClass,
  getRpgXpNeeded,
  hasRpgCharacter,
  getEffectiveRpgStats,
  getGearDisplayName,
  getAvailablePoints,
  getWeaponPower,
  getStartingStats,
  getCharacterAssetPath,
} = require("../../../utils/rpgUtil");
const { getSlotLabel, safeDeferUpdate, safeInteractionCall, safeInteractionEditReply, safeInteractionReply, safeInteractionUpdate } = require("../../../utils/rpgUi");
const {
  getHonorSkinInfo,
  getGenderFromCharacterAsset,
  isSkinForGender,
  getHonorSkinOwnershipKeys,
} = require("../../../data/rpg/skins");

const isSkinOwned = (user, skinFile) => {
  const ownedSkins = Array.isArray(user?.rpg?.ownedSkins) ? user.rpg.ownedSkins : [];
  return getHonorSkinOwnershipKeys(skinFile).some((key) => ownedSkins.includes(key));
};
const statLabels = {
  vigor: "Vigor",
  pr: "PR",
  mr: "MR",
  str: "STR",
  dex: "DEX",
  int: "INT",
  arc: "ARC",
};
const statLine = (stats, rpgClass = null) => {
  const format = (key) => `**${statLabels[key]}:** **${stats[key] || 0}**`;
  let critStr = "";
  if (rpgClass) {
    const classCritBonus = rpgClass.bonuses?.critRate || 0;
    const arc = stats.arc || 0;
    const dex = stats.dex || 0;
    const baseCrit = (arc * 0.2 + dex * 0.1) + classCritBonus * 100;
    critStr = `   |   **CRIT:** **${baseCrit.toFixed(1)}%**`;
  }
  const part1 = `${format("vigor")}   |   ${format("pr")}   |   ${format("mr")}   |   ${format("str")}`;
  const part2 = `${format("dex")}   |   ${format("int")}   |   ${format("arc")}${critStr}`;
  return `${part1}\n${part2}`;
};
const statLineWithBonus = (baseStats, effectiveStats, rpgClass = null) => {
  const format = (key) => {
    const eff = Math.min(99, Math.max(0, effectiveStats[key] !== undefined ? effectiveStats[key] : (baseStats[key] || 0)));
    const label = statLabels[key] || key.toUpperCase();
    return `**${label}:** **${eff}**`;
  };
  let critStr = "";
  if (rpgClass) {
    const classCritBonus = rpgClass.bonuses?.critRate || 0;
    const effArc = Math.min(99, effectiveStats.arc || 0);
    const effDex = Math.min(99, effectiveStats.dex || 0);
    const effCrit = (effArc * 0.2 + effDex * 0.1) + classCritBonus * 100;
    critStr = `   |   **CRIT:** **${effCrit.toFixed(1)}%**`;
  }
  const part1 = `${format("vigor")}   |   ${format("pr")}   |   ${format("mr")}   |   ${format("str")}`;
  const part2 = `${format("dex")}   |   ${format("int")}   |   ${format("arc")}${critStr}`;
  return `${part1}\n${part2}`;
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
    statsValue = statLineWithBonus(baseStats, getEffectiveRpgStats(userData), rpgClass);
  } else {
    statsValue = statLine(rpgClass.stats, rpgClass);
  }
  const assetName = customAvatar || rpgClass.asset;
  const equippedPet = userData ? getEquippedPet(userData) : null;
  const title = userData?.rpg?.name
    ? `${userData.rpg.name} • ${rpgClass.name}`
    : `${rpgClass.name} • ${rpgClass.title}`;
  const embed = new EmbedBuilder()
    .setColor(rpgClass.color)
    .setTitle(title)
    .setDescription(rpgClass.description)
    .setImage(`attachment://${assetName}`)
    .addFields({
      name: "Chỉ số nền",
      value: statsValue,
    });
  const bonusesStr = Object.entries(rpgClass.bonuses || {})
    .map(([key, value]) => {
      const labels = {
        critRate: "Tỷ lệ chí mạng",
        bossDamage: "Sát thương Boss",
        pvpDefense: "Phòng thủ PvP",
        expGain: "Tăng EXP",
        dropRate: "Tỷ lệ rơi đồ",
        healReduction: "Giảm hồi máu đối thủ"
      };
      const label = labels[key] || key;
      return typeof value === "number" && value < 1
        ? `${label}: +${Math.round(value * 100)}%`
        : `${label}: +${value}`;
    })
    .join("\n");
  if (userData?.rpg?.classKey === classKey) {
    const nameLine = `Tên nhân vật: **${userData.rpg.name || "Chưa đặt"}**\n`;
    const currentPower = calculateRpgPower(userData);
    const availablePoints = getAvailablePoints(userData);
    const petLine = equippedPet ? `Linh thú: ${equippedPet.emoji}\n` : "";
    embed.addFields(
      {
        name: "Nhân vật",
        value:
          nameLine +
          `Cấp: **${userData.rpg.level}**\n` +
          `Bậc: **${userData.rpg.rank}**\n` +
          petLine +
          `Lực chiến: **${Math.floor(currentPower).toLocaleString()}**\n` +
          `EXP: **${userData.rpg.exp}/${getRpgXpNeeded(userData.rpg.level)}**\n` +
          `Điểm dư: **${availablePoints}**`,
        inline: true,
      },
      {
        name: "Thiên hướng",
        value: bonusesStr,
        inline: true,
      }
    );
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
      const slotName = getSlotLabel(slot);
      const item = equippedItems[slot];
      if (item) {
        const ownerStats = getEffectiveRpgStats(userData);
        const finalPower = item.slot === "weapon" ? getWeaponPower(item, ownerStats) : item.power;
        return `• ${slotName}: \`G${item.id}\` **${getGearDisplayName(item)}** (+${finalPower.toLocaleString()} Lực chiến)`;
      } else {
        return `• ${slotName}: —`;
      }
    }).join("\n");
    embed.addFields({
      name: "Trang bị",
      value: equipLines,
      inline: false,
    });
  } else {
    embed.addFields({
      name: "Thiên hướng",
      value: bonusesStr,
      inline: true,
    });
  }
  return embed;
};
const buildClassSelectRow = (selectedClassKey, disabled = false) => {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("rpg_class_select_menu")
    .setPlaceholder("Chọn class nhân vật")
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
    { label: "Nam", value: `${className}_male.png` },
    { label: "Nữ", value: `${className}_female.png` },
  ];
  const menu = new StringSelectMenuBuilder()
    .setCustomId("rpg_avatar_select_menu")
    .setPlaceholder("Chọn avatar nhân vật")
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
    .setLabel("Chốt lựa chọn")
    .setStyle(ButtonStyle.Success)
    .setDisabled(disabled);
  const cancelBtn = new ButtonBuilder()
    .setCustomId("rpg_class_cancel")
    .setLabel("Hủy")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled);
  return new ActionRowBuilder().addComponents(acceptBtn, cancelBtn);
};
class ClassCommand extends BaseCommand {
  constructor() {
    super({
      name: "class",
      aliases: ["hero", "char", "character", "xclass"],
      description: "Chọn hoặc xem class nhân vật RPG của bạn.",
      usage: `${config.prefix}class`,
      examples: [
        { intent: "Chọn nhân vật lần đầu", command: `${config.prefix}class` },
        { intent: "Xem nhân vật hiện tại", command: `${config.prefix}class` },
      ],
      cooldown: 0
    });
  }
  async execute(message) {
    const userData = await getUser(message.author.id);
    if (hasRpgCharacter(userData)) {
      const rpgClass = getRpgClass(userData.rpg.classKey);
      let avatarFile = userData.rpg.characterAsset || rpgClass.asset;
      let assetPath = getCharacterAssetPath(avatarFile);
      if (!fs.existsSync(assetPath)) {
        avatarFile = rpgClass.asset || "Warrior_male.png";
        assetPath = getCharacterAssetPath(avatarFile);
        userData.rpg.characterAsset = avatarFile;
        userData.markModified("rpg");
        await userData.save();
      }
      const attachment = new AttachmentBuilder(assetPath, {
        name: avatarFile,
      });
      const isUserAdmin = isDev(message.author.id) || isAdmin(message.author.id);
      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("rpg_class_action_classes")
          .setLabel("Class")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("rpg_class_action_name")
          .setLabel("Đổi tên")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("rpg_class_action_skins")
          .setLabel("Skin")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(false)
      );
      const prompt = await message.reply({
        embeds: [buildClassEmbed(userData.rpg.classKey, rpgClass, userData, avatarFile)],
        files: [attachment],
        components: [actionRow],
      });
      const collector = prompt.createMessageComponentCollector({
        filter: (interaction) => interaction.user.id === message.author.id,
        time: 180000, 
      });
      collector.on("collect", async (interaction) => {
        if (interaction.customId === "rpg_class_action_skins") {
          const user = await getUser(message.author.id);
          const classKey = user.rpg.classKey;
          const rpgClass = getRpgClass(classKey);
          if (!rpgClass) {
            return safeInteractionReply(interaction, { content: "❌ Không tìm thấy thông tin class của bạn!", flags: 64 });
          }
          const skinsDir = path.join(__dirname, "../../../assets/skins", rpgClass.name);
          const currentGender = getGenderFromCharacterAsset(user.rpg.characterAsset || rpgClass.asset);
          let skinFiles = [];
          if (fs.existsSync(skinsDir)) {
            skinFiles = fs.readdirSync(skinsDir)
              .filter(file => (file.endsWith(".png") || file.endsWith(".gif")) && isSkinForGender(file, currentGender));
          }
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("rpg_class_select_skin")
            .setPlaceholder("Chọn một skin để áp dụng...");
          const options = [
            {
              label: "Skin Mặc định",
              value: rpgClass.asset,
              description: "Skin mặc định của class " + rpgClass.name,
            }
          ];
          const isUserAdmin = isDev(message.author.id) || isAdmin(message.author.id);
          for (const file of skinFiles) {
            const label = file.replace(/\.(png|gif)$/i, "");
            let isLocked = false;
            let suffix = "";
            const isUX = file.toLowerCase().includes("ux");
            const honorInfo = getHonorSkinInfo(file);
            if (!isUserAdmin) {
              const owned = isSkinOwned(user, file);
              if (!owned) {
                isLocked = true;
                suffix = honorInfo ? " (🔒 Mùa giải)" : (isUX ? " (🔒 Hữu hạn)" : " (🔒 Chưa mua)");
              }
            }
            options.push({
              label: label + suffix,
              value: file,
              description: isLocked
                ? (honorInfo ? `Nhận khi chốt mùa ở rank ${honorInfo.rank}` : (isUX ? "Chỉ sở hữu qua Gacha (Hữu hạn)" : "Mua tại cửa hàng skin (skin)"))
                : "Sẵn sàng sử dụng",
            });
          }
          selectMenu.addOptions(options);
          const row = new ActionRowBuilder().addComponents(selectMenu);
          const btnRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("rpg_class_skins_back")
              .setLabel("Quay lại")
              .setStyle(ButtonStyle.Secondary)
          );
          await safeInteractionUpdate(interaction, {
            content: `Chọn skin cho ${classKey.toUpperCase()}`,
            embeds: [],
            files: [],
            components: [row, btnRow]
          });
        } else if (interaction.customId === "rpg_class_select_skin") {
          const selectedSkin = interaction.values[0];
          const user = await getUser(message.author.id);
          const rpgClass = getRpgClass(user.rpg.classKey);
          const isUserAdmin = isDev(message.author.id) || isAdmin(message.author.id);
          if (selectedSkin !== rpgClass.asset) {
            const isUX = selectedSkin.toLowerCase().includes("ux");
            const honorInfo = getHonorSkinInfo(selectedSkin);
            const owned = isSkinOwned(user, selectedSkin);
            if (!isUserAdmin && !owned) {
              return safeInteractionReply(interaction, {
                content: honorInfo
                  ? `❌ Bạn chưa sở hữu skin **${selectedSkin.replace(/\.(png|gif)$/i, "")}**! Skin này chỉ được trao khi chốt mùa ở rank ${honorInfo.rank}.`
                  : isUX
                  ? `❌ Bạn chưa sở hữu skin **${selectedSkin.replace(/\.(png|gif)$/i, "")}**! Skin này là skin Hữu hạn chỉ có thể sở hữu từ Gacha.`
                  : `❌ Bạn chưa sở hữu skin **${selectedSkin.replace(/\.(png|gif)$/i, "")}**! Bạn cần mua skin này trong cửa hàng bằng lệnh \`skin\`.`,
                flags: 64
              });
            }
          }
          user.rpg.characterAsset = selectedSkin;
          user.markModified("rpg");
          await user.save();
          const assetPath = getCharacterAssetPath(selectedSkin);
          const attachment = new AttachmentBuilder(assetPath, { name: selectedSkin });
          await safeInteractionUpdate(interaction, {
            content: `🎉 Đã áp dụng skin **${selectedSkin.replace(/\.(png|gif)$/i, "")}** thành công!`,
            embeds: [buildClassEmbed(user.rpg.classKey, rpgClass, user, selectedSkin)],
            files: [attachment],
            components: [actionRow]
          });
        } else if (interaction.customId === "rpg_class_skins_back") {
          const user = await getUser(message.author.id);
          const rpgClass = getRpgClass(user.rpg.classKey);
          const currentAsset = user.rpg.characterAsset || rpgClass.asset;
          const assetPath = getCharacterAssetPath(currentAsset);
          const attachment = new AttachmentBuilder(assetPath, { name: currentAsset });
          await safeInteractionUpdate(interaction, {
            content: null,
            embeds: [buildClassEmbed(user.rpg.classKey, rpgClass, user, currentAsset)],
            files: [attachment],
            components: [actionRow]
          });
        } else if (interaction.customId === "rpg_class_action_classes") {
          const user = await getUser(message.author.id);
          const isFree = !user.rpg.freeClassChangeUsed;
          const changeCost = isFree ? 0 : 100000;
          const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("rpg_class_change_confirm")
              .setLabel(isFree ? "Xác nhận • miễn phí" : "Xác nhận • 100k Coke")
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId("rpg_class_change_cancel")
              .setLabel("Hủy")
              .setStyle(ButtonStyle.Secondary)
          );
          await safeInteractionUpdate(interaction, {
              content: isFree
                ? `⚠️ **Đổi class • miễn phí**\nBạn có muốn chọn lại class nhân vật không?`
                : `⚠️ **Đổi class • 100.000 Coke**\nSố dư hiện tại: **${user.coke.toLocaleString()} Coke**`,
            components: [confirmRow],
          });
        } else if (interaction.customId === "rpg_class_change_cancel") {
          const rpgClass = getRpgClass(userData.rpg.classKey);
          await safeInteractionUpdate(interaction, {
            content: "Đã hủy yêu cầu đổi Class.",
            embeds: [buildClassEmbed(userData.rpg.classKey, rpgClass, userData, avatarFile)],
            components: [actionRow],
          });
        } else if (interaction.customId === "rpg_class_change_confirm") {
          const user = await getUser(message.author.id);
          const isFree = !user.rpg.freeClassChangeUsed;
          const changeCost = isFree ? 0 : 100000;
          if (user.coke < changeCost) {
            return safeInteractionReply(interaction, {
              content: `❌ Bạn không đủ Coke để đổi class. (Yêu cầu: **${changeCost.toLocaleString()} Coke**, hiện có: **${user.coke.toLocaleString()} Coke**)`,
              flags: 64,
            });
          }
          user.coke -= changeCost;
          await user.save();
          let currentClassKey = classEntries()[0][0];
          let currentAvatar = getRpgClass(currentClassKey).asset;
          const renderChangePayload = (disabled = false) => {
            const rpgClass = getRpgClass(currentClassKey);
            const embed = buildClassEmbed(currentClassKey, rpgClass, null, currentAvatar);
            const assetPath = getCharacterAssetPath(currentAvatar);
            const attachment = new AttachmentBuilder(assetPath, {
              name: currentAvatar,
            });
            return {
              content: isFree
                ? `Đổi class • miễn phí\nChọn class và avatar mới, sau đó bấm **Chốt lựa chọn**.`
                : `Đổi class • đã trừ 100k Coke\nChọn class và avatar mới, sau đó bấm **Chốt lựa chọn**.`,
              embeds: [embed],
              files: [attachment],
              components: [
                buildClassSelectRow(currentClassKey, disabled),
                buildAvatarSelectRow(currentClassKey, currentAvatar, disabled),
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId("rpg_class_change_accept")
                    .setLabel("Chốt lựa chọn")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(disabled),
                  new ButtonBuilder()
                    .setCustomId("rpg_class_change_abort")
                    .setLabel("Hủy, giữ class cũ")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled)
                ),
              ],
            };
          };
          if (!(await safeDeferUpdate(interaction))) return;
          await safeInteractionEditReply(interaction, renderChangePayload(false));
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
              if (!(await safeDeferUpdate(i))) return;
              await safeInteractionEditReply(i, renderChangePayload(false));
            } else if (i.isButton()) {
              if (!(await safeDeferUpdate(i))) return;
              if (i.customId === "rpg_class_change_accept") {
                changeCollector.stop("accepted");
                const updatedUser = await getUser(message.author.id);
                const rpgClass = getRpgClass(currentClassKey);
                updatedUser.rpg.classKey = currentClassKey;
                updatedUser.rpg.characterAsset = currentAvatar;
                updatedUser.rpg.stats = { ...rpgClass.stats };
                updatedUser.rpg.freeClassChangeUsed = true;
                updatedUser.rpg.power = calculateRpgPower(updatedUser);
                updatedUser.markModified("rpg");
                await updatedUser.save();
                await safeInteractionEditReply(i, {
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
                const originalAssetPath = getCharacterAssetPath(originalAvatar);
                const originalAttachment = new AttachmentBuilder(originalAssetPath, {
                  name: originalAvatar,
                });
                await safeInteractionEditReply(i, {
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
              .setLabel(isFree ? "Xác nhận • miễn phí" : "Xác nhận • 100k Coke")
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId("rpg_name_change_cancel")
              .setLabel("Hủy")
              .setStyle(ButtonStyle.Secondary)
          );
          await safeInteractionUpdate(interaction, {
              content: isFree
                ? `📝 **Đổi tên nhân vật**\nLần đầu miễn phí. Bạn có muốn tiếp tục không?`
                : `📝 **Đổi tên nhân vật**\nPhí: **100.000 Coke** • Số dư: **${user.coke.toLocaleString()} Coke**`,
            components: [confirmRenameRow],
          });
        } else if (interaction.customId === "rpg_name_change_cancel") {
          const rpgClass = getRpgClass(userData.rpg.classKey);
          await safeInteractionUpdate(interaction, {
            content: "Đã hủy yêu cầu đổi tên.",
            embeds: [buildClassEmbed(userData.rpg.classKey, rpgClass, userData, avatarFile)],
            components: [actionRow],
          });
        } else if (interaction.customId === "rpg_name_change_confirm") {
          const user = await getUser(message.author.id);
          const isFree = !user.rpg.nameChanged;
          const renameCost = isFree ? 0 : 100000;
          if (user.coke < renameCost) {
            return safeInteractionReply(interaction, {
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
          if (!(await safeInteractionCall(interaction, "showModal", modal))) return;
          const modalSubmit = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === "rpg_name_change_modal" && i.user.id === interaction.user.id,
            time: 60000,
          }).catch(() => null);
          if (!modalSubmit) return;
          const newName = modalSubmit.fields.getTextInputValue("rpg_char_name_input").trim();
          if (!newName) {
            return safeInteractionReply(modalSubmit, {
              content: "❌ Tên nhân vật không được để trống.",
              flags: 64,
            });
          }
          const finalUser = await getUser(message.author.id);
          if (finalUser.coke < renameCost) {
            return safeInteractionReply(modalSubmit, {
              content: `❌ Có lỗi xảy ra: Bạn không đủ Coke.`,
              flags: 64,
            });
          }
          if (!(await safeDeferUpdate(modalSubmit))) return;
          finalUser.coke -= renameCost;
          finalUser.rpg.name = newName;
          finalUser.rpg.nameChanged = true;
          finalUser.markModified("rpg");
          await finalUser.save();
          collector.stop("accepted");
          const rpgClass = getRpgClass(finalUser.rpg.classKey);
          const currentAvatar = finalUser.rpg.characterAsset || rpgClass.asset;
          const assetPath = getCharacterAssetPath(currentAvatar);
          const attachment = new AttachmentBuilder(assetPath, {
            name: currentAvatar,
          });
          await safeInteractionEditReply(modalSubmit, {
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
    let currentClassKey = classEntries()[0][0];
    let currentAvatar = getRpgClass(currentClassKey).asset;
    const renderMessagePayload = (disabled = false) => {
      const rpgClass = getRpgClass(currentClassKey);
      const assetPath = getCharacterAssetPath(currentAvatar);
      const attachment = new AttachmentBuilder(assetPath, {
        name: currentAvatar,
      });
      const embed = buildClassEmbed(currentClassKey, rpgClass, null, currentAvatar);
      return {
        content: "Chọn class, avatar và đặt tên để bắt đầu hành trình RPG.",
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
      time: 180000, 
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
        await safeInteractionUpdate(interaction, renderMessagePayload(false));
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
          if (!(await safeInteractionCall(interaction, "showModal", modal))) return;
          const modalSubmit = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === "rpg_class_create_modal" && i.user.id === interaction.user.id,
            time: 60000,
          }).catch(() => null);
          if (!modalSubmit) return;
          const characterName = modalSubmit.fields.getTextInputValue("rpg_char_name_input").trim();
          if (!characterName) {
            return safeInteractionReply(modalSubmit, {
              content: "❌ Tên nhân vật không được để trống.",
              flags: 64,
            });
          }
          if (!(await safeDeferUpdate(modalSubmit))) return;
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
            stats: { ...rpgClass.stats },
            rank: "Novice",
            equipped: {},
            items: [],
            lastItemId: 0,
            lastHuntAt: null,
            lastBossAt: null,
            createdAt: new Date(),
          });
          await user.save();
          await safeInteractionEditReply(modalSubmit, {
            content: `🎉 Đã khởi tạo nhân vật thành công! Bạn là **${rpgClass.name}** tên là **${characterName}**. Hãy gõ \`${config.prefix}hunt\` hoặc \`${config.prefix}h\` để bắt đầu chiến đấu!`,
            ...renderMessagePayload(true),
          });
        } else if (interaction.customId === "rpg_class_cancel") {
          collector.stop("cancelled");
          await safeInteractionUpdate(interaction, {
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
  }
}
module.exports = new ClassCommand();
