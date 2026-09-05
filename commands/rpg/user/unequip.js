const { EmbedBuilder } = require("discord.js");
const config = require("../../../data/config");
const { requireRpgCharacter, unequipRpgSlot } = require("../../../utils/rpgUtil");
const { getSlotLabel, getRpgColor, formatRpgTitle } = require("../../../utils/rpgUi");
module.exports = {
  name: "unequip",
  aliases: ["uneq"],
  description: "Tháo một trang bị RPG theo slot.",
  usage: `${config.prefix}unequip <slot>`,
  examples: [
    { intent: "Tháo vũ khí", command: `${config.prefix}unequip weapon` },
    { intent: "Tháo nhẫn", command: `${config.prefix}uneq ring` },
  ],
  async execute(message, args) {
    await requireRpgCharacter(message.author.id);
    const slot = String(args[0] || "").toLowerCase();
    if (!slot) {
      return message.reply(
        `${config.emoji.no} Dùng đúng dạng: \`${this.usage}\`\n` +
          `Slot: \`${Object.keys(config.rpg.gear_slot_names).join("`, `")}\``,
      );
    }
    const { user, item, slot: unequippedSlot } = await unequipRpgSlot(
      message.author.id,
      slot,
    );
    const embed = new EmbedBuilder()
      .setColor(getRpgColor("warning"))
      .setTitle(formatRpgTitle("Đã tháo trang bị", item?.emoji || ""))
      .setDescription(
        `**${item?.name || getSlotLabel(unequippedSlot)}** đã được tháo khỏi ô **${getSlotLabel(unequippedSlot)}**.`,
      )
      .addFields({
        name: "Lực chiến hiện tại",
        value: `**${user.rpg.power.toLocaleString()}**`,
        inline: true,
      });
    return message.reply({ embeds: [embed] });
  },
};
