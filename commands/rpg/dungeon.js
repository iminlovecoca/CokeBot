const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const RpgGuild = require("../../models/RpgGuild");
const User = require("../../models/User");
const {
  requireRpgCharacter,
  getEffectiveRpgStats,
  calculateRpgPower,
  getEquippedItems,
  getRpgClass,
  generateRpgGearDrop,
  addRpgGearToUser,
  addRpgExp,
} = require("../../utils/rpgUtil");
const { incBalance } = require("../../utils/userUtil");
const config = require("../../data/config");

const CLASS_ATTACK_TYPES = {
  warrior: "physical",
  archer: "physical",
  mage: "magical",
  assassin: "physical",
  paladin: "physical",
  wretch: "physical",
};

// Helper for HP bars
const getHealthBar = (hp, maxHp) => {
  const percentage = Math.max(0, Math.min(1, hp / maxHp));
  const filledCount = Math.round(percentage * 10);
  const emptyCount = 10 - filledCount;
  const filled = "▰".repeat(filledCount);
  const empty = "▱".repeat(emptyCount);
  return `HP\n${filled}${empty}\n${hp.toLocaleString()} / ${maxHp.toLocaleString()}`;
};

const getChapterRarities = (chapter) => {
  if (chapter === 1) return ["Rare"];
  if (chapter === 2) return ["Rare", "Epic"];
  if (chapter === 3) return ["Rare", "Epic"];
  if (chapter === 4) return ["Rare", "Epic", "Legendary"];
  if (chapter === 5) return ["Epic", "Legendary"];
  return ["Epic", "Legendary", "Mythic"];
};

module.exports = {
  name: "dungeon",
  aliases: ["pb", "phoban"],
  description: "Khiêu chiến Dungeon tổ đội (yêu cầu team 3 người cùng Party)",
  usage: `${config.prefix}dungeon`,
  async execute(message, args) {
    const userId = message.author.id;
    const client = message.client;

    if (!client.rpgDungeons) {
      client.rpgDungeons = new Map();
    }

    if (client.rpgDungeons.has(message.channel.id)) {
      const activeDungeon = client.rpgDungeons.get(message.channel.id);
      
      // Check if user is in the party
      const isMember = activeDungeon.players.some((p) => p.id === userId);
      if (!isMember) {
        return message.reply("❌ Hiện tại đang có một phó bản diễn ra tại kênh này. Vui lòng đợi kết thúc!");
      }

      // Re-send/re-render logic
      if (activeDungeon.gameMessage) {
        if (activeDungeon.collector) {
          activeDungeon.collector.stop("re-sent");
        }
        await activeDungeon.gameMessage.edit({ components: [] }).catch(() => {});
        await activeDungeon.gameMessage.delete().catch(() => {});
      }

      activeDungeon.gameMessage = null;
      await renderGameScreen(message.channel, activeDungeon);
      return;
    }

    const isAdmin = config.permissions?.dev_ids?.includes(userId) || userId === "745950731638407210" || userId === process.env.OWNER_ID;
    if (!isAdmin) {
      return message.reply("❌ Chỉ Admin mới có quyền khiêu chiến phó bản Dungeon trong giai đoạn thử nghiệm.");
    }

    // Check if user is in a guild/party and is the leader
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

    // Display chapter map select board
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

    const mapSelectEmbed = new EmbedBuilder()
      .setColor("#9B59B6")
      .setTitle("🗺️ Bản đồ phó bản Dungeon (Chapter 1)")
      .setDescription(
        `Hãy chọn một chương để bắt đầu khiêu chiến cùng tổ đội của bạn. Đi lần lượt từ chương 1 đến chương 6.\n\n` +
        `**Tiến trình của bạn:** Đã mở khóa đến **Chương ${Math.min(6, progress + 1)}**`
      )
      .setTimestamp();

    const selectMsg = await message.reply({
      embeds: [mapSelectEmbed],
      components: [row1, row2],
    });

    const filter = (i) => i.user.id === userId && i.customId.startsWith("rpg_dungeon_start_");
    const collector = selectMsg.createMessageComponentCollector({ filter, time: 30000 });

    collector.on("collect", async (i) => {
      await i.deferUpdate();
      const chapter = parseInt(i.customId.replace("rpg_dungeon_start_", ""));
      collector.stop("selected");
      await selectMsg.delete().catch(() => {});
      
      // Start the dungeon session
      await startDungeon({ message, guild, chapter });
    });

    collector.on("end", (collected, reason) => {
      if (reason !== "selected") {
        selectMsg.edit({
          content: "⏳ Hết thời gian lựa chọn phó bản.",
          components: [],
        }).catch(() => {});
      }
    });
  },
};

