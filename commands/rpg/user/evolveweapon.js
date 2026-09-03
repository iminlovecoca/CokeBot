const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const {
  requireRpgCharacter,
  findRpgItem,
  calculateRpgPower,
  getGearDisplayName,
} = require("../../../utils/rpgUtil");
const { getWeaponEvolution, getEvolutionBranch } = require("../../../data/rpg/weaponEvolutions");
const { evolveRpgWeapon } = require("../../../utils/weaponEvolutionUtil");
const BaseCommand = require("../../../core/BaseCommand");

const getInventoryQuantity = (user, itemId) => {
  if (user.inventory?.get) return user.inventory.get(itemId) || 0;
  return user.inventory?.[itemId] || 0;
};

const getItemAttachment = (item) => {
  const imageKey = item.imageKey;
  if (!imageKey) return null;
  const imagePath = path.join(__dirname, "../../../assets/items", imageKey);
  if (!fs.existsSync(imagePath)) return null;
  return new AttachmentBuilder(imagePath, { name: "weapon.png" });
};

class EvolveWeaponCommand extends BaseCommand {
  constructor() {
    super({
      name: "evolveweapon",
      aliases: ["weaponforge", "evolvehammer", "renbua"],
      description: "Tiến hóa Búa Rèn thành một trong hai nhánh búa huyền thoại.",
      usage: `${config.prefix}evolveweapon [ID búa]`,
      examples: [
        { intent: "Tiến hóa chiếc búa đang trang bị", command: `${config.prefix}evolveweapon` },
        { intent: "Tiến hóa búa ID 123", command: `${config.prefix}evolveweapon G123` },
      ],
      cooldown: 0,
    });
  }

  async execute(message, args = []) {
    const { user } = await requireRpgCharacter(message.author.id);
    const rawItemId = args[0]?.trim().replace(/^[gG]/, "");
    const itemId = rawItemId ? Number(rawItemId) : user.rpg.equipped?.weapon;
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return message.reply(`${config.emoji.no} Hãy trang bị Búa Rèn hoặc nhập ID vũ khí hợp lệ.`);
    }

    const item = findRpgItem(user, itemId);
    if (!item) {
      return message.reply(`${config.emoji.no} Không tìm thấy vũ khí ID \`G${String(itemId).padStart(3, "0")}\` trong túi đồ.`);
    }
    if (item.slot !== "weapon") {
      return message.reply(`${config.emoji.no} Chỉ có thể tiến hóa vũ khí.`);
    }

    const recipe = getWeaponEvolution(item.subType || item.subtype);
    if (!recipe) {
      return message.reply(`${config.emoji.no} Chỉ **Búa Rèn** mới có thể tiến hóa theo hệ thống này.`);
    }

    const currentUpgradeLevel = Number(item.upgradeLevel || 0);
    if (currentUpgradeLevel !== recipe.requiredUpgradeLevel) {
      const levelMessage = currentUpgradeLevel < recipe.requiredUpgradeLevel
        ? `cần đạt **+${recipe.requiredUpgradeLevel}**`
        : `cần ở đúng **+${recipe.requiredUpgradeLevel}**`;
      return message.reply(
        `${config.emoji.warning} Búa Rèn ${levelMessage} trước khi tiến hóa. Hiện tại: **+${currentUpgradeLevel}**.`
      );
    }

    const stoneItem = message.client.allItems?.find((entry) => entry.item_id === recipe.stoneId);
    const stoneName = stoneItem?.name || `Smithing Stone (${recipe.stoneId})`;
    const stoneEmoji = stoneItem?.emoji || "💎";
    const stoneQuantity = getInventoryQuantity(user, recipe.stoneId);
    if ((user.coke || 0) < recipe.cokeCost || stoneQuantity < recipe.stoneQuantity) {
      return message.reply(
        `${config.emoji.no} Không đủ nguyên liệu tiến hóa. Cần **${recipe.cokeCost.toLocaleString()}** ${config.emoji.money} và **${recipe.stoneQuantity} x ${stoneEmoji} ${stoneName}**.`
      );
    }

    const branches = Object.values(recipe.branches);
    const branchLines = branches.map((branch) =>
      `${branch.emoji} **${branch.name}** — ${branch.style}\n${branch.description}`
    ).join("\n\n");
    const row = new ActionRowBuilder().addComponents(
      ...branches.map((branch) => new ButtonBuilder()
        .setCustomId(`evolveweapon:${item.id}:${branch.key}`)
        .setLabel(branch.key === "thorshammer" ? "Chọn nhánh Thor" : "Chọn nhánh Odin")
        .setStyle(branch.key === "thorshammer" ? ButtonStyle.Primary : ButtonStyle.Success)),
      new ButtonBuilder()
        .setCustomId(`evolveweapon:${item.id}:cancel`)
        .setLabel("Hủy")
        .setStyle(ButtonStyle.Danger)
    );
    const confirmEmbed = new EmbedBuilder()
      .setColor("#8B5CF6")
      .setTitle("🔨 Chọn Nhánh Tiến Hóa Búa Rèn")
      .setDescription(
        `Vũ khí hiện tại: **${getGearDisplayName(item)}**\n\n` +
        `${branchLines}\n\n` +
        `${config.emoji.money} Chi phí: **${recipe.cokeCost.toLocaleString()}**\n` +
        `💎 Nguyên liệu: **${recipe.stoneQuantity} x ${stoneEmoji} ${stoneName}**\n\n` +
        `Yêu cầu: Búa Rèn **+${recipe.requiredUpgradeLevel}**. Lựa chọn tiến hóa là **vĩnh viễn**.`
      )
      .setTimestamp();
    const payload = { embeds: [confirmEmbed], components: [row] };
    const attachment = getItemAttachment(item);
    if (attachment) {
      confirmEmbed.setThumbnail("attachment://weapon.png");
      payload.files = [attachment];
    }

