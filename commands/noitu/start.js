const { PermissionsBitField } = require("discord.js");
const {
  getGuildConfig,
  getGameState,
  startNoituGame,
} = require("../../utils/noituGame");
const config = require("../../data/config");

module.exports = {
  name: "start",
  aliases: ["begin"],
  description: "Bắt đầu ván nối từ trong kênh đã cấu hình",
  usage: `${config.prefix} noitu start`,
  async execute(message, args, client) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return message.reply("Bạn cần quyền Admin để bắt đầu ván nối từ.");
    }

    const guildConfig = await getGuildConfig(message.guild.id);
    if (!guildConfig?.channelId) {
      return message.reply(
        "Bạn cần cấu hình kênh trước bằng lệnh set-channel.",
      );
    }

    if (guildConfig.channelId !== message.channel.id) {
      return message.reply("Lệnh này chỉ dùng trong kênh nối từ đã cấu hình.");
    }

    const botMember =
      message.guild.members.me ||
      (await message.guild.members
        .fetch(message.client.user.id)
        .catch(() => null));
    const botPerms = botMember
      ? message.channel.permissionsFor(botMember)
      : null;
    if (!botPerms?.has(PermissionsBitField.Flags.SendMessages)) {
      return message.reply("Tôi không có quyền gửi tin nhắn trong kênh này.");
    }

    const currentGame = getGameState(client, message.guild.id);
    if (currentGame?.running) {
      return message.reply(
        "Trò chơi đang chạy rồi. Dùng `stop` để làm mới ván hiện tại.",
      );
    }

    await startNoituGame(
      client,
      message.guild.id,
      message.channel,
      message.author.id,
    );
  },
};
