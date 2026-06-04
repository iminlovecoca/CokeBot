const { EmbedBuilder } = require("discord.js");
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
  formatStats,
  generateRpgGearDrop,
  getRpgXpNeeded,
  requireRpgCharacter,
} = require("../../utils/rpgUtil");

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
  damage,
  gears,
  expGain,
  isLastHit,
}) => {
  const discordUser = await client.users.fetch(userId).catch(() => null);
  if (!discordUser) return;

  const gearLines = gears
    .map(
      (gear) =>
        `#${gear.id} **${gear.name}** | +${gear.power.toLocaleString()} Power | ${formatStats(gear.stats)} | sell ${gear.sellPrice.toLocaleString()} Coke`,
    )
    .join("\n");

  const embed = new EmbedBuilder()
    .setColor(isLastHit ? "#FEE75C" : "#57F287")
    .setTitle(`${boss.emoji} Thuong danh boss: ${boss.name}`)
    .setDescription(
      isLastHit
        ? "Ban la nguoi ket lieu boss nen nhan them qua."
        : "Boss da bi ha. Day la phan thuong tham gia cua ban.",
    )
    .addFields(
      {
        name: "Dong gop",
        value:
          `Damage: **${damage.toLocaleString()}**\n` +
          `EXP RPG: **+${expGain.toLocaleString()}**`,
        inline: true,
      },
      {
        name: "Gear nhan duoc",
        value: gearLines,
      },
    );

  await discordUser.send({ embeds: [embed] }).catch(() => null);
};

const finishBoss = async ({ client, channel, activeBoss }) => {
  activeBoss.defeated = true;
  if (activeBoss.expireTimer) clearTimeout(activeBoss.expireTimer);
  client.rpgBosses.delete(activeBoss.channelId);

  if (activeBoss.updateQueue) {
    await activeBoss.updateQueue.catch(() => null);
  }

  const rewardRarities = config.rpg.boss?.reward_rarities || [
    "Common",
    "Rare",
    "Epic",
  ];
  const lastHitBonusGear = config.rpg.boss?.last_hit_bonus_gear || 0;

  for (const [userId, participant] of activeBoss.participants.entries()) {
    try {
      const { user } = await requireRpgCharacter(userId);
      const isLastHit = userId === activeBoss.lastHitUserId;
      const gearCount = 1 + (isLastHit ? lastHitBonusGear : 0);
      const gears = [];

      for (let i = 0; i < gearCount; i += 1) {
        const gear = generateRpgGearDrop(user, {
          forceDrop: true,
          allowedRarities: rewardRarities,
        });
        addRpgGearToUser(user, gear);
        gears.push(gear);
      }

      const baseExp = activeBoss.boss.exp || 100;
      const expGain = Math.floor(baseExp * (isLastHit ? 1.5 : 1));
      addRpgExp(user.rpg, expGain);
      user.rpg.power = calculateRpgPower(user);
      await user.save();

      await sendRewardDm({
        client,
        userId,
        boss: activeBoss.boss,
        damage: participant.damage,
        gears,
        expGain,
        isLastHit,
      });
    } catch (error) {
      console.warn("[RPG_BOSS] Reward failed:", userId, error.message);
    }
  }

  const bossMessage = await channel.messages
    .fetch(activeBoss.messageId)
    .catch(() => null);
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
};

const buildAttackResultEmbed = ({
  activeBoss,
  damage,
  participant,
  user,
  freeAttacks,
  paidAttackCost,
  isPaidAttack,
}) =>
  new EmbedBuilder()
    .setColor(activeBoss.hp <= 0 ? "#57F287" : "#ED4245")
    .setTitle(`${activeBoss.boss.emoji} ${activeBoss.boss.name}`)
    .setDescription(
      activeBoss.hp <= 0
        ? `Ban gay **${damage.toLocaleString()}** damage va ket lieu boss.`
        : `Ban gay **${damage.toLocaleString()}** damage len boss.`,
    )
    .addFields(
      {
        name: "Luot danh",
        value:
          `Da dung: **${participant.attacks}**\n` +
          `Mien phi: **${Math.min(participant.attacks, freeAttacks)}/${freeAttacks}**\n` +
          `Phi luot nay: **${isPaidAttack ? `${paidAttackCost.toLocaleString()} Coke` : "0 Coke"}**`,
        inline: true,
      },
      {
        name: "Nhan vat",
        value:
          `Power: **${user.rpg.power.toLocaleString()}**\n` +
          `Level: **${user.rpg.level}**\n` +
          `Coke: **${user.coke.toLocaleString()}**\n` +
          `EXP: **${user.rpg.exp}/${getRpgXpNeeded(user.rpg.level)}**`,
        inline: true,
      },
    );

