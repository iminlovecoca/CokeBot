const BaseCommand = require('../../core/BaseCommand');
const config = require('../../data/config');
const { EmbedBuilder } = require('discord.js');
const os = require('os');
const mongoose = require('mongoose');

class PingCommand extends BaseCommand {
  constructor() {
    super({
      name: 'ping',
      description: 'Kiểm tra độ trễ và tình trạng kết nối của bot',
      usage: `${config.prefix}ping`,
      examples: [
        { intent: 'Kiểm tra độ trễ của bot', command: `${config.prefix}ping` }
      ],
      category: 'user'
    });
  }

  async execute(message) {
    const commandStartedAt = process.hrtime.bigint();
    const sent = await message.channel.send('🏓 Đang đo ping...');

    const discordResponseLatency = Math.round(Number(process.hrtime.bigint() - commandStartedAt) / 1e6);
    const totalMessageLatency = Math.max(0, sent.createdTimestamp - message.createdTimestamp);
    const preprocessingLatency = message.__cokeBotReceivedAt
      ? Math.max(0, Math.round(Number(commandStartedAt - message.__cokeBotReceivedAt) / 1e6))
      : null;
    const gatewayLatency = Math.round(message.client.ws.ping);

    const mongoStatus = mongoose.connection.readyState;
    const mongoStates = ['❌ Mất kết nối', '✅ Đã kết nối', '🟠 Đang kết nối', '🔄 Ngắt kết nối'];
    const mongoStateText = mongoStates[mongoStatus] || '❓ Không rõ';

    let dbPing = 'Không đo được';
    try {
      const start = Date.now();
      await mongoose.connection.db.command({ ping: 1 });
      dbPing = `${Date.now() - start}ms`;
    } catch (err) {
      dbPing = '❌ Lỗi';
    }

    const usedMem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const totalMem = (os.totalmem() / 1024 / 1024).toFixed(1);

    const uptime = this.formatUptime(process.uptime());

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('📡 Tình trạng kết nối')
      .addFields(
        { name: 'Discord', value: `WebSocket: \`${gatewayLatency}ms\`\nPhản hồi: \`${discordResponseLatency}ms\``, inline: true },
        { name: 'Bot', value: `Tiền xử lý: \`${preprocessingLatency === null ? 'Không đo được' : `${preprocessingLatency}ms`}\`\nTổng từ tin nhắn: \`${totalMessageLatency}ms\``, inline: true },
        { name: 'MongoDB', value: `${mongoStateText}\nPing: \`${dbPing}\``, inline: true },
        { name: 'RAM', value: `\`${usedMem} / ${totalMem} MB\``, inline: true },
        { name: 'Thời gian chạy', value: `\`${uptime}\``, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Yêu cầu bởi ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

    await sent.edit({ content: null, embeds: [embed] }).catch(() => null);
  }

  formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  }
}

module.exports = new PingCommand();
