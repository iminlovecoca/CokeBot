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

// Helper for HP bars (Boss/Creep - 10 blocks)
const getHealthBar = (hp, maxHp) => {
  const percentage = Math.max(0, Math.min(1, hp / maxHp));
  const filledCount = Math.round(percentage * 10);
  const emptyCount = 10 - filledCount;
  const filled = "▰".repeat(filledCount);
  const empty = "▱".repeat(emptyCount);
  return `❤️ **HP:** ${filled}${empty} [${hp.toLocaleString()}/${maxHp.toLocaleString()}]`;
};

// Get dynamically scaled delay based on active dungeon speed
const getDelay = (activeDungeon, baseDelay) => {
  const speed = activeDungeon.speed ?? 1.0;
  return Math.max(100, Math.floor(baseDelay / speed));
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

    // Check if leader has a dungeon key
    const leaderUser = await User.findOne({ userId: guild.leaderId }).exec();
    const keyCount = leaderUser?.inventory?.get("dungeonkey") || 0;
    if (keyCount <= 0) {
      return message.reply(`❌ Bạn (Trưởng nhóm) cần có ít nhất **1 Chìa khóa Phó bản** <:key:1516398711712911461> để mở Dungeon. Có thể mua trong \`${config.prefix}shop\` với giá 250k Coke.`);
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
      
      // Transition to Blessing Selection
      await askBlessing(message, selectMsg, guild, chapter);
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

const askBlessing = async (message, selectMsg, guild, chapter) => {
  const userId = message.author.id;
  
  const blessingEmbed = new EmbedBuilder()
    .setColor("#F1C40F")
    .setTitle("✨ LỰA CHỌN PHƯỚC LÀNH TỔ ĐỘI ✨")
    .setDescription(
      `Trước khi bước vào Dungeon **Chương ${chapter}**, Trưởng nhóm hãy chọn chế độ hỗ trợ cho cả tổ đội:\n\n` +
      `✨ **Phước Lành Dungeon:** Tăng **+10% HP tối đa** & **+20% Sát thương cơ bản** cho toàn bộ thành viên. (Sử dụng tối đa 3 bình máu).\n` +
      `⚔️ **Không nhận Phước Lành (Thử thách):** Giữ nguyên chỉ số mặc định (3 bình máu), nhận thêm **+20% Coke & EXP** khi chiến thắng!`
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("rpg_blessing_active")
      .setLabel("Nhận Phước Lành ✨")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("rpg_blessing_none")
      .setLabel("Mặc định ⚔️")
      .setStyle(ButtonStyle.Secondary)
  );

  await selectMsg.edit({
    embeds: [blessingEmbed],
    components: [row],
  }).catch(() => {});

  const filter = (i) => i.user.id === userId && i.customId.startsWith("rpg_blessing_");
  const blessingCollector = selectMsg.createMessageComponentCollector({ filter, time: 30000 });

  blessingCollector.on("collect", async (i) => {
    await i.deferUpdate();
    const blessing = i.customId.replace("rpg_blessing_", "");
    blessingCollector.stop("selected");
    await selectMsg.delete().catch(() => {});
    
    await startDungeon({ message, guild, chapter, blessing });
  });

  blessingCollector.on("end", (collected, reason) => {
    if (reason !== "selected") {
      selectMsg.edit({
        content: "⏳ Hết thời gian lựa chọn phước lành. Dungeon đã được hủy.",
        embeds: [],
        components: [],
      }).catch(() => {});
    }
  });
};

// Core Dungeon Game Loop
const startDungeon = async ({ message, guild, chapter, blessing }) => {
  const client = message.client;
  const channel = message.channel;

  // Double check in-flight dungeon in channel
  if (client.rpgDungeons.has(channel.id)) {
    return channel.send("❌ Đang có một phó bản diễn ra tại kênh này.");
  }

  // Consume 1 dungeonkey from party leader
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

  // Load player characters
  const playerStates = [];
  for (const memberId of guild.members) {
    try {
      const { user, rpgClass } = await requireRpgCharacter(memberId);
      const stats = getEffectiveRpgStats(freshUserObject(user));
      const gearPower = calculateRpgPower(freshUserObject(user));
      const weapon = getEquippedItems(user).weapon;
      
      let maxHp = 150 + stats.vigor * 20 + user.rpg.level * 20;
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
        rpgClass: rpgClass,
        userRef: user, // For rewards
        rage: 0,
        mana: (user.rpg.classKey === "mage") ? 100 : 0,
      });
    } catch (err) {
      return channel.send(`❌ Có lỗi khi tải thông tin RPG của thành viên <@${memberId}>. Chắc chắn rằng toàn bộ thành viên đều đã tạo nhân vật.`);
    }
  }

  // Initialize active dungeon state
  const activeDungeon = {
    guildId: guild._id,
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

  const setupNormalMonster = () => {
    let name = `Quái Vật Gác Đền (Vòng ${round})`;
    let key = `creep${round}`;
    if (chapter === 4 && round === 3) {
      name = "Draugor (Tướng Tiên Phong)";
      key = "draugor";
    }
    const maxHp = Math.floor(normCfg.base_hp * chapter * (1 + round * normCfg.round_hp_mult));
    activeDungeon.enemy = {
      name: name,
      key: key,
      maxHp: maxHp,
      hp: maxHp,
      atk: Math.floor(normCfg.base_atk * chapter * (1 + round * normCfg.round_atk_mult)),
      armor: Math.floor(normCfg.base_defense * chapter),
      magicResist: Math.floor(normCfg.base_defense * chapter),
      isBoss: false,
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
    const maxHp = b1Cfg.base_hp;
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
    
    activeDungeon.players.forEach((p) => {
      p.hasActedThisRound = false;
    });
    nextTurn(channel, activeDungeon);
  };

  if (round < 5) {
    setupNormalMonster();
  } else {
    // Round 5: Boss Phase 1
    if (chapter === 6 && !activeDungeon.veilreaperStoryShown) {
      activeDungeon.veilreaperStoryShown = true;
      activeDungeon.actionInProgress = true;
      
      const introEmbed = new EmbedBuilder()
        .setColor("#000000")
        .setTitle("🔥 BẢN THỂ TỬ THẦN HIỆN THẾ 🔥")
        .setDescription(
          `*Ngọn lửa đen bùng lên dữ dội, thiêu rụi hoàn toàn phong ấn của Mourngait...*\n\n` +
          `🗣️ **Mourngait** gầm lên điên cuồng:\n` +
          `*"Lũ sinh vật thấp kém... Các ngươi tưởng lửa đen phong ấn ta sao? Không, nó là để kiềm hãm sức mạnh của ta!"*\n\n` +
          `*Từ đống tro tàn hắc hỏa, một hình dạng thực sự đầy kinh hoàng bước ra...*\n\n` +
          `🗣️ **Veilreaper** lạnh lùng cất giọng:\n` +
          `*"Ta sẽ cho ngươi thấy bản thân của người thấp kém đến thế nào trước Tử Thần..."*\n\n` +
          `🗣️ *"Chuẩn bị dâng hiến linh hồn đi!"*`
        )
        .setTimestamp();

      const filePath = path.join(__dirname, "../../assets/dungeons/Veilreaper.png");
      const files = [];
      if (fs.existsSync(filePath)) {
        files.push(new AttachmentBuilder(filePath, { name: "Veilreaper.png" }));
        introEmbed.setImage("attachment://Veilreaper.png");
      }

      channel.send({ embeds: [introEmbed], files }).then((introMsg) => {
        setTimeout(async () => {
          await introMsg.delete().catch(() => {});
          activeDungeon.actionInProgress = false;
          setupBossState();
        }, getDelay(activeDungeon, 7000));
      });
    } else {
      setupBossState();
    }
  }
};

// Render main game screen
const renderGameScreen = async (channel, activeDungeon) => {
  const { chapter, round, players, enemy, logs, currentActor } = activeDungeon;

  const BLESSING_NAMES = {
    active: "✨ Phước Lành Dungeon (+20% HP & +20% Sát thương)",
    none: "🛡️ Không có phước lành",
  };
  const blessingName = BLESSING_NAMES[activeDungeon.blessing || "none"];

  let descriptionText = `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
                        `⏰ **Thời gian:** <t:${Math.floor(activeDungeon.roundEndTime / 1000)}:R> | ✨ **Buff:** ${activeDungeon.blessing === "active" ? "Có" : "Không"}`;
  if (activeDungeon.isSimulation) {
    descriptionText += ` | ⚡ **Tốc độ:** **${activeDungeon.speed || 1.0}x**`;
  }
  descriptionText += `\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;

  const embed = new EmbedBuilder()
    .setColor(enemy.isBoss ? "#E74C3C" : "#E67E22")
    .setTitle(`⚔️ DUNGEON: CHƯƠNG ${chapter} - VÒNG ${round}/5 ⚔️`)
    .setDescription(descriptionText)
    .setTimestamp();

  const bossCfg = enemy.isBoss ? getBossConfig(chapter) : null;
  const hasDice = bossCfg?.mechanics?.dice_roll ?? false;
  const hasCoin = bossCfg?.mechanics?.coin_flip ?? false;

  // Top Frame: Enemy info
  let enemyInfo = `${getHealthBar(enemy.hp, enemy.maxHp)}\n`;
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

  // Separator: between Boss and Players
  embed.addFields({ name: "\u200B", value: "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬" });

  // Bottom Frame: 3 Players
  players.forEach((p, idx) => {
    const classIcon = p.rpgClass?.emoji || "👤";
    const className = p.rpgClass?.name || p.classKey.toUpperCase();
    const statusText = p.hp <= 0 ? "💀 **Tử nạn**\n" : "";
    const healBanText = (p.hp > 0 && p.healBanRounds && p.healBanRounds > 0) ? ` (🚫 Cấm ${p.healBanRounds} lượt)` : "";
    
    let resourceText = "";
    if (p.classKey === "mage") {
      resourceText = `\n🔮 MP: **${p.mana ?? 100}/100**`;
    } else if (p.classKey !== "wretch") {
      resourceText = `\n⚡ Nộ: **${p.rage ?? 0}%**`;
    }

    const hpInfo = `${statusText}` +
                   `❤️ HP: **${p.hp.toLocaleString()}/${p.maxHp.toLocaleString()}**` +
                   `${resourceText}\n` +
                   `🧪 Bình: **${p.potions}/3**${healBanText}\n` +
                   `Lvl **${p.level}** | **${className}**`;
    embed.addFields({ name: `${classIcon} ${p.name}`, value: hpInfo, inline: true });
  });

  // Separator: between Players and Logs
  embed.addFields({ name: "\u200B", value: "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬" });

  // Middle Frame: Logs
  const recentLogs = logs.slice(-5).join("\n");
  embed.addFields({ name: "📝 Nhật ký chiến trường", value: recentLogs || "*Trận đấu đang diễn ra...*" });

  // Buttons row
  const row = new ActionRowBuilder();
  
  // Disable buttons if action is in progress or dice rolling or finished
  let disableControls = activeDungeon.actionInProgress || activeDungeon.isFinished || (enemy.isBoss && enemy.phase === 1 && hasDice && !activeDungeon.diceRolled);
  if (activeDungeon.isSimulation) {
    disableControls = true;
  }

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

  const isPlayerTurn = !activeDungeon.isFinished && currentActor && currentActor.id;
  if (isPlayerTurn && currentActor.classKey !== "wretch") {
    let skillLabel = "Kỹ Năng ✨";
    let isSkillDisabled = disableControls;

    if (currentActor.classKey === "mage") {
      const mana = currentActor.mana ?? 100;
      skillLabel = `Siêu Năng ✨ (${mana} MP)`;
      if (mana < 25) {
        isSkillDisabled = true;
      }
    } else {
      const rage = currentActor.rage ?? 0;
      skillLabel = `Kỹ Năng ✨ (${rage}% Nộ)`;
      if (rage < 100) {
        isSkillDisabled = true;
      }
    }

    row.addComponents(
      new ButtonBuilder()
        .setCustomId("rpg_dungeon_action_skill")
        .setLabel(skillLabel)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(isSkillDisabled)
    );
  }

  if (activeDungeon.isFinished) {
    embed.setFooter({ text: "🏁 Trận đấu đã kết thúc." });
  } else if (currentActor && currentActor.id) {
    embed.setFooter({ text: `👉 Đến lượt của: ${currentActor.name}` });
  } else {
    embed.setFooter({ text: "👿 Lượt của kẻ địch..." });
  }

  // Handle files (Boss/Creep image)
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
  } else {
    // Normal monster round: check for creep image under Creeps folder
    if (chapter === 4 && round === 3) {
      const filePath = path.join(__dirname, "../../assets/dungeons/Creeps/Draugor.png");
      if (fs.existsSync(filePath)) {
        const fileName = "Draugor.png";
        files.push(new AttachmentBuilder(filePath, { name: fileName }));
        embed.setImage(`attachment://${fileName}`);
      }
    } else {
      const bossCfg = getBossConfig(chapter);
      const bossKey = bossCfg?.key ? bossCfg.key.toUpperCase() : "";
      if (bossKey) {
        const extensions = ["jpg", "png", "webp"];
        let filePath = null;
        let foundExt = null;
        for (const ext of extensions) {
          const testPath = path.join(__dirname, `../../assets/dungeons/Creeps/${bossKey}-creep${round}.${ext}`);
          if (fs.existsSync(testPath)) {
            filePath = testPath;
            foundExt = ext;
            break;
          }
        }
        if (filePath) {
          const fileName = `${bossKey}-creep${round}.${foundExt}`;
          files.push(new AttachmentBuilder(filePath, { name: fileName }));
          embed.setImage(`attachment://${fileName}`);
        }
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
  }, getDelay(activeDungeon, 2500));
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
    } else if (i.customId === "rpg_dungeon_action_skill") {
      pExist.hasActedThisRound = true;

      // Decrement heal ban if they have any
      if (pExist.healBanRounds && pExist.healBanRounds > 0) {
        pExist.healBanRounds -= 1;
        if (pExist.healBanRounds === 0) {
          activeDungeon.logs.push(`✨ Lời nguyền cấm hồi máu trên **${pExist.name}** đã được giải trừ.`);
        }
      }

      await executePlayerSkill(channel, activeDungeon, pExist);
    }
  });

  collector.on("end", (collected, reason) => {
    if (reason === "re-sent") return;
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
  }, getDelay(activeDungeon, 1500));
};

