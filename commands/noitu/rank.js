const { EmbedBuilder } = require("discord.js");
const User = require("../../models/User");
const config = require("../../data/config");

module.exports = {
  name: "rank",
  aliases: ["top"],
  description: "Xem bảng xếp hạng nối từ trong server",
  usage: `${config.prefix} noitu rank`,
  async execute(message) {
    const members = message.guild.members.cache;
    const users = await User.find({
      [`noituStats.${message.guild.id}`]: { $exists: true },
    }).lean();

    const ranked = users
      .map((user) => user.noituStats?.[message.guild.id] || {})
      .filter(
        (stats) =>
          (stats.win || 0) > 0 ||
          (stats.true || 0) > 0 ||
          (stats.total || 0) > 0,
      )
      .map((user) => {
        const attempts = user.total || 0;
        const correct = user.true || 0;
        const accuracy = attempts > 0 ? correct / attempts : 0;
        return {
          ...user,
          attempts,
          correct,
          wins: user.win || 0,
          accuracy,
        };
      })
      .sort(
        (a, b) =>
          b.wins - a.wins || b.accuracy - a.accuracy || b.correct - a.correct,
      )
      .slice(0, 10);

    if (ranked.length === 0) {
      return message.reply("Chưa có ai chơi nối từ ở server này.");
    }

    const lines = ranked.map((user, index) => {
      const member =
        [...members.values()].find((m) => m.displayName === user.name) || null;
      const name = user.name || member?.displayName || "Ẩn danh";
      const percent = (user.accuracy * 100).toFixed(2);
      return `**#${index + 1}** ${name} - thắng: **${user.wins}**, đúng: **${user.correct}/${user.attempts}** (${percent}%)`;
    });

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(`BXH nối từ của ${message.guild.name}`)
      .setDescription(lines.join("\n"));

    return message.reply({ embeds: [embed] });
  },
};
