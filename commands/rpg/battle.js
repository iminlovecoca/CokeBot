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
  getEquippedItems,
  dungeonKeys,
} = require("../../utils/rpgUtil");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

const CLASS_ATTACK_TYPES = {
  warrior: "physical",
  archer: "physical",
  mage: "magical",
  assassin: "physical",
  paladin: "physical",
  wretch: "physical",
};

const imageCache = new Map();

const getCachedImage = async (imagePath) => {
  if (imageCache.has(imagePath)) {
    return imageCache.get(imagePath);
  }
  if (fs.existsSync(imagePath)) {
    const img = await loadImage(imagePath);
    imageCache.set(imagePath, img);
    return img;
  }
  return null;
};

const transparentCharCache = new Map();

const getTransparentCharacter = async (pAsset) => {
  if (transparentCharCache.has(pAsset)) {
    return transparentCharCache.get(pAsset);
  }

  const pImgPath = path.join(__dirname, "../../assets/characters", pAsset);
  if (!fs.existsSync(pImgPath)) return null;

  const img = await loadImage(pImgPath);
  const width = 200;
  const height = 200;
  const tempCanvas = createCanvas(width, height);
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(img, 0, 0, width, height);

  transparentCharCache.set(pAsset, tempCanvas);
  return tempCanvas;
};

