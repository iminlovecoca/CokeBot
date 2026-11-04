const BaseCommand = require("../../../core/BaseCommand");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const { handleWeaponSacrifice } = require("../pet/sacrifice");

class DismantleCommand extends BaseCommand {
  constructor() {
    super({
      name: "dismantle",
      aliases: ["tachvk", "phahuy", "hienlinhvk", "dis"],
      description: "Tháo dỡ / hiến tế vũ khí RPG để nhận Linh Hồn (Soul).",
      usage: `${config.prefix}dismantle <cw | rw | ew | mw | lw | aw | dw | allw | w<id>>`,
      examples: [
        { intent: "Hiến tế vũ khí Common lấy Linh Hồn", command: `${config.prefix}dismantle cw` },
        { intent: "Hiến tế vũ khí Rare lấy Linh Hồn", command: `${config.prefix}dismantle rw` },
        { intent: "Hiến tế tất cả vũ khí thường lấy Linh Hồn", command: `${config.prefix}dismantle allw` },
        { intent: "Hiến tế vũ khí theo mã ID", command: `${config.prefix}dismantle w5` },
      ],
      cooldown: 2,
    });
  }

  async execute(message, args = []) {
    const displayName = message.member?.displayName || message.author.username;
    const soulEmoji = "<:souls:1518749776538243082>";

    if (!args[0]) {
      return message.reply(
        `🔨 | **${displayName}**, vui lòng chỉ định rank hoặc mã vũ khí cần hiến tế lấy Linh Hồn ${soulEmoji}!\n` +
          `• Cú pháp: \`${config.prefix}dismantle <cw | rw | ew | mw | lw | aw | dw | allw | w<id>>\`\n` +
          `• Ví dụ:\n` +
          `  - \`${config.prefix}dismantle cw\` (hiến tế toàn bộ vũ khí Common)\n` +
          `  - \`${config.prefix}dismantle rw\` (hiến tế toàn bộ vũ khí Rare)\n` +
          `  - \`${config.prefix}dismantle allw\` (hiến tế tất cả vũ khí thường)\n` +
          `  - \`${config.prefix}dismantle w5\` (hiến tế vũ khí mã số #5)\n\n` +
          `• **Định mức Linh Hồn cố định theo bậc:**\n` +
          `  Common: **1** • Rare: **5** • Epic: **25** • Mythic: **300** • Legendary: **1.000** • Ancient: **5.000** • Divine: **10.000** Linh Hồn.`
      );
    }

    const user = await getUser(message.author.id);
    return handleWeaponSacrifice(message, args, user, displayName);
  }
}

module.exports = new DismantleCommand();
