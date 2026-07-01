const BaseCommand = require("../../core/BaseCommand");
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
  getDungeonWeaponKey,
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


const getHealthBar = (hp, maxHp) => {
  const percentage = Math.max(0, Math.min(1, hp / maxHp));
  const filledCount = Math.round(percentage * 10);
  const emptyCount = 10 - filledCount;
  const filled = "▰".repeat(filledCount);
  const empty = "▱".repeat(emptyCount);
  return `❤️ **HP:** ${filled}${empty} [${hp.toLocaleString()}/${maxHp.toLocaleString()}]`;
};


const getPoiseBar = (poise, poiseMax) => {
  const percentage = Math.max(0, Math.min(1, poise / poiseMax));
  const filledCount = Math.round(percentage * 10);
  const emptyCount = 10 - filledCount;
  const filled = "▰".repeat(filledCount);
  const empty = "▱".repeat(emptyCount);
  return `🛡️ **Poise:** ${filled}${empty} [${poise.toLocaleString()}/${poiseMax.toLocaleString()}]`;
};


const getDelay = (activeDungeon, baseDelay) => {
  const speed = activeDungeon.speed ?? 1.0;
  return Math.max(100, Math.floor(baseDelay / speed));
};


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
  return ["Epic", "Legendary", "Mythic"];
};

