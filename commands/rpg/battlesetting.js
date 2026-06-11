const { EmbedBuilder } = require("discord.js");
const config = require("../../data/config");
const { requireRpgCharacter } = require("../../utils/rpgUtil");

module.exports = {
  name: "battlesetting",
  aliases: ["bs"],
  description: "Cài đặt hiển thị ảnh trận đấu và cấu hình PvP (battle).",
  usage: `${config.prefix}battlesetting display=image/text/compact`,
  examples: [
    { intent: "Bật hiển thị hình ảnh trận đấu", command: `${config.prefix}bs display=image` },
    { intent: "Tắt hiển thị hình ảnh trận đấu (chỉ hiện chữ)", command: `${config.prefix}bs display=text` },
    { intent: "Cài đặt tốc độ trận đấu tức thì", command: `${config.prefix}bs speed=instant` },
  ],

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
        .setColor("#5865F2")
        .setAuthor({
          name: `${message.author.username}'s battle settings`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(
          `**Display =** \`${currentDisplay}\`\n` +
          `**Speed =** \`${currentSpeed}\`\n` +
          `**Logs =** \`${currentLogs}\`\n\n` +
          `***\n\n` +
          `💡 **Cách thay đổi cài đặt / How to change settings:**\n` +
          `• Sử dụng lệnh: \`${config.prefix}bs {setting}={value}\` hoặc \`${config.prefix}bs {value}\`\n\n` +
          `**Logs (Nhật ký):**\n` +
          `• \`true\`: Hiển thị nhật ký trận đấu dưới dạng văn bản\n` +
          `• \`false\`: Không hiển thị nhật ký trận đấu\n` +
          `• \`link\`: Cung cấp đường dẫn đến nhật ký trận đấu\n\n` +
          `**Display (Hiển thị):**\n` +
          `• \`image\`: Hiển thị trận đấu dạng ảnh\n` +
          `• \`text\`: Hiển thị trận đấu dạng văn bản (không ảnh)\n` +
          `• \`compact\`: Hiển thị trận đấu dạng văn bản thu gọn\n\n` +
          `**Speed (Tốc độ):**\n` +
          `• \`instant\`: Kết thúc trận đấu ngay lập tức\n` +
          `• \`short\`: Kết thúc trận đấu sau 1-3 lượt chỉnh sửa tin nhắn\n` +
          `• \`lengthy\`: Hiển thị chi tiết từng lượt đấu`
        );
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
      .setColor("#57F287")
      .setAuthor({
        name: `${message.author.username}'s battle settings`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        `**Display =** \`${finalDisplay}\`\n` +
        `**Speed =** \`${finalSpeed}\`\n` +
        `**Logs =** \`${finalLogs}\`\n\n` +
        `${config.emoji.yes} Đã cập nhật thành công!`
      );

    return message.reply({ embeds: [embed] });
  },
};
