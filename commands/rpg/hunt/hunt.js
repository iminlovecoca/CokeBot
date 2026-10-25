const BaseCommand = require("../../../core/BaseCommand");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const { checkAndSetCooldown, notifyCooldown } = require("../../../utils/cooldown");
const {
  addRpgExp,
  calculateRpgPower,
  getRpgClass,
  hasRpgCharacter,
  pickRpgHuntGround,
  getEffectiveRpgStats,
} = require("../../../utils/rpgUtil");
const { rollAnimal, addAnimalToUserZoo } = require("../../../data/animals");
const { getHuntXp, getDuplicatePetXp, addPetXp: addPetXpUtil } = require("../../../utils/petXpUtil");

class HuntCommand extends BaseCommand {
  constructor() {
    super({
      name: "hunt",
      aliases: ["h"],
      description: "Đi săn thú bổ sung vào Zoo, nhận EXP và 30% tỉ lệ rơi Hộp Vũ Khí (wc).",
      usage: `${config.prefix}hunt`,
      examples: [
        { intent: "Đi săn", command: `${config.prefix}hunt` },
        { intent: "Đi săn bằng alias", command: `${config.prefix}h` },
      ],
      cooldown: 0,
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

    // 1. OwO-Style Animal Catch (no direct money drop; sell animals via xsell)
    const luckMultiplier = 1 + luck * 0.004;
    const caughtAnimal = rollAnimal(luckMultiplier);
    const { isNewSpecies } = addAnimalToUserZoo(user, caughtAnimal, 1);

    // Character EXP scales with base hunt EXP + caught animal rank XP
    const expGain = Math.floor(
      (config.rpg.hunt_base_exp + (caughtAnimal.xp || 15)) *
        variance *
        (1 + expBonus + luck * 0.003),
    );

    // 2. Weapon Crate (wc) 30% drop chance
    const wcDropped = Math.random() < 0.30;
    if (wcDropped) {
      if (!user.inventory) user.inventory = new Map();
      const curWc = user.inventory.get("wc") || 0;
      user.inventory.set("wc", curWc + 1);
      user.markModified("inventory");
    }

    // 3. Equipped Pet XP (Base Hunt XP + Duplicate Bonus if species already owned)
    let totalPetXp = 0;
    let petLeveledUp = false;
    const animalTier = caughtAnimal.rankName || caughtAnimal.tier || "Common";
    if (user.rpg.equippedPet) {
      const basePetXp = getHuntXp(animalTier);
      const dupPetXp = isNewSpecies ? 0 : getDuplicatePetXp(animalTier);
      totalPetXp = basePetXp + dupPetXp;
      const petRes = addPetXpUtil(user.rpg.equippedPet, totalPetXp, user);
      petLeveledUp = Boolean(petRes?.leveledUp);
      user.markModified("rpg");
    }

    const previousLevel = user.rpg.level;
    const levelsGained = addRpgExp(user.rpg, expGain);
    user.rpg.power = calculateRpgPower(user);
    user.rpg.lastHuntAt = new Date();

    const { updateQuestProgress } = require("../../../utils/questUtil");
    await updateQuestProgress(user, "exp_gain", expGain, message.channel);
    if (wcDropped) {
      await updateQuestProgress(user, "hunt_loot", 1, message.channel, { rarity: "Epic" });
    }

    const characterName = user.rpg.name || message.member?.displayName || message.author.username;
    const blankEmo = config.emoji.blank || "";

    let text =
      `🌿 **| ${characterName}** đi săn tại ${huntGround.emoji} **${huntGround.name}** và bắt được một con ${caughtAnimal.rankEmoji} ${caughtAnimal.emoji} **${caughtAnimal.name}**!\n` +
      `${blankEmo} **| ${rpgClass.name}** nhận **+${expGain.toLocaleString()} EXP**`;

    if (user.rpg.equippedPet && totalPetXp > 0) {
      text += ` • ${user.rpg.equippedPet.emoji} **+${totalPetXp.toLocaleString()} EXP**${petLeveledUp ? ` (**Lên cấp ${user.rpg.equippedPet.level}!**)` : ""}`;
    }

    if (isNewSpecies) {
      text += `\n${blankEmo} **|** ✨ **Thu phục loài mới!** Bạn đã mở khóa Linh Thú ${caughtAnimal.rankEmoji} ${caughtAnimal.emoji} **${caughtAnimal.name}**!`;
    }

    if (wcDropped) {
      text += `\n${blankEmo} **|** <:crate:1512793698025603282> Tìm thấy **1x Hộp Vũ Khí (wc)**! Dùng lệnh \`${config.prefix}wc\` để mở trang bị ngẫu nhiên.`;
    }

    if (levelsGained > 0) {
      text += `\n${blankEmo} **|** 🎉 **Lên cấp!** Bạn đã lên từ level **${previousLevel}** thành **${user.rpg.level}**.`;
    }

    await user.save();
    return message.reply({ content: text });
  }
}

module.exports = new HuntCommand();
