const { UserFriendlyError } = require("../../utils/errors");
const { isDev, isAdmin } = require("../../utils/userUtil");
const config = require("../../data/config");
const { spawnRandomBoss } = require("../../features/rpgBossSpawner");

module.exports = {
  name: "spawnhex",
  aliases: ["shex"],
  description: "Triệu hồi Boss sự kiện Hex (hexia hoặc godhexa) ngay lập tức.",
  usage: `${config.prefix}spawnhex <hexia|godhexa>`,

  async execute(message, args) {
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không có quyền dùng lệnh này.`,
      );
    }

    const bossKey = args[0]?.toLowerCase();
    if (bossKey !== "hexia" && bossKey !== "godhexa") {
      throw new UserFriendlyError(
        `${config.emoji.no} Vui lòng chọn loại boss hợp lệ: \`hexia\` hoặc \`godhexa\`. Ví dụ: \`${config.prefix}spawnhex hexia\``
      );
    }

    // Call spawnRandomBoss with allowSoulRealm: false
    const activeBoss = await spawnRandomBoss(message.client, {
      channelId: message.channel.id,
      bossKey: bossKey,
      scheduleNext: false,
      allowSoulRealm: false
    });

    if (!activeBoss) {
      return message.reply(
        `${config.emoji.warning} Không thể spawn boss ở channel này, có thể đã có boss hoặc channel không hợp lệ.`,
      );
    }

    // Send entrance dialogue
    if (bossKey === "hexia") {
      await message.channel.send("🟣 **[Cảnh Báo Sự Kiện Hex]** Bầu trời rách đôi! Ma lực cổ xưa trỗi dậy...\n🔥 **HEXIA** đã xuất hiện!");
    } else if (bossKey === "godhexa") {
      await message.channel.send("🟣 **[Cảnh Báo Sự Kiện Hex]** Vạn vật run rẩy, ánh sáng bị nuốt chửng...\n👑 **GODHEXA** giáng lâm thế giới!");
    }

    return message.reply(
      `🟣 Boss sự kiện **${activeBoss.boss.name}** (${activeBoss.boss.key}) đã được triệu hồi thành công!`
    );
  },
};
