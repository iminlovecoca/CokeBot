const { UserFriendlyError } = require("../../utils/errors");
const { isDev, isAdmin } = require("../../utils/userUtil");
const config = require("../../data/config");
const { spawnRandomBoss } = require("../../features/rpgBossSpawner");

const BaseCommand = require('../../core/BaseCommand');

class SpawnmalzCommand extends BaseCommand {
  constructor() {
    super({
  name: "spawnmalz",
  aliases: ["forcemalz", "smalz"],
  description: "Triệu hồi boss Malzareth có cờ Cõi Linh Hồn hoạt động (chỉ Admin/Dev).",
  usage: `${config.prefix}spawnmalz [#channel|channelId]`,

        cooldown: 0
    });
  }

  async execute(message, args) {
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không có quyền dùng lệnh này.`,
      );
    }

    let targetChannel = message.channel;

    const targetArg = args[0];
    if (targetArg) {
      const cleanArg = targetArg.trim();
      if (cleanArg.startsWith("<#") && cleanArg.endsWith(">")) {
        const channelId = cleanArg.replace(/[<#>]/g, "");
        const chan = await message.client.channels.fetch(channelId).catch(() => null);
        if (chan && chan.isTextBased()) {
          targetChannel = chan;
        }
      } else if (/^\d+$/.test(cleanArg)) {
        const chan = await message.client.channels.fetch(cleanArg).catch(() => null);
        if (chan && chan.isTextBased()) {
          targetChannel = chan;
        }
      }
    }

    if (!targetChannel || !targetChannel.isTextBased()) {
      throw new UserFriendlyError(
        `${config.emoji.no} Không tìm thấy channel hợp lệ.`,
      );
    }

    
    const activeBoss = await spawnRandomBoss(message.client, {
      channelId: targetChannel.id,
      bossKey: "boss_XI",
      allowSoulRealm: true,
      scheduleNext: false
    });

    if (!activeBoss) {
      return message.reply(
        `${config.emoji.warning} Không thể triệu hồi Malzareth ở channel này (có thể đang có boss khác hoạt động).`,
      );
    }

    return message.reply(
      `👻 Boss **${activeBoss.boss.name}** đã được triệu hồi tại <#${targetChannel.id}> với tính năng **Cõi Linh Hồn** được bật!`,
    );
    }
}

module.exports = new SpawnmalzCommand();
