const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const config = require("../../data/config");
const {
  buildBossComponents,
  buildBossEmbed,
  getAttachment,
} = require("../../features/rpgBossSpawner");
const {
  addRpgExp,
  addRpgGearToUser,
  calculateRpgPower,
  generateRpgGearDrop,
  getRpgXpNeeded,
  requireRpgCharacter,
  getEffectiveRpgStats,
  getRpgClass,
  getGearDisplayName,
  getEquippedItems,
  getWeaponPower,
  dungeonKeys,
} = require("../../utils/rpgUtil");

const CLASS_ATTACK_TYPES = {
  warrior: "physical",
  archer: "physical",
  mage: "magical",
  assassin: "physical",
  paladin: "physical",
  wretch: "physical",
};

const formatRemaining = (ms) => {
  const seconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  if (minutes <= 0) return `${restSeconds}s`;
  return `${minutes}m ${restSeconds}s`;
};

const sendRewardDm = async ({
  client,
  userId,
  boss,
  rankLabel,
  rankEmoji,
  rankColor,
  damage,
  gears,
  expGain,
  cokeGain,
  isLastHit,
  stones,
  keyDropped,
  topBonus,
}) => {
  const discordUser = await client.users.fetch(userId).catch(() => null);
  if (!discordUser) return;

  const gearLines = gears
    .map(
      (gear) =>
        `#${gear.id} **${getGearDisplayName(gear)}** (UID: \`${gear.uid.slice(0, 8)}\`) | +${gear.power.toLocaleString()} Lực chiến | bán ${gear.sellPrice.toLocaleString()} <:cokecy:1509951335016173662>`,
    )
    .join("\n");

  const stoneLines = stones && stones.length
    ? stones.map(s => `${s.emoji} **${s.name}** (x${s.quantity})`).join("\n")
    : null;

  const embed = new EmbedBuilder()
    .setColor(topBonus ? topBonus.color : isLastHit ? "#FEE75C" : (rankColor || "#57F287"))
    .setTitle(`${boss.emoji} Thưởng đánh boss: ${boss.name}`)
    .setDescription(
      isLastHit
        ? `🎉 Bạn là người kết liễu boss nên nhận thêm quà cực khủng!\n${rankEmoji || ""} **${rankLabel || "Cấp Thường"}**`
        : `Boss đã bị hạ. Đây là phần thưởng tham gia của bạn.\n${rankEmoji || ""} **${rankLabel || "Cấp Thường"}**`,
    )
    .addFields(
      {
        name: "Đóng góp & Phần thưởng",
        value:
          `Sát thương: **${damage.toLocaleString()}**\n` +
          `Coke nhận được: **+${cokeGain.toLocaleString()}** <:cokecy:1509951335016173662>\n` +
          `EXP RPG: **+${expGain.toLocaleString()}**`,
        inline: true,
      },
      {
        name: "Trang bị nhận được",
        value: gearLines || "Không có",
        inline: true,
      },
    );

  if (topBonus) {
    let bonusValue = `+${topBonus.cokeBonus.toLocaleString()} <:cokecy:1509951335016173662>\n+${topBonus.expBonus.toLocaleString()} EXP`;
    if (topBonus.wcBonus > 0) bonusValue += `\n<:crate:1512793698025603282> Lootbox x${topBonus.wcBonus}`;
    embed.addFields({
      name: `${topBonus.label} 🏆`,
      value: bonusValue,
      inline: true,
    });
  }

  if (stoneLines) {
    embed.addFields({
      name: "Đá nâng cấp nhận được",
      value: stoneLines,
      inline: true,
    });
  }

  if (keyDropped) {
    embed.addFields({
      name: "Phó bản nhận được",
      value: `<:key:1516398711712911461> **Chìa khóa Phó bản** (x1)`,
      inline: true,
    });
  }

  await discordUser.send({ embeds: [embed] }).catch(() => null);
};

