const { UserFriendlyError } = require("../../utils/errors");
const { isDev, isAdmin } = require("../../utils/userUtil");
const config = require("../../data/config");
const { finishBoss } = require("../rpg/boss");

module.exports = {
  name: "rewardboss",
  aliases: ["xbossreward", "wbep", "bossreward"],
  description: "Phát thưởng thủ công cho World Boss dựa trên tin nhắn hiển thị.",
  usage: `${config.prefix}rewardboss [messageId]`,

  async execute(message, args) {
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không có quyền dùng lệnh này.`
      );
    }

    let targetMsgId = args[0] || null;
    let bossMsg = null;

    if (targetMsgId) {
      bossMsg = await message.channel.messages.fetch(targetMsgId).catch(() => null);
    } else {
      // Find the last boss message in the current channel
      const messages = await message.channel.messages.fetch({ limit: 50 });
      bossMsg = messages.find(
        (m) =>
          m.author.id === message.client.user.id &&
          m.embeds &&
          m.embeds.length > 0 &&
          (m.embeds[0].title || "").includes("xuất hiện")
      );
    }

    if (!bossMsg) {
      throw new UserFriendlyError(
        `${config.emoji.no} Không tìm thấy tin nhắn World Boss nào hợp lệ trong channel này.`
      );
    }

    const embed = bossMsg.embeds[0];
    const title = embed.title || "";

    // 1. Find corresponding boss key from config
    const tiers = config.rpg.boss?.tiers || [];
    const bossConfig = tiers.find(t => title.includes(t.name)) || tiers.find(t => title.toLowerCase().includes(t.name.toLowerCase()));
    if (!bossConfig) {
      throw new UserFriendlyError(
        `${config.emoji.no} Không xác định được loại boss từ tin nhắn: "${title}".`
      );
    }

    // 2. Parse top damage participants from embed
    const topField = embed.fields.find(f => f.name && f.name.includes("Top 10 Sát Thương"));
    if (!topField) {
      throw new UserFriendlyError(
        `${config.emoji.no} Tin nhắn boss không chứa thông tin Top 10 Sát Thương.`
      );
    }

    const lines = topField.value.split("\n");
    const participants = new Map();
    for (const line of lines) {
      const match = line.match(/(?:🥇|🥈|🥉|#\d+)\s+([\d,.]+)\s*\|\s*<@!?(\d+)>/);
      if (match) {
        const damage = parseInt(match[1].replace(/[,.]/g, ""), 10);
        const userId = match[2];
        participants.set(userId, { damage, attacks: 3, hp: 1000, koUntil: 0 });
      }
    }

    if (participants.size === 0) {
      throw new UserFriendlyError(
        `${config.emoji.no} Không tìm thấy người chơi nào tham gia trong tin nhắn boss.`
      );
    }

    // 3. Parse Last Hit User ID
    const lastHitField = embed.fields.find(f => f.name === "Last Hit");
    let lastHitUserId = null;
    if (lastHitField) {
      const match = lastHitField.value.match(/<@!?(\d+)>/);
      if (match) {
        lastHitUserId = match[1];
      }
    }

    if (!lastHitUserId) {
      // Fallback: use top damage dealer as last hit
      const topDealer = Array.from(participants.keys())[0];
      lastHitUserId = topDealer;
    }

    // 4. Create reconstruction of activeBoss object
    const activeBoss = {
      id: `${Date.now()}-${bossConfig.key}`,
      channelId: message.channel.id,
      boss: bossConfig,
      hp: 0,
      maxHp: bossConfig.hp,
      participants,
      lastHitUserId,
      defeated: false,
      expired: false,
      spawnedAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
      messageId: bossMsg.id,
      messageIds: [bossMsg.id],
      imageUrl: embed.image?.url || null,
      rewarded: false,
    };

    // Remove if exists in current active list to prevent conflict, then finish it
    message.client.rpgBosses?.delete(message.channel.id);

    await message.channel.send(`⚙️ **Đang tiến hành phát thưởng thủ công cho Boss: ${bossConfig.name}**...`);
    
    try {
      await finishBoss({
        client: message.client,
        channel: message.channel,
        activeBoss,
      });
      return message.reply(`✅ **Đã phát thưởng thành công cho ${participants.size} thành viên tham gia boss ${bossConfig.name}!**`);
    } catch (err) {
      console.error("[REWARD_BOSS] Failed:", err);
      return message.reply(`❌ **Thất bại khi phát thưởng:** ${err.message}`);
    }
  },
};
