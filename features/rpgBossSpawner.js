const path = require("path");
const fs = require("fs");
const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} = require("discord.js");
const { DateTime } = require("luxon");
const config = require("../data/config");

const healthBar = (hp, maxHp) => {
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  const filled = Math.ceil(ratio * 10);
  return "▰".repeat(filled) + "▱".repeat(10 - filled);
};

const pick = (items) => items[Math.floor(Math.random() * items.length)];

const getBossAssetPath = (boss) => {
  const rpgeventPath = path.join(__dirname, "../assets/rpgevent", boss.asset || "boss_01.webp");
  if (fs.existsSync(rpgeventPath)) {
    return rpgeventPath;
  }
  return path.join(__dirname, "../assets/bosses", boss.asset || "boss_01.webp");
};

const checkAndGetEventState = async () => {
  try {
    const HexEventState = require("../models/HexEventState");
    const eventState = await HexEventState.findById("hex_event");
    if (eventState && eventState.active) {
      if (eventState.expiresAt && eventState.expiresAt <= Date.now()) {
        eventState.active = false;
        eventState.expiresAt = null;
        await eventState.save().catch(() => {});
        console.log("🟣 [HEX_EVENT] Event has expired. Auto-disabled.");
        return null;
      }
      return eventState;
    }
  } catch (err) {
    console.error("[RPG_BOSS] Error checking Hex Event state:", err);
  }
  return null;
};

