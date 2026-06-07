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
} = require("../../utils/rpgUtil");

const CLASS_ATTACK_TYPES = {
  warrior: "physical",
  assassin: "physical",
  paladin: "physical",
  berserker: "physical",
  archer: "physical",
  mage: "magical",
  necromancer: "magical",
  cleric: "magical",
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
}) => {
  const discordUser = await client.users.fetch(userId).catch(() => null);
  if (!discordUser) return;

  const gearLines = gears
    .map(
      (gear) =>
        `#${gear.id} **${gear.name}** (UID: \`${gear.uid.slice(0, 8)}\`) | +${gear.power.toLocaleString()} Lực chiến | bán ${gear.sellPrice.toLocaleString()} Coke`,
    )
    .join("\n");

  const embed = new EmbedBuilder()
    .setColor(isLastHit ? "#FEE75C" : (rankColor || "#57F287"))
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
          `Coke nhận được: **+${cokeGain.toLocaleString()} Coke**\n` +
          `EXP RPG: **+${expGain.toLocaleString()}**`,
        inline: true,
      },
      {
        name: "Trang bị nhận được",
        value: gearLines || "Không có",
      },
    );

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

  const bossRankKey = activeBoss.boss.rank || "thuong";
  const rankReward = config.rpg.boss?.bossRankRewards?.[bossRankKey] || {
    label: "Cấp Thường", emoji: "⚔️", color: "#95A5A6",
    participantRarities: ["Common", "Rare"],
    lastHitRarities: ["Rare"],
    cokeMin: 500, cokeMax: 1000,
    lastHitCokeMin: 2000, lastHitCokeMax: 5000,
    expMult: 1, lastHitExpMult: 1.5,
  };

  for (const [userId, participant] of activeBoss.participants.entries()) {
    try {
      const { user, rpgClass } = await requireRpgCharacter(userId);
      const isLastHit = userId === activeBoss.lastHitUserId;
      const gears = [];

      // Reward gear 1 — participant drop (scales by rank)
      const gear1 = await generateRpgGearDrop(user, {
        forceDrop: true,
        allowedRarities: rankReward.participantRarities,
      });
      if (gear1) {
        addRpgGearToUser(user, gear1);
        gears.push(gear1);
      }

      // Reward gear 2 — last hit bonus (scales by rank)
      if (isLastHit) {
        const gear2 = await generateRpgGearDrop(user, {
          forceDrop: true,
          allowedRarities: rankReward.lastHitRarities,
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
      const baseExp = activeBoss.boss.exp || 100;
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

      user.rpg.power = calculateRpgPower(user);
      await user.save();

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
      });
    } catch (error) {
      console.warn("[RPG_BOSS] Reward failed:", userId, error.message);
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
}) => {
  let battleLog = "";
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
      battleLog += `🥀 **HẠ GỤC!** Bạn đã bị boss đánh gục! Cần 30s hồi sức hoặc hồi sinh ngay bằng 1,000 Coke.`;
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
          `Phí lượt này: **${isPaidAttack ? `${paidAttackCost.toLocaleString()} Coke` : "Miễn phí"}**\n` +
          `Coke hiện có: **${user.coke.toLocaleString()}**`,
        inline: true,
      },
    );
};

