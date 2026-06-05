const path = require("path");
const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { DateTime } = require("luxon");
const config = require("../data/config");

const healthBar = (hp, maxHp) => {
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  const filled = Math.ceil(ratio * 10);
  return "▰".repeat(filled) + "▱".repeat(10 - filled);
};

const pick = (items) => items[Math.floor(Math.random() * items.length)];

const getBossAssetPath = (boss) =>
  path.join(__dirname, "../assets/bosses", boss.asset || "boss_01.webp");

const buildBossEmbed = (activeBoss, status = "alive") => {
  const boss = activeBoss.boss;
  const defeated = status === "defeated";
  const expired = status === "expired";
  const title = defeated
    ? `${boss.emoji} ${boss.name} đã bị hạ`
    : expired
      ? `${boss.emoji} ${boss.name} đã rời đi`
      : `${boss.emoji} ${boss.name} xuất hiện`;

  const description = defeated
    ? `Boss đã bị kết liễu bởi <@${activeBoss.lastHitUserId}>.`
    : expired
      ? "Không ai hạ được boss trong thời gian tồn tại."
      : `Gõ \`${config.prefix}boss\` để tấn công boss trong channel này.`;

  // Get top 10 participants sorted by damage descending
  const top10 = Array.from(activeBoss.participants.entries())
    .sort((a, b) => b[1].damage - a[1].damage)
    .slice(0, 10);

  let topDamageField = "*Chưa có người chơi nào gây sát thương.*";
  if (top10.length > 0) {
    topDamageField = top10
      .map(([userId, p], index) => {
        const rank = index + 1;
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `\`#${rank}\``;
        return `${medal} **${p.damage.toLocaleString()}** | <@${userId}>`;
      })
      .join("\n");
  }

  const embed = new EmbedBuilder()
    .setColor(defeated ? "#57F287" : expired ? "#747F8D" : "#ED4245")
    .setTitle(title)
    .setDescription(description)
    .addFields(
      {
        name: "HP",
        value:
          `${healthBar(activeBoss.hp, activeBoss.maxHp)}\n` +
          `**${Math.max(0, activeBoss.hp).toLocaleString()} / ${activeBoss.maxHp.toLocaleString()}**`,
        inline: false,
      },
      {
        name: "🏆 Top 10 Sát Thương",
        value: topDamageField,
        inline: false,
      },
      {
        name: "Thông tin",
        value: (() => {
          const bossRank = config.rpg.boss?.bossRankRewards?.[boss.rank] || null;
          const rankLine = bossRank ? `${bossRank.emoji} **${bossRank.label}**\n` : "";
          return (
            rankLine +
            `Lực chiến gợi ý: **${boss.recommended_power.toLocaleString()}**\n` +
            `Tồn tại: **10 phút**\n` +
            `Người tham gia: **${activeBoss.participants.size}**`
          );
        })(),
        inline: true,
      },
    );

  if (activeBoss.imageUrl) {
    embed.setImage(activeBoss.imageUrl);
  } else {
    embed.setImage(`attachment://${boss.asset || "boss_01.webp"}`);
  }

  if (activeBoss.lastHitUserId && !expired) {
    embed.addFields({
      name: "Last Hit",
      value: `<@${activeBoss.lastHitUserId}>`,
      inline: true,
    });
  }

  return embed;
};

const getAttachment = (boss) =>
  new AttachmentBuilder(getBossAssetPath(boss), {
    name: boss.asset || "boss_01.webp",
  });

const buildBossComponents = (activeBoss, status = "alive") => {
  const disabled =
    status !== "alive" || activeBoss.defeated || activeBoss.expired;

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`rpg_boss_fight:${activeBoss.channelId}`)
        .setLabel("Fight!")
        .setStyle(ButtonStyle.Success)
        .setEmoji("⚔️")
        .setDisabled(disabled),
    ),
  ];
};

