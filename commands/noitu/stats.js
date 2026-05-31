const { EmbedBuilder } = require("discord.js");
const User = require("../../models/User");
const NoituGuild = require("../../models/NoituGuild");
const config = require("../../data/config");
const {
  getQuery,
  getWordPlayedCount,
  getRoundPlayedCount,
  countWordInDictionary,
} = require("../../utils/noituGame");

module.exports = {
  name: "stats",
  description: "Xem thống kê của module nối từ",
  usage: `${config.prefix} noitu stats`,
  async execute(message, args, client) {
    const users = await User.find({
      [`noituStats.${message.guild.id}`]: { $exists: true },
    }).lean();
    let playerCount = 0;
    let wins = 0;
    let correct = 0;
    let attempts = 0;

    for (const user of users) {
      const stats = user.noituStats?.[message.guild.id];
      if (!stats) continue;
      playerCount += 1;
      wins += stats.win || 0;
      correct += stats.true || 0;
      attempts += stats.total || 0;
    }

    const configuredGuilds = await NoituGuild.countDocuments({
      channelId: { $ne: null },
    });

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("Thống kê nối từ")
      .addFields(
        {
          name: "Máy chủ đã cấu hình",
          value: `\`${configuredGuilds}\``,
          inline: true,
        },
        {
          name: "Người đã chơi",
          value: `\`${playerCount}\``,
          inline: true,
        },
        {
          name: "Lượt trả lời đúng",
          value: `\`${correct}\``,
          inline: true,
        },
        {
          name: "Lượt thử",
          value: `\`${attempts}\``,
          inline: true,
        },
        {
          name: "Số ván thắng",
          value: `\`${wins}\``,
          inline: true,
        },
        {
          name: "Coke thưởng",
          value: `\`${(wins * 50000).toLocaleString()}\``,
          inline: true,
        },
        {
          name: "Tổng từ đã nối",
          value: `\`${getWordPlayedCount()}\``,
          inline: true,
        },
        {
          name: "Tổng vòng đã diễn ra",
          value: `\`${getRoundPlayedCount()}\``,
          inline: true,
        },
        {
          name: "Tổng truy vấn dữ liệu",
          value: `\`${getQuery()}\``,
          inline: true,
        },
        {
          name: "Tổng từ trong ngân hàng từ",
          value: `\`${countWordInDictionary()}\``,
          inline: true,
        },
      );

    return message.reply({ embeds: [embed] });
  },
};