const updateBossMessage = async (channel, activeBoss, forceNewMessage = false) => {
  if (!activeBoss.updateQueue) {
    activeBoss.updateQueue = Promise.resolve();
  }

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

        if (forceNewMessage || activeBoss.messageIds.length === 0) {
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
        } else {
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
        }
      } catch (err) {
        console.error("[RPG_BOSS] Error updating boss message:", err);
      }
    })
    .catch((err) => {
      console.error("[RPG_BOSS] Error in updateBossMessage queue:", err);
    });

  await activeBoss.updateQueue;
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
  if (activeBoss.defeated || activeBoss.expired || activeBoss.hp <= 0) {
    return {
      ok: false,
      content: "Boss đã bị hạ gục hoặc đã rời đi trước khi đòn đánh của bạn chạm tới!",
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
  const maxHp = 150 + effectiveStats.vit * 15 + user.rpg.level * 20;

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
        content: `❌ Bạn đã bị hạ gục! Cần chờ thêm **${remainingSeconds}s** để hồi sức hoặc hồi sinh ngay lập tức bằng **1,000 Coke**.`,
        components: [reviveRow],
        ephemeral: true,
      };
    }
  }

  const freeAttacks = config.rpg.boss?.free_attacks_per_user ?? 3;
  const paidAttackCost = config.rpg.boss?.paid_attack_cost ?? 10000;
  const isPaidAttack = participant.attacks >= freeAttacks;

  if (isPaidAttack && user.coke < paidAttackCost) {
    return {
      ok: false,
      content:
        `${config.emoji.no} Bạn đã dùng hết **${freeAttacks}** lượt đánh boss miễn phí. ` +
        `Lượt tiếp theo cần **${paidAttackCost.toLocaleString()} Coke**, nhưng bạn chỉ có **${user.coke.toLocaleString()} Coke**.`,
    };
  }

  user.rpg.power = calculateRpgPower(user);

  // Player Damage Calculation
  const isMagical = CLASS_ATTACK_TYPES[user.rpg.classKey] === "magical";
  const baseAttack = isMagical
    ? effectiveStats.int * 3.5
    : effectiveStats.str * 2.5 + effectiveStats.agi * 1.2;

  const gearPower = calculateRpgPower(user);
  let rawDamage = baseAttack + gearPower;

  // Apply variance
  const attackVariance = 0.85 + Math.random() * 0.3;
  rawDamage *= attackVariance;

  // Crit roll
  const classCritBonus = rpgClass.bonuses?.critRate || 0;
  const critRate = Math.min(
    0.75,
    (effectiveStats.luck * 0.2 + effectiveStats.agi * 0.1) / 100 + classCritBonus,
  );
  const isCrit = Math.random() < critRate;
  const critMult = 1.5 + effectiveStats.agi * 0.002;
  if (isCrit) {
    rawDamage *= critMult;
  }

  // Boss defense mitigation
  let mitigation = 0;
  if (isMagical) {
    const mr = activeBoss.boss.magicResist || 0;
    mitigation = mr / (mr + 250);
  } else {
    const armor = activeBoss.boss.armor || 0;
    mitigation = armor / (armor + 250);
  }

  const classBossBonus = rpgClass.bonuses?.bossDamage || 0;
  const damage = Math.max(
    10,
    Math.floor(rawDamage * (1 - mitigation) * (1 + classBossBonus)),
  );

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
      (effectiveStats.agi * 0.1 + effectiveStats.luck * 0.05) / 100,
    );
    bossMissed = Math.random() < playerEvasion;

    if (!bossMissed) {
      const bossRaw =
        (activeBoss.boss.attackPower || 50) * (0.85 + Math.random() * 0.3);
      let playerMitigation = 0;

      if (activeBoss.boss.damageType === "magical") {
        const playerMR =
          effectiveStats.int * 0.8 + effectiveStats.vit * 0.7;
        playerMitigation = playerMR / (playerMR + 150);
      } else {
        const playerArmor = effectiveStats.def * 1.5;
        playerMitigation = playerArmor / (playerArmor + 150);
      }

      bossDamage = Math.max(
        5,
        Math.floor(bossRaw * (1 - playerMitigation)),
      );
      participant.hp = Math.max(0, participant.hp - bossDamage);

      if (participant.hp <= 0) {
        participant.koUntil = now + 30 * 1000;

        // Special ability of boss_XI: heals 20% of its missing HP when killing a user
        if (activeBoss.boss.key === "boss_XI") {
          const missingHp = activeBoss.maxHp - activeBoss.hp;
          if (missingHp > 0) {
            bossHealedAmount = Math.floor(missingHp * 0.20);
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
    }
  }

  await user.save();
  await updateQuestProgress(userId, "boss_damage", damage, channel);
  await updateBossMessage(channel, activeBoss);

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

  await updateBossMessage(message.channel, activeBoss, true);
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

  const reviveCost = 1000;
  if (user.coke < reviveCost) {
    return interaction.editReply({
      content: `❌ Bạn không có đủ Coke để hồi sinh! (Yêu cầu: **${reviveCost.toLocaleString()} Coke**, bạn có: **${user.coke.toLocaleString()} Coke**)`,
    });
  }

  user.coke -= reviveCost;
  const effectiveStats = getEffectiveRpgStats(user);
  const maxHp = 150 + effectiveStats.vit * 15 + user.rpg.level * 20;

  participant.hp = maxHp;
  participant.koUntil = 0;
  activeBoss.participants.set(interaction.user.id, participant);

  await user.save();

  return interaction.editReply({
    content: `✅ Bạn đã hồi sinh thành công bằng **1,000 Coke**! HP hiện tại: **${maxHp.toLocaleString()}**. Hãy click lại nút **Fight!** để tiếp tục tấn công boss.`,
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
};
