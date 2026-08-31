const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const User = require("../../../models/User");
const { calculateRpgPower, getRpgClass, getEquippedItems, getEquippedPet } = require("../../../utils/rpgUtil");

const runPvPBattle = async (message, promptMessage, user1OrId, user2OrId) => {
  const getUserId = (val) => (typeof val === "object" && val !== null ? val.userId : val);
  const user1 = typeof user1OrId === "object" && typeof user1OrId.save === "function" ? user1OrId : await User.findOne({ userId: getUserId(user1OrId) });
  const user2 = typeof user2OrId === "object" && typeof user2OrId.save === "function" ? user2OrId : await User.findOne({ userId: getUserId(user2OrId) });

  const p1Id = user1.userId;
  const p2Id = user2.userId;

  const class1 = getRpgClass(user1.rpg.classKey);
  const class2 = getRpgClass(user2.rpg.classKey);

  let p1Name = user1.rpg?.name || message.client.users.cache.get(p1Id)?.username || message.author.displayName || message.author.username;
  let p2Name = user2.rpg?.name || message.client.users.cache.get(p2Id)?.username || `Người chơi #${p2Id.slice(-4)}`;

  const equipped1 = getEquippedItems(user1);
  const equipped2 = getEquippedItems(user2);

  const { simulateBattle, renderPvPImage, processRewards } = require("../../../rpg/battle");

  const result = simulateBattle(user1, user2, { maxTurns: 30 });

  const rewards = await processRewards(user1, user2, result, {
    isTargeted: !!promptMessage,
    channel: message.channel,
  });

  const { updateQuestProgress } = require("../../../utils/questUtil");
  const isP1Winner = result.winner && result.winner.id === user1.userId;
  const questPromises = [
    updateQuestProgress(user1, "pvp_battle", 1, message.channel),
    updateQuestProgress(user2, "pvp_battle", 1, message.channel),
  ];
  if (!result.isDraw && result.winner) {
    if (isP1Winner) {
      questPromises.push(updateQuestProgress(user1, "pvp_win", 1, message.channel));
    } else {
      questPromises.push(updateQuestProgress(user2, "pvp_win", 1, message.channel));
    }
  }
  await Promise.all(questPromises);

  const battleDisplay = user1.rpg?.settings?.battleDisplay || "image";
  const battleSpeed = user1.rpg?.settings?.battleSpeed || "instant";
  const battleLogs = user1.rpg?.settings?.battleLogs || "false";
  const showImage = !["text", "compact"].includes(battleDisplay);

  const memberName = message.member?.displayName || message.author.displayName || message.author.username;
  const authorAvatar = message.author.displayAvatarURL({ dynamic: true, extension: "png", size: 256 });
  const weapon1Emoji = equipped1.weapon?.emoji ? ` ${equipped1.weapon.emoji}` : "";
  const weapon2Emoji = equipped2.weapon?.emoji ? ` ${equipped2.weapon.emoji}` : "";

  let footerText = "";
  if (result.isDraw) {
    footerText = `Hòa sau ${result.turns} lượt! | Cả hai nhận +50 XP | Chuỗi thắng giữ nguyên${rewards.petFooterInfo || ""}`;
  } else {
    const winText = isP1Winner ? "Chiến thắng" : "Thất bại";
    const xpGained = isP1Winner ? 200 : 50;
    const isTargeted = !!promptMessage;
    let streakText = isTargeted ? "Không tính chuỗi" : `Chuỗi thắng: ${isP1Winner ? user1.rpg.pvpStreak : 0}`;
    footerText = `${winText} trong ${result.turns} lượt! | +${xpGained} XP | ${streakText}${rewards.petFooterInfo || ""}`;
  }

  const finalEmbed = new EmbedBuilder()
    .setColor(result.isDraw ? "#F1C40F" : isP1Winner ? "#2ECC71" : "#E74C3C")
    .setAuthor({
      name: `${memberName} Đang chiến đấu!`,
      iconURL: authorAvatar,
    })
    const class1Name = class1?.name || user1.rpg?.classKey || "Chiến binh";
    const class2Name = class2?.name || user2.rpg?.classKey || "Chiến binh";

    finalEmbed.addFields(
      {
        name: `${p1Name}${weapon1Emoji} (${class1Name})`,
        value: `LV. **${user1.rpg.level}**\n⚔ Lực chiến: **${Math.floor(calculateRpgPower(user1)).toLocaleString()}**`,
        inline: true,
      },
      {
        name: `${p2Name}${weapon2Emoji} (${class2Name})`,
        value: `LV. **${user2.rpg.level}**\n⚔ Lực chiến: **${Math.floor(calculateRpgPower(user2)).toLocaleString()}**`,
        inline: true,
      }
    );

  if (battleLogs === "true" && result.logs && result.logs.length > 0) {
    const logSnippet = result.logs.slice(-8).join("\n");
    finalEmbed.addFields({
      name: "📜 Nhật ký trận đấu",
      value: logSnippet.length > 1024 ? logSnippet.substring(0, 1021) + "..." : logSnippet,
      inline: false,
    });
  } else if (battleLogs === "link" && result.logs && result.logs.length > 0) {
    finalEmbed.addFields({
      name: "📜 Nhật ký trận đấu",
      value: `*Trận đấu diễn ra trong ${result.turns} lượt.*`,
      inline: false,
    });
  }

  const getActiveStatusEmojis = (effects) => {
    if (!effects) return "";
    const list = [];
    if (effects.bleedRounds > 0) list.push("<:bleed:1521938497642958889>");
    if (effects.healReduced) list.push("<:healreduction:1523340558855045190>");
    if (effects.armorReduced > 0) list.push("<:break:1521938480337391736>");
    if (effects.armorBoosted > 0) list.push("<:atkup:1521938477359300648>");
    return list.length > 0 ? " " + list.join(" ") : "";
  };

  const pet1 = getEquippedPet(user1);
  const pet2 = getEquippedPet(user2);

  if (showImage && result.history && result.history.length > 0) {
    const history = result.history;
    const totalStates = history.length;
    let indices = [totalStates - 1];
    if (battleSpeed === "short") {
      indices = totalStates > 1 ? [0, totalStates - 1] : [0];
    } else if (battleSpeed === "lengthy") {
      const mid1Index = Math.max(1, Math.min(totalStates - 2, Math.floor(totalStates * 0.33)));
      const mid2Index = Math.max(mid1Index + 1, Math.min(totalStates - 2, Math.floor(totalStates * 0.66)));
      indices = [0];
      if (totalStates > 2) indices.push(mid1Index);
      if (totalStates > 3) indices.push(mid2Index);
      indices.push(totalStates - 1);
    }

    let activeMessage = promptMessage;
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const state = history[idx];
      const isFinalFrame = i === indices.length - 1;
      let finalStatus = isFinalFrame ? (result.isDraw ? "timeout" : "ko") : null;

      const imgData = await renderPvPImage(
        user1,
        user2,
        state.p1.hp,
        result.p1.maxHp,
        state.p1.rage || 0,
        pet1,
        state.p1.effects,
        state.p2.hp,
        result.p2.maxHp,
        state.p2.rage || 0,
        pet2,
        state.p2.effects,
        finalStatus
      ).catch((err) => {
        console.error("Failed to render PvP image:", err);
        return null;
      });

      if (imgData) {
        const attachment = new AttachmentBuilder(imgData.buffer, { name: imgData.name });
        const p1Status = getActiveStatusEmojis(state.p1.effects);
        const p2Status = getActiveStatusEmojis(state.p2.effects);
        const currentEmbed = EmbedBuilder.from(finalEmbed)
          .setImage(`attachment://${imgData.name}`)
          .setFields([
            {
              name: `${p1Name}${weapon1Emoji} (${class1.name})${p1Status}`,
              value: `LV. **${user1.rpg.level}**\n⚔ Lực chiến: **${Math.floor(calculateRpgPower(user1)).toLocaleString()}**`,
              inline: true,
            },
            {
              name: `${p2Name}${weapon2Emoji} (${class2.name})${p2Status}`,
              value: `LV. **${user2.rpg.level}**\n⚔ Lực chiến: **${Math.floor(calculateRpgPower(user2)).toLocaleString()}**`,
              inline: true,
            },
          ]);

        if (battleLogs === "true" && result.logs && result.logs.length > 0) {
          const logSnippet = result.logs.slice(-8).join("\n");
          currentEmbed.addFields({
            name: "📜 Nhật ký trận đấu",
            value: logSnippet.length > 1024 ? logSnippet.substring(0, 1021) + "..." : logSnippet,
            inline: false,
          });
        }

        if (isFinalFrame) {
          currentEmbed.setFooter({ text: footerText });
        } else {
          currentEmbed.setFooter({ text: `Đang chiến đấu... Lượt ${state.turn}/${result.turns}` });
        }

        const payload = { embeds: [currentEmbed], files: [attachment], skipV2: true };
        if (activeMessage && activeMessage.editable) {
          const edited = await activeMessage.edit({ ...payload, components: [] }).catch((err) => {
            console.error("[PVP_BATTLE] Error editing activeMessage:", err);
            return null;
          });
          if (!edited) {
            activeMessage = await message.channel.send(payload).catch(() => null);
          }
        } else {
          activeMessage = await message.channel.send(payload).catch(() => null);
        }
      }

      if (i < indices.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  } else {
    const finalEmbedWithFooter = EmbedBuilder.from(finalEmbed).setFooter({ text: footerText });
    if (promptMessage && promptMessage.editable) {
      const edited = await promptMessage.edit({ embeds: [finalEmbedWithFooter], components: [], skipV2: true }).catch((err) => {
        console.error("[PVP_BATTLE] Error editing promptMessage:", err);
        return null;
      });
      if (!edited) {
        await message.channel.send({ embeds: [finalEmbedWithFooter], skipV2: true }).catch(() => {});
      }
    } else {
      await message.channel.send({ embeds: [finalEmbedWithFooter], skipV2: true }).catch(() => {});
    }
  }
};

module.exports = runPvPBattle;
