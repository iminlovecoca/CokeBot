const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../../data/config");
const User = require("../../models/User");
const NoituGuild = require("../../models/NoituGuild");
const {
  getGuildConfig,
  setGuildChannel,
  startNoituGame,
  stopNoituGame,
  getGameState,
  getNoituStatsSnapshot,
  upsertNoituStats,
  checkWordIfInDictionary,
  checkWordIfInReportDictionary,
  addWordToDictionary,
  addWordToReportList,
  countWordInDictionary,
  getQuery,
  getWordPlayedCount,
  getRoundPlayedCount,
  addRoundPlayedCount,
} = require("../../utils/noituGame");
const { pushAcceptedWordToGithub, syncNoituData } = require("../../utils/noituBootstrap");

const envPath = path.join(__dirname, "../../.env");

function upsertEnvValue(key, value) {
  const nextLine = `${key}=${value}`;

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, `${nextLine}\n`);
    return;
  }

  const existing = fs.readFileSync(envPath, "utf8");
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(existing)) {
    fs.writeFileSync(envPath, existing.replace(pattern, nextLine));
    return;
  }

  const suffix = existing.endsWith("\n") ? "" : "\n";
  fs.writeFileSync(envPath, `${existing}${suffix}${nextLine}\n`);
}

function getReportChannel() {
  return process.env.REPORT_CHANNEL || "";
}

function getApproveChannel() {
  return process.env.APPROVE_CHANNEL || getReportChannel();
}

function makeMessageEmbed(msg) {
  return new EmbedBuilder()
    .setColor(13250094)
    .setDescription(msg)
    .setTimestamp();
}

function makeNoituHelpEmbed() {
  return new EmbedBuilder()
    .setColor(13250094)
    .setDescription(":crystal_ball: Hướng dẫn sử dụng BOT")
    .addFields(
      {
        name: "Cài đặt kênh chơi nối từ",
        value:
          "Dùng lệnh slash `/noitu set-channel <channel>` trong kênh nối từ.",
        inline: true,
      },
      {
        name: "Bắt đầu lượt chơi",
        value: "Dùng lệnh `/noitu start` trong kênh chơi nối từ",
        inline: true,
      },
      {
        name: "Dừng lượt chơi",
        value:
          "Dùng lệnh `/noitu stop` trong kênh chơi nối từ, lượt mới sẽ tự động bắt đầu!",
        inline: true,
      },
      {
        name: "Xem thống kê của BOT",
        value: "Dùng lệnh slash `/noitu stats`",
        inline: true,
      },
      {
        name: "Xem bảng xếp hạng server",
        value: "Dùng lệnh slash `/noitu rank`",
        inline: true,
      },
      {
        name: "Xem thống kê cá nhân",
        value: "Dùng lệnh slash `/noitu me`",
        inline: true,
      },
      {
        name: "Report từ sai trong từ điển",
        value: "Dùng lệnh slash `/noitu report <từ> [lý do]`",
        inline: true,
      },
      {
        name: "Xem thông tin server",
        value: "Dùng lệnh slash `/noitu server`",
        inline: true,
      },
      {
        name: "Đồng bộ từ điển từ GitHub (Admin)",
        value: "Dùng lệnh slash `/noitu sync`.",
        inline: true,
      },
      {
        name: "Ai có thể dùng lệnh set-channel?",
        value: "Người dùng có quyền **MANAGE_GUILD**",
        inline: true,
      },
      {
        name: "Ai có thể dùng lệnh start",
        value: "Chỉ Admin máy chủ trong kênh nối từ",
        inline: true,
      },
      {
        name: "Ai có thể dùng lệnh stop",
        value: "Chỉ Admin máy chủ trong kênh nối từ",
        inline: true,
      },
      {
        name: "Khi nào trò chơi kết thúc?",
        value:
          "Khi không còn từ nào trong từ điển có thể nối tiếp từ hiện tại hoặc dùng lệnh stop",
        inline: true,
      },
    );
}

