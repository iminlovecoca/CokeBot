const { EmbedBuilder } = require("discord.js");
const { getGuildConfig } = require("../../utils/noituGame");
const config = require("../../data/config");

module.exports = {
  name: "server",
  description: "Xem thông tin server và kênh nối từ",
  usage: `${config.prefix} noitu server`,
  async execute(message) {
    const guildConfig = await getGuildConfig(message.guild.id);
    const channel = guildConfig?.channelId
      ? message.guild.channels.cache.get(guildConfig.channelId)
      : null;

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setAuthor({
        name: message.guild.name,
        iconURL: message.guild.iconURL({ dynamic: true }),
      })
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .addFields(
        { name: "ID server", value: `\`${message.guild.id}\``, inline: true },
        {
          name: "Chủ server",
          value: `<@${message.guild.ownerId}>`,
          inline: true,
        },
        {
          name: "Kênh nối từ",
          value: channel ? `<#${channel.id}>` : "`Chưa cấu hình`",
          inline: true,
        },
        {
          name: "Thành viên",
          value: `\`${message.guild.memberCount.toLocaleString()}\``,
          inline: true,
        },
        {
          name: "Lệnh Coke",
          value: `Dùng \`${config.prefix}help\` để xem bot chính.`,
          inline: false,
        },
      );

    return message.reply({ embeds: [embed] });
  },
};
