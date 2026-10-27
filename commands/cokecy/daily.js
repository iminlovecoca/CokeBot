const BaseCommand = require('../../core/BaseCommand');
const { DateTime } = require('luxon');
const config = require('../../data/config');

class DailyCommand extends BaseCommand {
  constructor() {
    super({
      name: 'daily',
      description: 'Nhận phần thưởng coke hàng ngày.',
      usage: `${config.prefix}daily`,
      examples: [
        { intent: 'Nhận phần thưởng hàng ngày', command: `${config.prefix}daily` }
      ],
      cooldown: 0 
    });
  }

  async execute(message, args) {
    const userId = message.author.id;
    const member = message.member || await message.guild.members.fetch(userId);
    const name = member.displayName || message.author.username;
    
    const userRepository = message.client.services.get('userRepository');
    const userService = message.client.services.get('userService');
    const user = await userRepository.getOrCreate(userId);

    const now = DateTime.now().setZone('Asia/Ho_Chi_Minh');
    const today = now.startOf('day');
    const lastClaim = user.lastDaily
      ? DateTime.fromJSDate(user.lastDaily).setZone('Asia/Ho_Chi_Minh').startOf('day')
      : null;

    const nextClaim = today.plus({ days: 1 });
    const diff = nextClaim.diff(now, ['hours', 'minutes', 'seconds']).toObject();
    const h = Math.floor(diff.hours);
    const m = Math.floor(diff.minutes);
    const s = Math.floor(diff.seconds);

    if (lastClaim && lastClaim.equals(today)) {
      return message.reply(`⏱️ **|** **${name}**, thời gian nhận điểm danh tiếp theo của bạn là sau: **${h}Giờ ${m}Phút ${s}Giây**`);
    }

    let streak = 1;
    let brokeStreak = false;
    if (lastClaim) {
      const daysDiff = today.diff(lastClaim, 'days').days;
      if (daysDiff === 1) {
        streak = (user.dailyStreak || 0) + 1;
      } else if (daysDiff > 1) {
        brokeStreak = true;
        streak = 1;
      }
    }

    let reward = 1000 + streak * 500;
    if (reward > 10000) reward = 10000;

    user.coke += reward;
    user.dailyStreak = streak;
    user.lastDaily = now.toJSDate();

    // Mark daily task done for OwO checklist
    const { getDailyDrops } = require('../../utils/dateUtil');
    const dailyDrops = getDailyDrops(user);
    dailyDrops.dailyClaimed = true;
    user.markModified("rpg");

    
    user.xp += 500;
    while (user.xp >= userService.getUserXpNeeded(user.level)) {
      user.xp -= userService.getUserXpNeeded(user.level);
      user.level++;
      user.coke += user.level * 5000;
      if (!user.inventory) user.inventory = new Map();
      if (user.inventory instanceof Map) {
        user.inventory.set("lootbox", (user.inventory.get("lootbox") || 0) + user.level);
        user.inventory.set("wc", (user.inventory.get("wc") || 0) + user.level);
      } else {
        user.inventory.lootbox = (user.inventory.lootbox || 0) + user.level;
        user.inventory.wc = (user.inventory.wc || 0) + user.level;
      }
    }

    
    if (!user.inventory) {
      user.inventory = new Map();
    }
    const isLootbox = Math.random() < 0.5;
    const rewardBoxKey = isLootbox ? "lootbox" : "wc";
    const rewardBoxEmoji = isLootbox ? "<:lootbox:1563961108727992470>" : "<:crate:1512793698025603282>";
    const rewardBoxName = isLootbox ? "Hộp Quà (Lootbox)" : "Hộp Vũ Khí (Weapon Crate)";

    if (user.inventory instanceof Map) {
      user.inventory.set(rewardBoxKey, (user.inventory.get(rewardBoxKey) || 0) + 1);
    } else {
      user.inventory[rewardBoxKey] = (user.inventory[rewardBoxKey] || 0) + 1;
    }

    const currentSouls = user.inventory instanceof Map
      ? (user.inventory.get("souls") || 0)
      : (user.inventory.souls || 0);
    const isSunday = now.weekday === 7;
    const soulsGained = isSunday ? 4 : 2;
    if (user.inventory instanceof Map) {
      user.inventory.set("souls", currentSouls + soulsGained);
    } else {
      user.inventory.souls = currentSouls + soulsGained;
    }

    user.markModified("inventory");

    const milestones = Object.keys(config.emoji.streakMilestones || {})
      .map(Number)
      .sort((a, b) => a - b);

    let streakEmoji = config.emoji.fireBreak; 
    if (!brokeStreak) {
      for (const milestone of milestones) {
        if (streak >= milestone) {
          streakEmoji = config.emoji.streakMilestones[milestone];
        } else break;
      }
    }

    let milestoneMessage = '';
    if (!brokeStreak && milestones.includes(streak)) {
      milestoneMessage = `🎉 **|** Xin chúc mừng **${name}** đã đạt **${streak} ngày** liên tiếp! ${streakEmoji}`;
    }

    await user.save();

    let responseText = `💰 **|** **${name}**, đây là phần thưởng hàng ngày của bạn: ${config.emoji.money} **${reward.toLocaleString()}** Coke!\n`;
    if (brokeStreak) {
      responseText += `${config.emoji.fireBreak} **|** Bạn đã mất chuỗi điểm danh, bắt đầu lại từ đầu!\n`;
    } else {
      responseText += `<:blank:1403928807395819671>**|** Bạn đang có chuỗi điểm danh **${streak} ngày** liên tiếp! ${streakEmoji}\n`;
    }

    responseText += `${rewardBoxEmoji} **|** Bạn đã nhận được **1 ${rewardBoxName}**!\n`;
    responseText += `<:souls:1518749776538243082> **|** Bạn đã nhận được **${soulsGained} Linh Hồn**!\n`;
    responseText += `⏱️ **|** Thời gian nhận điểm danh tiếp theo: **${h}Giờ ${m}Phút ${s}Giây**`;

    if (milestoneMessage) {
      responseText += `\n\n${milestoneMessage}`;
    }

    await message.reply(responseText);
  }
}

module.exports = new DailyCommand();