async function handleReport(interaction) {
  const reportChannel = getReportChannel();
  if (!reportChannel) {
    return interaction.reply({
      content: "Tính năng báo cáo hiện không hoạt động!",
      ephemeral: true,
    });
  }

  if (
    !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
  ) {
    return interaction.reply({
      content: "Bạn cần có quyền admin để báo cáo từ.",
      ephemeral: true,
    });
  }

  let word = interaction.options.getString("word");
  let reason = interaction.options.getString("reason") ?? "No reason provided.";
  let tu = word.trim().toLowerCase();
  let wArr = tu.split(/\s+/).filter(Boolean);
  word = wArr.join(" ");

  if (wArr.length !== 2) {
    return interaction.reply({
      content: "Cụm từ không hợp lệ",
      ephemeral: true,
    });
  }

  if (!checkWordIfInDictionary(word)) {
    return interaction.reply({
      content: "Cụm từ này không có trong từ điển của Bot",
      ephemeral: true,
    });
  }

  if (checkWordIfInReportDictionary(word)) {
    return interaction.reply({
      content: "Cụm từ này đã có trong danh sách đen của Bot",
      ephemeral: true,
    });
  }

  await interaction.reply({
    content: `Đã báo cáo từ **${word}**`,
    ephemeral: true,
  });

  const acceptButton = new ButtonBuilder()
    .setCustomId("accept")
    .setLabel("Đồng ý")
    .setStyle(ButtonStyle.Success);
  const declineButton = new ButtonBuilder()
    .setCustomId("decline")
    .setLabel("Từ chối")
    .setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder().addComponents(acceptButton, declineButton);

  const wordData = {
    word,
    reason,
    user: interaction.user.username,
    guildName: interaction.guild.name,
    guildId: interaction.guildId,
    guildIcon: interaction.guild.iconURL({ dynamic: true }),
  };

  const msg = await interaction.client.channels.cache.get(reportChannel).send({
    embeds: [
      new EmbedBuilder()
        .setColor(13250094)
        .setThumbnail(wordData.guildIcon)
        .addFields(
          {
            name: ":regional_indicator_p: Từ báo cáo",
            value: `**${wordData.word}**`,
            inline: true,
          },
          { name: ":bulb: Lý do", value: wordData.reason, inline: true },
          {
            name: ":bust_in_silhouette: Người gửi",
            value: wordData.user,
            inline: true,
          },
          { name: ":shield: Máy chủ", value: wordData.guildName, inline: true },
          { name: ":id: ID server", value: wordData.guildId, inline: true },
          { name: "Trạng thái", value: ":clock12: Đang chờ", inline: true },
        )
        .setTimestamp(),
    ],
    components: [row],
  });

  const filter = (i) => i.customId === "accept" || i.customId === "decline";
  const collection = msg.createMessageComponentCollector({ filter });

  collection.on("collect", async (i) => {
    if (!i.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return i.reply({ content: "Bạn không có quyền này", ephemeral: true });
    }

    let status;
    if (i.customId === "accept") {
      status = 1;
      addWordToReportList(word);
    } else {
      status = 2;
    }

    const dmUser = await interaction.client.users
      .fetch(interaction.user.id)
      .catch(() => null);
    if (dmUser) {
      dmUser
        .send({
          embeds: [
            makeMessageEmbed(
              `Từ \`${word}\` của bạn đã ${status === 1 ? "được đồng ý gỡ bỏ" : "bị từ chối gỡ bỏ"} bởi mod \`${i.member.displayName}\``,
            ),
          ],
        })
        .catch(() => {});
    }

    await i.update({
      embeds: [
        new EmbedBuilder()
          .setColor(13250094)
          .setThumbnail(wordData.guildIcon)
          .addFields(
            {
              name: ":regional_indicator_p: Từ báo cáo",
              value: `**${wordData.word}**`,
              inline: true,
            },
            { name: ":bulb: Lý do", value: wordData.reason, inline: true },
            {
              name: ":bust_in_silhouette: Người gửi",
              value: wordData.user,
              inline: true,
            },
            {
              name: ":shield: Máy chủ",
              value: wordData.guildName,
              inline: true,
            },
            { name: ":id: ID server", value: wordData.guildId, inline: true },
            {
              name: "Trạng thái",
              value:
                status === 1
                  ? ":white_check_mark: Đã đồng ý"
                  : ":x: Đã từ chối",
              inline: true,
            },
          )
          .setTimestamp(),
      ],
      components: [],
    });
  });
}

