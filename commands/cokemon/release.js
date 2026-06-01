const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const {
  getAllCokemonWithUids,
  removeCokemon,
  getFilteredCokemon,
} = require("../../utils/userUtil");
const {
  validateFilterArgs,
  buildCokemonQuery,
} = require("../../utils/queryUtil");
const {
  getCokemonName,
  getCokemonEmoji,
  getGenderEmoji,
} = require("../../utils/cokemonUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");
const MAX_DETAILED_RELEASE = 20;

const cokemonInfo = (cokemon) => {
  const displayName = getCokemonName(cokemon);
  const emoji = getCokemonEmoji(cokemon);
  const genderSymbol = getGenderEmoji(cokemon);
  return `${displayName} ${emoji}${genderSymbol} (No. ${cokemon.uid} • Cấp ${cokemon.level} • ${cokemon.iv_percent}%)`;
};

module.exports = {
  name: "release",
  description: "Thả một hoặc nhiều cokemon về với tự nhiên.",
  aliases: ["rl"],
  usage: `${config.prefix}release <ID1> [ID2]...\n${config.prefix}release [--type <types>] [--tier <tiers>] [--lvl<op> <val>] [--iv<op> <val>] [--shiny] [--fav]`,
  examples: [
    {
      intent: "Thả theo danh sách ID cụ thể",
      command: `${config.prefix}release 1 5 10 22`,
    },
    {
      intent: "Lọc theo đặc điểm (type, tier, name, nature, ability, gender)",
      command: `${config.prefix}release --type water grass --tier common --gender male`,
    },
    {
      intent: "Lọc theo chỉ số game (lvl, iv)",
      command: `${config.prefix}release --lvl- 10 --iv- 40`,
    },
    {
      intent:
        "Lọc theo chỉ số IV cụ thể (hpiv, atkiv, defiv, spatkiv, spdefiv, spdiv)",
      command: `${config.prefix}release --atkiv- 5 --spdiv- 5`,
    },
    {
      intent:
        "Lọc theo chỉ số cơ bản - Base Stats (hp, atk, def, spatk, spdef, spd)",
      command: `${config.prefix}release --hp- 50 --spd- 40`,
    },
    {
      intent: "Lọc theo trạng thái đặc biệt (shiny, noshiny, fav, nofav)",
      command: `${config.prefix}release --noshiny --nofav`,
    },
  ],
  async execute(message, args) {
    if (args.length === 0) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn cần cung cấp ID hoặc bộ lọc. Ví dụ: \`${config.prefix}release 3 12\` hoặc \`${config.prefix}release --tier common\``,
      );
    }

    const isIdBased = /^[0-9]+$/.test(args[0]);
    const isFilterBased = args[0].startsWith("--");
    let cokemonToRelease = [];
    let msgContent = "";
    if (isIdBased) {
      // Releasing by IDs
      const uidsToRelease = [
        ...new Set(args.map((id) => parseInt(id)).filter((id) => !isNaN(id))),
      ];
      if (uidsToRelease.length === 0) {
        throw new UserFriendlyError(
          `${config.emoji.no} ID cung cấp không hợp lệ.`,
        );
      }

      cokemonToRelease = await getAllCokemonWithUids(
        message.author.id,
        uidsToRelease,
      );
      if (cokemonToRelease.length !== uidsToRelease.length) {
        // Warns if some IDs were invalid
        msgContent = `${config.emoji.warning} Một hoặc nhiều ID không hợp lệ đã được bỏ qua.\n`;
      }
    } else if (isFilterBased) {
      // Releasing by filter
      validateFilterArgs(args);
      const { cokemonQuery, speciesQuery } = await buildCokemonQuery(args);
      cokemonToRelease = await getFilteredCokemon(
        message.author.id,
        cokemonQuery,
        speciesQuery,
      );
    } else {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn cần cung cấp ID hoặc bộ lọc (bắt đầu bằng \`--\`).`,
      );
    }

    if (cokemonToRelease.length === 0) {
      throw new UserFriendlyError(
        `${config.emoji.no} Không có ID hợp lệ nào được tìm thấy trong bộ sưu tập của bạn.`,
      );
    }

    // Check if the list contains favorited cokemon
    const favCokemon = cokemonToRelease.filter((c) => c.is_favorite);
    if (favCokemon.length > 0) {
      const favIds = favCokemon.map((c) => `${c.uid}`).join(", ");
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không thể thả cokemon yêu thích! Hãy bỏ yêu thích cho các cokemon có ID: ${favIds} trước, hoặc sử dụng tag \`--nofav\``,
      );
    }

    let totalReward = 0;
    for (const cokemon of cokemonToRelease) {
      if (!cokemon.species_id.tier) {
        await cokemon.populate("species_id");
      }
      totalReward +=
        config.cokemon_settings.tier_release_rewards[cokemon.species_id.tier];
    }
    if (cokemonToRelease.length === 1) {
      msgContent += `Bạn có chắc muốn thả ${cokemonInfo(cokemonToRelease[0])} để nhận ${config.emoji.money} ${totalReward}?`;
    } else if (cokemonToRelease.length <= MAX_DETAILED_RELEASE) {
      msgContent += `Bạn có chắc muốn thả ${cokemonToRelease.length} cokemon sau để nhận ${config.emoji.money} ${totalReward}?`;
      cokemonToRelease.forEach((c) => {
        msgContent += `\n- ${cokemonInfo(c)}`;
      });
    } else {
      let tierCounts = {};
      let shinyCount = 0;
      let highIvCount = 0;
      const HIGH_IV_THRESHOLD = 80;

      for (const c of cokemonToRelease) {
        const tier = c.species_id.tier;
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;

        if (c.is_shiny) shinyCount++;
        if (c.iv_percent >= HIGH_IV_THRESHOLD) highIvCount++;
      }
      let summaryLines = [
        `Bạn có chắc muốn thả ${cokemonToRelease.length} cokemon sau để nhận ${config.emoji.money} ${totalReward}? Trong đó bao gồm:`,
      ];
      for (const [tier, count] of Object.entries(tierCounts)) {
        summaryLines.push(`- **${count}** x ${tier}`);
      }
      if (shinyCount > 0) {
        summaryLines.push(
          `- ${config.emoji.warning} **${shinyCount}** trong số đó là SHINY!`,
        );
      }
      if (highIvCount > 0) {
        summaryLines.push(
          `- ${config.emoji.warning} **${highIvCount}** trong số đó có IV cao (>= ${HIGH_IV_THRESHOLD}%)!`,
        );
      }
      msgContent += summaryLines.join("\n");
    }

    const confirm = new ButtonBuilder()
      .setCustomId("confirm")
      .setLabel("Đồng ý")
      .setStyle(ButtonStyle.Danger);
    const cancel = new ButtonBuilder()
      .setCustomId("cancel")
      .setLabel("Hủy")
      .setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(confirm, cancel);
    const sentMsg = await message.reply({
      content: msgContent,
      components: [row],
      fetchReply: true,
    });

    const collector = sentMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      await i.deferUpdate();
      if (i.customId === "confirm") {
        const validUidsToRelease = cokemonToRelease.map((c) => c.uid);
        const releasedCount = await removeCokemon(
          message.author.id,
          validUidsToRelease,
          totalReward,
        );
        const cokemonStr =
          releasedCount === 1
            ? `${cokemonInfo(cokemonToRelease[0])}`
            : `${releasedCount} cokemon`;
        await i.editReply({
          content: `Bạn đã thả ${cokemonStr} về với tự nhiên và nhận được ${config.emoji.money} **${totalReward}**!`,
          embeds: [],
          components: [],
        });
      } else {
        await i.editReply({
          content: "Đã hủy hành động thả.",
          embeds: [],
          components: [],
        });
      }
      collector.stop();
    });

    collector.on("end", (_, reason) => {
      if (reason === "time") {
        sentMsg.edit({
          content: "Hết thời gian xác nhận, hành động đã được hủy.",
          components: [],
        });
      }
    });
  },
};