// Core Dungeon Game Loop
const startDungeon = async ({ message, guild, chapter }) => {
  const client = message.client;
  const channel = message.channel;

  // Double check in-flight dungeon in channel
  if (client.rpgDungeons.has(channel.id)) {
    return channel.send("❌ Đang có một phó bản diễn ra tại kênh này.");
  }

  // Load player characters
  const playerStates = [];
  for (const memberId of guild.members) {
    try {
      const { user, rpgClass } = await requireRpgCharacter(memberId);
      const stats = getEffectiveRpgStats(freshUserObject(user));
      const gearPower = calculateRpgPower(freshUserObject(user));
      const weapon = getEquippedItems(user).weapon;
      const maxHp = 150 + stats.vigor * 20 + user.rpg.level * 20;

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
        rpgClass: rpgClass,
        userRef: user, // For rewards
      });
    } catch (err) {
      return channel.send(`❌ Có lỗi khi tải thông tin RPG của thành viên <@${memberId}>. Chắc chắn rằng toàn bộ thành viên đều đã tạo nhân vật.`);
    }
  }

  // Initialize active dungeon state
  const activeDungeon = {
    guildId: guild._id,
    chapter: chapter,
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
  };

  client.rpgDungeons.set(channel.id, activeDungeon);

  // Setup first round
  setupRound(activeDungeon, channel);
};

// Help to make sure user object isn't cached/stale
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

// Setup current round monsters/boss
const setupRound = (activeDungeon, channel) => {
  const { round, chapter } = activeDungeon;

  // Clear any existing timeout
  if (activeDungeon.timeoutTimer) {
    clearTimeout(activeDungeon.timeoutTimer);
    activeDungeon.timeoutTimer = null;
  }

  // Set timeout for this round: 10 minutes for boss round, 5 minutes for normal rounds
  const isBossRound = (round === 5);
  const roundTimeLimit = isBossRound ? 10 * 60 * 1000 : 5 * 60 * 1000;
  activeDungeon.roundEndTime = Date.now() + roundTimeLimit;
  activeDungeon.timeoutTimer = setTimeout(async () => {
    await handleTimeout(channel, activeDungeon);
  }, roundTimeLimit);

  const dCfg = config.dungeon || {};
  const normCfg = dCfg.normal_monster || { base_hp: 20000, round_hp_mult: 0.1, base_atk: 100, round_atk_mult: 0.05, base_defense: 50 };

  if (round < 5) {
    // Normal monster
    const maxHp = Math.floor(normCfg.base_hp * chapter * (1 + round * normCfg.round_hp_mult));
    activeDungeon.enemy = {
      name: `Quái Vật Gác Đền (Vòng ${round})`,
      maxHp: maxHp,
      hp: maxHp,
      atk: Math.floor(normCfg.base_atk * chapter * (1 + round * normCfg.round_atk_mult)),
      armor: Math.floor(normCfg.base_defense * chapter),
      magicResist: Math.floor(normCfg.base_defense * chapter),
      isBoss: false,
    };
    activeDungeon.diceRolled = false;
    activeDungeon.diceMultiplier = 1.0;
  } else {
    // Round 5: Boss Phase 1
    const bossCfg = getBossConfig(chapter);
    const b1Cfg = bossCfg.stats.phase1;
    const maxHp = b1Cfg.base_hp * chapter;
    activeDungeon.enemy = {
      name: bossCfg.name_phase1,
      key: bossCfg.key,
      maxHp: maxHp,
      hp: maxHp,
      atk: b1Cfg.base_atk * chapter,
      armor: b1Cfg.base_defense * chapter,
      magicResist: b1Cfg.base_defense * chapter,
      isBoss: true,
      phase: 1,
    };
    activeDungeon.diceRolled = false;
    activeDungeon.diceMultiplier = 1.0;
  }

  // Reset player turns for this round
  activeDungeon.players.forEach((p) => {
    p.hasActedThisRound = false;
  });

  // Set the first actor and render game screen
  nextTurn(channel, activeDungeon);
};