async function handleApprove(interaction) {
  const ownerId = process.env.OWNER_ID;
  if (!ownerId) {
    return interaction.reply({
      content: "❌ Không tìm thấy OWNER_ID trong tệp cấu hình .env",
      ephemeral: true,
    });
  }

  const owner = await interaction.client.users.fetch(ownerId).catch(() => null);
  if (!owner) {
    return interaction.reply({
      content: "❌ Không thể kết nối tới Owner qua DM. Vui lòng kiểm tra lại OWNER_ID.",
      ephemeral: true,
    });
  }

  const word = interaction.options.getString("word").trim().toLowerCase();
  const reason = interaction.options.getString("reason") || "Không có lý do.";
  const words = word.split(/\s+/);

  if (words.length !== 2) {
    return interaction.reply({
      content: "❌ Từ không hợp lệ. Cần là cụm từ 2 từ.",
      ephemeral: true,
    });
  }

  const wordData = {
    word,
    reason,
    user: interaction.user.tag,
    guildName: interaction.guild ? interaction.guild.name : "Direct Message",
    guildId: interaction.guildId || "DM",
    guildIcon: interaction.guild ? interaction.guild.iconURL({ dynamic: true }) : null,
  };

  await interaction.reply({
    content: `📥 Đã gửi yêu cầu duyệt từ **${word}** tới Owner của Bot.`,
    ephemeral: true,
  });

  const acceptButton = new ButtonBuilder()
    .setCustomId("approve_accept")
    .setLabel("Duyệt")
    .setStyle(ButtonStyle.Success);
  const declineButton = new ButtonBuilder()
    .setCustomId("approve_decline")
    .setLabel("Từ chối")
    .setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder().addComponents(acceptButton, declineButton);

  const msg = await owner.send({
    content: `📝 Yêu cầu duyệt từ mới từ ${interaction.user} (Server: **${wordData.guildName}**)`,
    embeds: [
      new EmbedBuilder()
        .setColor(13250094)
        .setThumbnail(wordData.guildIcon)
        .addFields(
          {
            name: "📌 Từ đề xuất",
            value: `**${wordData.word}**`,
            inline: true,
          },
          { name: "💡 Lý do", value: wordData.reason, inline: true },
          { name: "👤 Người gửi", value: wordData.user, inline: true },
          { name: "🛡️ Server", value: wordData.guildName, inline: true },
          { name: "🆔 ID Server", value: wordData.guildId, inline: true },
          { name: "📋 Trạng thái", value: "⏳ Chờ duyệt", inline: true },
        )
        .setTimestamp(),
    ],
    components: [row],
  }).catch((err) => {
    console.error("Failed to send DM to owner:", err);
    return null;
  });

  if (!msg) {
    return;
  }

  const filter = (i) =>
    ["approve_accept", "approve_decline"].includes(i.customId);
  const collector = msg.createMessageComponentCollector({ filter });

  collector.on("collect", async (i) => {
    if (i.user.id !== ownerId) {
      return i.reply({ content: "Bạn không có quyền thực hiện thao tác này!", ephemeral: true });
    }

    if (i.customId === "approve_accept") {
      addWordToDictionary(word);
      try {
        await pushAcceptedWordToGithub(word);
      } catch (error) {
        console.warn(
          "[Noitu GitHub] Failed to push accepted word:",
          error.message,
        );
      }
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor(13250094)
            .setThumbnail(wordData.guildIcon)
            .addFields(
              {
                name: "📌 Từ đề xuất",
                value: `**${wordData.word}**`,
                inline: true,
              },
              { name: "💡 Lý do", value: wordData.reason, inline: true },
              { name: "👤 Người gửi", value: wordData.user, inline: true },
              { name: "🛡️ Server", value: wordData.guildName, inline: true },
              { name: "🆔 ID Server", value: wordData.guildId, inline: true },
              { name: "📋 Trạng thái", value: "✅ Đã duyệt", inline: true },
            )
            .setTimestamp(),
        ],
        components: [],
      });
      const dmUser = await interaction.client.users
        .fetch(interaction.user.id)
        .catch(() => null);
      if (dmUser) {
        dmUser
          .send({
            embeds: [
              makeMessageEmbed(
                `✅ Từ \`${word}\` của bạn đã được duyệt vào từ điển.`,
              ),
            ],
          })
          .catch(() => {});
      }
    } else {
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor(13250094)
            .setThumbnail(wordData.guildIcon)
            .addFields(
              {
                name: "📌 Từ đề xuất",
                value: `**${wordData.word}**`,
                inline: true,
              },
              { name: "💡 Lý do", value: wordData.reason, inline: true },
              { name: "👤 Người gửi", value: wordData.user, inline: true },
              { name: "🛡️ Server", value: wordData.guildName, inline: true },
              { name: "🆔 ID Server", value: wordData.guildId, inline: true },
              { name: "📋 Trạng thái", value: "❌ Đã từ chối", inline: true },
            )
            .setTimestamp(),
        ],
        components: [],
      });
      const dmUser = await interaction.client.users
        .fetch(interaction.user.id)
        .catch(() => null);
      if (dmUser) {
        dmUser
          .send({
            embeds: [makeMessageEmbed(`❌ Từ \`${word}\` đã bị từ chối.`)],
          })
          .catch(() => {});
      }
    }
  });
}

