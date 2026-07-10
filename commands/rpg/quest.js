const BaseCommand = require("../../core/BaseCommand");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const config = require("../../data/config");
const User = require("../../models/User");
const { checkAndResetDailyQuests, generateRandomQuest } = require("../../utils/questUtil");
const { requireRpgCharacter } = require("../../utils/rpgUtil");
const { DateTime } = require("luxon");

class QuestCommand extends BaseCommand {
  constructor() {
    super({
      name: "quest",
      aliases: ["q", "dailyquest", "quests", "questlog"],
      description: "Xem danh sách nhiệm vụ hàng ngày của bạn và thực hiện đổi nhiệm vụ.",
      usage: `${config.prefix}quest [rr <1|2|3>]`,
      examples: [
        { intent: "Xem danh sách nhiệm vụ hàng ngày", command: `${config.prefix}quest` },
        { intent: "Đổi (reroll) nhiệm vụ số 2", command: `${config.prefix}quest rr 2` },
      ],
      cooldown: 0
    });
  }

  async execute(message, args = []) {
    const { user } = await requireRpgCharacter(message.author.id);
    const memberName = message.member?.displayName || message.author.username;

    
    await checkAndResetDailyQuests(user);

    const subCommand = args[0]?.toLowerCase();

    
    if (subCommand === "rr" || subCommand === "reroll") {
      const idxArg = parseInt(args[1]);
      if (isNaN(idxArg) || idxArg < 1 || idxArg > 3) {
        return message.reply(
          `${config.emoji.no} Vui lòng chọn đúng số thứ tự nhiệm vụ muốn đổi (1, 2 hoặc 3).\nVí dụ: \`${config.prefix}quest rr 2\``
        );
      }

      const activeQuests = user.rpg.quests.active || [];
      const questIndex = idxArg - 1;

      if (!activeQuests[questIndex]) {
        return message.reply(`${config.emoji.no} Bạn không có nhiệm vụ số ${idxArg} để đổi.`);
      }

      if ((user.rpg.quests.rerollsLeft || 0) <= 0) {
        return message.reply(`${config.emoji.no} Bạn đã hết lượt đổi nhiệm vụ ngày hôm nay!`);
      }

      const oldQuest = activeQuests[questIndex];
      const activeTexts = activeQuests.map(q => q.text);
      const newQuest = generateRandomQuest(oldQuest.tier, activeTexts);
      activeQuests[questIndex] = newQuest;
      
      user.rpg.quests.rerollsLeft = (user.rpg.quests.rerollsLeft || 1) - 1;
      user.markModified("rpg");
      await user.save();

      return message.reply(
        `${config.emoji.yes} Đổi nhiệm vụ thành công!\n` +
          `Đã thay thế nhiệm vụ **${idxArg}** bằng nhiệm vụ mới: *${newQuest.text}*`
      );
    }

    
    const activeQuests = user.rpg.quests.active || [];

    const tz = "Asia/Ho_Chi_Minh";
    const nowVn = DateTime.now().setZone(tz);
    const midnightVn = nowVn.plus({ days: 1 }).startOf("day");
    const diff = midnightVn.diff(nowVn, ["hours", "minutes", "seconds"]).toObject();
    const h = Math.floor(diff.hours || 0);
    const m = Math.floor(diff.minutes || 0);
    const s = Math.floor(diff.seconds || 0);
    const countdownStr = `${h}H ${m}M ${s}S`;

    let description = `These quests belong to <@${message.author.id}>\n\n`;

    if (activeQuests.length === 0) {
      description += `*Bạn đã hoàn thành toàn bộ nhiệm vụ hôm nay! Hãy quay lại vào ngày mai.*`;
    } else {
      activeQuests.forEach((quest, index) => {
        let rewardStr = "";
        if (quest.rewardType === "coke") {
          rewardStr = `${quest.rewardValue.toLocaleString()} ${config.emoji.money}`;
        } else if (quest.rewardType === "essence") {
          rewardStr = `${quest.rewardValue.toLocaleString()} <:Essence:1517230428828995594>`;
        } else if (quest.rewardType === "box") {
          rewardStr = "<:crate:1512793698025603282>".repeat(quest.rewardValue);
        }

        description +=
          `**${index + 1}. ${quest.text}**\n` +
          `  ▫ \`Reward:\` ${rewardStr}\n` +
          `  ▫ \`Progress:\` \`[${quest.progress}/${quest.target}]\`\n\n`;
      });
    }

    description += `**Next quest in:** \`${countdownStr}\`\n`;
    description += `*Lượt đổi nhiệm vụ hôm nay:* \`${user.rpg.quests.rerollsLeft || 0} lượt còn lại*`;

    const file = new AttachmentBuilder("./assets/rpgevent/quest.png");

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(`${memberName}'s Quest Log`)
      .setThumbnail("attachment://quest.png")
      .setDescription(description);

    return message.reply({ embeds: [embed], files: [file], skipV2: true });
  }
}

module.exports = new QuestCommand();
