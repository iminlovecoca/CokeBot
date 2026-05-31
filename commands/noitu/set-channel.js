const {
  PermissionsBitField,
  EmbedBuilder,
  ChannelType,
} = require("discord.js");
const { setGuildChannel } = require("../../utils/noituGame");
const config = require("../../data/config");

module.exports = {
  name: "set-channel",
  aliases: ["set", "channel"],
  description: "Cài đặt kênh chơi nối từ cho máy chủ",
  usage: `${config.prefix} noitu set-channel #kenh`,
  async execute(message, args) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return message.reply("Bạn cần quyền **Manage Server** để dùng lệnh này.");
    }

    const channel =
      message.mentions.channels.first() ||
      message.guild.channels.cache.get(args[0]);
    if (!channel || channel.type !== ChannelType.GuildText) {
      return message.reply("Hãy chọn một kênh text hợp lệ.");
    }

    const botMember =
      message.guild.members.me ||
      (await message.guild.members
        .fetch(message.client.user.id)
        .catch(() => null));
    const botPerms = botMember ? channel.permissionsFor(botMember) : null;
    if (
      !botPerms?.has(PermissionsBitField.Flags.ViewChannel) ||
      !botPerms?.has(PermissionsBitField.Flags.SendMessages)
    ) {
      return message.reply("Tôi cần quyền xem và gửi tin nhắn trong kênh đó.");
    }

    await setGuildChannel(message.guild.id, channel.id);

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("Đã đồng bộ kênh nối từ")
      .setDescription(
        `Kênh **${channel.name}** đã được gắn cho máy chủ **${message.guild.name}**.`,
      );

    return message.reply({ embeds: [embed] });
  },
};