const finishBoss = async ({ client, channel, activeBoss }) => {
  if (activeBoss.rewarded) return;
  activeBoss.rewarded = true;
  activeBoss.defeated = true;
  if (activeBoss.expireTimer) clearTimeout(activeBoss.expireTimer);
  client.rpgBosses.delete(activeBoss.channelId);

  if (activeBoss.updateQueue) {
    await activeBoss.updateQueue.catch(() => null);
  }

  const SpawnedBoss = require("../../models/SpawnedBoss");
  let dbBoss = null;
  if (activeBoss.dbId) {
    dbBoss = await SpawnedBoss.findById(activeBoss.dbId).exec().catch(() => null);
  } else {
    dbBoss = await SpawnedBoss.findOne({ bossId: activeBoss.id }).exec().catch(() => null);
  }
  const rewardedUserIds = dbBoss?.rewardedUserIds || [];

  const bossRankKey = activeBoss.boss.rank || "thuong";
  const rankReward = config.rpg.boss?.bossRankRewards?.[bossRankKey] || {
    label: "Cấp Thường", emoji: "⚔️", color: "#95A5A6",
    participantRarities: ["Epic"],
    lastHitRarities: ["Epic"],
    cokeMin: 500, cokeMax: 1000,
    lastHitCokeMin: 2000, lastHitCokeMax: 5000,
    expMult: 1, lastHitExpMult: 1.5,
  };

  const rollRarityForBoss = (rankKey, type) => {
    const r = Math.random() * 100;
    const typeLower = String(type || "").toLowerCase();
    if (rankKey === "thuong" || rankKey === "than") {
      return r < 10 ? "Legendary" : "Epic";
    }
    if (rankKey === "rong") {
      if (r < 5) return "Mythic";
      if (r < 25) return "Legendary";
      return "Epic";
    }
    if (rankKey === "thuongnhan") {
      if (typeLower === "participant") {
        if (r < 1) return "Ancient";
        if (r < 15) return "Mythic";
        return "Legendary";
      }
      if (typeLower === "lasthit") {
        if (r < 1) return "Divine";
        if (r < 5) return "Ancient";
        if (r < 25) return "Mythic";
        return "Legendary";
      }
    }
    return null;
  };

  // --- Tính top 3 sát thương ---
  const baseExp = activeBoss.boss.exp || 100;
  const sortedByDamage = [...activeBoss.participants.entries()]
    .sort(([, a], [, b]) => b.damage - a.damage);

  const topDamageConfigs = rankReward.topDamageRewards || [
    { rank: 1, cokeBonus: 3000, wcBonus: 5 },
    { rank: 2, cokeBonus: 1500, wcBonus: 2 },
    { rank: 3, cokeBonus: 800, wcBonus: 0 },
  ];

  const TOP3_BONUS = [
    {
      rank: 1,
      label: "🥇 Top 1 Sát Thương",
      expBonus: Math.floor(baseExp * 0.5),
      cokeBonus: topDamageConfigs[0]?.cokeBonus ?? 3000,
      wcBonus: topDamageConfigs[0]?.wcBonus ?? 5,
      color: "#FFD700",
    },
    {
      rank: 2,
      label: "🥈 Top 2 Sát Thương",
      expBonus: Math.floor(baseExp * 0.25),
      cokeBonus: topDamageConfigs[1]?.cokeBonus ?? 1500,
      wcBonus: topDamageConfigs[1]?.wcBonus ?? 2,
      color: "#C0C0C0",
    },
    {
      rank: 3,
      label: "🥉 Top 3 Sát Thương",
      expBonus: Math.floor(baseExp * 0.1),
      cokeBonus: topDamageConfigs[2]?.cokeBonus ?? 800,
      wcBonus: topDamageConfigs[2]?.wcBonus ?? 0,
      color: "#CD7F32",
    },
  ];

  // Map userId -> top3 bonus config (nếu có)
  const topBonusMap = new Map();
  for (let i = 0; i < Math.min(3, sortedByDamage.length); i++) {
    const [uid] = sortedByDamage[i];
    topBonusMap.set(uid, TOP3_BONUS[i]);
  }

  const top3Results = []; // Lưu kết quả để gửi channel

  for (const [userId, participant] of activeBoss.participants.entries()) {
    if (rewardedUserIds.includes(userId)) {
      console.log(`[RPG_BOSS] Skipping already rewarded user ${userId} for boss ${activeBoss.id}`);
      continue;
    }
    try {
      const { user, rpgClass } = await requireRpgCharacter(userId);
      const isLastHit = userId === activeBoss.lastHitUserId;
      const gears = [];

      // Reward gear 1 — participant drop (scales by rank)
      const rolledRarity1 = rollRarityForBoss(bossRankKey, "participant");
      const gear1 = await generateRpgGearDrop(user, {
        forceDrop: true,
        rarity: rolledRarity1 || undefined,
        allowedRarities: rolledRarity1 ? undefined : rankReward.participantRarities,
      });
      if (gear1) {
        addRpgGearToUser(user, gear1);
        gears.push(gear1);
      }

      // Reward gear 2 — last hit bonus (scales by rank)
      if (isLastHit) {
        const rolledRarity2 = rollRarityForBoss(bossRankKey, "lasthit");
        const gear2 = await generateRpgGearDrop(user, {
          forceDrop: true,
          rarity: rolledRarity2 || undefined,
          allowedRarities: rolledRarity2 ? undefined : rankReward.lastHitRarities,
        });
        if (gear2) {
          addRpgGearToUser(user, gear2);
          gears.push(gear2);
        }

        // Cấp thượng nhân gets a third bonus gear
        if (rankReward.lastHitBonusRarities) {
          const gear3 = await generateRpgGearDrop(user, {
            forceDrop: true,
            allowedRarities: rankReward.lastHitBonusRarities,
          });
          if (gear3) {
            addRpgGearToUser(user, gear3);
            gears.push(gear3);
          }
        }
      }

      // EXP — scales by rank multiplier
      const expMult = isLastHit ? rankReward.lastHitExpMult : rankReward.expMult;
      const expGain = Math.floor(
        baseExp * expMult * (1 + (rpgClass.bonuses?.expGain || 0)),
      );
      addRpgExp(user.rpg, expGain);

      // Coke — scales by rank range
      const cokeGain = isLastHit
        ? rankReward.lastHitCokeMin + Math.floor(Math.random() * (rankReward.lastHitCokeMax - rankReward.lastHitCokeMin + 1))
        : rankReward.cokeMin + Math.floor(Math.random() * (rankReward.cokeMax - rankReward.cokeMin + 1));
      user.coke += cokeGain;

      // Drops for hourly boss
      const stonesDropped = [];
      if (bossRankKey === "rong" || bossRankKey === "thuongnhan") {
        const dropCount = Math.floor(Math.random() * 2) + 1; // 1 to 2 stones
        const stoneOptions = bossRankKey === "rong"
          ? ["somber-4", "somber-5", "somber-6"]
          : ["somber-7", "somber-8", "somber-9"];

        if (!user.inventory) {
          user.inventory = new Map();
        }

        for (let i = 0; i < dropCount; i++) {
          const stoneId = stoneOptions[Math.floor(Math.random() * stoneOptions.length)];
          const currentQty = user.inventory.get(stoneId) || 0;
          user.inventory.set(stoneId, currentQty + 1);

          // Track for displaying
          const found = stonesDropped.find(s => s.id === stoneId);
          if (found) {
            found.quantity += 1;
          } else {
            const stoneData = client.allItems.find(item => item.item_id === stoneId);
            stonesDropped.push({
              id: stoneId,
              name: stoneData?.name || stoneId,
              emoji: stoneData?.emoji || "💎",
              quantity: 1
            });
          }
        }
        user.markModified("inventory");
      }

      // Key drop for dungeon - Chỉ dành cho Last Hit của boss Thượng Nhân với tỷ lệ 50%
      let keyDropped = false;
      if (bossRankKey === "thuongnhan" && isLastHit) {
        if (Math.random() < 0.5) {
          if (!user.inventory) {
            user.inventory = new Map();
          }
          const currentQty = user.inventory.get("dungeonkey") || 0;
          user.inventory.set("dungeonkey", currentQty + 1);
          user.markModified("inventory");
          keyDropped = true;
        }
      }

      // --- Bonus top 3 sát thương ---
      let topBonus = null;
      if (topBonusMap.has(userId)) {
        topBonus = topBonusMap.get(userId);

        // Thưởng bonus exp
        if (topBonus.expBonus > 0) {
          addRpgExp(user.rpg, topBonus.expBonus);
        }

        // Thưởng bonus coke
        if (topBonus.cokeBonus > 0) {
          user.coke += topBonus.cokeBonus;
        }

        // Thưởng wc (lootbox)
        if (topBonus.wcBonus > 0) {
          if (!user.inventory) user.inventory = new Map();
          const currentWc = user.inventory.get("wc") || 0;
          user.inventory.set("wc", currentWc + topBonus.wcBonus);
          user.markModified("inventory");
        }

        // Lưu để gửi thông báo channel
        const discordUser = await client.users.fetch(userId).catch(() => null);
        top3Results.push({
          rank: topBonus.rank,
          label: topBonus.label,
          color: topBonus.color,
          userId,
          displayName: discordUser?.displayName || discordUser?.username || `<@${userId}>`,
          damage: participant.damage,
          expBonus: topBonus.expBonus,
          cokeBonus: topBonus.cokeBonus,
          wcBonus: topBonus.wcBonus,
        });
      }

      user.rpg.power = calculateRpgPower(user);
      await user.save();

      if (dbBoss) {
        await SpawnedBoss.findByIdAndUpdate(dbBoss._id, {
          $addToSet: { rewardedUserIds: userId }
        }).catch(() => null);
      }

      // Quest progress updates
      const { updateQuestProgress } = require("../../utils/questUtil");
      await updateQuestProgress(userId, "boss_fight", 1, channel);
      await updateQuestProgress(userId, "exp_gain", expGain, channel);
      if (isLastHit) {
        await updateQuestProgress(userId, "boss_last_hit", 1, channel);
      }

      await sendRewardDm({
        client,
        userId,
        boss: activeBoss.boss,
        rankLabel: rankReward.label,
        rankEmoji: rankReward.emoji,
        rankColor: rankReward.color,
        damage: participant.damage,
        gears,
        expGain,
        cokeGain,
        isLastHit,
        stones: stonesDropped,
        keyDropped,
        topBonus,
      });
    } catch (error) {
      console.warn("[RPG_BOSS] Reward failed:", userId, error.message);
    }
  }

  // --- Gửi thông báo top 3 sát thương lên channel ---
  if (top3Results.length > 0) {
    try {
      top3Results.sort((a, b) => a.rank - b.rank);
      const top3Lines = top3Results.map(t => {
        let bonusText = `+${t.cokeBonus.toLocaleString()} <:cokecy:1509951335016173662>  +${t.expBonus.toLocaleString()} EXP`;
        if (t.wcBonus > 0) bonusText += `  <:crate:1512793698025603282> x${t.wcBonus}`;
        return `${t.label}: **${t.displayName}** — ${t.damage.toLocaleString()} ST\n┗ Thưởng thêm: ${bonusText}`;
      }).join("\n\n");

      const top3Embed = new EmbedBuilder()
        .setColor("#FFD700")
        .setTitle(`${activeBoss.boss.emoji} Bảng Xếp Hạng Sát Thương — ${activeBoss.boss.name}`)
        .setDescription(top3Lines)
        .setFooter({ text: "Phần thưởng đã được gửi qua DM. Chúc mừng top sát thương!" });

      await channel.send({ embeds: [top3Embed] }).catch(() => null);
    } catch (err) {
      console.warn("[RPG_BOSS] Failed to send top3 ranking message:", err.message);
    }
  }

  const messageIds = activeBoss.messageIds || (activeBoss.messageId ? [activeBoss.messageId] : []);
  for (const msgId of messageIds) {
    const bossMessage = await channel.messages.fetch(msgId).catch(() => null);
    if (bossMessage) {
      const payload = {
        embeds: [buildBossEmbed(activeBoss, "defeated")],
        components: buildBossComponents(activeBoss, "defeated"),
      };
      if (!activeBoss.imageUrl) {
        payload.files = [getAttachment(activeBoss.boss)];
      }
      await bossMessage.edit(payload).catch(() => null);
    }
  }

  try {
    const SpawnedBoss = require("../../models/SpawnedBoss");
    const participantsObj = {};
    for (const [uid, part] of activeBoss.participants.entries()) {
      participantsObj[uid] = part;
    }
    const updateData = {
      defeated: true,
      rewarded: true,
      hp: activeBoss.hp,
      lastHitUserId: activeBoss.lastHitUserId,
      participants: participantsObj,
    };
    if (activeBoss.dbId) {
      await SpawnedBoss.findByIdAndUpdate(activeBoss.dbId, updateData).catch(() => null);
    } else {
      await SpawnedBoss.findOneAndUpdate({ bossId: activeBoss.id }, updateData).catch(() => null);
    }
  } catch (err) {
    console.error("[RPG_BOSS] Failed to save final finishBoss state to DB:", err);
  }
};

