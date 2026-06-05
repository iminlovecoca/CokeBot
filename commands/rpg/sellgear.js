const { EmbedBuilder } = require("discord.js");
const config = require("../../data/config");
const {
  requireRpgCharacter,
  sellRpgItem,
} = require("../../utils/rpgUtil");

module.exports = {
  name: "sellgear",
  aliases: ["sg", "rpgsell"],
  description: "Bán trang bị RPG để nhận Coke.",
  usage: `${config.prefix}sellgear <itemId>`,
  examples: [
    { intent: "Bán trang bị RPG ID 5", command: `${config.prefix}sellgear 5` },
  ],

  async execute(message, args) {
    await requireRpgCharacter(message.author.id);

    const itemId = Number(args[0]);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return message.reply(`${config.emoji.no} Dùng đúng dạng: \`${this.usage}\``);
    }

    const { user, item, cokeGain } = await sellRpgItem(message.author.id, itemId);

    const embed = new EmbedBuilder()
      .setColor("#FEE75C")
      .setTitle("Đã bán trang bị RPG")
      .setDescription(
        `Bạn đã bán **${item.name}** và nhận **${cokeGain.toLocaleString()} Coke**.`,
      )
      .addFields(
        {
          name: "Trang bị",
          value:
            `ID: \`${item.id}\`\n` +
            `Slot: **${config.rpg.gear_slot_names[item.slot]}**\n` +
            `Rarity: **${item.rarity}**\n` +
            `Lực chiến: **+${item.power.toLocaleString()}**`,
          inline: true,
        },
        {
          name: "Số dư Coke",
          value: `**${user.coke.toLocaleString()}**`,
          inline: true,
        },
      );

    return message.reply({ embeds: [embed] });
  },
};