// Render main game screen
const renderGameScreen = async (channel, activeDungeon) => {
  const { chapter, round, players, enemy, logs, currentActor } = activeDungeon;

  const embed = new EmbedBuilder()
    .setColor(enemy.isBoss ? "#E74C3C" : "#E67E22")
    .setTitle(`⚔️ DUNGEON: CHƯƠNG ${chapter} - VÒNG ${round}/5 ⚔️`)
    .setDescription(`⏰ Hết thời gian vòng đấu: <t:${Math.floor(activeDungeon.roundEndTime / 1000)}:R>`)
    .setTimestamp();

  const bossCfg = enemy.isBoss ? getBossConfig(chapter) : null;
  const hasDice = bossCfg?.mechanics?.dice_roll ?? false;
  const hasCoin = bossCfg?.mechanics?.coin_flip ?? false;

  // Top Frame: Enemy info
  let enemyInfo = `**Thanh máu:**\n${getHealthBar(enemy.hp, enemy.maxHp)}\n`;
  if (enemy.isBoss) {
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
          enemyInfo += `\n💀 **Lời Nguyền Xương:** Khi có thành viên bị cấm hồi máu, Boss sẽ nhận x2 sát thương!`;
        }
      }
    }
  }
  embed.addFields({ name: `👹 Kẻ địch: ${enemy.name}`, value: enemyInfo });

  // Divider
  embed.addFields({ name: "--------------------------------------------------------", value: "\u200B" });

  // Bottom Frame: 3 Players
  players.forEach((p, idx) => {
    const classIcon = p.rpgClass?.emoji || "👤";
    const className = p.rpgClass?.name || p.classKey.toUpperCase();
    const statusText = p.hp <= 0 ? "💀 **Tử nạn**\n" : "";
    const healBanText = (p.hp > 0 && p.healBanRounds && p.healBanRounds > 0) ? ` (🚫 Cấm hồi máu ${p.healBanRounds} lượt)` : "";
    const hpInfo = `${statusText}${getHealthBar(p.hp, p.maxHp)}\n` +
                   `🧪 Bình máu: **${p.potions}/3**${healBanText} | Lvl: **${p.level}** **${className}**`;
    embed.addFields({ name: `${classIcon} ${p.name}`, value: hpInfo, inline: true });
  });

  // Middle Frame: Logs
  const recentLogs = logs.slice(-5).join("\n");
  embed.addFields({ name: "📝 Nhật ký chiến trường", value: recentLogs || "*Trận đấu đang diễn ra...*" });

  // Buttons row
  const row = new ActionRowBuilder();
  
  // Disable buttons if action is in progress or dice rolling
  const disableControls = activeDungeon.actionInProgress || (enemy.isBoss && enemy.phase === 1 && hasDice && !activeDungeon.diceRolled);

  row.addComponents(
    new ButtonBuilder()
      .setCustomId("rpg_dungeon_action_attack")
      .setLabel("Tấn công 🗡️")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disableControls),
    new ButtonBuilder()
      .setCustomId("rpg_dungeon_action_heal")
      .setLabel("Bình máu 🧪")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disableControls)
  );

  if (currentActor && currentActor.id) {
    embed.setFooter({ text: `👉 Đến lượt của: ${currentActor.name}` });
  } else {
    embed.setFooter({ text: "👿 Lượt của kẻ địch..." });
  }

  // Handle files (Boss image)
  const files = [];
  if (enemy.isBoss) {
    const bossCfg = getBossConfig(chapter);
    const fileName = enemy.phase === 1 ? bossCfg.image_phase1 : bossCfg.image_phase2;
    if (fileName) {
      const filePath = path.join(__dirname, "../../assets/dungeons", fileName);
      if (fs.existsSync(filePath)) {
        files.push(new AttachmentBuilder(filePath, { name: fileName }));
        embed.setImage(`attachment://${fileName}`);
      }
    }
  }

  const payload = { embeds: [embed], components: [row], files };

  if (activeDungeon.gameMessage) {
    await activeDungeon.gameMessage.edit(payload).catch(() => {});
  } else {
    activeDungeon.gameMessage = await channel.send(payload);
    setupCollector(channel, activeDungeon);
  }

  // Dice roll sequence triggers automatically at Round 5 Phase 1
  if (enemy.isBoss && enemy.phase === 1 && hasDice && !activeDungeon.diceRolled && !activeDungeon.actionInProgress) {
    await runDiceRoll(channel, activeDungeon);
  }
};

