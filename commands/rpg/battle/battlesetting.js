const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../../data/config");
const { requireRpgCharacter } = require("../../../utils/rpgUtil");
const { getRpgColor, formatRpgFooter, formatRpgTitle } = require("../../../utils/rpgUi");
class BattlesettingCommand extends BaseCommand {
  constructor() {
    super({
      name: "battlesetting",
      aliases: ["bs"],
      description: "Cài đặt hiển thị ảnh trận đấu và cấu hình PvP (battle).",
      usage: `${config.prefix}battlesetting display=image/text/compact`,
      examples: [
        { intent: "Bật hiển thị hình ảnh trận đấu", command: `${config.prefix}bs display=image` },
        { intent: "Tắt hiển thị hình ảnh trận đấu (chỉ hiện chữ)", command: `${config.prefix}bs display=text` },
        { intent: "Cài đặt tốc độ trận đấu tức thì", command: `${config.prefix}bs speed=instant` },
      ],
      cooldown: 0
    });
  }
  async execute(message, args = []) {
    let user;
    try {
      const res = await requireRpgCharacter(message.author.id);
      user = res.user;
    } catch {
      return message.reply(
        `${config.emoji.warning} Bạn chưa tạo nhân vật RPG. Hãy gõ \`${config.prefix}class\` để tạo nhân vật trước khi cài đặt.`,
      );
    }
    if (!user.rpg.settings) {
      user.rpg.settings = {
        battleDisplay: "image",
        battleSpeed: "instant",
        battleLogs: "false"
      };
    }
    const currentDisplay = user.rpg.settings.battleDisplay || "image";
    const currentSpeed = user.rpg.settings.battleSpeed || "instant";
    const currentLogs = user.rpg.settings.battleLogs || "false";
    if (args.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(getRpgColor("brand"))
        .setTitle(formatRpgTitle(`Cài đặt trận đấu • ${message.author.username}`, "⚙️"))
        .setDescription(`Dùng \`${config.prefix}bs display=...\`, \`${config.prefix}bs speed=...\` hoặc \`${config.prefix}bs logs=...\` để thay đổi.`)
        .addFields(
          { name: "🖼️ Hiển thị", value: `Đang dùng: **${currentDisplay}**\nimage · text · compact`, inline: true },
          { name: "⏱️ Tốc độ", value: `Đang dùng: **${currentSpeed}**\ninstant · short · lengthy`, inline: true },
          { name: "📜 Nhật ký", value: `Đang dùng: **${currentLogs}**\ntrue · false · link`, inline: true },
        )
        .setFooter(formatRpgFooter("Cài đặt chỉ áp dụng cho trận PvP của bạn"));
      return message.reply({ embeds: [embed] });
    }
    const input = args.join(" ").toLowerCase().trim();
    let updatedField = null;
    let newValue = null;
    if (input.includes("display=")) {
      const val = input.split("display=")[1].trim();
      if (["image", "text", "compact"].includes(val)) {
        updatedField = "battleDisplay";
        newValue = val;
      }
    } else if (["image", "text", "compact"].includes(input)) {
      updatedField = "battleDisplay";
      newValue = input;
    } else if (input.includes("speed=")) {
      const val = input.split("speed=")[1].trim();
      if (["instant", "short", "lengthy"].includes(val)) {
        updatedField = "battleSpeed";
        newValue = val;
      }
    } else if (["instant", "short", "lengthy"].includes(input)) {
      updatedField = "battleSpeed";
      newValue = input;
    } else if (input.includes("logs=")) {
      const val = input.split("logs=")[1].trim();
      if (["true", "false", "link"].includes(val)) {
        updatedField = "battleLogs";
        newValue = val;
      }
    } else if (["true", "false", "link"].includes(input)) {
      updatedField = "battleLogs";
      newValue = input;
    }
    if (!updatedField) {
      return message.reply(
        `${config.emoji.no} Cấu hình không hợp lệ. Vui lòng sử dụng:\n` +
        `• \`${config.prefix}bs display=image/text/compact\`\n` +
        `• \`${config.prefix}bs speed=instant/short/lengthy\`\n` +
        `• \`${config.prefix}bs logs=true/false/link\``
      );
    }
    user.rpg.settings[updatedField] = newValue;
    user.markModified("rpg");
    await user.save();
    const finalDisplay = user.rpg.settings.battleDisplay || "image";
    const finalSpeed = user.rpg.settings.battleSpeed || "instant";
    const finalLogs = user.rpg.settings.battleLogs || "false";
    const embed = new EmbedBuilder()
      .setColor(getRpgColor("success"))
      .setTitle(formatRpgTitle("Đã cập nhật cài đặt", "✅"))
      .setDescription(`Cấu hình mới của **${message.author.username}** đã được lưu.`)
      .addFields(
        { name: "🖼️ Hiển thị", value: `**${finalDisplay}**`, inline: true },
        { name: "⏱️ Tốc độ", value: `**${finalSpeed}**`, inline: true },
        { name: "📜 Nhật ký", value: `**${finalLogs}**`, inline: true },
      )
      .setFooter(formatRpgFooter("Cấu hình đã lưu"));
    return message.reply({ embeds: [embed] });
  }
}
module.exports = new BattlesettingCommand();
