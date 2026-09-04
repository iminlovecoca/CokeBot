const BaseCommand = require("../../../core/BaseCommand");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
} = require("discord.js");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const {
  requireRpgCharacter,
  getEffectiveRpgStats,
  calculateRpgPower,
  getRpgClass,
  getStartingStats,
  getAvailablePoints,
  getAllocatedPoints,
} = require("../../../utils/rpgUtil");
const { formatRpgBar, formatRpgFooter, formatRpgTitle, safeInteractionReply, safeInteractionUpdate } = require("../../../utils/rpgUi");
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
  str: "STR",
  dex: "Dexterity",
  int: "Intelligence",
  arc: "Arcane (ARC)"
};
class StatCommand extends BaseCommand {
  constructor() {
    super({
      name: "stat",
      aliases: ["addstat", "upstat", "cộng", "cong"],
      description: "Cộng điểm chỉ số nhân vật RPG của bạn.",
      usage: `${config.prefix}stat [chỉ số] [số lượng/all]`,
      examples: [
        { intent: "Xem giao diện cộng điểm", command: `${config.prefix}stat` },
        { intent: "Cộng 5 điểm vào Vigor", command: `${config.prefix}stat vigor 5` },
        { intent: "Cộng toàn bộ điểm vào Strength", command: `${config.prefix}stat str all` }
      ],
      cooldown: 0
    });
  }
  async execute(message, args = []) {
    const { user, rpgClass } = await requireRpgCharacter(message.author.id);
    const startingStats = getStartingStats(user);
    const stats = {};
    for (const key of ["vigor", "pr", "mr", "str", "dex", "int", "arc"]) {
      stats[key] = user.rpg.stats?.[key] !== undefined ? user.rpg.stats[key] : (startingStats[key] || 0);
      stats[key] = Math.min(99, Math.max(startingStats[key] || 0, stats[key]));
    }
    const level = user.rpg.level || 1;
    let available = getAvailablePoints(user);
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
      const maxCanAdd = Math.min(available, 99 - currentVal);
      if (maxCanAdd <= 0) {
        return message.reply(`${config.emoji.warning} Chỉ số **${statLabels[targetStat]}** của bạn đã đạt tối đa (99 điểm)!`);
      }

      let amount = 1;
      if (args[1]) {
        if (args[1].toLowerCase() === "all") {
          amount = maxCanAdd;
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
          `${config.emoji.no} Không thể cộng **${amount}** điểm vào **${statLabels[targetStat]}** vì giới hạn tối đa là 99 điểm (hiện có: **${currentVal}**, có thể cộng thêm tối đa: **${99 - currentVal}**).`
        );
      }
      user.rpg.stats = {
        ...stats,
        [targetStat]: Math.min(99, currentVal + amount)
      };
      user.rpg.power = calculateRpgPower(user);
      user.markModified("rpg");
      await user.save();
      return message.reply(
        `🎉 Bạn đã cộng **+${amount}** điểm vào chỉ số **${statLabels[targetStat]}** thành công!\n` +
          `Chỉ số mới: **${Math.min(99, currentVal + amount)}/99** | Điểm còn lại: **${available - amount}**.`
      );
    }
    let selectedStat = "vigor";
    const buildEmbed = (availablePoints, currentStats, targetUser = user) => {
      const effectiveStats = getEffectiveRpgStats(targetUser);
      const renderLine = (key) => {
        const base = Math.min(99, currentStats[key] || 0);
        const eff = effectiveStats[key] || base;
        const selected = selectedStat === key ? "▸ " : "";
        return `${selected}**${statLabels[key]}** · \`${eff}/99\`\n\`${formatRpgBar(eff, 99, 12)}\``;
      };
      const fields = [
        { name: "Chỉ số hiện tại", value: ["vigor", "pr", "mr", "str", "dex", "int", "arc"].map(renderLine).join("\n\n") }
      ];
      return new EmbedBuilder()
        .setColor(rpgClass.color)
        .setTitle(formatRpgTitle(`Phân bổ chỉ số • ${targetUser.rpg?.name || message.author.username}`, "📊"))
        .setDescription(
          `Level **${level}**  •  Lực chiến **${Math.floor(calculateRpgPower(targetUser)).toLocaleString()}**\n` +
            `Điểm chưa cộng: **${availablePoints}**\n\n` +
            `Chọn một chỉ số, sau đó chọn nhanh số điểm muốn cộng.`
        )
        .addFields(fields)
        .setFooter(formatRpgFooter("Giới hạn 99 điểm mỗi chỉ số"));
    };
    const buildInteractiveComponents = (availablePoints, currentStats) => {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("rpg_stat_select")
        .setPlaceholder("① Chọn chỉ số để cộng điểm")
        .addOptions(
          Object.keys(statLabels).map((key) => ({
            label: statLabels[key],
            value: key,
            default: key === selectedStat,
          }))
        );
      const hasPoints = availablePoints > 0;
      const targetVal = Math.min(99, currentStats[selectedStat] || 0);
      const isMax = targetVal >= 99;
      const btn1 = new ButtonBuilder()
        .setCustomId("rpg_stat_add_1")
        .setLabel("+1")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!hasPoints || isMax || targetVal + 1 > 99 || availablePoints < 1);
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
      time: 180000, 
    });
    collector.on("collect", async (interaction) => {
      const refreshedUser = await getUser(message.author.id);
      const starting = getStartingStats(refreshedUser);
      let currStats = {};
      for (const key of ["vigor", "pr", "mr", "str", "dex", "int", "arc"]) {
        currStats[key] = refreshedUser.rpg.stats?.[key] !== undefined ? refreshedUser.rpg.stats[key] : (starting[key] || 0);
        currStats[key] = Math.min(99, Math.max(starting[key] || 0, currStats[key]));
      }
      let avail = getAvailablePoints(refreshedUser);
      if (interaction.isStringSelectMenu()) {
        selectedStat = interaction.values[0];
        await safeInteractionUpdate(interaction, {
          embeds: [buildEmbed(avail, currStats, refreshedUser)],
          components: buildInteractiveComponents(avail, currStats),
        });
      } else if (interaction.isButton()) {
        if (interaction.customId === "rpg_stat_reset") {
          return safeInteractionReply(interaction, {
            content: `❌ Tính năng tẩy điểm tạm thời khóa để nâng cấp.`,
            flags: 64,
          });
        }
        const curVal = Math.min(99, currStats[selectedStat] || 0);
        const maxPossible = Math.min(avail, 99 - curVal);

        let addAmt = 0;
        if (interaction.customId === "rpg_stat_add_1") {
          addAmt = 1;
        } else if (interaction.customId === "rpg_stat_add_5") {
          addAmt = 5;
        } else if (interaction.customId === "rpg_stat_add_10") {
          addAmt = 10;
        } else if (interaction.customId === "rpg_stat_add_all") {
          addAmt = maxPossible;
        }

        addAmt = Math.min(addAmt, maxPossible);

        if (addAmt <= 0) {
          return safeInteractionReply(interaction, {
            content: `❌ Chỉ số **${statLabels[selectedStat]}** đã đạt tối đa 99 điểm hoặc bạn không còn đủ điểm để cộng!`,
            flags: 64,
          });
        }

        refreshedUser.rpg.stats = {
          ...currStats,
          [selectedStat]: Math.min(99, curVal + addAmt)
        };
        refreshedUser.rpg.power = calculateRpgPower(refreshedUser);
        refreshedUser.markModified("rpg");
        await refreshedUser.save();
        avail -= addAmt;
        currStats = refreshedUser.rpg.stats;
        await safeInteractionUpdate(interaction, {
          embeds: [buildEmbed(avail, currStats, refreshedUser)],
          components: buildInteractiveComponents(avail, currStats),
        });
      }
    });
    collector.on("end", async () => {
      await sentMessage.edit({ components: [] }).catch(() => {});
    });
  }
}
module.exports = new StatCommand();