// Execute player skill action
const executePlayerSkill = async (channel, activeDungeon, player) => {
  const enemy = activeDungeon.enemy;

  if (player.classKey === "warrior") {
    activeDungeon.logs.push(`⚔️ **${player.name}** giải phóng kỹ năng **[Trọng Kiếm]**, chém một đòn cực mạnh vào **${enemy.name}**!`);
    player.rage = 0;
    await executePlayerAttack(channel, activeDungeon, player, 4.0);
    player.rage = 0;
  } else if (player.classKey === "assassin") {
    activeDungeon.logs.push(`🗡️ **${player.name}** tung chiêu thức **[Đâm Lén]** cực hiểm hóc vào điểm yếu của **${enemy.name}**!`);
    enemy.bleedRounds = 3;
    player.rage = 0;
    await executePlayerAttack(channel, activeDungeon, player, 2.0);
    player.rage = 0;
  } else if (player.classKey === "archer") {
    activeDungeon.logs.push(`🏹 **${player.name}** giương cung bắn ra đại tiễn **[Xuyên Táo]** xuyên thấu **${enemy.name}**!`);
    activeDungeon.archerDoubleDmgNext = true;
    activeDungeon.archerCasterId = player.id;
    player.rage = 0;
    await executePlayerAttack(channel, activeDungeon, player, 3.0);
    player.rage = 0;
  } else if (player.classKey === "mage") {
    const currentMana = player.mana ?? 100;
    if (currentMana < 25) {
      activeDungeon.actionInProgress = false;
      return channel.send(`❌ **${player.name}** không đủ Mana để dùng kỹ năng!`);
    }
    player.mana = currentMana - 25;
    activeDungeon.logs.push(`🔮 **${player.name}** tập hợp ma lực giải phóng pháp thuật **[Siêu Năng]** dội xuống **${enemy.name}**!`);
    await executePlayerAttack(channel, activeDungeon, player, 3.0);
  } else if (player.classKey === "paladin") {
    const healAmount = Math.floor((activeDungeon.totalDamageTaken || 0) * 0.1);
    activeDungeon.logs.push(`🛡️ **${player.name}** niệm chú kỹ năng **[Thiên Mệnh]**, hồi phục sinh mệnh cho toàn đội bằng 10% sát thương đã nhận trước đó (**${healAmount.toLocaleString()}** HP)!`);

    activeDungeon.players.forEach((p) => {
      if (p.hp > 0) {
        if (p.healBanRounds && p.healBanRounds > 0) {
          activeDungeon.logs.push(`🚫 **${p.name}** bị cấm hồi máu, không nhận được trị liệu.`);
        } else {
          const oldHp = p.hp;
          p.hp = Math.min(p.maxHp, p.hp + healAmount);
          const actualHealed = p.hp - oldHp;
          activeDungeon.logs.push(`💚 **${p.name}** được hồi **${actualHealed.toLocaleString()}** HP.`);
        }
      }
    });

    player.rage = 0;
    player.hasActedThisRound = true;

    // Decrement heal ban if they have any
    if (player.healBanRounds && player.healBanRounds > 0) {
      player.healBanRounds -= 1;
      if (player.healBanRounds === 0) {
        activeDungeon.logs.push(`✨ Lời nguyền cấm hồi máu trên **${player.name}** đã được giải trừ.`);
      }
    }

    activeDungeon.actionInProgress = false;
    await nextTurn(channel, activeDungeon);
  } else {
    activeDungeon.actionInProgress = false;
    return channel.send(`❌ Class này không có kỹ năng đặc biệt.`);
  }
};