const buildAttackResultEmbed = ({
  activeBoss,
  damage,
  isCrit,
  bossDamage,
  bossMissed,
  participant,
  user,
  rpgClass,
  maxHp,
  isPaidAttack,
  paidAttackCost,
  bossHealed,
  killedPhase1,
  passiveTriggers,
}) => {
  let battleLog = "";
  if (passiveTriggers && passiveTriggers.length > 0) {
    battleLog += passiveTriggers.join("\n") + "\n\n";
  }

  if (isCrit) {
    battleLog += `💥 **[CHÍ MẠNG]** Bạn gây **${damage.toLocaleString()}** sát thương lên boss!\n`;
  } else {
    battleLog += `⚔️ Bạn gây **${damage.toLocaleString()}** sát thương lên boss.\n`;
  }

  if (killedPhase1) {
    battleLog += `☠️ **Đòn hạ gục Phase 1!** Bạn đã đánh bại lớp giáp ngoài của Erdtree Avatar, kích hoạt **Phase 2**!`;
  } else if (activeBoss.hp <= 0) {
    battleLog += `☠️ **Đòn quyết định!** Bạn đã kết liễu boss!`;
  } else {
    if (bossMissed) {
      battleLog += `💨 **NÉ TRÁNH!** Bạn né được đòn đánh trả từ boss!\n`;
    } else {
      battleLog += `💥 Boss phản công gây **${bossDamage}** sát thương lên bạn!\n`;
    }

    if (participant.hp <= 0) {
      const reviveText = user.rpg?.godsetBackup ? "miễn phí" : "bằng 1,000 <:cokecy:1509951335016173662>";
      battleLog += `🥀 **HẠ GỤC!** Bạn đã bị boss đánh gục! Cần 30s hồi sức hoặc hồi sinh ngay ${reviveText}.`;
      if (bossHealed && bossHealed > 0) {
        battleLog += `\n🚨 **[HỒI PHỤC]** Boss hấp thụ sinh mệnh của bạn và hồi phục **${bossHealed.toLocaleString()}** HP (20% lượng HP đã mất)!`;
      }
    }
  }

  return new EmbedBuilder()
    .setColor(activeBoss.hp <= 0 ? "#57F287" : participant.hp <= 0 ? "#ED4245" : rpgClass.color)
    .setTitle(`${activeBoss.boss.emoji} ${activeBoss.boss.name} - Nhật Ký Trận Đấu`)
    .setDescription(battleLog)
    .addFields(
      {
        name: "Nhân vật",
        value:
          `Lớp nhân vật: **${rpgClass.name}**\n` +
          `HP của bạn: **${Math.max(0, participant.hp).toLocaleString()} / ${maxHp.toLocaleString()}**\n` +
          `EXP: **${user.rpg.exp}/${getRpgXpNeeded(user.rpg.level)}**`,
        inline: true,
      },
      {
        name: "Lượt đánh boss",
        value:
          `Tổng lượt: **${participant.attacks}**\n` +
          `Phí lượt này: **${isPaidAttack ? `${paidAttackCost.toLocaleString()} <:cokecy:1509951335016173662>` : "Miễn phí"}**\n` +
          `Coke hiện có: **${user.coke.toLocaleString()}** <:cokecy:1509951335016173662>`,
        inline: true,
      },
    );
};

