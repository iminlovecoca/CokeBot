const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require("discord.js");
const config = require("../../data/config");
const User = require("../../models/User");
const {
  requireRpgCharacter,
  addRpgExp,
  calculateRpgPower,
} = require("../../utils/rpgUtil");
const {
  generateVerificationCode,
  generateCaptchaImage,
} = require("../../utils/anticheat");

// Max levels for each autohunt trait
const maxLevels = {
  efficiency: 215,
  duration: 235,
  cost: 5,
  gain: 200,
  experience: 200,
  radar: 99,
};

// Math scaling formulas for trait values
const getEfficiency = (lvl) => 10 + Math.round(((lvl - 1) / 214) * 110); // hunts/hour (10 to 120/h, 2880/24h)
const getDuration = (lvl) => 1 + Math.round(((lvl - 1) / 234) * 23); // hours (1 to 24h)
const getCost = (lvl) => 50000 - (lvl - 1) * 6250; // Coke per 24h (50k down to 25k Coke)
const getGain = (lvl) => 100 + Math.round(((lvl - 1) / 199) * 4900); // essence/hour (100 to 5000/h, 120k/24h)
const getExperience = (lvl) => 200 + Math.round(((lvl - 1) / 199) * 1050); // XP/hour (200 to 1250/h, 30k/24h)
const getRadar = (lvl) => 0.00001 + ((lvl - 1) / 98) * 0.00035; // Radar drop rate bonus (0.00001 to 0.00036)

// Math cost scaling formulas (in Essence) to upgrade from level to level+1
const upgradeCostFuncs = {
  efficiency: (lvl) => Math.round(50 * Math.pow(1.065, lvl - 1)),
  duration: (lvl) => Math.round(50 * Math.pow(1.06, lvl - 1)),
  cost: (lvl) => {
    if (lvl === 1) return 10000;
    if (lvl === 2) return 25000;
    if (lvl === 3) return 60000;
    if (lvl === 4) return 150000;
    return 0;
  },
  gain: (lvl) => Math.round(80 * Math.pow(1.062, lvl - 1)),
  experience: (lvl) => Math.round(60 * Math.pow(1.062, lvl - 1)),
  radar: (lvl) => Math.round(1000 * Math.pow(1.29, lvl - 1)),
};

// Rarity mapping for sacrifice command
const rarityMapping = {
  c: "Common",
  r: "Rare",
  e: "Epic",
  l: "Legendary",
  m: "Mythic",
  a: "Ancient",
  d: "Divine",
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
  ancient: "Ancient",
  divine: "Divine",
};

// Essence yield when sacrificing RPG gear
const sacrificeEssenceYield = {
  Common: 10,
  Rare: 40,
  Epic: 200,
  Legendary: 1000,
  Mythic: 5000,
  Ancient: 25000,
  Divine: 150000,
};

const traitMapping = {
  efficiency: "efficiency",
  eff: "efficiency",
  duration: "duration",
  dur: "duration",
  cost: "cost",
  gain: "gain",
  experience: "experience",
  exp: "experience",
  xp: "experience",
  radar: "radar",
  rad: "radar",
};

