const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../../data/config");
const { getDailyResetCountdown, getDailyDrops, getTodayDateString } = require("../../../utils/dateUtil");

class ChecklistCommand extends BaseCommand {
  constructor() {
    super({
      name: "checklist",
      aliases: ["cl", "task", "tasks"],
      description: "Xem danh sách nhiệm vụ hàng ngày và nhận thưởng khi hoàn thành.",
      usage: `${config.prefix}checklist hoặc ${config.prefix}cl`,
      examples: [
        { intent: "Xem checklist hàng ngày", command: `${config.prefix}cl` },
        { intent: "Nhận thưởng checklist khi hoàn thành", command: `${config.prefix}checklist` },
      ],
      cooldown: 5,
    });
  }

  async execute(message) {
    const userId = message.author.id;
    const userRepository = message.client.services.get("userRepository");
    const user = await userRepository.getOrCreate(userId);

    const todayDate = getTodayDateString();
    const dailyDrops = getDailyDrops(user);
    const countdown = getDailyResetCountdown();

    const check = "☑️";
    const box = "⬛";
    const tada = "🎉";

    // 1. Nhận quà điểm danh hằng ngày 0/1 (daily)
    const dailyDone = Boolean(
      dailyDrops.dailyClaimed ||
      (user.lastDaily && new Date(user.lastDaily).toISOString().slice(0, 10) === todayDate)
    );

    // 2. Tặng bánh / trà 0/1 (danisa / tea / cookie)
    const cookieDone = Boolean(dailyDrops.cookieSent);

    // 3. Hoàn thành 1 nhiệm vụ ngày 0/1 (quest)
    const questCount = Math.min(1, Number(dailyDrops.questCompletedCount) || 0);
    const questDone = questCount >= 1;

    // 4. Tham gia đánh boss thế giới 3 lần 0/3 (boss)
    const bossCount = Math.min(3, Number(dailyDrops.bossAttacks) || 0);
    const bossDone = bossCount >= 3;

    // 5. Tìm thấy 3 hộp quà 0/3 (lb)
    const lbCount = Math.min(3, Number(dailyDrops.huntLbCount) || 0);
    const lbDone = lbCount >= 3;

    // 6. Tìm thấy 3 hòm vũ khí 0/3 (wc)
    const wcCount = Math.min(3, Number(dailyDrops.battleWcCount) || 0);
    const wcDone = wcCount >= 3;

    const tasks = [
      {
        done: dailyDone,
        emoji: "🎁",
        desc: `Nhận quà điểm danh hằng ngày (${dailyDone ? 1 : 0}/1)`,
      },
      {
        done: cookieDone,
        emoji: "🍪",
        desc: `Tặng bánh Danisa / Trà cho bạn bè (${cookieDone ? 1 : 0}/1)`,
      },
      {
        done: questDone,
        emoji: "📜",
        desc: `Hoàn thành 1 nhiệm vụ ngày (${questCount}/1)`,
      },
      {
        done: bossDone,
        emoji: "⚔️",
        desc: `Tham gia đánh boss thế giới (${bossCount}/3)`,
      },
      {
        done: lbDone,
        emoji: "<:lootbox:1563961108727992470>",
        desc: `Tìm thấy 3 hộp quà khi săn thú (${lbCount}/3)`,
      },
      {
        done: wcDone,
        emoji: "<:crate:1512793698025603282>",
        desc: `Tìm thấy 3 hòm vũ khí khi PvP (${wcCount}/3)`,
      },
    ];

    const allCompleted = tasks.every((t) => t.done);
    let rewardGiven = false;
    let statusText = "";

    if (allCompleted && !dailyDrops.checklistClaimed) {
      // Award rewards: 5k Coke, 1 lb, 1 wc, 1 dungeon key
      user.coke = (user.coke || 0) + 5000;

      if (!user.inventory) {
        user.inventory = new Map();
      }

      if (user.inventory instanceof Map) {
        user.inventory.set("lootbox", (user.inventory.get("lootbox") || 0) + 1);
        user.inventory.set("wc", (user.inventory.get("wc") || 0) + 1);
        user.inventory.set("dungeonkey", (user.inventory.get("dungeonkey") || 0) + 1);
      } else {
        user.inventory.lootbox = (user.inventory.lootbox || 0) + 1;
        user.inventory.wc = (user.inventory.wc || 0) + 1;
        user.inventory.dungeonkey = (user.inventory.dungeonkey || 0) + 1;
      }

      dailyDrops.checklistClaimed = true;
      user.markModified("inventory");
      user.markModified("rpg");
      await user.save();

      rewardGiven = true;
      statusText = `${check} ${tada} Bạn nhận được **5,000** <:cokecy:1509951335016173662>, **1** <:lootbox:1563961108727992470>, **1** <:crate:1512793698025603282>, và **1** Chìa Khóa Phó Bản <:key:1516398711712911461>!`;
    } else if (dailyDrops.checklistClaimed) {
      statusText = `${check} ${tada} Bạn đã nhận phần thưởng checklist của ngày hôm nay!`;
    } else {
      statusText = `${box} ${tada} Hoàn thành tất cả nhiệm vụ trong checklist để nhận thưởng!`;
    }

    const taskLines = tasks.map((t) => `${t.done ? check : box} ${t.emoji} ${t.desc}`).join("\n");
    const description = `${taskLines}\n\n${statusText}`;

    const displayName = message.member?.displayName || message.author.username;
    const embed = new EmbedBuilder()
      .setColor(allCompleted ? "#57F287" : "#0099ff")
      .setAuthor({
        name: `${displayName}'s Checklist`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(description)
      .setFooter({
        text: `Resets in ${countdown.formatted}`,
      })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
}

module.exports = new ChecklistCommand();
