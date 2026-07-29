const { EmbedBuilder } = require("discord.js");
const config = require("../../../data/config");
const {
  equipRpgItem,
  requireRpgCharacter,
  getGearDisplayName,
  getItemImageFile,
} = require("../../../utils/rpgUtil");
module.exports = {
  name: "equip",
  aliases: ["eq"],
  description: "Mặc một trang bị RPG theo ID.",
  usage: `${config.prefix}equip <itemId>`,
  examples: [
    { intent: "Mặc trang bị RPG ID 3", command: `${config.prefix}equip 3` },
  ],
  async execute(message, args) {
    await requireRpgCharacter(message.author.id);
    const cleanArg = args[0] ? args[0].trim().replace(/^[gG]/, "") : "";
    const itemId = Number(cleanArg);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return message.reply(`${config.emoji.no} Dùng đúng dạng: \`${this.usage}\``);
    }
    const { user, item } = await equipRpgItem(message.author.id, itemId);
    const path = require("path");
    const fs = require("fs");
    const { AttachmentBuilder } = require("discord.js");
    const embed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle("Đã mặc trang bị")
      .setDescription(
        `Bạn đã mặc **${getGearDisplayName(item)}** vào slot **${config.rpg.gear_slot_names[item.slot]}**.`,
      )
      .addFields(
        {
          name: "Trang bị",
          value:
            `ID: \`${item.id}\`\n` +
            `Rarity: **${item.rarity}**\n` +
            `Lực chiến: **+${item.power.toLocaleString()}**`,
          inline: true,
        },
        {
          name: "Lực chiến hiện tại",
          value: `**${user.rpg.power.toLocaleString()}**`,
          inline: true,
        },
      );
    let itemAttachment = null;
    const imgKey = item.imageKey || getItemImageFile(item);
    if (imgKey) {
      const itemImagePath = path.join(__dirname, "../../../assets/items", imgKey);
      if (fs.existsSync(itemImagePath)) {
        itemAttachment = new AttachmentBuilder(itemImagePath, { name: "item.png" });
        embed.setThumbnail("attachment://item.png");
      }
    }
    const payload = { embeds: [embed] };
    if (itemAttachment) {
      payload.files = [itemAttachment];
    }
    return message.reply(payload);
  },
};