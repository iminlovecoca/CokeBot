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

    const hiddenBattleIds = config.permissions?.hidden_battle_ids || [];
    const excludedIds = Array.from(new Set([senderId, ...hiddenBattleIds]));
    const opponents = await User.aggregate([
      {
        $match: {
          "rpg.classKey": { $ne: null },
          userId: { $nin: excludedIds },
          "rpg.godsetBackup": null,
          "rpg.hiddenFromBattle": { $ne: true },
        },
      },
      { $sample: { size: 1 } },
    ]).catch(() => []);

    if (!opponents || opponents.length === 0) {
      return message.reply(
        `${config.emoji.no} Không tìm thấy người chơi nào khác có nhân vật RPG trong dữ liệu game để thách đấu.`,
      );
    }

    const randomOpponent = opponents[0];
    return runPvPBattle(message, null, senderUser, randomOpponent);
  }
}

module.exports = new BattleCommand();
module.exports.pendingChallenges = pendingChallenges;
module.exports.handleAcceptChallenge = handleAcceptChallenge;
module.exports.handleDeclineChallenge = handleDeclineChallenge;