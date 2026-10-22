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
const { rollAnimal } = require("../../../data/animals");

class HuntCommand extends BaseCommand {
  constructor() {
    super({
      name: "hunt",
      aliases: ["h"],
      description: "Đi săn thú phong cách OwO, nhận EXP, Coke, Zoo Points và 30% tỉ lệ rơi Hộp Vũ Khí (wc).",
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
    const expGain = Math.floor(
      config.rpg.hunt_base_exp * variance * (1 + expBonus + luck * 0.003),
    );
    const cokeGain = 50 + Math.floor(Math.random() * 125);

    // 1. OwO-Style Animal Catch
    const caughtAnimal = rollAnimal();
    user.zoo = user.zoo || {};
    if (!user.zoo[caughtAnimal.key]) {
      user.zoo[caughtAnimal.key] = { count: 0, totalCount: 0 };
    } else if (typeof user.zoo[caughtAnimal.key] === "number") {
      user.zoo[caughtAnimal.key] = {
        count: user.zoo[caughtAnimal.key],
        totalCount: user.zoo[caughtAnimal.key],
      };
    }
    user.zoo[caughtAnimal.key].count += 1;
    user.zoo[caughtAnimal.key].totalCount += 1;
    user.zooPoints = (user.zooPoints || 0) + (caughtAnimal.points || 1);
    user.markModified("zoo");

    // 2. Weapon Crate (wc) 30% drop chance (no direct gear drops)
    const wcDropped = Math.random() < 0.30;
    if (wcDropped) {
      if (!user.inventory) user.inventory = new Map();
      const curWc = user.inventory.get("wc") || 0;
      user.inventory.set("wc", curWc + 1);
      user.markModified("inventory");
    }

    const previousLevel = user.rpg.level;
    const levelsGained = addRpgExp(user.rpg, expGain);
    user.coke += cokeGain;
    user.rpg.power = calculateRpgPower(user);
    user.rpg.lastHuntAt = new Date();

    const { updateQuestProgress } = require("../../../utils/questUtil");
    await updateQuestProgress(user, "exp_gain", expGain, message.channel);
    if (wcDropped) {
      await updateQuestProgress(user, "hunt_loot", 1, message.channel, { rarity: "Epic" });
    }

    const characterName = user.rpg.name || message.member?.displayName || message.author.username;
    const blankEmo = config.emoji.blank || "";

    let text = `🌿 **| ${characterName}** đã hoàn thành chuyến đi săn tại ${huntGround.emoji} **${huntGround.name}**!\n` +
      `${blankEmo} **|** Bắt được thú ${caughtAnimal.emoji} **${caughtAnimal.name}** (\`${caughtAnimal.rankName}\` | **+${caughtAnimal.points}** Zoo Points)!\n` +
      `${blankEmo} **| ${rpgClass.name}** nhận **+${expGain.toLocaleString()} EXP**, **+${cokeGain.toLocaleString()} Coke**`;

    if (wcDropped) {
      text += `\n${blankEmo} **|** <:crate:1512793698025603282> Tìm thấy **1x Hộp Vũ Khí (wc)**! Dùng lệnh \`${config.prefix}wc\` để mở trang bị ngẫu nhiên.`;
    }

    // RPG Pet interaction
    const { rollHuntPetDrop, generatePetStats, PET_TIERS } = require("../../../data/pets");
    const { getHuntXp, getDuplicatePetXp, addPetXp: addPetXpUtil } = require("../../../utils/petXpUtil");
    if (user.rpg.equippedPet) {
      const petHuntXp = getHuntXp(caughtAnimal.rankName || "Common");
      addPetXpUtil(user.rpg.equippedPet, petHuntXp, user);
      user.markModified("rpg");
    }

    const caughtSpecies = rollHuntPetDrop();
    let petText = "";
    if (caughtSpecies) {
      user.rpg.pets = user.rpg.pets || [];
      const isAlreadyOwned = user.rpg.pets.some((p) => p.key === caughtSpecies.key);
      if (isAlreadyOwned) {
        const tierEmo = PET_TIERS[caughtSpecies.tier]?.emoji || "";
        const expBonus = getDuplicatePetXp(caughtSpecies.tier);
        if (user.rpg.equippedPet) {
          const petRes = addPetXpUtil(user.rpg.equippedPet, expBonus, user);
          user.markModified("rpg");
          petText = `\n${blankEmo} **|** Bắt gặp lại ${tierEmo} ${caughtSpecies.emoji} **${caughtSpecies.name}**! Linh thú đang trang bị ${user.rpg.equippedPet.emoji} nhận **+${expBonus} EXP**!${petRes.leveledUp ? ` **Lên cấp ${user.rpg.equippedPet.level}!**` : ""}`;
        } else {
          petText = `\n${blankEmo} **|** Bắt gặp lại ${tierEmo} ${caughtSpecies.emoji} **${caughtSpecies.name}**! (Trang bị linh thú để nhận **+${expBonus} EXP**)`;
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
        const tierEmo = PET_TIERS[caughtSpecies.tier]?.emoji || "";
        petText = `\n${blankEmo} **|** **Bắt được linh thú mới!** Bạn đã thu phục ${tierEmo} ${caughtSpecies.emoji} **${caughtSpecies.name}**!`;
      }
    }

    if (petText) {
      text += petText;
    }
    if (levelsGained > 0) {
      text += `\n${blankEmo} **|** **Lên cấp!** Bạn đã lên từ level **${previousLevel}** thành **${user.rpg.level}**.`;
    }

    await user.save();
    return message.reply({ content: text });
  }
}

module.exports = new HuntCommand();
