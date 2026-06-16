const { DateTime } = require("luxon");

const QUEST_TEMPLATES = {
  beginner: [
    { type: "boss_fight", text: "Tham gia hạ gục boss 3 lần", target: 3 },
    { type: "exp_gain", text: "Nhận đc 2500 exp (từ mọi nguồn)", target: 2500 },
    { type: "pvp_battle", text: "Thách đấu với bạn 3 lần", target: 3 },
    { type: "hunt_loot", text: "Nhặt được một trang bị rare từ hunt", target: 1, rarity: "Rare" },
    { type: "pray", text: "Được người khác pray 3 lần", target: 3 },
    { type: "curse", text: "Được người khác curse 3 lần", target: 3 },
    { type: "boss_damage", text: "Gây 250 sát thương lên boss", target: 250 },
  ],
  intermediate: [
    { type: "boss_fight", text: "Tham gia hạ gục boss 5 lần", target: 5 },
    { type: "exp_gain", text: "Nhận đc 25000 exp (từ mọi nguồn)", target: 25000 },
    { type: "pvp_battle", text: "Thách đấu với bạn 5 lần", target: 5 },
    { type: "hunt_loot", text: "Nhặt được một trang bị epic từ hunt", target: 1, rarity: "Epic" },
    { type: "pray", text: "Được người khác pray 5 lần", target: 5 },
    { type: "curse", text: "Được người khác curse 5 lần", target: 5 },
    { type: "boss_damage", text: "Gây 1000 sát thương lên boss", target: 1000 },
  ],
  advanced: [
    { type: "boss_last_hit", text: "Dứt điểm boss 2 lần", target: 2 },
    { type: "exp_gain", text: "Nhận đc 50000 exp (từ mọi nguồn)", target: 50000 },
    { type: "pvp_battle", text: "Thách đấu với bạn 15 lần", target: 15 },
    { type: "pray", text: "Được người khác pray 10 lần", target: 10 },
    { type: "curse", text: "Được người khác curse 10 lần", target: 10 },
    { type: "boss_damage", text: "Gây 5000 sát thương lên boss", target: 5000 },
  ],
};

const generateRandomQuest = (tier) => {
  const templates = QUEST_TEMPLATES[tier];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  let rewardType;
  let rewardValue;
  
  const rand = Math.random();
  if (rand < 0.4) {
    rewardType = "coke";
    if (tier === "beginner") rewardValue = 100 + Math.floor(Math.random() * 301);
    else if (tier === "intermediate") rewardValue = 500 + Math.floor(Math.random() * 901);
    else rewardValue = 1500 + Math.floor(Math.random() * 3501);
  } else if (rand < 0.8) {
    rewardType = "essence";
    if (tier === "beginner") rewardValue = 500 + Math.floor(Math.random() * 501);
    else if (tier === "intermediate") rewardValue = 2500 + Math.floor(Math.random() * 2001);
    else rewardValue = 3000 + Math.floor(Math.random() * 4501);
  } else {
    rewardType = "box";
    if (tier === "beginner") rewardValue = 1;
    else if (tier === "intermediate") rewardValue = 3;
    else rewardValue = 5;
  }
  
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    tier,
    text: template.text,
    type: template.type,
    target: template.target,
    rarity: template.rarity || null,
    progress: 0,
    completed: false,
    rewardType,
    rewardValue,
  };
};

