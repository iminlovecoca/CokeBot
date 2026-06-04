const { UserFriendlyError } = require("../../utils/errors");
const { isDev, isAdmin } = require("../../utils/userUtil");
const config = require("../../data/config");
const { spawnBossNow } = require("../../features/rpgBossSpawner");

module.exports = {
  name: "spawnboss",
  aliases: ["rboss", "forceboss"],
  description: "Gọi boss RPG xuất hiện ngay lập tức để test.",
  usage: `${config.prefix}spawnboss [#channel|channelId]`,

  async execute(message, args) {
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Ban khong co quyen dung lenh nay.`,
      );
    }

    const channelArg = args[0];
    const targetChannel =
      message.mentions.channels.first() ||
      (channelArg
        ? await message.client.channels
            .fetch(channelArg.replace(/[<#>]/g, ""))
            .catch(() => null)
        : message.channel);

    if (!targetChannel || !targetChannel.isTextBased()) {
      throw new UserFriendlyError(
        `${config.emoji.no} Khong tim thay channel hop le.`,
      );
    }

    const activeBoss = await spawnBossNow(message.client, targetChannel.id);
    if (!activeBoss) {
      return message.reply(
        `${config.emoji.warning} Khong the spawn boss o channel nay, co the da co boss hoac channel khong hop le.`,
      );
    }

    return message.reply(
      `🏴‍☠️Boss **${activeBoss.boss.name}** da duoc goi ngay tai <#${targetChannel.id}>.`,
    );
  },
};
