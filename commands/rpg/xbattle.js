const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const config = require("../../data/config");
const User = require("../../models/User");
const { getUser } = require("../../utils/userUtil");
const { checkAndSetCooldown, notifyCooldown } = require("../../utils/cooldown");
const {
  addRpgExp,
  calculateRpgPower,
  getEffectiveRpgStats,
  getRpgClass,
  requireRpgCharacter,
  getRpgXpNeeded,
} = require("../../utils/rpgUtil");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

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

const generatePvPImage = async (p1Asset, p2Asset) => {
  const width = 800;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Load background
  const bgPath = path.join(__dirname, "../../assets/backgrounds/dark-bg.png");
  if (fs.existsSync(bgPath)) {
    const bg = await loadImage(bgPath);
    ctx.drawImage(bg, 0, 0, width, height);
  } else {
    ctx.fillStyle = "#1e1f22";
    ctx.fillRect(0, 0, width, height);
  }

  async function drawTarget(ctx, img, x, y, width, height, flip = false) {
    const { createCanvas } = require("canvas");
    const tempCanvas = createCanvas(width, height);
    const tempCtx = tempCanvas.getContext("2d");

    tempCtx.drawImage(img, 0, 0, width, height);

    const imgData = tempCtx.getImageData(0, 0, width, height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (
        r >= 120 &&
        r <= 135 &&
        g >= 120 &&
        g <= 135 &&
        b >= 120 &&
        b <= 135
      ) {
        data[i + 3] = 0;
      }
    }
    tempCtx.putImageData(imgData, 0, 0);

    ctx.save();
    if (flip) {
      ctx.translate(x + width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(tempCanvas, -width, y);
    } else {
      ctx.drawImage(tempCanvas, x, y);
    }
    ctx.restore();
  }

  const p1ImgPath = path.join(__dirname, "../../assets/characters", p1Asset);
  if (fs.existsSync(p1ImgPath)) {
    const img1 = await loadImage(p1ImgPath);
    await drawTarget(ctx, img1, -30, 100, 200, 200, true);
  }

  const p2ImgPath = path.join(__dirname, "../../assets/characters", p2Asset);
  if (fs.existsSync(p2ImgPath)) {
    const img2 = await loadImage(p2ImgPath);
    await drawTarget(ctx, img2, 540, 100, 200, 200, false);
  }

  const tempDir = path.join(__dirname, "../../temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const filename = `pvp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
  const outputPath = path.join(tempDir, filename);
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outputPath, buffer);
  return { path: outputPath, name: filename };
};

const simulatePvP = (p1, p2) => {
  let turn = 1;
  const maxTurns = 25;

  // Determine who goes first based on AGI. Higher AGI goes first. If equal, random.
  let p1Agi = p1.effectiveStats.agi || 0;
  let p2Agi = p2.effectiveStats.agi || 0;
  let turnOrder =
    p1Agi > p2Agi
      ? [p1, p2]
      : p1Agi < p2Agi
        ? [p2, p1]
        : Math.random() < 0.5
          ? [p1, p2]
          : [p2, p1];

  while (turn <= maxTurns && p1.hp > 0 && p2.hp > 0) {
    const attacker = turnOrder[0];
    const defender = turnOrder[1];

    const defenderEvasion = Math.min(
      0.35,
      (defender.effectiveStats.agi * 0.1 +
        defender.effectiveStats.luck * 0.05) /
        100,
    );
    const isEvaded = Math.random() < defenderEvasion;

    if (!isEvaded) {
      const classCritBonus = attacker.rpgClass.bonuses?.critRate || 0;
      const attackerCritRate = Math.min(
        0.75,
        (attacker.effectiveStats.luck * 0.2 +
          attacker.effectiveStats.agi * 0.1) /
          100 +
          classCritBonus,
      );
      const isCrit = Math.random() < attackerCritRate;
      const critMult = 1.5 + attacker.effectiveStats.agi * 0.002;

      const isMagical = CLASS_ATTACK_TYPES[attacker.classKey] === "magical";
      const baseAtk = isMagical
        ? attacker.effectiveStats.int * 3.5
        : attacker.effectiveStats.str * 2.5 + attacker.effectiveStats.agi * 1.2;

      let rawDamage = baseAtk + attacker.gearPower;
      rawDamage *= 0.85 + Math.random() * 0.3; // variance
      if (isCrit) {
        rawDamage *= critMult;
      }

      let defenderMitigation = 0;
      if (isMagical) {
        const mr =
          defender.effectiveStats.int * 0.8 + defender.effectiveStats.vit * 0.7;
        defenderMitigation = mr / (mr + 200);
      } else {
        const armor = defender.effectiveStats.def * 1.5;
        defenderMitigation = armor / (armor + 200);
      }

      const defenderPvpDefBonus = defender.rpgClass.bonuses?.pvpDefense || 0;
      let damage = Math.max(
        5,
        Math.floor(
          rawDamage * (1 - defenderMitigation) * (1 - defenderPvpDefBonus),
        ),
      );

      defender.hp = Math.max(0, defender.hp - damage);
    }

    if (defender.hp <= 0) {
      break;
    }

    turnOrder = [defender, attacker];
    turn += 1;
  }

  let winner, loser;
  if (p1.hp <= 0) {
    winner = p2;
    loser = p1;
  } else if (p2.hp <= 0) {
    winner = p1;
    loser = p2;
  } else {
    const p1Percent = p1.hp / p1.maxHp;
    const p2Percent = p2.hp / p2.maxHp;
    if (p1Percent >= p2Percent) {
      winner = p1;
      loser = p2;
    } else {
      winner = p2;
      loser = p1;
    }
  }

  return { winner, loser, turns: turn - 1 };
};

module.exports = {
  name: "xbattle",
  aliases: ["b", "pvp", "arena", "battle"],
  description: "Khiêu chiến PvP với người chơi khác hoặc ngẫu nhiên.",
  usage: `${config.prefix}xbattle [@mention]`,
  examples: [
    {
      intent: "PVP ngẫu nhiên với người đã tạo class",
      command: `${config.prefix}xbattle`,
    },
    {
      intent: "Khiêu chiến một người chơi cụ thể",
      command: `${config.prefix}xbattle @Khang`,
    },
  ],

  async execute(message, args = []) {
    const senderId = message.author.id;
    const targetMention = message.mentions.users.first();

    const cooldownSeconds = 15;
    const remaining = checkAndSetCooldown(senderId, "pvp", cooldownSeconds);
    if (remaining > 0) {
      return notifyCooldown(message, remaining);
    }

    let senderUser, senderClass;
    try {
      const res = await requireRpgCharacter(senderId);
      senderUser = res.user;
      senderClass = res.rpgClass;
    } catch {
      return message.reply(
        `${config.emoji.warning} Bạn chưa tạo nhân vật RPG. Hãy gõ \`${config.prefix}class\` để tạo nhân vật trước khi PvP.`,
      );
    }

    if (targetMention) {
      const receiverId = targetMention.id;
      if (receiverId === senderId) {
        return message.reply(
          `${config.emoji.no} Bạn không thể tự chiến đấu với chính mình!`,
        );
      }

      let receiverUser, receiverClass;
      try {
        const res = await requireRpgCharacter(receiverId);
        receiverUser = res.user;
        receiverClass = res.rpgClass;
      } catch {
        return message.reply(
          `${config.emoji.no} Đối phương chưa tạo nhân vật RPG. Họ cần dùng lệnh \`${config.prefix}class\` trước.`,
        );
      }

      const challengeEmbed = new EmbedBuilder()
        .setColor(senderClass.color)
        .setTitle("⚔️ Thách Đấu PvP")
        .setDescription(
          `🛡️ **<@${senderId}>** (${senderClass.name} Lvl ${senderUser.rpg.level}) đã khiêu chiến **<@${receiverId}>** (${receiverClass.name} Lvl ${receiverUser.rpg.level})!\n\n` +
            `Bạn có chấp nhận lời thách đấu này không?`,
        )
        .setFooter({ text: "Lời mời thách đấu hết hạn sau 60 giây." });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("pvp_accept")
          .setLabel("Chấp nhận")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("pvp_decline")
          .setLabel("Từ chối")
          .setStyle(ButtonStyle.Danger),
      );

      const prompt = await message.reply({
        embeds: [challengeEmbed],
        components: [row],
      });

      const collector = prompt.createMessageComponentCollector({
        filter: (interaction) => interaction.user.id === receiverId,
        time: 60000,
      });

      collector.on("collect", async (interaction) => {
        if (interaction.customId === "pvp_accept") {
          collector.stop("accepted");
          await interaction.deferUpdate();
          const { updateQuestProgress } = require("../../utils/questUtil");
          await updateQuestProgress(senderId, "pvp_battle", 1, message.channel);
          await updateQuestProgress(receiverId, "pvp_battle", 1, message.channel);
          await runPvPBattle(message, prompt, senderId, receiverId);
        } else if (interaction.customId === "pvp_decline") {
          collector.stop("declined");
          await interaction.update({
            content: `❌ <@${receiverId}> đã từ chối lời khiêu chiến từ <@${senderId}>.`,
            embeds: [],
            components: [],
          });
        }
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "accepted" || reason === "declined") return;
        await prompt
          .edit({
            content: `⌛ Lời khiêu chiến đã hết hạn. <@${receiverId}> đã không trả lời kịp thời.`,
            embeds: [],
            components: [],
          })
          .catch(() => {});
      });
    } else {
      const count = await User.countDocuments({
        "rpg.classKey": { $ne: null },
        userId: { $ne: senderId },
      });

      if (count === 0) {
        return message.reply(
          `${config.emoji.no} Không tìm thấy người chơi nào khác có nhân vật RPG trong dữ liệu game để thách đấu.`,
        );
      }

      const randomIndex = Math.floor(Math.random() * count);
      const randomOpponent = await User.findOne({
        "rpg.classKey": { $ne: null },
        userId: { $ne: senderId },
      }).skip(randomIndex);

      const receiverId = randomOpponent.userId;
      await runPvPBattle(message, null, senderId, receiverId);
    }
  },
};

