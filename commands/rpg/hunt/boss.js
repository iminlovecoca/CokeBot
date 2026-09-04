const BaseCommand = require("../../../core/BaseCommand");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} = require("discord.js");
const config = require("../../../data/config");
const {
  buildBossComponents,
  buildBossEmbed,
  buildBossComponentsV2,
  getAttachment,
  healthBar,
} = require("../../../features/rpgBossSpawner");
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
  getEquippedPet,
  petAttackDamage,
  getWeaponPower,
  dungeonKeys,
  getDungeonWeaponKey,
  getWeaponSetBonus,
} = require("../../../utils/rpgUtil");
const { triggerWorldBossPassive, isLockedWeapon } = require("../../../utils/rpgPassiveUtil");
const { addPetXp, getBossXp } = require("../../../utils/petXpUtil");
const { getRpgColor, formatRpgFooter, formatRpgTitle, safeDeferUpdate, safeInteractionCall, safeInteractionEditReply, safeInteractionFollowUp, safeInteractionReply } = require("../../../utils/rpgUi");
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
const getAttachmentId = (activeBoss) => {
  if (!activeBoss) return null;
  if (activeBoss.attachmentId) return activeBoss.attachmentId;
  if (activeBoss.imageUrl) {
    try {
      const cleanUrl = activeBoss.imageUrl.split("?")[0];
      const parts = cleanUrl.split("/");
      const index = parts.indexOf("attachments");
      if (index !== -1 && parts[index + 2]) {
        return parts[index + 2];
      }
    } catch (e) {
      console.warn("[RPG_BOSS] Failed to parse attachmentId from imageUrl:", e.message);
    }
  }
  return null;
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
    .setColor(topBonus ? topBonus.color : isLastHit ? getRpgColor("warning") : (rankColor || getRpgColor("success")))
    .setAuthor({
      name: discordUser.displayName || discordUser.username,
      iconURL: discordUser.displayAvatarURL({ dynamic: true })
    })
    .setTitle(formatRpgTitle(`Thưởng đánh boss • ${boss.name}`, boss.emoji || "👹"))
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
    )
    .setFooter(formatRpgFooter(isLastHit ? "Đòn kết liễu • thưởng thêm đã áp dụng" : "Phần thưởng tham gia đã được gửi qua DM"));
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
    const fieldName = (boss.key === "hexia" || boss.key === "godhexa") ? "Vật phẩm Event nhận được" : "Đá nâng cấp nhận được";
    embed.addFields({
      name: fieldName,
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
const finishBoss = async ({ client, channel, activeBoss, interaction = null }) => {
  if (activeBoss.rewarded) return;
  activeBoss.rewarded = true;
  activeBoss.defeated = true;
  if (activeBoss.expireTimer) clearTimeout(activeBoss.expireTimer);
  client.rpgBosses.delete(activeBoss.channelId);
  client.emit("rpgBossDefeated", activeBoss);
  if (activeBoss.updateQueue) {
    await activeBoss.updateQueue.catch(() => null);
  }
  const SpawnedBoss = require("../../../models/SpawnedBoss");
  let dbBoss = null;
  if (activeBoss.dbId) {
    dbBoss = await SpawnedBoss.findById(activeBoss.dbId).exec().catch(() => null);
  } else {
    dbBoss = await SpawnedBoss.findOne({ bossId: activeBoss.id }).exec().catch(() => null);
  }
  const rewardedUserIds = dbBoss?.rewardedUserIds || [];
  const TWO_PHASE_BOSS_KEYS = ["erdtree-avatar", "boss_XII", "godzila", "diablo"];
  const isTwoPhaseBoss = TWO_PHASE_BOSS_KEYS.includes(activeBoss.boss.key);
  const twoPhaseRewardMult = isTwoPhaseBoss ? 1.2 : 1.0;
  const bossRankKey = activeBoss.boss.rank || "thuong";
  const rankReward = config.rpg.boss?.bossRankRewards?.[bossRankKey] || {
    label: "Cấp Thường", emoji: "⚔️", color: "#95A5A6",
    participantRarities: ["Epic"],
    lastHitRarities: ["Epic"],
    cokeMin: 550, cokeMax: 1100,
    lastHitCokeMin: 2200, lastHitCokeMax: 5500,
    expMult: 1.05, lastHitExpMult: 1.55,
  };
  const rollRarityForBoss = (rankKey, type) => {
    const r = Math.random() * 100;
    const typeLower = String(type || "").toLowerCase();
    const effectiveR = isTwoPhaseBoss ? r * 0.8 : r;
    if (rankKey === "thuong" || rankKey === "than") {
      return effectiveR < 10 ? "Legendary" : "Epic";
    }
    if (rankKey === "rong") {
      if (effectiveR < 5) return "Mythic";
      if (effectiveR < 25) return "Legendary";
      return "Epic";
    }
    if (rankKey === "thuongnhan") {
      if (typeLower === "participant") {
        if (effectiveR < 1) return "Ancient";
        if (effectiveR < 15) return "Mythic";
        return "Legendary";
      }
      if (typeLower === "lasthit") {
        if (effectiveR < 1) return "Divine";
        if (effectiveR < 5) return "Ancient";
        if (effectiveR < 25) return "Mythic";
        return "Legendary";
      }
    }
    return null;
  };
  const baseExp = activeBoss.boss.exp || 100;
  const sortedByDamage = [...activeBoss.participants.entries()]
    .sort(([, a], [, b]) => b.damage - a.damage);
  const topDamageConfigs = rankReward.topDamageRewards || [
    { rank: 1, cokeBonus: 3000, wcBonus: 0 },
    { rank: 2, cokeBonus: 1500, wcBonus: 0 },
    { rank: 3, cokeBonus: 800, wcBonus: 0 },
  ];
  const TOP3_BONUS = [
    {
      rank: 1,
      label: "🥇 Top 1 Sát Thương",
      expBonus: Math.floor(baseExp * 0.5 * twoPhaseRewardMult),
      cokeBonus: Math.floor((topDamageConfigs[0]?.cokeBonus ?? 3000) * twoPhaseRewardMult),
      wcBonus: topDamageConfigs[0]?.wcBonus ?? 5,
      color: "#FFD700",
    },
    {
      rank: 2,
      label: "🥈 Top 2 Sát Thương",
      expBonus: Math.floor(baseExp * 0.25 * twoPhaseRewardMult),
      cokeBonus: Math.floor((topDamageConfigs[1]?.cokeBonus ?? 1500) * twoPhaseRewardMult),
      wcBonus: topDamageConfigs[1]?.wcBonus ?? 2,
      color: "#C0C0C0",
    },
    {
      rank: 3,
      label: "🥉 Top 3 Sát Thương",
      expBonus: Math.floor(baseExp * 0.1 * twoPhaseRewardMult),
      cokeBonus: Math.floor((topDamageConfigs[2]?.cokeBonus ?? 800) * twoPhaseRewardMult),
      wcBonus: topDamageConfigs[2]?.wcBonus ?? 0,
      color: "#CD7F32",
    },
  ];
  const topBonusMap = new Map();
  for (let i = 0; i < Math.min(3, sortedByDamage.length); i++) {
    const [uid] = sortedByDamage[i];
    topBonusMap.set(uid, TOP3_BONUS[i]);
  }
  const participantEntries = [...activeBoss.participants.entries()].filter(
    ([userId]) => {
      if (rewardedUserIds.includes(userId)) {
        console.log(`[RPG_BOSS] Skipping already rewarded user ${userId} for boss ${activeBoss.id}`);
        return false;
      }
      return true;
    }
  );
  const participantResults = await Promise.all(
    participantEntries.map(([userId, participant]) => (async () => {
      try {
        const { user, rpgClass } = await requireRpgCharacter(userId);
        const isLastHit = userId === activeBoss.lastHitUserId;
        const gears = [];
        const isHexia = activeBoss.boss.key === "hexia";
        const isGodhexa = activeBoss.boss.key === "godhexa";
        const stonesDropped = [];
        let keyDropped = false;
        let expGain = 0;
        let cokeGain = 0;
        if (isHexia) {
          const claimed = user.rpg.claimedEvents || [];
          if (!claimed.includes("hexia_first_clear")) {
            const axesnakeGear = await generateRpgGearDrop(user, {
              forceDrop: true,
              slot: "weapon",
              subType: "Axesnake",
              rarity: "Mythic",
              fromEvent: true
            });
            if (axesnakeGear) {
              axesnakeGear.power = 1450;
              addRpgGearToUser(user, axesnakeGear);
              gears.push(axesnakeGear);
            }
            if (!user.inventory) user.inventory = new Map();
            const curSouls = user.inventory.get("souls") || 0;
            user.inventory.set("souls", curSouls + 80);
            user.markModified("inventory");
            user.rpg.claimedEvents.push("hexia_first_clear");
            user.markModified("rpg");
            expGain = 2000;
            cokeGain = 5000;
            addRpgExp(user.rpg, expGain);
            user.coke += cokeGain;
            stonesDropped.push({
              id: "souls",
              name: "Linh Hồn",
              emoji: "<:souls:1518749776538243082>",
              quantity: 80
            });
          } else {
            expGain = 2000;
            cokeGain = 5000;
            addRpgExp(user.rpg, expGain);
            user.coke += cokeGain;
          }
        } else if (isGodhexa) {
          if (!user.inventory) user.inventory = new Map();
          const curSouls = user.inventory.get("souls") || 0;
          user.inventory.set("souls", curSouls + 360);
          const curPieces = user.inventory.get("hexpiece") || 0;
          user.inventory.set("hexpiece", curPieces + 1);
          user.markModified("inventory");
          expGain = 5000;
          cokeGain = 10000;
          addRpgExp(user.rpg, expGain);
          user.coke += cokeGain;
          stonesDropped.push(
            {
              id: "souls",
              name: "Linh Hồn",
              emoji: "<:souls:1518749776538243082>",
              quantity: 360
            },
            {
              id: "hexpiece",
              name: "Mảnh Vũ Khí Hex",
              emoji: "<:piece:1518749774403338433>",
              quantity: 1
            }
          );
        } else {
          const rolledRarity1 = rollRarityForBoss(bossRankKey, "participant");
          const gear1 = await generateRpgGearDrop(user, {
            forceDrop: true,
            rarity: rolledRarity1 || undefined,
            allowedRarities: rolledRarity1 ? undefined : rankReward.participantRarities,
          });
          if (gear1) {
            if (!(activeBoss.boss.key === "boss_XI" && activeBoss.allowSoulRealm === true && isLastHit)) {
              addRpgGearToUser(user, gear1);
            }
            gears.push(gear1);
          }
          if (isLastHit) {
            const rolledRarity2 = rollRarityForBoss(bossRankKey, "lasthit");
            const gear2 = await generateRpgGearDrop(user, {
              forceDrop: true,
              rarity: rolledRarity2 || undefined,
              allowedRarities: rolledRarity2 ? undefined : rankReward.lastHitRarities,
            });
            if (gear2) {
              if (!(activeBoss.boss.key === "boss_XI" && activeBoss.allowSoulRealm === true && isLastHit)) {
                addRpgGearToUser(user, gear2);
              }
              gears.push(gear2);
            }
            if (rankReward.lastHitBonusRarities) {
              const gear3 = await generateRpgGearDrop(user, {
                forceDrop: true,
                allowedRarities: rankReward.lastHitBonusRarities,
              });
              if (gear3) {
                if (!(activeBoss.boss.key === "boss_XI" && activeBoss.allowSoulRealm === true && isLastHit)) {
                  addRpgGearToUser(user, gear3);
                }
                gears.push(gear3);
              }
            }
          }
          const expMult = isLastHit ? rankReward.lastHitExpMult : rankReward.expMult;
          expGain = Math.floor(
            baseExp * expMult * (1 + (rpgClass.bonuses?.expGain || 0)),
          );
          if (isTwoPhaseBoss) {
            expGain = Math.floor(expGain * 1.2);
          }
          if (!(activeBoss.boss.key === "boss_XI" && activeBoss.allowSoulRealm === true && isLastHit)) {
            addRpgExp(user.rpg, expGain);
          }
          cokeGain = isLastHit
            ? rankReward.lastHitCokeMin + Math.floor(Math.random() * (rankReward.lastHitCokeMax - rankReward.lastHitCokeMin + 1))
            : rankReward.cokeMin + Math.floor(Math.random() * (rankReward.cokeMax - rankReward.cokeMin + 1));
          if (isTwoPhaseBoss) {
            cokeGain = Math.floor(cokeGain * 1.2);
          }
          if (!(activeBoss.boss.key === "boss_XI" && activeBoss.allowSoulRealm === true && isLastHit)) {
            user.coke += cokeGain;
          }
          if (bossRankKey === "rong" || bossRankKey === "thuongnhan") {
            const dropCount = Math.floor(Math.random() * 2) + 1;
            const stoneOptions = bossRankKey === "rong"
              ? ["somber-4", "somber-5", "somber-6"]
              : ["somber-7", "somber-8", "somber-9"];
            if (!user.inventory) {
              user.inventory = new Map();
            }
            for (let i = 0; i < dropCount; i++) {
              const stoneId = stoneOptions[Math.floor(Math.random() * stoneOptions.length)];
              if (!(activeBoss.boss.key === "boss_XI" && activeBoss.allowSoulRealm === true && isLastHit)) {
                const currentQty = user.inventory.get(stoneId) || 0;
                user.inventory.set(stoneId, currentQty + 1);
              }
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
            if (!(activeBoss.boss.key === "boss_XI" && activeBoss.allowSoulRealm === true && isLastHit)) {
              user.markModified("inventory");
            }
          }
          if (bossRankKey === "thuongnhan" && isLastHit) {
            if (Math.random() < 0.5) {
              if (!(activeBoss.boss.key === "boss_XI" && activeBoss.allowSoulRealm === true && isLastHit)) {
                if (!user.inventory) {
                  user.inventory = new Map();
                }
                const currentQty = user.inventory.get("dungeonkey") || 0;
                user.inventory.set("dungeonkey", currentQty + 1);
                user.markModified("inventory");
              }
              keyDropped = true;
            }
          }
        }
        let topBonus = null;
        if (topBonusMap.has(userId)) {
          topBonus = topBonusMap.get(userId);
          if (!(activeBoss.boss.key === "boss_XI" && activeBoss.allowSoulRealm === true && isLastHit)) {
            if (topBonus.expBonus > 0) {
              addRpgExp(user.rpg, topBonus.expBonus);
            }
            if (topBonus.cokeBonus > 0) {
              user.coke += topBonus.cokeBonus;
            }
            if (topBonus.wcBonus > 0) {
              if (!user.inventory) user.inventory = new Map();
              const currentWc = user.inventory.get("wc") || 0;
              user.inventory.set("wc", currentWc + topBonus.wcBonus);
              user.markModified("inventory");
            }
          }
          const discordUser = await client.users.fetch(userId).catch(() => null);
          var top3Result = {
            rank: topBonus.rank,
            label: topBonus.label,
            color: topBonus.color,
            userId,
            displayName: discordUser?.displayName || discordUser?.username || `<@${userId}>`,
            damage: participant.damage,
            expBonus: topBonus.expBonus,
            cokeBonus: topBonus.cokeBonus,
            wcBonus: topBonus.wcBonus,
          };
        }
        if (activeBoss.boss.key === "boss_XI" && activeBoss.allowSoulRealm === true && isLastHit) {
          activeBoss.lastHitEscrow = {
            userId,
            gears,
            expGain,
            cokeGain,
            stonesDropped,
            keyDropped,
            topBonus
          };
          return top3Result || null;
        }
        user.rpg.power = calculateRpgPower(user);
        await user.save();
        if (dbBoss) {
          await SpawnedBoss.findByIdAndUpdate(dbBoss._id, {
            $addToSet: { rewardedUserIds: userId }
          }).catch(() => null);
        }
        const { updateQuestProgress } = require("../../../utils/questUtil");
        await updateQuestProgress(user, "boss_fight", 1, channel);
        await updateQuestProgress(user, "exp_gain", expGain, channel);
        if (isLastHit) {
          await updateQuestProgress(user, "boss_last_hit", 1, channel);
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
        return top3Result || null;
      } catch (error) {
        console.warn("[RPG_BOSS] Reward failed:", userId, error.message);
        return null;
      }
    })())
  );
  const top3Results = participantResults.filter(Boolean);
  if (top3Results.length > 0) {
    try {
      top3Results.sort((a, b) => a.rank - b.rank);
      const top3Lines = top3Results.map(t => {
        let bonusText = `+${t.cokeBonus.toLocaleString()} <:cokecy:1509951335016173662>  +${t.expBonus.toLocaleString()} EXP`;
        if (t.wcBonus > 0) bonusText += `  <:crate:1512793698025603282> x${t.wcBonus}`;
        return `${t.label}: **${t.displayName}** — ${t.damage.toLocaleString()} ST\n┗ Thưởng thêm: ${bonusText}`;
      }).join("\n\n");
      const top3Embed = new EmbedBuilder()
        .setColor(getRpgColor("reward"))
        .setTitle(formatRpgTitle(`Bảng xếp hạng sát thương • ${activeBoss.boss.name}`, activeBoss.boss.emoji || "🏆"))
        .setDescription(top3Lines)
        .setFooter(formatRpgFooter("Phần thưởng top đã được gửi qua DM"));
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
        content: "",
        embeds: [],
        components: [buildBossComponentsV2(activeBoss, "defeated")],
        flags: MessageFlags.IsComponentsV2,
        attachments: [],
        skipV2: true,
      };
      if (!activeBoss.imageUrl) {
        payload.files = [getAttachment(activeBoss.boss)];
      }
      if (interaction && msgId === interaction.message?.id) {
        const edited = await safeInteractionEditReply(interaction, payload);
        if (!edited) {
          await bossMessage.edit(payload).catch(() => null);
        }
      } else {
        await bossMessage.delete().catch(() => null);
        await channel.send({
          content: "",
          embeds: [],
          components: payload.components,
          flags: MessageFlags.IsComponentsV2,
          files: [getAttachment(activeBoss.boss)],
        }).catch(() => null);
      }
    }
  }
  try {
    const SpawnedBoss = require("../../../models/SpawnedBoss");
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
      poise: activeBoss.poise,
      poiseMax: activeBoss.poiseMax,
      poiseBroken: activeBoss.poiseBroken,
    };
    if (activeBoss.dbId) {
      await SpawnedBoss.findByIdAndUpdate(activeBoss.dbId, updateData).catch(() => null);
    } else {
      await SpawnedBoss.findOneAndUpdate({ bossId: activeBoss.id }, updateData).catch(() => null);
    }
  } catch (err) {
    console.error("[RPG_BOSS] Failed to save final finishBoss state to DB:", err);
  }
  if (activeBoss.lastHitEscrow) {
    const escrow = activeBoss.lastHitEscrow;
    setImmediate(async () => {
      await startSoulRealmInvite(client, channel, activeBoss, escrow);
    });
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
  discordUser,
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
  const embed = new EmbedBuilder()
    .setColor(activeBoss.hp <= 0 ? getRpgColor("success") : participant.hp <= 0 ? getRpgColor("danger") : rpgClass.color)
    .setTitle(formatRpgTitle(`${activeBoss.boss.name} • nhật ký lượt đánh`, activeBoss.boss.emoji || "👹"))
    .setDescription(battleLog);
  if (discordUser) {
    embed.setAuthor({
      name: discordUser.displayName || discordUser.username,
      iconURL: discordUser.displayAvatarURL({ dynamic: true })
    });
  }
  return embed
    .addFields(
      {
        name: "🧙 Nhân vật",
        value:
          `Lớp nhân vật: **${rpgClass.name}**\n` +
          `HP của bạn: **${Math.max(0, participant.hp).toLocaleString()} / ${maxHp.toLocaleString()}**\n` +
          `EXP: **${user.rpg.exp}/${getRpgXpNeeded(user.rpg.level)}**`,
        inline: true,
      },
      {
        name: "⚔️ Lượt đánh boss",
        value:
          `Tổng lượt: **${participant.attacks}**\n` +
          `Phí lượt này: **${isPaidAttack ? `${paidAttackCost.toLocaleString()} <:cokecy:1509951335016173662>` : "Miễn phí"}**\n` +
          `Coke hiện có: **${user.coke.toLocaleString()}** <:cokecy:1509951335016173662>`,
        inline: true,
      },
    );
};
const updateBossMessage = async (channel, activeBoss, forceNewMessage = false, interaction = null) => {
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
            content: "",
            embeds: [],
            components: [buildBossComponentsV2(activeBoss)],
            flags: MessageFlags.IsComponentsV2,
          };
          const updatedIds = [];
          for (const msgId of activeBoss.messageIds) {
            const msg = channel.messages.cache.get(msgId) || await channel.messages.fetch(msgId).catch(() => null);
            if (msg) {
              const editPayload = {
                content: "",
                embeds: [],
                components: payload.components,
                flags: MessageFlags.IsComponentsV2,
                attachments: [],
                skipV2: true,
              };
              if (!activeBoss.imageUrl) {
                editPayload.files = [getAttachment(activeBoss.boss)];
              }
              let edited = null;
              if (interaction && msgId === interaction.message?.id) {
                edited = (await safeInteractionEditReply(interaction, editPayload)) ? interaction.message : null;
                if (!edited) {
                  edited = await msg.edit(editPayload).catch(() => null);
                }
              } else {
                await msg.delete().catch(() => null);
                const newMsg = await channel.send({
                  content: "",
                  embeds: [],
                  components: payload.components,
                  flags: MessageFlags.IsComponentsV2,
                  files: [getAttachment(activeBoss.boss)],
                }).catch(() => null);
                if (newMsg) {
                  edited = newMsg;
                }
              }
              if (edited) {
                updatedIds.push(edited.id);
                activeBoss.messageId = edited.id;
                if (!activeBoss.imageUrl) {
                  const attachment = edited.attachments.first();
                  if (attachment) {
                    activeBoss.imageUrl = attachment.url;
                    activeBoss.attachmentId = attachment.id;
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
  const throttleDuration = 2000; 
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
        for (const msgId of oldMessageIds) {
          const msg = channel.messages.cache.get(msgId) || await channel.messages.fetch(msgId).catch(() => null);
          if (msg) {
            const editPayload = {
              content: "",
              embeds: [],
              components: [buildBossComponentsV2(activeBoss, "transitioned")],
              flags: MessageFlags.IsComponentsV2,
              attachments: [],
              skipV2: true,
            };
            if (!activeBoss.imageUrl) {
              editPayload.files = [getAttachment(activeBoss.boss)];
            }
            if (interaction && msgId === interaction.message?.id) {
              const edited = await safeInteractionEditReply(interaction, editPayload);
              if (!edited) {
                await msg.edit(editPayload).catch(() => null);
              }
            } else {
              await msg.delete().catch(() => null);
            }
          }
        }
        const payload = {
          content: "",
          embeds: [],
          components: [buildBossComponentsV2(activeBoss)],
          flags: MessageFlags.IsComponentsV2,
        };
        payload.files = [getAttachment(activeBoss.boss)];
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
const performBossAttack = async ({ client, channel, userId, interaction = null }) => {
  const { updateQuestProgress } = require("../../../utils/questUtil");
  const activeBoss = client.rpgBosses?.get(channel.id);
  if (!activeBoss || activeBoss.defeated || activeBoss.expired) {
    return {
      ok: false,
      content: "Hiện không có boss nào đang xuất hiện trong channel này.",
    };
  }
  const { user, rpgClass } = await requireRpgCharacter(userId);
  if (activeBoss.defeated || activeBoss.expired) {
    return {
      ok: false,
      content: "Boss đã bị tiêu diệt hoặc đã rời đi.",
    };
  }
  if (activeBoss.hp <= 0) {
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
  if (participant.hp === null) {
    participant.hp = maxHp;
  }
  const now = Date.now();
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
  const isEventBoss = activeBoss.boss.key === "hexia" || activeBoss.boss.key === "godhexa";
  const freeAttacks = isEventBoss ? 3 : (config.rpg.boss?.free_attacks_per_user ?? 3);
  const hasGodset = !!user.rpg?.godsetBackup;
  const paidAttackCost = hasGodset ? 0 : (isEventBoss ? 3600 : (config.rpg.boss?.paid_attack_cost ?? 10000));
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
  let cleanSubType = weapon?.subType ? weapon.subType.toLowerCase().replace(/\s+/g, "") : "";
  cleanSubType = getDungeonWeaponKey(weapon?.subType) || cleanSubType;
  if (isLockedWeapon(cleanSubType)) {
    cleanSubType = "";
  }
  const isDungeonWeapon = dungeonKeys.includes(cleanSubType);
  if (!activeBoss.effects) {
    activeBoss.effects = {
      armorReduced: 0,
      healReduced: false,
    };
  }
  const passiveTriggers = [];
  let axesnakeTriggered = false;
  let sunbowTriggered = false;
  let clawhexTriggered = false;
  let spearhexTriggered = false;
  let shieldhexTriggered = false;
  let riverofbloodTriggered = false;
  let bossControlTriggered = false;
  let passiveDamageMultiplier = 1.0;
  const isOdinHammer = cleanSubType === "odinhammer";
  const hasTriggered = isDungeonWeapon && String(weapon?.rarity || "").toLowerCase() !== "common" && (isOdinHammer || Math.random() < 0.45);
  let blueStaffPierce = false;
  let crimsonDaggerPierce = false;
  let holySwordDouble = false;
  if (hasTriggered) {
    if (cleanSubType === "axesnake") {
      axesnakeTriggered = true;
      activeBoss.effects.armorReduced = Math.min(0.9, (activeBoss.effects.armorReduced || 0) + 0.10);
      passiveTriggers.push(`⚔️ **[Axesnake]** Phá 10% giáp của boss! Giáp boss giảm tổng cộng ${(activeBoss.effects.armorReduced * 100).toFixed(0)}% vĩnh viễn.`);
    } else if (cleanSubType === "sunbow") {
      sunbowTriggered = true;
      passiveTriggers.push(`⚔️ **[Sun Bow]** Đòn đánh xuyên 10% giáp vật lý và 10% kháng phép của boss.`);
    } else if (cleanSubType === "clawhex") {
      clawhexTriggered = true;
      passiveTriggers.push(`⚔️ **[Clawhex]** Sát thương kích hoạt hiệu ứng chảy máu, tăng 15% sát thương.`);
    } else if (cleanSubType === "spearhex") {
      spearhexTriggered = true;
      passiveTriggers.push(`⚔️ **[Spearhex]** Đòn đánh xuyên qua phòng ngự, bỏ qua 10% giáp vật lý của boss.`);
    } else if (cleanSubType === "shieldhex") {
      shieldhexTriggered = true;
      passiveTriggers.push(`⚔️ **[Shieldhex]** Khiên Hex sẵn sàng hấp thụ và phản lại 90% sát thương từ đòn đánh của boss.`);
    } else {
      const res = triggerWorldBossPassive(cleanSubType, {
        ...participant,
        weapon,
        effectiveStats,
        gearPower: user.rpg?.power || 0,
      }, activeBoss, passiveTriggers, 1);
      blueStaffPierce = res.blueStaffPierce;
      crimsonDaggerPierce = res.crimsonDaggerPierce;
      holySwordDouble = res.holySwordDouble;
      riverofbloodTriggered = res.riverofbloodTriggered;
      bossControlTriggered = res.controlTriggered;
      passiveDamageMultiplier = res.damageMultiplier || 1.0;
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
  const isMagical = CLASS_ATTACK_TYPES[user.rpg.classKey] === "magical";
  const setBonus = getWeaponSetBonus(user);
  const baseAttack = isMagical
    ? (effectiveStats.int * 3.5 + effectiveStats.arc * 1.5)
    : (effectiveStats.str * 2.5 + effectiveStats.dex * 1.5);
  const gearPower = user.rpg?.power || 0;
  let rawDamage = baseAttack + gearPower;
  if (clawhexTriggered) {
    rawDamage *= 1.15;
  }
  if (passiveDamageMultiplier > 1.0) {
    rawDamage *= passiveDamageMultiplier;
  }
  const attackVariance = 0.85 + Math.random() * 0.3;
  rawDamage *= attackVariance;
  const classCritBonus = rpgClass.bonuses?.critRate || 0;
  const setCritBonus = setBonus?.bonus?.critRate || 0;
  const critRate = Math.min(
    0.85,
    (effectiveStats.arc * 0.2 + effectiveStats.dex * 0.1) / 100 + classCritBonus + setCritBonus,
  );
  const isCrit = Math.random() < critRate;
  const critMult = 1.5 + effectiveStats.dex * 0.002;
  if (isCrit) {
    rawDamage *= critMult;
  }
  let mitigation = 0;
  if (isMagical) {
    let mr = activeBoss.boss.magicResist || 0;
    if (blueStaffPierce) {
      mr *= 0.75;
    }
    if (sunbowTriggered) {
      mr *= 0.90;
    }
    mitigation = mr / (mr + 150 + user.rpg.level * 2);
  } else {
    let armor = activeBoss.boss.armor || 0;
    if (activeBoss.effects.armorReduced) {
      armor *= (1 - activeBoss.effects.armorReduced);
    }
    if (crimsonDaggerPierce) {
      armor *= 0.5;
    }
    if (spearhexTriggered) {
      armor *= 0.90;
    }
    if (sunbowTriggered) {
      armor *= 0.90;
    }
    mitigation = armor / (armor + 150 + user.rpg.level * 2);
  }
  const classBossBonus = rpgClass.bonuses?.bossDamage || 0;
  let finalMult = 1 + classBossBonus;
  if (setBonus?.bonus?.bossDamage) {
    finalMult *= 1 + setBonus.bonus.bossDamage;
  }
  if (holySwordDouble) {
    finalMult *= 2.0;
  }
  if (poisonMult > 1.0) {
    finalMult *= poisonMult;
  }
  let damage = Math.max(
    10,
    Math.floor(rawDamage * (1 - mitigation) * finalMult),
  );
  if (activeBoss.boss.key === "plaxidusax" && !activeBoss.poiseBroken) {
    damage = Math.max(10, Math.floor(damage * 0.85));
  }
  if (user.rpg?.isGodMode) {
    damage = activeBoss.hp;
  }
  if (activeBoss.boss.key === "plaxidusax" && !activeBoss.poiseBroken) {
    let poiseDmg = Math.max(6, Math.floor(damage * 0.00032));
    if (cleanSubType === "greatsword") {
      poiseDmg = Math.max(12, Math.floor(poiseDmg * 1.5));
      passiveTriggers.push(`⚔️ **[Trọng Kiếm]** Đòn đánh nặng phá hủy thêm **${poiseDmg}** Poise của Plaxidusax!`);
    }
    activeBoss.poise = Math.max(0, (activeBoss.poise || 0) - poiseDmg);
    if (activeBoss.poise <= 0) {
      activeBoss.poiseBroken = true;
      passiveTriggers.push(`🛡️ **[PHÁ VỠ POISE]** Đòn đánh đã làm **Plaxidusax** bị quỵ ngã! Boss nhận sát thương bình thường từ giờ.`);
    } else {
      passiveTriggers.push(`🛡️ **[Poise]** Plaxidusax bị giảm **${poiseDmg}** Poise (Còn **${activeBoss.poise}/${activeBoss.poiseMax}**).`);
    }
  }
  if ((hasTriggered && cleanSubType === "greenstaff") || riverofbloodTriggered) {
    let baseHeal = 0;
    if (riverofbloodTriggered) {
      baseHeal = Math.max(1, Math.floor(damage * 0.02));
    } else {
      baseHeal = Math.floor((maxHp - participant.hp) * 0.10);
    }
    participant.hp = Math.min(maxHp, participant.hp + baseHeal);
    const label = riverofbloodTriggered ? "River of Blood" : "Green Staff";
    const emoji = riverofbloodTriggered ? "❤️" : "💚";
    passiveTriggers.push(`${emoji} **[${label}]** Đòn đánh hồi phục cho bạn **${baseHeal.toLocaleString()}** HP.`);
  }
  if (isPaidAttack) {
    user.coke -= paidAttackCost;
  }
  let bossDamage = 0;
  let bossMissed = false;
  let bossHealedAmount = 0;
  if (activeBoss.hp - damage > 0) {
    if (bossControlTriggered) {
      bossMissed = true;
      passiveTriggers.push(`⏳ **${activeBoss.boss.name}** bị gián đoạn, bỏ qua đòn phản công kế tiếp.`);
    } else {
      const playerEvasion = Math.min(
        0.35,
        (effectiveStats.dex * 0.1 + effectiveStats.arc * 0.05) / 100,
      );
      bossMissed = Math.random() < playerEvasion;
    }
    if (!bossMissed) {
      const bossRaw =
        (activeBoss.boss.attackPower || 50) * (0.85 + Math.random() * 0.3);
      let playerMitigation = 0;
      if (activeBoss.boss.damageType === "magical") {
        const playerMR = effectiveStats.mr * 12.0;
        playerMitigation = playerMR / (playerMR + 150);
      } else {
        const playerArmor = effectiveStats.pr * 12.0;
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
      if (shieldhexTriggered) {
        bossDamage = Math.floor(bossDamage * 0.80);
      }
      participant.hp = Math.max(0, participant.hp - bossDamage);
      if (shieldhexTriggered && bossDamage > 0) {
        const shieldhexReflect = Math.floor(bossDamage * 0.90);
        activeBoss.hp = Math.max(0, activeBoss.hp - shieldhexReflect);
        passiveTriggers.push(`🛡️ **[Shieldhex]** Phản lại **${shieldhexReflect.toLocaleString()}** sát thương (90% sát thương nhận vào) về phía Boss.`);
      }
      if (participant.hp <= 0) {
        participant.koUntil = now + 30 * 1000;
        participant.diedAt = now;
        if (activeBoss.boss.key === "boss_XI") {
          const missingHp = activeBoss.maxHp - activeBoss.hp;
          if (missingHp > 0) {
            let healFactor = 0.20;
            if (activeBoss.effects.healReduced && Date.now() < (activeBoss.effects.healReducedUntil || 0)) {
              healFactor *= 0.70;
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
  participant.damage += damage;
  participant.attacks += 1;
  participant.lastAttackAt = now;
  activeBoss.participants.set(userId, participant);
  activeBoss.hp = Math.max(0, activeBoss.hp - damage);
  const equippedPetBoss = getEquippedPet(user);
  if (equippedPetBoss && activeBoss.hp > 0) {
    const petDmg = petAttackDamage(equippedPetBoss, "boss");
    activeBoss.hp = Math.max(0, activeBoss.hp - petDmg);
    participant.damage += petDmg;
  }
  activeBoss.participants.set(userId, participant);
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
        activeBoss.imageUrl = null; 
        killedPhase1 = true;
        await channel.send(`🎄🔥 **[PHASE 2 - TIẾN HÓA]** **Erdtree Avatar** gầm lên giận dữ, rũ bỏ lớp vỏ gỗ khô héo và tiến hóa sang **Phase 2: ${bossConfig.name}**! Sức mạnh của nó đã gia tăng vượt trội!`);
        await updateBossMessage(channel, activeBoss, true, interaction);
      }
    } else if (activeBoss.boss.key === "boss_XII" && activeBoss.phase !== 2) {
      const bossConfig = config.rpg.boss.tiers.find((t) => t.key === "boss_XIIa");
      if (bossConfig) {
        activeBoss.boss = bossConfig;
        activeBoss.maxHp = bossConfig.hp;
        activeBoss.hp = bossConfig.hp;
        activeBoss.phase = 2;
        activeBoss.imageUrl = null; 
        killedPhase1 = true;
        await channel.send(`🦋🪷 **[PHASE 2 - HỒI SINH]** **Malenia** cởi bỏ lớp giáp sắt, rũ đôi cánh bướm mang theo làn gió hoa đỏ rực rỡ và hồi sinh dưới dạng **${bossConfig.name}**!`);
        await updateBossMessage(channel, activeBoss, true, interaction);
      }
    } else if (activeBoss.boss.key === "godzila" && activeBoss.phase !== 2) {
      const bossConfig = config.rpg.boss.tiers.find((t) => t.key === "godzila_p2");
      if (bossConfig) {
        activeBoss.boss = bossConfig;
        activeBoss.maxHp = bossConfig.hp;
        activeBoss.hp = bossConfig.hp;
        activeBoss.phase = 2;
        activeBoss.imageUrl = null; 
        killedPhase1 = true;
        await channel.send(`🐉🔥 **[PHASE 2 - TIẾN HÓA]** **Godzila** gầm vang chấn động trời đất, hấp thụ năng lượng hạt nhân **${bossConfig.name}**!`);
        await updateBossMessage(channel, activeBoss, true, interaction);
      }
    } else if (activeBoss.boss.key === "diablo" && activeBoss.phase !== 2) {
      const bossConfig = config.rpg.boss.tiers.find((t) => t.key === "diablo_p2");
      if (bossConfig) {
        activeBoss.boss = bossConfig;
        activeBoss.maxHp = bossConfig.hp;
        activeBoss.hp = bossConfig.hp;
        activeBoss.phase = 2;
        activeBoss.imageUrl = null; 
        killedPhase1 = true;
        await channel.send(`😈🔥 **[PHASE 2 - TIẾN HÓA]** **Diablo** giải phóng xiềng xích của Địa Ngục, trỗi dậy với hình dạng chân thật **${bossConfig.name}**!`);
        await updateBossMessage(channel, activeBoss, true, interaction);
      }
    }
  }
  await user.save();
  const bossPersistTask = (async () => {
    try {
      const SpawnedBoss = require("../../../models/SpawnedBoss");
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
        poise: activeBoss.poise,
        poiseMax: activeBoss.poiseMax,
        poiseBroken: activeBoss.poiseBroken,
      };
      if (activeBoss.dbId) {
        await SpawnedBoss.findByIdAndUpdate(activeBoss.dbId, updateData).catch(() => null);
      } else {
        await SpawnedBoss.findOneAndUpdate({ bossId: activeBoss.id }, updateData).catch(() => null);
      }
    } catch (err) {
      console.error("[RPG_BOSS] Failed to update boss attack state in DB:", err);
    }
  })();
  await Promise.all([
    updateQuestProgress(user, "boss_damage", damage, channel),
    updateBossMessage(channel, activeBoss, false, interaction),
    bossPersistTask,
  ]);
  const userDiscord =
    client.users.cache.get(userId) ||
    (await client.users.fetch(userId).catch(() => null));
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
    discordUser: userDiscord,
  });
  if (activeBoss.hp <= 0) {
    await finishBoss({ client, channel, activeBoss, interaction });
  }
  return { ok: true, embeds: [embed] };
};
const showBossPanel = async (message) => {
  const activeBoss = message.client.rpgBosses?.get(message.channel.id);
  if (!activeBoss || activeBoss.defeated || activeBoss.expired) {
    return message.reply("**Không có boss nào đang kích hoạt trong kênh này!**");
  }
  const payload = {
    content: "",
    embeds: [],
    components: [buildBossComponentsV2(activeBoss)],
    flags: MessageFlags.IsComponentsV2,
  };
  payload.files = [getAttachment(activeBoss.boss)];
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
  const finalChannelId = channelId || interaction.channelId;
  const activeBoss = interaction.client.rpgBosses?.get(finalChannelId);
  if (!activeBoss || activeBoss.defeated || activeBoss.expired) {
    return safeInteractionReply(interaction, {
      content: "Boss đã bị tiêu diệt hoặc đã rời đi.",
      flags: 64,
    });
  }
  const channel = await interaction.client.channels
    .fetch(finalChannelId)
    .catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return safeInteractionReply(interaction, {
      content: "Không tìm thấy channel boss.",
      flags: 64,
    });
  }
  if (!(await safeDeferUpdate(interaction))) return;
  if (!activeBoss.attackQueue) {
    activeBoss.attackQueue = Promise.resolve();
  }
  activeBoss.attackQueue = activeBoss.attackQueue.then(async () => {
    if (activeBoss.defeated || activeBoss.expired || activeBoss.hp <= 0) {
      return;
    }
    try {
      const result = await performBossAttack({
        client: interaction.client,
        channel,
        userId: interaction.user.id,
        interaction,
      });
      if (!result.ok) {
        await safeInteractionFollowUp(interaction, {
          content: result.content,
          components: result.components || [],
          flags: 64,
        });
      }
    } catch (err) {
      console.error("[RPG_BOSS] Error during queued attack:", err);
    }
  });
};
const handleReviveInteraction = async (interaction) => {
  const [, channelId] = interaction.customId.split(":");
  const channel = await interaction.client.channels
    .fetch(channelId || interaction.channelId)
    .catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return safeInteractionReply(interaction, {
      content: "Không tìm thấy channel boss.",
      flags: 64,
    });
  }
  const activeBoss = interaction.client.rpgBosses?.get(channel.id);
  if (!activeBoss || activeBoss.defeated || activeBoss.expired) {
    return safeInteractionReply(interaction, {
      content: "Boss đã bị tiêu diệt hoặc đã rời đi.",
      flags: 64,
    });
  }
  if (!(await safeInteractionCall(interaction, "deferReply", { flags: 64 }))) return;
  const { user } = await requireRpgCharacter(interaction.user.id);
  const participant = activeBoss.participants.get(interaction.user.id);
  if (!participant || participant.hp > 0) {
    return safeInteractionEditReply(interaction, {
      content: "Bạn không ở trạng thái hạ gục.",
    });
  }
  if (activeBoss.boss.key === "diablo" || activeBoss.boss.key === "diablo_p2") {
    const elapsed = Date.now() - (participant.diedAt || 0);
    if (elapsed < 10000) {
      const waitRemaining = Math.ceil((10000 - elapsed) / 1000);
      return safeInteractionEditReply(interaction, {
        content: `❌ **Sức mạnh hắc ám của Diablo** cấm bạn hồi sinh ngay lập tức! Bạn phải chờ thêm **${waitRemaining}s** mới có thể hồi sinh.`,
      });
    }
  }
  const reviveCost = user.rpg?.godsetBackup ? 0 : 1000;
  if (user.coke < reviveCost) {
    return safeInteractionEditReply(interaction, {
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
    const SpawnedBoss = require("../../../models/SpawnedBoss");
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
  return safeInteractionEditReply(interaction, {
    content: `✅ Bạn đã hồi sinh thành công bằng **1,000** <:cokecy:1509951335016173662>! HP hiện tại: **${maxHp.toLocaleString()}**. Hãy click lại nút **Đánh boss** để tiếp tục tấn công boss.`,
  });
};
const fs = require("fs");
const path = require("path");
const startSoulRealmInvite = async (client, channel, activeBoss, escrow) => {
  const userId = escrow.userId;
  const userDiscord = await client.users.fetch(userId).catch(() => null);
  const displayName = userDiscord ? userDiscord.displayName || userDiscord.username : `<@${userId}>`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`soul_invite_enter:${userId}`)
      .setLabel("Tiến vào 🚪")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`soul_invite_retreat:${userId}`)
      .setLabel("Rút lui 🏳️")
      .setStyle(ButtonStyle.Secondary)
  );
  const container = new ContainerBuilder()
    .setAccentColor(0x7C5CFF)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ✨ CÕI LINH HỒN MỞ RA! ✨\n` +
        `Người được chọn hãy đưa ra quyết định của mình tiến vào để chiếm hữu linh cửu của Malzareth hoặc rút lui bảo toàn quà tặng.`
      )
    )
    .addActionRowComponents(row);
  const inviteMsg = await channel.send({
    content: `<@${userId}>`,
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
  const filter = (i) => i.user.id === userId && i.customId.startsWith("soul_invite_");
  const collector = inviteMsg.createMessageComponentCollector({ filter, time: 60000 });
  collector.on("collect", async (i) => {
    if (!(await safeDeferUpdate(i))) return;
    const action = i.customId.replace("soul_invite_", "").split(":")[0];
    collector.stop(action);
  });
  collector.on("end", async (collected, reason) => {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("soul_invite_enter_dis").setLabel("Tiến vào 🚪").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId("soul_invite_retreat_dis").setLabel("Rút lui 🏳️").setStyle(ButtonStyle.Secondary).setDisabled(true)
    );
    const disabledContainer = new ContainerBuilder()
      .setAccentColor(0x7C5CFF)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ✨ CÕI LINH HỒN MỞ RA! ✨\n` +
          `Người được chọn hãy đưa ra quyết định của mình tiến vào để chiếm hữu linh cửu của Malzareth hoặc rút lui bảo toàn quà tặng.`
        )
      )
      .addActionRowComponents(disabledRow);
    await inviteMsg.edit({ components: [disabledContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
    if (reason === "retreat" || reason === "time") {
      await giveNormalBossRewards(client, channel, activeBoss, escrow);
      await channel.send(`🏳️ **${displayName}** đã quyết định rút lui an toàn và nhận phần thưởng Boss bình thường.`);
    } else if (reason === "enter") {
      await channel.send(`🚪 **${displayName}** đã dũng cảm bước qua cánh cổng để đối mặt với số phận!`);
      await startSoulRealmDialogue(client, channel, userId);
    }
  });
};
const startSoulRealmDialogue = async (client, channel, userId) => {
  const userDiscord = await client.users.fetch(userId).catch(() => null);
  const displayName = userDiscord ? userDiscord.displayName || userDiscord.username : `<@${userId}>`;
  await channel.send(`💬 **Malzareth**: *Xem ai bước vào kia 1 kẻ không sợ chết !*`);
  await new Promise(resolve => setTimeout(resolve, 3000));
  await channel.send(`💬 **Malzareth**: *Muốn có được linh cửu của ta sao ?*`);
  await new Promise(resolve => setTimeout(resolve, 3000));
  await channel.send(`💬 **Malzareth**: *Giỏi thì đến đây !*`);
  await new Promise(resolve => setTimeout(resolve, 3000));
  await startSoulRealmBattle(client, channel, userId);
};
const renderSoulBattleScreen = (playerState, bossState, logs, currentTurn) => {
  const container = new ContainerBuilder().setAccentColor(0x7C5CFF);
  const text1 = new TextDisplayBuilder().setContent(
    `# 🌌 CHIẾN TRƯỜNG CÕI LINH HỒN 🌌\n` +
    `⚔️ **Trận Đấu Sinh Tử** | 👻 **Linh Hồn Malzareth**`
  );
  const text2 = new TextDisplayBuilder().setContent(
    `### 👹 Kẻ địch: ${bossState.name}\n` +
    `${healthBar(bossState.hp, bossState.maxHp)}\n` +
    `❤️ **HP:** **${bossState.hp.toLocaleString()} / ${bossState.maxHp.toLocaleString()}**`
  );
  let resourceText = "";
  if (playerState.classKey === "mage") {
    resourceText = `🔮 **MP:** **${playerState.mana}/100**`;
  } else if (playerState.classKey !== "wretch") {
    resourceText = `⚡ **Nộ:** **${playerState.rage}%**`;
  }
  const playerInfo = 
    `❤️ **HP:** **${playerState.hp.toLocaleString()} / ${playerState.maxHp.toLocaleString()}**\n` +
    `${resourceText}\n` +
    `🧪 **Bình máu:** **${playerState.potions} / 3**\n` +
    `💪 **Lớp:** **${playerState.classKey.toUpperCase()}**`;
  const text3 = new TextDisplayBuilder().setContent(
    `### 👤 ${playerState.name}\n` +
    `${playerInfo}`
  );
  const recentLogs = logs.slice(-4).join("\n");
  const text4 = new TextDisplayBuilder().setContent(
    `### 📝 Nhật ký trận đấu\n` +
    `${recentLogs || "*Chuẩn bị bắt đầu...*"}`
  );
  const footerText = currentTurn === "player"
    ? `👉 Đến lượt của bạn! Chọn hành động bên dưới.`
    : `👹 Lượt của boss...`;
  const textFooter = new TextDisplayBuilder().setContent(`-# ${footerText}`);
  const sep1 = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
  const sep2 = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
  const sep3 = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
  const sep4 = new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small);
  container
    .addTextDisplayComponents(text1)
    .addSeparatorComponents(sep1)
    .addTextDisplayComponents(text2)
    .addSeparatorComponents(sep2)
    .addTextDisplayComponents(text3)
    .addSeparatorComponents(sep3)
    .addTextDisplayComponents(text4)
    .addSeparatorComponents(sep4)
    .addTextDisplayComponents(textFooter);
  return container;
};
const buildSoulBattleComponents = (playerState, currentTurn) => {
  const disabled = currentTurn !== "player";
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("soul_combat_attack")
      .setLabel("Tấn công 🗡️")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId("soul_combat_heal")
      .setLabel("Bình máu 🧪")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled || playerState.potions <= 0)
  );
  if (playerState.classKey !== "wretch") {
    let skillLabel = "Kỹ Năng ✨";
    let isSkillDisabled = disabled;
    if (playerState.classKey === "mage") {
      skillLabel = `Siêu Năng ✨ (${playerState.mana} MP)`;
      if (playerState.mana < 25) isSkillDisabled = true;
    } else if (playerState.classKey === "paladin") {
      skillLabel = `Thiên Mệnh ✨ (${playerState.rage}% Nộ)`;
      if (playerState.rage < 50) isSkillDisabled = true;
    } else {
      skillLabel = `Kỹ Năng ✨ (${playerState.rage}% Nộ)`;
      if (playerState.rage < 100) isSkillDisabled = true;
    }
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("soul_combat_skill")
        .setLabel(skillLabel)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(isSkillDisabled)
    );
  }
  return [row];
};
const makeSoulBattlePayload = (playerState, bossState, logs, currentTurn, hasSoulImage, soulImageFile) => {
  const container = renderSoulBattleScreen(playerState, bossState, logs, currentTurn);
  if (hasSoulImage) {
    const gallery = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(`attachment://${soulImageFile}`)
    );
    container.addMediaGalleryComponents(gallery);
  }
  const isFinished = playerState.hp <= 0 || bossState.hp <= 0;
  if (!isFinished) {
    const components = buildSoulBattleComponents(playerState, currentTurn);
    if (components && components.length > 0) {
      container.addActionRowComponents(components[0]);
    }
  }
  const payload = {
    content: "",
    embeds: [],
    components: [container],
    flags: MessageFlags.IsComponentsV2
  };
  if (hasSoulImage) {
    const soulImagePath = path.join(__dirname, "../../../assets/souls", soulImageFile);
    if (fs.existsSync(soulImagePath)) {
      payload.files = [new AttachmentBuilder(soulImagePath, { name: soulImageFile })];
    }
  }
  return payload;
};
const startSoulRealmBattle = async (client, channel, userId) => {
  const { user, rpgClass } = await requireRpgCharacter(userId);
  const effectiveStats = getEffectiveRpgStats(user);
  const classKey = user.rpg.classKey;
  const maxHp = 150 + effectiveStats.vigor * 20 + user.rpg.level * 20;
  const playerState = {
    id: userId,
    name: user.rpg.nickname || rpgClass.name,
    hp: maxHp,
    maxHp: maxHp,
    potions: 3,
    rage: 0,
    mana: 100,
    classKey,
    stats: effectiveStats,
    power: calculateRpgPower(user),
    weapon: getEquippedItems(user).weapon
  };
  const bossState = {
    name: "Linh Hồn Malzareth",
    hp: 75000,
    maxHp: 75000,
    armor: 2200,
    magicResist: 2200,
    attackPower: 500,
    damageType: "physical",
    emoji: "👻",
    asset: "boss_XI.png",
    bleedRounds: 0
  };
  const soulImageFile = classKey === "mage" ? "mage.png" :
                        classKey === "archer" ? "archer.png" :
                        classKey === "assassin" ? "assassin.png" :
                        "warrior.png";
  const soulImagePath = path.join(__dirname, "../../../assets/souls", soulImageFile);
  const hasSoulImage = fs.existsSync(soulImagePath);
  const logs = [`🌌 Cõi Linh Hồn đã sẵn sàng. Trận đấu bắt đầu!`];
  let currentTurn = "player";
  const payload = makeSoulBattlePayload(playerState, bossState, logs, currentTurn, hasSoulImage, soulImageFile);
  const battleMsg = await channel.send(payload);
  const runCombatLoop = async () => {
    while (playerState.hp > 0 && bossState.hp > 0) {
      if (currentTurn === "player") {
        if (bossState.bleedRounds && bossState.bleedRounds > 0) {
          const bleedDmg = Math.floor(bossState.maxHp * 0.02);
          bossState.hp = Math.max(0, bossState.hp - bleedDmg);
          bossState.bleedRounds -= 1;
          logs.push(`<:bleed:1521938497642958889> Boss bị chảy máu và mất **${bleedDmg.toLocaleString()}** HP. (Còn lại: ${bossState.bleedRounds} lượt)`);
          if (bossState.hp <= 0) break;
        }
        const editPayload = makeSoulBattlePayload(playerState, bossState, logs, currentTurn, hasSoulImage, soulImageFile);
        await battleMsg.edit(editPayload).catch(() => null);
        const filter = (i) => i.user.id === userId && i.customId.startsWith("soul_combat_");
        const interaction = await battleMsg.awaitMessageComponent({ filter, time: 30000 }).catch(() => null);
        if (!interaction) {
          logs.push(`⏳ Quá thời gian suy nghĩ! Tự động tấn công.`);
          await executePlayerSoulAttack(playerState, bossState, logs, 1.0);
        } else {
          if (!(await safeDeferUpdate(interaction))) {
            await executePlayerSoulAttack(playerState, bossState, logs, 1.0);
            if (bossState.hp <= 0) break;
            currentTurn = "boss";
            continue;
          }
          if (interaction.customId === "soul_combat_attack") {
            await executePlayerSoulAttack(playerState, bossState, logs, 1.0);
          } else if (interaction.customId === "soul_combat_heal") {
            playerState.hp = Math.min(playerState.maxHp, playerState.hp + Math.floor(playerState.maxHp * 0.3));
            playerState.potions -= 1;
            logs.push(`🧪 **${playerState.name}** uống bình máu, hồi phục **${Math.floor(playerState.maxHp * 0.3).toLocaleString()}** HP.`);
          } else if (interaction.customId === "soul_combat_skill") {
            await executePlayerSoulSkill(playerState, bossState, logs);
          }
        }
        if (bossState.hp <= 0) break;
        currentTurn = "boss";
      } else {
        const editPayload = makeSoulBattlePayload(playerState, bossState, logs, currentTurn, hasSoulImage, soulImageFile);
        await battleMsg.edit(editPayload).catch(() => null);
        await new Promise(resolve => setTimeout(resolve, 2500));
        await executeBossSoulAttack(playerState, bossState, logs);
        if (playerState.hp <= 0) break;
        currentTurn = "player";
      }
    }
    if (bossState.hp <= 0) {
      logs.push(`🎉 **${playerState.name}** đã tiêu diệt **Linh Hồn Malzareth**!`);
      const finalPayload = makeSoulBattlePayload(playerState, bossState, logs, currentTurn, hasSoulImage, soulImageFile);
      await battleMsg.edit(finalPayload).catch(() => null);
      await giveSoulRealmWinReward(client, channel, userId);
    } else {
      logs.push(`🥀 **${playerState.name}** đã gục ngã dưới tay **Linh Hồn Malzareth**.`);
      const finalPayload = makeSoulBattlePayload(playerState, bossState, logs, currentTurn, hasSoulImage, soulImageFile);
      await battleMsg.edit(finalPayload).catch(() => null);
      await giveSoulRealmDefeatReward(client, channel, userId);
    }
  };
  runCombatLoop().catch(err => {
    console.error("[SOUL_REALM_COMBAT] Error during loop:", err);
  });
};
const executePlayerSoulAttack = async (playerState, bossState, logs, multiplier) => {
  const isMagical = CLASS_ATTACK_TYPES[playerState.classKey] === "magical";
  const baseAttack = isMagical
    ? playerState.stats.int * 3.5 + playerState.stats.arc * 1.5
    : playerState.stats.str * 2.5 + playerState.stats.dex * 1.5;
  let rawDamage = (baseAttack + playerState.power) * multiplier * 2.0;
  if (playerState.archerDoubleNext) {
    rawDamage *= 2.0;
    playerState.archerDoubleNext = false;
    logs.push(`✨ Đại tiễn kích hoạt! Đòn đánh kế tiếp gây gấp đôi sát thương.`);
  }
  rawDamage *= 0.85 + Math.random() * 0.3;
  const critRate = Math.min(
    0.75,
    (playerState.stats.arc * 0.2 + playerState.stats.dex * 0.1) / 100 + (playerState.stats.critRate || 0)
  );
  const isCrit = Math.random() < critRate;
  const critMult = 1.5 + playerState.stats.dex * 0.002;
  if (isCrit) {
    rawDamage *= critMult;
  }
  const mrOrArmor = isMagical ? bossState.magicResist : bossState.armor;
  const mitigation = mrOrArmor / (mrOrArmor + 250);
  const damage = Math.max(10, Math.floor(rawDamage * (1 - mitigation)));
  bossState.hp = Math.max(0, bossState.hp - damage);
  const critText = isCrit ? "💥 **Chí mạng!** " : "";
  logs.push(`🗡️ **${playerState.name}** gây ${critText}**${damage.toLocaleString()}** sát thương lên boss.`);
  if (playerState.classKey !== "mage" && playerState.classKey !== "wretch") {
    playerState.rage = Math.min(100, (playerState.rage || 0) + 15);
  }
};
const executePlayerSoulSkill = async (playerState, bossState, logs) => {
  if (playerState.classKey === "warrior") {
    logs.push(`⚔️ **${playerState.name}** dùng kỹ năng **[Trọng Kiếm]**!`);
    await executePlayerSoulAttack(playerState, bossState, logs, 4.0);
    playerState.rage = 0;
  } else if (playerState.classKey === "assassin") {
    logs.push(`🗡️ **${playerState.name}** dùng kỹ năng **[Đâm Lén]**!`);
    bossState.bleedRounds = 3;
    await executePlayerSoulAttack(playerState, bossState, logs, 2.0);
    playerState.rage = 0;
  } else if (playerState.classKey === "archer") {
    logs.push(`🏹 **${playerState.name}** dùng kỹ năng **[Xuyên Táo]**!`);
    playerState.archerDoubleNext = true;
    await executePlayerSoulAttack(playerState, bossState, logs, 3.0);
    playerState.rage = 0;
  } else if (playerState.classKey === "paladin") {
    logs.push(`🛡️ **${playerState.name}** dùng kỹ năng **[Thiên Mệnh]**!`);
    const healAmt = Math.floor(playerState.maxHp * 0.30);
    playerState.hp = Math.min(playerState.maxHp, playerState.hp + healAmt);
    logs.push(`💚 Hồi phục **${healAmt.toLocaleString()}** HP.`);
    playerState.rage = Math.max(0, playerState.rage - 50) + 10;
  } else if (playerState.classKey === "mage") {
    logs.push(`🔮 **${playerState.name}** dùng kỹ năng **[Siêu Năng]**!`);
    const healAmt = Math.floor(playerState.maxHp * 0.15);
    playerState.hp = Math.min(playerState.maxHp, playerState.hp + healAmt);
    await executePlayerSoulAttack(playerState, bossState, logs, 2.5);
    playerState.mana = Math.max(0, playerState.mana - 25);
  }
};
const executeBossSoulAttack = async (playerState, bossState, logs) => {
  const playerEvasion = Math.min(
    0.35,
    (playerState.stats.dex * 0.1 + playerState.stats.arc * 0.05) / 100
  );
  const bossMissed = Math.random() < playerEvasion;
  if (bossMissed) {
    logs.push(`💨 **NÉ TRÁNH!** Bạn đã nhanh nhẹn né được đòn tấn công của boss.`);
    return;
  }
  const bossRaw = bossState.attackPower * (0.85 + Math.random() * 0.3);
  let playerMitigation = 0;
  if (bossState.damageType === "magical") {
    const playerMR = playerState.stats.mr * 12.0;
    playerMitigation = playerMR / (playerMR + 150);
  } else {
    const playerArmor = playerState.stats.pr * 12.0;
    playerMitigation = playerArmor / (playerArmor + 150);
  }
  const bossDamage = Math.max(5, Math.floor(bossRaw * (1 - playerMitigation)));
  playerState.hp = Math.max(0, playerState.hp - bossDamage);
  logs.push(`💥 **Linh Hồn Malzareth** tấn công gây **${bossDamage.toLocaleString()}** sát thương lên bạn.`);
  if (playerState.classKey !== "mage" && playerState.classKey !== "wretch") {
    playerState.rage = Math.min(100, (playerState.rage || 0) + 10);
  }
};
const giveSoulRealmWinReward = async (client, channel, userId) => {
  try {
    const { user } = await requireRpgCharacter(userId);
    const gear = await generateRpgGearDrop(user, {
      forceDrop: true,
      slot: "weapon",
      subType: "River of Blood",
      rarity: "Mythic",
      fromEvent: true
    });
    if (gear) {
      addRpgGearToUser(user, gear);
    }
    user.rpg.power = calculateRpgPower(user);
    await user.save();
    const discordUser = await client.users.fetch(userId).catch(() => null);
    const winEmbed = new EmbedBuilder()
      .setColor(getRpgColor("premium"))
      .setAuthor({
        name: discordUser ? discordUser.displayName || discordUser.username : "Player",
        iconURL: discordUser ? discordUser.displayAvatarURL({ dynamic: true }) : undefined
      })
      .setTitle(formatRpgTitle("Chiến thắng huyền thoại", "🏆"))
      .setDescription(
        `🎉 Chúc mừng <@${userId}> đã chiến thắng **Linh Hồn Malzareth** tại Cõi Linh Hồn!\n\n` +
        `✨ Ngươi đã nhận được thần khí: **${getGearDisplayName(gear)}** (UID: \`${gear.uid.slice(0, 8)}\`)\n` +
        `• Phẩm chất: **Mythic** (Sức mạnh ngang Ancient)\n` +
        `• Lực chiến: **+${gear.power.toLocaleString()}**`
      )
      .setFooter(formatRpgFooter("Thần khí đã được trao vào kho đồ"))
      .setTimestamp();
    await channel.send({ content: `<@${userId}>`, embeds: [winEmbed] });
    if (discordUser) {
      await discordUser.send({ embeds: [winEmbed] }).catch(() => null);
    }
  } catch (err) {
    console.error("[SOUL_REALM] Win reward distribution failed:", err);
  }
};
const giveSoulRealmDefeatReward = async (client, channel, userId) => {
  try {
    const { user } = await requireRpgCharacter(userId);
    const expGain = 1500;
    const cokeGain = 5000;
    addRpgExp(user.rpg, expGain);
    user.coke += cokeGain;
    user.rpg.power = calculateRpgPower(user);
    await user.save();
    const discordUser = await client.users.fetch(userId).catch(() => null);
    const loseEmbed = new EmbedBuilder()
      .setColor(getRpgColor("neutral"))
      .setAuthor({
        name: discordUser ? discordUser.displayName || discordUser.username : "Player",
        iconURL: discordUser ? discordUser.displayAvatarURL({ dynamic: true }) : undefined
      })
      .setTitle(formatRpgTitle("Thất bại tại Cõi Linh Hồn", "🥀"))
      .setDescription(
        `Ngươi đã gục ngã trước sức mạnh hắc ám của Malzareth.\n` +
        `Ngươi không nhận được gì ngoài phần thưởng an ủi:\n` +
        `• Coke: **+${cokeGain.toLocaleString()}** <:cokecy:1509951335016173662>\n` +
        `• RPG EXP: **+${expGain.toLocaleString()}**`
      )
      .setFooter(formatRpgFooter("Phần thưởng an ủi đã được trao"))
      .setTimestamp();
    await channel.send({ content: `<@${userId}>`, embeds: [loseEmbed] });
    if (discordUser) {
      await discordUser.send({ embeds: [loseEmbed] }).catch(() => null);
    }
  } catch (err) {
    console.error("[SOUL_REALM] Defeat reward distribution failed:", err);
  }
};
const giveNormalBossRewards = async (client, channel, activeBoss, escrow) => {
  try {
    const userId = escrow.userId;
    const { user } = await requireRpgCharacter(userId);
    if (escrow.gears && escrow.gears.length > 0) {
      escrow.gears.forEach(g => addRpgGearToUser(user, g));
    }
    addRpgExp(user.rpg, escrow.expGain);
    if (user.rpg.equippedPet) {
      addPetXp(user.rpg.equippedPet, getBossXp(), user);
    }
    user.coke += escrow.cokeGain;
    if (escrow.stonesDropped && escrow.stonesDropped.length > 0) {
      if (!user.inventory) user.inventory = new Map();
      escrow.stonesDropped.forEach(s => {
        const currentQty = user.inventory.get(s.id) || 0;
        user.inventory.set(s.id, currentQty + s.quantity);
      });
      user.markModified("inventory");
    }
    if (escrow.keyDropped) {
      if (!user.inventory) user.inventory = new Map();
      const currentQty = user.inventory.get("dungeonkey") || 0;
      user.inventory.set("dungeonkey", currentQty + 1);
      user.markModified("inventory");
    }
    if (escrow.topBonus) {
      if (escrow.topBonus.expBonus > 0) {
        addRpgExp(user.rpg, escrow.topBonus.expBonus);
      }
      if (escrow.topBonus.cokeBonus > 0) {
        user.coke += escrow.topBonus.cokeBonus;
      }
      if (escrow.topBonus.wcBonus > 0) {
        if (!user.inventory) user.inventory = new Map();
        const currentWc = user.inventory.get("wc") || 0;
        user.inventory.set("wc", currentWc + escrow.topBonus.wcBonus);
        user.markModified("inventory");
      }
    }
    user.rpg.power = calculateRpgPower(user);
    await user.save();
    const SpawnedBoss = require("../../../models/SpawnedBoss");
    if (activeBoss.dbId) {
      await SpawnedBoss.findByIdAndUpdate(activeBoss.dbId, {
        $addToSet: { rewardedUserIds: userId }
      }).catch(() => null);
    }
    await sendRewardDm({
      client,
      userId,
      boss: activeBoss.boss,
      rankLabel: config.rpg.boss?.bossRankRewards?.[activeBoss.boss.rank]?.label || "Cấp Thường",
      rankEmoji: config.rpg.boss?.bossRankRewards?.[activeBoss.boss.rank]?.emoji || "⚔️",
      rankColor: config.rpg.boss?.bossRankRewards?.[activeBoss.boss.rank]?.color || "#95A5A6",
      damage: activeBoss.participants.get(userId)?.damage || 0,
      gears: escrow.gears,
      expGain: escrow.expGain,
      cokeGain: escrow.cokeGain,
      isLastHit: true,
      stones: escrow.stonesDropped,
      keyDropped: escrow.keyDropped,
      topBonus: escrow.topBonus
    });
  } catch (error) {
    console.error("[SOUL_REALM] Failed to give normal rewards:", error);
  }
};
class BossCommand extends BaseCommand {
  constructor() {
    super({
      name: "boss",
      aliases: ["worldboss", "wb", "xboss"],
      description: "Xem World Boss đang xuất hiện trong channel.",
      usage: `${config.prefix}boss`,
      examples: [{ intent: "Xem boss", command: `${config.prefix}boss` }],
      cooldown: 0
    });
  }
  async execute(message) {
    return showBossPanel(message);
  }
}
const bossCommand = new BossCommand();
bossCommand.handleFightInteraction = handleFightInteraction;
bossCommand.handleReviveInteraction = handleReviveInteraction;
bossCommand.performBossAttack = performBossAttack;
bossCommand.finishBoss = finishBoss;
module.exports = bossCommand;
