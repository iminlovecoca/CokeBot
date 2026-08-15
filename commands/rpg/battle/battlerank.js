const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../../data/config");
const User = require("../../../models/User");
const { getRankConfig } = require("../../../utils/rankFrameUtil");

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

    if (sub === "top" || sub === "lb") {
      const topRankers = await User.find({
        isBattleBot: { $ne: true },
        "rpg.battleRank": { $exists: true }
      })
        .sort({ "rpg.battleLp": -1, "rpg.seasonWins": -1 })
        .limit(10)
        .lean()
        .exec();

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
        .setColor("#FFD700")
        .setTitle("🏆 BẢNG XẾP HẠNG BATTLE RANK MÙA GIẢI")
        .setDescription(desc || "Chưa có người chơi nào tham gia leo rank mùa này.")
        .setFooter({ text: "Mùa giải reset mỗi 30 ngày | Hãy tham gia PvP Battle để leo rank!" });

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

    const embed = new EmbedBuilder()
      .setColor(rConfig.borderColor1 && rConfig.borderColor1 !== "transparent" ? rConfig.borderColor1 : "#3498DB")
      .setAuthor({
        name: `Hồ sơ Leo Rank PvP — ${message.author.username}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .addFields(
        { name: "🛡️ Bậc Rank Hiện Tại", value: `${emojiStr}**${bRank}**`, inline: true },
        { name: "📊 Điểm LP Mùa Giải", value: `${lpDisplay}\n\`${lpBar}\``, inline: true },
        { name: "⚔️ Tỉ Lệ Thắng", value: `**${wins}** Thắng / **${losses}** Thua (**${winRate}%**)`, inline: false }
      )
      .setFooter({ text: isDivineRank ? "Bậc Divine tích lũy LP không giới hạn để tranh Top 1 Server!" : "Thắng đối thủ cao bậc hơn nhận +3 đến +4 LP! Đủ 100 LP sẽ Thăng Hạng!" });

    return message.reply({ embeds: [embed] });
  }
}

module.exports = new BattleRankCommand();
