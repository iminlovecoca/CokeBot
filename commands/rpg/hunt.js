const BaseCommand = require("../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../data/config");
const { getUser } = require("../../utils/userUtil");
const { checkAndSetCooldown, notifyCooldown } = require("../../utils/cooldown");
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
} = require("../../utils/rpgUtil");

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

    
    const { updateQuestProgress } = require("../../utils/questUtil");
    await updateQuestProgress(message.author.id, "exp_gain", expGain, message.channel);
    if (droppedItem) {
      await updateQuestProgress(message.author.id, "hunt_loot", 1, message.channel, { rarity: droppedItem.rarity });
    }

    const characterName = user.rpg.name || message.member?.displayName || message.author.username;
    const blankEmo = config.emoji.blank || "";

    let text = `:bow_and_arrow: **| ${characterName}** đã hoàn thành một chuyến đi săn!\n` +
      `${blankEmo} **|** ${huntGround.emoji} ${huntGround.name} đã bị dọn sạch\n` +
      `${blankEmo} **| ${rpgClass.name}** nhận **${expGain.toLocaleString()}xp**, **${cokeGain.toLocaleString()} coke**`;

    // Check for Pet Catch during hunt
    const { rollHuntPetDrop, generatePetStats } = require("../../data/pets");
    const { getHuntXp, getXpRequired, addPetXp: addPetXpUtil } = require("../../utils/petXpUtil");

    // 1. Award Base Hunt XP to equipped pet based on creature/loot rarity
    if (user.rpg.equippedPet) {
      const rarity = droppedItem ? droppedItem.rarity : "Common";
      const petHuntXp = getHuntXp(rarity);
      addPetXpUtil(user.rpg.equippedPet, petHuntXp);
      user.markModified("rpg");
    }

    // 2. Process Pet Catch/Roll during hunt
    const caughtSpecies = rollHuntPetDrop();
    let petText = "";

    if (caughtSpecies) {
      user.rpg.pets = user.rpg.pets || [];
      const isAlreadyOwned = user.rpg.pets.some((p) => p.key === caughtSpecies.key);

      if (isAlreadyOwned) {
        // Duplicate Pet -> Grant +35% of current needed EXP specifically to the EQUIPPED PET!
        if (user.rpg.equippedPet) {
          const neededExp = getXpRequired(user.rpg.equippedPet.level || 1);
          const expBonus = Math.max(10, Math.floor(neededExp * 0.35));
          const petRes = addPetXpUtil(user.rpg.equippedPet, expBonus);
          user.markModified("rpg");

          petText = `\n${blankEmo} **|** 🐾 Bắt gặp lại ${caughtSpecies.emoji} **${caughtSpecies.name}**! Linh thú đang trang bị ${user.rpg.equippedPet.emoji} nhận **+35% EXP** (+\`${expBonus.toLocaleString()} EXP\`)!${petRes.leveledUp ? ` 🆙 **Lên Cấp ${user.rpg.equippedPet.level}!**` : ""}`;
        } else {
          petText = `\n${blankEmo} **|** 🐾 Bắt gặp lại ${caughtSpecies.emoji} **${caughtSpecies.name}**! (Trang bị Linh thú để nhận +35% EXP)`;
        }
      } else {
        // New Pet species caught!
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

        petText = `\n${blankEmo} **|** 🎉 **BẮT ĐƯỢC LINH THÚ MỚI!** Bạn đã thu phục ${caughtSpecies.emoji} **${caughtSpecies.name}** (${caughtSpecies.tier})!`;
      }
    }

    if (droppedItem) {
      const bracketEmoji = {
        Common: "<:common:1530878565489311826>",
        Rare: "<:rare:1530878574104547378>",
        Epic: "<:epic:1530878567955566642>",
        Legendary: "<:legendary:1530878570858287205>",
        Mythic: "<a:mythic:1530878614843686912>",
        Ancient: "<a:ancient:1530878606656540814>",
        Divine: "<a:divine:1530878610515165365>",
      };
      const slotEmoji = {
        weapon: "🗡️",
        armor: "🛡️",
        helmet: "🪖",
        boots: "🥾",
        ring: "💍",
        necklace: "📿",
      };
      const slotVi = {
        weapon: "vũ khí",
        armor: "giáp",
        helmet: "mũ",
        boots: "giày",
        ring: "nhẫn",
        necklace: "dây chuyền"
      }[droppedItem.slot] || "trang bị";

      const rank = bracketEmoji[droppedItem.rarity] || "";
      const emoji = droppedItem.emoji || slotEmoji[droppedItem.slot] || "🛡️";

      text += `\n${blankEmo} **|** Bạn tìm thấy ${slotVi} ${rank} ${emoji} **${droppedItem.subType}** (ID: \`${droppedItem.id}\`)`;
    }

    if (petText) {
      text += petText;
    }

    if (levelsGained > 0) {
      text += `\n${blankEmo} **|** 🆙 **LÊN CẤP!** Bạn đã lên từ level **${previousLevel}** thành **${user.rpg.level}**.`;
    }

    // Save updated user data (including new pets, pet exp, gear, and stats) to Database
    await user.save();

    return message.reply({ content: text });
  }
}

module.exports = new HuntCommand();
