const { EmbedBuilder } = require("discord.js");
const User = require("../../../models/User");
const config = require("../../../data/config");
const { calculateRpgPower, getGearDisplayName } = require("../../../utils/rpgUtil");
const { isDev } = require("../../../utils/userUtil");
const BaseCommand = require("../../../core/BaseCommand");

class RemovegearCommand extends BaseCommand {
  constructor() {
    super({
      name: "removegear",
      aliases: ["deletegear", "removeitem", "deleteitem"],
      description: "Xoá một trang bị RPG của người chơi bằng ID (Chỉ Dev/Owner)",
      usage: `${config.prefix}removegear @user <ID trang bị (ví dụ: 15 hoặc G015)>`,
      cooldown: 0
    });
  }
  async execute(message, args) {
    if (!isDev(message.author.id)) {
      return message.reply("❌ Bạn không có quyền dùng lệnh này!");
    }
    const targetArg = args[0];
    const itemIdArg = args[1];
    if (!targetArg || !itemIdArg) {
      return message.reply(`❌ Cú pháp: \`${config.prefix}removegear @user <ID trang bị (ví dụ: 15 hoặc G015)>\``);
    }
    const mention = message.mentions.users.first() || await message.client.users.fetch(targetArg).catch(() => null);
    if (!mention) {
      return message.reply("❌ Không tìm thấy người dùng.");
    }
    const targetId = Number(itemIdArg.replace(/^[gG]/, ""));
    if (isNaN(targetId) || targetId <= 0) {
      return message.reply("❌ ID trang bị không hợp lệ. Ví dụ: `15` hoặc `G015`.");
    }
    const dbUser = await User.findOne({ userId: mention.id });
    if (!dbUser || !dbUser.rpg || !dbUser.rpg.items || dbUser.rpg.items.length === 0) {
      return message.reply(`❌ Người dùng <@${mention.id}> không có trang bị RPG nào.`);
    }
    const gearIndex = dbUser.rpg.items.findIndex(item => item.id === targetId);
    if (gearIndex === -1) {
      return message.reply(`❌ Không tìm thấy trang bị với ID \`G${String(targetId).padStart(3, "0")}\` trong túi đồ của <@${mention.id}>.`);
    }
    const removedGear = dbUser.rpg.items[gearIndex];
    dbUser.rpg.items.splice(gearIndex, 1);
    let wasEquipped = false;
    if (dbUser.rpg.equipped) {
      for (const [slot, equippedId] of Object.entries(dbUser.rpg.equipped)) {
        if (equippedId === targetId) {
          delete dbUser.rpg.equipped[slot];
          wasEquipped = true;
          break;
        }
      }
    }
    dbUser.rpg.power = calculateRpgPower(dbUser);
    dbUser.markModified("rpg");
    await dbUser.save();

    const embed = new EmbedBuilder()
      .setColor("#E74C3C")
      .setTitle("🗑️ Đã xoá trang bị")
      .setDescription(
        `Đã xoá thành công trang bị sau khỏi người chơi <@${mention.id}>:\n\n` +
        `• **Trang bị**: ${getGearDisplayName(removedGear)}\n` +
        `• **ID Trang bị**: \`G${String(removedGear.id).padStart(3, "0")}\`\n` +
        `• **Trạng thái**: ${wasEquipped ? "Đang mặc (Đã tháo ra)" : "Trong túi đồ"}\n` +
        `• **Lực chiến mới**: \`${Math.floor(dbUser.rpg.power).toLocaleString()}\``
      )
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
}
module.exports = new RemovegearCommand();