const runPvPBattle = async (message, promptMessage, p1Id, p2Id) => {
  const user1 = await User.findOne({ userId: p1Id });
  const user2 = await User.findOne({ userId: p2Id });

  const class1 = getRpgClass(user1.rpg.classKey);
  const class2 = getRpgClass(user2.rpg.classKey);

  const stats1 = getEffectiveRpgStats(user1);
  const stats2 = getEffectiveRpgStats(user2);

  const maxHp1 = 150 + stats1.vit * 15 + user1.rpg.level * 20;
  const maxHp2 = 150 + stats2.vit * 15 + user2.rpg.level * 20;

  // Retrieve actual user names from the client
  const u1Obj = await message.client.users.fetch(p1Id).catch(() => null);
  const u2Obj = await message.client.users.fetch(p2Id).catch(() => null);
  const p1Name =
    user1.rpg.name ||
    (u1Obj ? u1Obj.username : `Người chơi #${p1Id.slice(-4)}`);
  const p2Name =
    user2.rpg.name ||
    (u2Obj ? u2Obj.username : `Người chơi #${p2Id.slice(-4)}`);

  const player1 = {
    id: p1Id,
    name: p1Name,
    level: user1.rpg.level,
    classKey: user1.rpg.classKey,
    classLabel: class1.name,
    rpgClass: class1,
    effectiveStats: stats1,
    maxHp: maxHp1,
    hp: maxHp1,
    gearPower: calculateRpgPower(user1),
    dbUser: user1,
  };

  const player2 = {
    id: p2Id,
    name: p2Name,
    level: user2.rpg.level,
    classKey: user2.rpg.classKey,
    classLabel: class2.name,
    rpgClass: class2,
    effectiveStats: stats2,
    maxHp: maxHp2,
    hp: maxHp2,
    gearPower: calculateRpgPower(user2),
    dbUser: user2,
  };

  const result = simulatePvP(player1, player2);

  // Distribute rewards
  const winUser = result.winner.dbUser;
  const loseUser = result.loser.dbUser;

  // Streak tracking
  winUser.rpg.pvpStreak = (winUser.rpg.pvpStreak || 0) + 1;
  loseUser.rpg.pvpStreak = 0;

  const cokeWinner = 50 + Math.floor(Math.random() * 125);
  winUser.coke += cokeWinner;
  addRpgExp(winUser.rpg, 200);
  winUser.rpg.power = calculateRpgPower(winUser);
  winUser.markModified("rpg");
  await winUser.save();

  addRpgExp(loseUser.rpg, 50);
  loseUser.rpg.power = calculateRpgPower(loseUser);
  loseUser.markModified("rpg");
  await loseUser.save();

  const { updateQuestProgress } = require("../../utils/questUtil");
  await updateQuestProgress(p1Id, "exp_gain", result.winner.id === p1Id ? 200 : 50, message.channel);
  await updateQuestProgress(p2Id, "exp_gain", result.winner.id === p2Id ? 200 : 50, message.channel);

  const finalHp1 =
    result.winner.id === player1.id ? Math.max(1, result.winner.hp) : 0;
  const finalHp2 =
    result.winner.id === player2.id ? Math.max(1, result.winner.hp) : 0;

  const isP1Winner = result.winner.id === player1.id;

  const renderTextBar = (hp, max, power) => {
    const ratio = Math.max(0, Math.min(1, hp / max));
    const filled = Math.round(ratio * 10);
    const bar = "▰".repeat(filled) + "▱".repeat(10 - filled);
    return `${bar}\n${Math.max(0, hp).toLocaleString()} / ${max.toLocaleString()}\n⚔ Lực chiến: **${(power || 0).toLocaleString()}**`;
  };

  // 2 stages: start → result
  const stages = [
    {
      hp1: maxHp1,
      hp2: maxHp2,
      color: "#5865F2",
      showResult: false,
    },
    {
      hp1: finalHp1,
      hp2: finalHp2,
      color: isP1Winner ? "#2ECC71" : "#E74C3C",
      showResult: true,
    },
  ];

  let currentMsg = null;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];

    const imgData = await generatePvPImage(
      player1.dbUser.rpg.characterAsset || player1.rpgClass.asset,
      player2.dbUser.rpg.characterAsset || player2.rpgClass.asset,
    );

    const attachment = new AttachmentBuilder(imgData.path, {
      name: imgData.name,
    });

    const embed = new EmbedBuilder()
      .setColor(stage.color)
      .addFields(
        {
          name: `${player1.name} (${player1.classLabel})`,
          value: renderTextBar(stage.hp1, maxHp1, player1.gearPower),
          inline: true,
        },
        {
          name: `${player2.name} (${player2.classLabel})`,
          value: renderTextBar(stage.hp2, maxHp2, player2.gearPower),
          inline: true,
        },
      )
      .setImage(`attachment://${imgData.name}`);

    if (stage.showResult) {
      const winText = isP1Winner ? "Chiến thắng" : "Thất bại";
      const xpGained = isP1Winner ? 200 : 50;
      const streak = isP1Winner ? winUser.rpg.pvpStreak : 0;
      embed.setDescription(
        `**${winText} trong ${result.turns} lượt! | +${xpGained} XP | +${isP1Winner ? cokeWinner : 0} Coke | 🔥 Chuỗi thắng: ${streak}**`,
      );
    }

    const payload = {
      embeds: [embed],
      files: [attachment],
      components: [],
    };

    if (i === 0 && promptMessage && promptMessage.editable) {
      await promptMessage.edit(payload);
      currentMsg = promptMessage;
    } else if (i === 0) {
      currentMsg = await message.reply(payload);
    } else {
      await currentMsg.edit(payload).catch(() => {});
    }

    // Cleanup temp image
    try {
      if (fs.existsSync(imgData.path)) fs.unlinkSync(imgData.path);
    } catch (err) {
      console.error("Failed to delete temp file:", err);
    }

    // Delay between stages (not after last)
    if (i < stages.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
};
