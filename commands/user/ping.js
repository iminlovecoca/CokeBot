const { EmbedBuilder } = require('discord.js');
const os = require('os');
const mongoose = require('mongoose');
const User = require('../../models/User');

module.exports = {
  name: 'ping',
  description: 'Kiểm tra độ trễ và tình trạng kết nối của bot',
  async execute(message) {
    const sent = await message.channel.send('🏓 Đang đo ping...');

    const latency = sent.createdTimestamp - message.createdTimestamp;
    const apiLatency = Math.round(message.client.ws.ping);

    const mongoStatus = mongoose.connection.readyState;
    const mongoStates = ['❌ Mất kết nối', '✅ Đã kết nối', '🟠 Đang kết nối', '🔄 Ngắt kết nối'];
    const mongoStateText = mongoStates[mongoStatus] || '❓ Không rõ';

    let dbPing = 'Không đo được';
    try {
      const start = Date.now();
      await User.findOne().lean();
      dbPing = `${Date.now() - start}ms`;
    } catch (err) {
      dbPing = '❌ Lỗi';
    }

    const usedMem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const totalMem = (os.totalmem() / 1024 / 1024).toFixed(1);

    const uptime = formatUptime(process.uptime());

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('📡 Tình trạng kết nối')
      .addFields(
        { name: 'Discord API', value: `\`${apiLatency}ms\``, inline: true },
        { name: 'Bot Delay', value: `\`${latency}ms\``, inline: true },
        { name: 'MongoDB', value: `\`${mongoStateText}\``, inline: true },
        { name: 'MongoDB Ping', value: `\`${dbPing}\``, inline: true },
        { name: 'RAM', value: `\`${usedMem} / ${totalMem} MB\``, inline: true },
        { name: 'Uptime', value: `\`${uptime}\``, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Yêu cầu bởi ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

    await sent.edit({ content: null, embeds: [embed] });
  }
};

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}
