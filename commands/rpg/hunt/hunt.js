const BaseCommand = require("../../../core/BaseCommand");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const { checkAndSetCooldown, notifyCooldown } = require("../../../utils/cooldown");
const {
  addRpgExp,
  calculateRpgPower,
  getRpgClass,
  hasRpgCharacter,
  getEffectiveRpgStats,
} = require("../../../utils/rpgUtil");
const { rollAnimal, addAnimalToUserZoo } = require("../../../data/animals");
const { getHuntXp, getDuplicatePetXp, addPetXp: addPetXpUtil } = require("../../../utils/petXpUtil");
const {
  consumeGemsOnHunt,
  ensureUserGems,
} = require("../../../utils/gemUtil");

class HuntCommand extends BaseCommand {
  constructor() {
    super({
      name: "hunt",
      aliases: ["h"],
      description: "Đi săn thú bổ sung vào Zoo, nhận EXP và nhận Hộp Quà (Lootbox) chuẩn OwO.",
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

    // Snapshot of active gems before hunt to show empowered status
    const activeGemsBefore = [];
    const checkOrder = ["hunting", "empowering", "lucky", "special"];
    for (const key of checkOrder) {
      const g = huntGems[key];
      if (g && g.durability > 0) {
        activeGemsBefore.push({ ...g });
      }
    }

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

    // 3. Daily Lootbox (lb) Drop Tracking (1st 100%, 2nd/3rd 5%, max 3/day)
    const todayDate = new Date().toISOString().slice(0, 10);
    if (!user.rpg.dailyDrops || typeof user.rpg.dailyDrops !== "object" || user.rpg.dailyDrops.date !== todayDate) {
      user.rpg.dailyDrops = {
        date: todayDate,
        huntLbCount: 0,
        battleWcCount: user.rpg?.dailyDrops?.date === todayDate ? (user.rpg.dailyDrops.battleWcCount || 0) : 0,
      };
    }

    let lbDropped = false;
    if (user.rpg.dailyDrops.huntLbCount === 0) {
      lbDropped = true;
      user.rpg.dailyDrops.huntLbCount = 1;
    } else if (user.rpg.dailyDrops.huntLbCount < 3) {
      if (Math.random() < 0.05) {
        lbDropped = true;
        user.rpg.dailyDrops.huntLbCount += 1;
      }
    }

    if (lbDropped) {
      if (!user.inventory) user.inventory = new Map();
      const curLb =
        user.inventory instanceof Map
          ? user.inventory.get("lootbox") || user.inventory.get("lb") || 0
          : user.inventory.lootbox || user.inventory.lb || 0;
      if (user.inventory instanceof Map) {
        user.inventory.set("lootbox", curLb + 1);
      } else {
        user.inventory.lootbox = curLb + 1;
      }
      user.markModified("inventory");
      user.markModified("rpg");
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
    if (lbDropped) {
      await updateQuestProgress(user, "hunt_loot", 1, message.channel, { rarity: "Epic" });
    }

    const characterName = user.rpg.name || message.member?.displayName || message.author.username;

    // 6. Format Hunt Output Message (Image 2 OwO UI)
    const lines = [];

    // Line 1: Empowered header if gems were active
    if (activeGemsBefore.length > 0) {
      const gemBadges = activeGemsBefore
        .map((bg) => {
          const currentGem = user.huntGems[bg.type];
          const remaining = currentGem ? Math.max(0, currentGem.durability) : 0;
          const maxD = bg.maxDurability || bg.durability || 100;
          return `${bg.emoji} [${remaining}/${maxD}]`;
        })
        .join(" ");
      lines.push(`🌱 **| ${characterName}**, chuyến đi săn được cường hóa bởi ${gemBadges} !`);
    } else {
      lines.push(`🌱 **| ${characterName}** đi săn thú...`);
    }

    const blank = config.emoji.blank;

    // Line 2: Caught animal emojis (Image 2 style)
    const animalsEmojiStr = caughtAnimals.map((a) => a.emoji).join(" ");
    lines.push(`${blank} **|** Bạn đã bắt được: ${animalsEmojiStr}`);

    // Line 3: Pet / Character XP
    if (user.rpg.equippedPet) {
      const petEmoji = user.rpg.equippedPet.emoji || "🐾";
      lines.push(
        `${blank} **|** ${petEmoji} nhận được **${(totalPetXp || expGain).toLocaleString()}xp**!${petLeveledUp ? ` (**Lên cấp ${user.rpg.equippedPet.level}!**)` : ""}`,
      );
    } else {
      lines.push(`${blank} **|** Nhận được **${expGain.toLocaleString()}xp**!`);
    }

    // New species unlocked
    if (newSpeciesList.length > 0) {
      const newAnimalsText = newSpeciesList
        .map((a) => `${a.rankEmoji} ${a.emoji} **${a.name}**`)
        .join(", ");
      lines.push(`${blank} **|** ✨ **Mở khóa loài mới:** ${newAnimalsText}!`);
    }

    // Lootbox drop
    if (lbDropped) {
      const lbEmoji = "<:lootbox:1563961108727992470>";
      lines.push(`${lbEmoji} **|** Bạn nhận được **1x Hộp Quà (Lootbox)**! Dùng lệnh \`${config.prefix}lb\` để mở.`);
    }

    // Level up
    if (levelsGained > 0) {
      lines.push(`${blank} **|** 🎉 **Lên cấp!** Bạn đã lên từ cấp **${previousLevel}** thành **${user.rpg.level}**.`);
    }

    // Broken gems notice
    if (brokenGems && brokenGems.length > 0) {
      for (const broken of brokenGems) {
        lines.push(
          `${blank} **|** 💥 Viên ${broken.emoji} **${broken.nameVi || broken.name}** (\`#${broken.id}\`) của bạn đã cạn độ bền và vỡ vụn!`,
        );
      }
    }

    await user.save();
    return message.reply({ content: lines.join("\n") });
  }
}

module.exports = new HuntCommand();
