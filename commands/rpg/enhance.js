const { EmbedBuilder } = require("discord.js");
const config = require("../../data/config");
const {
  requireRpgCharacter,
  getGearDisplayName,
  calculateRpgPower,
} = require("../../utils/rpgUtil");

const dungeonKeys = [
  "shadowdagger",
  "poisondagger",
  "firesword",
  "greenstaff",
  "bluestaff",
  "crimsondagger",
  "holysword",
  "darksword",
  "darkstaff"
];

const isDungeonWeapon = (item) => {
  if (item.slot !== "weapon") return false;
  const key = (item.subType || "").toLowerCase().replace(/\s+/g, "");
  return dungeonKeys.includes(key);
};

module.exports = {
  name: "enhance",
  aliases: ["eh", "ch", "cuonghoa"],
  description: "Cường hóa vũ khí của bạn sử dụng Đá rèn và Coke.",
  usage: `${config.prefix}enhance [ID vũ khí]`,
  examples: [
    { intent: "Cường hóa vũ khí đang trang bị", command: `${config.prefix}enhance` },
    { intent: "Cường hóa vũ khí có ID 15", command: `${config.prefix}enhance 15` },
  ],

  async execute(message, args) {
    const { user } = await requireRpgCharacter(message.author.id);

    // Parse weapon ID or default to equipped weapon
    const cleanArg = args[0] ? args[0].trim().replace(/^[gG]/, "") : "";
    let itemId = Number(cleanArg);

    const equipped = user.rpg.equipped || {};
    if (!cleanArg) {
      if (!equipped.weapon) {
        return message.reply(
          `${config.emoji.no} Bạn chưa trang bị vũ khí nào. Hãy trang bị vũ khí trước hoặc nhập ID vũ khí muốn cường hóa.`
        );
      }
      itemId = equipped.weapon;
    }

    // Find the item in user's inventory
    const items = user.rpg.items || [];
    const itemIndex = items.findIndex((it) => it.id === itemId);
    if (itemIndex === -1) {
      return message.reply(`${config.emoji.no} Không tìm thấy trang bị này trong túi đồ của bạn.`);
    }

    const item = items[itemIndex];
    if (item.slot !== "weapon") {
      return message.reply(`${config.emoji.no} Chỉ có thể cường hóa trang bị thuộc loại **Vũ khí**.`);
    }

    const isDungeon = isDungeonWeapon(item);
    const maxLevel = isDungeon ? 10 : 25;
    const currentLvl = item.upgradeLevel || 0;

    if (currentLvl >= maxLevel) {
      return message.reply(`${config.emoji.warning} Vũ khí này đã đạt cấp độ cường hóa tối đa (**+${maxLevel}**).`);
    }

    const nextLvl = currentLvl + 1;
    let cokeCost = 0;
    let stoneId = "";
    let stoneQty = 0;

    if (isDungeon) {
      // Dungeon Weapon upgrade: max +10
      // Cost: 20k to 450k Coke (linear/progressive: 20000 + currentLvl * 47777)
      cokeCost = Math.floor(20000 + currentLvl * 47777);
      // Stones: Somber Smithing Stone [1] to [9] (cristal-1 to cristal-9) + cristal-10 for +10
      stoneId = `cristal-${nextLvl}`;
      stoneQty = 1;
    } else {
      // Normal Weapon upgrade: max +25
      // Cost: 10k to 200k Coke (linear/progressive: 10000 + currentLvl * 7916)
      cokeCost = Math.floor(10000 + currentLvl * 7916);
      // Stones: Smithing Stone [1] to [8] (somber-1 to somber-8) + somber-9 for +25
      if (nextLvl === 25) {
        stoneId = "somber-9";
        stoneQty = 1;
      } else {
        const tier = Math.floor((nextLvl - 1) / 3) + 1;
        stoneId = `somber-${tier}`;
        stoneQty = ((nextLvl - 1) % 3 + 1) * 2;
      }
    }

    // Validate Coke
    if (user.coke < cokeCost) {
      return message.reply(
        `${config.emoji.no} Bạn không đủ Coke để cường hóa! Cần **${cokeCost.toLocaleString()}** Coke nhưng bạn chỉ có **${user.coke.toLocaleString()}** Coke.`
      );
    }

    // Validate Stones
    if (!user.inventory) {
      user.inventory = new Map();
    }
    const userStoneQty = user.inventory.get(stoneId) || 0;
    const stoneItem = message.client.allItems.find((i) => i.item_id === stoneId);
    const stoneName = stoneItem ? stoneItem.name : `Smithing Stone (${stoneId})`;
    const stoneEmoji = stoneItem ? stoneItem.emoji : "💎";

    if (userStoneQty < stoneQty) {
      return message.reply(
        `${config.emoji.no} Bạn không đủ nguyên liệu! Cần **${stoneQty} x ${stoneEmoji} ${stoneName}** nhưng hiện tại chỉ có **${userStoneQty}** viên trong túi đồ.`
      );
    }

    // Process Upgrade
    user.coke -= cokeCost;
    
    const newQty = userStoneQty - stoneQty;
    if (newQty === 0) {
      user.inventory.delete(stoneId);
    } else {
      user.inventory.set(stoneId, newQty);
    }
    user.markModified("inventory");

    // Update item upgradeLevel and name
    item.upgradeLevel = nextLvl;
    item.name = getGearDisplayName(item);
    user.markModified("rpg");

    // Recalculate power
    user.rpg.power = calculateRpgPower(user);
    await user.save();

    // Response Embed
    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("✨ CƯỜNG HÓA VŨ KHÍ THÀNH CÔNG! ✨")
      .setDescription(
        `Chúc mừng bạn đã nâng cấp thành công vũ khí của mình lên **+${nextLvl}**!\n\n` +
          `🗡️ **Vũ khí**: ${getGearDisplayName(item)}\n` +
          `💰 Coke tiêu hao: **-${cokeCost.toLocaleString()} Coke**\n` +
          `💎 Nguyên liệu tiêu hao: **-${stoneQty} x ${stoneEmoji} ${stoneName}**\n\n` +
          `💪 Lực chiến tổng hiện tại: **${user.rpg.power.toLocaleString()}**`
      )
      .setTimestamp();

    const path = require("path");
    const fs = require("fs");
    const { AttachmentBuilder } = require("discord.js");
    let itemAttachment = null;
    const imgKey = item.imageKey || (require("../../utils/rpgUtil").getItemImageFile(item));
    if (imgKey) {
      const itemImagePath = path.join(__dirname, "../../assets/items", imgKey);
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