// Phase 1: Dice rolling sequence
const runDiceRoll = async (channel, activeDungeon) => {
  activeDungeon.actionInProgress = true;
  
  // Pick random alive player to roll
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
      activeDungeon.diceMultiplier = 0.5;
      activeDungeon.logs.push(`🎲 <@${roller.id}> lắc ra số ${diceEmoji} (**Lẻ**): Giảm 50% sát thương của tổ đội (x0.5)!`);
    } else {
      let mult = 1.5;
      if (diceValue === 4) mult = 2.0;
      else if (diceValue === 6) mult = 2.5;

      activeDungeon.diceMultiplier = mult;
      activeDungeon.logs.push(`🎲 <@${roller.id}> lắc ra số ${diceEmoji} (**Chẵn**): Tăng sát thương của tổ đội lên **x${mult}**!`);
    }

    activeDungeon.diceRolled = true;
    activeDungeon.actionInProgress = false;
    await renderGameScreen(channel, activeDungeon);
  }, 2500);
};

// Setup component interaction collector for the combat screen
const setupCollector = (channel, activeDungeon) => {
  const collector = activeDungeon.gameMessage.createMessageComponentCollector({
    filter: (i) => i.customId.startsWith("rpg_dungeon_action_") || i.customId.startsWith("rpg_dungeon_coin_"),
    time: 15 * 60 * 1000, // 15 mins dungeon limit
  });

  collector.on("collect", async (i) => {
    // Check if player is in the guild/party
    const pExist = activeDungeon.players.find((p) => p.id === i.user.id);
    if (!pExist) {
      return i.reply({ content: "❌ Bạn không thuộc tổ đội khiêu chiến phó bản này!", ephemeral: true });
    }

    // Check if action is locked
    if (activeDungeon.actionInProgress) {
      return i.reply({ content: "⏳ Hệ thống đang xử lý lượt trước, hãy đợi một chút!", ephemeral: true });
    }

    // Turn verification
    const currentActor = activeDungeon.currentActor;
    if (!currentActor || currentActor.id !== i.user.id) {
      return i.reply({ content: "❌ Không phải lượt của bạn!", ephemeral: true });
    }

    await i.deferUpdate();

    // Lock actions
    activeDungeon.actionInProgress = true;

    if (i.customId === "rpg_dungeon_action_heal") {
      // Check if player is heal banned
      if (pExist.healBanRounds && pExist.healBanRounds > 0) {
        activeDungeon.actionInProgress = false;
        const bossCfg = getBossConfig(activeDungeon.chapter);
        const passiveName = bossCfg.passive?.name || "Lời Nguyền Xương";
        return i.followUp({ content: `❌ Bạn đang bị dính [${passiveName}] trong **${pExist.healBanRounds}** lượt nữa!`, ephemeral: true });
      }

      // Process heal
      if (pExist.potions <= 0) {
        activeDungeon.actionInProgress = false;
        return i.followUp({ content: "❌ Bạn đã dùng hết bình máu trong phó bản này!", ephemeral: true });
      }

      pExist.hp = Math.min(pExist.maxHp, pExist.hp + Math.floor(pExist.maxHp * 0.3));
      pExist.potions -= 1;
      activeDungeon.logs.push(`🧪 **${pExist.name}** đã uống bình máu hồi phục **${Math.floor(pExist.maxHp * 0.3).toLocaleString()}** HP.`);

      pExist.hasActedThisRound = true;
      activeDungeon.actionInProgress = false;
      await nextTurn(channel, activeDungeon);
    } else if (i.customId === "rpg_dungeon_action_attack") {
      pExist.hasActedThisRound = true;

      // Decrement heal ban if they have any
      if (pExist.healBanRounds && pExist.healBanRounds > 0) {
        pExist.healBanRounds -= 1;
        if (pExist.healBanRounds === 0) {
          activeDungeon.logs.push(`✨ Lời nguyền cấm hồi máu trên **${pExist.name}** đã được giải trừ.`);
        }
      }

      // Check if coin flip is triggered in Phase 2
      const isPhase2 = activeDungeon.enemy.isBoss && activeDungeon.enemy.phase === 2;
      const bossCfg = getBossConfig(activeDungeon.chapter);
      const hasCoin = bossCfg?.mechanics?.coin_flip ?? false;
      if (isPhase2 && hasCoin && activeDungeon.coinFlipCount === 2) {
        // Trigger coin flip choice
        await askCoinFlip(channel, activeDungeon, pExist);
      } else {
        // Normal attack
        await executePlayerAttack(channel, activeDungeon, pExist, 1.0);
      }
    }
  });

  collector.on("end", () => {
    if (activeDungeon.timeoutTimer) {
      clearTimeout(activeDungeon.timeoutTimer);
      activeDungeon.timeoutTimer = null;
    }
    channel.client.rpgDungeons.delete(channel.id);
  });

  activeDungeon.collector = collector;
};