// Execute player attack action
const executePlayerAttack = async (channel, activeDungeon, player, multiplier) => {
  const enemy = activeDungeon.enemy;

  // Eldric / Draugor deflection mechanic
  if (enemy.key === "eldric" || enemy.key === "draugor") {
    const deflectionChance = enemy.key === "eldric" ? 0.40 : 0.25;
    if (Math.random() < deflectionChance) {
      activeDungeon.actionInProgress = false;
      activeDungeon.logs.push(`🏹 **[Cung Trọng Trường]** Trọng lực bẻ cong đòn đánh! Đòn tấn công của **${player.name}** bị lệch hướng và trượt!`);
      if (player.classKey !== "mage" && player.classKey !== "wretch") {
        player.rage = Math.min(100, (player.rage || 0) + 10);
      }
      await nextTurn(channel, activeDungeon);
      return;
    }
  }

  // Veilreaper dodge mechanic against ranged classes
  if (enemy.key === "veilreaper" && (player.classKey === "archer" || player.classKey === "mage")) {
    if (Math.random() < 0.40) {
      activeDungeon.actionInProgress = false;
      activeDungeon.logs.push(`⚡ **${enemy.name}** di chuyển chớp nhoáng, né tránh đòn tấn công từ xa của **${player.name}**!`);
      if (player.classKey !== "mage" && player.classKey !== "wretch") {
        player.rage = Math.min(100, (player.rage || 0) + 10);
      }
      await nextTurn(channel, activeDungeon);
      return;
    }
  }

  // Damage calculation
  const isMagical = CLASS_ATTACK_TYPES[player.classKey] === "magical";
  const baseAttack = isMagical
    ? player.stats.int * 3.5 + player.stats.arc * 1.5
    : player.stats.str * 2.5 + player.stats.dex * 1.5;

  let rawDamage = (baseAttack + player.power) * multiplier;
  if (activeDungeon.blessing === "active") {
    rawDamage *= 1.2;
  }

  // Archer next teammate attack boost
  if (activeDungeon.archerDoubleDmgNext && player.id !== activeDungeon.archerCasterId) {
    rawDamage *= 2.0;
    activeDungeon.archerDoubleDmgNext = false;
    activeDungeon.logs.push(`✨ Nhận cường hóa từ Xuyên Táo, đòn đánh gây gấp đôi sát thương!`);
  }

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

  // Base attack modification done in rawDamage

  enemy.hp = Math.max(0, enemy.hp - damage);
  const critText = isCrit ? "💥 **Chí mạng!** " : "";
  activeDungeon.logs.push(`🗡️ **${player.name}** tấn công **${enemy.name}** gây ${critText}**${damage.toLocaleString()}** sát thương.`);

  // Accumulate rage on successful attack
  if (player.classKey !== "mage" && player.classKey !== "wretch") {
    player.rage = Math.min(100, (player.rage || 0) + 10);
  }

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
    // Process poison status at the start of player turn
    if (nextPlayer.poisonRounds && nextPlayer.poisonRounds > 0) {
      const poisonDamage = Math.floor(nextPlayer.maxHp * 0.08);
      nextPlayer.poisonRounds -= 1;
      
      if (nextPlayer.hp <= poisonDamage) {
        const actualDmg = nextPlayer.hp;
        nextPlayer.hp = 0;
        activeDungeon.totalDamageTaken = (activeDungeon.totalDamageTaken || 0) + actualDmg;
        activeDungeon.logs.push(`☣️ **${nextPlayer.name}** chịu **${poisonDamage.toLocaleString()}** sát thương độc bào mòn và đã tử nạn!`);
        nextPlayer.hasActedThisRound = true;
        return nextTurn(channel, activeDungeon);
      } else {
        nextPlayer.hp -= poisonDamage;
        activeDungeon.totalDamageTaken = (activeDungeon.totalDamageTaken || 0) + poisonDamage;
        activeDungeon.logs.push(`☣️ **${nextPlayer.name}** chịu **${poisonDamage.toLocaleString()}** sát thương độc bào mòn (Độc còn ${nextPlayer.poisonRounds} lượt).`);
      }
    }

    activeDungeon.currentActor = nextPlayer;
    await renderGameScreen(channel, activeDungeon);

    if (activeDungeon.isSimulation) {
      setTimeout(async () => {
        await runSimulatedTurn(channel, activeDungeon, nextPlayer);
      }, getDelay(activeDungeon, 2000));
    }
  } else {
    // All alive players have acted. Set enemy as current actor
    activeDungeon.currentActor = activeDungeon.enemy;
    await renderGameScreen(channel, activeDungeon);

    // Trigger enemy turn automatically
    activeDungeon.actionInProgress = true;
    setTimeout(async () => {
      await runEnemyTurn(channel, activeDungeon);
    }, getDelay(activeDungeon, 2000));
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

  // Bleed tick check
  if (enemy.bleedRounds && enemy.bleedRounds > 0) {
    const bleedDamage = Math.floor(enemy.maxHp * 0.1);
    enemy.hp = Math.max(0, enemy.hp - bleedDamage);
    enemy.bleedRounds -= 1;
    activeDungeon.logs.push(`🩸 **${enemy.name}** bị mất **${bleedDamage.toLocaleString()}** HP do hiệu ứng Chảy Máu (Còn ${enemy.bleedRounds} lượt).`);
    if (enemy.hp <= 0) {
      activeDungeon.logs.push(`🩸 **${enemy.name}** đã chết do mất máu quá nhiều!`);
      activeDungeon.actionInProgress = false;
      await handleEnemyDefeat(channel, activeDungeon);
      return;
    }
  }

  // Chapter 5: Vaelmor poison debuff trigger
  if (enemy.key === "vaelmor" && Math.random() < 0.35) {
    activeDungeon.logs.push(`☣️ **${enemy.name}** giải phóng **[Hơi Thở Kịch Độc: Vaelmor Miasma]** lan tỏa khắp trận địa!`);
    activeDungeon.players.forEach((p) => {
      if (p.hp > 0) {
        p.poisonRounds = 3;
      }
    });
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
    if (enemy.key === "eldric") {
      activeDungeon.logs.push(`🌀 **${enemy.name}** giải phóng **[Điểm Kỳ Dị: Hố Đen Trọng Lực]** hút mọi vật thể và ép nát tất cả!`);
    } else if (enemy.key === "veilreaper") {
      activeDungeon.logs.push(`☠️ **${enemy.name}** mở ra **[Vực Sâu Không Gian: Cuồng Phong Diệt Vong]** quét sạch sự sống!`);
    } else {
      activeDungeon.logs.push(`👿 **${enemy.name}** cười quỷ dị và phóng cuồng phong sát thương diện rộng (AOE)!`);
    }

    alivePlayers.forEach((p) => {
      const armor = p.stats.pr * 3.0;
      const mitigation = armor / (armor + 1000);
      const rawDmg = enemy.atk * mult * (0.85 + Math.random() * 0.3);
      let damage = Math.max(10, Math.floor(rawDmg * (1 - mitigation)));

      // Archer & Mage ranged passive mitigation
      if (mitCfg && mitCfg.classes?.includes(p.classKey)) {
        damage = Math.floor(damage * (mitCfg.multiplier ?? 0.6));
      }

      const actualDmg = Math.min(p.hp, damage);
      activeDungeon.totalDamageTaken = (activeDungeon.totalDamageTaken || 0) + actualDmg;

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
    
    let isCustomSkillUsed = false;
    
    if (enemy.key === "mourngait" && enemy.hp < enemy.maxHp * 0.40 && Math.random() < 0.60) {
      isCustomSkillUsed = true;
      const hpLoss = Math.floor(target.hp * 0.5);
      target.hp = Math.max(1, target.hp - hpLoss);
      activeDungeon.totalDamageTaken = (activeDungeon.totalDamageTaken || 0) + hpLoss;
      activeDungeon.logs.push(`💀 **${enemy.name}** bị hắc hỏa dồn vào hiểm cảnh! Giải phóng **[Đoạt Hồn Phong Ấn]** lên **${target.name}**, đoạt đi 50% máu hiện tại (mất **${hpLoss.toLocaleString()}** HP)!`);
    } else if (enemy.key === "veilreaper" && Math.random() < 0.30) {
      isCustomSkillUsed = true;
      const hpLoss = target.hp - 1;
      target.hp = 1;
      activeDungeon.totalDamageTaken = (activeDungeon.totalDamageTaken || 0) + hpLoss;
      activeDungeon.logs.push(`💀 **${enemy.name}** tung cánh, giải phóng **[Đoạt Hồn 100% Sức Mạnh]**! **${target.name}** chỉ còn **1 HP**!`);
    }

    if (!isCustomSkillUsed) {
      let damageMult = 1.0;
      if (enemy.key === "mourngait") {
        damageMult = 0.70; // 30% weaker due to seal
        activeDungeon.logs.push(`🔥 Hắc hỏa phong ấn kiềm hãm... Đòn đánh của **${enemy.name}** bị giảm sức mạnh!`);
      }
      
      const rawDmg = enemy.atk * (0.85 + Math.random() * 0.3) * damageMult;
      let damage = Math.max(10, Math.floor(rawDmg * (1 - mitigation)));

      // Archer & Mage ranged passive mitigation
      if (mitCfg && mitCfg.classes?.includes(target.classKey)) {
        damage = Math.floor(damage * (mitCfg.multiplier ?? 0.6));
      }

      if (enemy.key === "draugor" && Math.random() < 0.35) {
        activeDungeon.logs.push(`🌀 **${enemy.name}** học lỏm, mở ra **[Hố Đen Trọng Lực Tí Hon]** hút chặt và gây sát thương!`);
      }

      const actualDmg = Math.min(target.hp, damage);
      activeDungeon.totalDamageTaken = (activeDungeon.totalDamageTaken || 0) + actualDmg;

      target.hp = Math.max(0, target.hp - damage);
      activeDungeon.logs.push(`💥 **${enemy.name}** tấn công **${target.name}** gây **${damage.toLocaleString()}** sát thương.`);
      if (target.hp <= 0) {
        activeDungeon.logs.push(`💀 **${target.name}** đã tử nạn!`);
      }
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
      enemy.hp = b2Cfg.base_hp;
      enemy.maxHp = b2Cfg.base_hp;
      enemy.atk = Math.floor(enemy.atk * b2Cfg.base_atk_mult);
      enemy.phase = 2;
      enemy.bleedRounds = 0; // Clear bleed when entering phase 2
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
    if (enemy.key === "draugor") {
      activeDungeon.logs.push(`🗣️ **Draugor** hét lên phẫn nộ: *"Các người... các người sẽ phải chịu đựng cơn thịnh nộ của ngài ấy... lũ sinh vật thấp kém!"*`);
    } else {
      activeDungeon.logs.push(`🎉 **Đã tiêu diệt ${enemy.name}!** Sắp bước sang vòng kế tiếp.`);
    }
    activeDungeon.round += 1;
    setupRound(activeDungeon, channel);
  }
};

// Victory handler: give rewards, save progress
const handleVictory = async (channel, activeDungeon) => {
  activeDungeon.isFinished = true;
  await renderGameScreen(channel, activeDungeon);

  if (activeDungeon.timeoutTimer) {
    clearTimeout(activeDungeon.timeoutTimer);
    activeDungeon.timeoutTimer = null;
  }
  if (activeDungeon.collector) {
    activeDungeon.collector.stop("victory");
  }
  channel.client.rpgDungeons.delete(channel.id);

  if (activeDungeon.isSimulation) {
    const embed = new EmbedBuilder()
      .setColor("#2ECC71")
      .setTitle("🎉 MÔ PHỎNG CHIẾN THẮNG! 🎉")
      .setDescription(`Tổ đội giả lập đã xuất sắc chinh phục thành công Dungeon Chương **${activeDungeon.chapter}**!`)
      .setTimestamp();
    await channel.send({ embeds: [embed] });
    return;
  }

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
  const isChallenge = activeDungeon.blessing === "none";
  const mult = isChallenge ? 1.2 : 1.0;
  const cokeReward = Math.floor(rewCfg.base_coke * activeDungeon.chapter * mult);
  const expReward = Math.floor(rewCfg.base_exp * activeDungeon.chapter * mult);

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
      `Tổ đội của bạn đã xuất sắc chinh phục thành công **Chương ${activeDungeon.chapter}**!${isChallenge ? "\n🔥 **Bảo vật Thử Thách:** Tổ đội đã chọn chế độ mặc định (không buff) và nhận thêm **+20% Coke & EXP**!" : ""}\n\n` +
      `**Phần thưởng vượt phó bản:**\n\n${rewardTexts.join("\n\n")}`
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
};

// Defeat handler: fail
const handleDefeat = async (channel, activeDungeon) => {
  activeDungeon.isFinished = true;
  await renderGameScreen(channel, activeDungeon);

  if (activeDungeon.timeoutTimer) {
    clearTimeout(activeDungeon.timeoutTimer);
    activeDungeon.timeoutTimer = null;
  }
  if (activeDungeon.collector) {
    activeDungeon.collector.stop("defeat");
  }
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
  activeDungeon.isFinished = true;
  await renderGameScreen(channel, activeDungeon);

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

// Run simulated turn for automated testing
const runSimulatedTurn = async (channel, activeDungeon, player) => {
  if (!channel.client.rpgDungeons.has(channel.id)) return;
  if (player.hp <= 0) return;

  // Let's check if the simulation has already progressed to another actor (prevent double execution)
  if (activeDungeon.currentActor !== player) return;

  // Set action in progress
  activeDungeon.actionInProgress = true;

  // Check if player has heal ban
  if (player.healBanRounds && player.healBanRounds > 0) {
    player.healBanRounds -= 1;
    if (player.healBanRounds === 0) {
      activeDungeon.logs.push(`✨ Lời nguyền cấm hồi máu trên **${player.name}** đã được giải trừ.`);
    }
  }

  // Check if skill is ready
  let useSkill = false;
  if (player.classKey !== "wretch") {
    if (player.classKey === "mage") {
      if ((player.mana ?? 100) >= 25) useSkill = true;
    } else {
      if ((player.rage ?? 0) >= 100) useSkill = true;
    }
  }

  if (useSkill) {
    player.hasActedThisRound = true;
    await executePlayerSkill(channel, activeDungeon, player);
    return;
  }

  // Check if need healing
  const needHeal = player.hp < player.maxHp * 0.4 && player.potions > 0 && !(player.healBanRounds && player.healBanRounds > 0);
  if (needHeal) {
    player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * 0.3));
    player.potions -= 1;
    activeDungeon.logs.push(`🧪 [Sim] **${player.name}** đã uống bình máu hồi phục **${Math.floor(player.maxHp * 0.3).toLocaleString()}** HP.`);
    player.hasActedThisRound = true;
    activeDungeon.actionInProgress = false;
    await nextTurn(channel, activeDungeon);
    return;
  }

  // Otherwise, normal attack
  player.hasActedThisRound = true;

  // Check if coin flip is triggered in Phase 2
  const isPhase2 = activeDungeon.enemy.isBoss && activeDungeon.enemy.phase === 2;
  const bossCfg = getBossConfig(activeDungeon.chapter);
  const hasCoin = bossCfg?.mechanics?.coin_flip ?? false;
  
  if (isPhase2 && hasCoin && activeDungeon.coinFlipCount === 2) {
    // Guess coin flip
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
        multiplier = 2.0 + (activeDungeon.consecutiveCoinSuccess - 1) * 0.5;
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

