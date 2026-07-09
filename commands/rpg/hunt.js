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

    await user.save();

    
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

    if (droppedItem) {
      const bracketEmoji = {
        Common: "<:Common:1390024590347997245>",
        Rare: "<:Rare:1390024624380706916>",
        Epic: "<:Epic:1390024749517770832>",
        Legendary: "<:Legendary:1390024772200567026>",
        Mythic: "<:Mythic:1390024789279772833>",
        Ancient: "<:Ancient:1390024806535004333>",
        Divine: "<:Divine:1512512382507683880>",
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

    if (levelsGained > 0) {
      text += `\n${blankEmo} **|** 🆙 **LÊN CẤP!** Bạn đã lên từ level **${previousLevel}** thành **${user.rpg.level}**.`;
    }

    return message.reply({ content: text });
  }
}

module.exports = new HuntCommand();
