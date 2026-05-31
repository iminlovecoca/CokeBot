const { EmbedBuilder } = require("discord.js");
const mongoose = require("mongoose");
const os = require("os");
const config = require("../../data/config");

function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}

module.exports = {
  name: "ping",
  description: "Kiểm tra độ trễ của module nối từ",
  usage: `${config.prefix} noitu ping`,
  async execute(message) {
    const sent = await message.channel.send("Đang đo ping...");
    const latency = sent.createdTimestamp - message.createdTimestamp;
    const apiLatency = Math.round(message.client.ws.ping);
    const mongoStatus = mongoose.connection.readyState;
    const mongoStates = [
      "Mất kết nối",
      "Đã kết nối",
      "Đang kết nối",
      "Ngắt kết nối",
    ];
    const mongoStateText = mongoStates[mongoStatus] || "Không rõ";

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("Ping Noitu")
      .addFields(
        { name: "Discord API", value: `\`${apiLatency}ms\``, inline: true },
        { name: "Bot Delay", value: `\`${latency}ms\``, inline: true },
        { name: "MongoDB", value: `\`${mongoStateText}\``, inline: true },
        {
          name: "RAM",
          value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB\``,
          inline: true,
        },
        {
          name: "Uptime",
          value: `\`${formatUptime(process.uptime())}\``,
          inline: true,
        },
        { name: "Host", value: `\`${os.hostname()}\``, inline: true },
      );

    await sent.edit({ content: null, embeds: [embed] });
  },
};