const updateBossMessage = async (channel, activeBoss, forceNewMessage = false) => {
  if (!activeBoss.updateQueue) {
    activeBoss.updateQueue = Promise.resolve();
  }

  const runUpdate = async () => {
    activeBoss.updateQueue = activeBoss.updateQueue
      .then(async () => {
        try {
          if (!activeBoss.messageIds) {
            activeBoss.messageIds = [];
            if (activeBoss.messageId) {
              activeBoss.messageIds.push(activeBoss.messageId);
            }
          }

          const payload = {
            embeds: [buildBossEmbed(activeBoss)],
            components: buildBossComponents(activeBoss),
          };

          const updatedIds = [];
          for (const msgId of activeBoss.messageIds) {
            const msg = await channel.messages.fetch(msgId).catch(() => null);
            if (msg) {
              const editPayload = {
                embeds: payload.embeds,
                components: payload.components,
              };
              if (!activeBoss.imageUrl) {
                editPayload.files = [getAttachment(activeBoss.boss)];
              }
              const edited = await msg.edit(editPayload).catch(() => null);
              if (edited) {
                updatedIds.push(msgId);
                if (!activeBoss.imageUrl) {
                  const attachment = edited.attachments.first();
                  if (attachment) {
                    activeBoss.imageUrl = attachment.url;
                  }
                }
              }
            }
          }
          activeBoss.messageIds = updatedIds;
          activeBoss.lastEditAt = Date.now();
          activeBoss.pendingEdit = false;
        } catch (err) {
          console.error("[RPG_BOSS] Error updating boss message:", err);
        }
      })
      .catch((err) => {
        console.error("[RPG_BOSS] Error in updateBossMessage queue:", err);
      });

    await activeBoss.updateQueue;
  };

  const isDefeated = activeBoss.hp <= 0 || activeBoss.defeated;
  const now = Date.now();
  const throttleDuration = 3500; // 3.5 seconds

  if (forceNewMessage) {
    if (activeBoss.editTimeout) {
      clearTimeout(activeBoss.editTimeout);
      activeBoss.editTimeout = null;
      activeBoss.pendingEdit = false;
    }

    activeBoss.updateQueue = activeBoss.updateQueue.then(async () => {
      try {
        const oldMessageIds = [...(activeBoss.messageIds || [])];
        activeBoss.messageIds = [];

        // Edit old messages to show transitioned status and disable buttons
        for (const msgId of oldMessageIds) {
          const msg = await channel.messages.fetch(msgId).catch(() => null);
          if (msg) {
            const editPayload = {
              embeds: [buildBossEmbed(activeBoss, "transitioned")],
              components: buildBossComponents(activeBoss, "transitioned"),
            };
            if (!activeBoss.imageUrl) {
              editPayload.files = [getAttachment(activeBoss.boss)];
            }
            await msg.edit(editPayload).catch(() => null);
          }
        }

        const payload = {
          embeds: [buildBossEmbed(activeBoss)],
          components: buildBossComponents(activeBoss),
        };
        if (!activeBoss.imageUrl) {
          payload.files = [getAttachment(activeBoss.boss)];
        }
        const newMsg = await channel.send(payload).catch(() => null);
        if (newMsg) {
          activeBoss.messageIds.push(newMsg.id);
          activeBoss.messageId = newMsg.id;
          if (!activeBoss.imageUrl) {
            const attachment = newMsg.attachments.first();
            if (attachment) {
              activeBoss.imageUrl = attachment.url;
            }
          }
        }
        activeBoss.lastEditAt = Date.now();
      } catch (err) {
        console.error("[RPG_BOSS] Error sending new boss message:", err);
      }
    });
    await activeBoss.updateQueue;
    return;
  }

  if (isDefeated) {
    if (activeBoss.editTimeout) {
      clearTimeout(activeBoss.editTimeout);
      activeBoss.editTimeout = null;
      activeBoss.pendingEdit = false;
    }
    await runUpdate();
    return;
  }

  if (activeBoss.pendingEdit) {
    return;
  }

  const lastEdit = activeBoss.lastEditAt || 0;
  const timeSinceLastEdit = now - lastEdit;

  if (timeSinceLastEdit >= throttleDuration) {
    await runUpdate();
  } else {
    activeBoss.pendingEdit = true;
    activeBoss.editTimeout = setTimeout(async () => {
      activeBoss.editTimeout = null;
      await runUpdate();
    }, throttleDuration - timeSinceLastEdit);
  }
};

