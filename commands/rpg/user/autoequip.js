const { EmbedBuilder } = require("discord.js");
const config = require("../../../data/config");
const {
  requireRpgCharacter,
  getRpgItems,
  getRpgClass,
  calculateRpgPower,
  getGearDisplayName,
  getWeaponPower
} = require("../../../utils/rpgUtil");
const getBaseStatsWithoutGear = (user) => {
  if (!user?.rpg?.classKey) return { vigor: 0, pr: 0, mr: 0, str: 0, dex: 0, int: 0, arc: 0 };
  const rpgClass = getRpgClass(user.rpg.classKey);
  const stats = { ...rpgClass.stats };
  if (user.rpg.stats) {
    for (const [key, value] of Object.entries(user.rpg.stats)) {
      const normalized = key.toLowerCase();
      let targetStat = normalized;
      if (normalized === "luck") targetStat = "arc";
      else if (normalized === "vit") targetStat = "vigor";
      else if (normalized === "def") targetStat = "pr";
      else if (normalized === "agi") targetStat = "dex";
      if (stats[targetStat] !== undefined) {
        stats[targetStat] = (stats[targetStat] || 0) + value;
      }
    }
  }
  for (const stat of Object.keys(stats)) {
    stats[stat] = Math.min(99, stats[stat]);
  }
  return stats;
};
const getItemScore = (item, classKey, baseStats) => {
  if (item.slot === "weapon") {
    const subType = String(item.subType || "").toLowerCase();
    const magicalClasses = ["mage"];
    const isMagicalClass = magicalClasses.includes(classKey);
    const isSuitable = isMagicalClass
      ? (subType.includes("staff") || subType.includes("dusk"))
      : !subType.includes("staff");
    const scaledPower = getWeaponPower(item, baseStats);
    return isSuitable ? scaledPower : scaledPower - 5000;
  }
  let score = item.power || 0;
  const magicalClasses = ["mage"];
  const dexClasses = ["assassin", "archer"];
  let weights = {};
  if (magicalClasses.includes(classKey)) {
    weights = { int: 5, arc: 3, vigor: 2, pr: 1.5, mr: 1.5, str: 0, dex: 0 };
  } else if (dexClasses.includes(classKey)) {
    weights = { dex: 5, vigor: 3, pr: 1.5, mr: 1.5, str: 1, int: 0, arc: 0 };
  } else {
    weights = { str: 5, vigor: 3, pr: 1.5, mr: 1.5, dex: 1, int: 0, arc: 0 };
  }
  if (item.stats) {
    for (const [statName, val] of Object.entries(item.stats)) {
      const weight = weights[statName.toLowerCase()] || 0;
      score += val * weight;
    }
  }
  return score;
};
module.exports = {
  name: "autoequip",
  aliases: ["aeq", "macnhanh", "mặcnhanh"],
  description: "Tự động mặc những trang bị tốt nhất và phù hợp nhất với class của bạn.",
  usage: `${config.prefix}autoequip`,
  examples: [
    { intent: "Tự động mặc trang bị tốt nhất", command: `${config.prefix}autoequip` },
  ],
  hidden: true,
  async execute(message, args = []) {
    const authorId = message.author.id;
    const isOwner = config.permissions?.dev_ids?.includes(authorId) || authorId === process.env.OWNER_ID || authorId === "745950731638407210";
    if (!isOwner) return;
    const { user, rpgClass } = await requireRpgCharacter(message.author.id);
    const classKey = user.rpg.classKey;
    const userItems = getRpgItems(user);
    if (userItems.length === 0) {
      return message.reply(`${config.emoji.no} Bạn không có trang bị nào trong rương hành trang.`);
    }
    const baseStats = getBaseStatsWithoutGear(user);
    const oldPower = user.rpg.power || 0;
    if (!user.rpg.equipped) {
      user.rpg.equipped = {};
    }
    const slots = ["weapon", "armor", "helmet", "boots", "ring", "necklace"];
    const newlyEquipped = [];
    for (const slot of slots) {
      const slotItems = userItems.filter(item => item.slot === slot);
      if (slotItems.length === 0) continue;
      let bestItem = null;
      let maxScore = -Infinity;
      for (const item of slotItems) {
        const score = getItemScore(item, classKey, baseStats);
        if (score > maxScore) {
          maxScore = score;
          bestItem = item;
        }
      }
      if (bestItem) {
        const currentEquippedId = user.rpg.equipped[slot];
        if (currentEquippedId !== bestItem.id) {
          user.rpg.equipped[slot] = bestItem.id;
          newlyEquipped.push({ slot, item: bestItem });
        }
      }
    }
    if (newlyEquipped.length === 0) {
      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🛡️ Tự Động Trang Bị")
        .setDescription(
          `${config.emoji.yes || "✅"} Bạn đang mặc những trang bị tối ưu nhất hiện có cho class **${rpgClass.name}**!\n\n` +
          `Lực chiến hiện tại: **${oldPower.toLocaleString()}**`
        );
      return message.reply({ embeds: [embed] });
    }
    user.rpg.power = calculateRpgPower(user);
    user.markModified("rpg");
    await user.save();
    const newPower = user.rpg.power;
    const powerDiff = newPower - oldPower;
    const powerDiffText = powerDiff >= 0 ? `+${powerDiff.toLocaleString()}` : `${powerDiff.toLocaleString()}`;
    const fields = newlyEquipped.map(({ slot, item }) => ({
      name: `${config.rpg.gear_slot_names[slot]}`,
      value: `${getGearDisplayName(item)}\n└ ID: \`${item.id}\` | Lực chiến: **+${item.power.toLocaleString()}**`,
      inline: false
    }));
    const embed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle("🛡️ Tự Động Trang Bị Thành Công")
      .setDescription(
        `Đã tự động tối ưu hóa và mặc các trang bị phù hợp nhất cho class **${rpgClass.name}** của bạn!\n\n` +
        `⚔ Lực chiến: **${oldPower.toLocaleString()}** → **${newPower.toLocaleString()}** (**${powerDiffText}**)`
      )
      .addFields(fields);
    return message.reply({ embeds: [embed] });
  }
};