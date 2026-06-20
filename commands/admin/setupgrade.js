const { EmbedBuilder } = require("discord.js");
const User = require("../../models/User");
const config = require("../../data/config");
const { isDungeonWeapon, getGearDisplayName, calculateRpgPower } = require("../../utils/rpgUtil");

module.exports = {
  name: "setupgrade",
  aliases: ["setupg", "setenhance", "seteh"],
  description: "Đặt cấp cường hóa cho vũ khí của người chơi (Chỉ Admin/Dev)",
  usage: `${config.prefix}setupgrade @user <cấp độ> [ID vũ khí]`,

  async execute(message, args) {
    const ownerId = "745950731638407210";
    if (message.author.id !== ownerId && !config.permissions.dev_ids.includes(message.author.id) && message.author.id !== process.env.OWNER_ID) {
      return message.reply("❌ Bạn không có quyền dùng lệnh này!");
    }

    const targetArg = args[0];
    if (!targetArg) {
      return message.reply(`❌ Cú pháp: \`${config.prefix}setupgrade @user <cấp độ> [ID vũ khí]\``);
    }

    const mention = message.mentions.users.first() || await message.client.users.fetch(targetArg).catch(() => null);
    if (!mention) {
      return message.reply("❌ Không tìm thấy người dùng.");
    }

    const levelArg = args[1];
    if (!levelArg || isNaN(levelArg)) {
      return message.reply(`❌ Cú pháp: \`${config.prefix}setupgrade @user <cấp độ> [ID vũ khí]\` (Cấp độ phải là số)`);
    }
    const targetLevel = parseInt(levelArg, 10);
    if (targetLevel < 0) {
      return message.reply("❌ Cấp độ cường hóa không được âm.");
    }

    const dbUser = await User.findOne({ userId: mention.id });
    if (!dbUser || !dbUser.rpg || !dbUser.rpg.classKey) {
      return message.reply(`❌ Người dùng <@${mention.id}> chưa tạo nhân vật RPG.`);
    }

    let itemId = null;
    if (args[2] && !isNaN(args[2])) {
      itemId = parseInt(args[2], 10);
    } else {
      // Default to equipped weapon
      itemId = dbUser.rpg.equipped?.weapon;
      if (!itemId) {
        return message.reply(`❌ Người dùng <@${mention.id}> hiện không mặc vũ khí nào. Vui lòng nhập ID vũ khí cụ thể.`);
      }
    }

    const items = dbUser.rpg.items || [];
    const itemIndex = items.findIndex(it => it.id === itemId);
    if (itemIndex === -1) {
      return message.reply(`❌ Không tìm thấy trang bị ID \`${itemId}\` trong túi đồ của người dùng.`);
    }

    const item = items[itemIndex];
    if (item.slot !== "weapon") {
      return message.reply(`❌ Trang bị ID \`${itemId}\` không phải là Vũ khí. Chỉ có thể cường hóa vũ khí.`);
    }

    const isSpecial = isDungeonWeapon(item);
    const maxLevel = isSpecial ? 10 : 25;

    if (targetLevel > maxLevel) {
      return message.reply(`❌ Vũ khí ${isSpecial ? "đặc biệt" : "thường"} chỉ có thể cường hóa tối đa là **+${maxLevel}**.`);
    }

    const oldLevel = item.upgradeLevel || 0;
    item.upgradeLevel = targetLevel;
    item.name = getGearDisplayName(item);
    dbUser.markModified("rpg");

    // Recalculate power
    dbUser.rpg.power = calculateRpgPower(dbUser);
    await dbUser.save();

    const embed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle("⚙️ Admin Set Upgrade Level")
      .setDescription(
        `Đã đặt cấp cường hóa cho vũ khí của <@${mention.id}>:\n\n` +
        `• **Vũ khí**: ${item.name} (**+${oldLevel}** ➡️ **+${targetLevel}**)\n` +
        `• **Loại**: \`${isSpecial ? "Vũ khí Đặc biệt" : "Vũ khí Thường"}\` (Giới hạn: +${maxLevel})\n` +
        `• **Lực chiến tổng hiện tại**: **${Math.floor(dbUser.rpg.power).toLocaleString()}**`
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
