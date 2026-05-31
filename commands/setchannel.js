const {
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const { setGuildChannel } = require("../utils/noituGame");

const envPath = path.join(__dirname, "../.env");

function upsertEnvValue(key, value) {
  const nextLine = `${key}=${value}`;

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, `${nextLine}\n`);
    return;
  }

  const existing = fs.readFileSync(envPath, "utf8");
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(existing)) {
    const updated = existing.replace(pattern, nextLine);
    fs.writeFileSync(envPath, updated);
    return;
  }

  const suffix = existing.endsWith("\n") ? "" : "\n";
  fs.writeFileSync(envPath, `${existing}${suffix}${nextLine}\n`);
}

module.exports = {
  name: "setchannel",
  hidden: true,
  data: new SlashCommandBuilder()
    .setName("setchannel")
    .setDescription("Cài đặt kênh chơi nối từ hoặc kênh approve")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("game")
        .setDescription("Cài đặt kênh chơi nối từ")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Kênh chơi nối từ")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("approve")
        .setDescription("Cài đặt kênh approve")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Kênh approve")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    ),
  async execute(interaction) {
    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return interaction.reply({
        content: "Bạn cần có quyền Admin để thực hiện thao tác này!",
        ephemeral: true,
      });
    }

    const subcommand = interaction.options.getSubcommand();
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
    if (!botPerms?.has(PermissionsBitField.Flags.ViewChannel)) {
      return interaction.reply({
        content: "Tôi không có quyền xem kênh này!",
        ephemeral: true,
      });
    }

    if (!botPerms?.has(PermissionsBitField.Flags.SendMessages)) {
      return interaction.reply({
        content: "Tôi không có quyền gửi tin nhắn ở kênh này!",
        ephemeral: true,
      });
    }

    if (
      subcommand === "game" &&
      !botPerms?.has(PermissionsBitField.Flags.AddReactions)
    ) {
      return interaction.reply({
        content: "Tôi không có quyền thả cảm xúc vào tin nhắn ở kênh này!",
        ephemeral: true,
      });
    }

    if (subcommand === "approve") {
      upsertEnvValue("APPROVE_CHANNEL", channel.id);
      process.env.APPROVE_CHANNEL = channel.id;

      return interaction.reply({
        content: `Bạn đã chọn kênh **${channel.name}** làm kênh approve của máy chủ **${interaction.guild.name}**!`,
        ephemeral: true,
      });
    }

    await setGuildChannel(interaction.guildId, channel.id);
    upsertEnvValue("APPROVE_CHANNEL", channel.id);
    process.env.APPROVE_CHANNEL = channel.id;

    return interaction.reply({
      content: `Bạn đã chọn kênh **${channel.name}** làm kênh chơi nối từ và kênh approve của máy chủ **${interaction.guild.name}**!`,
      ephemeral: true,
    });
  },
};
