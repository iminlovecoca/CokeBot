const { EmbedBuilder } = require("discord.js");
const User = require("../../../models/User");
const config = require("../../../data/config");
const { isDungeonWeapon, getGearDisplayName, calculateRpgPower } = require("../../../utils/rpgUtil");
const { isDev } = require("../../../utils/userUtil");
const BaseCommand = require("../../../core/BaseCommand");

class SetupgradeCommand extends BaseCommand {
  constructor() {
    super({
      name: "setupgrade",
      aliases: ["setupg", "setenhance", "seteh"],
      description: "Đặt cấp cường hóa cho vũ khí của người chơi (Chỉ Admin/Dev)",
      usage: `${config.prefix}setupgrade @user <cấp độ> [ID vũ khí]`,
      cooldown: 0
    });
  }
  async execute(message, args) {
    if (!isDev(message.author.id)) {
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
    const levelInput = parseInt(args[1]);
    if (isNaN(levelInput) || levelInput < 0 || levelInput > 10) {
      return message.reply("❌ Cấp cường hóa phải từ 0 đến 10.");
    }
    const dbUser = await User.findOne({ userId: mention.id });
    if (!dbUser || !dbUser.rpg || !dbUser.rpg.items || dbUser.rpg.items.length === 0) {
      return message.reply(`❌ Người dùng <@${mention.id}> không có trang bị RPG nào.`);
    }
    let targetGear = null;
    const gearIdArg = args[2];
    if (gearIdArg) {
      const gearId = Number(gearIdArg.replace(/^[gG]/, ""));
      targetGear = dbUser.rpg.items.find(item => item.id === gearId);
      if (!targetGear) {
        return message.reply(`❌ Không tìm thấy trang bị ID \`G${String(gearId).padStart(3, "0")}\` của <@${mention.id}>.`);
      }
    } else {
      const weaponId = dbUser.rpg.equipped?.weapon;
      if (weaponId) {
        targetGear = dbUser.rpg.items.find(item => item.id === Number(weaponId));
      }
      if (!targetGear) {
        targetGear = dbUser.rpg.items.find(item => item.slot === "weapon");
      }
    }
    if (!targetGear) {
      return message.reply(`❌ Không tìm thấy vũ khí nào của <@${mention.id}> để đặt cấp cường hóa.`);
    }
    const oldLevel = targetGear.upgradeLevel || 0;
    targetGear.upgradeLevel = levelInput;
    dbUser.rpg.power = calculateRpgPower(dbUser);
    dbUser.markModified("rpg");
    await dbUser.save();

    const embed = new EmbedBuilder()
      .setColor("#2ECC71")
      .setTitle("✨ Đã đặt cấp cường hóa")
      .setDescription(
        `Đã thay đổi cấp cường hóa cho trang bị của <@${mention.id}>:\n\n` +
        `• **Trang bị**: ${getGearDisplayName(targetGear)}\n` +
        `• **ID Trang bị**: \`G${String(targetGear.id).padStart(3, "0")}\`\n` +
        `• **Cấp cường hóa**: \`+${oldLevel}\` → \`+${levelInput}\`\n` +
        `• **Lực chiến mới**: \`${Math.floor(dbUser.rpg.power).toLocaleString()}\``
      )
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
}
module.exports = new SetupgradeCommand();