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
      return message.reply(`⏱️ **|** **${name}**, your next daily is in: **${h}H ${m}M ${s}S**`);
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

    
    user.xp += 500;
    while (user.xp >= userService.getUserXpNeeded(user.level)) {
      user.xp -= userService.getUserXpNeeded(user.level);
      user.level++;
      user.coke += 2000;
    }

    
    if (!user.inventory) {
      user.inventory = new Map();
    }
    const currentWc = user.inventory.get("wc") || 0;
    user.inventory.set("wc", currentWc + 1);

    const currentSouls = user.inventory.get("souls") || 0;
    const isSunday = now.weekday === 7;
    const soulsGained = isSunday ? 4 : 2;
    user.inventory.set("souls", currentSouls + soulsGained);

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

    let responseText = `💰 **|** **${name}**, Here is your daily ${config.emoji.money} **${reward.toLocaleString()}** Coke!\n`;
    if (brokeStreak) {
      responseText += `${config.emoji.fireBreak} **|** Bạn đã mất chuỗi, bắt đầu lại từ đầu!\n`;
    } else {
      responseText += `<:blank:1403928807395819671>**|** You're on a **${streak}** daily streak! ${streakEmoji}\n`;
    }

    // Award Pet Daily XP (+300 XP)
    if (user.rpg && user.rpg.equippedPet) {
      const { getDailyXp, addPetXp } = require("../../utils/petXpUtil");
      const petDailyXp = getDailyXp();
      const petRes = addPetXp(user.rpg.equippedPet, petDailyXp);
      user.markModified("rpg");
      responseText += `<:blank:1403928807395819671>**|** Linh thú ${user.rpg.equippedPet.emoji} **${user.rpg.equippedPet.name}** nhận **+${petDailyXp} Pet XP**!${petRes.leveledUp ? ` 🆙 **Lên Cấp ${user.rpg.equippedPet.level}!**` : ""}\n`;
    }

    responseText += `<:crate:1512793698025603282> **|** You received a **lootbox**!\n`;
    responseText += `<:souls:1518749776538243082> **|** You received **${soulsGained} Linh Hồn**!\n`;
    responseText += `⏱️ **|** Your next daily is in: **${h}H ${m}M ${s}S**`;

    if (milestoneMessage) {
      responseText += `\n\n${milestoneMessage}`;
    }

    await message.reply(responseText);
  }
}

module.exports = new DailyCommand();
