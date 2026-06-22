const { EmbedBuilder } = require("discord.js");
const User = require("../../models/User");
const config = require("../../data/config");
const { getRpgItems, getGearDisplayName, calculateRpgPower } = require("../../utils/rpgUtil");

module.exports = {
  name: "removegear",
  aliases: ["deletegear", "removeitem", "deleteitem"],
  description: "Xoá một trang bị RPG của người chơi bằng ID (Chỉ Dev/Owner)",
  usage: `${config.prefix}removegear @user <ID trang bị (ví dụ: 15 hoặc G015)>`,

  async execute(message, args) {
    const ownerId = "745950731638407210";
    if (message.author.id !== ownerId && !config.permissions.dev_ids.includes(message.author.id) && message.author.id !== process.env.OWNER_ID) {
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

    const itemId = parseInt(itemIdArg.replace(/[^0-9]/g, ""));
    if (isNaN(itemId) || itemId <= 0) {
      return message.reply("❌ ID trang bị phải là một số nguyên dương hợp lệ (ví dụ: `15` hoặc `G015`).");
    }

    const dbUser = await User.findOne({ userId: mention.id });
    if (!dbUser || !dbUser.rpg || !dbUser.rpg.classKey) {
      return message.reply(`❌ Người chơi <@${mention.id}> chưa có nhân vật RPG.`);
    }

    const items = getRpgItems(dbUser);
    const itemIndex = items.findIndex((it) => it.id === itemId);

    if (itemIndex === -1) {
      return message.reply(`❌ Không tìm thấy trang bị ID \`G${String(itemId).padStart(3, "0")}\` trong kho đồ của <@${mention.id}>.`);
    }

    const item = items[itemIndex];
    const displayName = getGearDisplayName(item);

    // Unequip item if currently equipped
    let unequipped = false;
    if (dbUser.rpg.equipped) {
      for (const [slot, equippedId] of Object.entries(dbUser.rpg.equipped)) {
        if (equippedId === itemId) {
          delete dbUser.rpg.equipped[slot];
          unequipped = true;
          break;
        }
      }
    }

    // Remove item from inventory list
    dbUser.rpg.items = items.filter((it) => it.id !== itemId);
    dbUser.markModified("rpg");

    // Recalculate power
    dbUser.rpg.power = calculateRpgPower(dbUser);
    await dbUser.save();

    const embed = new EmbedBuilder()
      .setColor("#ED4245")
      .setTitle("🗑️ Đã Xoá Trang Bị")
      .setDescription(
        `Đã xoá thành công trang bị của người chơi <@${mention.id}>:\n\n` +
        `• **Trang bị**: **${displayName}**\n` +
        `• **ID**: \`G${String(itemId).padStart(3, "0")}\`\n` +
        `• **Lực chiến**: \`+${item.power.toLocaleString()}\`\n` +
        `• **Trạng thái**: ${unequipped ? "⚠️ Đã tự động tháo xuống trước khi xoá" : "Kho đồ"}`
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
