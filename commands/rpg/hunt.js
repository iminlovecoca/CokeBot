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

    // Quest triggers
    const { updateQuestProgress } = require("../../utils/questUtil");
    await updateQuestProgress(message.author.id, "exp_gain", expGain, message.channel);
    if (droppedItem) {
      await updateQuestProgress(message.author.id, "hunt_loot", 1, message.channel, { rarity: droppedItem.rarity });
    }

    const embed = new EmbedBuilder()
      .setColor(rpgClass.color)
      .setTitle(
        user.rpg.name
          ? `👤 ${user.rpg.name} (${rpgClass.name}) đã hoàn thành một chuyến hunt`
          : `${rpgClass.name} đã hoàn thành một chuyến hunt`,
      )
      .setDescription(
        droppedItem
          ? `${huntGround.emoji} **${huntGround.name}** rơi ra **${droppedItem.name}** ID \`${droppedItem.id}\`. Dùng \`${config.prefix}equip ${droppedItem.id}\` để mặc hoặc \`${config.prefix}sellgear ${droppedItem.id}\` để bán.`
          : `${huntGround.emoji} **${huntGround.name}** đã bị dọn sạch. Bạn nhận được EXP nhân vật.`,
      )
      .addFields(
        {
          name: "Nhận được",
          value:
            `EXP RPG: **+${expGain.toLocaleString()}**\n` +
            `Coke: **+${cokeGain.toLocaleString()}**`,
          inline: true,
        },
        {
          name: "Nhân vật",
          value:
            `Level: **${user.rpg.level}**\n` +
            `Rank: **${user.rpg.rank}**\n` +
            `Lực chiến: **${Math.floor(user.rpg.power).toLocaleString()}**\n` +
            `EXP: **${user.rpg.exp}/${getRpgXpNeeded(user.rpg.level)}**`,
          inline: true,
        },
      );

    const path = require("path");
    const fs = require("fs");
    const { AttachmentBuilder } = require("discord.js");
    let itemAttachment = null;

    if (droppedItem) {
      embed.addFields({
        name: "Trang bị rơi",
        value:
          `Slot: **${config.rpg.gear_slot_names[droppedItem.slot]}**\n` +
          `Rarity: **${droppedItem.rarity}**\n` +
          `Lực chiến khi mặc: **+${droppedItem.power.toLocaleString()}**\n` +
          `Giá bán: **${droppedItem.sellPrice.toLocaleString()} Coke**`,
        inline: true,
      });

      const imgKey = droppedItem.imageKey || getItemImageFile(droppedItem);
      if (imgKey) {
        const itemImagePath = path.join(__dirname, "../../assets/items", imgKey);
        if (fs.existsSync(itemImagePath)) {
          itemAttachment = new AttachmentBuilder(itemImagePath, { name: "item.png" });
          embed.setThumbnail("attachment://item.png");
        }
      }
    }

    if (levelsGained > 0) {
      embed.addFields({
        name: "Level Up",
        value: `Bạn đã lên từ level **${previousLevel}** thành **${user.rpg.level}**.`,
      });
    }

    const payload = { embeds: [embed] };
    if (itemAttachment) {
      payload.files = [itemAttachment];
    }
    return message.reply(payload);
  }
}

module.exports = new HuntCommand();
