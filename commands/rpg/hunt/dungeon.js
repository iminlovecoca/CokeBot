const BaseCommand = require("../../../core/BaseCommand");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const RpgGuild = require("../../../models/RpgGuild");
const User = require("../../../models/User");
const {
  requireRpgCharacter,
  getEffectiveRpgStats,
  calculateRpgPower,
  getEquippedItems,
  getRpgClass,
  generateRpgGearDrop,
  addRpgGearToUser,
  addRpgExp,
  getDungeonWeaponKey,
  getGearDisplayName,
  getWeaponSetBonus,
  getEquippedPet,
  petAttackDamage,
  getPetAttackLog,
} = require("../../../utils/rpgUtil");
const { incBalance } = require("../../../utils/userUtil");
const { addPetXp } = require("../../../utils/petXpUtil");
const config = require("../../../data/config");
const {
  formatTimeLimit,
  getAssassinSkillBleedDamage,
  getDungeonBossDamage,
  getDungeonBossScalers,
  getDungeonDateKey,
  getDungeonRewardAmounts,
  getDungeonTimeLimitMs,
  getSlothShieldBreakProgress,
} = require("../../../utils/dungeonBalanceUtil");
const { ui, getRpgColor, formatRpgBar, formatRpgFooter, formatRpgTitle, safeDeferUpdate, safeInteractionEditReply, safeInteractionFollowUp, safeInteractionReply } = require("../../../utils/rpgUi");
const CLASS_ATTACK_TYPES = {
  warrior: "physical",
  archer: "physical",
  mage: "magical",
  assassin: "physical",
  paladin: "physical",
  wretch: "physical",
};
const getDungeonPlayerBuff = () => {
  const buff = config.dungeon?.player_buff || {};
  const damageMultiplier = Number(buff.damage_multiplier);
  const maxHpMultiplier = Number(buff.max_hp_multiplier);
  const critRateBonus = Number(buff.crit_rate_bonus);
  return {
    damageMultiplier: Number.isFinite(damageMultiplier) && damageMultiplier > 0 ? damageMultiplier : 1,
    maxHpMultiplier: Number.isFinite(maxHpMultiplier) && maxHpMultiplier > 0 ? maxHpMultiplier : 1,
    critRateBonus: Number.isFinite(critRateBonus) ? Math.max(0, critRateBonus) : 0,
  };
};
const getHealthBar = (hp, maxHp) => {
  return `❤️ **HP:** ${formatRpgBar(hp, maxHp, 10)} [${hp.toLocaleString()}/${maxHp.toLocaleString()}]`;
};
const getBossForm = (bossCfg, enemy) => {
  const forms = bossCfg?.forms;
  if (!forms?.length || !enemy.maxHp) return null;
  const ratio = enemy.hp / enemy.maxHp;
  let current = forms[forms.length - 1];
  for (const f of forms) {
    if (ratio > f.threshold) {
      current = f;
      break;
    }
  }
  return current;
};
const getPoiseBar = (poise, poiseMax) => {
  return `🛡️ **Poise:** ${formatRpgBar(poise, poiseMax, 10)} [${poise.toLocaleString()}/${poiseMax.toLocaleString()}]`;
};
const getDelay = (activeDungeon, baseDelay) => {
  const speed = activeDungeon.speed ?? 1.0;
  return Math.max(100, Math.floor(baseDelay / speed));
};
const { getActiveStatusString, tickStatusEffects, triggerWeaponPassiveOnAttack, applyStatusEffect, EMOJIS, getWeaponPassiveEmoji, resolveShieldhexDefense } = require("../../../utils/rpgPassiveUtil");
const selectBossTarget = (alivePlayers) => {
  if (!alivePlayers || alivePlayers.length === 0) return null;
  const classWeights = {
    paladin: 300,
    warrior: 250,
    wretch: 180,
    assassin: 120,
    mage: 75,
    archer: 75,
  };
  let totalWeight = 0;
  const weightedPlayers = alivePlayers.map((p) => {
    const classKey = (p.classKey || "wretch").toLowerCase();
    const weight = classWeights[classKey] !== undefined ? classWeights[classKey] : 10;
    totalWeight += weight;
    return { player: p, weight };
  });
  let roll = Math.random() * totalWeight;
  for (const wp of weightedPlayers) {
    roll -= wp.weight;
    if (roll <= 0) {
      return wp.player;
    }
  }
  return alivePlayers[0];
};
const getChapterRarities = (chapter) => {
  if (chapter === 1) return ["Rare"];
  if (chapter === 2) return ["Rare", "Epic"];
  if (chapter === 3) return ["Rare", "Epic"];
  if (chapter === 4) return ["Rare", "Epic", "Legendary"];
  if (chapter === 5) return ["Epic", "Legendary"];
  if (chapter <= 9) return ["Epic", "Legendary", "Mythic"];
  if (chapter <= 12) return ["Legendary", "Mythic", "Ancient"];
  return ["Mythic", "Ancient", "Divine"];
};
class DungeonCommand extends BaseCommand {
  constructor() {
    super({
      name: "dungeon",
      aliases: ["pb", "phoban"],
      description: "Khiêu chiến Dungeon tổ đội (yêu cầu team 3 người cùng Party)",
      usage: `${config.prefix}dungeon`,
      cooldown: 15
    });
  }
  async execute(message, args) {
    const userId = message.author.id;
    const client = message.client;
    if (!client.rpgDungeons) {
      client.rpgDungeons = new Map();
    }
    if (client.rpgDungeons.has(message.channel.id)) {
      const activeDungeon = client.rpgDungeons.get(message.channel.id);
      const isMember = activeDungeon.players.some((p) => p.id === userId);
      if (!isMember) {
        return message.reply("❌ Hiện tại đang có một phó bản diễn ra tại kênh này. Vui lòng đợi kết thúc!");
      }
      if (activeDungeon.gameMessage) {
        activeDungeon.cleanupListener?.();
        await activeDungeon.gameMessage.edit({ components: [] }).catch(() => {});
        await activeDungeon.gameMessage.delete().catch(() => {});
      }
      activeDungeon.gameMessage = null;
      await renderGameScreen(message.channel, activeDungeon);
      return;
    }
    const guild = await RpgGuild.findOne({ members: userId });
    if (!guild) {
      return message.reply(`❌ Bạn chưa tham gia party nào. Hãy dùng \`${config.prefix}party @User\` để lập tổ đội!`);
    }
    if (guild.leaderId !== userId) {
      return message.reply("❌ Chỉ Trưởng nhóm mới có quyền bắt đầu Dungeon.");
    }
    if (guild.members.length !== 3) {
      return message.reply(`❌ Cần chính xác **3 thành viên** trong party để tham gia Dungeon. Hiện tại party bạn có: **${guild.members.length}/3** thành viên.`);
    }
    const leaderUser = await User.findOne({ userId: guild.leaderId }).exec();
    const keyCount = leaderUser?.inventory?.get("dungeonkey") || 0;
    if (keyCount <= 0) {
      return message.reply(`❌ Bạn (Trưởng nhóm) cần có ít nhất **1 Chìa khóa Phó bản** <:key:1516398711712911461> để mở Dungeon. Có thể mua trong \`${config.prefix}shop\` với giá 250k Coke.`);
    }
    const progress = guild.chapterProgress || 0;
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_start_1")
        .setLabel("Chương 1")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_start_2")
        .setLabel("Chương 2")
        .setStyle(progress >= 1 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(progress < 1),
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_start_3")
        .setLabel("Chương 3")
        .setStyle(progress >= 2 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(progress < 2)
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_start_4")
        .setLabel("Chương 4")
        .setStyle(progress >= 3 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(progress < 3),
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_start_5")
        .setLabel("Chương 5")
        .setStyle(progress >= 4 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(progress < 4),
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_start_6")
        .setLabel("Chương 6")
        .setStyle(progress >= 5 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(progress < 5)
    );
    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_start_7")
        .setLabel("Chương 7")
        .setStyle(progress >= 6 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(progress < 6),
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_start_8")
        .setLabel("Chương 8")
        .setStyle(progress >= 7 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(progress < 7),
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_start_9")
        .setLabel("Chương 9")
        .setStyle(progress >= 8 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(progress < 8)
    );
    const row4 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_start_10")
        .setLabel("Chương 10")
        .setStyle(progress >= 9 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(progress < 9),
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_start_11")
        .setLabel("Chương 11")
        .setStyle(progress >= 10 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(progress < 10),
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_start_12")
        .setLabel("Chương 12")
        .setStyle(progress >= 11 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(progress < 11)
    );
    const row5 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_start_13")
        .setLabel("Chương 13")
        .setStyle(progress >= 12 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(progress < 12),
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_start_14")
        .setLabel("Chương 14")
        .setStyle(progress >= 13 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(progress < 13)
    );
    const mapEmbed = new EmbedBuilder()
      .setColor(getRpgColor("accent"))
      .setTitle(formatRpgTitle("Bản đồ Dungeon V1", "🗺️"))
      .setDescription(
        "Chọn chương để bắt đầu khiêu chiến cùng tổ đội. Đi lần lượt từ Chương 1 đến Chương 14."
      )
      .addFields({
        name: "Tiến trình",
        value: `Đã mở khóa đến **Chương ${Math.min(14, progress + 1)}** / **14**`,
        inline: false,
      })
      .setFooter(formatRpgFooter("Chỉ Trưởng nhóm có thể bắt đầu • cần đủ 3 thành viên"));
    const selectMsg = await message.reply({
      content: "",
      embeds: [mapEmbed],
      components: [row1, row2, row3, row4, row5],
      skipV2: true,
    });
    const filter = (i) => i.user.id === userId && i.customId.startsWith("rpg_dungeon_start_");
    const collector = selectMsg.createMessageComponentCollector({ filter, time: 30000 });
    collector.on("collect", async (i) => {
      if (!(await safeDeferUpdate(i))) return;
      const chapter = parseInt(i.customId.replace("rpg_dungeon_start_", ""));
      collector.stop("selected");
      await askBlessing(message, selectMsg, guild, chapter, i);
    });
    collector.on("end", (collected, reason) => {
      if (reason !== "selected") {
        selectMsg.delete().catch(() => {});
      }
    });
  }
}
module.exports = new DungeonCommand();
const askBlessing = async (message, selectMsg, guild, chapter, startInteraction = null) => {
  const userId = message.author.id;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("rpg_blessing_active")
      .setLabel("Phước Lành (+10% HP, +20% ATK)")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("rpg_blessing_none")
      .setLabel("Thử Thách (+20% EXP & Coke)")
      .setStyle(ButtonStyle.Secondary)
  );
  const blessingEmbed = new EmbedBuilder()
    .setColor(getRpgColor("reward"))
    .setTitle(formatRpgTitle("Chọn phước lành tổ đội", "✨"))
    .setDescription(`Trước khi bước vào Dungeon **Chương ${chapter}**, Trưởng nhóm hãy chọn chế độ hỗ trợ cho cả tổ đội.`)
    .addFields(
      {
        name: "Phước Lành Dungeon",
        value: "Tăng **+10% HP tối đa** và **+20% sát thương cơ bản** cho toàn bộ thành viên. Tối đa 3 bình máu.",
      },
      {
        name: "Thử thách",
        value: "Giữ nguyên chỉ số, nhận thêm **+20% Coke & EXP** khi chiến thắng.",
      }
    )
    .setFooter(formatRpgFooter("Lựa chọn này áp dụng cho cả đội trong chương hiện tại"));
  const payload = {
    content: "",
    embeds: [blessingEmbed],
    components: [row],
    skipV2: true,
  };
  if (startInteraction) {
    await safeInteractionEditReply(startInteraction, payload);
  } else {
    await selectMsg.edit(payload).catch(() => {});
  }
  const filter = (i) => i.user.id === userId && i.customId.startsWith("rpg_blessing_");
  const blessingCollector = selectMsg.createMessageComponentCollector({ filter, time: 30000 });
  blessingCollector.on("collect", async (i) => {
    if (!(await safeDeferUpdate(i))) return;
    const blessing = i.customId.replace("rpg_blessing_", "");
    blessingCollector.stop("selected");
    await selectMsg.delete().catch(() => {});
    await startDungeon({ message, guild, chapter, blessing });
  });
  blessingCollector.on("end", (collected, reason) => {
    if (reason !== "selected") {
      selectMsg.delete().catch(() => {});
    }
  });
};
const startDungeon = async ({ message, guild, chapter, blessing }) => {
  const client = message.client;
  const channel = message.channel;
  const playerBuff = getDungeonPlayerBuff();
  if (client.rpgDungeons.has(channel.id)) {
    return channel.send("❌ Đang có một phó bản diễn ra tại kênh này.");
  }
  const leaderId = guild.leaderId;
  const leaderUser = await User.findOne({ userId: leaderId }).exec();
  if (!leaderUser) {
    return channel.send("❌ Không thể tìm thấy thông tin của Trưởng nhóm.");
  }
  const keyCount = leaderUser.inventory?.get("dungeonkey") || 0;
  if (keyCount <= 0) {
    return channel.send(`❌ Trưởng nhóm không có **Chìa khóa Phó bản** <:key:1516398711712911461> để mở Dungeon!`);
  }
  leaderUser.inventory.set("dungeonkey", keyCount - 1);
  leaderUser.markModified("inventory");
  await leaderUser.save();
  channel.send(`🔑 **${leaderUser.rpg.name || leaderUser.userId}** đã sử dụng **1 Chìa khóa Phó bản** <:key:1516398711712911461> để mở Dungeon!`);
  const playerStates = [];
  for (const memberId of guild.members) {
    try {
      const { user, rpgClass } = await requireRpgCharacter(memberId);
      const stats = getEffectiveRpgStats(freshUserObject(user));
      const gearPower = calculateRpgPower(freshUserObject(user));
      const weapon = getEquippedItems(user).weapon;
      let maxHp = 150 + stats.vigor * 20 + user.rpg.level * 20;
      const setBonus = getWeaponSetBonus(user);
      if (setBonus?.bonus?.maxHp) {
        maxHp += Math.floor(maxHp * setBonus.bonus.maxHp);
      }
      maxHp = Math.floor(maxHp * playerBuff.maxHpMultiplier);
      if (blessing === "active") {
        maxHp = Math.floor(maxHp * 1.1);
      }
      playerStates.push({
        id: memberId,
        name: user.rpg.name || `<@${memberId}>`,
        level: user.rpg.level,
        classKey: user.rpg.classKey,
        maxHp: maxHp,
        hp: maxHp,
        potions: 3,
        stats: stats,
        power: gearPower,
        weapon: weapon,
        setBonus: setBonus,
        rpgClass: rpgClass,
        userRef: user, 
        rage: 0,
        mana: (user.rpg.classKey === "mage") ? 100 : 0,
      });
    } catch (err) {
      return channel.send(`❌ Có lỗi khi tải thông tin RPG của thành viên <@${memberId}>. Chắc chắn rằng toàn bộ thành viên đều đã tạo nhân vật.`);
    }
  }
  const activeDungeon = {
    guildId: guild._id,
    leaderId: leaderId,
    chapter: chapter,
    blessing: blessing || "none",
    round: 1,
    players: playerStates,
    currentActor: null,
    enemy: null,
    diceRolled: false,
    diceMultiplier: 1.0,
    coinFlipCount: 0,
    phase2Madness: 1.0,
    consecutiveCoinSuccess: 0,
    logs: ["🏁 Bắt đầu phó bản! Chúc tổ đội may mắn."],
    actionInProgress: false,
    gameMessage: null,
    roundEndTime: 0,
    timeoutTimer: null,
    totalDamageTaken: 0,
    archerDoubleDmgNext: false,
    archerCasterId: null,
  };
  client.rpgDungeons.set(channel.id, activeDungeon);
  setupRound(activeDungeon, channel);
};
const getBossConfig = (chapter) => {
  const dCfg = config.dungeon || {};
  const chCfg = dCfg.chapters?.[chapter];
  if (chCfg && chCfg.boss) {
    return chCfg.boss;
  }
  return dCfg.default_boss;
};
const freshUserObject = (user) => {
  return user.toObject ? user.toObject() : user;
};
const setupRound = (activeDungeon, channel) => {
  const { round, chapter } = activeDungeon;
  if (activeDungeon.timeoutTimer) {
    clearTimeout(activeDungeon.timeoutTimer);
    activeDungeon.timeoutTimer = null;
  }
  const isBossRound = (round === 5);
  const roundTimeLimit = getDungeonTimeLimitMs(isBossRound ? "bossPhase1" : "normal");
  const isC6BossIntro = (chapter === 6 && round === 5 && !activeDungeon.veilreaperStoryShown);
  if (!isC6BossIntro) {
    activeDungeon.roundTimeLimitMs = roundTimeLimit;
    activeDungeon.roundEndTime = Date.now() + roundTimeLimit;
    activeDungeon.timeoutTimer = setTimeout(async () => {
      await handleTimeout(channel, activeDungeon);
    }, roundTimeLimit);
  }
  const dCfg = config.dungeon || {};
  const normCfg = dCfg.normal_monster || { base_hp: 20000, round_hp_mult: 0.1, base_atk: 100, round_atk_mult: 0.05, base_defense: 50 };
  const setupNormalMonster = () => {
    let name = `Quái Vật Gác Đền (Vòng ${round})`;
    let key = `creep${round}`;
    let maxHp = Math.max(15000, Math.min(180000, Math.floor(normCfg.base_hp * chapter * (1 + round * normCfg.round_hp_mult))));
    let atk = Math.min(900, Math.floor(normCfg.base_atk * chapter * (1 + round * normCfg.round_atk_mult)));
    let armor = Math.floor(normCfg.base_defense * chapter);
    let magicResist = Math.floor(normCfg.base_defense * chapter);
    let isElite = false;
    const isBossRoundNow = round === 5;
    if (!isBossRoundNow && round >= 3 && Math.random() < 0.28) {
      isElite = true;
      name = `⭐ Quái Vật Tinh Anh (Vòng ${round})`;
      key = `elite${round}`;
      maxHp = Math.floor(maxHp * 2.2);
      atk = Math.floor(atk * 1.4);
      armor = Math.floor(armor * 1.25);
      magicResist = Math.floor(magicResist * 1.25);
      activeDungeon.logs.push(`⭐ Một con **Quái Vật Tinh Anh** xuất hiện! Nó mạnh hơn hẳn nhưng rơi **nhiều EXP & Coke** gấp rưỡi khi bị hạ gục.`);
    }
    if (chapter === 4 && round === 3) {
      name = "Draugor (Tướng Tiên Phong)";
      key = "draugor";
      maxHp = 75000;
      atk = 410;
      armor = 240;
      magicResist = 240;
    }
    activeDungeon.elitesKilled = activeDungeon.elitesKilled || 0;
    activeDungeon.enemy = {
      name: name,
      key: key,
      maxHp: maxHp,
      hp: maxHp,
      atk: atk,
      armor: armor,
      magicResist: magicResist,
      isBoss: false,
      isElite: isElite,
    };
    activeDungeon.diceRolled = false;
    activeDungeon.diceMultiplier = 1.0;
    activeDungeon.players.forEach((p) => {
      p.hasActedThisRound = false;
    });
    nextTurn(channel, activeDungeon);
  };
  const setupBossState = () => {
    const bossCfg = getBossConfig(chapter);
    const b1Cfg = bossCfg.stats.phase1;
    let totalLevel = 0;
    let totalPower = 0;
    const count = activeDungeon.players.length || 1;
    for (const p of activeDungeon.players) {
      totalLevel += (p.level || 1);
      totalPower += (p.power || 0);
    }
    const targetLevel = totalLevel / count;
    const targetPower = totalPower / count;
    const bossScalers = getDungeonBossScalers(targetLevel, targetPower);
    const leaderScaler = bossScalers.durability;
    const chapterScaler = 1 + (chapter - 1) * 0.20;
    const maxHp = Math.floor(b1Cfg.base_hp * leaderScaler);
    const poiseMax = 80 + chapter * 20;
    activeDungeon.enemy = {
      name: bossCfg.name_phase1,
      key: bossCfg.key,
      maxHp: maxHp,
      hp: maxHp,
      atk: Math.floor(b1Cfg.base_atk * chapterScaler * bossScalers.offense),
      armor: Math.floor(b1Cfg.base_defense * leaderScaler),
      magicResist: Math.floor(b1Cfg.base_defense * leaderScaler),
      isBoss: true,
      phase: 1,
      poiseMax: poiseMax,
      poise: poiseMax,
      poiseBroken: false,
    };
    activeDungeon.diceRolled = false;
    activeDungeon.diceMultiplier = 1.0;
    activeDungeon.players.forEach((p) => {
      p.hasActedThisRound = false;
    });
    nextTurn(channel, activeDungeon);
  };
  if (round < 5) {
    setupNormalMonster();
  } else {
    if (chapter === 6 && !activeDungeon.veilreaperStoryShown) {
      activeDungeon.veilreaperStoryShown = true;
      activeDungeon.actionInProgress = true;
      const dialogues = [
        {
          title: "🔥 BẢN THỂ TỬ THẦN HIỆN THẾ 🔥",
          description: "*Ngọn lửa đen bùng lên dữ dội, thiêu rụi hoàn toàn phong ấn của Mourngait...*",
          delay: 4500
        },
        {
          title: "🔥 BẢN THỂ TỬ THẦN HIỆN THẾ 🔥",
          description: "🗣️ **Mourngait** gầm lên điên cuồng:\n*\"Lũ sinh vật thấp kém... Các ngươi tưởng lửa đen phong ấn ta sao? Không, nó là để kiềm hãm sức mạnh của ta!\"*",
          delay: 6000
        },
        {
          title: "🔥 BẢN THỂ TỬ THẦN HIỆN THẾ 🔥",
          description: "*Từ đống tro tàn hắc hỏa, một hình dạng thực sự đầy kinh hoàng bước ra...*",
          delay: 4500
        },
        {
          title: "🔥 BẢN THỂ TỬ THẦN HIỆN THẾ 🔥",
          description: "🗣️ **Veilreaper** lạnh lùng cất giọng:\n*\"Ta sẽ cho ngươi thấy bản thân của người thấp kém đến thế nào trước Tử Thần...\"*",
          delay: 6000
        },
        {
          title: "🔥 BẢN THỂ TỬ THẦN HIỆN THẾ 🔥",
          description: "🗣️ *\"Chuẩn bị dâng hiến linh hồn đi!\"*",
          delay: 4000
        }
      ];
      const playDialogue = async (index) => {
        if (index >= dialogues.length) {
          activeDungeon.actionInProgress = false;
          activeDungeon.roundTimeLimitMs = roundTimeLimit;
          activeDungeon.roundEndTime = Date.now() + roundTimeLimit;
          activeDungeon.timeoutTimer = setTimeout(async () => {
            await handleTimeout(channel, activeDungeon);
          }, roundTimeLimit);
          setupBossState();
          return;
        }
        const diag = dialogues[index];
        const introEmbed = new EmbedBuilder()
          .setColor("#000000")
          .setTitle(diag.title)
          .setDescription(diag.description)
          .setTimestamp();
        const eyesPath = path.join(__dirname, "../../../assets/backgrounds/eyes.png");
        const files = [];
        if (fs.existsSync(eyesPath)) {
          files.push(new AttachmentBuilder(eyesPath, { name: "eyes.png" }));
          introEmbed.setImage("attachment://eyes.png");
        }
        const msg = await channel.send({ embeds: [introEmbed], files, skipV2: true }).catch(() => null);
        setTimeout(async () => {
          if (msg) {
            await msg.delete().catch(() => {});
          }
          playDialogue(index + 1);
        }, getDelay(activeDungeon, diag.delay));
      };
      playDialogue(0);
    } else {
      setupBossState();
    }
  }
};
const renderGameScreen = async (channel, activeDungeon) => {
  const { chapter, round, players, enemy, logs, currentActor } = activeDungeon;
  const BLESSING_NAMES = {
    active: "✨ Phước Lành Dungeon (+10% HP & +20% Sát thương)",
    none: "🛡️ Không có phước lành",
  };
  const blessingName = BLESSING_NAMES[activeDungeon.blessing || "none"] || BLESSING_NAMES.none;
  let turnStatusText = "";
  if (!activeDungeon.isFinished) {
    if (currentActor && currentActor.id) {
      turnStatusText = `\n👉 *Lượt:* **${currentActor.name}** (<@${currentActor.id}>)`;
    } else if (currentActor && currentActor.isBoss !== undefined) {
      turnStatusText = `\n⚠️ *Lượt:* **${enemy.name}**`;
    }
  }

  const turnOrder = players
    .filter((player) => player.hp > 0)
    .sort((a, b) => (b.stats?.dex || 0) - (a.stats?.dex || 0))
    .map((player) => player.name)
    .join(" → ");
  let descriptionText = `⏰ **Thời gian:** <t:${Math.floor(activeDungeon.roundEndTime / 1000)}:R> | ✨ **Buff:** ${activeDungeon.blessing === "active" ? "Có" : "Không"}${turnStatusText}`;
  if (turnOrder) descriptionText += `\n**Thứ tự lượt (DEX):** ${turnOrder} → ${enemy.name}`;
  if (activeDungeon.isSimulation) {
    descriptionText += ` | ⚡ **Tốc độ:** **${activeDungeon.speed || 1.0}x**`;
  }
  descriptionText += `\n`;
  const accentColor = enemy.isBoss ? 0xE74C3C : 0xE67E22;
  const bossCfg = enemy.isBoss ? getBossConfig(chapter) : null;
  const hasDice = bossCfg?.mechanics?.dice_roll ?? false;
  const hasCoin = bossCfg?.mechanics?.coin_flip ?? false;
  let enemyInfo = `${getHealthBar(enemy.hp, enemy.maxHp)}\n`;
  if (enemy.isBoss) {
    const bossForm = getBossForm(bossCfg, enemy);
    if (bossForm?.name) {
      enemyInfo += `👹 **Hình thái:** ${bossForm.name}\n`;
    }
    enemyInfo += `${getPoiseBar(enemy.poise || 0, enemy.poiseMax || 100)}\n`;
    if (enemy.poiseBroken) {
      enemyInfo += `✨ **Trạng thái:** **BỊ PHÁ VỠ POISE (Suy Yếu: Nhận thêm +100% sát thương)**\n`;
    }
    if (enemy.phase === 1) {
      if (hasDice) {
        if (activeDungeon.diceRolled) {
          const sign = activeDungeon.diceMultiplier < 1.0 ? "⚠️" : "✨";
          enemyInfo += `\n🎲 **Xúc sắc:** Đòn đánh của phe ta gây **${Math.round(activeDungeon.diceMultiplier * 100)}%** sát thương (${sign}).`;
        } else {
          enemyInfo += `\n🎲 *Chuẩn bị đổ xúc sắc xác định hiệu ứng sát thương...*`;
        }
      }
    } else {
      const aoeInterval = Math.max(1, config.dungeon?.boss_phase2_aoe_interval || 2);
      const nextBossTurn = (enemy.phase2TurnCount || 0) + 1;
      enemyInfo += `\n**Đòn kế tiếp:** ${nextBossTurn % aoeInterval === 0 ? "AOE toàn đội" : "Đơn mục tiêu"}`;
      if (hasCoin) {
        enemyInfo += `\n👿 **Điên Loạn:** Sát thương AOE tăng thêm **+${Math.round((activeDungeon.phase2Madness - 1) * 100)}%**!\n` +
                     `🪙 **Đồng xu:** Lượt tích lũy đòn đánh: **${activeDungeon.coinFlipCount || 0}/3**`;
      } else {
        enemyInfo += `\n👿 **Điên Loạn:** Sát thương AOE tăng thêm **+${Math.round((activeDungeon.phase2Madness - 1) * 100)}%**!`;
      }
      if (bossCfg?.mechanics?.vulnerable_on_heal_ban) {
        const isAnyPlayerHealBanned = players.some((p) => p.hp > 0 && p.healBanRounds && p.healBanRounds > 0);
        if (isAnyPlayerHealBanned) {
          enemyInfo += `\n💀 **Suy Yếu:** Boss đang bị giảm phòng ngự do dính Lời Nguyền Xương (Nhận x2 sát thương)!`;
        } else {
          enemyInfo += `\n**Lời Nguyền Xương:** Khi có thành viên bị cấm hồi máu, Boss sẽ nhận x2 sát thương!`;
        }
      }
    }
  }
  const enemyStatus = getActiveStatusString(enemy);
  const embed = new EmbedBuilder()
    .setColor(accentColor)
    .setTitle(formatRpgTitle(`Dungeon V1 • Chương ${chapter} • Vòng ${round}/5`, "⚔️"))
    .setDescription(descriptionText)
    .setTimestamp()
    .setFooter(formatRpgFooter(`${blessingName} • thao tác của người đang tới lượt`));
  embed.addFields({
    name: `Kẻ địch: ${enemy.name}${enemyStatus ? ` ${enemyStatus}` : ""}`,
    value: enemyInfo.trim(),
    inline: false,
  });
  players.forEach((p) => {
    const className = p.rpgClass?.name || p.classKey.toUpperCase();
    const statusText = p.hp <= 0 ? "Tử nạn" : "Đang chiến đấu";
    const healBanText = (p.hp > 0 && p.healBanRounds && p.healBanRounds > 0) ? ` (Cấm ${p.healBanRounds} lượt)` : "";
    let resourceText = "";
    if (p.classKey === "mage") {
      resourceText = `MP **${p.mana ?? 100}/100**`;
    } else {
      resourceText = `Nộ **${p.rage ?? 0}%**`;
    }
    const weaponText = p.weapon
      ? getGearDisplayName(p.weapon) || p.weapon.name || "Vũ khí"
      : "Chưa trang bị";
    const weaponPassiveEmoji = p.weapon
      ? getWeaponPassiveEmoji(p.weapon.subType || p.weapon.subtype, "dungeon")
      : "";
    const pStatus = getActiveStatusString(p);
    const mechanicStatus = p.isSwallowed
      ? "Bị nuốt chửng"
      : (p.goldStatueFreeze > 0 ? "Bị giam trong tượng vàng" : (p.chainRounds > 0 ? `Liên kết sinh mệnh ${p.chainRounds} lượt` : ""));
    const isCurrent = currentActor && currentActor.id === p.id && !activeDungeon.isFinished;
    const turnIndicator = isCurrent ? " 👉" : "";
    const playerValue = [
      `**${statusText}**${turnIndicator}`,
      `HP **${p.hp.toLocaleString()}/${p.maxHp.toLocaleString()}**`,
      resourceText,
      `<:healthpotion:1523351206066655333> Bình **${p.potions}/3**${healBanText}`,
      `Lv.${p.level} • ${className}`,
      `Vũ khí: ${weaponText}${weaponPassiveEmoji ? ` ${weaponPassiveEmoji}` : ""}`,
      pStatus ? `Trạng thái: ${pStatus}` : "",
      mechanicStatus ? `Cơ chế: ${mechanicStatus}` : "",
    ].filter(Boolean).join("\n");
    embed.addFields({
      name: `${p.name}${pStatus ? ` ${pStatus}` : ""}`,
      value: playerValue,
      inline: true,
    });
  });
  const recentLogs = (((logs || []).slice(-5).join("\n")) || "*Trận đấu đang diễn ra...*").slice(-1000);
  embed.addFields({
    name: "Nhật ký chiến trường",
    value: recentLogs,
    inline: false,
  });
  const row = new ActionRowBuilder();
  let disableControls = activeDungeon.actionInProgress || activeDungeon.isFinished || (enemy.isBoss && enemy.phase === 1 && hasDice && !activeDungeon.diceRolled);
  if (activeDungeon.isSimulation) {
    disableControls = true;
  }
  row.addComponents(
    new ButtonBuilder()
      .setCustomId("rpg_dungeon_action_attack")
      .setLabel("Tấn công")
      .setEmoji(ui.icons?.weapon || "🗡️")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disableControls),
    new ButtonBuilder()
      .setCustomId("rpg_dungeon_action_heal")
      .setLabel("Bình máu")
      .setEmoji("1523351206066655333")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disableControls),
  );
  const isPlayerTurn = !activeDungeon.isFinished && currentActor && currentActor.id;
  if (isPlayerTurn) {
    let skillLabel = "Kỹ Năng ✨";
    let isSkillDisabled = disableControls;
    if (currentActor.classKey === "mage") {
      const mana = currentActor.mana ?? 100;
      skillLabel = `Siêu Năng ✨ (${mana} MP)`;
      if (mana < 25) {
        isSkillDisabled = true;
      }
    } else if (currentActor.classKey === "paladin") {
      const rage = currentActor.rage ?? 0;
      skillLabel = `Thiên Mệnh ✨ (${rage}% Nộ)`;
      if (rage < 50) {
        isSkillDisabled = true;
      }
    } else {
      const rage = currentActor.rage ?? 0;
      skillLabel = `Kỹ Năng ✨ (${rage}% Nộ)`;
      if (rage < 100) {
        isSkillDisabled = true;
      }
    }
    if (currentActor.skillBanRounds && currentActor.skillBanRounds > 0) {
      isSkillDisabled = true;
      skillLabel = `${skillLabel.split(" ✨")[0]} 🚫 (Bị Cấm)`;
    }
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_action_skill")
        .setLabel(skillLabel)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(isSkillDisabled)
    );
    const hasCrimson = currentActor.weapon && getDungeonWeaponKey(currentActor.weapon.subType || currentActor.weapon.subtype) === "crimsondagger";
    if (hasCrimson) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId("rpg_dungeon_action_crimson")
          .setLabel("Huyết Sát")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(disableControls)
      );
    }
  }
  const bossForm = enemy.isBoss ? getBossForm(bossCfg, enemy) : null;
  const imageCacheKey = enemy.isBoss
    ? `boss:${bossCfg?.key || ""}:${bossForm?.name || ""}:${bossForm?.image || bossCfg?.image_phase1 || "TF.png"}`
    : `creep:${chapter}:${round}`;
  let filePath = null;
  let imgFileName = null;
  if (activeDungeon.imageCache && activeDungeon.imageCache.key === imageCacheKey && activeDungeon.imageCache.filePath) {
    filePath = activeDungeon.imageCache.filePath;
    imgFileName = activeDungeon.imageCache.imgFileName;
  } else {
    if (enemy.isBoss) {
      const bossImageFile = bossForm?.image || bossCfg?.image_phase1 || "TF.png";
      const bossImagePath = path.join(
        __dirname,
        "../../../assets/dungeons",
        bossImageFile.includes("/") ? "" : (chapter >= 7 ? "Chapter2" : "Chapter1"),
        bossImageFile
      );
      if (fs.existsSync(bossImagePath)) {
        const safeName = (bossImageFile.split("/").pop() || "boss.png").replace(/\.\.+/g, ".");
        filePath = bossImagePath;
        imgFileName = safeName;
      }
    } else {
      let fileName = null;
      if (chapter === 4) {
        if (round === 3) {
          filePath = path.join(__dirname, "../../../assets/dungeons/Creeps/Draugor.png");
          fileName = "Draugor.png";
        } else if (round === 1 || round === 2 || round === 4) {
          filePath = path.join(__dirname, "../../../assets/dungeons/Creeps/soilderDevil.png");
          fileName = "soilderDevil.png";
        }
      } else if (chapter === 5) {
        const bossCfg5 = getBossConfig(chapter);
        const bossKey = bossCfg5?.key ? bossCfg5.key.toUpperCase() : "";
        if (bossKey) {
          const extensions = ["jpg", "png", "webp"];
          for (const ext of extensions) {
            const testPath = path.join(__dirname, `../../../assets/dungeons/Creeps/${bossKey}-creep${round}.${ext}`);
            if (fs.existsSync(testPath)) {
              filePath = testPath;
              fileName = `${bossKey}-creep${round}.${ext}`;
              break;
            }
          }
        }
      } else {
        const testPath = path.join(__dirname, `../../../assets/dungeons/Creeps/Creep${round}.png`);
        if (fs.existsSync(testPath)) {
          filePath = testPath;
          fileName = `Creep${round}.png`;
        }
      }
      if (filePath && fs.existsSync(filePath)) {
        imgFileName = fileName;
      }
    }
    activeDungeon.imageCache = { key: imageCacheKey, filePath, imgFileName };
  }
  if (imgFileName) {
    embed.setImage(`attachment://${imgFileName}`);
  }
  const payload = {
    content: "",
    embeds: [embed],
    components: [row],
    skipV2: true,
  };
  if (activeDungeon.gameMessage) {
    let editSuccess = false;
    const attachmentId = activeDungeon.attachmentId || activeDungeon.gameMessage.attachments?.first?.()?.id;
    const hasImageChanged = imgFileName !== activeDungeon.lastImgFileName;

    // 1. Try editing gameMessage directly
    try {
      const editPayload = {
        content: "",
        embeds: [embed],
        components: [row],
        skipV2: true,
      };

      if (hasImageChanged || !attachmentId) {
        editPayload.attachments = [];
        if (filePath && imgFileName) {
          editPayload.files = [new AttachmentBuilder(filePath, { name: imgFileName })];
        }
      } else if (attachmentId) {
        editPayload.attachments = [{ id: attachmentId }];
      }

      const editedMsg = await activeDungeon.gameMessage.edit(editPayload).catch(() => null);
      if (editedMsg) {
        activeDungeon.gameMessage = editedMsg;
        editSuccess = true;
      }
    } catch (e) {
      console.warn("[RPG_DUNGEON] Direct edit failed:", e.message);
    }

    // 2. If direct edit failed, resend message
    if (!editSuccess) {
      if (activeDungeon.gameMessage) await activeDungeon.gameMessage.delete().catch(() => null);
      const fallbackPayload = { ...payload };
      if (filePath && imgFileName) {
        fallbackPayload.files = [new AttachmentBuilder(filePath, { name: imgFileName })];
      }
      const newMsg = await channel.send(fallbackPayload).catch(() => null);
      if (newMsg) {
        activeDungeon.gameMessage = newMsg;
        setupCollector(channel, activeDungeon);
      }
    }
  } else {
    const initialPayload = { ...payload };
    if (filePath && imgFileName) {
      initialPayload.files = [new AttachmentBuilder(filePath, { name: imgFileName })];
    }
    activeDungeon.gameMessage = await channel.send(initialPayload).catch(() => null);
    if (activeDungeon.gameMessage) {
      setupCollector(channel, activeDungeon);
    }
  }
  if (activeDungeon.gameMessage) {
    activeDungeon.lastImgFileName = imgFileName;
    const attachment = activeDungeon.gameMessage.attachments && typeof activeDungeon.gameMessage.attachments.first === "function"
      ? activeDungeon.gameMessage.attachments.first()
      : null;
    if (attachment) {
      activeDungeon.attachmentId = attachment.id;
      activeDungeon.imageUrl = attachment.url;
    }
  }
  if (enemy.isBoss && enemy.phase === 1 && hasDice && !activeDungeon.diceRolled && !activeDungeon.actionInProgress) {
    await runDiceRoll(channel, activeDungeon);
  }
};
const runDiceRoll = async (channel, activeDungeon) => {
  activeDungeon.actionInProgress = true;
  const alivePlayers = activeDungeon.players.filter((p) => p.hp > 0);
  if (!alivePlayers.length) return;
  const roller = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
  activeDungeon.logs.push(`🎲 <@${roller.id}> đang tung xúc sắc... ${config.emoji.dice_rolling}`);
  await renderGameScreen(channel, activeDungeon);
  setTimeout(async () => {
    const diceValue = Math.floor(Math.random() * 6) + 1;
    const diceEmoji = config.emoji[`dice_${diceValue}`] || "🎲";
    const isOdd = diceValue % 2 !== 0;
    if (isOdd) {
      activeDungeon.diceMultiplier = 0.85;
      activeDungeon.logs.push(`🎲 <@${roller.id}> lắc ra số ${diceEmoji} (**Lẻ**): Giảm 15% sát thương của tổ đội (x0.85).`);
    } else {
      let mult = 1.10;
      if (diceValue === 4) mult = 1.25;
      else if (diceValue === 6) mult = 1.40;
      activeDungeon.diceMultiplier = mult;
      activeDungeon.logs.push(`🎲 <@${roller.id}> lắc ra số ${diceEmoji} (**Chẵn**): Tăng sát thương của tổ đội lên **x${mult}**!`);
    }
    activeDungeon.diceRolled = true;
    activeDungeon.actionInProgress = false;
    await renderGameScreen(channel, activeDungeon);
  }, getDelay(activeDungeon, 2500));
};
const setupCollector = (channel, activeDungeon) => {
  if (activeDungeon.cleanupListener) {
    activeDungeon.cleanupListener();
  }
  if (!activeDungeon.gameMessage) return;

  const collector = activeDungeon.gameMessage.createMessageComponentCollector({
    filter: (i) => i.customId.startsWith("rpg_dungeon_action_") || i.customId.startsWith("rpg_dungeon_coin_"),
    time: 30 * 60 * 1000,
  });

  collector.on("collect", async (i) => {
    if (activeDungeon.isFinished) return;
    activeDungeon.lastInteraction = i;
    try {
      const pExist = activeDungeon.players.find((p) => p.id === i.user.id);
      if (!pExist) {
        return safeInteractionReply(i, { content: "❌ Bạn không thuộc tổ đội khiêu chiến phó bản này!", ephemeral: true });
      }
      if (activeDungeon.actionInProgress) {
        return safeInteractionReply(i, { content: "⏳ Hệ thống đang xử lý lượt trước, hãy đợi một chút!", ephemeral: true });
      }
      const currentActor = activeDungeon.currentActor;
      if (!currentActor || currentActor.id !== i.user.id) {
        return safeInteractionReply(i, { content: "❌ Không phải lượt của bạn!", ephemeral: true });
      }
      activeDungeon.actionInProgress = true;
      if (!(await safeDeferUpdate(i))) {
        activeDungeon.actionInProgress = false;
        return;
      }

      if (i.customId === "rpg_dungeon_action_heal") {
        if (pExist.healBanRounds && pExist.healBanRounds > 0) {
          activeDungeon.actionInProgress = false;
          const bossCfg = getBossConfig(activeDungeon.chapter);
          const passiveName = bossCfg.passive?.name || "Lời Nguyền Xương";
          return safeInteractionFollowUp(i, { content: `❌ Bạn đang bị dính [${passiveName}] trong **${pExist.healBanRounds}** lượt nữa!`, ephemeral: true });
        }
        if (pExist.potions <= 0) {
          activeDungeon.actionInProgress = false;
          return safeInteractionFollowUp(i, { content: "❌ Bạn đã dùng hết bình máu trong phó bản này!", ephemeral: true });
        }
        const potionHealPct = config.dungeon?.potion_heal_pct ?? 0.35;
        pExist.hp = Math.min(pExist.maxHp, pExist.hp + Math.floor(pExist.maxHp * potionHealPct));
        pExist.potions -= 1;
        activeDungeon.logs.push(`<:heal:1521938487907975198> **${Math.floor(pExist.maxHp * potionHealPct).toLocaleString()}** (uống bình máu hồi phục cho **${pExist.name}**).`);
        if (pExist.skillBanRounds && pExist.skillBanRounds > 0) {
          pExist.skillBanRounds -= 1;
          if (pExist.skillBanRounds === 0) {
            activeDungeon.logs.push(`✨ Phong ấn cấm kỹ năng trên **${pExist.name}** đã được giải trừ.`);
          }
        }
        pExist.hasActedThisRound = true;
        activeDungeon.actionInProgress = false;
        await nextTurn(channel, activeDungeon);
      } else if (i.customId === "rpg_dungeon_action_attack") {
        pExist.hasActedThisRound = true;
        if (pExist.healBanRounds && pExist.healBanRounds > 0) {
          pExist.healBanRounds -= 1;
          if (pExist.healBanRounds === 0) {
            activeDungeon.logs.push(`✨ Lời nguyền cấm hồi máu trên **${pExist.name}** đã được giải trừ.`);
          }
        }
        if (pExist.skillBanRounds && pExist.skillBanRounds > 0) {
          pExist.skillBanRounds -= 1;
          if (pExist.skillBanRounds === 0) {
            activeDungeon.logs.push(`✨ Phong ấn cấm kỹ năng trên **${pExist.name}** đã được giải trừ.`);
          }
        }
        const isPhase2 = activeDungeon.enemy.isBoss && activeDungeon.enemy.phase === 2;
        const bossCfg = getBossConfig(activeDungeon.chapter);
        const hasCoin = bossCfg?.mechanics?.coin_flip ?? false;
        if (isPhase2 && hasCoin && activeDungeon.coinFlipCount >= 2) {
          await askCoinFlip(channel, activeDungeon, pExist);
        } else {
          await executePlayerAttack(channel, activeDungeon, pExist, 1.0);
        }
      } else if (i.customId === "rpg_dungeon_action_skill") {
        pExist.hasActedThisRound = true;
        if (pExist.healBanRounds && pExist.healBanRounds > 0) {
          pExist.healBanRounds -= 1;
          if (pExist.healBanRounds === 0) {
            activeDungeon.logs.push(`✨ Lời nguyền cấm hồi máu trên **${pExist.name}** đã được giải trừ.`);
          }
        }
        if (pExist.skillBanRounds && pExist.skillBanRounds > 0) {
          pExist.skillBanRounds -= 1;
          if (pExist.skillBanRounds === 0) {
            activeDungeon.logs.push(`✨ Phong ấn cấm kỹ năng trên **${pExist.name}** đã được giải trừ.`);
          }
        }
        await executePlayerSkill(channel, activeDungeon, pExist);
      } else if (i.customId === "rpg_dungeon_action_crimson") {
        pExist.hasActedThisRound = true;
        if (pExist.healBanRounds && pExist.healBanRounds > 0) {
          pExist.healBanRounds -= 1;
          if (pExist.healBanRounds === 0) {
            activeDungeon.logs.push(`✨ Lời nguyền cấm hồi máu trên **${pExist.name}** đã được giải trừ.`);
          }
        }
        if (pExist.skillBanRounds && pExist.skillBanRounds > 0) {
          pExist.skillBanRounds -= 1;
          if (pExist.skillBanRounds === 0) {
            activeDungeon.logs.push(`✨ Phong ấn cấm kỹ năng trên **${pExist.name}** đã được giải trừ.`);
          }
        }
        const hpCost = Math.floor(pExist.maxHp * 0.15);
        pExist.hp = Math.max(1, pExist.hp - hpCost);
        activeDungeon.logs.push(`<:bleed:1521938497642958889> **${pExist.name}** hy sinh **${hpCost.toLocaleString()}** HP để kích hoạt **Huyết Sát**!`);
        activeDungeon.crimsonActivePlayer = pExist.id;
        activeDungeon.crimsonHpCost = hpCost;
        await executePlayerAttack(channel, activeDungeon, pExist, 1.36);
      }
    } catch (err) {
      console.error("[Dungeon] Lỗi trong interaction collect:", err);
      activeDungeon.actionInProgress = false;
      const ignoredErrors = [
        "unknown interaction",
        "interaction has already been acknowledged",
        "interaction_already_acknowledged",
        "time"
      ];
      const errMsg = String(err.message || "").toLowerCase();
      const shouldIgnore = ignoredErrors.some((msg) => errMsg.includes(msg));
      if (!shouldIgnore) {
        try {
          await channel.send(`⚠️ Lỗi hệ thống: \`${err.message}\`. Bạn có thể thử lại.`);
        } catch (_) {}
      }
    }
  });

  activeDungeon.collector = collector;
  activeDungeon.cleanupListener = () => {
    try {
      collector.stop();
    } catch (_) {}
    activeDungeon.collector = null;
  };
};
const askCoinFlip = async (channel, activeDungeon, player) => {
  const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_coin_heads")
      .setLabel("Ngửa")
      .setEmoji("🪙")
      .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_coin_tails")
      .setLabel("Sấp")
      .setEmoji("🪙")
      .setStyle(ButtonStyle.Primary)
  );
  const coinEmbed = new EmbedBuilder()
    .setColor(getRpgColor("reward"))
    .setTitle(formatRpgTitle("Cơ hội tăng sát thương", "🪙"))
    .setDescription(`<@${player.id}>, đòn đánh thứ 3 của tổ đội sắp tung đồng xu.\nĐoán đúng để nhận **x1.5–x1.8 sát thương**.`)
    .setFooter(formatRpgFooter("Chọn ngửa hoặc sấp trong 20 giây"));
  const coinMsg = await channel.send({
    content: `<@${player.id}>`,
    embeds: [coinEmbed],
    components: [row],
    skipV2: true,
  });
  const filter = (i) => i.user.id === player.id && i.customId.startsWith("rpg_dungeon_coin_");
  const comp = await coinMsg.awaitMessageComponent({ filter, time: 20000 }).catch(() => null);
  if (!comp) {
    await coinMsg.delete().catch(() => {});
    activeDungeon.logs.push(`⏳ Quá thời gian chọn mặt đồng xu! Sát thương bình thường (x1.0). Chuỗi đoán đúng bị ngắt!`);
    activeDungeon.consecutiveCoinSuccess = 0;
    activeDungeon.coinFlipCount = 0; 
    return executePlayerAttack(channel, activeDungeon, player, 1.0);
  }
  if (!(await safeDeferUpdate(comp))) {
    await coinMsg.delete().catch(() => {});
    activeDungeon.logs.push(`⏳ Lựa chọn đồng xu đã hết hiệu lực! Sát thương bình thường (x1.0). Chuỗi đoán đúng bị ngắt!`);
    activeDungeon.consecutiveCoinSuccess = 0;
    activeDungeon.coinFlipCount = 0;
    return executePlayerAttack(channel, activeDungeon, player, 1.0);
  }
  const guess = comp.customId === "rpg_dungeon_coin_heads" ? "h" : "t";
  await safeInteractionEditReply(comp, {
    content: `🪙 Đồng xu đang quay... ${config.emoji.coinflip}`,
    embeds: [],
    components: [],
    skipV2: true,
  });
  setTimeout(async () => {
    const isHeads = Math.random() < 0.5;
    const result = isHeads ? "h" : "t";
    const resultEmoji = isHeads ? config.emoji.heads : config.emoji.tails;
    const resultLabel = isHeads ? "Heads" : "Tails";
    await coinMsg.delete().catch(() => {});
    let multiplier = 1.0;
    if (guess === result) {
      activeDungeon.consecutiveCoinSuccess = (activeDungeon.consecutiveCoinSuccess || 0) + 1;
      multiplier = Math.min(1.8, 1.5 + (activeDungeon.consecutiveCoinSuccess - 1) * 0.15);
      activeDungeon.logs.push(`🪙 Kết quả là ${resultEmoji} (**${resultLabel}**). **${player.name}** đoán CHÍNH XÁC! Nhận chuỗi thắng liên tiếp **${activeDungeon.consecutiveCoinSuccess}** và sát thương được nhân **x${multiplier}**!`);
    } else {
      activeDungeon.consecutiveCoinSuccess = 0;
      multiplier = 1.0;
      activeDungeon.logs.push(`🪙 Kết quả là ${resultEmoji} (**${resultLabel}**). **${player.name}** đoán SAI! Sát thương bình thường (x1.0). Chuỗi đoán đúng bị ngắt!`);
    }
    activeDungeon.coinFlipCount = 0; 
    await executePlayerAttack(channel, activeDungeon, player, multiplier);
  }, getDelay(activeDungeon, 1500));
};
const executePlayerSkill = async (channel, activeDungeon, player) => {
  const enemy = activeDungeon.enemy;
  if (player.skillBanRounds && player.skillBanRounds > 0) {
    activeDungeon.actionInProgress = false;
    return channel.send(`❌ **${player.name}** đang bị cấm sử dụng kỹ năng!`);
  }
  const pWeaponSubType = player.weapon?.subType ? player.weapon.subType.toLowerCase().replace(/\s+/g, "") : "";
  if (pWeaponSubType === "greenstaff") {
    const missingHp = player.maxHp - player.hp;
    const healAmt = Math.max(1, Math.floor(missingHp * 0.10));
    if (healAmt > 0) {
      player.hp = Math.min(player.maxHp, player.hp + healAmt);
      activeDungeon.logs.push(`💚 **[Mộc Diệp Pháp Trượng]** Kích hoạt nội tại: Hồi phục **${healAmt.toLocaleString()}** HP (10% máu đã mất) khi dùng kỹ năng!`);
    }
  }
  if (player.classKey === "warrior") {
    activeDungeon.logs.push(`⚔️ **${player.name}** giải phóng kỹ năng **[Trọng Kiếm]**, chém một đòn cực mạnh vào **${enemy.name}**!`);
    player.rage = 0;
    await executePlayerAttack(channel, activeDungeon, player, 4.0, true);
    player.rage = 0;
  } else if (player.classKey === "assassin") {
    activeDungeon.logs.push(`🗡️ **${player.name}** tung chiêu thức **[Đâm Lén]** cực hiểm hóc vào điểm yếu của **${enemy.name}**!`);
    enemy.bleedRounds = Math.max(enemy.bleedRounds || 0, 3);
    enemy.bleedDamage = Math.max(enemy.bleedDamage || 0, getAssassinSkillBleedDamage(player, enemy.maxHp));
    player.rage = 0;
    await executePlayerAttack(channel, activeDungeon, player, 2.0, true);
    player.rage = 0;
  } else if (player.classKey === "archer") {
    activeDungeon.logs.push(`🏹 **${player.name}** giương cung bắn ra đại tiễn **[Xuyên Táo]** xuyên thấu **${enemy.name}**!`);
    activeDungeon.archerDoubleDmgNext = true;
    activeDungeon.archerCasterId = player.id;
    player.rage = 0;
    await executePlayerAttack(channel, activeDungeon, player, 3.0, true);
    player.rage = 0;
  } else if (player.classKey === "mage") {
    const currentMana = player.mana ?? 100;
    if (currentMana < 25) {
      activeDungeon.actionInProgress = false;
      return channel.send(`❌ **${player.name}** không đủ Mana để dùng kỹ năng!`);
    }
    player.mana = currentMana - 25;
    activeDungeon.logs.push(`🔮 **${player.name}** tập hợp ma lực giải phóng pháp thuật **[Siêu Năng]** dội xuống **${enemy.name}**!`);
    await executePlayerAttack(channel, activeDungeon, player, 3.0, true);
  } else if (player.classKey === "paladin") {
    const paladinHealPct = Number(config.rpg?.balance?.dungeon?.paladin_team_heal_pct) || 0.22;
    const paladinCount = activeDungeon.players.filter((member) => member.classKey === "paladin").length;
    const duplicateHealMultiplier = Number(config.rpg?.balance?.dungeon?.paladin_duplicate_heal_multiplier) || 0.75;
    const effectivePaladinHealPct = paladinHealPct * Math.pow(duplicateHealMultiplier, Math.max(0, paladinCount - 1));
    activeDungeon.logs.push(`🛡️ **${player.name}** niệm chú kỹ năng **[Thiên Mệnh]**, lập tức giải trừ toàn bộ hiệu ứng bất lợi và hồi phục ${Math.round(effectivePaladinHealPct * 100)}% lượng máu tối đa cho toàn đội!`);
    activeDungeon.players.forEach((p) => {
      if (p.hp > 0) {
        const clearedDebuffs = [];
        if (p.poisonRounds && p.poisonRounds > 0) {
          p.poisonRounds = 0;
          clearedDebuffs.push("Độc");
        }
        if (p.healBanRounds && p.healBanRounds > 0) {
          p.healBanRounds = 0;
          clearedDebuffs.push("Cấm Hồi Máu");
        }
        if (p.skillBanRounds && p.skillBanRounds > 0) {
          p.skillBanRounds = 0;
          clearedDebuffs.push("Cấm Kỹ Năng");
        }
        if (clearedDebuffs.length > 0) {
          activeDungeon.logs.push(`<:dispe:1521938483730710578> **${p.name}** được Paladin thanh tẩy hiệu ứng: **${clearedDebuffs.join(", ")}**.`);
        }
        const healAmount = Math.floor(p.maxHp * effectivePaladinHealPct);
        const oldHp = p.hp;
        p.hp = Math.min(p.maxHp, p.hp + healAmount);
        const actualHealed = p.hp - oldHp;
        if (actualHealed > 0) {
          activeDungeon.logs.push(`<:heal:1521938487907975198> **${actualHealed.toLocaleString()}** (Paladin hồi phục cho **${p.name}**).`);
        } else {
          activeDungeon.logs.push(`💚 **${p.name}** đang đầy máu.`);
        }
      }
    });
    player.rage = Math.max(0, (player.rage || 0) - 50) + 10;
    player.hasActedThisRound = true;
    activeDungeon.actionInProgress = false;
    await nextTurn(channel, activeDungeon);
  } else if (player.classKey === "wretch") {
    const fateRoll = Math.random();
    let skillMult;
    let fateName;
    let fateEmoji;
    if (fateRoll < 0.25) {
      skillMult = 2.2;
      fateName = "Số Phận Mỉm Cười";
      fateEmoji = "🍀";
    } else if (fateRoll < 0.60) {
      skillMult = 1.6;
      fateName = "Cú Đập May Rủi";
      fateEmoji = "🎲";
    } else if (fateRoll < 0.85) {
      skillMult = 1.15;
      fateName = "Số Phận Thử Thách";
      fateEmoji = "⚖️";
    } else {
      skillMult = 1.0;
      fateName = "Trò Đùa Vận Rủi";
      fateEmoji = "💢";
      player.rage = Math.max(0, (player.rage || 0) - 30);
      activeDungeon.logs.push(`💢 **${player.name}** vận rủi giáng xuống chính mình: **-30% Nộ**!`);
    }
    activeDungeon.logs.push(`${fateEmoji} **${player.name}** giao phó số phận cho lưỡi dao: **[${fateName}]** (x${skillMult.toFixed(1)} sát thương) lao vào **${enemy.name}**!`);
    player.rage = 0;
    await executePlayerAttack(channel, activeDungeon, player, skillMult, true);
    player.rage = 0;
  } else {
    activeDungeon.actionInProgress = false;
    return channel.send(`❌ Class này không có kỹ năng đặc biệt.`);
  }
};
const executePlayerAttack = async (channel, activeDungeon, player, multiplier, isSkill = false, isSecondHit = false) => {
  const enemy = activeDungeon.enemy;
  if ((enemy.key === "eldric" || enemy.key === "draugor") && !enemy.poiseBroken && !isSkill) {
    const isRanged = player.classKey === "archer" || player.classKey === "mage";
    const deflectionChance = isRanged ? 0.35 : 0.20;
    if (Math.random() < deflectionChance) {
      activeDungeon.actionInProgress = false;
      activeDungeon.logs.push(`🏹 **[Cung Trọng Trường]** Trọng lực bẻ cong đòn đánh! Đòn tấn công của **${player.name}** bị lệch hướng và trượt!`);
      if (player.classKey !== "mage") {
        player.rage = Math.min(100, (player.rage || 0) + 10);
      }
      await nextTurn(channel, activeDungeon);
      return;
    }
  }
  if (enemy.key === "veilreaper" && !enemy.poiseBroken && !isSkill) {
    const isRanged = player.classKey === "archer" || player.classKey === "mage";
    const dodgeChance = isRanged ? 0.35 : 0.20;
    if (Math.random() < dodgeChance) {
      activeDungeon.actionInProgress = false;
      activeDungeon.logs.push(`⚡ **${enemy.name}** di chuyển chớp nhoáng, né tránh đòn tấn công của **${player.name}**!`);
      if (player.classKey !== "mage") {
        player.rage = Math.min(100, (player.rage || 0) + 10);
      }
      await nextTurn(channel, activeDungeon);
      return;
    }
  }
  const pWeaponSubType = player.weapon?.subType ? player.weapon.subType.toLowerCase().replace(/\s+/g, "") : "";
  let isMagical = CLASS_ATTACK_TYPES[player.classKey] === "magical";
  if (pWeaponSubType === "duskanddawn") {
    if (player.duskDawnNext === undefined) {
      player.duskDawnNext = "magical";
    }
    isMagical = player.duskDawnNext === "magical";
    player.duskDawnNext = isMagical ? "physical" : "magical";
  }
  const baseAttack = isMagical
    ? player.stats.int * 3.5 + player.stats.arc * 1.5
    : player.stats.str * 2.5 + player.stats.dex * 1.5;
  const playerBuff = getDungeonPlayerBuff();
  let rawDamage = (baseAttack + player.power) * multiplier * playerBuff.damageMultiplier;
  if (!getDungeonWeaponKey(player.weapon?.subType)) {
    rawDamage *= Number(config.dungeon?.player_buff?.normal_weapon_damage_multiplier) || 1;
  }
  if (player.atkDown) {
    rawDamage *= 0.5;
    player.atkDown = false;
    activeDungeon.logs.push(`👑 **${player.name}** chịu dư âm Khiên Kiêu Ngạo: đòn này giảm **50% sát thương**.`);
  }
  if (activeDungeon.blessing === "active") {
    rawDamage *= 1.2;
  }
  const passiveResult = triggerWeaponPassiveOnAttack(player, enemy, activeDungeon, rawDamage, isMagical, isSecondHit, multiplier, isSkill);
  if (passiveResult.logs.length > 0) {
    activeDungeon.logs.push(...passiveResult.logs);
  }
  if (activeDungeon.archerDoubleDmgNext && player.id !== activeDungeon.archerCasterId) {
    passiveResult.damage *= 2.0;
    activeDungeon.archerDoubleDmgNext = false;
    activeDungeon.logs.push(`✨ Nhận cường hóa từ Xuyên Táo, đòn đánh gây gấp đôi sát thương!`);
  }
  const finalRawDamage = passiveResult.damage * (0.85 + Math.random() * 0.3);
  const classCritBonus = player.rpgClass?.bonuses?.critRate || 0;
  const setCritBonus = player.setBonus?.bonus?.critRate || 0;
  const critRate = Math.min(
    0.85,
    (player.stats.arc * 0.2 + player.stats.dex * 0.1) / 100 + classCritBonus + setCritBonus + playerBuff.critRateBonus
  );
  const isCrit = Math.random() < critRate;
  const critMult = 1.5 + player.stats.dex * 0.002;
  let finalCalculatedDamage = finalRawDamage;
  if (isCrit) {
    finalCalculatedDamage *= critMult;
  }
  const mrOrArmor = passiveResult.mrOrArmor;
  const mitigation = mrOrArmor / (mrOrArmor + 150 + (player.level || 1) * 2);
  let damage = Math.max(10, Math.floor(finalCalculatedDamage * (1 - mitigation)));
  if (player.userRef?.rpg?.isGodMode) {
    damage = enemy.hp;
  }
  if (enemy.isBoss && !enemy.isElite) {
    const classBossDamage = Number(player.rpgClass?.bonuses?.bossDamage) || 0;
    const setBossDamage = Number(player.setBonus?.bonus?.bossDamage) || 0;
    damage = Math.floor(damage * (1 + classBossDamage + setBossDamage));
  }
  if (enemy.isBoss) {
    const bossCfg = getBossConfig(activeDungeon.chapter);
    const hasDice = bossCfg?.mechanics?.dice_roll ?? false;
    const hasCoin = bossCfg?.mechanics?.coin_flip ?? false;
    const frozenPlayer = activeDungeon.players.find(p => p.hp > 0 && p.goldStatueFreeze > 0);
    if (frozenPlayer) {
      frozenPlayer.goldStatueHits = (frozenPlayer.goldStatueHits || 0) + 1;
      activeDungeon.logs.push(`🔨 **${player.name}** đập mạnh vào Tượng Vàng để giải cứu **${frozenPlayer.name}** (Tích lũy ${frozenPlayer.goldStatueHits}/3 lần)!`);
      if (frozenPlayer.goldStatueHits >= 3) {
        frozenPlayer.goldStatueFreeze = 0;
        frozenPlayer.goldStatueHits = 0;
        activeDungeon.logs.push(`✨ **${frozenPlayer.name}** đã thoát khỏi trạng thái phong ấn Tượng Vàng!`);
      }
    }
    const isPridePhase = enemy.key === "lucifer" || (enemy.key === "pandemonium" && enemy.hp / enemy.maxHp > 0.85);
    if (isPridePhase) {
      if (isSkill) {
        player.hp = Math.max(0, player.hp - damage);
        player.atkDown = true;
        activeDungeon.logs.push(`⚠️ **[Khiên Phản Chiếu]** **${player.name}** sử dụng kỹ năng đánh trúng Khiên Kiêu Ngạo, bị phản phản lại **${damage.toLocaleString()}** sát thương và giảm 50% sức công lượt kế!`);
        damage = 0;
      } else {
        activeDungeon.prideHitCounter = (activeDungeon.prideHitCounter || 0) + 1;
        if (activeDungeon.prideHitCounter >= 3) {
          activeDungeon.prideHitCounter = 0;
          activeDungeon.prideCounter = (activeDungeon.prideCounter || 0) + 1;
          activeDungeon.logs.push(`👑 **[Pride Stack]** **${enemy.name}** hấp thụ nhịp tấn công của tổ đội và tích lũy Kiêu Ngạo (${activeDungeon.prideCounter}/10).`);
        }
      }
    }
    const isSlothPhase = enemy.key === "belphegor" || (enemy.key === "pandemonium" && enemy.hp / enemy.maxHp <= 0.10 && enemy.hp / enemy.maxHp > 0.05);
    if (isSlothPhase && !enemy.slothfulShieldBroken) {
      const breakProgress = getSlothShieldBreakProgress({
        classKey: player.classKey,
        weaponSubType: pWeaponSubType,
        isSkill,
        bossIsBurning: enemy.burnRounds > 0,
      });
      enemy.slothShieldProgress = (enemy.slothShieldProgress || 0) + breakProgress;
      if (enemy.slothShieldProgress >= 6) {
        enemy.slothfulShieldBroken = true;
        activeDungeon.logs.push(`💥 **${player.name}** hoàn tất phá **Kén Lười Biếng**! Đòn nặng, búa thần hoặc kỹ năng khi boss đang cháy sẽ phá kén nhanh hơn.`);
      } else {
        activeDungeon.logs.push(`🛡️ **[Kén Lười Biếng]** hấp thụ đòn của **${player.name}** — tiến độ phá kén **${enemy.slothShieldProgress}/6**. Đòn nặng, búa thần và kỹ năng hệ Lửa hiệu quả hơn.`);
        damage = 0;
      }
    }
    const isGluttonyPhase = enemy.key === "beelzebub" || (enemy.key === "pandemonium" && enemy.hp / enemy.maxHp <= 0.40 && enemy.hp / enemy.maxHp > 0.25);
    if (isGluttonyPhase && activeDungeon.swallowedPlayerId) {
      setTimeout(() => {
        const isBurnApplied = enemy.burnRounds && enemy.burnRounds > 0;
        if (isBurnApplied) {
          const swallowedP = activeDungeon.players.find(p => p.id === activeDungeon.swallowedPlayerId);
          if (swallowedP) {
            swallowedP.isSwallowed = false;
            activeDungeon.logs.push(`🤢 **${enemy.name}** bị bỏng lửa thiêu đốt dạ dày, bắt buộc phải nôn **${swallowedP.name}** ra ngoài!`);
            delete activeDungeon.swallowedPlayerId;
          }
        }
      }, 50);
    }
    if (enemy.phase === 1) {
      if (hasDice) {
        damage = Math.floor(damage * activeDungeon.diceMultiplier);
      }
    } else {
      if (hasCoin) {
        activeDungeon.coinFlipCount = (activeDungeon.coinFlipCount || 0) + 1;
      }
    }
    if (bossCfg?.mechanics?.vulnerable_on_heal_ban) {
      const isAnyPlayerHealBanned = activeDungeon.players.some((p) => p.hp > 0 && p.healBanRounds && p.healBanRounds > 0);
      if (isAnyPlayerHealBanned) {
        damage = Math.floor(damage * 2.0);
      }
    }
    if (enemy.poiseBroken) {
      damage = Math.floor(damage * 2.0);
    }
    damage = getDungeonBossDamage(damage, enemy.maxHp, isSkill, {
      ignoreLimit: Boolean(player.userRef?.rpg?.isGodMode),
    });
  }
  enemy.hp = Math.max(0, enemy.hp - damage);
  const critText = isCrit ? "💥 **Chí mạng!** " : "";
  activeDungeon.logs.push(`🗡️ **${player.name}** tấn công **${enemy.name}** gây ${critText}**${damage.toLocaleString()}** sát thương.`);
  if (enemy.isBoss) {
    const bossCfgLocal = getBossConfig(activeDungeon.chapter);
    const nextForm = getBossForm(bossCfgLocal, enemy);
    if (nextForm && nextForm.image !== enemy.currentFormImage) {
      enemy.currentFormImage = nextForm.image;
      enemy.currentFormName = nextForm.name;
      activeDungeon.logs.push(`👹 **${enemy.name}** bị trọng thương, giải phóng sức mạnh tội lỗi — biến hóa thành **[${nextForm.name}]**!`);
    }
  }
  if (enemy.isBoss && !enemy.poiseBroken) {
    const poiseDamageCap = Number(config.dungeon?.combat_balance?.poise_damage_cap) || 24;
    let poiseDmg = Math.min(poiseDamageCap, Math.max(6, Math.floor(damage * 0.00032)));
    const pridePhase = enemy.key === "lucifer" || (enemy.key === "pandemonium" && enemy.hp / enemy.maxHp > 0.85);
    if (pridePhase && !isSkill) poiseDmg = Math.max(12, poiseDmg);
    if (player.classKey === "warrior" && isSkill) {
      poiseDmg = Math.min(poiseDamageCap, Math.max(12, Math.floor(poiseDmg * 1.5)));
      activeDungeon.logs.push(`⚔️ **[Trọng Kiếm]** Đòn đánh nặng phá hủy thêm **${poiseDmg}** Poise của Boss!`);
    }
    enemy.poise = Math.max(0, enemy.poise - poiseDmg);
    if (enemy.poise <= 0) {
      enemy.poiseBroken = true;
      activeDungeon.logs.push(`🛡️ **[PHÁ VỠ POISE]** Sức tấn công của nhóm đã làm **${enemy.name}** bị quỵ ngã! Boss nhận thêm **100% sát thương** cho đến lượt đi tiếp theo!`);
    }
  }
  if (player.classKey !== "mage") {
    player.rage = Math.min(100, (player.rage || 0) + 10);
  }
  let doubleHitTriggered = passiveResult.doubleHitTriggered;
  if (doubleHitTriggered && enemy.hp > 0) {
    activeDungeon.logs.push(`🌅 **[Dusk and Dawn]** Sức mạnh bình minh và hoàng hôn cộng hưởng! **${player.name}** tấn công liên kích thêm một lần nữa!`);
    await executePlayerAttack(channel, activeDungeon, player, multiplier, isSkill, true);
  }
  if (!doubleHitTriggered) {
    if (enemy.hp > 0) {
      const petUser = player.userRef;
      const pet = petUser ? getEquippedPet(petUser) : null;
      if (pet) {
        const petDmg = petAttackDamage(pet, "dungeon");
        enemy.hp = Math.max(0, enemy.hp - petDmg);
        activeDungeon.logs.push(getPetAttackLog(pet, "dungeon", petDmg));
      }
    }
    activeDungeon.actionInProgress = false;
    if (enemy.hp <= 0) {
      if (activeDungeon.crimsonActivePlayer === player.id) {
        const hpRefund = activeDungeon.crimsonHpCost || 0;
        player.hp = Math.min(player.maxHp, player.hp + hpRefund);
        activeDungeon.logs.push(`<:bleed:1521938497642958889> **${player.name}** tiêu diệt mục tiêu và được hồi lại **${hpRefund.toLocaleString()}** HP từ nội tại Crimson Dagger!`);
      }
      delete activeDungeon.crimsonActivePlayer;
      delete activeDungeon.crimsonHpCost;
      await handleEnemyDefeat(channel, activeDungeon);
    } else {
      delete activeDungeon.crimsonActivePlayer;
      delete activeDungeon.crimsonHpCost;
      await nextTurn(channel, activeDungeon);
    }
  }
};
const nextTurn = async (channel, activeDungeon) => {
  const alivePlayers = activeDungeon.players.filter((p) => p.hp > 0);
  alivePlayers.sort((a, b) => (b.stats?.dex || 0) - (a.stats?.dex || 0));
  const nextPlayer = alivePlayers.find((p) => !p.hasActedThisRound);
  if (nextPlayer) {
    if (nextPlayer.isSwallowed || nextPlayer.goldStatueFreeze > 0) {
      nextPlayer.hasActedThisRound = true;
      activeDungeon.logs.push(`⏳ **${nextPlayer.name}** mất lượt vì đang bị ${nextPlayer.isSwallowed ? "nuốt chửng" : "giam trong tượng vàng"}.`);
      return nextTurn(channel, activeDungeon);
    }
    const statusResult = tickStatusEffects(nextPlayer, activeDungeon);
    if (statusResult.logs.length > 0) {
      activeDungeon.logs.push(...statusResult.logs);
    }
    if (statusResult.skipTurn) {
      nextPlayer.hasActedThisRound = true;
      return nextTurn(channel, activeDungeon);
    }
    if (nextPlayer.hp <= 0) {
      nextPlayer.hasActedThisRound = true;
      return nextTurn(channel, activeDungeon);
    }
    const playerSubType = nextPlayer.weapon?.subType ? nextPlayer.weapon.subType.toLowerCase().replace(/\s+/g, "") : "";
    if (playerSubType.includes("shieldhex") && nextPlayer.shieldhexRounds >= 3) {
      const reflectPct = Number(config.rpg?.balance?.dungeon?.shieldhex_reflect_pct) || 0.75;
      const reflectDmg = Math.floor((nextPlayer.shieldhexAbsorbed || 0) * reflectPct);
      const enemy = activeDungeon.enemy;
      enemy.hp = Math.max(0, enemy.hp - reflectDmg);
      activeDungeon.logs.push(`🛡️ **[Shieldhex]** Giải phóng năng lượng tích tụ phản hồi lại **${reflectDmg.toLocaleString()}** sát thương lên **${enemy.name}**!`);
      nextPlayer.shieldhexAbsorbed = 0;
      nextPlayer.shieldhexRounds = 0;
      if (enemy.hp <= 0) {
        activeDungeon.logs.push(`💀 **${enemy.name}** đã bị tiêu diệt bởi phản đòn từ khiên thần!`);
        activeDungeon.actionInProgress = false;
        await handleEnemyDefeat(channel, activeDungeon);
        return;
      }
    }
    activeDungeon.currentActor = nextPlayer;
    activeDungeon.actionInProgress = false;
    await renderGameScreen(channel, activeDungeon);
    if (activeDungeon.isSimulation) {
      setTimeout(async () => {
        await runSimulatedTurn(channel, activeDungeon, nextPlayer);
      }, getDelay(activeDungeon, 2000));
    }
  } else {
    activeDungeon.currentActor = activeDungeon.enemy;
    await renderGameScreen(channel, activeDungeon);
    activeDungeon.actionInProgress = true;
    setTimeout(async () => {
      await runEnemyTurn(channel, activeDungeon);
    }, getDelay(activeDungeon, 2000));
  }
};
const runEnemyTurn = async (channel, activeDungeon) => {
  const enemy = activeDungeon.enemy;
  const alivePlayers = activeDungeon.players.filter((p) => p.hp > 0);
  if (!alivePlayers.length) {
    await handleDefeat(channel, activeDungeon);
    return;
  }
  const statusResult = tickStatusEffects(enemy, activeDungeon);
  if (statusResult.logs.length > 0) {
    activeDungeon.logs.push(...statusResult.logs);
  }
  if (statusResult.skipTurn) {
    activeDungeon.players.forEach((p) => {
      p.hasActedThisRound = false;
    });
    activeDungeon.actionInProgress = false;
    await nextTurn(channel, activeDungeon);
    return;
  }
  if (enemy.hp <= 0) {
    activeDungeon.actionInProgress = false;
    await handleEnemyDefeat(channel, activeDungeon);
    return;
  }
  if (enemy.isBoss && enemy.poiseBroken) {
    activeDungeon.logs.push(`💥 **${enemy.name}** vẫn đang bị phá vỡ Poise — mất lượt tấn công! Poise phục hồi.`);
    if (activeDungeon.prideCounter > 0) {
      activeDungeon.prideCounter = Math.max(0, activeDungeon.prideCounter - 5);
      activeDungeon.prideHitCounter = 0;
      activeDungeon.logs.push(`👑 Nhịp Kiêu Ngạo bị phá vỡ, tích lũy nguy hiểm giảm còn **${activeDungeon.prideCounter}/10**.`);
    }
    if (enemy.wrathStacks > 0) {
      enemy.wrathStacks = Math.floor(enemy.wrathStacks / 2);
      activeDungeon.logs.push(`🔥 Nhịp Cuồng Nộ bị bẻ gãy, cộng dồn còn **${enemy.wrathStacks}/5**.`);
    }
    const swallowedPlayer = activeDungeon.players.find((player) => player.isSwallowed);
    if (swallowedPlayer) {
      swallowedPlayer.isSwallowed = false;
      delete activeDungeon.swallowedPlayerId;
      activeDungeon.logs.push(`💥 Cú quỵ ngã khiến **${enemy.name}** nhả **${swallowedPlayer.name}** ra.`);
    }
    enemy.poiseBroken = false;
    enemy.poise = enemy.poiseMax || (80 + (activeDungeon.chapter || 1) * 20);
    activeDungeon.players.forEach((p) => {
      p.hasActedThisRound = false;
    });
    activeDungeon.actionInProgress = false;
    await nextTurn(channel, activeDungeon);
    return;
  }
  if (enemy.key === "mourngait" && Math.random() < 0.35) {
    const targets = [];
    const pool = [...alivePlayers];
    const targetCount = alivePlayers.length >= 3 ? 2 : (alivePlayers.length === 2 ? 1 : 0);
    for (let i = 0; i < targetCount; i++) {
      if (pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        targets.push(pool.splice(idx, 1)[0]);
      }
    }
    if (targets.length > 0) {
      activeDungeon.logs.push(`🔥 **${enemy.name}** kích hoạt tà thuật **[Hắc Hỏa Cấm Chú]** phong ấn kỹ năng của đối thủ!`);
      targets.forEach((t) => {
        t.skillBanRounds = (t.skillBanRounds || 0) + 1;
        activeDungeon.logs.push(`🚫 **${t.name}** bị cấm sử dụng kỹ năng (cộng dồn thêm **1** lượt, tổng cộng còn ${t.skillBanRounds} lượt)!`);
      });
    }
  }
  if (enemy.key === "vaelmor" && Math.random() < 0.35) {
    activeDungeon.logs.push(`☣️ **${enemy.name}** giải phóng **[Hơi Thở Kịch Độc: Vaelmor Miasma]** lan tỏa khắp trận địa!`);
    activeDungeon.players.forEach((p) => {
      if (p.hp > 0) {
        p.poisonRounds = Math.min(4, (p.poisonRounds || 0) + 3);
        p.poisonDamage = Math.max(1, Math.floor(p.maxHp * 0.03));
      }
    });
  }
  if (enemy.isBoss && enemy.phase === 2) {
    const bossCfg = getBossConfig(activeDungeon.chapter);
    const passive = bossCfg.passive;
    if (passive && passive.type === "heal_ban" && Math.random() < passive.chance) {
      const target = selectBossTarget(alivePlayers);
      target.healBanRounds = (target.healBanRounds || 0) + passive.duration;
      activeDungeon.logs.push(`💀 **${enemy.name}** sử dụng [${passive.name}] lên **${target.name}**: Cấm sử dụng bình hồi máu (cộng dồn thêm ${passive.duration} lượt, tổng cộng còn ${target.healBanRounds} lượt)!`);
    }
  }
  if (enemy.isBoss && enemy.phase === 2) {
    enemy.phase2TurnCount = (enemy.phase2TurnCount || 0) + 1;
  }
  const aoeInterval = Math.max(1, config.dungeon?.boss_phase2_aoe_interval || 2);
  const isAOE = enemy.isBoss && enemy.phase === 2 && enemy.phase2TurnCount % aoeInterval === 0;
  const mitCfg = config.dungeon?.ranged_class_mitigation;
  if (isAOE) {
    const phase2BossCfg = getBossConfig(activeDungeon.chapter);
    const mult = activeDungeon.phase2Madness;
    if (enemy.key === "eldric") {
      activeDungeon.logs.push(`🌀 **${enemy.name}** giải phóng **[Điểm Kỳ Dị: Hố Đen Trọng Lực]** hút mọi vật thể và ép nát tất cả!`);
    } else if (enemy.key === "veilreaper") {
      activeDungeon.logs.push(`☠️ **${enemy.name}** mở ra **[Vực Sâu Không Gian: Cuồng Phong Diệt Vong]** quét sạch sự sống!`);
    } else {
      activeDungeon.logs.push(`👿 **${enemy.name}** cười quỷ dị và phóng cuồng phong sát thương diện rộng (AOE)!`);
    }
    alivePlayers.forEach((p) => {
      const armor = p.stats.pr * 12.0;
      const mitigation = armor / (armor + 1000);
      const aoeDamageMultiplier = phase2BossCfg?.mechanics?.aoe_damage_multiplier
        ?? config.dungeon?.boss_phase2_aoe_damage_multiplier
        ?? 0.55;
      const rawDmg = enemy.atk * mult * aoeDamageMultiplier * (0.85 + Math.random() * 0.3);
      let damage = Math.max(10, Math.floor(rawDmg * (1 - mitigation)));
      if (mitCfg && mitCfg.classes?.includes(p.classKey)) {
        damage = Math.floor(damage * (mitCfg.multiplier ?? 0.6));
      }
      if (p.classKey === "paladin") {
        damage = Math.floor(damage * 0.95);
      }
      const playerSubType = p.weapon?.subType ? p.weapon.subType.toLowerCase().replace(/\s+/g, "") : "";
      if (playerSubType.includes("shieldhex")) {
        const absorbPct = Number(config.rpg?.balance?.dungeon?.shieldhex_absorb_pct) || 0.15;
        const absorbed = Math.floor(damage * absorbPct);
        damage -= absorbed;
        p.shieldhexAbsorbed = (p.shieldhexAbsorbed || 0) + absorbed;
        p.shieldhexRounds = (p.shieldhexRounds || 0) + 1;
      }
      const actualDmg = Math.min(p.hp, damage);
      activeDungeon.totalDamageTaken = (activeDungeon.totalDamageTaken || 0) + actualDmg;
      p.hp = Math.max(0, p.hp - damage);
      if (p.hp > 0 && p.classKey !== "mage") {
        p.rage = Math.min(100, (p.rage || 0) + 10);
      }
      activeDungeon.logs.push(`💥 Gây **${damage.toLocaleString()}** st lên **${p.name}**.`);
      if (p.hp <= 0) {
        activeDungeon.logs.push(`💀 **${p.name}** đã tử nạn!`);
      }
    });
    const madnessInc = activeDungeon.chapter >= 4 ? 0.03 : 0.04;
    activeDungeon.phase2Madness = Math.min(1.30, activeDungeon.phase2Madness + madnessInc);
  } else {
    let target = selectBossTarget(alivePlayers);
    if (enemy.key === "pandemonium") {
      const hpRatio = enemy.hp / enemy.maxHp;
      let suffix = "True Form - Thức Tỉnh";
      if (hpRatio === 1.0) suffix = "Dạng Gốc";
      else if (hpRatio > 0.85) suffix = "Kiêu Ngạo - Lucifer";
      else if (hpRatio > 0.70) suffix = "Tham Lam - Mammon";
      else if (hpRatio > 0.55) suffix = "Dục Vọng - Asmodeus";
      else if (hpRatio > 0.40) suffix = "Đố Kỵ - Leviathan";
      else if (hpRatio > 0.25) suffix = "Phàm Ăn - Beelzebub";
      else if (hpRatio > 0.10) suffix = "Phẫn Nộ - Satan";
      else if (hpRatio > 0.05) suffix = "Lười Biếng - Belphegor";
      enemy.name = `Pandemonium (${suffix})`;
    }
    let activeSin = "";
    if (enemy.key === "pandemonium") {
      const hpRatio = enemy.hp / enemy.maxHp;
      if (hpRatio === 1.0) activeSin = "base";
      else if (hpRatio > 0.85) activeSin = "pride";
      else if (hpRatio > 0.70) activeSin = "greed";
      else if (hpRatio > 0.55) activeSin = "lust";
      else if (hpRatio > 0.40) activeSin = "envy";
      else if (hpRatio > 0.25) activeSin = "gluttony";
      else if (hpRatio > 0.10) activeSin = "wrath";
      else if (hpRatio > 0.05) activeSin = "sloth";
      else activeSin = "trueform";
    } else {
      activeSin = enemy.key;
    }
    if (activeSin === "leviathan" || activeSin === "envy") {
      target = [...alivePlayers].sort((a, b) => (b.power || 0) - (a.power || 0))[0] || target;
    }
    const armor = target.stats.pr * 12.0;
    const mitigation = armor / (armor + 1000);
    let isCustomSkillUsed = false;
    let customFollowupMultiplier = 1.0;
    const swallowedP = activeDungeon.players.find(p => p.hp > 0 && p.isSwallowed);
    if (swallowedP) {
      const acidDmg = 600;
      swallowedP.hp = Math.max(0, swallowedP.hp - acidDmg);
      activeDungeon.logs.push(`🤢 **${enemy.name}** tiêu hóa thức ăn! **${swallowedP.name}** mất **${acidDmg.toLocaleString()}** HP do dịch vị Acid trong bụng boss!`);
      if (swallowedP.hp <= 0) {
        swallowedP.isSwallowed = false;
        activeDungeon.logs.push(`💀 **${swallowedP.name}** đã tử nạn bên trong dạ dày của boss!`);
        delete activeDungeon.swallowedPlayerId;
      }
    }
    activeDungeon.players.forEach(p => {
      if (p.hp > 0 && p.isDrowsy) {
        p.isDrowsy = false;
        p.stunRounds = 2;
        activeDungeon.logs.push(`💤 Cơn buồn ngủ ập đến! **${p.name}** đã ngủ thiếp đi trong 2 lượt!`);
      }
    });
    if (activeSin === "lucifer" || activeSin === "pride") {
      if (activeDungeon.prideCounter >= 10 && !enemy.poiseBroken) {
        isCustomSkillUsed = true;
        activeDungeon.logs.push(`👑 **${enemy.name}** tích lũy đủ 10 điểm Kiêu Ngạo, giải phóng **[Phán Quyết Kiêu Ngạo]** quét sạch toàn bộ sinh mệnh!`);
        alivePlayers.forEach(p => p.hp = 0);
        activeDungeon.prideCounter = 0;
      }
    } else if (activeSin === "mammon" || activeSin === "greed") {
      if (Math.random() < 0.40) {
        isCustomSkillUsed = true;
        const targetPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        targetPlayer.goldStatueFreeze = 3;
        targetPlayer.goldStatueHits = 0;
        customFollowupMultiplier = 0.60;
        activeDungeon.logs.push(`🏆 **${enemy.name}** tung ra **[Tượng Vàng Giam Cầm]** hóa đá **${targetPlayer.name}**! Đồng đội phải đập tượng 3 lần để giải thoát!`);
      }
    } else if (activeSin === "asmodeus" || activeSin === "lust") {
      if (Math.random() < 0.40 && alivePlayers.length >= 2) {
        isCustomSkillUsed = true;
        const p1 = alivePlayers[0];
        const p2 = alivePlayers[1];
        p1.chainedTo = p2.id;
        p2.chainedTo = p1.id;
        p1.chainRounds = 3;
        p2.chainRounds = 3;
        customFollowupMultiplier = 0.60;
        activeDungeon.logs.push(`🔗 **${enemy.name}** tung ra **[Sợi Xích Dục Vọng]** liên kết sinh mệnh của **${p1.name}** và **${p2.name}**!`);
      }
    } else if (activeSin === "beelzebub" || activeSin === "gluttony") {
      if (Math.random() < 0.40 && !activeDungeon.swallowedPlayerId) {
        isCustomSkillUsed = true;
        const targetPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        targetPlayer.isSwallowed = true;
        activeDungeon.swallowedPlayerId = targetPlayer.id;
        customFollowupMultiplier = 0.60;
        activeDungeon.logs.push(`🤢 **${enemy.name}** há miệng rộng **[Nuốt Chửng]** **${targetPlayer.name}** vào bụng!`);
      }
    } else if (activeSin === "belphegor" || activeSin === "sloth") {
      if (Math.random() < 0.40) {
        isCustomSkillUsed = true;
        const targetPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        targetPlayer.isDrowsy = true;
        customFollowupMultiplier = 0.60;
        activeDungeon.logs.push(`💤 **${enemy.name}** tỏa ra **[Hơi Thở Ru Ngủ]** bao phủ **${targetPlayer.name}**!`);
      }
    } else if (activeSin === "leviathan" || activeSin === "envy") {
      customFollowupMultiplier = 1 + Math.min(0.20, (target.power || 0) / 100000);
      activeDungeon.logs.push(`🌊 **[Đố Kỵ Vô Hạn]** ${enemy.name} khóa mục tiêu có lực chiến cao nhất; đội hình cân bằng sẽ giảm sức mạnh mô phỏng.`);
    } else if (activeSin === "satan" || activeSin === "wrath") {
      enemy.wrathStacks = Math.min(5, (enemy.wrathStacks || 0) + 1);
      customFollowupMultiplier = 1 + enemy.wrathStacks * 0.08;
      activeDungeon.logs.push(`🔥 **[Cuồng Nộ]** ${enemy.name} tăng nhịp sát thương lên **+${enemy.wrathStacks * 8}%** (${enemy.wrathStacks}/5). Phá Poise để giảm cộng dồn.`);
    } else if (activeSin === "trueform") {
      const wipeCountdown = Math.max(1, Number(getBossConfig(activeDungeon.chapter)?.mechanics?.wipe_countdown) || 5);
      activeDungeon.wipeCountdown = activeDungeon.wipeCountdown === undefined ? wipeCountdown : activeDungeon.wipeCountdown - 1;
      activeDungeon.logs.push(`☄️ **${enemy.name}** kích hoạt trạng thái Hủy Diệt! Đếm ngược: **${activeDungeon.wipeCountdown}** lượt trước khi nghi lễ hoàn thành!`);
      if (activeDungeon.wipeCountdown <= 0) {
        isCustomSkillUsed = true;
        activeDungeon.logs.push(`💥 **${enemy.name}** hoàn thành Vòng Lặp Vô Tận, quét sạch toàn bộ tổ đội!`);
        alivePlayers.forEach(p => p.hp = 0);
      }
    } else if (enemy.key === "mourngait" && enemy.hp < enemy.maxHp * 0.40 && Math.random() < 0.60) {
      isCustomSkillUsed = true;
      let hpLoss = Math.min(Math.floor(target.maxHp * 0.30), Math.floor(target.hp * 0.5));
      target.hp = Math.max(1, target.hp - hpLoss);
      activeDungeon.totalDamageTaken = (activeDungeon.totalDamageTaken || 0) + hpLoss;
      activeDungeon.logs.push(`💀 **${enemy.name}** bị hắc hỏa dồn vào hiểm cảnh! Giải phóng **[Đoạt Hồn Phong Ấn]** lên **${target.name}**, đoạt 50% máu hiện tại (tối đa 30% máu tối đa, mất **${hpLoss.toLocaleString()}** HP)!`);
    } else if (enemy.key === "veilreaper" && Math.random() < 0.30) {
      isCustomSkillUsed = true;
      let hpLoss = Math.min(Math.floor(target.maxHp * 0.35), Math.floor(target.hp * 0.55));
      target.hp = Math.max(1, target.hp - hpLoss);
      activeDungeon.totalDamageTaken = (activeDungeon.totalDamageTaken || 0) + hpLoss;
      activeDungeon.logs.push(`💀 **${enemy.name}** tung cánh, giải phóng **[Đoạt Hồn Hắc Ám]** lên **${target.name}**, đoạt 55% máu hiện tại (tối đa 35% máu tối đa, mất **${hpLoss.toLocaleString()}** HP)!`);
    }
    if (!isCustomSkillUsed || customFollowupMultiplier !== 1.0) {
      let damageMult = customFollowupMultiplier;
      if (enemy.key === "mourngait") {
        damageMult = 0.70; 
        activeDungeon.logs.push(`🔥 Hắc hỏa phong ấn kiềm hãm... Đòn đánh của **${enemy.name}** bị giảm sức mạnh!`);
      }
      const phase2SingleTargetMultiplier = enemy.isBoss && enemy.phase === 2
        ? (config.dungeon?.boss_phase2_single_target_damage_multiplier ?? 0.55)
        : 1;
      const rawDmg = enemy.atk * (0.85 + Math.random() * 0.3) * damageMult * phase2SingleTargetMultiplier;
      let damage = Math.max(10, Math.floor(rawDmg * (1 - mitigation)));
      if (mitCfg && mitCfg.classes?.includes(target.classKey)) {
        damage = Math.floor(damage * (mitCfg.multiplier ?? 0.6));
      }
      if (target.classKey === "paladin") {
        damage = Math.floor(damage * 0.95);
      }
      const targetSubType = target.weapon?.subType ? target.weapon.subType.toLowerCase().replace(/\s+/g, "") : "";
      if (targetSubType.includes("shieldhex")) {
        const absorbPct = Number(config.rpg?.balance?.dungeon?.shieldhex_absorb_pct) || 0.15;
        const absorbed = Math.floor(damage * absorbPct);
        damage -= absorbed;
        target.shieldhexAbsorbed = (target.shieldhexAbsorbed || 0) + absorbed;
        target.shieldhexRounds = (target.shieldhexRounds || 0) + 1;
      }
      if (enemy.key === "draugor" && Math.random() < 0.35) {
        activeDungeon.logs.push(`🌀 **${enemy.name}** học lỏm, mở ra **[Hố Đen Trọng Lực Tí Hon]** hút chặt và gây sát thương!`);
      }
      const actualDmg = Math.min(target.hp, damage);
      activeDungeon.totalDamageTaken = (activeDungeon.totalDamageTaken || 0) + actualDmg;
      target.hp = Math.max(0, target.hp - damage);
      if (target.chainedTo && target.chainRounds > 0) {
        const linkedPlayer = activeDungeon.players.find((player) => player.id === target.chainedTo && player.hp > 0);
        if (linkedPlayer) {
          const sharedDamage = Math.min(linkedPlayer.hp, Math.max(1, Math.floor(damage * 0.35)));
          linkedPlayer.hp = Math.max(0, linkedPlayer.hp - sharedDamage);
          activeDungeon.totalDamageTaken = (activeDungeon.totalDamageTaken || 0) + sharedDamage;
          activeDungeon.logs.push(`🔗 **${linkedPlayer.name}** nhận **${sharedDamage.toLocaleString()}** sát thương liên kết.`);
        }
        target.chainRounds -= 1;
        if (target.chainRounds <= 0) {
          const linkedPlayer = activeDungeon.players.find((player) => player.id === target.chainedTo);
          if (linkedPlayer) {
            delete linkedPlayer.chainedTo;
            delete linkedPlayer.chainRounds;
          }
          delete target.chainedTo;
          delete target.chainRounds;
          activeDungeon.logs.push(`✨ Liên kết sinh mệnh đã tan vỡ.`);
        }
      }
      activeDungeon.logs.push(`💥 **${enemy.name}** tấn công **${target.name}** gây **${damage.toLocaleString()}** sát thương.`);
      if (target.hp <= 0) {
        activeDungeon.logs.push(`💀 **${target.name}** đã tử nạn!`);
      }
    }
    if (target.hp > 0 && target.classKey !== "mage") {
      target.rage = Math.min(100, (target.rage || 0) + 10);
    }
  }
  const teamWiped = activeDungeon.players.every((p) => p.hp <= 0);
  activeDungeon.players.forEach((p) => {
    p.hasActedThisRound = false;
  });
  activeDungeon.actionInProgress = false;
  if (teamWiped) {
    await handleDefeat(channel, activeDungeon);
  } else {
    await nextTurn(channel, activeDungeon);
  }
};
const handleEnemyDefeat = async (channel, activeDungeon) => {
  const { round, chapter, enemy } = activeDungeon;
  if (enemy.isBoss) {
    if (enemy.phase === 1) {
      if (chapter === 3 || enemy.key === "mourngait" || chapter >= 7) {
        activeDungeon.logs.push(`💬 **${enemy.name}** gầm lên đau đớn trước khi tan rã: *"Các ngươi đã thắng... Nhưng bóng tối sẽ không bao giờ lụi tàn!"*`);
        await renderGameScreen(channel, activeDungeon);
        activeDungeon.actionInProgress = true;
        setTimeout(async () => {
          activeDungeon.actionInProgress = false;
          await handleVictory(channel, activeDungeon);
        }, getDelay(activeDungeon, 2500));
        return;
      }
      const bossCfg = getBossConfig(chapter);
      const b2Cfg = bossCfg.stats.phase2;
      let totalLevel = 0;
      let totalPower = 0;
      const count = activeDungeon.players.length || 1;
      for (const p of activeDungeon.players) {
        totalLevel += (p.level || 1);
        totalPower += (p.power || 0);
      }
      const targetLevel = totalLevel / count;
      const targetPower = totalPower / count;
      const leaderScaler = getDungeonBossScalers(targetLevel, targetPower).durability;
      const maxHp = Math.floor(b2Cfg.base_hp * leaderScaler);
      const poiseMax = 80 + chapter * 20;
      enemy.name = bossCfg.name_phase2;
      enemy.hp = maxHp;
      enemy.maxHp = maxHp;
      enemy.atk = Math.floor(enemy.atk * b2Cfg.base_atk_mult);
      enemy.armor = Math.floor(b2Cfg.base_defense * leaderScaler);
      enemy.magicResist = Math.floor(b2Cfg.base_defense * leaderScaler);
      enemy.phase = 2;
      enemy.phase2TurnCount = 0;
      enemy.bleedRounds = 0; 
      enemy.poiseMax = poiseMax;
      enemy.poise = poiseMax;
      enemy.poiseBroken = false;
      activeDungeon.coinFlipCount = 0;
      activeDungeon.phase2Madness = 1.0;
      activeDungeon.logs.push(`👿 **${bossCfg.name_phase1}** đã ngã xuống! Cơ thể boss bắt đầu biến đổi dữ dội và cười điên cuồng bước vào **Phase 2**!`);
      activeDungeon.players.forEach((p) => {
        p.hasActedThisRound = false;
      });
      if (activeDungeon.timeoutTimer) {
        clearTimeout(activeDungeon.timeoutTimer);
        activeDungeon.timeoutTimer = null;
      }
      const newTimeLimit = getDungeonTimeLimitMs("bossPhase2");
      activeDungeon.roundTimeLimitMs = newTimeLimit;
      activeDungeon.roundEndTime = Date.now() + newTimeLimit;
      activeDungeon.timeoutTimer = setTimeout(async () => {
        await handleTimeout(channel, activeDungeon);
      }, newTimeLimit);
      await nextTurn(channel, activeDungeon);
    } else {
      await handleVictory(channel, activeDungeon);
    }
  } else {
    if (enemy.isElite) {
      activeDungeon.elitesKilled = (activeDungeon.elitesKilled || 0) + 1;
      activeDungeon.logs.push(`⭐ Đã hạ gục **Quái Vật Tinh Anh**! Thưởng cuối phó bản tăng **+50%** EXP & Coke (x${(activeDungeon.elitesKilled || 1) + 1}).`);
    } else if (enemy.key === "draugor") {
      activeDungeon.logs.push(`🗣️ **Draugor** hét lên phẫn nộ: *"Các người... các người sẽ phải chịu đựng cơn thịnh nộ của ngài ấy... lũ sinh vật thấp kém!"*`);
    } else {
      activeDungeon.logs.push(`🎉 **Đã tiêu diệt ${enemy.name}!** Sắp bước sang vòng kế tiếp.`);
    }
    activeDungeon.round += 1;
    setupRound(activeDungeon, channel);
  }
};
const handleVictory = async (channel, activeDungeon) => {
  activeDungeon.isFinished = true;
  await renderGameScreen(channel, activeDungeon);
  if (activeDungeon.timeoutTimer) {
    clearTimeout(activeDungeon.timeoutTimer);
    activeDungeon.timeoutTimer = null;
  }
  if (activeDungeon.cleanupListener) {
    activeDungeon.cleanupListener();
  }
  channel.client.rpgDungeons.delete(channel.id);
  if (activeDungeon.isSimulation) {
    const embed = new EmbedBuilder()
      .setColor("#2ECC71")
      .setTitle("🎉 MÔ PHỎNG CHIẾN THẮNG! 🎉")
      .setDescription(`Tổ đội giả lập đã xuất sắc chinh phục thành công Dungeon Chương **${activeDungeon.chapter}**!`)
      .setTimestamp();
    await channel.send({ embeds: [embed], skipV2: true });
    return;
  }
  const guild = await RpgGuild.findById(activeDungeon.guildId);
  if (guild) {
    guild.chapterProgress = Math.max(guild.chapterProgress, activeDungeon.chapter);
    await guild.save();
  }
  const isChallenge = activeDungeon.blessing === "none";
  const rewardLines = await Promise.all(
    activeDungeon.players.map(async (p) => {
    const freshUser = await User.findById(p.userRef._id);
    if (!freshUser) return null;
    if (!freshUser.rpg.clearedDungeons) {
      freshUser.rpg.clearedDungeons = [];
    }
    const hasClearedBefore = freshUser.rpg.clearedDungeons.includes(activeDungeon.chapter);
    const todayKey = getDungeonDateKey();
    if (!freshUser.rpg.dailyClears) freshUser.rpg.dailyClears = {};
    if (!freshUser.rpg.dungeonRewardDaily || freshUser.rpg.dungeonRewardDaily.date !== todayKey) {
      freshUser.rpg.dungeonRewardDaily = { date: todayKey, count: 0 };
      freshUser.rpg.dailyClears = {};
    }
    const dailyClearCount = freshUser.rpg.dungeonRewardDaily.count;
    freshUser.rpg.dungeonRewardDaily.count += 1;
    const dailyKey = `${activeDungeon.chapter}_${todayKey}`;
    const isDailyFirstClear = !freshUser.rpg.dailyClears[dailyKey];
    if (isDailyFirstClear) {
      freshUser.rpg.dailyClears[dailyKey] = true;
    }
    if (!hasClearedBefore) {
      freshUser.rpg.clearedDungeons.push(activeDungeon.chapter);
      freshUser.markModified("rpg");
    }
    const rewardAmounts = getDungeonRewardAmounts({
      chapter: activeDungeon.chapter,
      hasClearedBefore,
      isDailyFirstClear,
      dailyClearCount,
      isChallenge,
      elitesKilled: activeDungeon.elitesKilled || 0,
    });
    const userCokeReward = rewardAmounts.coke;
    const userExpReward = rewardAmounts.exp;
    const challengeMultiplier = rewardAmounts.challengeMultiplier;
    const rewardFatigue = rewardAmounts.fatigue;
    const challengeBonusText = isChallenge ? ` | 🏆 **Thử thách** x${challengeMultiplier.toFixed(1)}` : "";
    const fatigueText = rewardFatigue.tier === "full"
      ? ""
      : rewardFatigue.tier === "reduced"
        ? " | ⚖️ **Thưởng ngày** x0.5"
        : " | 💤 **Cạn thưởng ngày** x0.2";
    await incBalance(freshUser.userId, userCokeReward);
    addRpgExp(freshUser.rpg, userExpReward);
    freshUser.markModified("rpg");
    if (freshUser.rpg.equippedPet) {
      const dungeonPetXp = 200 + activeDungeon.chapter * 25;
      addPetXp(freshUser.rpg.equippedPet, dungeonPetXp, freshUser);
    }
    const gear = await generateRpgGearDrop(freshUser, {
      level: freshUser.rpg.level,
      allowedRarities: getChapterRarities(activeDungeon.chapter),
      forceDrop: !hasClearedBefore,
    });
    let specialGear = null;
    const claimedWeapons = freshUser.rpg.claimedBossWeapons || [];
    const bossCfg = getBossConfig(activeDungeon.chapter);
    const bossReward = bossCfg?.first_clear_reward;
    if (bossReward && !claimedWeapons.includes(bossReward.claim_key)) {
      specialGear = await generateRpgGearDrop(freshUser, {
        slot: "weapon",
        subType: bossReward.name,
        emoji: bossReward.emoji,
        rarity: bossReward.rarity || "Ancient",
        imageKey: bossReward.image_path,
        forceDrop: true,
        fromDungeon: true,
      });
      if (specialGear) {
        if (!freshUser.rpg.claimedBossWeapons) {
          freshUser.rpg.claimedBossWeapons = [];
        }
        freshUser.rpg.claimedBossWeapons.push(bossReward.claim_key);
        freshUser.markModified("rpg");
        await addRpgGearToUser(freshUser, specialGear);
      }
    }
    const cristalStoneId = `cristal-${activeDungeon.chapter}`;
    if (!freshUser.inventory) {
      freshUser.inventory = new Map();
    }
    const gotStone = Math.random() < rewardFatigue.stoneDropRate;
    if (gotStone) {
      const currentQty = freshUser.inventory.get(cristalStoneId) || 0;
      freshUser.inventory.set(cristalStoneId, currentQty + 1);
    }
    const gotSoul = Math.random() < 0.30 * rewardFatigue.multiplier;
    let soulText = "*Không nhận được* <:souls:1518749776538243082>";
    if (gotSoul) {
      const currentSouls = freshUser.inventory.get("souls") || 0;
      freshUser.inventory.set("souls", currentSouls + 10);
      soulText = "**+10 Linh Hồn** <:souls:1518749776538243082>";
    }
    freshUser.markModified("inventory");
    if (gear) {
      await addRpgGearToUser(freshUser, gear);
    }
    await freshUser.save();
    const { updateQuestProgress } = require("../../../utils/questUtil");
    await updateQuestProgress(freshUser, "dungeon_win", 1, channel, { chapter: activeDungeon.chapter });
    if (freshUser.rpg?.equippedPet) {
      await updateQuestProgress(freshUser, "pet_level", freshUser.rpg.equippedPet.level, channel);
    }
    const stoneItem = channel.client.allItems?.find(i => i.item_id === cristalStoneId) || { name: `Cristal Smithing Stone [${activeDungeon.chapter}]`, emoji: "💎" };
    const stoneText = gotStone ? `${stoneItem.emoji} **${stoneItem.name}** (x1)` : "*Không rơi*";
    const gearText = gear 
      ? `**${gear.rarity} ${gear.subType}** (Lực chiến +${gear.power})`
      : "Không nhận được";
    let rewardLine = `👤 <@${p.id}>:\n` +
      `  • nhận **+${userCokeReward.toLocaleString()}** <:cokecy:1509951335016173662>` +
      `${hasClearedBefore ? " *(Phó bản đã vượt: 1/3)*" : ""}` +
      `${isDailyFirstClear ? " *(Lần đầu chương trong ngày: x1.25)*" : ""}` +
      `${challengeBonusText}${fatigueText}\n` +
      `  • nhận **+${userExpReward.toLocaleString()} EXP RPG**` +
      `${hasClearedBefore ? " *(Phó bản đã vượt: 1/3)*" : ""}` +
      `${isDailyFirstClear ? " *(Lần đầu chương trong ngày: x1.25)*" : ""}${challengeBonusText}${fatigueText}\n` +
      `  • Linh Hồn: ${soulText}\n` +
      `  • Đá nâng cấp: ${stoneText}\n` +
      `  • nhận Trang bị: ${gearText}`;
    if (specialGear && bossReward) {
      rewardLine += `\n  • 🏆 **PHẦN THƯỞNG LẦN ĐẦU TIÊU DIỆT**: Nhận vũ khí độc quyền ${bossReward.emoji} **${specialGear.subType}** (${specialGear.rarity})!`;
    }
      return rewardLine;
    })
  );
  const rewardTexts = rewardLines.filter(Boolean);
  const embed = new EmbedBuilder()
    .setColor(getRpgColor("success"))
    .setTitle(formatRpgTitle("Chiến thắng phó bản", "🏆"))
    .setDescription(
      `Tổ đội của bạn đã xuất sắc chinh phục thành công **Chương ${activeDungeon.chapter}**!${isChallenge ? "\n🔥 **Bảo vật Thử Thách:** Tổ đội đã chọn chế độ mặc định (không buff) và nhận thêm **+20% Coke & EXP**!" : ""}\n\n` +
      `**Phần thưởng vượt phó bản:**\n\n${rewardTexts.join("\n\n")}`
    )
    .setFooter(formatRpgFooter("Phần thưởng đã được trao cho tổ đội"))
    .setTimestamp();
  await channel.send({ embeds: [embed], skipV2: true });
};
const handleDefeat = async (channel, activeDungeon) => {
  activeDungeon.isFinished = true;
  await renderGameScreen(channel, activeDungeon);
  if (activeDungeon.timeoutTimer) {
    clearTimeout(activeDungeon.timeoutTimer);
    activeDungeon.timeoutTimer = null;
  }
  if (activeDungeon.cleanupListener) {
    activeDungeon.cleanupListener();
  }
  channel.client.rpgDungeons.delete(channel.id);
  for (const p of activeDungeon.players) {
    try {
      const freshUser = await User.findById(p.userRef._id);
      if (freshUser && freshUser.rpg.winStreak > 0) {
        freshUser.rpg.winStreak = 0;
        freshUser.markModified("rpg");
        await freshUser.save();
      }
    } catch {}
  }
  const embed = new EmbedBuilder()
    .setColor(getRpgColor("danger"))
    .setTitle(formatRpgTitle("Thất bại tại Dungeon", "💀"))
    .setDescription(
      `Toàn bộ thành viên trong tổ đội đã tử nạn! Chiến dịch chinh phục **Chương ${activeDungeon.chapter}** thất bại.\n` +
      `Hãy rèn luyện thêm lực chiến và thử lại!`
    )
    .setFooter(formatRpgFooter("Rèn luyện thêm và thử lại chương này"))
    .setTimestamp();
  await channel.send({ embeds: [embed], skipV2: true });
};
const handleTimeout = async (channel, activeDungeon) => {
  activeDungeon.isFinished = true;
  await renderGameScreen(channel, activeDungeon);
  if (activeDungeon.timeoutTimer) {
    clearTimeout(activeDungeon.timeoutTimer);
    activeDungeon.timeoutTimer = null;
  }
  if (activeDungeon.cleanupListener) {
    activeDungeon.cleanupListener();
  }
  channel.client.rpgDungeons.delete(channel.id);
  const timeLimitText = formatTimeLimit(activeDungeon.roundTimeLimitMs || getDungeonTimeLimitMs("normal"));
  const embed = new EmbedBuilder()
    .setColor(getRpgColor("danger"))
    .setTitle(formatRpgTitle("Dungeon hết thời gian", "⏱️"))
    .setDescription(
      `Đã quá ${timeLimitText} mà tổ đội của bạn chưa vượt qua được vòng đấu này!\n` +
      `Chiến dịch chinh phục **Chương ${activeDungeon.chapter}** thất bại.`
    )
    .setFooter(formatRpgFooter(`Chiến dịch thất bại vì vượt quá ${timeLimitText}`))
    .setTimestamp();
  await channel.send({ embeds: [embed], skipV2: true });
};
const runSimulatedTurn = async (channel, activeDungeon, player) => {
  if (!channel.client.rpgDungeons.has(channel.id)) return;
  if (player.hp <= 0) return;
  if (activeDungeon.currentActor !== player) return;
  activeDungeon.actionInProgress = true;
  if (player.healBanRounds && player.healBanRounds > 0) {
    player.healBanRounds -= 1;
    if (player.healBanRounds === 0) {
      activeDungeon.logs.push(`✨ Lời nguyền cấm hồi máu trên **${player.name}** đã được giải trừ.`);
    }
  }
  if (player.skillBanRounds && player.skillBanRounds > 0) {
    player.skillBanRounds -= 1;
    if (player.skillBanRounds === 0) {
      activeDungeon.logs.push(`✨ Phong ấn cấm kỹ năng trên **${player.name}** đã được giải trừ.`);
    }
  }
  let useSkill = false;
  const hasSkillBan = player.skillBanRounds && player.skillBanRounds > 0;
  if (!hasSkillBan) {
    if (player.classKey === "mage") {
      if ((player.mana ?? 100) >= 25) useSkill = true;
    } else if (player.classKey === "paladin") {
      if ((player.rage ?? 0) >= 50) useSkill = true;
    } else {
      if ((player.rage ?? 0) >= 100) useSkill = true;
    }
  }
  if (useSkill) {
    player.hasActedThisRound = true;
    await executePlayerSkill(channel, activeDungeon, player);
    return;
  }
  const needHeal = player.hp < player.maxHp * 0.4 && player.potions > 0 && !(player.healBanRounds && player.healBanRounds > 0);
  if (needHeal) {
    const potionHealPct = Number(config.dungeon?.potion_heal_pct) || 0.35;
    const healAmount = Math.floor(player.maxHp * potionHealPct);
    player.hp = Math.min(player.maxHp, player.hp + healAmount);
    player.potions -= 1;
    activeDungeon.logs.push(`<:healthpotion:1523351206066655333> [Sim] **${player.name}** đã uống bình máu hồi phục **${healAmount.toLocaleString()}** HP.`);
    player.hasActedThisRound = true;
    activeDungeon.actionInProgress = false;
    await nextTurn(channel, activeDungeon);
    return;
  }
  player.hasActedThisRound = true;
  const isPhase2 = activeDungeon.enemy.isBoss && activeDungeon.enemy.phase === 2;
  const bossCfg = getBossConfig(activeDungeon.chapter);
  const hasCoin = bossCfg?.mechanics?.coin_flip ?? false;
  if (isPhase2 && hasCoin && activeDungeon.coinFlipCount >= 2) {
    const guess = Math.random() < 0.5 ? "h" : "t";
    const guessLabel = guess === "h" ? "Heads" : "Tails";
    activeDungeon.logs.push(`🪙 [Sim] **${player.name}** dự đoán mặt **${guessLabel}**!`);
    setTimeout(async () => {
      const isHeads = Math.random() < 0.5;
      const result = isHeads ? "h" : "t";
      const resultEmoji = isHeads ? config.emoji.heads : config.emoji.tails;
      const resultLabel = isHeads ? "Heads" : "Tails";
      let multiplier = 1.0;
      if (guess === result) {
        activeDungeon.consecutiveCoinSuccess = (activeDungeon.consecutiveCoinSuccess || 0) + 1;
        multiplier = Math.min(1.8, 1.5 + (activeDungeon.consecutiveCoinSuccess - 1) * 0.15);
        activeDungeon.logs.push(`🪙 Kết quả là ${resultEmoji} (**${resultLabel}**). **${player.name}** đoán CHÍNH XÁC! Nhận chuỗi thắng liên tiếp **${activeDungeon.consecutiveCoinSuccess}** và sát thương được nhân **x${multiplier}**!`);
      } else {
        activeDungeon.consecutiveCoinSuccess = 0;
        multiplier = 1.0;
        activeDungeon.logs.push(`🪙 Kết quả là ${resultEmoji} (**${resultLabel}**). **${player.name}** đoán SAI! Sát thương bình thường (x1.0). Chuỗi đoán đúng bị ngắt!`);
      }
      activeDungeon.coinFlipCount = 0;
      await executePlayerAttack(channel, activeDungeon, player, multiplier);
    }, getDelay(activeDungeon, 1500));
  } else {
    await executePlayerAttack(channel, activeDungeon, player, 1.0);
  }
};
module.exports.setupRound = setupRound;
module.exports.renderGameScreen = renderGameScreen;
module.exports.nextTurn = nextTurn;
module.exports.executePlayerAttack = executePlayerAttack;
module.exports.executePlayerSkill = executePlayerSkill;
module.exports.runEnemyTurn = runEnemyTurn;
module.exports.runSimulatedTurn = runSimulatedTurn;
