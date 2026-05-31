const {
  PermissionsBitField,
  stopNoituGame,
  startNoituGame,
  getGameState,
  getGuildConfig,
  addRoundPlayedCount,
} = require("../../utils/noituGame");
const config = require("../../data/config");

module.exports = {
  name: "stop",
  aliases: ["reset", "restart"],
  description: "Làm mới ván nối từ hiện tại và tự bắt đầu ván mới",
  usage: `${config.prefix} noitu stop`,
  async execute(message, args, client) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)
    ) {
      return message.reply("Bạn không có quyền dùng lệnh này.");
    }

    const guildConfig = await getGuildConfig(message.guild.id);
    if (
      !guildConfig?.channelId ||
      guildConfig.channelId !== message.channel.id
    ) {
      return message.reply("Lệnh này chỉ dùng trong kênh nối từ đã cấu hình.");
    }

    const currentGame = getGameState(client, message.guild.id);
    if (!currentGame?.running) {
      return message.reply("Ván chơi chưa bắt đầu. Hãy dùng `start` trước.");
    }

    await stopNoituGame(client, message.guild.id);
    addRoundPlayedCount();
    await message.channel.send("Ván mới đã bắt đầu.");
    await startNoituGame(
      client,
      message.guild.id,
      message.channel,
      message.author.id,
    );
  },
};
