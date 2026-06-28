const BaseCommand = require("../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../data/config");
const {
  requireRpgCharacter,
  sellRpgItem,
  getGearDisplayName,
} = require("../../utils/rpgUtil");

class SellgearCommand extends BaseCommand {
  constructor() {
    super({
      name: "sellgear",
      aliases: ["sg", "rpgsell"],
      description: "Bán trang bị RPG để nhận Coke.",
      usage: `${config.prefix}sellgear <itemId>`,
      examples: [
        { intent: "Bán trang bị RPG ID 5", command: `${config.prefix}sellgear 5` },
      ],
      cooldown: 0
    });
  }

  async execute(message, args) {
    const { user } = await requireRpgCharacter(message.author.id);

    if (!args[0]) {
      return message.reply(`${config.emoji.no} Dùng đúng dạng: \`${this.usage}\``);
    }

    const firstArg = args[0].trim().toLowerCase();
    const cleanArg = firstArg.replace(/^[gG]/, "");
    const itemId = Number(cleanArg);

    if (Number.isInteger(itemId) && itemId > 0) {
      const { item, cokeGain } = await sellRpgItem(message.author.id, itemId);

      const embed = new EmbedBuilder()
        .setColor("#FEE75C")
        .setTitle("Đã bán trang bị RPG")
        .setDescription(
          `Bạn đã bán **${getGearDisplayName(item)}** và nhận **${cokeGain.toLocaleString()} Coke**.`
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
          }
        );

      return message.reply({ embeds: [embed] });
    } else {
      const rarityMapping = {
        c: "Common",
        r: "Rare",
        e: "Epic",
        l: "Legendary",
        m: "Mythic",
        a: "Ancient",
        d: "Divine",
        common: "Common",
        rare: "Rare",
        epic: "Epic",
        legendary: "Legendary",
        mythic: "Mythic",
        ancient: "Ancient",
        divine: "Divine",
      };

      const targetTiers = firstArg.split(",").map((t) => t.trim());
      const raritiesToSell = targetTiers.map((t) => rarityMapping[t]).filter(Boolean);

      if (raritiesToSell.length === 0) {
        return message.reply(
          `${config.emoji.no} Độ hiếm không hợp lệ. Viết tắt hợp lệ: ` +
            `\`c\` (Common), \`r\` (Rare), \`e\` (Epic), \`l\` (Legendary), \`m\` (Mythic), \`a\` (Ancient), \`d\` (Divine).`
        );
      }

      const equippedIds = new Set(Object.values(user.rpg.equipped || {}));
      const userItems = user.rpg.items || [];

      
      const itemsToSell = userItems.filter(
        (item) => raritiesToSell.includes(item.rarity) && !equippedIds.has(item.id) && !item.isGodset
      );

      if (itemsToSell.length === 0) {
        return message.reply(
          `${config.emoji.warning} Không tìm thấy trang bị nào thuộc các cấp độ này trong rương đồ để bán (hoặc tất cả đều đang được trang bị).`
        );
      }

      
      const totalCoke = itemsToSell.reduce((sum, item) => sum + (item.sellPrice || 0), 0);

      
      const sellIds = new Set(itemsToSell.map((item) => item.id));
      user.rpg.items = userItems.filter((item) => !sellIds.has(item.id));
      user.coke += totalCoke;

      
      const { calculateRpgPower } = require("../../utils/rpgUtil");
      user.rpg.power = calculateRpgPower(user);
      user.markModified("rpg");
      await user.save();

      
      const countsByRarity = {};
      for (const item of itemsToSell) {
        countsByRarity[item.rarity] = (countsByRarity[item.rarity] || 0) + 1;
      }

      const statsLines = Object.entries(countsByRarity)
        .map(([rarity, count]) => `• ${rarity}: **${count}** món`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor("#FEE75C")
        .setTitle("Đã bán hàng loạt trang bị RPG")
        .setDescription(
          `Bạn đã bán thành công **${itemsToSell.length}** trang bị và nhận **${totalCoke.toLocaleString()} Coke**.\n\n` +
            `**Chi tiết:**\n${statsLines}`
        )
        .addFields({
          name: "Số dư Coke mới",
          value: `**${user.coke.toLocaleString()} Coke**`,
        });

      return message.reply({ embeds: [embed] });
    }
  }
}

module.exports = new SellgearCommand();