const formatDuration = (ms) => {
  const totalMin = Math.floor(ms / (60 * 1000));
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hrs}H ${mins}M`;
};

const renderAutohuntPanel = (user, memberName) => {
  const levels = user.rpg.autohunt?.levels || {
    efficiency: 1,
    duration: 1,
    cost: 1,
    gain: 1,
    experience: 1,
    radar: 1,
  };
  const essence = user.rpg.autohunt?.essence || 0;

  const effLvl = levels.efficiency || 1;
  const durLvl = levels.duration || 1;
  const costLvl = levels.cost || 1;
  const gainLvl = levels.gain || 1;
  const expLvl = levels.experience || 1;
  const radLvl = levels.radar || 1;

  const effVal = getEfficiency(effLvl);
  const durVal = getDuration(durLvl);
  const costVal = getCost(costLvl);
  const gainVal = getGain(gainLvl);
  const expVal = getExperience(expLvl);
  const radVal = getRadar(radLvl);

  const drawProgress = (currentLvl, maxLvl, trait) => {
    if (currentLvl >= maxLvl) {
      return `Lvl ${currentLvl} [MAX]\n[■■■■■■■■■■■■■■■■■■]`;
    }
    const cost = upgradeCostFuncs[trait](currentLvl);
    const percent = Math.min(1, essence / cost);
    const filled = Math.round(percent * 18);
    const bar = "[" + "■".repeat(filled) + "□".repeat(18 - filled) + "]";
    return `Lvl ${currentLvl}\n\`[${essence.toLocaleString()}/${cost.toLocaleString()}]\`\n${bar}`;
  };

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle(`${memberName}'s HuntBot`)
    .setThumbnail("https://i.imgur.com/PZcZpZg.png")
    .setDescription(
      `\`BEEP. BOOP. I AM HUNTBOT. I WILL HUNT FOR YOU MASTER.\`\n` +
        `Use the command \`${config.prefix}xautohunt {duration_hours}\` to get started.\n` +
        `You can use \`${config.prefix}xupgrade {trait} [essence]\` to upgrade the traits below.\n` +
        `To obtain more essence, use \`${config.prefix}xautohunt sacrifice {rarity} {count}\`.\n\n`
    )
    .addFields(
      {
        name: `⏱️ Efficiency - ${effVal}/H`,
        value: drawProgress(effLvl, maxLevels.efficiency, "efficiency"),
        inline: true,
      },
      {
        name: `⏳ Duration - ${durVal}H`,
        value: drawProgress(durLvl, maxLevels.duration, "duration"),
        inline: true,
      },
      {
        name: `💵 Cost - ${costVal.toLocaleString()} Coke/24H`,
        value: drawProgress(costLvl, maxLevels.cost, "cost"),
        inline: true,
      },
      {
        name: `🔧 Gain - ${gainVal.toLocaleString()} essence/H`,
        value: drawProgress(gainLvl, maxLevels.gain, "gain"),
        inline: true,
      },
      {
        name: `⚔️ Experience - ${expVal.toLocaleString()} XP/H`,
        value: drawProgress(expLvl, maxLevels.experience, "experience"),
        inline: true,
      },
      {
        name: `📡 Radar - ${radVal.toFixed(5)}`,
        value: drawProgress(radLvl, maxLevels.radar, "radar"),
        inline: true,
      },
      {
        name: `🔵 Animal Essence - ${essence.toLocaleString()}`,
        value: `\`Current Max Autohunt: ${(effVal * durVal).toLocaleString()} hunts, ${(gainVal * durVal).toLocaleString()} essence, and ${(expVal * durVal).toLocaleString()} XP for ${Math.round((costVal * durVal) / 24).toLocaleString()} Coke\``,
        inline: false,
      }
    );

  return embed;
};

const renderActiveHunt = (user, memberName) => {
  const startTime = new Date(user.rpg.autohunt.startTime).getTime();
  const durationMs = user.rpg.autohunt.durationHours * 60 * 60 * 1000;
  const elapsedMs = Date.now() - startTime;
  const remainingMs = Math.max(0, durationMs - elapsedMs);

  const levels = user.rpg.autohunt.levels || {
    efficiency: 1,
    duration: 1,
    cost: 1,
    gain: 1,
    experience: 1,
    radar: 1,
  };
  const efficiency = getEfficiency(levels.efficiency);

  const pct = Math.min(100, (elapsedMs / durationMs) * 100).toFixed(2);
  const huntsCount = Math.floor(
    Math.min(user.rpg.autohunt.durationHours, elapsedMs / (60 * 60 * 1000)) *
      efficiency,
  );

  const filled = Math.min(20, Math.round((elapsedMs / durationMs) * 20));
  const bar = "[" + "■".repeat(filled) + "□".repeat(20 - filled) + "]";

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle(`${memberName}'s HuntBot`)
    .setDescription(
      `🤖 **HUNTBOT is currently hunting!**\n` +
        `\`BEEP BOOP. I AM STILL HUNTING. I WILL BE BACK IN ${formatDuration(remainingMs)}\`\n\n` +
        `**${pct}% DONE** | **${huntsCount.toLocaleString()}** HUNTS COMPLETED\n` +
        `${bar}\n\n` +
        `*Dùng \`${config.prefix}xautohunt claim\` để nhận thưởng sớm và dừng đi săn.*`,
    );

  return embed;
};