const updateBossMessage = async (channel, activeBoss) => {
  if (!activeBoss.updateQueue) {
    activeBoss.updateQueue = Promise.resolve();
  }

  activeBoss.updateQueue = activeBoss.updateQueue
    .then(async () => {
      try {
        if (activeBoss.messageId) {
          const oldMsg = await channel.messages
            .fetch(activeBoss.messageId)
            .catch(() => null);
          if (oldMsg) {
            await oldMsg.delete().catch(() => null);
          }
        }

        const payload = {
          embeds: [buildBossEmbed(activeBoss)],
          components: buildBossComponents(activeBoss),
        };

        if (!activeBoss.imageUrl) {
          payload.files = [getAttachment(activeBoss.boss)];
        }

        const newMsg = await channel.send(payload);
        activeBoss.messageId = newMsg.id;

        if (!activeBoss.imageUrl) {
          const attachment = newMsg.attachments.first();
          if (attachment) {
            activeBoss.imageUrl = attachment.url;
          }
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
  const activeBoss = client.rpgBosses?.get(channel.id);
  if (!activeBoss || activeBoss.defeated || activeBoss.expired) {
    return {
      ok: false,
      content: "Hien khong co boss nao dang xuat hien trong channel nay.",
    };
  }

  const { user, rpgClass } = await requireRpgCharacter(userId);
  const participant = activeBoss.participants.get(userId) || {
    damage: 0,
    attacks: 0,
    lastAttackAt: 0,
  };
  const freeAttacks = config.rpg.boss?.free_attacks_per_user ?? 3;
  const paidAttackCost = config.rpg.boss?.paid_attack_cost ?? 10000;
  const now = Date.now();

  const isPaidAttack = participant.attacks >= freeAttacks;
  if (isPaidAttack && user.coke < paidAttackCost) {
    return {
      ok: false,
      content:
        `${config.emoji.no} Ban da dung het **${freeAttacks}** luot danh boss mien phi. ` +
        `Luot tiep theo can **${paidAttackCost.toLocaleString()} Coke**, nhung ban chi co **${user.coke.toLocaleString()} Coke**.`,
    };
  }

  user.rpg.power = calculateRpgPower(user);
  const classBossBonus = rpgClass.bonuses?.bossDamage || 0;
  const variance = 0.85 + Math.random() * 0.3;
  const damage = Math.floor(
    Math.max(10, user.rpg.power) * variance * (1 + classBossBonus),
  );

  if (isPaidAttack) {
    user.coke -= paidAttackCost;
  }

  participant.damage += damage;
  participant.attacks += 1;
  participant.lastAttackAt = now;
  activeBoss.participants.set(userId, participant);
  activeBoss.hp = Math.max(0, activeBoss.hp - damage);
  activeBoss.lastHitUserId = userId;

  await user.save();

  await updateBossMessage(channel, activeBoss);

  const embed = buildAttackResultEmbed({
    activeBoss,
    damage,
    participant,
    user,
    freeAttacks,
    paidAttackCost,
    isPaidAttack,
  });

  if (activeBoss.hp <= 0) {
    await finishBoss({ client, channel, activeBoss });
  }

  return { ok: true, embeds: [embed] };
};

const showBossPanel = async (message) => {
  const activeBoss = message.client.rpgBosses?.get(message.channel.id);
  if (!activeBoss || activeBoss.defeated || activeBoss.expired) {
    return message.reply("**No bosses are currently active in this channel!**");
  }

  await updateBossMessage(message.channel, activeBoss);
};

const handleFightInteraction = async (interaction) => {
  const [, channelId] = interaction.customId.split(":");
  const channel = await interaction.client.channels
    .fetch(channelId || interaction.channelId)
    .catch(() => null);

  if (!channel || !channel.isTextBased()) {
    return interaction.reply({
      content: "Khong tim thay channel boss.",
      flags: 64,
    });
  }

  await interaction.deferReply({ flags: 64 }).catch(() => {});
  const result = await performBossAttack({
    client: interaction.client,
    channel,
    userId: interaction.user.id,
  });

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(
      result.ok ? { embeds: result.embeds } : { content: result.content },
    );
  }

  return interaction.reply({
    ...(result.ok ? { embeds: result.embeds } : { content: result.content }),
    flags: 64,
  });
};

module.exports = {
  name: "boss",
  aliases: ["worldboss", "wb", "xboss"],
  description: "Xem World Boss dang xuat hien trong channel.",
  usage: `${config.prefix}boss`,
  examples: [{ intent: "Xem boss", command: `${config.prefix}boss` }],
  execute: showBossPanel,
  handleFightInteraction,
  performBossAttack,
};
