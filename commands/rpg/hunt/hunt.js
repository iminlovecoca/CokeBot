const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const { checkAndSetCooldown, notifyCooldown } = require("../../../utils/cooldown");
const {
  addRpgGearToUser,
  addRpgExp,
  calculateRpgPower,
  generateRpgGearDrop,
  getRpgClass,
  getRpgXpNeeded,
  hasRpgCharacter,
  pickRpgHuntGround,
  getEffectiveRpgStats,
  getItemImageFile,
} = require("../../../utils/rpgUtil");
const { getRarityEmoji, getSlotEmoji, getSlotLabel, getRpgColor, formatRpgTitle } = require("../../../utils/rpgUi");
class HuntCommand extends BaseCommand {
  constructor() {
    super({
      name: "hunt",
      aliases: ["h"],
      description: "Đi săn để tăng EXP RPG và có tỉ lệ rớt trang bị.",
      usage: `${config.prefix}hunt`,
      examples: [
        { intent: "Đi săn", command: `${config.prefix}hunt` },
        { intent: "Đi săn bằng alias", command: `${config.prefix}h` },
      ],
      cooldown: 0
    });
  }
  async execute(message) {
    const user = await getUser(message.author.id);
    if (!hasRpgCharacter(user)) {
      const classCommand = message.client.commands.get("class");
      return classCommand.execute(message, []);
    }
    const cooldownSeconds = Math.floor(
      (config.rpg.hunt_cooldown_ms || 10000) / 1000,
    );
    const remaining = checkAndSetCooldown(
      message.author.id,
      "hunt",
      cooldownSeconds,
    );
    if (remaining > 0) {
      return notifyCooldown(message, remaining);
    }
    const rpgClass = getRpgClass(user.rpg.classKey);
    const huntGround = pickRpgHuntGround();
    const effectiveStats = getEffectiveRpgStats(user);
    const luck = effectiveStats.arc || 0;
    const expBonus = rpgClass.bonuses?.expGain || 0;
    const variance = 0.85 + Math.random() * 0.3;
    const expGain = Math.floor(
      config.rpg.hunt_base_exp * variance * (1 + expBonus + luck * 0.003),
    );
    const droppedItem = await generateRpgGearDrop(user);
    const cokeGain = 50 + Math.floor(Math.random() * 125);
    const previousLevel = user.rpg.level;
    const levelsGained = addRpgExp(user.rpg, expGain);
    addRpgGearToUser(user, droppedItem);
    user.coke += cokeGain;
    user.rpg.power = calculateRpgPower(user);
    user.rpg.lastHuntAt = new Date();
    const { updateQuestProgress } = require("../../../utils/questUtil");
    await updateQuestProgress(user, "exp_gain", expGain, message.channel);
    if (droppedItem) {
      await updateQuestProgress(user, "hunt_loot", 1, message.channel, { rarity: droppedItem.rarity });
    }
    const characterName = user.rpg.name || message.member?.displayName || message.author.username;
    let text = `**${characterName}** đã hoàn thành chuyến săn.\n` +
      `Khu vực: **${huntGround.name}**\n` +
      `${rpgClass.name}: **+${expGain.toLocaleString()} EXP** • **+${cokeGain.toLocaleString()} Coke**`;
    const { rollHuntPetDrop, generatePetStats } = require("../../../data/pets");
    const { getHuntXp, getDuplicatePetXp, addPetXp: addPetXpUtil } = require("../../../utils/petXpUtil");
    if (user.rpg.equippedPet) {
      const rarity = droppedItem ? droppedItem.rarity : "Common";
      const petHuntXp = getHuntXp(rarity);
      addPetXpUtil(user.rpg.equippedPet, petHuntXp, user);
      user.markModified("rpg");
    }
    const caughtSpecies = rollHuntPetDrop();
    let petText = "";
    if (caughtSpecies) {
      user.rpg.pets = user.rpg.pets || [];
      const isAlreadyOwned = user.rpg.pets.some((p) => p.key === caughtSpecies.key);
      if (isAlreadyOwned) {
        const expBonus = getDuplicatePetXp(caughtSpecies.tier);
        if (user.rpg.equippedPet) {
          const petRes = addPetXpUtil(user.rpg.equippedPet, expBonus, user);
          user.markModified("rpg");
          petText = `\nLinh thú trùng: ${caughtSpecies.emoji} **${caughtSpecies.name}** • ${user.rpg.equippedPet.emoji} nhận **+${expBonus} EXP**${petRes.leveledUp ? ` • Lên cấp **${user.rpg.equippedPet.level}**` : ""}`;
        } else {
          petText = `\nLinh thú trùng: ${caughtSpecies.emoji} **${caughtSpecies.name}** • Trang bị linh thú để nhận **+${expBonus} EXP**`;
        }
      } else {
        const newPet = {
          id: `pet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          key: caughtSpecies.key,
          name: caughtSpecies.name,
          nickname: caughtSpecies.name,
          tier: caughtSpecies.tier,
          emoji: caughtSpecies.emoji,
          level: 1,
          exp: 0,
          stats: generatePetStats(caughtSpecies),
          createdAt: new Date(),
        };
        user.rpg.pets.push(newPet);
        if (!user.rpg.equippedPet) {
          user.rpg.equippedPet = newPet;
        }
        user.markModified("rpg");
        petText = `\nLinh thú mới: ${caughtSpecies.emoji} **${caughtSpecies.name}**`;
      }
    }
    if (droppedItem) {
      const slotVi = getSlotLabel(droppedItem.slot).toLowerCase();
      const rank = getRarityEmoji(droppedItem.rarity);
      const emoji = droppedItem.emoji || getSlotEmoji(droppedItem.slot);
      text += `\nNhặt được ${slotVi}: ${rank} ${emoji} **${droppedItem.subType}** (\`G${String(droppedItem.id).padStart(3, "0")}\`)`;
    }
    if (petText) {
      text += petText;
    }
    if (levelsGained > 0) {
      text += `\nLên cấp: **${previousLevel} → ${user.rpg.level}**`;
    }
    await user.save();
    const embed = new EmbedBuilder()
      .setColor(rpgClass.color || getRpgColor("brand"))
      .setTitle(formatRpgTitle("Kết quả chuyến săn", "🏹"))
      .setDescription(text)
      .addFields(
        { name: "Lực chiến", value: `**${user.rpg.power.toLocaleString()}**`, inline: true },
        { name: "Cấp độ", value: `**${user.rpg.level}**`, inline: true },
      );
    return message.reply({ embeds: [embed] });
  }
}
module.exports = new HuntCommand();
