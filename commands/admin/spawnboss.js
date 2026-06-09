const { UserFriendlyError } = require("../../utils/errors");
const { isDev, isAdmin } = require("../../utils/userUtil");
const config = require("../../data/config");
const { spawnBossNow } = require("../../features/rpgBossSpawner");

module.exports = {
  name: "spawnboss",
  aliases: ["rboss", "forceboss"],
  description: "Gọi boss RPG xuất hiện ngay lập tức để test.",
  usage: `${config.prefix}spawnboss [boss_key] [#channel|channelId]`,

  async execute(message, args) {
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không có quyền dùng lệnh này.`,
      );
    }

    let targetChannel = message.channel;
    let bossKey = null;

    const bossTiers = config.rpg.boss?.tiers || [];

    for (const arg of args) {
      const cleanArg = arg.trim();

      // Check if this arg is a channel mention or numeric ID
      if (cleanArg.startsWith("<#") && cleanArg.endsWith(">")) {
        const channelId = cleanArg.replace(/[<#>]/g, "");
        const chan = await message.client.channels.fetch(channelId).catch(() => null);
        if (chan && chan.isTextBased()) {
          targetChannel = chan;
          continue;
        }
      }
      if (/^\d+$/.test(cleanArg)) {
        const chan = await message.client.channels.fetch(cleanArg).catch(() => null);
        if (chan && chan.isTextBased()) {
          targetChannel = chan;
          continue;
        }
      }

      // Check if this arg is a valid boss key
      const foundBoss = bossTiers.find(
        (t) => t.key.toLowerCase() === cleanArg.toLowerCase()
      );
      if (foundBoss) {
        bossKey = foundBoss.key;
      }
    }

    if (!targetChannel || !targetChannel.isTextBased()) {
      throw new UserFriendlyError(
        `${config.emoji.no} Không tìm thấy channel hợp lệ.`,
      );
    }

    const activeBoss = await spawnBossNow(message.client, targetChannel.id, bossKey);
    if (!activeBoss) {
      return message.reply(
        `${config.emoji.warning} Không thể spawn boss ở channel này, có thể đã có boss hoặc channel không hợp lệ.`,
      );
    }

    return message.reply(
      `🏴‍☠️ Boss **${activeBoss.boss.name}** (${activeBoss.boss.key}) đã được gọi ngay tại <#${targetChannel.id}>.`,
    );
  },
};