module.exports = {
  name: "noitu",
  data: new SlashCommandBuilder()
    .setName("noitu")
    .setDescription("Nhóm lệnh nối từ của bot Coke")
    .addSubcommand((sub) =>
      sub.setName("help").setDescription("Xem hướng dẫn nối từ"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("set-channel")
        .setDescription("Cài đặt kênh chơi nối từ")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Kênh chơi nối từ")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("start").setDescription("Bắt đầu ván nối từ (Chỉ Admin)"),
    )
    .addSubcommand((sub) =>
      sub.setName("stop").setDescription("Làm mới ván nối từ hiện tại (Chỉ Admin)"),
    )
    .addSubcommand((sub) =>
      sub.setName("stats").setDescription("Xem thống kê của BOT"),
    )
    .addSubcommand((sub) =>
      sub.setName("rank").setDescription("Xem bảng xếp hạng nối từ"),
    )
    .addSubcommand((sub) =>
      sub.setName("me").setDescription("Xem thống kê nối từ của bạn"),
    )
    .addSubcommand((sub) =>
      sub.setName("server").setDescription("Xem thông tin máy chủ"),
    )
    .addSubcommand((sub) =>
      sub.setName("ping").setDescription("Kiểm tra ping của bot"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("report")
        .setDescription("Báo cáo từ ngữ không phù hợp trong từ điển")
        .addStringOption((option) =>
          option
            .setName("word")
            .setDescription("Từ muốn báo cáo")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("Lý do (không bắt buộc)"),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("approve")
        .setDescription("Yêu cầu duyệt từ mới vào từ điển")
        .addStringOption((option) =>
          option
            .setName("word")
            .setDescription("Từ muốn thêm")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("Lý do (tuỳ chọn)"),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("sync").setDescription("Đồng bộ thủ công từ điển từ GitHub (Admin)"),
    ),
  hidden: true,
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const guildOnlySubcommands = ["set-channel", "start", "stop", "stats", "rank", "me", "server", "report"];
    if (guildOnlySubcommands.includes(subcommand) && !interaction.guild) {
      return interaction.reply({
        content: "❌ Lệnh này chỉ có thể sử dụng trong máy chủ.",
        ephemeral: true,
      });
    }

    if (subcommand === "help") {
      return interaction.reply({ embeds: [makeNoituHelpEmbed()] });
    }

    if (subcommand === "set-channel") {
      const isServerAdmin =
        interaction.member?.permissions?.has(
          PermissionsBitField.Flags.Administrator,
        ) ||
        interaction.member?.permissions?.has(
          PermissionsBitField.Flags.ManageGuild,
        );
      if (!isServerAdmin) {
        return interaction.reply({
          content: "Bạn cần có quyền Admin để thực hiện thao tác này!",
          ephemeral: true,
        });
      }
      const channel = interaction.options.getChannel("channel");
      if (!channel || channel.type !== ChannelType.GuildText) {
        return interaction.reply({
          content: "Hãy chọn một kênh text hợp lệ.",
          ephemeral: true,
        });
      }
      const botMember =
        interaction.guild.members.me ||
        (await interaction.guild.members
          .fetch(interaction.client.user.id)
          .catch(() => null));
      const botPerms = botMember ? channel.permissionsFor(botMember) : null;
      if (
        !botPerms?.has(PermissionsBitField.Flags.ViewChannel) ||
        !botPerms?.has(PermissionsBitField.Flags.SendMessages) ||
        !botPerms?.has(PermissionsBitField.Flags.AddReactions)
      ) {
        return interaction.reply({
          content:
            "Tôi cần quyền xem, gửi tin nhắn và thả cảm xúc trong kênh đó.",
          ephemeral: true,
        });
      }
      await setGuildChannel(interaction.guild.id, channel.id);
      upsertEnvValue("APPROVE_CHANNEL", channel.id);
      process.env.APPROVE_CHANNEL = channel.id;
      return interaction.reply({
        content: `Bạn đã chọn kênh **${channel.name}** làm kênh chơi nối từ  của máy chủ **${interaction.guild.name}**!`,
        ephemeral: true,
      });
    }

    if (subcommand === "start") {
      const isServerAdmin =
        interaction.member?.permissions?.has(
          PermissionsBitField.Flags.Administrator,
        ) ||
        interaction.member?.permissions?.has(
          PermissionsBitField.Flags.ManageGuild,
        );
      if (!isServerAdmin) {
        return interaction.reply({
          content: "Chỉ Admin máy chủ mới có thể bắt đầu ván nối từ.",
          ephemeral: true,
        });
      }
      const guildConfig = await getGuildConfig(interaction.guild.id);
      if (!guildConfig?.channelId) {
        return interaction.reply({
          content: "Bạn cần cấu hình kênh trước bằng lệnh set-channel.",
          ephemeral: true,
        });
      }
      if (guildConfig.channelId !== interaction.channel.id) {
        return interaction.reply({
          content: "Lệnh này chỉ dùng trong kênh nối từ đã cấu hình.",
          ephemeral: true,
        });
      }
      const botMember =
        interaction.guild.members.me ||
        (await interaction.guild.members
          .fetch(interaction.client.user.id)
          .catch(() => null));
      const botPerms = botMember
        ? interaction.channel.permissionsFor(botMember)
        : null;
      if (!botPerms?.has(PermissionsBitField.Flags.SendMessages)) {
        return interaction.reply({
          content: "Tôi không có quyền gửi tin nhắn trong kênh này.",
          ephemeral: true,
        });
      }
      const currentGame = getGameState(client, interaction.guild.id);
      if (currentGame?.running) {
        const idleMs = Date.now() - (currentGame.lastUpdatedAt || 0);
        // If inactive for > 3 minutes, allow restarting immediately to unstick frozen games
        if (idleMs > 3 * 60 * 1000) {
          await stopNoituGame(client, interaction.guild.id);
          addRoundPlayedCount();
          await interaction.reply({
            content: `🔄 Ván chơi trước đã bị treo hoặc không hoạt động hơn 3 phút. Đang làm mới và bắt đầu ván mới...`,
            ephemeral: false,
          });
          await startNoituGame(
            client,
            interaction.guild.id,
            interaction.channel,
            interaction.user.id,
          );
          return;
        }
        return interaction.reply({
          content: `Trò chơi đang chạy với từ: **${currentGame.currentWord}**.\nNếu muốn dừng hoặc làm mới ván ngay, Admin hãy dùng lệnh \`/noitu stop\`.`,
          ephemeral: true,
        });
      }
      await interaction.reply({ content: "Start!", ephemeral: true });
      await startNoituGame(
        client,
        interaction.guild.id,
        interaction.channel,
        interaction.user.id,
      );
      return;
    }

    if (subcommand === "stop") {
      const isServerAdmin =
        interaction.member?.permissions?.has(
          PermissionsBitField.Flags.Administrator,
        ) ||
        interaction.member?.permissions?.has(
          PermissionsBitField.Flags.ManageGuild,
        );
      if (!isServerAdmin) {
        return interaction.reply({
          content: "Chỉ Admin máy chủ mới có thể dừng hoặc làm mới ván nối từ.",
          ephemeral: true,
        });
      }
      const guildConfig = await getGuildConfig(interaction.guild.id);
      if (
        !guildConfig?.channelId ||
        guildConfig.channelId !== interaction.channel.id
      ) {
        return interaction.reply({
          content: "Lệnh này chỉ dùng trong kênh nối từ đã cấu hình.",
          ephemeral: true,
        });
      }
      const currentGame = getGameState(client, interaction.guild.id);
      if (!currentGame?.running) {
        return interaction.reply({
          content: "Hiện tại không có ván nối từ nào đang diễn ra. Hãy dùng `/noitu start` trước.",
          ephemeral: true,
        });
      }
      await stopNoituGame(client, interaction.guild.id);
      addRoundPlayedCount();
      await interaction.reply({
        content: "🔄 Admin đã làm mới ván chơi nối từ!",
        ephemeral: false,
      });
      await startNoituGame(
        client,
        interaction.guild.id,
        interaction.channel,
        interaction.user.id,
      );
      return;
    }

    if (subcommand === "stats") {
      const users = await User.find({
        [`noituStats.${interaction.guild.id}`]: { $exists: true },
      }).lean();
      let playerCount = 0;
      let wins = 0;
      let correct = 0;
      let attempts = 0;
      for (const user of users) {
        const stats = user.noituStats?.[interaction.guild.id];
        if (!stats) continue;
        playerCount += 1;
        wins += stats.win || 0;
        correct += stats.true || 0;
        attempts += stats.total || 0;
      }
      const configuredGuilds = await NoituGuild.countDocuments({
        channelId: { $ne: null },
      });
      return interaction.reply({
        embeds: [
          new EmbedBuilder().setColor(13250094).addFields(
            {
              name: "Tổng số server đang sử dụng",
              value: `${interaction.client.guilds.cache.size} servers`,
              inline: true,
            },
            {
              name: "Tổng số người đã chơi",
              value: `${playerCount}`,
              inline: true,
            },
            {
              name: "Tổng số từ đã nối",
              value: `${getWordPlayedCount()}`,
              inline: true,
            },
            {
              name: "Tổng số vòng đã diễn ra",
              value: `${getRoundPlayedCount()}`,
              inline: true,
            },
            {
              name: "Tổng số truy vấn dữ liệu",
              value: `${getQuery()}`,
              inline: true,
            },
            {
              name: "Tổng số từ trong ngân hàng từ",
              value: `${countWordInDictionary()}`,
              inline: true,
            },
          ),
        ],
      });
    }

    if (subcommand === "rank") {
      const users = await User.find({
        [`noituStats.${interaction.guild.id}`]: { $exists: true },
      }).lean();
      const ranked = users
        .map((user) => user.noituStats?.[interaction.guild.id] || {})
        .filter(
          (stats) =>
            (stats.win || 0) > 0 ||
            (stats.true || 0) > 0 ||
            (stats.total || 0) > 0,
        )
        .map((stats) => {
          const attempts = stats.total || 0;
          const correct = stats.true || 0;
          const accuracy = attempts > 0 ? correct / attempts : 0;
          return {
            ...stats,
            attempts,
            correct,
            wins: stats.win || 0,
            accuracy,
          };
        })
        .sort(
          (a, b) =>
            b.wins - a.wins || b.accuracy - a.accuracy || b.correct - a.correct,
        )
        .slice(0, 10);
      if (!ranked.length) {
        return interaction.reply({
          content: "Chưa có ai chơi nối từ ở server này.",
          ephemeral: true,
        });
      }
      const desc = ranked
        .map(
          (stats, index) =>
            `**#${index + 1}** ${stats.name || "Ẩn danh"} - thắng: **${stats.wins}**, đúng: **${stats.correct}/${stats.attempts}** (${(stats.accuracy * 100).toFixed(2)}%)`,
        )
        .join("\n");
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(13250094)
            .setTitle(`BXH nối từ của ${interaction.member.guild.name}`)
            .setDescription(desc),
        ],
      });
    }

    if (subcommand === "me") {
      const user = await User.findOne({ userId: interaction.user.id }).lean();
      const stats = getNoituStatsSnapshot(user, interaction.guild.id);
      const attempts = stats.total || 0;
      const correct = stats.true || 0;
      const wins = stats.win || 0;
      const accuracy =
        attempts > 0 ? ((correct / attempts) * 100).toFixed(2) : "0.00";
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle(`Thành tích nối từ - ${interaction.member.displayName}`)
            .setDescription("Hồ sơ nối từ")
            .addFields(
              { name: "Thành tích thắng", value: `\`${wins}\``, inline: true },
              { name: "Trả lời đúng", value: `\`${correct}\``, inline: true },
              { name: "Tổng lượt thử", value: `\`${attempts}\``, inline: true },
              { name: "Tỉ lệ đúng", value: `\`${accuracy}%\``, inline: true },
            ),
        ],
      });
    }

    if (subcommand === "server") {
      const guildConfig = await getGuildConfig(interaction.guild.id);
      const channel = guildConfig?.channelId
        ? interaction.guild.channels.cache.get(guildConfig.channelId)
        : null;
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(13250094)
            .setAuthor({
              name: interaction.guild.name,
              iconURL: interaction.guild.iconURL({ dynamic: true }),
            })
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .addFields(
              {
                name: ":id: ID Server",
                value: interaction.guildId,
                inline: true,
              },
              {
                name: ":calendar: Thành lập",
                value: `<t:${Math.floor(Date.parse(interaction.guild.createdAt) / 1000)}:R>`,
                inline: true,
              },
              {
                name: ":crown: Owner",
                value: `<@${interaction.guild.ownerId}>`,
                inline: true,
              },
              {
                name: ":robot: Ngày thêm Bot",
                value: `<t:${Math.floor(Date.parse(interaction.guild.joinedAt) / 1000)}:R>`,
                inline: true,
              },
              {
                name: "Kênh nối từ",
                value: channel ? `<#${channel.id}>` : "Chưa cấu hình",
                inline: true,
              },
            ),
        ],
      });
    }

    if (subcommand === "ping") {
      const sent = await interaction.reply({
        content: "Đang kiểm tra ping...",
        fetchReply: true,
        ephemeral: true,
      });
      const totalPing = sent.createdTimestamp - interaction.createdTimestamp;
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`Ping của ${interaction.client.user.username}`)
            .addFields(
              { name: "Ping", value: `${totalPing}ms`, inline: true },
              {
                name: "Websocket",
                value: `${interaction.client.ws.ping} ms`,
                inline: true,
              },
            ),
        ],
        ephemeral: true,
      });
    }

    if (subcommand === "report") {
      return handleReport(interaction);
    }

    if (subcommand === "approve") {
      return handleApprove(interaction);
    }

    if (subcommand === "sync") {
      const isOwner = interaction.user.id === process.env.OWNER_ID;
      const isGuildAdmin = interaction.member && interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild);

      if (!isOwner && !isGuildAdmin) {
        return interaction.reply({
          content: "Bạn cần có quyền Admin của máy chủ hoặc là Owner của bot để thực hiện thao tác này!",
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });
      try {
        await syncNoituData();
        return interaction.editReply({
          content: `✅ Đồng bộ từ điển thành công! Hiện tại có **${countWordInDictionary()}** từ trong từ điển.`,
        });
      } catch (error) {
        console.error("[Noitu Sync Command] Error:", error);
        return interaction.editReply({
          content: `❌ Đồng bộ thất bại: ${error.message}`,
        });
      }
    }
  },
};