const checkAndResetDailyQuests = async (user) => {
  if (!user.rpg) return;
  if (!user.rpg.quests) {
    user.rpg.quests = {
      active: [],
      lastDailyAt: null,
      rerollsLeft: 1,
    };
  }

  const tz = "Asia/Ho_Chi_Minh";
  const nowVn = DateTime.now().setZone(tz);
  const todayStr = nowVn.toFormat("yyyy-MM-dd");

  if (user.rpg.quests.lastDailyAt !== todayStr) {
    // Reset daily status
    user.rpg.quests.rerollsLeft = 1;

    let daysPassed = 1;
    if (user.rpg.quests.lastDailyAt) {
      const lastDate = DateTime.fromFormat(user.rpg.quests.lastDailyAt, "yyyy-MM-dd", { zone: tz });
      const diff = nowVn.startOf("day").diff(lastDate.startOf("day"), "days").days;
      if (Number.isInteger(diff) && diff > 0) {
        daysPassed = diff;
      }
    }

    user.rpg.quests.active = user.rpg.quests.active || [];
    const questsToAdd = Math.min(daysPassed, 3 - user.rpg.quests.active.length);
    
    for (let i = 0; i < questsToAdd; i++) {
      const randTier = Math.random();
      let tier = "beginner";
      if (randTier >= 0.5 && randTier < 0.85) tier = "intermediate";
      else if (randTier >= 0.85) tier = "advanced";

      const newQuest = generateRandomQuest(tier);
      user.rpg.quests.active.push(newQuest);
    }

    user.rpg.quests.lastDailyAt = todayStr;
    user.markModified("rpg");
    await user.save();
  }
};

const updateQuestProgress = async (userIdOrUser, type, amount, channel, extraData = {}) => {
  const User = require("../models/User");
  const config = require("../data/config");
  
  let user;
  if (userIdOrUser && typeof userIdOrUser === "object" && userIdOrUser.save) {
    user = userIdOrUser;
  } else {
    user = await User.findOne({ userId: userIdOrUser }).exec();
  }
  if (!user || !user.rpg || !user.rpg.quests) return;
  
  const userId = user.userId;
  await checkAndResetDailyQuests(user);
  
  let modified = false;
  const activeQuests = user.rpg.quests.active || [];
  const completedQuests = [];
  
  for (let i = activeQuests.length - 1; i >= 0; i--) {
    const quest = activeQuests[i];
    if (quest.type !== type) continue;
    
    if (type === "hunt_loot" && String(extraData.rarity || "").toLowerCase() !== String(quest.rarity || "").toLowerCase()) continue;
    
    quest.progress = Math.min(quest.target, (quest.progress || 0) + amount);
    modified = true;
    
    if (quest.progress >= quest.target) {
      quest.completed = true;
      completedQuests.push(quest);
      activeQuests.splice(i, 1);
    }
  }
  
  if (modified) {
    for (const quest of completedQuests) {
      let rewardText = "";
      if (quest.rewardType === "coke") {
        user.coke = (user.coke || 0) + quest.rewardValue;
        rewardText = `+**${quest.rewardValue.toLocaleString()} Coke** ${config.emoji.money}`;
      } else if (quest.rewardType === "essence") {
        if (!user.rpg.autohunt) user.rpg.autohunt = {};
        user.rpg.autohunt.essence = (user.rpg.autohunt.essence || 0) + quest.rewardValue;
        rewardText = `+**${quest.rewardValue.toLocaleString()} Essence** 🔵`;
      } else if (quest.rewardType === "box") {
        if (!user.inventory) user.inventory = {};
        const currentCount = user.inventory.get("wc") || 0;
        user.inventory.set("wc", currentCount + quest.rewardValue);
        rewardText = `+**${quest.rewardValue} Hộp Vũ Khí** <:crate:1512793698025603282>`;
      }
      
      if (channel && channel.send) {
        const embed = new (require("discord.js").EmbedBuilder)()
          .setColor("#57F287")
          .setTitle("🎉 Nhiệm Vụ Hoàn Thành!")
          .setDescription(
            `Chúc mừng <@${userId}> đã hoàn thành nhiệm vụ:\n` +
            `📝 *${quest.text}*\n\n` +
            `**Phần thưởng:** ${rewardText}`
          );
        await channel.send({ embeds: [embed] }).catch(() => null);
      }
    }
    
    user.markModified("rpg");
    if (user.inventory) user.markModified("inventory");
    await user.save();
  }
};

module.exports = {
  QUEST_TEMPLATES,
  generateRandomQuest,
  checkAndResetDailyQuests,
  updateQuestProgress,
};
