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
const {
  consumeGemsOnHunt,
  formatActiveGemsBadges,
  ensureUserGems,
} = require("../../../utils/gemUtil");

class HuntCommand extends BaseCommand {
  constructor() {
    super({
      name: "hunt",
      aliases: ["h"],
      description: "Đi săn thú bổ sung vào Zoo, nhận EXP và 30% tỉ lệ rơi Hộp Vũ Khí (wc). Hỗ trợ ngọc săn thú chuẩn OwO.",
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

    // 1. OwO Gems System Integration
    ensureUserGems(user);
    const huntGems = user.huntGems;
    const huntingGem = huntGems.hunting && huntGems.hunting.durability > 0 ? huntGems.hunting : null;
    const empoweringGem = huntGems.empowering && huntGems.empowering.durability > 0 ? huntGems.empowering : null;
    const luckyGem = huntGems.lucky && huntGems.lucky.durability > 0 ? huntGems.lucky : null;
    const specialGem = huntGems.special && huntGems.special.durability > 0 ? huntGems.special : null;

    // Number of animals to catch
    const baseCatchCount = 1 + (huntingGem ? (huntingGem.bonusAnimals || 0) : 0);
    const isDoubled = Boolean(empoweringGem);
    const totalAnimalsToCatch = isDoubled ? baseCatchCount * 2 : baseCatchCount;

    // Luck multiplier calculation
    const baseLuck = 1 + luck * 0.004;
    const luckyBonus = luckyGem ? (luckyGem.luckMultiplier || 0) : 0;
    const luckMultiplier = baseLuck * (1 + luckyBonus);
    const specialMultiplier = specialGem ? (specialGem.specialMultiplier || 1) : 1;

    // 2. Animal Catching Loop
    const caughtAnimals = [];
    const caughtMap = new Map(); // key -> { animal, count }
    let totalRankXp = 0;
    const newSpeciesList = [];

    for (let i = 0; i < totalAnimalsToCatch; i++) {
      const caught = rollAnimal(luckMultiplier, specialMultiplier);
      caughtAnimals.push(caught);
      totalRankXp += (caught.xp || 15);

      const existing = caughtMap.get(caught.key);
      if (existing) {
        existing.count += 1;
      } else {
        caughtMap.set(caught.key, { animal: caught, count: 1 });
      }
    }

    // Add caught animals to user.zoo and sync with rpg pets
    for (const [, { animal, count }] of caughtMap.entries()) {
      const { isNewSpecies } = addAnimalToUserZoo(user, animal, count);
      if (isNewSpecies) {
        newSpeciesList.push(animal);
      }
    }

    // Character EXP scales with base hunt EXP + caught animal rank XP
    const expGain = Math.floor(
      (config.rpg.hunt_base_exp + totalRankXp) *
        variance *
        (1 + expBonus + luck * 0.003),
    );

    // 3. Weapon Crate (wc) 30% drop chance
    const wcDropped = Math.random() < 0.30;
    if (wcDropped) {
      if (!user.inventory) user.inventory = new Map();
      const curWc = user.inventory.get("wc") || 0;
      user.inventory.set("wc", curWc + 1);
      user.markModified("inventory");
    }

    // 4. Equipped Pet XP (Base Hunt XP + Duplicate Bonus if species already owned)
    let totalPetXp = 0;
    let petLeveledUp = false;
    if (user.rpg.equippedPet) {
      for (const [key, { animal, count }] of caughtMap.entries()) {
        const animalTier = animal.rankName || animal.tier || "Common";
        const isNew = newSpeciesList.some((s) => s.key === key);
        const basePetXp = getHuntXp(animalTier);
        const dupPetXp = isNew ? 0 : getDuplicatePetXp(animalTier);
        totalPetXp += (basePetXp + dupPetXp) * count;
      }
      if (totalPetXp > 0) {
        const petRes = addPetXpUtil(user.rpg.equippedPet, totalPetXp, user);
        petLeveledUp = Boolean(petRes?.leveledUp);
        user.markModified("rpg");
      }
    }

    // 5. Consume Gem Durability (OwO Rules)
    const { brokenGems } = consumeGemsOnHunt(user, totalAnimalsToCatch, baseCatchCount);

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

    // 6. Format Hunt Output Message
    let text = "";
    if (totalAnimalsToCatch === 1) {
      const single = caughtAnimals[0];
      text += `🌿 **| ${characterName}** đi săn tại ${huntGround.emoji} **${huntGround.name}** và bắt được một con ${single.rankEmoji} ${single.emoji} **${single.name}**!\n`;
    } else {
      const summaryList = Array.from(caughtMap.values())
        .sort((a, b) => (b.animal.price || 0) - (a.animal.price || 0))
        .map(({ animal, count }) => `${count > 1 ? `**${count}x** ` : ""}${animal.rankEmoji} ${animal.emoji} **${animal.name}**`)
        .join(", ");
      text += `🌿 **| ${characterName}** đi săn tại ${huntGround.emoji} **${huntGround.name}** và bắt được **${totalAnimalsToCatch} con thú**:\n> ${summaryList}\n`;
    }

    text += `${blankEmo} **| ${rpgClass.name}** nhận **+${expGain.toLocaleString()} EXP**`;

    if (user.rpg.equippedPet && totalPetXp > 0) {
      text += ` • ${user.rpg.equippedPet.emoji} **+${totalPetXp.toLocaleString()} EXP**${petLeveledUp ? ` (**Lên cấp ${user.rpg.equippedPet.level}!**)` : ""}`;
    }

    if (newSpeciesList.length > 0) {
      const newAnimalsText = newSpeciesList
        .map((a) => `${a.rankEmoji} ${a.emoji} **${a.name}**`)
        .join(", ");
      text += `\n${blankEmo} **|** ✨ **Thu phục loài mới!** Bạn đã mở khóa: ${newAnimalsText}!`;
    }

    if (wcDropped) {
      text += `\n${blankEmo} **|** <:crate:1512793698025603282> Tìm thấy **1x Hộp Vũ Khí (wc)**! Dùng lệnh \`${config.prefix}wc\` để mở trang bị ngẫu nhiên.`;
    }

    if (levelsGained > 0) {
      text += `\n${blankEmo} **|** 🎉 **Lên cấp!** Bạn đã lên từ level **${previousLevel}** thành **${user.rpg.level}**.`;
    }

    // Active gem badges bar (OwO Style)
    const activeBadges = formatActiveGemsBadges(user);
    if (activeBadges) {
      text += `\n${blankEmo} **|** 💎 ${activeBadges}`;
    }

    // Broken gem notices
    if (brokenGems && brokenGems.length > 0) {
      for (const broken of brokenGems) {
        text += `\n💥 **|** Viên ${broken.emoji} **${broken.nameVi || broken.name}** (\`#${broken.id}\`) của bạn đã cạn độ bền và vỡ vụn!`;
      }
    }

    await user.save();
    return message.reply({ content: text });
  }
}

module.exports = new HuntCommand();