class DungeonCommand extends BaseCommand {
  constructor() {
    super({
      name: "dungeon",
      aliases: ["pb", "phoban"],
      description: "Khiêu chiến Dungeon tổ đội (yêu cầu team 3 người cùng Party)",
      usage: `${config.prefix}dungeon`,
      cooldown: 0
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
  }
}

module.exports = new DungeonCommand();

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


const startDungeon = async ({ message, guild, chapter, blessing }) => {
  const client = message.client;
  const channel = message.channel;

  
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
  const roundTimeLimit = isBossRound ? 10 * 60 * 1000 : 5 * 60 * 1000;
  
  const isC6BossIntro = (chapter === 6 && round === 5 && !activeDungeon.veilreaperStoryShown);
  if (!isC6BossIntro) {
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
    let maxHp = Math.max(15000, Math.min(65000, Math.floor(normCfg.base_hp * chapter * (1 + round * normCfg.round_hp_mult))));
    let atk = Math.min(580, Math.floor(normCfg.base_atk * chapter * (1 + round * normCfg.round_atk_mult)));
    let armor = Math.floor(normCfg.base_defense * chapter);
    let magicResist = Math.floor(normCfg.base_defense * chapter);

    if (chapter === 4 && round === 3) {
      name = "Draugor (Tướng Tiên Phong)";
      key = "draugor";
      maxHp = 75000;
      atk = 410;
      armor = 240;
      magicResist = 240;
    }

    activeDungeon.enemy = {
      name: name,
      key: key,
      maxHp: maxHp,
      hp: maxHp,
      atk: atk,
      armor: armor,
      magicResist: magicResist,
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

    
    let totalLevel = 0;
    let totalPower = 0;
    const count = activeDungeon.players.length || 1;
    for (const p of activeDungeon.players) {
      totalLevel += (p.level || 1);
      totalPower += (p.power || 0);
    }
    const targetLevel = totalLevel / count;
    const targetPower = totalPower / count;
    const leaderScaler = 1 + (targetLevel * 0.004) + (targetPower * 0.00003);

    const chapterScaler = 1 + (chapter - 1) * 0.20;
    const maxHp = Math.floor(b1Cfg.base_hp * leaderScaler);
    const poiseMax = 80 + chapter * 20;

    activeDungeon.enemy = {
      name: bossCfg.name_phase1,
      key: bossCfg.key,
      maxHp: maxHp,
      hp: maxHp,
      atk: Math.floor(b1Cfg.base_atk * chapterScaler * leaderScaler),
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

        const eyesPath = path.join(__dirname, "../../assets/backgrounds/eyes.png");
        const files = [];
        if (fs.existsSync(eyesPath)) {
          files.push(new AttachmentBuilder(eyesPath, { name: "eyes.png" }));
          introEmbed.setImage("attachment://eyes.png");
        }

        const msg = await channel.send({ embeds: [introEmbed], files }).catch(() => null);

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

  
  let enemyInfo = `${getHealthBar(enemy.hp, enemy.maxHp)}\n`;
  if (enemy.isBoss) {
    enemyInfo += `${getPoiseBar(enemy.poise || 0, enemy.poiseMax || 100)}\n`;
    if (enemy.poiseBroken) {
      enemyInfo += `✨ **Trạng thái:** **BỊ PHÁ VỠ POISE (Suy Yếu: Nhận thêm +50% Sát thương)**\n`;
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

  
  embed.addFields({ name: "\u200B", value: "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬" });

  
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

  
  embed.addFields({ name: "\u200B", value: "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬" });

  
  const recentLogs = logs.slice(-5).join("\n");
  embed.addFields({ name: "📝 Nhật ký chiến trường", value: recentLogs || "*Trận đấu đang diễn ra...*" });

  
  const row = new ActionRowBuilder();
  
  
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
          .setLabel("Huyết Sát 🩸")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(disableControls)
      );
    }
  }

  if (activeDungeon.isFinished) {
    embed.setFooter({ text: "🏁 Trận đấu đã kết thúc." });
  } else if (currentActor && currentActor.id) {
    embed.setFooter({ text: `👉 Đến lượt của: ${currentActor.name}` });
  } else {
    embed.setFooter({ text: "👿 Lượt của kẻ địch..." });
  }

  
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
    
    let filePath = null;
    let fileName = null;

    if (chapter === 4) {
      if (round === 3) {
        filePath = path.join(__dirname, "../../assets/dungeons/Creeps/Draugor.png");
        fileName = "Draugor.png";
      } else if (round === 1 || round === 2 || round === 4) {
        filePath = path.join(__dirname, "../../assets/dungeons/Creeps/soilderDevil.png");
        fileName = "soilderDevil.png";
      }
    } else if (chapter === 5) {
      
      const bossCfg = getBossConfig(chapter);
      const bossKey = bossCfg?.key ? bossCfg.key.toUpperCase() : "";
      if (bossKey) {
        const extensions = ["jpg", "png", "webp"];
        for (const ext of extensions) {
          const testPath = path.join(__dirname, `../../assets/dungeons/Creeps/${bossKey}-creep${round}.${ext}`);
          if (fs.existsSync(testPath)) {
            filePath = testPath;
            fileName = `${bossKey}-creep${round}.${ext}`;
            break;
          }
        }
      }
    } else {
      
      const testPath = path.join(__dirname, `../../assets/dungeons/Creeps/Creep${round}.png`);
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        fileName = `Creep${round}.png`;
      }
    }

    if (filePath && fs.existsSync(filePath)) {
      files.push(new AttachmentBuilder(filePath, { name: fileName }));
      embed.setImage(`attachment://${fileName}`);
    }
  }

  const payload = { embeds: [embed], components: [row], files };

  if (activeDungeon.gameMessage) {
    await activeDungeon.gameMessage.edit(payload).catch(() => {});
  } else {
    activeDungeon.gameMessage = await channel.send(payload);
    setupCollector(channel, activeDungeon);
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


const setupCollector = (channel, activeDungeon) => {
  const collector = activeDungeon.gameMessage.createMessageComponentCollector({
    filter: (i) => i.customId.startsWith("rpg_dungeon_action_") || i.customId.startsWith("rpg_dungeon_coin_"),
    time: 15 * 60 * 1000, 
  });

  collector.on("collect", async (i) => {
    
    const pExist = activeDungeon.players.find((p) => p.id === i.user.id);
    if (!pExist) {
      return i.reply({ content: "❌ Bạn không thuộc tổ đội khiêu chiến phó bản này!", ephemeral: true });
    }

    
    if (activeDungeon.actionInProgress) {
      return i.reply({ content: "⏳ Hệ thống đang xử lý lượt trước, hãy đợi một chút!", ephemeral: true });
    }

    
    const currentActor = activeDungeon.currentActor;
    if (!currentActor || currentActor.id !== i.user.id) {
      return i.reply({ content: "❌ Không phải lượt của bạn!", ephemeral: true });
    }

    await i.deferUpdate();

    
    activeDungeon.actionInProgress = true;

    if (i.customId === "rpg_dungeon_action_heal") {
      
      if (pExist.healBanRounds && pExist.healBanRounds > 0) {
        activeDungeon.actionInProgress = false;
        const bossCfg = getBossConfig(activeDungeon.chapter);
        const passiveName = bossCfg.passive?.name || "Lời Nguyền Xương";
        return i.followUp({ content: `❌ Bạn đang bị dính [${passiveName}] trong **${pExist.healBanRounds}** lượt nữa!`, ephemeral: true });
      }

      
      if (pExist.potions <= 0) {
        activeDungeon.actionInProgress = false;
        return i.followUp({ content: "❌ Bạn đã dùng hết bình máu trong phó bản này!", ephemeral: true });
      }

      pExist.hp = Math.min(pExist.maxHp, pExist.hp + Math.floor(pExist.maxHp * 0.3));
      pExist.potions -= 1;
      activeDungeon.logs.push(`🧪 **${pExist.name}** đã uống bình máu hồi phục **${Math.floor(pExist.maxHp * 0.3).toLocaleString()}** HP.`);

      
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
      if (isPhase2 && hasCoin && activeDungeon.coinFlipCount === 2) {
        
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
      activeDungeon.logs.push(`🩸 **${pExist.name}** hy sinh **${hpCost.toLocaleString()}** HP để kích hoạt **Huyết Sát**!`);

      
      activeDungeon.crimsonActivePlayer = pExist.id;
      activeDungeon.crimsonHpCost = hpCost;

      await executePlayerAttack(channel, activeDungeon, pExist, 1.36);
    }
  });

  collector.on("end", (collected, reason) => {
    if (reason === "re-sent") return;
    if (activeDungeon.isFinished) {
      if (activeDungeon.timeoutTimer) {
        clearTimeout(activeDungeon.timeoutTimer);
        activeDungeon.timeoutTimer = null;
      }
      channel.client.rpgDungeons.delete(channel.id);
    }
  });

  activeDungeon.collector = collector;
};


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
    
    await coinMsg.delete().catch(() => {});
    activeDungeon.logs.push(`⏳ Quá thời gian chọn mặt đồng xu! Sát thương bình thường (x1.0). Chuỗi đoán đúng bị ngắt!`);
    activeDungeon.consecutiveCoinSuccess = 0;
    activeDungeon.coinFlipCount = 0; 
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

  if (player.classKey === "warrior") {
    activeDungeon.logs.push(`⚔️ **${player.name}** giải phóng kỹ năng **[Trọng Kiếm]**, chém một đòn cực mạnh vào **${enemy.name}**!`);
    player.rage = 0;
    await executePlayerAttack(channel, activeDungeon, player, 4.0, true);
    player.rage = 0;
  } else if (player.classKey === "assassin") {
    activeDungeon.logs.push(`🗡️ **${player.name}** tung chiêu thức **[Đâm Lén]** cực hiểm hóc vào điểm yếu của **${enemy.name}**!`);
    enemy.bleedRounds = 3;
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
    activeDungeon.logs.push(`🛡️ **${player.name}** niệm chú kỹ năng **[Thiên Mệnh]**, lập tức giải trừ toàn bộ hiệu ứng bất lợi và hồi phục 30% lượng máu tối đa cho toàn đội!`);

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
          activeDungeon.logs.push(`✨ **${p.name}** được Paladin thanh tẩy hiệu ứng: **${clearedDebuffs.join(", ")}**.`);
        }

        
        const healAmount = Math.floor(p.maxHp * 0.30);
        const oldHp = p.hp;
        p.hp = Math.min(p.maxHp, p.hp + healAmount);
        const actualHealed = p.hp - oldHp;
        if (actualHealed > 0) {
          activeDungeon.logs.push(`💚 **${p.name}** được hồi **${actualHealed.toLocaleString()}** HP (30% máu tối đa).`);
        } else {
          activeDungeon.logs.push(`💚 **${p.name}** đang đầy máu.`);
        }
      }
    });

    player.rage = Math.max(0, (player.rage || 0) - 50) + 10;
    player.hasActedThisRound = true;

    activeDungeon.actionInProgress = false;
    await nextTurn(channel, activeDungeon);
  } else {
    activeDungeon.actionInProgress = false;
    return channel.send(`❌ Class này không có kỹ năng đặc biệt.`);
  }
};