const getNextSpawnDelay = () => {
  const bossConfig = config.rpg.boss || {};
  const timezone = bossConfig.spawn_timezone || "Asia/Ho_Chi_Minh";
  const spawnHours = [...(bossConfig.spawn_hours || [9, 12, 15, 18, 22])]
    .map(Number)
    .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23)
    .sort((a, b) => a - b);
  const now = DateTime.now().setZone(timezone);
  const hours = spawnHours.length ? spawnHours : [9, 12, 15, 18, 22];

  for (const hour of hours) {
    const candidate = now.set({ hour, minute: 0, second: 0, millisecond: 0 });
    if (candidate > now) return candidate.diff(now).as("milliseconds");
  }

  const tomorrow = now
    .plus({ days: 1 })
    .set({ hour: hours[0], minute: 0, second: 0, millisecond: 0 });
  return tomorrow.diff(now).as("milliseconds");
};

const scheduleNextBoss = (client) => {
  const delay = Math.max(1000, Math.floor(getNextSpawnDelay()));
  client.rpgBossSpawnTimer = setTimeout(() => spawnRandomBoss(client), delay);
};

const expireBoss = async (client, channelId) => {
  const activeBoss = client.rpgBosses?.get(channelId);
  if (!activeBoss || activeBoss.defeated) return;

  activeBoss.expired = true;
  client.rpgBosses.delete(channelId);

  if (activeBoss.updateQueue) {
    await activeBoss.updateQueue.catch(() => null);
  }

  try {
    const channel = await client.channels.fetch(channelId);
    const bossMessage = await channel.messages.fetch(activeBoss.messageId).catch(() => null);
    if (bossMessage) {
      const payload = {
        embeds: [buildBossEmbed(activeBoss, "expired")],
        components: buildBossComponents(activeBoss, "expired"),
      };
      if (!activeBoss.imageUrl) {
        payload.files = [getAttachment(activeBoss.boss)];
      }
      await bossMessage.edit(payload);
    }
  } catch (error) {
    console.warn("[RPG_BOSS] Failed to expire boss message:", error.message);
  }
};

const spawnRandomBoss = async (client, options = {}) => {
  try {
    const channelIds = config.rpg.boss?.spawn_channel_ids || [];
    const bossTiers = config.rpg.boss?.tiers || [];
    if (!channelIds.length || !bossTiers.length) {
      return;
    }

    const targetChannelId = options.channelId || null;
    const availableChannelIds = (targetChannelId ? [targetChannelId] : channelIds).filter(
      (channelId) => !client.rpgBosses.has(channelId),
    );
    if (!availableChannelIds.length) {
      return;
    }

    const channelId = pick(availableChannelIds);
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return;
    }

    const boss = pick(bossTiers);
    const activeBoss = {
      id: `${Date.now()}-${boss.key}`,
      channelId,
      boss,
      hp: boss.hp,
      maxHp: boss.hp,
      participants: new Map(),
      lastHitUserId: null,
      defeated: false,
      expired: false,
      spawnedAt: Date.now(),
      expiresAt: Date.now() + (config.rpg.boss?.lifetime_ms || 10 * 60 * 1000),
      messageId: null,
    };

    const message = await channel.send({
      embeds: [buildBossEmbed(activeBoss)],
      files: [getAttachment(boss)],
      components: buildBossComponents(activeBoss),
    });

    activeBoss.messageId = message.id;
    const attachment = message.attachments.first();
    if (attachment) {
      activeBoss.imageUrl = attachment.url;
    }
    activeBoss.expireTimer = setTimeout(
      () => expireBoss(client, channelId),
      config.rpg.boss?.lifetime_ms || 10 * 60 * 1000,
    );
    client.rpgBosses.set(channelId, activeBoss);
    return activeBoss;
  } catch (error) {
    console.error("[RPG_BOSS] Spawn failed:", error);
  } finally {
    if (options.scheduleNext !== false) scheduleNextBoss(client);
  }
};

const spawnBossNow = (client, channelId = null) =>
  spawnRandomBoss(client, { channelId, scheduleNext: false });

const initialize = (client) => {
  client.rpgBosses = client.rpgBosses || new Map();
  if (client.rpgBossSpawnTimer) clearTimeout(client.rpgBossSpawnTimer);
  scheduleNextBoss(client);
  console.log("✅ RPG boss spawner initialized.");
};

module.exports = {
  buildBossEmbed,
  buildBossComponents,
  getAttachment,
  healthBar,
  initialize,
  spawnBossNow,
  spawnRandomBoss,
};