const performBossAttack = async ({ client, channel, userId }) => {
  const { updateQuestProgress } = require("../../utils/questUtil");
  const activeBoss = client.rpgBosses?.get(channel.id);
  if (!activeBoss || activeBoss.defeated || activeBoss.expired) {
    return {
      ok: false,
      content: "Hiện không có boss nào đang xuất hiện trong channel này.",
    };
  }

  const { user, rpgClass } = await requireRpgCharacter(userId);

  // Prevent race conditions where boss is defeated during the async character load
  if (activeBoss.defeated || activeBoss.expired) {
    return {
      ok: false,
      content: "Boss đã bị tiêu diệt hoặc đã rời đi.",
    };
  }

  if (activeBoss.hp <= 0) {
    // Tự động hồi phục: nếu boss hết HP nhưng chưa kết toán, gọi finishBoss để xử lý phần thưởng
    await finishBoss({ client, channel, activeBoss }).catch((err) => {
      console.error("[RPG_BOSS] Tự động kết toán thất bại:", err);
    });
    return {
      ok: false,
      content: "Boss đã bị hạ gục! Đang tiến hành kết toán phần thưởng và trả quà...",
    };
  }

  const participant = activeBoss.participants.get(userId) || {
    damage: 0,
    attacks: 0,
    lastAttackAt: 0,
    hp: null,
    koUntil: 0,
  };

  const effectiveStats = getEffectiveRpgStats(user);
  const maxHp = 150 + effectiveStats.vigor * 20 + user.rpg.level * 20;

  // Initialize player HP if needed
  if (participant.hp === null) {
    participant.hp = maxHp;
  }

  const now = Date.now();

  // Check if player is KO'd
  if (participant.hp <= 0) {
    if (now >= participant.koUntil) {
      participant.hp = maxHp;
    } else {
      const remainingSeconds = Math.ceil((participant.koUntil - now) / 1000);
      const reviveRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rpg_boss_revive:${channel.id}`)
          .setLabel("Hồi sinh ngay (1,000 Coke)")
          .setStyle(ButtonStyle.Success),
      );

      return {
        ok: false,
        content: `❌ Bạn đã bị hạ gục! Cần chờ thêm **${remainingSeconds}s** để hồi sức hoặc hồi sinh ngay lập tức ${user.rpg?.godsetBackup ? "**miễn phí**" : "bằng **1,000** <:cokecy:1509951335016173662>"}.`,
        components: [reviveRow],
        ephemeral: true,
      };
    }
  }

  const freeAttacks = config.rpg.boss?.free_attacks_per_user ?? 3;
  const hasGodset = !!user.rpg?.godsetBackup;
  const paidAttackCost = hasGodset ? 0 : (config.rpg.boss?.paid_attack_cost ?? 10000);
  const isPaidAttack = participant.attacks >= freeAttacks && !hasGodset;

  if (isPaidAttack && user.coke < paidAttackCost) {
    return {
      ok: false,
      content:
        `${config.emoji.no} Bạn đã dùng hết **${freeAttacks}** lượt đánh boss miễn phí. ` +
        `Lượt tiếp theo cần **${paidAttackCost.toLocaleString()}** <:cokecy:1509951335016173662>, nhưng bạn chỉ có **${user.coke.toLocaleString()}** <:cokecy:1509951335016173662>.`,
    };
  }

  user.rpg.power = calculateRpgPower(user);

  const equipped = getEquippedItems(user);
  const weapon = equipped.weapon;
  const cleanSubType = weapon?.subType ? weapon.subType.toLowerCase().replace(/\s+/g, "") : "";
  const isDungeonWeapon = dungeonKeys.includes(cleanSubType);
  
  if (!activeBoss.effects) {
    activeBoss.effects = {
      armorReduced: 0,
      healReduced: false,
    };
  }

  const passiveTriggers = [];

  const hasTriggered = isDungeonWeapon && Math.random() < 0.45;
  let blueStaffPierce = false;
  let crimsonDaggerPierce = false;
  let holySwordDouble = false;

  if (hasTriggered) {
    if (cleanSubType === "shadowdagger") {
      activeBoss.effects.armorReduced = 0.30;
      passiveTriggers.push(`⚔️ **[Shadow Dagger]** Đã phá giáp boss! Phòng ngự vật lý của boss giảm 30% cho đến hết trận đấu.`);
    } else if (cleanSubType === "poisondagger") {
      participant.nextAttackMult = 1.5;
      passiveTriggers.push(`⚔️ **[Poison Dagger]** Sát khí hội tụ! Đòn đánh tiếp theo của bạn sẽ gây thêm 50% sát thương.`);
    } else if (cleanSubType === "firesword") {
      activeBoss.effects.healReduced = true;
      passiveTriggers.push(`⚔️ **[Fire Sword]** Thiêu đốt boss! Giảm 50% hồi máu của boss cho đến hết trận đấu.`);
    } else if (cleanSubType === "bluestaff") {
      blueStaffPierce = true;
      passiveTriggers.push(`⚔️ **[Blue Staff]** Đòn đánh xuyên 50% kháng phép của boss.`);
    } else if (cleanSubType === "crimsondagger") {
      crimsonDaggerPierce = true;
      passiveTriggers.push(`⚔️ **[Crimson Dagger]** Đòn đánh xuyên 50% phòng ngự vật lý của boss.`);
    } else if (cleanSubType === "holysword") {
      participant.holySwordHits = (participant.holySwordHits || 0) + 1;
      if (participant.holySwordHits >= 3) {
        participant.holySwordHits = 0;
        holySwordDouble = true;
        passiveTriggers.push(`⚔️ **[Holy Sword]** Đòn đánh thứ 3 được ban phước! Gây gấp đôi sát thương.`);
      }
    } else if (cleanSubType === "darksword") {
      participant.bossDamageReduced = true;
      passiveTriggers.push(`⚔️ **[Dark Sword]** Yếu khí bao phủ! Boss bị giảm 30% sát thương gây ra lên bạn lượt này.`);
    } else if (cleanSubType === "darkstaff") {
      const effects = ["burn", "weakness", "pierce"];
      const chosenEffect = effects[Math.floor(Math.random() * effects.length)];
      if (chosenEffect === "burn") {
        activeBoss.effects.healReduced = true;
        passiveTriggers.push(`⚔️ **[Dark Staff]** Hắc ám thiêu đốt! Giảm 50% hồi máu của boss cho đến hết trận đấu.`);
      } else if (chosenEffect === "weakness") {
        participant.bossDamageReduced = true;
        passiveTriggers.push(`⚔️ **[Dark Staff]** Hắc ám suy yếu! Boss bị giảm 30% sát thương gây ra lên bạn lượt này.`);
      } else {
        activeBoss.effects.armorReduced = 0.30;
        passiveTriggers.push(`⚔️ **[Dark Staff]** Hắc ám phá giáp! Phòng ngự vật lý của boss giảm 30% cho đến hết trận đấu.`);
      }
    }
  } else if (cleanSubType === "holysword") {
    participant.holySwordHits = (participant.holySwordHits || 0) + 1;
    if (participant.holySwordHits >= 3) {
      participant.holySwordHits = 0;
    }
  }

  let poisonMult = 1.0;
  if (participant.nextAttackMult) {
    poisonMult = participant.nextAttackMult;
    delete participant.nextAttackMult;
  }

  // Player Damage Calculation
  const isMagical = CLASS_ATTACK_TYPES[user.rpg.classKey] === "magical";
  const baseAttack = isMagical
    ? (effectiveStats.int * 3.5 + effectiveStats.arc * 1.5)
    : (effectiveStats.str * 2.5 + effectiveStats.dex * 1.5);

  const gearPower = calculateRpgPower(user);
  let rawDamage = baseAttack + gearPower;

  // Apply variance
  const attackVariance = 0.85 + Math.random() * 0.3;
  rawDamage *= attackVariance;

  // Crit roll
  const classCritBonus = rpgClass.bonuses?.critRate || 0;
  const critRate = Math.min(
    0.75,
    (effectiveStats.arc * 0.2 + effectiveStats.dex * 0.1) / 100 + classCritBonus,
  );
  const isCrit = Math.random() < critRate;
  const critMult = 1.5 + effectiveStats.dex * 0.002;
  if (isCrit) {
    rawDamage *= critMult;
  }

  // Boss defense mitigation
  let mitigation = 0;
  if (isMagical) {
    let mr = activeBoss.boss.magicResist || 0;
    if (blueStaffPierce) {
      mr *= 0.5;
    }
    mitigation = mr / (mr + 250);
  } else {
    let armor = activeBoss.boss.armor || 0;
    if (activeBoss.effects.armorReduced) {
      armor *= (1 - activeBoss.effects.armorReduced);
    }
    if (crimsonDaggerPierce) {
      armor *= 0.5;
    }
    mitigation = armor / (armor + 250);
  }

  const classBossBonus = rpgClass.bonuses?.bossDamage || 0;
  let finalMult = 1 + classBossBonus;
  if (holySwordDouble) {
    finalMult *= 2.0;
  }
  if (poisonMult > 1.0) {
    finalMult *= poisonMult;
  }

  const damage = Math.max(
    10,
    Math.floor(rawDamage * (1 - mitigation) * finalMult),
  );

  // Green Staff healing
  if (hasTriggered && cleanSubType === "greenstaff") {
    const healAmt = Math.floor(damage * 0.25);
    participant.hp = Math.min(maxHp, participant.hp + healAmt);
    passiveTriggers.push(`💚 **[Green Staff]** Đòn đánh hồi phục cho bạn **${healAmt.toLocaleString()}** HP.`);
  }

  // Charge coke fee if paid
  if (isPaidAttack) {
    user.coke -= paidAttackCost;
  }

  // Boss Counterattack Calculation
  let bossDamage = 0;
  let bossMissed = false;
  let bossHealedAmount = 0;

  if (activeBoss.hp - damage > 0) {
    // Player Evasion
    const playerEvasion = Math.min(
      0.35,
      (effectiveStats.dex * 0.1 + effectiveStats.arc * 0.05) / 100,
    );
    bossMissed = Math.random() < playerEvasion;

    if (!bossMissed) {
      const bossRaw =
        (activeBoss.boss.attackPower || 50) * (0.85 + Math.random() * 0.3);
      let playerMitigation = 0;

      if (activeBoss.boss.damageType === "magical") {
        const playerMR = effectiveStats.mr * 3.0;
        playerMitigation = playerMR / (playerMR + 150);
      } else {
        const playerArmor = effectiveStats.pr * 3.0;
        playerMitigation = playerArmor / (playerArmor + 150);
      }

      bossDamage = Math.max(
        5,
        Math.floor(bossRaw * (1 - playerMitigation)),
      );

      if (participant.bossDamageReduced) {
        bossDamage = Math.floor(bossDamage * 0.70);
        delete participant.bossDamageReduced;
      }

      participant.hp = Math.max(0, participant.hp - bossDamage);

      if (participant.hp <= 0) {
        participant.koUntil = now + 30 * 1000;

        // Special ability of boss_XI: heals 20% of its missing HP when killing a user
        if (activeBoss.boss.key === "boss_XI") {
          const missingHp = activeBoss.maxHp - activeBoss.hp;
          if (missingHp > 0) {
            let healFactor = 0.20;
            if (activeBoss.effects.healReduced) {
              healFactor *= 0.50;
            }
            if (rpgClass?.bonuses?.healReduction) {
              healFactor *= (1 - rpgClass.bonuses.healReduction);
            }
            bossHealedAmount = Math.floor(missingHp * healFactor);
            activeBoss.hp = Math.min(activeBoss.maxHp, activeBoss.hp + bossHealedAmount);
          }
        }
      }
    }
  }

  // Update participant data
  participant.damage += damage;
  participant.attacks += 1;
  participant.lastAttackAt = now;
  activeBoss.participants.set(userId, participant);

  activeBoss.hp = Math.max(0, activeBoss.hp - damage);
  activeBoss.lastHitUserId = userId;

  let killedPhase1 = false;
  if (activeBoss.hp <= 0) {
    if (activeBoss.boss.key === "erdtree-avatar" && activeBoss.phase !== 2) {
      const bossConfig = config.rpg.boss.tiers.find((t) => t.key === "boss_012");
      if (bossConfig) {
        activeBoss.boss = bossConfig;
        activeBoss.maxHp = bossConfig.hp;
        activeBoss.hp = bossConfig.hp;
        activeBoss.phase = 2;
        activeBoss.imageUrl = null; // Reset image to reload phase 2 asset
        killedPhase1 = true;

        await channel.send(`🎄🔥 **[PHASE 2 - TIẾN HÓA]** **Erdtree Avatar** gầm lên giận dữ, rũ bỏ lớp vỏ gỗ khô héo và tiến hóa sang **Phase 2: ${bossConfig.name}**! Sức mạnh của nó đã gia tăng vượt trội!`);
        await updateBossMessage(channel, activeBoss, true);
      }
    } else if (activeBoss.boss.key === "boss_XII" && activeBoss.phase !== 2) {
      const bossConfig = config.rpg.boss.tiers.find((t) => t.key === "boss_XIIa");
      if (bossConfig) {
        activeBoss.boss = bossConfig;
        activeBoss.maxHp = bossConfig.hp;
        activeBoss.hp = bossConfig.hp;
        activeBoss.phase = 2;
        activeBoss.imageUrl = null; // Reset image to reload phase 2 asset
        killedPhase1 = true;

        await channel.send(`🦋🪷 **[PHASE 2 - HỒI SINH]** **Malenia** cởi bỏ lớp giáp sắt, rũ đôi cánh bướm mang theo làn gió hoa đỏ rực rỡ và hồi sinh dưới dạng **${bossConfig.name}**!`);
        await updateBossMessage(channel, activeBoss, true);
      }
    }
  }

  await user.save();
  await updateQuestProgress(userId, "boss_damage", damage, channel);
  await updateBossMessage(channel, activeBoss);

  try {
    const SpawnedBoss = require("../../models/SpawnedBoss");
    const participantsObj = {};
    for (const [uid, part] of activeBoss.participants.entries()) {
      participantsObj[uid] = part;
    }
    const updateData = {
      hp: activeBoss.hp,
      maxHp: activeBoss.maxHp,
      boss: activeBoss.boss,
      phase: activeBoss.phase || 1,
      effects: activeBoss.effects || { armorReduced: 0, healReduced: false },
      lastHitUserId: activeBoss.lastHitUserId,
      participants: participantsObj,
      defeated: activeBoss.hp <= 0,
    };
    if (activeBoss.dbId) {
      await SpawnedBoss.findByIdAndUpdate(activeBoss.dbId, updateData).catch(() => null);
    } else {
      await SpawnedBoss.findOneAndUpdate({ bossId: activeBoss.id }, updateData).catch(() => null);
    }
  } catch (err) {
    console.error("[RPG_BOSS] Failed to update boss attack state in DB:", err);
  }

  const embed = buildAttackResultEmbed({
    activeBoss,
    damage,
    isCrit,
    bossDamage,
    bossMissed,
    participant,
    user,
    rpgClass,
    maxHp,
    isPaidAttack,
    paidAttackCost,
    bossHealed: bossHealedAmount,
    killedPhase1,
    passiveTriggers,
  });

  if (activeBoss.hp <= 0) {
    await finishBoss({ client, channel, activeBoss });
  }

  return { ok: true, embeds: [embed] };
};

const showBossPanel = async (message) => {
  const activeBoss = message.client.rpgBosses?.get(message.channel.id);
  if (!activeBoss || activeBoss.defeated || activeBoss.expired) {
    return message.reply("**Không có boss nào đang kích hoạt trong kênh này!**");
  }

  const payload = {
    embeds: [buildBossEmbed(activeBoss)],
    components: buildBossComponents(activeBoss),
  };

  if (!activeBoss.imageUrl) {
    payload.files = [getAttachment(activeBoss.boss)];
  }

  const replyMsg = await message.reply(payload).catch(() => null);
  if (replyMsg) {
    if (!activeBoss.messageIds) {
      activeBoss.messageIds = [];
      if (activeBoss.messageId) {
        activeBoss.messageIds.push(activeBoss.messageId);
      }
    }
    activeBoss.messageIds.push(replyMsg.id);

    if (!activeBoss.imageUrl) {
      const attachment = replyMsg.attachments.first();
      if (attachment) {
        activeBoss.imageUrl = attachment.url;
      }
    }
  }
};

const handleFightInteraction = async (interaction) => {
  const [, channelId] = interaction.customId.split(":");
  const channel = await interaction.client.channels
    .fetch(channelId || interaction.channelId)
    .catch(() => null);

  if (!channel || !channel.isTextBased()) {
    return interaction.reply({
      content: "Không tìm thấy channel boss.",
      flags: 64,
    });
  }

  const activeBoss = interaction.client.rpgBosses?.get(channel.id);
  if (!activeBoss || activeBoss.defeated || activeBoss.expired) {
    return interaction.reply({
      content: "Boss đã bị tiêu diệt hoặc đã rời đi.",
      flags: 64,
    });
  }

  // Defer update to acknowledge interaction immediately and prevent spinner
  await interaction.deferUpdate().catch(() => {});

  const result = await performBossAttack({
    client: interaction.client,
    channel,
    userId: interaction.user.id,
  });

  if (!result.ok) {
    await interaction.followUp({
      content: result.content,
      components: result.components || [],
      flags: 64,
    }).catch(() => {});
  }
};

const handleReviveInteraction = async (interaction) => {
  const [, channelId] = interaction.customId.split(":");
  const channel = await interaction.client.channels
    .fetch(channelId || interaction.channelId)
    .catch(() => null);

  if (!channel || !channel.isTextBased()) {
    return interaction.reply({
      content: "Không tìm thấy channel boss.",
      flags: 64,
    });
  }

  const activeBoss = interaction.client.rpgBosses?.get(channel.id);
  if (!activeBoss || activeBoss.defeated || activeBoss.expired) {
    return interaction.reply({
      content: "Boss đã bị tiêu diệt hoặc đã rời đi.",
      flags: 64,
    });
  }

  await interaction.deferReply({ flags: 64 }).catch(() => {});

  const { user } = await requireRpgCharacter(interaction.user.id);
  const participant = activeBoss.participants.get(interaction.user.id);

  if (!participant || participant.hp > 0) {
    return interaction.editReply({
      content: "Bạn không ở trạng thái hạ gục.",
    });
  }

  const reviveCost = user.rpg?.godsetBackup ? 0 : 1000;
  if (user.coke < reviveCost) {
    return interaction.editReply({
      content: `❌ Bạn không có đủ Coke để hồi sinh! (Yêu cầu: **${reviveCost.toLocaleString()}** <:cokecy:1509951335016173662>, bạn có: **${user.coke.toLocaleString()}** <:cokecy:1509951335016173662>)`,
    });
  }

  user.coke -= reviveCost;
  const effectiveStats = getEffectiveRpgStats(user);
  const maxHp = 150 + effectiveStats.vigor * 20 + user.rpg.level * 20;

  participant.hp = maxHp;
  participant.koUntil = 0;
  activeBoss.participants.set(interaction.user.id, participant);

  try {
    const SpawnedBoss = require("../../models/SpawnedBoss");
    const participantsObj = {};
    for (const [uid, part] of activeBoss.participants.entries()) {
      participantsObj[uid] = part;
    }
    if (activeBoss.dbId) {
      await SpawnedBoss.findByIdAndUpdate(activeBoss.dbId, { participants: participantsObj }).catch(() => null);
    } else {
      await SpawnedBoss.findOneAndUpdate({ bossId: activeBoss.id }, { participants: participantsObj }).catch(() => null);
    }
  } catch (err) {
    console.error("[RPG_BOSS] Failed to update boss revive status in DB:", err);
  }

  await user.save();

  return interaction.editReply({
    content: `✅ Bạn đã hồi sinh thành công bằng **1,000** <:cokecy:1509951335016173662>! HP hiện tại: **${maxHp.toLocaleString()}**. Hãy click lại nút **Fight!** để tiếp tục tấn công boss.`,
  });
};

module.exports = {
  name: "boss",
  aliases: ["worldboss", "wb", "xboss"],
  description: "Xem World Boss đang xuất hiện trong channel.",
  usage: `${config.prefix}boss`,
  examples: [{ intent: "Xem boss", command: `${config.prefix}boss` }],
  execute: showBossPanel,
  handleFightInteraction,
  handleReviveInteraction,
  performBossAttack,
  finishBoss,
};