const buildBossEmbed = (activeBoss, status = "alive") => {
  const boss = activeBoss.boss;
  const defeated = status === "defeated";
  const expired = status === "expired";
  const transitioned = status === "transitioned";
  const title = defeated
    ? `${boss.emoji} ${boss.name} đã bị hạ`
    : expired
      ? `${boss.emoji} ${boss.name} đã rời đi`
      : transitioned
        ? `${boss.emoji} ${boss.name} đã chuyển sang Phase 2`
        : `${boss.emoji} ${boss.name} xuất hiện`;

  const description = defeated
    ? `Boss đã bị kết liễu bởi <@${activeBoss.lastHitUserId}>.`
    : expired
      ? "Không ai hạ được boss trong thời gian tồn tại."
      : transitioned
        ? "Boss đã tiến hóa/hồi sinh sang Phase 2. Xem tin nhắn mới nhất để tiếp tục chiến đấu."
        : `Gõ \`${config.prefix}boss\` để tấn công boss trong channel này.`;

  
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
    .setColor(defeated ? "#57F287" : (expired || transitioned) ? "#747F8D" : "#ED4245")
    .setTitle(title)
    .setDescription(description)
    .addFields(
      {
        name: "HP",
        value: (() => {
          let val = `${healthBar(activeBoss.hp, activeBoss.maxHp)}\n` +
                    `**${Math.max(0, activeBoss.hp).toLocaleString()} / ${activeBoss.maxHp.toLocaleString()}**`;
          
          const effects = activeBoss.effects || {};
          const isHealReduced = effects.healReduced && Date.now() < (effects.healReducedUntil || 0);
          if (isHealReduced) {
            val += `\n<:healreduction:1523340558855045190> **Giảm 30% Hồi máu**`;
          }
          if (effects.armorReduced && effects.armorReduced > 0) {
            val += `\n🛡️ **Giảm ${Math.round(effects.armorReduced * 100)}% Giáp**`;
          }
          return val;
        })(),
        inline: false,
      },
      {
        name: "🏆 Top 10 Sát Thương",
        value: topDamageField,
        inline: false,
      }
    );

  if (activeBoss.lastHitUserId && !expired) {
    embed.addFields({
      name: "Last Hit",
      value: `<@${activeBoss.lastHitUserId}>`,
      inline: true,
    });
  }

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

const buildBossComponentsV2 = (activeBoss, status = "alive") => {
  const boss = activeBoss.boss;
  const defeated = status === "defeated";
  const expired = status === "expired";
  const transitioned = status === "transitioned";

  const title = defeated
    ? `${boss.emoji} ${boss.name} đã bị hạ`
    : expired
      ? `${boss.emoji} ${boss.name} đã rời đi`
      : transitioned
        ? `${boss.emoji} ${boss.name} đã chuyển sang Phase 2`
        : `${boss.emoji} ${boss.name} xuất hiện`;

  const description = defeated
    ? `Boss đã bị kết liễu bởi <@${activeBoss.lastHitUserId}>.`
    : expired
      ? "Không ai hạ được boss trong thời gian tồn tại."
      : transitioned
        ? "Boss đã tiến hóa/hồi sinh sang Phase 2. Xem tin nhắn mới nhất để tiếp tục chiến đấu."
        : `Gõ \`${config.prefix}boss\` để tấn công boss trong channel này.`;

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

  let hpLine = `${healthBar(activeBoss.hp, activeBoss.maxHp)}\n` +
               `**${Math.max(0, activeBoss.hp).toLocaleString()} / ${activeBoss.maxHp.toLocaleString()}**`;
  
  if (boss.key === "plaxidusax") {
    const poise = activeBoss.poise || 0;
    const poiseMax = activeBoss.poiseMax || 150;
    const poiseFilled = Math.max(0, Math.min(10, Math.round((poise / poiseMax) * 10)));
    const poiseEmpty = 10 - poiseFilled;
    const poiseBarStr = "▰".repeat(poiseFilled) + "▱".repeat(poiseEmpty);
    hpLine += `\n🛡️ **Poise:** ${poiseBarStr} [**${poise}/${poiseMax}**]`;
    if (activeBoss.poiseBroken) {
      hpLine += ` (⚡ *Bị phá vỡ poise - nhận 100% sát thương*)`;
    } else {
      hpLine += ` (*Giảm 15% sát thương nhận vào*)`;
    }
  }
  
  const effects = activeBoss.effects || {};
  const isHealReduced = effects.healReduced && Date.now() < (effects.healReducedUntil || 0);
  if (isHealReduced) {
    hpLine += `\n<:healreduction:1523340558855045190> **Giảm 30% Hồi máu**`;
  }
  if (effects.armorReduced && effects.armorReduced > 0) {
    hpLine += `\n🛡️ **Giảm ${Math.round(effects.armorReduced * 100)}% Giáp**`;
  }

  let infoLine = "";
  if (activeBoss.lastHitUserId && !expired) {
    infoLine = `Last Hit: <@${activeBoss.lastHitUserId}>`;
  }

  const accentColor = defeated ? 0x57F287 : (expired || transitioned) ? 0x747F8D : 0xED4245;

  const container = new ContainerBuilder().setAccentColor(accentColor);

  const text1 = new TextDisplayBuilder().setContent(
    `# ${title}\n` +
    `${description}`
  );

  const text2 = new TextDisplayBuilder().setContent(
    `### ❤️ HP\n` +
    `${hpLine}`
  );

  const text3 = new TextDisplayBuilder().setContent(
    `### 🏆 Top 10 Sát Thương\n` +
    `${topDamageField}`
  );

  const sep1 = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
  const sep2 = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
  const sep3 = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

  const imgFileName = boss.asset || "boss_01.webp";
  const gallery = new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL(`attachment://${imgFileName}`)
  );

  container
    .addTextDisplayComponents(text1)
    .addSeparatorComponents(sep1)
    .addTextDisplayComponents(text2)
    .addSeparatorComponents(sep2)
    .addTextDisplayComponents(text3);

  if (infoLine) {
    const text4 = new TextDisplayBuilder().setContent(
      `### ℹ️ Thông tin\n` +
      `${infoLine}`
    );
    container.addSeparatorComponents(sep3).addTextDisplayComponents(text4);
  }

  container.addMediaGalleryComponents(gallery);

  const disabled = status !== "alive" || activeBoss.defeated || activeBoss.expired;
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rpg_boss_fight:${activeBoss.channelId}`)
      .setLabel("Fight!")
      .setStyle(ButtonStyle.Success)
      .setEmoji("⚔️")
      .setDisabled(disabled)
  );

  container.addActionRowComponents(buttonRow);

  return container;
};

const getNextSpawnDelay = () => {
  const bossConfig = config.rpg.boss || {};
  const timezone = bossConfig.spawn_timezone || "Asia/Ho_Chi_Minh";
  const spawnHours = [...(bossConfig.spawn_hours || [3, 6, 9, 12, 15, 18, 21, 0])]
    .map(Number)
    .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23)
    .sort((a, b) => a - b);
  const now = DateTime.now().setZone(timezone);
  const hours = spawnHours.length ? spawnHours : [3, 6, 9, 12, 15, 18, 21, 0];

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
  client.rpgBossSpawnTimer = setTimeout(() => spawnRandomBoss(client, { allowSoulRealm: true }), delay);
};

const expireBoss = async (client, channelId) => {
  const activeBoss = client.rpgBosses?.get(channelId);
  if (!activeBoss || activeBoss.defeated) return;

  activeBoss.expired = true;
  client.rpgBosses.delete(channelId);
  client.emit("rpgBossExpired", activeBoss);

  try {
    const SpawnedBoss = require("../models/SpawnedBoss");
    if (activeBoss.dbId) {
      await SpawnedBoss.findByIdAndUpdate(activeBoss.dbId, { expired: true }).catch(() => null);
    } else {
      await SpawnedBoss.findOneAndUpdate({ bossId: activeBoss.id }, { expired: true }).catch(() => null);
    }
  } catch (err) {
    console.error("[RPG_BOSS] Failed to mark boss as expired in DB:", err);
  }

  if (activeBoss.updateQueue) {
    await activeBoss.updateQueue.catch(() => null);
  }

  try {
    const channel = await client.channels.fetch(channelId);
    const messageIds = activeBoss.messageIds || (activeBoss.messageId ? [activeBoss.messageId] : []);
    for (const msgId of messageIds) {
      const bossMessage = await channel.messages.fetch(msgId).catch(() => null);
      if (bossMessage) {
        await bossMessage.delete().catch(() => null);
        await channel.send({
          content: "",
          embeds: [],
          components: [buildBossComponentsV2(activeBoss, "expired")],
          flags: MessageFlags.IsComponentsV2,
          files: [getAttachment(activeBoss.boss)],
        }).catch(() => null);
      }
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

    
    const bossesByRank = {};
    for (const b of bossTiers) {
      if (b.key === "boss_012" || b.key === "boss_XIIa" || b.key.endsWith("_p2") || b.key === "hexia" || b.key === "godhexa") continue;
      if (!bossesByRank[b.rank]) {
        bossesByRank[b.rank] = [];
      }
      bossesByRank[b.rank].push(b);
    }

    const rankWeights = {};
    for (const [rank, val] of Object.entries(config.rpg.boss?.bossRankRewards || {})) {
      rankWeights[rank] = { ...val };
    }

    const timezone = config.rpg.boss?.spawn_timezone || "Asia/Ho_Chi_Minh";
    const now = DateTime.now().setZone(timezone);
    const currentHour = now.hour;

    
    
    
    if ((currentHour >= 9 && currentHour < 15) || currentHour === 3 || currentHour === 6) {
      if (rankWeights.thuong) rankWeights.thuong.spawnWeight = 50;
      if (rankWeights.than) rankWeights.than.spawnWeight = 25;
      if (rankWeights.rong) rankWeights.rong.spawnWeight = 15;
      if (rankWeights.thuongnhan) rankWeights.thuongnhan.spawnWeight = 10;
    } else if (currentHour >= 18 || currentHour === 0) {
      if (rankWeights.rong) rankWeights.rong.spawnWeight = 70;
      if (rankWeights.thuongnhan) rankWeights.thuongnhan.spawnWeight = 30;
    } else {
      if (rankWeights.thuong) rankWeights.thuong.spawnWeight = 50;
      if (rankWeights.than) rankWeights.than.spawnWeight = 30;
      if (rankWeights.rong) rankWeights.rong.spawnWeight = 15;
      if (rankWeights.thuongnhan) rankWeights.thuongnhan.spawnWeight = 5;
    }

    let activeRanks = Object.keys(bossesByRank).filter((rank) => rankWeights[rank]);

    const isNightBoss = currentHour >= 18 || currentHour === 0;

    if (isNightBoss) {
      activeRanks = activeRanks.filter((rank) => rank === "rong" || rank === "thuongnhan");
      if (activeRanks.length === 0) {
        activeRanks = ["rong", "thuongnhan"].filter((rank) => bossesByRank[rank]);
      }
    }

    let selectedRank = null;
    if (activeRanks.length > 0) {
      const totalWeight = activeRanks.reduce(
        (sum, rank) => sum + (rankWeights[rank].spawnWeight || 1),
        0,
      );
      let rand = Math.random() * totalWeight;
      for (const rank of activeRanks) {
        const weight = rankWeights[rank].spawnWeight || 1;
        if (rand < weight) {
          selectedRank = rank;
          break;
        }
        rand -= weight;
      }
      if (!selectedRank) selectedRank = activeRanks[activeRanks.length - 1];
    }

    let boss = null;
    if (options.bossKey) {
      boss = bossTiers.find((t) => t.key.toLowerCase() === options.bossKey.toLowerCase());
    }

    if (!boss) {
      boss =
        selectedRank && bossesByRank[selectedRank]?.length
          ? pick(bossesByRank[selectedRank])
          : pick(bossTiers.filter((t) => t.key !== "boss_012" && t.key !== "boss_XIIa" && !t.key.endsWith("_p2") && t.key !== "hexia" && t.key !== "godhexa"));
    }

    
    let triggerEventBoss = null;
    if (boss.key !== "hexia" && boss.key !== "godhexa") {
      const eventState = await checkAndGetEventState();
      if (eventState) {
        const timezone = config.rpg.boss?.spawn_timezone || "Asia/Ho_Chi_Minh";
        const spawnTime = DateTime.now().setZone(timezone);
        const dayOfWeek = spawnTime.weekday; 
        const hour = spawnTime.hour;
        
        if (dayOfWeek === 6) { 
          if ([12, 15, 18, 21].includes(hour)) {
            triggerEventBoss = "hexia";
          }
        } else if (dayOfWeek === 7) { 
          if (hour === 12) {
            triggerEventBoss = "godhexa";
          }
        }
      }
    }

    let lifetime = config.rpg.boss?.lifetime_ms || 10 * 60 * 1000;
    if (boss.key === "hexia") {
      lifetime = 1 * 60 * 60 * 1000; 
    } else if (boss.key === "godhexa") {
      lifetime = 3 * 60 * 60 * 1000; 
    }

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
      expiresAt: Date.now() + lifetime,
      messageId: null,
      messageIds: [],
      allowSoulRealm: options.allowSoulRealm || false,
      triggerEventBoss: triggerEventBoss,
      poise: boss.poiseMax || 0,
      poiseMax: boss.poiseMax || 0,
      poiseBroken: false,
    };

    const message = await channel.send({
      content: "",
      embeds: [],
      components: [buildBossComponentsV2(activeBoss)],
      files: [getAttachment(boss)],
      flags: MessageFlags.IsComponentsV2,
    });

    activeBoss.messageId = message.id;
    activeBoss.messageIds = [message.id];
    const attachment = message.attachments.first();
    if (attachment) {
      activeBoss.imageUrl = attachment.url;
    }

    try {
      const SpawnedBoss = require("../models/SpawnedBoss");
      const dbBoss = await SpawnedBoss.create({
        bossId: activeBoss.id,
        channelId: activeBoss.channelId,
        boss: activeBoss.boss,
        hp: activeBoss.hp,
        maxHp: activeBoss.maxHp,
        participants: {},
        lastHitUserId: null,
        spawnedAt: activeBoss.spawnedAt,
        expiresAt: activeBoss.expiresAt,
        messageId: activeBoss.messageId,
        messageIds: activeBoss.messageIds,
        imageUrl: activeBoss.imageUrl,
        phase: 1,
        effects: { armorReduced: 0, healReduced: false },
        allowSoulRealm: activeBoss.allowSoulRealm,
        triggerEventBoss: activeBoss.triggerEventBoss,
        poise: activeBoss.poise,
        poiseMax: activeBoss.poiseMax,
        poiseBroken: activeBoss.poiseBroken
      });
      activeBoss.dbId = dbBoss._id;
    } catch (err) {
      console.error("[RPG_BOSS] Failed to save spawned boss to DB:", err);
    }

    activeBoss.expireTimer = setTimeout(
      () => expireBoss(client, channelId),
      lifetime,
    );
    client.rpgBosses.set(channelId, activeBoss);
    return activeBoss;
  } catch (error) {
    console.error("[RPG_BOSS] Spawn failed:", error);
  } finally {
    if (options.scheduleNext !== false) scheduleNextBoss(client);
  }
};

const spawnBossNow = (client, channelId = null, bossKey = null) =>
  spawnRandomBoss(client, { channelId, bossKey, scheduleNext: false });

const spawnEventBoss = async (client, channelId, bossKey) => {
  console.log(`[HEX_EVENT] Spawning event boss ${bossKey} in channel ${channelId} in 5s...`);
  setTimeout(async () => {
    
    if (client.rpgBosses.has(channelId)) {
      console.log(`[HEX_EVENT] Channel ${channelId} already has a boss active, skipping event boss spawn.`);
      return;
    }
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;
    
    
    await spawnRandomBoss(client, {
      channelId: channelId,
      bossKey: bossKey,
      scheduleNext: false, 
      allowSoulRealm: false 
    });
    
    
    if (bossKey === "hexia") {
      channel.send("🟣 **[Cảnh Báo Sự Kiện Hex]** Bầu trời rách đôi! Ma lực cổ xưa trỗi dậy...\n🔥 **HEXIA** đã xuất hiện!");
    } else if (bossKey === "godhexa") {
      channel.send("🟣 **[Cảnh Báo Sự Kiện Hex]** Vạn vật run rẩy, ánh sáng bị nuốt chửng...\n👑 **GODHEXA** giáng lâm thế giới!");
    }
  }, 5000);
};

const initialize = async (client) => {
  client.rpgBosses = client.rpgBosses || new Map();
  if (client.rpgBossSpawnTimer) clearTimeout(client.rpgBossSpawnTimer);

  
  if (!client.rpgBossListenersRegistered) {
    client.rpgBossListenersRegistered = true;
    client.on("rpgBossDefeated", async (activeBoss) => {
      if (activeBoss.triggerEventBoss) {
        const eventState = await checkAndGetEventState();
        if (eventState) {
          spawnEventBoss(client, activeBoss.channelId, activeBoss.triggerEventBoss);
        }
      }
    });
    client.on("rpgBossExpired", async (activeBoss) => {
      if (activeBoss.triggerEventBoss) {
        const eventState = await checkAndGetEventState();
        if (eventState) {
          spawnEventBoss(client, activeBoss.channelId, activeBoss.triggerEventBoss);
        }
      }
    });
  }

  
  try {
    const SpawnedBoss = require("../models/SpawnedBoss");
    const activeDbBosses = await SpawnedBoss.find({ defeated: false, expired: false, rewarded: false }).exec();
    console.log(`[RPG_BOSS] Reloading ${activeDbBosses.length} active bosses from DB...`);
    for (const dbBoss of activeDbBosses) {
      if (dbBoss.expiresAt > Date.now()) {
        const activeBoss = {
          dbId: dbBoss._id,
          id: dbBoss.bossId,
          channelId: dbBoss.channelId,
          boss: dbBoss.boss,
          hp: dbBoss.hp,
          maxHp: dbBoss.maxHp,
          participants: new Map(Object.entries(dbBoss.participants || {})),
          lastHitUserId: dbBoss.lastHitUserId,
          defeated: dbBoss.defeated,
          expired: dbBoss.expired,
          spawnedAt: dbBoss.spawnedAt,
          expiresAt: dbBoss.expiresAt,
          messageId: dbBoss.messageId,
          messageIds: dbBoss.messageIds || [dbBoss.messageId],
          imageUrl: dbBoss.imageUrl,
          phase: dbBoss.phase || 1,
          effects: dbBoss.effects || { armorReduced: 0, healReduced: false },
          allowSoulRealm: dbBoss.allowSoulRealm || false,
          triggerEventBoss: dbBoss.triggerEventBoss || null,
          poise: dbBoss.poise || 0,
          poiseMax: dbBoss.poiseMax || 0,
          poiseBroken: dbBoss.poiseBroken || false
        };

        const msLeft = dbBoss.expiresAt - Date.now();
        activeBoss.expireTimer = setTimeout(
          () => expireBoss(client, dbBoss.channelId),
          msLeft
        );
        client.rpgBosses.set(dbBoss.channelId, activeBoss);
      } else {
        dbBoss.expired = true;
        await dbBoss.save();
      }
    }
  } catch (err) {
    console.error("[RPG_BOSS] Error reloading active bosses from DB:", err);
  }

  
  try {
    const SpawnedBoss = require("../models/SpawnedBoss");
    const unrewarded = await SpawnedBoss.find({ defeated: true, rewarded: false }).exec();
    if (unrewarded.length > 0) {
      console.log(`[RPG_BOSS] Found ${unrewarded.length} unrewarded defeated bosses. Resuming reward distribution...`);
      const { finishBoss } = require("../commands/rpg/boss");
      for (const dbBoss of unrewarded) {
        const channel = await client.channels.fetch(dbBoss.channelId).catch(() => null);
        if (channel) {
          const activeBoss = {
            dbId: dbBoss._id,
            id: dbBoss.bossId,
            channelId: dbBoss.channelId,
            boss: dbBoss.boss,
            hp: dbBoss.hp,
            maxHp: dbBoss.maxHp,
            participants: new Map(Object.entries(dbBoss.participants || {})),
            lastHitUserId: dbBoss.lastHitUserId,
            defeated: dbBoss.defeated,
            expired: dbBoss.expired,
            spawnedAt: dbBoss.spawnedAt,
            expiresAt: dbBoss.expiresAt,
            messageId: dbBoss.messageId,
            messageIds: dbBoss.messageIds || [dbBoss.messageId],
            imageUrl: dbBoss.imageUrl,
            phase: dbBoss.phase || 1,
            effects: dbBoss.effects || { armorReduced: 0, healReduced: false }
          };
          await finishBoss({ client, channel, activeBoss }).catch((err) => {
            console.error(`[RPG_BOSS] Failed to recover finishBoss for ${dbBoss.bossId}:`, err);
          });
        } else {
          dbBoss.rewarded = true;
          await dbBoss.save();
        }
      }
    }
  } catch (err) {
    console.error("[RPG_BOSS] Error recovering unrewarded bosses:", err);
  }

  scheduleNextBoss(client);
  console.log("✅ RPG boss spawner initialized.");
};

module.exports = {
  buildBossEmbed,
  buildBossComponents,
  buildBossComponentsV2,
  getAttachment,
  healthBar,
  initialize,
  spawnBossNow,
  spawnRandomBoss,
};
