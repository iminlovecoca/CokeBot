const { UserFriendlyError } = require("../../../utils/errors");
const { isDev, isAdmin } = require("../../../utils/userUtil");
const config = require("../../../data/config");
const { EmbedBuilder } = require("discord.js");
const { getWorldBossCombatProfile } = require("../../../utils/worldBossBalanceUtil");
const BaseCommand = require("../../../core/BaseCommand");
class BosslistCommand extends BaseCommand {
  constructor() {
    super({
  name: "bosslist",
  aliases: ["listboss", "listbosses", "bosskeys"],
  description: "Xem danh sách tên boss và key để spawn.",
  hidden: true,
        cooldown: 0
    });
  }
  async execute(message, args) {
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không có quyền dùng lệnh này.`,
      );
    }
    const bossTiers = config.rpg.boss?.tiers || [];
    if (!bossTiers.length) {
      return message.reply("Không tìm thấy cấu hình boss nào trong file config.");
    }
    const listLines = bossTiers.map((baseBoss) => {
      const boss = getWorldBossCombatProfile(baseBoss);
      const bossRank = config.rpg.boss?.bossRankRewards?.[boss.rank]?.label || "Thường";
      return `• **${boss.name}**\n  - Key: \`${boss.key}\`\n  - Rank: **${bossRank}**\n  - HP: **${boss.hp.toLocaleString()}** | Lực chiến gợi ý: **${boss.recommended_power.toLocaleString()}**`;
    });
    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("📋 Danh Sách Boss & Keys")
      .setDescription(listLines.join("\n\n"));
    return message.reply({ embeds: [embed] });
    }
}
module.exports = new BosslistCommand();