// Ask player to guess Heads or Tails
const askCoinFlip = async (channel, activeDungeon, player) => {
  const embed = new EmbedBuilder()
    .setColor("#F1C40F")
    .setTitle("🪙 CƠ HỘI NHÂN ĐÔI SÁT THƯƠNG!")
    .setDescription(`<@${player.id}>, đòn đánh thứ 3 của tổ đội chuẩn bị kích hoạt tung đồng xu.\nHãy đoán mặt xuất hiện để nhận cơ hội **x2 sát thương**!`)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("rpg_dungeon_coin_heads")
      .setLabel("Heads (Ngửa) 🪙")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("rpg_dungeon_coin_tails")
      .setLabel("Tails (Sấp) 🪙")
      .setStyle(ButtonStyle.Primary)
  );

  const coinMsg = await channel.send({ content: `<@${player.id}>`, embeds: [embed], components: [row] });

  const filter = (i) => i.user.id === player.id && i.customId.startsWith("rpg_dungeon_coin_");
  const comp = await coinMsg.awaitMessageComponent({ filter, time: 20000 }).catch(() => null);

  if (!comp) {
    // Timeout fallback: normal attack
    await coinMsg.delete().catch(() => {});
    activeDungeon.logs.push(`⏳ Quá thời gian chọn mặt đồng xu! Sát thương bình thường (x1.0). Chuỗi đoán đúng bị ngắt!`);
    activeDungeon.consecutiveCoinSuccess = 0;
    activeDungeon.coinFlipCount = 0; // reset counter
    return executePlayerAttack(channel, activeDungeon, player, 1.0);
  }

  await comp.deferUpdate();
  const guess = comp.customId === "rpg_dungeon_coin_heads" ? "h" : "t";

  await coinMsg.edit({
    content: `🪙 Đồng xu đang quay... ${config.emoji.coinflip}`,
    embeds: [],
    components: [],
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
      multiplier = 2.0 + (activeDungeon.consecutiveCoinSuccess - 1) * 0.5;
      activeDungeon.logs.push(`🪙 Kết quả là ${resultEmoji} (**${resultLabel}**). **${player.name}** đoán CHÍNH XÁC! Nhận chuỗi thắng liên tiếp **${activeDungeon.consecutiveCoinSuccess}** và sát thương được nhân **x${multiplier}**!`);
    } else {
      activeDungeon.consecutiveCoinSuccess = 0;
      multiplier = 1.0;
      activeDungeon.logs.push(`🪙 Kết quả là ${resultEmoji} (**${resultLabel}**). **${player.name}** đoán SAI! Sát thương bình thường (x1.0). Chuỗi đoán đúng bị ngắt!`);
    }

    activeDungeon.coinFlipCount = 0; // reset counter
    await executePlayerAttack(channel, activeDungeon, player, multiplier);
  }, 1500);
};