    const confirmMsg = await message.reply(payload);
    try {
      const interaction = await confirmMsg.awaitMessageComponent({
        filter: (component) => component.user.id === message.author.id,
        time: 20000,
      });
      const [, selectedItemId, branchKey] = interaction.customId.split(":");
      if (branchKey === "cancel") {
        return interaction.update({ content: "❌ Đã hủy tiến hóa vũ khí.", embeds: [], components: [] });
      }

      const freshUser = await getUser(message.author.id);
      const freshItem = findRpgItem(freshUser, Number(selectedItemId));
      const freshRecipe = getWeaponEvolution(freshItem?.subType || freshItem?.subtype);
      const branch = getEvolutionBranch(freshRecipe, branchKey);
      if (!freshItem || !freshRecipe || !branch) {
        return interaction.update({ content: "❌ Vũ khí không còn hợp lệ để tiến hóa.", embeds: [], components: [] });
      }
      if (Number(freshItem.upgradeLevel || 0) !== freshRecipe.requiredUpgradeLevel) {
        return interaction.update({ content: `❌ Vũ khí phải ở đúng **+${freshRecipe.requiredUpgradeLevel}** trước khi tiến hóa.`, embeds: [], components: [] });
      }

      const freshStoneQuantity = getInventoryQuantity(freshUser, freshRecipe.stoneId);
      if ((freshUser.coke || 0) < freshRecipe.cokeCost || freshStoneQuantity < freshRecipe.stoneQuantity) {
        return interaction.update({ content: "❌ Bạn không còn đủ Coke hoặc nguyên liệu để tiến hóa.", embeds: [], components: [] });
      }

      freshUser.coke -= freshRecipe.cokeCost;
      if (!freshUser.inventory) freshUser.inventory = new Map();
      const remainingStoneQuantity = freshStoneQuantity - freshRecipe.stoneQuantity;
      if (remainingStoneQuantity === 0) freshUser.inventory.delete(freshRecipe.stoneId);
      else freshUser.inventory.set(freshRecipe.stoneId, remainingStoneQuantity);
      freshUser.markModified("inventory");

      const freshItemIndex = freshUser.rpg.items.findIndex((entry) => Number(entry.id) === Number(selectedItemId));
      const evolved = evolveRpgWeapon(freshItem, branchKey);
      freshUser.rpg.items[freshItemIndex] = evolved.item;
      freshUser.rpg.power = calculateRpgPower(freshUser);
      freshUser.markModified("rpg");
      await freshUser.save();

      const successEmbed = new EmbedBuilder()
        .setColor("#F59E0B")
        .setTitle("✨ TIẾN HÓA VŨ KHÍ THÀNH CÔNG! ✨")
        .setDescription(
          `**${getGearDisplayName(freshItem)}** đã tiến hóa thành **${getGearDisplayName(evolved.item)}**!\n\n` +
          `${branch.emoji} **Nhánh:** ${branch.style}\n` +
          `📈 **Scale:** STR (${branch.scaling.str}) | INT (${branch.scaling.int}) | ARC (${branch.scaling.arc}) | DEX (${branch.scaling.dex})\n` +
          `🔨 Cấp cường hóa được giữ ở **+${evolved.item.upgradeLevel}**\n` +
          `${config.emoji.money} Đã tiêu hao: **${freshRecipe.cokeCost.toLocaleString()}**`
        )
        .setTimestamp();
      const successPayload = { embeds: [successEmbed], components: [] };
      const evolvedAttachment = getItemAttachment(evolved.item);
      if (evolvedAttachment) {
        successEmbed.setThumbnail("attachment://weapon.png");
        successPayload.files = [evolvedAttachment];
      }
      return interaction.update(successPayload);
    } catch (error) {
      console.error("[EVOLVE_WEAPON] Confirmation failed:", error);
      return confirmMsg.edit({
        content: "❌ Hết thời gian chờ, yêu cầu tiến hóa vũ khí đã tự động hủy.",
        embeds: [],
        components: [],
      }).catch(() => {});
    }
  }
}

module.exports = new EvolveWeaponCommand();