const generatePvPImage = async (p1Asset, p2Asset) => {
  const width = 800;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Load background
  const bgPath = path.join(__dirname, "../../assets/backgrounds/battlebg.png");
  const bg = await getCachedImage(bgPath);
  if (bg) {
    ctx.drawImage(bg, 0, 0, width, height);
  } else {
    ctx.fillStyle = "#1e1f22";
    ctx.fillRect(0, 0, width, height);
  }

  const img1 = await getTransparentCharacter(p1Asset);
  if (img1) {
    ctx.save();
    ctx.translate(-30 + 200, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img1, -200, 100);
    ctx.restore();
  }

  const img2 = await getTransparentCharacter(p2Asset);
  if (img2) {
    ctx.save();
    ctx.drawImage(img2, 540, 100);
    ctx.restore();
  }

  const buffer = canvas.toBuffer("image/png");
  const filename = `pvp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
  return { buffer, name: filename };
};

const simulatePvP = (p1, p2) => {
  let turn = 1;
  const maxTurns = 50;

  p1.effects = { armorReduced: 0, healReduced: false };
  p2.effects = { armorReduced: 0, healReduced: false };

  // Determine who goes first based on DEX. Higher DEX goes first. If equal, random.
  let p1Dex = p1.effectiveStats.dex || 0;
  let p2Dex = p2.effectiveStats.dex || 0;
  let turnOrder =
    p1Dex > p2Dex
      ? [p1, p2]
      : p1Dex < p2Dex
        ? [p2, p1]
        : Math.random() < 0.5
          ? [p1, p2]
          : [p2, p1];

  while (turn <= maxTurns && p1.hp > 0 && p2.hp > 0) {
    const attacker = turnOrder[0];
    const defender = turnOrder[1];

    const defenderEvasion = Math.min(
      0.15,
      (defender.effectiveStats.dex * 0.1 + defender.effectiveStats.arc * 0.05) /
        100,
    );
    const isEvaded = Math.random() < defenderEvasion;

    const attackerWeapon = attacker.weapon;
    const cleanSubType = attackerWeapon?.subType
      ? attackerWeapon.subType.toLowerCase().replace(/\s+/g, "")
      : "";
    const isDungeonWeapon = dungeonKeys.includes(cleanSubType);

    const hasTriggered = isDungeonWeapon && Math.random() < 0.45;
    let blueStaffPierce = false;
    let crimsonDaggerPierce = false;
    let holySwordDouble = false;

    if (hasTriggered) {
      if (cleanSubType === "shadowdagger") {
        defender.effects.armorReduced = 0.3;
      } else if (cleanSubType === "poisondagger") {
        attacker.nextAttackMult = 1.5;
      } else if (cleanSubType === "firesword") {
        defender.effects.healReduced = true;
      } else if (cleanSubType === "bluestaff") {
        blueStaffPierce = true;
      } else if (cleanSubType === "crimsondagger") {
        crimsonDaggerPierce = true;
      } else if (cleanSubType === "holysword") {
        attacker.holySwordHits = (attacker.holySwordHits || 0) + 1;
        if (attacker.holySwordHits >= 3) {
          attacker.holySwordHits = 0;
          holySwordDouble = true;
        }
      } else if (cleanSubType === "darksword") {
        defender.effects.damageReduced = 0.3;
      } else if (cleanSubType === "darkstaff") {
        const effects = ["burn", "weakness", "pierce"];
        const chosenEffect =
          effects[Math.floor(Math.random() * effects.length)];
        if (chosenEffect === "burn") {
          defender.effects.healReduced = true;
        } else if (chosenEffect === "weakness") {
          defender.effects.damageReduced = 0.3;
        } else {
          defender.effects.armorReduced = 0.3;
        }
      }
    } else if (cleanSubType === "holysword") {
      attacker.holySwordHits = (attacker.holySwordHits || 0) + 1;
      if (attacker.holySwordHits >= 3) {
        attacker.holySwordHits = 0;
      }
    }

    let poisonMult = 1.0;
    if (attacker.nextAttackMult) {
      poisonMult = attacker.nextAttackMult;
      delete attacker.nextAttackMult;
    }

    if (!isEvaded) {
      const classCritBonus = attacker.rpgClass.bonuses?.critRate || 0;
      const attackerCritRate = Math.min(
        0.5,
        (attacker.effectiveStats.arc * 0.2 +
          attacker.effectiveStats.dex * 0.1) /
          100 +
          classCritBonus,
      );
      const isCrit = Math.random() < attackerCritRate;
      const critMult = 1.5 + attacker.effectiveStats.dex * 0.002;

      const isMagical = CLASS_ATTACK_TYPES[attacker.classKey] === "magical";
      const baseAtk = isMagical
        ? attacker.effectiveStats.int * 3.5 + attacker.effectiveStats.arc * 1.5
        : attacker.effectiveStats.str * 2.5 + attacker.effectiveStats.dex * 1.5;

      let rawDamage = baseAtk + attacker.gearPower;
      rawDamage *= 0.85 + Math.random() * 0.3; // variance
      if (isCrit) {
        rawDamage *= critMult;
      }

      let defenderMitigation = 0;
      if (isMagical) {
        let mr =
          defender.effectiveStats.mr * 3.0 + (defender.defensePower || 0);
        if (blueStaffPierce) {
          mr *= 0.5;
        }
        defenderMitigation = mr / (mr + 1000);
      } else {
        let armor =
          defender.effectiveStats.pr * 3.0 + (defender.defensePower || 0);
        if (defender.effects.armorReduced) {
          armor *= 1 - defender.effects.armorReduced;
        }
        if (crimsonDaggerPierce) {
          armor *= 0.5;
        }
        defenderMitigation = armor / (armor + 1000);
      }

      const defenderPvpDefBonus = defender.rpgClass.bonuses?.pvpDefense || 0;
      let finalMult = (1 - defenderMitigation) * (1 - defenderPvpDefBonus);
      if (holySwordDouble) {
        finalMult *= 2.0;
      }
      if (poisonMult > 1.0) {
        finalMult *= poisonMult;
      }
      if (attacker.effects.damageReduced) {
        finalMult *= 1 - attacker.effects.damageReduced;
        delete attacker.effects.damageReduced; // consume
      }

      let damage = Math.max(5, Math.floor((rawDamage * finalMult) / 10));

      defender.hp = Math.max(0, defender.hp - damage);

      // Green Staff heal passive
      if (hasTriggered && cleanSubType === "greenstaff") {
        let healAmt = Math.floor(damage * 0.25);
        let healReduceFactor = 1.0;
        if (attacker.effects.healReduced) {
          healReduceFactor *= 0.5;
        }
        if (defender.rpgClass?.bonuses?.healReduction) {
          healReduceFactor *= 1 - defender.rpgClass.bonuses.healReduction;
        }
        healAmt = Math.floor(healAmt * healReduceFactor);
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
      }
    }

    if (defender.hp <= 0) {
      break;
    }

    turnOrder = [defender, attacker];
    turn += 1;
  }

  let winner,
    loser,
    isDraw = false;
  if (p1.hp <= 0) {
    winner = p2;
    loser = p1;
  } else if (p2.hp <= 0) {
    winner = p1;
    loser = p2;
  } else {
    isDraw = true;
  }

  return { winner, loser, isDraw, turns: turn - 1 };
};

module.exports = {
  name: "battle",
  aliases: ["b", "pvp", "arena"],
  description: "Khiêu chiến PvP với người chơi khác hoặc ngẫu nhiên.",
  usage: `${config.prefix}battle [@mention]`,
  examples: [
    {
      intent: "PVP ngẫu nhiên với người đã tạo class",
      command: `${config.prefix}battle`,
    },
    {
      intent: "Khiêu chiến một người chơi cụ thể",
      command: `${config.prefix}battle @Khang`,
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
          await updateQuestProgress(
            receiverId,
            "pvp_battle",
            1,
            message.channel,
          );
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

  const maxHp1 = 150 + stats1.vigor * 20 + user1.rpg.level * 20;
  const maxHp2 = 150 + stats2.vigor * 20 + user2.rpg.level * 20;

  // Retrieve actual user names from the client
  const u1Obj = await message.client.users.fetch(p1Id).catch(() => null);
  const u2Obj = await message.client.users.fetch(p2Id).catch(() => null);
  const p1Name =
    user1.rpg.name ||
    (u1Obj ? u1Obj.username : `Người chơi #${p1Id.slice(-4)}`);
  const p2Name =
    user2.rpg.name ||
    (u2Obj ? u2Obj.username : `Người chơi #${p2Id.slice(-4)}`);

  const equipped1 = getEquippedItems(user1);
  const equipped2 = getEquippedItems(user2);

  const getDefPower = (equipped) => {
    let def = 0;
    if (equipped.armor) def += equipped.armor.power || 0;
    if (equipped.helmet) def += equipped.helmet.power || 0;
    if (equipped.boots) def += equipped.boots.power || 0;
    return def;
  };

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
    defensePower: getDefPower(equipped1),
    dbUser: user1,
    weapon: equipped1.weapon,
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
    defensePower: getDefPower(equipped2),
    dbUser: user2,
    weapon: equipped2.weapon,
  };

  const result = simulatePvP(player1, player2);

  let winUser,
    loseUser,
    cokeWinner = 0,
    finalHp1 = 0,
    finalHp2 = 0;
  const isP1Winner = result.winner && result.winner.id === player1.id;

  if (result.isDraw) {
    addRpgExp(user1.rpg, 50);
    user1.rpg.power = calculateRpgPower(user1);
    user1.markModified("rpg");
    await user1.save();

    addRpgExp(user2.rpg, 50);
    user2.rpg.power = calculateRpgPower(user2);
    user2.markModified("rpg");
    await user2.save();

    const { updateQuestProgress } = require("../../utils/questUtil");
    await updateQuestProgress(p1Id, "exp_gain", 50, message.channel);
    await updateQuestProgress(p2Id, "exp_gain", 50, message.channel);

    finalHp1 = Math.max(1, player1.hp);
    finalHp2 = Math.max(1, player2.hp);
  } else {
    winUser = result.winner.dbUser;
    loseUser = result.loser.dbUser;

    winUser.rpg.pvpStreak = (winUser.rpg.pvpStreak || 0) + 1;
    loseUser.rpg.pvpStreak = 0;

    cokeWinner = 50 + Math.floor(Math.random() * 125);
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
    await updateQuestProgress(
      p1Id,
      "exp_gain",
      result.winner.id === p1Id ? 200 : 50,
      message.channel,
    );
    await updateQuestProgress(
      p2Id,
      "exp_gain",
      result.winner.id === p2Id ? 200 : 50,
      message.channel,
    );

    finalHp1 =
      result.winner.id === player1.id ? Math.max(1, result.winner.hp) : 0;
    finalHp2 =
      result.winner.id === player2.id ? Math.max(1, result.winner.hp) : 0;
  }

  const renderTextBar = (hp, max, power) => {
    const ratio = Math.max(0, Math.min(1, hp / max));
    const filled = Math.round(ratio * 10);
    const bar = "▰".repeat(filled) + "▱".repeat(10 - filled);
    return `${bar}\n${Math.max(0, hp).toLocaleString()} / ${max.toLocaleString()}\n⚔ Lực chiến: **${(power || 0).toLocaleString()}**`;
  };

  const showImage = !["text", "compact"].includes(
    user1.rpg?.settings?.battleDisplay,
  );

  // Start generating image in the background (asynchronously)
  const imgPromise = showImage
    ? generatePvPImage(
        player1.dbUser.rpg.characterAsset || player1.rpgClass.asset,
        player2.dbUser.rpg.characterAsset || player2.rpgClass.asset,
      ).catch((err) => {
        console.error("Failed to generate PvP image:", err);
        return null;
      })
    : Promise.resolve(null);

  // Reply instantly with Stage 1 text-only embed
  const initialEmbed = new EmbedBuilder()
    .setColor("#5865F2")
    .setDescription("⚔️ **Trận chiến đang diễn ra...**")
    .addFields(
      {
        name: `${player1.name} (${player1.classLabel})`,
        value: renderTextBar(maxHp1, maxHp1, player1.gearPower),
        inline: true,
      },
      {
        name: `${player2.name} (${player2.classLabel})`,
        value: renderTextBar(maxHp2, maxHp2, player2.gearPower),
        inline: true,
      },
    );

  let currentMsg;
  if (promptMessage && promptMessage.editable) {
    currentMsg = await promptMessage.edit({
      embeds: [initialEmbed],
      components: [],
    });
  } else {
    currentMsg = await message.reply({ embeds: [initialEmbed] });
  }

  // Sleep for 1500ms (let the background image generation run)
  if (showImage) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Await the image generation result
  const imgData = await imgPromise;

  let attachment = null;
  if (imgData) {
    attachment = new AttachmentBuilder(imgData.buffer, {
      name: imgData.name,
    });
  }

  // Stage 2: final result
  const finalEmbed = new EmbedBuilder()
    .setColor(result.isDraw ? "#F1C40F" : isP1Winner ? "#2ECC71" : "#E74C3C")
    .addFields(
      {
        name: `${player1.name} (${player1.classLabel})`,
        value: renderTextBar(finalHp1, maxHp1, player1.gearPower),
        inline: true,
      },
      {
        name: `${player2.name} (${player2.classLabel})`,
        value: renderTextBar(finalHp2, maxHp2, player2.gearPower),
        inline: true,
      },
    );

  if (imgData) {
    finalEmbed.setImage(`attachment://${imgData.name}`);
  }

  if (result.isDraw) {
    finalEmbed.setDescription(
      `**Hòa sau ${result.turns} lượt! | Cả hai nhận +50 XP | 🔥 Chuỗi thắng được giữ nguyên**`,
    );
  } else {
    const winText = isP1Winner ? "Chiến thắng" : "Thất bại";
    const xpGained = isP1Winner ? 200 : 50;
    const streak = isP1Winner ? winUser.rpg.pvpStreak : 0;
    finalEmbed.setDescription(
      `**${winText} trong ${result.turns} lượt! | +${xpGained} XP | +${isP1Winner ? cokeWinner : 0} Coke | 🔥 Chuỗi thắng: ${streak}**`,
    );
  }

  const editPayload = { embeds: [finalEmbed] };
  if (attachment) {
    editPayload.files = [attachment];
  }
  await currentMsg.edit(editPayload).catch(() => {});
};