const executePlayerAttack = async (channel, activeDungeon, player, multiplier, isSkill = false) => {
  const enemy = activeDungeon.enemy;

  
  if ((enemy.key === "eldric" || enemy.key === "draugor") && !enemy.poiseBroken && !isSkill) {
    const deflectionChance = enemy.key === "eldric" ? 0.30 : 0.25;
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

  
  if (enemy.key === "veilreaper" && (player.classKey === "archer" || player.classKey === "mage") && !enemy.poiseBroken && !isSkill) {
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

  
  const isMagical = CLASS_ATTACK_TYPES[player.classKey] === "magical";
  const baseAttack = isMagical
    ? player.stats.int * 3.5 + player.stats.arc * 1.5
    : player.stats.str * 2.5 + player.stats.dex * 1.5;

  let rawDamage = (baseAttack + player.power) * multiplier;
  if (activeDungeon.blessing === "active") {
    rawDamage *= 1.2;
  }

  
  const pWeaponSubType = player.weapon?.subType ? player.weapon.subType.toLowerCase().replace(/\s+/g, "") : "";
  const hasWeaponTriggered = Math.random() < 0.45;
  
  if (pWeaponSubType === "clawhex" && hasWeaponTriggered) {
    enemy.bleedRounds = 3;
    enemy.clawhexBleed = true;
    enemy.bleedDamage = Math.floor((player.stats.str * 0.5 + player.stats.dex * 0.5));
    rawDamage *= 1.15;
  } else if (enemy.bleedRounds && enemy.bleedRounds > 0 && enemy.clawhexBleed) {
    rawDamage *= 1.15; 
  }

  
  if (activeDungeon.archerDoubleDmgNext && player.id !== activeDungeon.archerCasterId) {
    rawDamage *= 2.0;
    activeDungeon.archerDoubleDmgNext = false;
    activeDungeon.logs.push(`✨ Nhận cường hóa từ Xuyên Táo, đòn đánh gây gấp đôi sát thương!`);
  }

  rawDamage *= 0.85 + Math.random() * 0.3; 

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

  
  if (pWeaponSubType === "axesnake" && hasWeaponTriggered) {
    enemy.armor = Math.max(0, Math.floor(enemy.armor * 0.90));
    enemy.magicResist = Math.max(0, Math.floor(enemy.magicResist * 0.90));
    activeDungeon.logs.push(`🐍 **[Axesnake]** Phá hủy 10% giáp vật lý và phép của đối thủ! Giáp còn: ${enemy.armor.toLocaleString()} PR / ${enemy.magicResist.toLocaleString()} MR.`);
  }

  
  let mrOrArmor = isMagical ? enemy.magicResist : enemy.armor;
  
  if (!isMagical && pWeaponSubType === "spearhex" && hasWeaponTriggered) {
    mrOrArmor = Math.floor(mrOrArmor * 0.90);
  }
  if (pWeaponSubType === "sunbow" && hasWeaponTriggered) {
    mrOrArmor = Math.floor(mrOrArmor * 0.90);
  }

  const mitigation = mrOrArmor / (mrOrArmor + 250);
  let damage = Math.max(10, Math.floor(rawDamage * (1 - mitigation)));

  if (player.userRef?.rpg?.isGodMode) {
    damage = enemy.hp;
  }

  
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

    
    if (bossCfg?.mechanics?.vulnerable_on_heal_ban) {
      const isAnyPlayerHealBanned = activeDungeon.players.some((p) => p.hp > 0 && p.healBanRounds && p.healBanRounds > 0);
      if (isAnyPlayerHealBanned) {
        damage = Math.floor(damage * 2.0);
      }
    }

    
    if (enemy.poiseBroken) {
      damage = Math.floor(damage * 2.0);
    }
  }

  

  enemy.hp = Math.max(0, enemy.hp - damage);
  const critText = isCrit ? "💥 **Chí mạng!** " : "";
  activeDungeon.logs.push(`🗡️ **${player.name}** tấn công **${enemy.name}** gây ${critText}**${damage.toLocaleString()}** sát thương.`);

  if (pWeaponSubType === "riverofblood" && hasWeaponTriggered) {
    const healAmt = Math.max(1, Math.floor(damage * 0.02));
    player.hp = Math.min(player.maxHp, player.hp + healAmt);
    activeDungeon.logs.push(`🩸 **[River of Blood]** Hồi phục cho **${player.name}** **${healAmt.toLocaleString()}** HP.`);
  }

  
  if (enemy.isBoss && !enemy.poiseBroken) {
    const poiseDmg = Math.max(8, Math.floor(damage * 0.0008));
    enemy.poise = Math.max(0, enemy.poise - poiseDmg);
    if (enemy.poise <= 0) {
      enemy.poiseBroken = true;
      activeDungeon.logs.push(`🛡️ **[PHÁ VỠ POISE]** Sức tấn công của nhóm đã làm **${enemy.name}** bị quỵ ngã! Boss nhận thêm **100% sát thương** cho đến lượt đi tiếp theo!`);
    }
  }

  
  if (player.classKey !== "mage" && player.classKey !== "wretch") {
    player.rage = Math.min(100, (player.rage || 0) + 10);
  }

  activeDungeon.actionInProgress = false;

  if (enemy.hp <= 0) {
    if (activeDungeon.crimsonActivePlayer === player.id) {
      const hpRefund = activeDungeon.crimsonHpCost || 0;
      player.hp = Math.min(player.maxHp, player.hp + hpRefund);
      activeDungeon.logs.push(`🩸 **${player.name}** tiêu diệt mục tiêu và được hồi lại **${hpRefund.toLocaleString()}** HP từ nội tại Crimson Dagger!`);
    }
    delete activeDungeon.crimsonActivePlayer;
    delete activeDungeon.crimsonHpCost;
    await handleEnemyDefeat(channel, activeDungeon);
  } else {
    delete activeDungeon.crimsonActivePlayer;
    delete activeDungeon.crimsonHpCost;
    await nextTurn(channel, activeDungeon);
  }
};


const nextTurn = async (channel, activeDungeon) => {
  const alivePlayers = activeDungeon.players.filter((p) => p.hp > 0);
  
  alivePlayers.sort((a, b) => (b.stats?.dex || 0) - (a.stats?.dex || 0));
  const nextPlayer = alivePlayers.find((p) => !p.hasActedThisRound);

  if (nextPlayer) {
    
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

    
    const playerSubType = nextPlayer.weapon?.subType ? nextPlayer.weapon.subType.toLowerCase().replace(/\s+/g, "") : "";
    if (playerSubType.includes("shieldhex") && nextPlayer.shieldhexRounds >= 3) {
      const reflectDmg = Math.floor((nextPlayer.shieldhexAbsorbed || 0) * 0.90);
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

  
  if (enemy.isBoss && enemy.poiseBroken) {
    activeDungeon.logs.push(`💥 **${enemy.name}** vẫn đang bị phá vỡ Poise — mất lượt tấn công! Poise phục hồi.`);
    enemy.poiseBroken = false;
    enemy.poise = enemy.poiseMax || (80 + (activeDungeon.chapter || 1) * 20);
    
    activeDungeon.players.forEach((p) => {
      p.hasActedThisRound = false;
    });
    activeDungeon.actionInProgress = false;
    await nextTurn(channel, activeDungeon);
    return;
  }

  
  if (enemy.bleedRounds && enemy.bleedRounds > 0) {
    const bleedDamage = Math.floor(enemy.maxHp * 0.08);
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
        t.skillBanRounds = 1;
        activeDungeon.logs.push(`🚫 **${t.name}** bị cấm sử dụng kỹ năng trong **1** lượt!`);
      });
    }
  }

  
  if (enemy.key === "vaelmor" && Math.random() < 0.35) {
    activeDungeon.logs.push(`☣️ **${enemy.name}** giải phóng **[Hơi Thở Kịch Độc: Vaelmor Miasma]** lan tỏa khắp trận địa!`);
    activeDungeon.players.forEach((p) => {
      if (p.hp > 0) {
        p.poisonRounds = 3;
      }
    });
  }

  
  if (enemy.isBoss && enemy.phase === 2) {
    const bossCfg = getBossConfig(activeDungeon.chapter);
    const passive = bossCfg.passive;
    if (passive && passive.type === "heal_ban" && Math.random() < passive.chance) {
      const target = selectBossTarget(alivePlayers);
      target.healBanRounds = passive.duration;
      activeDungeon.logs.push(`💀 **${enemy.name}** sử dụng [${passive.name}] lên **${target.name}**: Cấm sử dụng bình hồi máu trong ${passive.duration} lượt!`);
    }
  }

  const isAOE = enemy.isBoss && enemy.phase === 2;
  const mitCfg = config.dungeon?.ranged_class_mitigation;

  if (isAOE) {
    
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
      const rawDmg = enemy.atk * mult * (0.85 + Math.random() * 0.3);
      let damage = Math.max(10, Math.floor(rawDmg * (1 - mitigation)));

      
      if (mitCfg && mitCfg.classes?.includes(p.classKey)) {
        damage = Math.floor(damage * (mitCfg.multiplier ?? 0.6));
      }

      
      if (p.classKey === "paladin") {
        damage = Math.floor(damage * 0.95);
      }

      
      const playerSubType = p.weapon?.subType ? p.weapon.subType.toLowerCase().replace(/\s+/g, "") : "";
      if (playerSubType.includes("shieldhex")) {
        damage = Math.floor(damage * 0.80);
        p.shieldhexAbsorbed = (p.shieldhexAbsorbed || 0) + damage;
        p.shieldhexRounds = (p.shieldhexRounds || 0) + 1;
      }

      const actualDmg = Math.min(p.hp, damage);
      activeDungeon.totalDamageTaken = (activeDungeon.totalDamageTaken || 0) + actualDmg;

      p.hp = Math.max(0, p.hp - damage);
      if (p.hp > 0 && p.classKey !== "mage" && p.classKey !== "wretch") {
        p.rage = Math.min(100, (p.rage || 0) + 10);
      }
      activeDungeon.logs.push(`💥 Gây **${damage.toLocaleString()}** st lên **${p.name}**.`);
      if (p.hp <= 0) {
        activeDungeon.logs.push(`💀 **${p.name}** đã tử nạn!`);
      }
    });

    
    activeDungeon.phase2Madness = Math.min(1.30, activeDungeon.phase2Madness + 0.04);
  } else {
    
    const target = selectBossTarget(alivePlayers);
    const armor = target.stats.pr * 12.0;
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
        damageMult = 0.70; 
        activeDungeon.logs.push(`🔥 Hắc hỏa phong ấn kiềm hãm... Đòn đánh của **${enemy.name}** bị giảm sức mạnh!`);
      }
      
      const rawDmg = enemy.atk * (0.85 + Math.random() * 0.3) * damageMult;
      let damage = Math.max(10, Math.floor(rawDmg * (1 - mitigation)));

      
      if (mitCfg && mitCfg.classes?.includes(target.classKey)) {
        damage = Math.floor(damage * (mitCfg.multiplier ?? 0.6));
      }

      
      if (target.classKey === "paladin") {
        damage = Math.floor(damage * 0.95);
      }

      
      const targetSubType = target.weapon?.subType ? target.weapon.subType.toLowerCase().replace(/\s+/g, "") : "";
      if (targetSubType.includes("shieldhex")) {
        damage = Math.floor(damage * 0.80);
        target.shieldhexAbsorbed = (target.shieldhexAbsorbed || 0) + damage;
        target.shieldhexRounds = (target.shieldhexRounds || 0) + 1;
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
    if (target.hp > 0 && target.classKey !== "mage" && target.classKey !== "wretch") {
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
      if (chapter === 3 || enemy.key === "mourngait") {
        activeDungeon.logs.push(`💬 **${enemy.name}** gầm lên đau đớn trước khi tan rã: *"Sẽ có ngày ta trở lại tìm các ngươi... Hãy tận hưởng những giây phút yên bình ngắn ngủi này đi!"*`);
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
      const leaderScaler = 1 + (targetLevel * 0.004) + (targetPower * 0.00003);

      const maxHp = Math.floor(b2Cfg.base_hp * leaderScaler);
      const poiseMax = 80 + chapter * 20;

      enemy.name = bossCfg.name_phase2;
      enemy.hp = maxHp;
      enemy.maxHp = maxHp;
      enemy.atk = Math.floor(enemy.atk * b2Cfg.base_atk_mult);
      enemy.armor = Math.floor(b2Cfg.base_defense * leaderScaler);
      enemy.magicResist = Math.floor(b2Cfg.base_defense * leaderScaler);
      enemy.phase = 2;
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
      const newTimeLimit = 5 * 60 * 1000; 
      activeDungeon.roundEndTime = Date.now() + newTimeLimit;
      activeDungeon.timeoutTimer = setTimeout(async () => {
        await handleTimeout(channel, activeDungeon);
      }, newTimeLimit);

      await nextTurn(channel, activeDungeon);
    } else {
      
      await handleVictory(channel, activeDungeon);
    }
  } else {
    
    if (enemy.key === "draugor") {
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

    if (!freshUser.rpg.clearedDungeons) {
      freshUser.rpg.clearedDungeons = [];
    }
    const hasClearedBefore = freshUser.rpg.clearedDungeons.includes(activeDungeon.chapter);

    let userCokeReward = cokeReward;
    let userExpReward = expReward;

    if (hasClearedBefore) {
      userCokeReward = Math.floor(cokeReward / 3);
      userExpReward = Math.floor(expReward / 3);
    } else {
      freshUser.rpg.clearedDungeons.push(activeDungeon.chapter);
      freshUser.markModified("rpg");
    }

    await incBalance(freshUser.userId, userCokeReward);
    addRpgExp(freshUser.rpg, userExpReward);
    freshUser.markModified("rpg");

    const gear = await generateRpgGearDrop(freshUser, {
      level: freshUser.rpg.level,
      allowedRarities: getChapterRarities(activeDungeon.chapter),
      forceDrop: true,
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
    const currentQty = freshUser.inventory.get(cristalStoneId) || 0;
    freshUser.inventory.set(cristalStoneId, currentQty + 1);

    const gotSoul = Math.random() < 0.30;
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

    const { updateQuestProgress } = require("../../utils/questUtil");
    await updateQuestProgress(freshUser.userId, "dungeon_win", 1, channel, { chapter: activeDungeon.chapter });

    const stoneItem = channel.client.allItems?.find(i => i.item_id === cristalStoneId) || { name: `Cristal Smithing Stone [${activeDungeon.chapter}]`, emoji: "💎" };

    const gearText = gear 
      ? `**${gear.rarity} ${gear.subType}** (Lực chiến +${gear.power})`
      : "Không nhận được";

    let rewardLine = `👤 <@${p.id}>:\n` +
      `  • nhận **+${userCokeReward.toLocaleString()}** <:cokecy:1509951335016173662>${hasClearedBefore ? " *(Phó bản đã vượt: nhận 1/3)*" : ""}\n` +
      `  • nhận **+${userExpReward.toLocaleString()} EXP RPG**${hasClearedBefore ? " *(Phó bản đã vượt: nhận 1/3)*" : ""}\n` +
      `  • Linh Hồn: ${soulText}\n` +
      `  • nhận Đá nâng cấp: ${stoneItem.emoji} **${stoneItem.name}** (x1)\n` +
      `  • nhận Trang bị: ${gearText}`;

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
  if (player.classKey !== "wretch" && !hasSkillBan) {
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
    player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * 0.3));
    player.potions -= 1;
    activeDungeon.logs.push(`🧪 [Sim] **${player.name}** đã uống bình máu hồi phục **${Math.floor(player.maxHp * 0.3).toLocaleString()}** HP.`);
    player.hasActedThisRound = true;
    activeDungeon.actionInProgress = false;
    await nextTurn(channel, activeDungeon);
    return;
  }

  
  player.hasActedThisRound = true;

  
  const isPhase2 = activeDungeon.enemy.isBoss && activeDungeon.enemy.phase === 2;
  const bossCfg = getBossConfig(activeDungeon.chapter);
  const hasCoin = bossCfg?.mechanics?.coin_flip ?? false;
  
  if (isPhase2 && hasCoin && activeDungeon.coinFlipCount === 2) {
    
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

