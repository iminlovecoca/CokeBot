const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
} = require("discord.js");
const config = require("../../data/config");
const { getUser } = require("../../utils/userUtil");
const {
  requireRpgCharacter,
  getEffectiveRpgStats,
  calculateRpgPower,
  getRpgClass,
  getStartingStats,
  getAvailablePoints,
  getAllocatedPoints,
} = require("../../utils/rpgUtil");

const statMap = {
  vigor: "vigor", vig: "vigor", health: "vigor", hp: "vigor",
  pr: "pr", def: "pr", armor: "pr",
  mr: "mr", magicresist: "mr",
  str: "str", strength: "str", strengh: "str",
  dex: "dex", dexterity: "dex", agi: "dex",
  int: "int", intelligence: "int",
  arc: "arc", arcane: "arc"
};

const statLabels = {
  vigor: "Vigor",
  pr: "PR (Physical Resistance)",
  mr: "MR (Magical Resistance)",
  str: "Strengh",
  dex: "Dexterity",
  int: "Intelligence",
  arc: "Arcane (ARC)"
};

module.exports = {
  name: "stat",
  aliases: ["addstat", "upstat", "cộng", "cong"],
  description: "Cộng điểm chỉ số nhân vật RPG của bạn.",
  usage: `${config.prefix}stat [chỉ số] [số lượng/all]`,
  examples: [
    { intent: "Xem giao diện cộng điểm", command: `${config.prefix}stat` },
    { intent: "Cộng 5 điểm vào Vigor", command: `${config.prefix}stat vigor 5` },
    { intent: "Cộng toàn bộ điểm vào Strength", command: `${config.prefix}stat str all` }
  ],

  async execute(message, args = []) {
    const { user, rpgClass } = await requireRpgCharacter(message.author.id);

    // Compute stats
    const startingStats = getStartingStats(user);
    const stats = {};
    for (const key of ["vigor", "pr", "mr", "str", "dex", "int", "arc"]) {
      stats[key] = user.rpg.stats?.[key] !== undefined ? user.rpg.stats[key] : (startingStats[key] || 0);
    }
    const level = user.rpg.level || 1;
    let available = getAvailablePoints(user);

    // Check if arguments were passed
    if (args[0]) {
      const inputStat = args[0].toLowerCase();
      const targetStat = statMap[inputStat];
      if (!targetStat) {
        return message.reply(
          `${config.emoji.no} Chỉ số không hợp lệ. Các chỉ số: \`vigor\` (\`vig\`), \`pr\`, \`mr\`, \`str\`, \`dex\`, \`int\`, \`arc\`.`
        );
      }

      const currentVal = stats[targetStat];
      if (currentVal >= 99) {
        return message.reply(`${config.emoji.warning} Chỉ số **${statLabels[targetStat]}** của bạn đã đạt tối đa (99 điểm)!`);
      }

      if (available <= 0) {
        return message.reply(`${config.emoji.no} Bạn không có điểm chỉ số nào chưa cộng. Hãy đi săn để tăng cấp!`);
      }

      let amount = 1;
      if (args[1]) {
        if (args[1].toLowerCase() === "all") {
          amount = Math.min(available, 99 - currentVal);
        } else {
          amount = parseInt(args[1]);
          if (isNaN(amount) || amount <= 0) {
            return message.reply(`${config.emoji.no} Số lượng điểm cộng thêm phải là một số dương hoặc \`all\`.`);
          }
        }
      }

      if (amount > available) {
        return message.reply(`${config.emoji.no} Bạn chỉ có **${available}** điểm chỉ số chưa cộng (cần **${amount}**).`);
      }

      if (currentVal + amount > 99) {
        return message.reply(
          `${config.emoji.no} Không thể cộng **${amount}** điểm vào **${statLabels[targetStat]}** vì giới hạn tối đa là 99 điểm (hiện có: **${currentVal}**).`
        );
      }

      // Perform allocation
      user.rpg.stats = {
        ...stats,
        [targetStat]: currentVal + amount
      };
      user.rpg.power = calculateRpgPower(user);
      user.markModified("rpg");
      await user.save();

      return message.reply(
        `🎉 Bạn đã cộng **+${amount}** điểm vào chỉ số **${statLabels[targetStat]}** thành công!\n` +
          `Chỉ số mới: **${currentVal + amount}/99** | Điểm còn lại: **${available - amount}**.`
      );
    }

    // Interactive menu flow
    let selectedStat = "vigor";

    const buildEmbed = (availablePoints, currentStats) => {
      const renderLine = (key) => {
        const val = currentStats[key] || 0;
        const barLen = Math.round((val / 99) * 15);
        const bar = "▰".repeat(barLen) + "▱".repeat(15 - barLen);
        const selected = selectedStat === key ? "➡️ " : "";
        return `${selected}**${statLabels[key]}**: \`${val}/99\`\n\`${bar}\``;
      };

      const fields = [
        { name: "Chỉ số hiện tại", value: ["vigor", "pr", "mr", "str", "dex", "int", "arc"].map(renderLine).join("\n\n") }
      ];

      return new EmbedBuilder()
        .setColor(rpgClass.color)
        .setTitle(`📊 Cộng điểm chỉ số RPG - ${user.rpg.name || message.author.username}`)
        .setDescription(
          `Cấp độ nhân vật: **Level ${level}**\n` +
            `Điểm chỉ số chưa cộng: **${availablePoints}** điểm\n\n` +
            `*Chọn một chỉ số từ menu bên dưới, sau đó click nút cộng điểm!*`
        )
        .addFields(fields)
        .setFooter({ text: "Giới hạn 99 điểm/chỉ số." });
    };

    const buildInteractiveComponents = (availablePoints, currentStats) => {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("rpg_stat_select")
        .setPlaceholder("Chọn chỉ số để cộng điểm")
        .addOptions(
          Object.keys(statLabels).map((key) => ({
            label: statLabels[key],
            value: key,
            default: key === selectedStat,
          }))
        );

      const hasPoints = availablePoints > 0;
      const targetVal = currentStats[selectedStat] || 0;
      const isMax = targetVal >= 99;

      const btn1 = new ButtonBuilder()
        .setCustomId("rpg_stat_add_1")
        .setLabel("+1")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!hasPoints || isMax || targetVal + 1 > 99);

      const btn5 = new ButtonBuilder()
        .setCustomId("rpg_stat_add_5")
        .setLabel("+5")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!hasPoints || isMax || targetVal + 5 > 99 || availablePoints < 5);

      const btn10 = new ButtonBuilder()
        .setCustomId("rpg_stat_add_10")
        .setLabel("+10")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!hasPoints || isMax || targetVal + 10 > 99 || availablePoints < 10);

      const btnAll = new ButtonBuilder()
        .setCustomId("rpg_stat_add_all")
        .setLabel("+Tất cả")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!hasPoints || isMax);

      const btnReset = new ButtonBuilder()
        .setCustomId("rpg_stat_reset")
        .setLabel("Tẩy điểm (Đang khóa)")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true);

      const row1 = new ActionRowBuilder().addComponents(selectMenu);
      const row2 = new ActionRowBuilder().addComponents(btn1, btn5, btn10, btnAll, btnReset);

      return [row1, row2];
    };

    const currentStats = user.rpg.stats || {};
    const initialEmbed = buildEmbed(available, currentStats);
    const initialComponents = buildInteractiveComponents(available, currentStats);

    const sentMessage = await message.reply({
      embeds: [initialEmbed],
      components: initialComponents,
    });

    const collector = sentMessage.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === message.author.id,
      time: 180000, // 3 minutes
    });

    collector.on("collect", async (interaction) => {
      // Refresh user to avoid race conditions
      const refreshedUser = await getUser(message.author.id);
      const starting = getStartingStats(refreshedUser);
      let currStats = {};
      for (const key of ["vigor", "pr", "mr", "str", "dex", "int", "arc"]) {
        currStats[key] = refreshedUser.rpg.stats?.[key] !== undefined ? refreshedUser.rpg.stats[key] : (starting[key] || 0);
      }
      let avail = getAvailablePoints(refreshedUser);

      if (interaction.isStringSelectMenu()) {
        selectedStat = interaction.values[0];
        await interaction.update({
          embeds: [buildEmbed(avail, currStats)],
          components: buildInteractiveComponents(avail, currStats),
        });
      } else if (interaction.isButton()) {
        if (interaction.customId === "rpg_stat_reset") {
          return interaction.reply({
            content: `❌ Tính năng tẩy điểm tạm thời khóa để nâng cấp.`,
            flags: 64,
          });
        }

        let addAmt = 0;
        const curVal = currStats[selectedStat] || 0;

        if (interaction.customId === "rpg_stat_add_1") {
          addAmt = 1;
        } else if (interaction.customId === "rpg_stat_add_5") {
          addAmt = 5;
        } else if (interaction.customId === "rpg_stat_add_10") {
          addAmt = 10;
        } else if (interaction.customId === "rpg_stat_add_all") {
          addAmt = Math.min(avail, 99 - curVal);
        }

        if (addAmt > 0) {
          refreshedUser.rpg.stats = {
            ...currStats,
            [selectedStat]: curVal + addAmt
          };
          refreshedUser.rpg.power = calculateRpgPower(refreshedUser);
          refreshedUser.markModified("rpg");
          await refreshedUser.save();

          avail -= addAmt;
          currStats = refreshedUser.rpg.stats;

          await interaction.update({
            embeds: [buildEmbed(avail, currStats)],
            components: buildInteractiveComponents(avail, currStats),
          });
        }
      }
    });

    collector.on("end", async () => {
      await sentMessage.edit({ components: [] }).catch(() => {});
    });
  },
};