// Execute player attack action
const executePlayerAttack = async (channel, activeDungeon, player, multiplier) => {
  const enemy = activeDungeon.enemy;

  // Damage calculation
  const isMagical = CLASS_ATTACK_TYPES[player.classKey] === "magical";
  const baseAttack = isMagical
    ? player.stats.int * 3.5 + player.stats.arc * 1.5
    : player.stats.str * 2.5 + player.stats.dex * 1.5;

  let rawDamage = baseAttack + player.power;
  rawDamage *= 0.85 + Math.random() * 0.3; // variance

  const classCritBonus = player.rpgClass?.bonuses?.critRate || 0;
  const critRate = Math.min(
    0.75,
    (player.stats.arc * 0.2 + player.stats.dex * 0.1) / 100 + classCritBonus
  );
  const isCrit = Math.random() < critRate;
  const critMult = 1.5 + player.stats.dex * 0.002;
  if (isCrit) {
    rawDamage *= critMult;
  }

  // Mitigation
  let mrOrArmor = isMagical ? enemy.magicResist : enemy.armor;
  const mitigation = mrOrArmor / (mrOrArmor + 250);
  let damage = Math.max(10, Math.floor(rawDamage * (1 - mitigation)));

  // Apply Phase 1 dice multiplier or Phase 2 coin multiplier
  if (enemy.isBoss) {
    const bossCfg = getBossConfig(activeDungeon.chapter);
    const hasDice = bossCfg?.mechanics?.dice_roll ?? false;
    const hasCoin = bossCfg?.mechanics?.coin_flip ?? false;

    if (enemy.phase === 1) {
      if (hasDice) {
        damage = Math.floor(damage * activeDungeon.diceMultiplier);
      }
    } else {
      if (hasCoin) {
        damage = Math.floor(damage * multiplier);
        activeDungeon.coinFlipCount = (activeDungeon.coinFlipCount || 0) + 1;
      }
    }

    // Vulnerable on heal ban mechanic: takes x2 damage when any alive player is heal banned
    if (bossCfg?.mechanics?.vulnerable_on_heal_ban) {
      const isAnyPlayerHealBanned = activeDungeon.players.some((p) => p.hp > 0 && p.healBanRounds && p.healBanRounds > 0);
      if (isAnyPlayerHealBanned) {
        damage = Math.floor(damage * 2.0);
      }
    }
  }

  enemy.hp = Math.max(0, enemy.hp - damage);
  const critText = isCrit ? "💥 **Chí mạng!** " : "";
  activeDungeon.logs.push(`🗡️ **${player.name}** tấn công **${enemy.name}** gây ${critText}**${damage.toLocaleString()}** sát thương.`);

  activeDungeon.actionInProgress = false;

  if (enemy.hp <= 0) {
    await handleEnemyDefeat(channel, activeDungeon);
  } else {
    await nextTurn(channel, activeDungeon);
  }
};

// Proceed to the next actor in the turn queue
const nextTurn = async (channel, activeDungeon) => {
  const alivePlayers = activeDungeon.players.filter((p) => p.hp > 0);
  const nextPlayer = alivePlayers.find((p) => !p.hasActedThisRound);

  if (nextPlayer) {
    activeDungeon.currentActor = nextPlayer;
    await renderGameScreen(channel, activeDungeon);
  } else {
    // All alive players have acted. Set enemy as current actor
    activeDungeon.currentActor = activeDungeon.enemy;
    await renderGameScreen(channel, activeDungeon);

    // Trigger enemy turn automatically
    activeDungeon.actionInProgress = true;
    setTimeout(async () => {
      await runEnemyTurn(channel, activeDungeon);
    }, 2000);
  }
};

