const BaseCommand = require("../../../core/BaseCommand");
const config = require("../../../data/config");
const User = require("../../../models/User");
const { checkAndSetCooldown, notifyCooldown } = require("../../../utils/cooldown");
const { requireRpgCharacter } = require("../../../utils/rpgUtil");

const runPvPBattle = require("./runPvPBattle");
const {
  pendingChallenges,
  findUserChallenge,
  sendChallenge,
  handleAcceptChallenge,
  handleDeclineChallenge,
} = require("./challengeManager");

class BattleCommand extends BaseCommand {
  constructor() {
    super({
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
      cooldown: 0,
    });
  }

  async execute(message, args = []) {
    const senderId = message.author.id;

    const firstArg = (args[0] || "").toLowerCase();
    if (["accept", "ab"].includes(firstArg)) {
      return handleAcceptChallenge(message);
    }
    if (["decline", "db"].includes(firstArg)) {
      return handleDeclineChallenge(message);
    }

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

    if (senderUser.rpg?.godsetBackup) {
      return message.reply(
        `${config.emoji.no} Bạn không thể tham gia PvP lúc này.`,
      );
    }

    if (targetMention) {
      const receiverId = targetMention.id;
      if (receiverId === senderId) {
        return message.reply(
          `${config.emoji.no} Bạn không thể tự chiến đấu với chính mình!`,
        );
      }
      if (targetMention.bot) {
        return message.reply(
          `${config.emoji.no} Bạn không thể khiêu chiến với Bot!`,
        );
      }

      const senderActive = findUserChallenge(senderId);
      if (senderActive) {
        return message.reply(
          `${config.emoji.no} Bạn đang trong một lời khiêu chiến chưa hoàn tất. Hãy từ chối (\`${config.prefix}db\`) hoặc chờ hết hạn trước khi khiêu chiến người khác.`,
        );
      }

      const targetActive = findUserChallenge(receiverId);
      if (targetActive) {
        return message.reply(
          `${config.emoji.no} <@${receiverId}> hiện đang trong một lời khiêu chiến khác chưa hoàn tất!`,
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

      const hiddenBattleIds = config.permissions?.hidden_battle_ids || [];
      const { isDev } = require("../../../utils/userUtil");
      const isTargetHidden = hiddenBattleIds.includes(receiverId) || receiverUser.rpg?.hiddenFromBattle;
      if (isTargetHidden && senderId !== receiverId && !isDev(senderId)) {
        return message.reply(
          `${config.emoji.no} Không tìm thấy người chơi này!`,
        );
      }

      if (receiverUser.rpg?.godsetBackup) {
        return message.reply(
          `${config.emoji.no} Đối phương không thể tham gia PvP lúc này.`,
        );
      }

      return sendChallenge(
        message,
        senderId,
        receiverId,
        targetMention,
        senderUser,
        receiverUser,
        senderClass,
        receiverClass
      );
    }

    const senderRank = senderUser.rpg?.battleRank || "Common";
    const senderLvl = senderUser.rpg?.level || senderUser.level || 1;
    const RANK_TIERS = ["Common", "Rare", "Epic", "Legendary", "Mythic", "Ancient", "Divine"];

    let currentRankIdx = RANK_TIERS.findIndex(r => r.toLowerCase() === senderRank.toLowerCase());
    if (currentRankIdx === -1) currentRankIdx = 0;

    // Allowed matched ranks: same rank preferred, or adjacent ±1 rank
    const primaryRanks = [RANK_TIERS[currentRankIdx]];
    const expandedRanks = Array.from(new Set([
      RANK_TIERS[Math.max(0, currentRankIdx - 1)],
      RANK_TIERS[currentRankIdx],
      RANK_TIERS[Math.min(RANK_TIERS.length - 1, currentRankIdx + 1)]
    ]));

    // Small chance (15%) to encounter higher rank players/bots for a challenging fight
    const isChallengerEncounter = Math.random() < 0.15 && currentRankIdx < RANK_TIERS.length - 1;
    let targetRanks = expandedRanks;
    if (isChallengerEncounter) {
      const higherRankIdx1 = Math.min(RANK_TIERS.length - 1, currentRankIdx + 1);
      const higherRankIdx2 = Math.min(RANK_TIERS.length - 1, currentRankIdx + 2);
      targetRanks = Array.from(new Set([RANK_TIERS[higherRankIdx1], RANK_TIERS[higherRankIdx2]]));
    }

    const hiddenBattleIds = config.permissions?.hidden_battle_ids || [];
    const excludedIds = Array.from(new Set([senderId, ...hiddenBattleIds]));

    // Matchmaking Pipeline:
    // 1. Try to match real players in target rank tier (70% preference)
    // 2. If no real players or random roll, match Bot NPC OF TARGET RANK TIER
    let matchedOpponent = null;
    const shouldTryRealPlayerFirst = Math.random() < 0.70;

    if (shouldTryRealPlayerFirst) {
      const realPlayers = await User.aggregate([
        {
          $match: {
            "rpg.classKey": { $ne: null },
            userId: { $nin: excludedIds },
            isBattleBot: { $ne: true },
            "rpg.godsetBackup": null,
            "rpg.hiddenFromBattle": { $ne: true },
            $or: [
              { "rpg.battleRank": { $in: targetRanks } },
              { "rpg.level": { $gte: Math.max(1, senderLvl - 20), $lte: senderLvl + (isChallengerEncounter ? 35 : 20) } }
            ]
          }
        },
        { $sample: { size: 1 } }
      ]).catch(() => []);

      if (realPlayers.length > 0) {
        matchedOpponent = realPlayers[0];
      }
    }

    // If no real player matched yet, pick a Bot NPC of the TARGET RANK TIER
    if (!matchedOpponent) {
      // Single aggregate over the union of target + expanded ranks (avoids 2 sequential queries)
      const botRanks = Array.from(new Set([...targetRanks, ...expandedRanks]));
      const botMatch = await User.aggregate([
        {
          $match: {
            isBattleBot: true,
            "rpg.battleRank": { $in: botRanks },
            userId: { $nin: excludedIds }
          }
        },
        { $sample: { size: 1 } }
      ]).catch(() => []);
      if (botMatch.length > 0) matchedOpponent = botMatch[0];
    }

    // Final fallback if all above failed
    if (!matchedOpponent) {
      const fallback = await User.aggregate([
        {
          $match: {
            "rpg.classKey": { $ne: null },
            userId: { $nin: excludedIds },
            "rpg.godsetBackup": null,
            "rpg.hiddenFromBattle": { $ne: true }
          }
        },
        { $sample: { size: 1 } }
      ]).catch(() => []);
      if (fallback.length > 0) matchedOpponent = fallback[0];
    }

    if (!matchedOpponent) {
      return message.reply(
        `${config.emoji.no} Không tìm thấy đối thủ nào phù hợp trong bậc rank của bạn để thách đấu.`
      );
    }

    return runPvPBattle(message, null, senderUser, matchedOpponent);
  }
}

module.exports = new BattleCommand();
module.exports.pendingChallenges = pendingChallenges;
module.exports.handleAcceptChallenge = handleAcceptChallenge;
module.exports.handleDeclineChallenge = handleDeclineChallenge;