module.exports = {
  name: "xautohunt",
  aliases: ["autohunt", "hb", "ah", "xah", "xhb"],
  description: "Hệ thống đi săn tự động bằng robot HuntBot.",
  usage: `${config.prefix}xautohunt [duration_hours | upgrade | sacrifice | claim]`,
  examples: [
    {
      intent: "Xem bảng nâng cấp HuntBot",
      command: `${config.prefix}xautohunt`,
    },
    {
      intent: "Bắt đầu tự động săn 24h",
      command: `${config.prefix}xautohunt 24`,
    },
    {
      intent: "Nâng cấp chỉ số Efficiency lên 5 cấp",
      command: `${config.prefix}xautohunt upgrade eff 5`,
    },
    {
      intent: "Hiến tế trang bị Common",
      command: `${config.prefix}xautohunt sacrifice common all`,
    },
    {
      intent: "Nhận phần thưởng autohunt",
      command: `${config.prefix}xautohunt claim`,
    },
  ],

  async execute(message, args = []) {
    const { user } = await requireRpgCharacter(message.author.id);
    const memberName = message.member?.displayName || message.author.username;

    // Initialize autohunt states if not present
    if (!user.rpg.autohunt) {
      user.rpg.autohunt = {
        isActive: false,
        startTime: null,
        durationHours: 0,
        essence: 0,
        captchaCode: null,
        pendingDuration: 0,
        levels: {
          efficiency: 1,
          duration: 1,
          cost: 1,
          gain: 1,
          experience: 1,
          radar: 1,
        },
      };
      user.markModified("rpg");
      await user.save();
    }

    const subCommand = args[0]?.toLowerCase();

    // 1. SACRIFICE SUBCOMMAND
    if (subCommand === "sacrifice" || subCommand === "sac") {
      const targetRarityAbbr = args[1]?.toLowerCase();
      const targetRarity = rarityMapping[targetRarityAbbr];
      if (!targetRarity) {
        return message.reply(
          `${config.emoji.no} Cú pháp hiến tế không hợp lệ! Hãy dùng: \`${config.prefix}xautohunt sacrifice {rarity} {count|all}\`\n` +
            `Các độ hiếm hợp lệ: \`c\`, \`r\`, \`e\`, \`l\`, \`m\`, \`a\`, \`d\``,
        );
      }

      const countArg = args[2]?.toLowerCase() || "1";
      const isAll = countArg === "all";
      const count = parseInt(countArg);

      if (!isAll && (!Number.isInteger(count) || count <= 0)) {
        return message.reply(
          `${config.emoji.no} Số lượng trang bị hiến tế không hợp lệ.`,
        );
      }

      const equippedIds = new Set(Object.values(user.rpg.equipped || {}));
      const userItems = user.rpg.items || [];
      const eligibleItems = userItems.filter(
        (item) => item.rarity === targetRarity && !equippedIds.has(item.id),
      );

      if (eligibleItems.length === 0) {
        return message.reply(
          `${config.emoji.warning} Không tìm thấy trang bị nào độ hiếm **${targetRarity}** chưa mặc trong rương đồ để hiến tế.`,
        );
      }

      const sellCount = isAll
        ? eligibleItems.length
        : Math.min(count, eligibleItems.length);
      const itemsToSacrifice = eligibleItems.slice(0, sellCount);
      const essencePerItem = sacrificeEssenceYield[targetRarity] || 10;
      const totalEssenceGain = itemsToSacrifice.length * essencePerItem;

      // Update user inventory and essence
      const sacIds = new Set(itemsToSacrifice.map((it) => it.id));
      user.rpg.items = userItems.filter((it) => !sacIds.has(it.id));
      user.rpg.autohunt.essence =
        (user.rpg.autohunt.essence || 0) + totalEssenceGain;
      user.rpg.power = calculateRpgPower(user);
      user.markModified("rpg");
      await user.save();

      return message.reply(
        `🌌 **Tế Đàn Tinh Hoa RPG**\n` +
          `Bạn đã hiến tế **${itemsToSacrifice.length}** trang bị **${targetRarity}** và nhận được **+${totalEssenceGain.toLocaleString()} Essence**!`,
      );
    }

    // 2. UPGRADE SUBCOMMAND (fallback support)
    if (subCommand === "upgrade" || subCommand === "up") {
      const inputTrait = args[1]?.toLowerCase();
      const trait = traitMapping[inputTrait];
      if (!trait) {
        return message.reply(
          `${config.emoji.no} Chỉ số nâng cấp không hợp lệ. Các chỉ số: \`efficiency\` (\`eff\`), \`duration\` (\`dur\`), \`cost\`, \`gain\`, \`experience\` (\`exp\`), \`radar\` (\`rad\`).`,
        );
      }

      const count = parseInt(args[2]) || 1;
      if (count <= 0) {
        return message.reply(
          `${config.emoji.no} Số cấp nâng cấp không hợp lệ.`,
        );
      }

      const currentLvl = user.rpg.autohunt.levels[trait] || 1;
      const maxLvl = maxLevels[trait];
      if (currentLvl >= maxLvl) {
        return message.reply(
          `${config.emoji.warning} Chỉ số này đã đạt cấp độ tối đa [MAX]!`,
        );
      }

      const finalLvl = Math.min(maxLvl, currentLvl + count);
      const actualUpgrades = finalLvl - currentLvl;
      const totalCost = getUpgradeCostForLevels(
        trait,
        currentLvl,
        actualUpgrades,
      );
      const currentEssence = user.rpg.autohunt.essence || 0;

      if (currentEssence < totalCost) {
        return message.reply(
          `${config.emoji.no} Bạn không có đủ Essence để nâng cấp chỉ số này thêm **${actualUpgrades}** cấp.\n` +
            `Yêu cầu: **${totalCost.toLocaleString()} Essence** | Hiện có: **${currentEssence.toLocaleString()} Essence**`,
        );
      }

      user.rpg.autohunt.essence = currentEssence - totalCost;
      user.rpg.autohunt.levels[trait] = finalLvl;
      user.markModified("rpg");
      await user.save();

      return message.reply(
        `⚙️ **Nâng Cấp HuntBot**\n` +
          `Nâng cấp thành công chỉ số **${trait}** thêm **${actualUpgrades} cấp** (Lên cấp **${finalLvl}**).\n` +
          `Tiêu hao: **${totalCost.toLocaleString()} Essence** | Essence còn lại: **${user.rpg.autohunt.essence.toLocaleString()}**`,
      );
    }

    // 3. CLAIM SUBCOMMAND
    if (subCommand === "claim" || subCommand === "c") {
      if (!user.rpg.autohunt.isActive) {
        return message.reply(
          `${config.emoji.no} Hiện tại HuntBot của bạn không đi săn.`,
        );
      }

      const startTime = new Date(user.rpg.autohunt.startTime).getTime();
      const durationMs = user.rpg.autohunt.durationHours * 60 * 60 * 1000;
      const elapsedMs = Date.now() - startTime;
      const actualElapsedMs = Math.min(durationMs, elapsedMs);
      const elapsedHours = actualElapsedMs / (60 * 60 * 1000);

      if (elapsedHours < 0.05) {
        return message.reply(
          `${config.emoji.warning} HuntBot mới đi săn được ít phút, hãy đợi thêm chút nữa để thu hoạch.`,
        );
      }

      const levels = user.rpg.autohunt.levels || {
        efficiency: 1,
        duration: 1,
        cost: 1,
        gain: 1,
        experience: 1,
        radar: 1,
      };

      const efficiency = getEfficiency(levels.efficiency);
      const gain = getGain(levels.gain);
      const experience = getExperience(levels.experience);
      const radar = getRadar(levels.radar);

      const huntsCount = Math.floor(elapsedHours * efficiency);
      const essenceGain = Math.floor(elapsedHours * gain);
      const xpGain = Math.floor(elapsedHours * experience);

      let gearsDropped = [];
      const {
        generateRpgGearDrop,
        addRpgGearToUser,
      } = require("../../utils/rpgUtil");

      // Simulate drops in background
      for (let i = 0; i < huntsCount; i++) {
        const droppedItem = generateRpgGearDrop(user, {
          forceDrop: false,
          dropRateBonus: radar,
        });
        if (droppedItem) {
          gearsDropped.push(droppedItem);
          addRpgGearToUser(user, droppedItem);
        }
      }

      // Add essence and XP
      user.rpg.autohunt.essence =
        (user.rpg.autohunt.essence || 0) + essenceGain;
      const previousLevel = user.rpg.level;
      const levelsGained = addRpgExp(user.rpg, xpGain);
      user.rpg.power = calculateRpgPower(user);

      // Reset states
      user.rpg.autohunt.isActive = false;
      user.rpg.autohunt.startTime = null;
      user.rpg.autohunt.durationHours = 0;
      user.rpg.autohunt.captchaCode = null;
      user.rpg.autohunt.pendingDuration = 0;
      user.markModified("rpg");
      await user.save();

      const countsByRarity = {};
      for (const item of gearsDropped) {
        countsByRarity[item.rarity] = (countsByRarity[item.rarity] || 0) + 1;
      }
      const rarityLines = Object.entries(countsByRarity)
        .map(([rarity, count]) => `• ${rarity}: **${count}** món`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor("#57F287")
        .setTitle("🤖 HuntBot báo cáo kết quả đi săn")
        .setDescription(
          `Chào chủ nhân, tôi đã đi săn tự động trong **${elapsedHours.toFixed(2)} giờ** và mang về:\n\n` +
            `• EXP Nhân vật: **+${xpGain.toLocaleString()}**\n` +
            `• Essence: **+${essenceGain.toLocaleString()}**\n` +
            `• Số lượt săn: **${huntsCount.toLocaleString()}** lượt\n` +
            `• Trang bị nhặt được: **${gearsDropped.length}** món\n` +
            (rarityLines ? `\n**Chi tiết trang bị:**\n${rarityLines}` : ""),
        );

      if (levelsGained > 0) {
        embed.addFields({
          name: "Lên cấp!",
          value: `Bạn đã tăng cấp từ **${previousLevel}** lên **${user.rpg.level}**!`,
        });
      }

      return message.reply({ embeds: [embed] });
    }

    // 4. CAPTCHA AND START AUTOHUNT
    const durationMatch = args[0]?.match(/^(\d+)[hH]?$/);
    if (durationMatch) {
      if (user.rpg.autohunt.isActive) {
        return message.reply(
          `${config.emoji.warning} HuntBot của bạn đang đi săn! Gõ \`${config.prefix}xautohunt\` để xem trạng thái hoặc \`${config.prefix}xautohunt claim\` để nhận thưởng sớm.`,
        );
      }

      const duration = parseInt(durationMatch[1]);
      const levels = user.rpg.autohunt.levels || {
        efficiency: 1,
        duration: 1,
        cost: 1,
        gain: 1,
        experience: 1,
        radar: 1,
      };
      const maxAllowedDuration = getDuration(levels.duration);

      if (duration < 1 || duration > maxAllowedDuration) {
        return message.reply(
          `${config.emoji.no} Thời gian Auto Hunt không hợp lệ! Cấp độ hiện tại của bạn cho phép tự động tối đa **${maxAllowedDuration} giờ**.`,
        );
      }

      const costPer24H = getCost(levels.cost);
      const totalCost = Math.round((costPer24H * duration) / 24);

      if (user.coke < totalCost) {
        return message.reply(
          `${config.emoji.no} Bạn không có đủ Coke để trả chi phí thuê HuntBot.\n` +
            `Chi phí yêu cầu: **${totalCost.toLocaleString()} Coke** | Số dư của bạn: **${user.coke.toLocaleString()} Coke**`,
        );
      }

      const captchaInput = args[1]?.trim();

      // Case 4a: CAPTCHA REQUEST (User did not supply captcha input)
      if (!captchaInput) {
        const captchaCode = generateVerificationCode();
        user.rpg.autohunt.captchaCode = captchaCode;
        user.rpg.autohunt.pendingDuration = duration;
        user.markModified("rpg");
        await user.save();

        const buffer = generateCaptchaImage(captchaCode);
        const attachment = new AttachmentBuilder(buffer, {
          name: "captcha.png",
        });

        return message.reply({
          content: `🤖 | **${memberName}**, Here is your password!\n| Use the command \`xautohunt ${duration}h {password}\``,
          files: [attachment],
        });
      }

      // Case 4b: VERIFY CAPTCHA AND START
      const expectedCaptcha = user.rpg.autohunt.captchaCode;
      const expectedDuration = user.rpg.autohunt.pendingDuration;

      if (!expectedCaptcha || expectedDuration !== duration) {
        return message.reply(
          `${config.emoji.no} Mã bảo mật hoặc số giờ không khớp với phiên hiện tại. Vui lòng gõ \`xautohunt ${duration}h\` để lấy captcha mới.`,
        );
      }

      if (captchaInput.toUpperCase() !== expectedCaptcha.toUpperCase()) {
        return message.reply(
          `${config.emoji.no} Mã captcha không chính xác. Vui lòng gõ lại hoặc lấy mã mới!`,
        );
      }

      // Correct captcha: Start Autohunt!
      user.coke -= totalCost;
      user.rpg.autohunt.isActive = true;
      user.rpg.autohunt.startTime = new Date();
      user.rpg.autohunt.durationHours = duration;
      user.rpg.autohunt.captchaCode = null; // Clear captcha
      user.rpg.autohunt.pendingDuration = 0;
      user.markModified("rpg");
      await user.save();

      const effVal = getEfficiency(levels.efficiency);
      const gainVal = getGain(levels.gain);
      const expVal = getExperience(levels.experience);

      return message.reply(
        `🤖 | **BEEP BOOP.** **${memberName}** , YOU SPENT **${totalCost.toLocaleString()}** Coke\n` +
          `| **I WILL BE BACK IN ${duration}H 0M WITH ${(effVal * duration).toLocaleString()} HUNTS,**\n` +
          `| **${(gainVal * duration).toLocaleString()} ESSENCE, AND ${(expVal * duration).toLocaleString()} EXPERIENCE**`,
      );
    }

    // 5. STATUS / VIEW PANEL (No args)
    if (user.rpg.autohunt.isActive) {
      return message.reply({ embeds: [renderActiveHunt(user, memberName)] });
    } else {
      return message.reply({ embeds: [renderAutohuntPanel(user, memberName)] });
    }
  },
};

const getUpgradeCostForLevels = (trait, currentLvl, count) => {
  let totalCost = 0;
  const maxLvl = maxLevels[trait];
  const costFunc = upgradeCostFuncs[trait];
  for (let i = 0; i < count; i++) {
    const lvlToCheck = currentLvl + i;
    if (lvlToCheck >= maxLvl) break;
    totalCost += costFunc(lvlToCheck);
  }
  return totalCost;
};