// Enemy/Boss attack logic
const runEnemyTurn = async (channel, activeDungeon) => {
  const enemy = activeDungeon.enemy;
  const alivePlayers = activeDungeon.players.filter((p) => p.hp > 0);

  if (!alivePlayers.length) {
    await handleDefeat(channel, activeDungeon);
    return;
  }

  // Phase 2 Boss Passive Skill
  if (enemy.isBoss && enemy.phase === 2) {
    const bossCfg = getBossConfig(activeDungeon.chapter);
    const passive = bossCfg.passive;
    if (passive && passive.type === "heal_ban" && Math.random() < passive.chance) {
      const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      target.healBanRounds = passive.duration;
      activeDungeon.logs.push(`💀 **${enemy.name}** sử dụng [${passive.name}] lên **${target.name}**: Cấm sử dụng bình hồi máu trong ${passive.duration} lượt!`);
    }
  }

  const isAOE = enemy.isBoss && enemy.phase === 2;
  const mitCfg = config.dungeon?.ranged_class_mitigation;

  if (isAOE) {
    // Phase 2: AOE attack on all alive players
    const mult = activeDungeon.phase2Madness;
    activeDungeon.logs.push(`👿 **${enemy.name}** cười quỷ dị và phóng cuồng phong sát thương diện rộng (AOE)!`);

    alivePlayers.forEach((p) => {
      const armor = p.stats.pr * 3.0;
      const mitigation = armor / (armor + 1000);
      const rawDmg = enemy.atk * mult * (0.85 + Math.random() * 0.3);
      let damage = Math.max(10, Math.floor(rawDmg * (1 - mitigation)));

      // Archer & Mage ranged passive mitigation
      if (mitCfg && mitCfg.classes?.includes(p.classKey)) {
        damage = Math.floor(damage * (mitCfg.multiplier ?? 0.6));
      }

      p.hp = Math.max(0, p.hp - damage);
      activeDungeon.logs.push(`💥 Gây **${damage.toLocaleString()}** st lên **${p.name}**.`);
      if (p.hp <= 0) {
        activeDungeon.logs.push(`💀 **${p.name}** đã tử nạn!`);
      }
    });

    // Increase madness for next turn
    activeDungeon.phase2Madness += 0.2;
  } else {
    // Phase 1 / Regular monsters: Single target attack on a random alive player
    const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    const armor = target.stats.pr * 3.0;
    const mitigation = armor / (armor + 1000);
    const rawDmg = enemy.atk * (0.85 + Math.random() * 0.3);
    let damage = Math.max(10, Math.floor(rawDmg * (1 - mitigation)));

    // Archer & Mage ranged passive mitigation
    if (mitCfg && mitCfg.classes?.includes(target.classKey)) {
      damage = Math.floor(damage * (mitCfg.multiplier ?? 0.6));
    }

    target.hp = Math.max(0, target.hp - damage);
    activeDungeon.logs.push(`💥 **${enemy.name}** tấn công **${target.name}** gây **${damage.toLocaleString()}** sát thương.`);
    if (target.hp <= 0) {
      activeDungeon.logs.push(`💀 **${target.name}** đã tử nạn!`);
    }
  }

  // Check if team is wiped out
  const teamWiped = activeDungeon.players.every((p) => p.hp <= 0);

  // Reset player turns for the next round of combat
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

// Enemy died: progress round, phase or victory
const handleEnemyDefeat = async (channel, activeDungeon) => {
  const { round, chapter, enemy } = activeDungeon;

  if (enemy.isBoss) {
    if (enemy.phase === 1) {
      // Transition to Phase 2
      const bossCfg = getBossConfig(chapter);
      const b2Cfg = bossCfg.stats.phase2;

      enemy.name = bossCfg.name_phase2;
      enemy.hp = b2Cfg.base_hp * chapter;
      enemy.maxHp = b2Cfg.base_hp * chapter;
      enemy.atk = Math.floor(enemy.atk * b2Cfg.base_atk_mult);
      enemy.phase = 2;
      activeDungeon.coinFlipCount = 0;
      activeDungeon.phase2Madness = 1.0;

      activeDungeon.logs.push(`👿 **${bossCfg.name_phase1}** đã ngã xuống! Cơ thể boss bắt đầu biến đổi dữ dội và cười điên cuồng bước vào **Phase 2**!`);
      
      // Reset player turns for Phase 2
      activeDungeon.players.forEach((p) => {
        p.hasActedThisRound = false;
      });

      await nextTurn(channel, activeDungeon);
    } else {
      // Defeated Phase 2: Complete Victory!
      await handleVictory(channel, activeDungeon);
    }
  } else {
    // Vòng 1-4: Advance round
    activeDungeon.logs.push(`🎉 **Đã tiêu diệt ${enemy.name}!** Sắp bước sang vòng kế tiếp.`);
    activeDungeon.round += 1;
    setupRound(activeDungeon, channel);
  }
};

// Victory handler: give rewards, save progress
const handleVictory = async (channel, activeDungeon) => {
  if (activeDungeon.timeoutTimer) {
    clearTimeout(activeDungeon.timeoutTimer);
    activeDungeon.timeoutTimer = null;
  }
  activeDungeon.collector.stop("victory");
  channel.client.rpgDungeons.delete(channel.id);

  // Update Guild Progress & check first clear of chapter
  const guild = await RpgGuild.findById(activeDungeon.guildId);
  let isFirstClearOfChapter = false;
  if (guild) {
    if (guild.chapterProgress < activeDungeon.chapter) {
      isFirstClearOfChapter = true;
    }
    guild.chapterProgress = Math.max(guild.chapterProgress, activeDungeon.chapter);
    await guild.save();
  }

  const dCfg = config.dungeon || {};
  const rewCfg = dCfg.rewards || { base_coke: 30000, base_exp: 1500 };
  const cokeReward = rewCfg.base_coke * activeDungeon.chapter;
  const expReward = rewCfg.base_exp * activeDungeon.chapter;

  const rewardTexts = [];

  for (const p of activeDungeon.players) {
    const freshUser = await User.findById(p.userRef._id);
    if (!freshUser) continue;

    // Add coke and exp
    await incBalance(freshUser.userId, cokeReward);
    await addRpgExp(freshUser, expReward);

    // Generate random gear drop
    const gear = await generateRpgGearDrop(freshUser, {
      level: freshUser.rpg.level,
      allowedRarities: getChapterRarities(activeDungeon.chapter),
    });
    
    // Give special weapon on first clear!
    let specialGear = null;
    const claimedWeapons = freshUser.rpg.claimedBossWeapons || [];
    const bossCfg = getBossConfig(activeDungeon.chapter);
    const bossReward = bossCfg?.first_clear_reward;

    if (isFirstClearOfChapter && bossReward && !claimedWeapons.includes(bossReward.claim_key)) {
      specialGear = await generateRpgGearDrop(freshUser, {
        slot: "weapon",
        subType: bossReward.name,
        emoji: bossReward.emoji,
        rarity: bossReward.rarity || "Ancient",
        imageKey: bossReward.image_path,
        forceDrop: true,
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

    // Give cristal stone reward based on chapter!
    const cristalStoneId = `cristal-${activeDungeon.chapter}`;
    if (!freshUser.inventory) {
      freshUser.inventory = new Map();
    }
    const currentQty = freshUser.inventory.get(cristalStoneId) || 0;
    freshUser.inventory.set(cristalStoneId, currentQty + 1);
    freshUser.markModified("inventory");

    await addRpgGearToUser(freshUser, gear);
    await freshUser.save();

    const stoneItem = channel.client.allItems?.find(i => i.item_id === cristalStoneId) || { name: `Somber Smithing Stone [${activeDungeon.chapter}]`, emoji: "💎" };

    let rewardLine = `👤 <@${p.id}>:\n` +
      `  • nhận **+${cokeReward.toLocaleString()}** <:cokecy:1509951335016173662>\n` +
      `  • nhận **+${expReward.toLocaleString()} EXP RPG**\n` +
      `  • nhận Đá nâng cấp: ${stoneItem.emoji} **${stoneItem.name}** (x1)\n` +
      `  • nhận Trang bị: **${gear.rarity} ${gear.subType}** (Lực chiến +${gear.power})`;

    if (specialGear && bossReward) {
      rewardLine += `\n  • 🏆 **PHẦN THƯỞNG LẦN ĐẦU TIÊU DIỆT**: Nhận vũ khí độc quyền ${bossReward.emoji} **${specialGear.subType}** (${specialGear.rarity})!`;
    }

    rewardTexts.push(rewardLine);
  }

  const embed = new EmbedBuilder()
    .setColor("#2ECC71")
    .setTitle("🏆 CHIẾN THẮNG PHÓ BẢN! 🏆")
    .setDescription(
      `Tổ đội của bạn đã xuất sắc chinh phục thành công **Chương ${activeDungeon.chapter}**!\n\n` +
      `**Phần thưởng vượt phó bản:**\n\n${rewardTexts.join("\n\n")}`
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
};

// Defeat handler: fail
const handleDefeat = async (channel, activeDungeon) => {
  if (activeDungeon.timeoutTimer) {
    clearTimeout(activeDungeon.timeoutTimer);
    activeDungeon.timeoutTimer = null;
  }
  activeDungeon.collector.stop("defeat");
  channel.client.rpgDungeons.delete(channel.id);

  const embed = new EmbedBuilder()
    .setColor("#C0392B")
    .setTitle("💀 THẤT BẠI! 💀")
    .setDescription(
      `Toàn bộ thành viên trong tổ đội đã tử nạn! Chiến dịch chinh phục **Chương ${activeDungeon.chapter}** thất bại.\n` +
      `Hãy rèn luyện thêm lực chiến và thử lại!`
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
};

// Timeout handler
const handleTimeout = async (channel, activeDungeon) => {
  if (activeDungeon.timeoutTimer) {
    clearTimeout(activeDungeon.timeoutTimer);
    activeDungeon.timeoutTimer = null;
  }
  if (activeDungeon.collector) {
    activeDungeon.collector.stop("timeout");
  }
  channel.client.rpgDungeons.delete(channel.id);

  const embed = new EmbedBuilder()
    .setColor("#C0392B")
    .setTitle("💀 HẾT THỜI GIAN! 💀")
    .setDescription(
      `Đã quá 5 phút mà tổ đội của bạn chưa vượt qua được vòng đấu này!\n` +
      `Chiến dịch chinh phục **Chương ${activeDungeon.chapter}** thất bại.`
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
};

