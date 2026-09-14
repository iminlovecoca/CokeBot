const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../../data/config");
const User = require("../../../models/User");
const { getRankConfig } = require("../../../utils/rankFrameUtil");
const { getRpgColor, formatRpgFooter, formatRpgTitle } = require("../../../utils/rpgUi");

class BattleRankCommand extends BaseCommand {
  constructor() {
    super({
      name: "battlerank",
      aliases: ["brank", "rankpvp", "lprank"],
      description: "🏆 Xem thông tin Bậc Rank Battle, LP và Bảng xếp hạng mùa giải.",
      usage: `${config.prefix}battlerank [top]`,
      examples: [
        { intent: "Xem rank Battle của bạn", command: `${config.prefix}battlerank` },
        { intent: "Xem bảng xếp hạng rank Battle", command: `${config.prefix}battlerank top` }
      ],
      category: "rpg"
    });
  }

  async execute(message, args, client, locator) {
    const sub = (args[0] || "").toLowerCase();

    // A rank command is also a safe catch-up point when midnight was missed
    // during a restart or short outage. The service still owns the Mongo lock
    // and remains idempotent across scheduler workers.
    const seasonService = locator?.get("battleSeasonService");
    await seasonService?.resetIfDue(new Date()).catch((error) => {
      console.error("[BATTLE_SEASON] On-demand catch-up failed:", error);
    });

    if (sub === "top" || sub === "lb") {
      const rankIndexMap = {
        divine: 7,
        ancient: 6,
        mythic: 5,
        legendary: 4,
        epic: 3,
        rare: 2,
        common: 1,
        unranked: 0
      };

      const allCandidates = await User.find({
        isBattleBot: { $ne: true },
        "rpg.battleRank": { $exists: true }
      })
        .lean()
        .exec();

      allCandidates.sort((a, b) => {
        const aRankIdx = rankIndexMap[(a.rpg?.battleRank || "unranked").toLowerCase()] || 0;
        const bRankIdx = rankIndexMap[(b.rpg?.battleRank || "unranked").toLowerCase()] || 0;

        if (bRankIdx !== aRankIdx) {
          return bRankIdx - aRankIdx; // Higher Rank Tier first!
        }

        const aLp = a.rpg?.battleLp || 0;
        const bLp = b.rpg?.battleLp || 0;

        if (bLp !== aLp) {
          return bLp - aLp; // Higher LP within same rank tier first!
        }

        return (b.rpg?.seasonWins || 0) - (a.rpg?.seasonWins || 0);
      });

      const topRankers = allCandidates.slice(0, 10);

      let desc = "";
      topRankers.forEach((u, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `\`#${i + 1}\``;
        const bRank = u.rpg?.battleRank || "Unranked";
        const rConfig = getRankConfig(bRank);
        const emoji = rConfig.emoji ? `${rConfig.emoji} ` : "";
        const name = u.rpg?.name || `User #${(u.userId || "").slice(-4)}`;
        const lp = u.rpg?.battleLp || 0;
        const wins = u.rpg?.seasonWins || 0;
        const losses = u.rpg?.seasonLosses || 0;
        desc += `${medal} **${name}** — ${emoji}**${bRank}** (\`${lp} LP\` | ⚔️ Win: ${wins}/${wins + losses})\n`;
      });

      const embed = new EmbedBuilder()
        .setColor(getRpgColor("reward"))
        .setTitle(formatRpgTitle("Bảng xếp hạng Battle • Mùa giải", "🏆"))
        .setDescription(desc || "Chưa có người chơi nào tham gia leo rank mùa này.")
        .setFooter(formatRpgFooter("Top 10 • mùa giải reset mỗi 30 ngày"));

      return message.reply({ embeds: [embed] });
    }

    const userService = locator.get("userService");
    const userData = await userService.getUser(message.author.id);

    const bRank = userData.rpg?.battleRank || "Unranked";
    const bLp = userData.rpg?.battleLp || 0;
    const wins = userData.rpg?.seasonWins || 0;
    const losses = userData.rpg?.seasonLosses || 0;
    const total = wins + losses;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";

    const rConfig = getRankConfig(bRank);
    const emojiStr = rConfig.emoji ? `${rConfig.emoji} ` : "";

    const isDivineRank = (bRank || '').toLowerCase() === 'divine';
    const lpDisplay = isDivineRank ? `**${bLp}** LP *(Unlimited LP)*` : `**${bLp}** / 100 LP`;

    const lpBarLength = 10;
    const filled = isDivineRank ? 10 : Math.min(10, Math.floor(bLp / 10));
    const empty = 10 - filled;
    const lpBar = "▰".repeat(filled) + "▱".repeat(empty);

    const previousRank = userData.rpg?.lastBattleSeasonRank;
    const previousReward = userData.rpg?.lastBattleSeasonReward;
    const previousHonorSkins = Array.isArray(previousReward?.honorSkins)
      ? previousReward.honorSkins
      : (previousReward?.honorSkin ? [previousReward.honorSkin] : []);
    const previousSeasonField = previousRank
      ? {
          name: "Mùa giải trước",
          value: `${previousRank}${previousHonorSkins.length ? ` • 🏆 ${previousHonorSkins.join(", ")}` : ""}\n` +
            `Thưởng: **${(previousReward?.coke || 0).toLocaleString()} Coke**` +
            (previousReward?.wc ? ` • **${previousReward.wc} Hộp Vũ Khí**` : ""),
          inline: false,
        }
      : null;

    const embed = new EmbedBuilder()
      .setColor(rConfig.borderColor1 && rConfig.borderColor1 !== "transparent" ? rConfig.borderColor1 : "#3498DB")
      .setTitle(formatRpgTitle(`Hồ sơ leo rank PvP • ${message.author.username}`, "🏆"))
      .setDescription(`Mục tiêu tiếp theo: ${isDivineRank ? "giữ vị trí Top 1 server" : "đạt 100 LP để thăng hạng"}.`)
      .addFields(
        { name: "Bậc rank hiện tại", value: `${emojiStr}**${bRank}**`, inline: true },
        { name: "LP mùa giải", value: `${lpDisplay}\n\`${lpBar}\``, inline: true },
        { name: "Thành tích", value: `**${wins}** thắng • **${losses}** thua\nTỉ lệ thắng: **${winRate}%**`, inline: false },
        ...(previousSeasonField ? [previousSeasonField] : []),
      )
      .setFooter(formatRpgFooter(isDivineRank ? "Divine tích lũy LP không giới hạn" : "Đủ 100 LP để thăng hạng"));

    return message.reply({ embeds: [embed] });
  }
}

module.exports = new BattleRankCommand();
