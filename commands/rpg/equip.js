const { EmbedBuilder } = require("discord.js");
const config = require("../../data/config");
const {
  equipRpgItem,
  formatStats,
  getEffectiveRpgStats,
  requireRpgCharacter,
} = require("../../utils/rpgUtil");

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

    const itemId = Number(args[0]);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return message.reply(`${config.emoji.no} Dùng đúng dạng: \`${this.usage}\``);
    }

    const { user, item } = await equipRpgItem(message.author.id, itemId);

    const embed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle("Đã mặc trang bị")
      .setDescription(
        `Bạn đã mặc **${item.name}** vào slot **${config.rpg.gear_slot_names[item.slot]}**.`,
      )
      .addFields(
        {
          name: "Trang bị",
          value:
            `ID: \`${item.id}\`\n` +
            `Rarity: **${item.rarity}**\n` +
            `Power: **+${item.power.toLocaleString()}**\n` +
            `Stats: **${formatStats(item.stats)}**\n` +
            `Image key tạm: \`${item.imageKey}\``,
          inline: true,
        },
        {
          name: "Power hiện tại",
          value: `**${user.rpg.power.toLocaleString()}**`,
          inline: true,
        },
        {
          name: "Stats hiện tại",
          value: `**${formatStats(getEffectiveRpgStats(user))}**`,
        },
      );

    return message.reply({ embeds: [embed] });
  },
};
