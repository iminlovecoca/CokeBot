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
} = require("../../utils/rpgUtil");


module.exports = {
  name: "hunt",
  aliases: ["h"],
  description: "Đi săn để tăng EXP RPG và có tỉ lệ rớt trang bị.",
  usage: `${config.prefix}hunt`,
  examples: [
    { intent: "Đi săn", command: `${config.prefix}hunt` },
    { intent: "Đi săn bằng alias", command: `${config.prefix}h` },
  ],

  async execute(message) {
    const user = await getUser(message.author.id);

    if (!hasRpgCharacter(user)) {
      const classCommand = message.client.commands.get("class");
      return classCommand.execute(message, []);
    }

    const cooldownSeconds = Math.floor((config.rpg.hunt_cooldown_ms || 10000) / 1000);
    const remaining = checkAndSetCooldown(message.author.id, "hunt", cooldownSeconds);
    if (remaining > 0) {
      return notifyCooldown(message, remaining);
    }

    const rpgClass = getRpgClass(user.rpg.classKey);
    const huntGround = pickRpgHuntGround();
    const effectiveStats = getEffectiveRpgStats(user);
    const luck = effectiveStats.luck || 0;
    const expBonus = rpgClass.bonuses?.expGain || 0;
    const variance = 0.85 + Math.random() * 0.3;

    const expGain = Math.floor(
      config.rpg.hunt_base_exp * variance * (1 + expBonus + luck * 0.003),
    );
    const droppedItem = generateRpgGearDrop(user);

    const previousLevel = user.rpg.level;
    const levelsGained = addRpgExp(user.rpg, expGain);
    addRpgGearToUser(user, droppedItem);
    user.rpg.power = calculateRpgPower(user);
    user.rpg.lastHuntAt = new Date();

    await user.save();

    const embed = new EmbedBuilder()
      .setColor(rpgClass.color)
      .setTitle(`${rpgClass.name} đã hoàn thành một chuyến hunt`)
      .setDescription(
        droppedItem
          ? `${huntGround.emoji} **${huntGround.name}** rơi ra **${droppedItem.name}** ID \`${droppedItem.id}\`. Dùng \`${config.prefix}equip ${droppedItem.id}\` để mặc hoặc \`${config.prefix}sellgear ${droppedItem.id}\` để bán.`
          : `${huntGround.emoji} **${huntGround.name}** đã bị dọn sạch. Bạn nhận được EXP nhân vật.`,
      )
      .addFields(
        {
          name: "Nhận được",
          value: `EXP RPG: **+${expGain.toLocaleString()}**`,
          inline: true,
        },
        {
          name: "Nhân vật",
          value:
            `Level: **${user.rpg.level}**\n` +
            `Rank: **${user.rpg.rank}**\n` +
            `Power: **${Math.floor(user.rpg.power).toLocaleString()}**\n` +
            `EXP: **${user.rpg.exp}/${getRpgXpNeeded(user.rpg.level)}**`,
          inline: true,
        },
      );

    if (droppedItem) {
      embed.addFields({
        name: "Trang bị rơi",
        value:
          `Slot: **${config.rpg.gear_slot_names[droppedItem.slot]}**\n` +
          `Rarity: **${droppedItem.rarity}**\n` +
          `Power khi mặc: **+${droppedItem.power.toLocaleString()}**\n` +
          `Giá bán: **${droppedItem.sellPrice.toLocaleString()} Coke**\n` +
          `Image key tạm: \`${droppedItem.imageKey}\``,
        inline: true,
      });
    }

    if (levelsGained > 0) {
      embed.addFields({
        name: "Level Up",
        value: `Bạn đã lên từ level **${previousLevel}** thành **${user.rpg.level}**.`,
      });
    }

    return message.reply({ embeds: [embed] });
  },
};
