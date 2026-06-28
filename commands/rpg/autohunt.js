const BaseCommand = require("../../core/BaseCommand");
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
const { checkAndSetCooldown, notifyCooldown } = require("../../utils/cooldown");

// Owo Bot Autohunt traits configuration
const traits = {
  efficiency: { inc: 10, pow: 1.748, base: 25, upg: 1, max: 215, prefix: "/H" },
  duration: { inc: 10, pow: 1.7, base: 0.5, upg: 0.1, max: 235, prefix: "H" },
  cost: { inc: 1000, pow: 3.4, base: 10, upg: -1, max: 5, prefix: " Coke" },
  gain: { inc: 10, pow: 1.8, base: 0, upg: 25, max: 200, prefix: " essence/H" },
  experience: { inc: 10, pow: 1.8, base: 0, upg: 35, max: 200, prefix: " xp/H" },
  radar: {
    inc: 50,
    pow: 2.5,
    base: 0,
    upg: 0.00000004,
    max: 999,
    prefix: " %",
  },
};

const getLvl = (xp, gain, traitName) => {
  let totalxp = 0;
  let temp = {};
  let hit = false;
  let prevlvl = 0;
  const trait = traits[traitName];

  for (let i = 1; i <= trait.max + 1; i++) {
    let lvlxp = Math.trunc(trait.inc * Math.pow(i, trait.pow));
    totalxp += lvlxp;
    if (!hit && totalxp > xp) {
      prevlvl = i - 1;
      hit = true;
    }
    if (hit || i === trait.max + 1) {
      if (totalxp > xp + gain || i === trait.max + 1) {
        temp.lvl = i - 1;
        if (temp.lvl === trait.max) temp.max = true;
        temp.currentxp = xp + gain - (totalxp - lvlxp);
        temp.maxxp = lvlxp;
        if (prevlvl < temp.lvl) {
          temp.lvlup = true;
          temp.gain = trait.upg;
        }
        temp.stat = trait.base + trait.upg * temp.lvl;
        if (traitName !== 'radar') {
          temp.stat = Math.trunc(temp.stat * 10) / 10;
        } else {
          temp.stat = Math.round(temp.stat * 10000000) / 100000;
        }
        temp.prefix = trait.prefix;
        return temp;
      }
    }
  }
};

const getCumulativeXpForLevel = (lvl, traitName) => {
  if (lvl <= 1) return 0;
  const trait = traits[traitName];
  let totalxp = 0;
  for (let i = 1; i < lvl; i++) {
    totalxp += Math.trunc(trait.inc * Math.pow(i, trait.pow));
  }
  return totalxp;
};

const getXpForMax = (traitName) => {
  const trait = traits[traitName];
  let totalxp = 0;
  for (let i = 1; i <= trait.max; i++) {
    totalxp += Math.trunc(trait.inc * Math.pow(i, trait.pow));
  }
  return totalxp;
};

// Owo Bot rank-based bot emojis
const bots = [
  { emoji: '<:cbot:459996048379609098>', label: 'Common Bot' },
  { emoji: '<:ubot:459996048660889600>', label: 'Uncommon Bot' },
  { emoji: '<:rbot:459996049361338379>', label: 'Rare Bot' },
  { emoji: '<:ebot:459996050174902272>', label: 'Epic Bot' },
  { emoji: '<:mbot:459996049784963073>', label: 'Mythical Bot' },
  { emoji: '<a:lbot:459996050883608576>', label: 'Legendary Bot' },
  { emoji: '<a:fbot:1122059611206328350>', label: 'Founder Bot' },
];

const getBot = (rank, totalBots) => {
  if (rank <= 1) return bots[6];
  if (!totalBots || totalBots <= 1) return bots[0];
  const percent = ((totalBots - rank) / totalBots) * 100;
  if (percent <= 43.85) return bots[0];
  if (percent <= 78.85) return bots[1];
  if (percent <= 98.85) return bots[2];
  if (percent <= 99.85) return bots[3];
  if (percent <= 99.95) return bots[4];
  return bots[5];
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

const renderAutohuntPanel = (user, memberName, rank, totalUsers, botInfo) => {
  const xp = user.rpg.autohunt.xp;
  const essence = user.rpg.autohunt.essence || 0;

  const effInfo = getLvl(xp.efficiency, 0, 'efficiency');
  const durInfo = getLvl(xp.duration, 0, 'duration');
  const costInfo = getLvl(xp.cost, 0, 'cost');
  const gainInfo = getLvl(xp.gain, 0, 'gain');
  const expInfo = getLvl(xp.experience, 0, 'experience');
  const radInfo = getLvl(xp.radar, 0, 'radar');

  const drawProgress = (info) => {
    if (info.max) {
      return `Lvl ${info.lvl} [MAX]\n[■■■■■■■■■■■■■■■■]`;
    }
    const filled = Math.min(16, Math.round((info.currentxp / info.maxxp) * 16));
    const bar = "[" + "■".repeat(filled) + "□".repeat(16 - filled) + "]";
    return `Lvl ${info.lvl} \`[${info.currentxp.toLocaleString()}/${info.maxxp.toLocaleString()}]\`\n${bar}`;
  };

  const maxhunt = Math.floor(durInfo.stat * effInfo.stat);
  const maxCost = maxhunt * costInfo.stat;

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle(`${memberName}'s HuntBot`)
    .setThumbnail("https://i.imgur.com/PZcZpZg.png")
    .setDescription(
      `\`BEEP. BOOP. I AM HUNTBOT. I WILL HUNT FOR YOU MASTER.\`\n` +
        `Use the command \`${config.prefix}xautohunt {Coke | duration}\` to get started.\n` +
        `You can use \`${config.prefix}upgrade {trait} [essence]\` to upgrade the traits below.\n` +
        `To obtain more essence, use \`${config.prefix}xsacrifice {rarity} {count}\`.\n\n`,
    )
    .addFields(
      {
        name: `⏱️ Efficiency - ${effInfo.stat}${effInfo.prefix}`,
        value: drawProgress(effInfo),
        inline: true,
      },
      {
        name: `⏳ Duration - ${durInfo.stat}${durInfo.prefix}`,
        value: drawProgress(durInfo),
        inline: true,
      },
      {
        name: `<:cokecy:1509951335016173662> Cost - ${costInfo.stat}${costInfo.prefix}`,
        value: drawProgress(costInfo),
        inline: true,
      },
      {
        name: `🔧 Gain - ${gainInfo.stat}${gainInfo.prefix}`,
        value: drawProgress(gainInfo),
        inline: true,
      },
      {
        name: `⚔️ Experience - ${expInfo.stat}${expInfo.prefix}`,
        value: drawProgress(expInfo),
        inline: true,
      },
      {
        name: `📡 Radar - ${radInfo.stat.toFixed(5)}${radInfo.prefix}`,
        value: drawProgress(radInfo),
        inline: true,
      },
      {
        name: `<:Essence:1517230428828995594> Coke Essence - ${essence.toLocaleString()}`,
        value: `\`Current Max Autohunt: ${maxhunt.toLocaleString()} hunts, ${(gainInfo.stat * durInfo.stat).toLocaleString()} essence, and ${(expInfo.stat * durInfo.stat).toLocaleString()} XP for ${maxCost.toLocaleString()} Coke\``,
        inline: false,
      },
    )
    .setFooter({
      text: `Rank #${rank.toLocaleString()} • ${botInfo.label}`,
    });

  if (user.rpg.autohunt.isActive) {
    const startTime = new Date(user.rpg.autohunt.startTime).getTime();
    const durationMs = user.rpg.autohunt.durationHours * 60 * 60 * 1000;
    const elapsedMs = Date.now() - startTime;
    const remainingMs = Math.max(0, durationMs - elapsedMs);

    const pct = Math.min(100, (elapsedMs / durationMs) * 100).toFixed(2);
    const huntsCount = Math.floor(
      Math.min(user.rpg.autohunt.durationHours, elapsedMs / (60 * 60 * 1000)) *
        effInfo.stat,
    );

    const filled = Math.min(20, Math.round((elapsedMs / durationMs) * 20));
    const activeBar = "[" + "■".repeat(filled) + "□".repeat(20 - filled) + "]";

    embed.addFields({
      name: `${botInfo.emoji} HUNTBOT is currently hunting!`,
      value: `\`BEEP BOOP. I AM STILL HUNTING. I WILL BE BACK IN ${formatDuration(remainingMs)}\`\n` +
        `**${pct}% DONE** | **${huntsCount.toLocaleString()}** HUNTS COMPLETED\n` +
        `${activeBar}\n\n` +
        `*Dùng \`${config.prefix}xautohunt claim\` để nhận thưởng sớm và dừng đi săn.*`,
      inline: false,
    });
  }

  return embed;
};

const renderHarvestReport = (elapsedHours, huntsCount, xpGain, essenceGain, gearsDropped, levelsGained, previousLevel, newLevel) => {
  const countsByRarity = {};
  for (const item of gearsDropped) {
    countsByRarity[item.rarity] = (countsByRarity[item.rarity] || 0) + 1;
  }

  const bracketEmoji = {
    Common: "<:Common:1390024590347997245>",
    Rare: "<:Rare:1390024624380706916>",
    Epic: "<:Epic:1390024749517770832>",
    Legendary: "<:Legendary:1390024772200567026>",
    Mythic: "<:Mythic:1390024789279772833>",
    Ancient: "<:Ancient:1390024806535004333>",
    Divine: "<:Divine:1512512382507683880>",
  };

  const rarityOrder = ["Common", "Rare", "Epic", "Legendary", "Mythic", "Ancient", "Divine"];
  const detailParts = rarityOrder
    .filter(r => countsByRarity[r] > 0)
    .map(r => `${bracketEmoji[r] || ""} **x${countsByRarity[r]}**`);

  const gearDetailLine = detailParts.length > 0 ? detailParts.join("   ") : "*Không tìm thấy trang bị nào*";

  const embed = new EmbedBuilder()
    .setColor("#57F287")
    .setTitle("🤖 HuntBot Báo Cáo Kết Quả Đi Săn")
    .setDescription(
      `Chào chủ nhân, tôi đã hoàn thành đi săn tự động!\n` +
        `⏱️ **Thời gian**: \`${elapsedHours.toFixed(1)} giờ\`  |  🎯 **Lượt săn**: \`${huntsCount.toLocaleString()}\`\n\n` +
        `💎 **Phần thưởng:**\n` +
        `• ⚔️ EXP Nhân vật: **+${xpGain.toLocaleString()}** ${levelsGained > 0 ? `(🎉 **Lên cấp ${newLevel}!**)` : ""}\n` +
        `• <:Essence:1517230428828995594> Coke Essence: **+${essenceGain.toLocaleString()}**\n` +
        `• 🎒 Trang bị nhặt: **${gearsDropped.length}** món\n\n` +
        `📦 **Chi tiết trang bị:**\n` +
        `${gearDetailLine}`
    );

  return embed;
};

class XautohuntCommand extends BaseCommand {
  constructor() {
    super({
      name: "xautohunt",
      aliases: ["autohunt", "hb", "ah", "xah", "xhb"],
      description: "Hệ thống đi săn tự động bằng robot HuntBot.",
      usage: `${config.prefix}xautohunt [duration_hours | upgrade | claim]`,
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
          intent: "Nạp 5000 essence để nâng cấp Efficiency",
          command: `${config.prefix}xautohunt upgrade eff 5000`,
        },
        {
          intent: "Hiến tế trang bị Common",
          command: `${config.prefix}xsacrifice common all`,
        },
        {
          intent: "Nhận phần thưởng autohunt",
          command: `${config.prefix}xautohunt claim`,
        },
      ],
      cooldown: 0
    });
  }

  async execute(message, args = []) {
    const remaining = checkAndSetCooldown(message.author.id, "autohunt", 3);
    if (remaining > 0) {
      return notifyCooldown(message, remaining);
    }

    const { user } = await requireRpgCharacter(message.author.id);
    const memberName = message.member?.displayName || message.author.username;

    // Initialize/migrate autohunt states if not present
    if (!user.rpg.autohunt) {
      user.rpg.autohunt = {
        isActive: false,
        startTime: null,
        durationHours: 0,
        essence: 0,
        totalEssence: 0,
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
        xp: {
          efficiency: 0,
          duration: 0,
          cost: 0,
          gain: 0,
          experience: 0,
          radar: 0,
        }
      };
      user.markModified("rpg");
      await user.save();
    } else if (!user.rpg.autohunt.xp) {
      const oldLevels = user.rpg.autohunt.levels || {
        efficiency: 1,
        duration: 1,
        cost: 1,
        gain: 1,
        experience: 1,
        radar: 1,
      };
      user.rpg.autohunt.xp = {
        efficiency: getCumulativeXpForLevel(oldLevels.efficiency || 1, 'efficiency'),
        duration: getCumulativeXpForLevel(oldLevels.duration || 1, 'duration'),
        cost: getCumulativeXpForLevel(oldLevels.cost || 1, 'cost'),
        gain: getCumulativeXpForLevel(oldLevels.gain || 1, 'gain'),
        experience: getCumulativeXpForLevel(oldLevels.experience || 1, 'experience'),
        radar: getCumulativeXpForLevel(oldLevels.radar || 1, 'radar'),
      };
      user.rpg.autohunt.totalEssence = user.rpg.autohunt.totalEssence || user.rpg.autohunt.essence || 0;
      user.markModified("rpg");
      await user.save();
    }

    // Calculate bot ranking and emoji
    const User = require("../../models/User");
    const totalUsers = await User.countDocuments({ "rpg.autohunt": { $exists: true } });
    const rank = await User.countDocuments({
      "rpg.autohunt.totalEssence": { $gt: user.rpg.autohunt.totalEssence || 0 }
    }) + 1;
    const botInfo = getBot(rank, totalUsers);

    // Auto-claim check: if active and duration has finished
    if (user.rpg.autohunt.isActive) {
      const startTime = new Date(user.rpg.autohunt.startTime).getTime();
      const durationMs = user.rpg.autohunt.durationHours * 60 * 60 * 1000;
      const elapsedMs = Date.now() - startTime;

      if (elapsedMs >= durationMs) {
        // Auto-claim the completed hunt!
        const xp = user.rpg.autohunt.xp;
        const effInfo = getLvl(xp.efficiency, 0, 'efficiency');
        const gainInfo = getLvl(xp.gain, 0, 'gain');
        const expInfo = getLvl(xp.experience, 0, 'experience');
        const radInfo = getLvl(xp.radar, 0, 'radar');

        const elapsedHours = user.rpg.autohunt.durationHours;
        const huntsCount = Math.floor(elapsedHours * effInfo.stat);
        const essenceGain = Math.floor(elapsedHours * gainInfo.stat);
        const xpGain = Math.floor(elapsedHours * expInfo.stat);

        let gearsDropped = [];
        const {
          generateRpgGearDrop,
          addRpgGearToUser,
        } = require("../../utils/rpgUtil");

        for (let i = 0; i < huntsCount; i++) {
          const droppedItem = await generateRpgGearDrop(user, {
            forceDrop: false,
            dropRateBonus: radInfo.stat / 100,
          });
          if (droppedItem) {
            gearsDropped.push(droppedItem);
            addRpgGearToUser(user, droppedItem);
          }
        }

        user.rpg.autohunt.essence = (user.rpg.autohunt.essence || 0) + essenceGain;
        user.rpg.autohunt.totalEssence = (user.rpg.autohunt.totalEssence || 0) + essenceGain;
        const previousLevel = user.rpg.level;
        const levelsGained = addRpgExp(user.rpg, xpGain);
        user.rpg.power = calculateRpgPower(user);

        // Update quest progress
        const { updateQuestProgress } = require("../../utils/questUtil");
        if (xpGain > 0) {
          await updateQuestProgress(user, "exp_gain", xpGain, message.channel);
        }
        // Quest hunt_loot chỉ được hoàn thành qua hunt thủ công, không tính cho autohunt


        // Reset states
        user.rpg.autohunt.isActive = false;
        user.rpg.autohunt.startTime = null;
        user.rpg.autohunt.durationHours = 0;
        user.rpg.autohunt.captchaCode = null;
        user.rpg.autohunt.pendingDuration = 0;
        user.rpg.autohunt.dmReminder = false;
        user.markModified("rpg");
        await user.save();

        const embed = renderHarvestReport(
          elapsedHours,
          huntsCount,
          xpGain,
          essenceGain,
          gearsDropped,
          levelsGained,
          previousLevel,
          user.rpg.level
        );

        return message.reply({ content: `🎉 **Auto Hunt Hoàn Thành!**`, embeds: [embed] });
      }
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

    // 2. UPGRADE SUBCOMMAND
    if (subCommand === "upgrade" || subCommand === "up") {
      const inputTrait = args[1]?.toLowerCase();
      const trait = traitMapping[inputTrait];
      if (!trait) {
        return message.reply(
          `${config.emoji.no} Chỉ số nâng cấp không hợp lệ. Các chỉ số: \`efficiency\` (\`eff\`), \`duration\` (\`dur\`), \`cost\`, \`gain\`, \`experience\` (\`exp\`), \`radar\` (\`rad\`).`,
        );
      }

      const currentEssence = user.rpg.autohunt.essence || 0;
      if (currentEssence <= 0) {
        return message.reply(`${config.emoji.no} Bạn không có Essence nào để nâng cấp.`);
      }

      let essenceToSpend = currentEssence;
      if (args[2] && !isNaN(args[2])) {
        const parsedEssence = parseInt(args[2]);
        if (parsedEssence > 0) {
          essenceToSpend = Math.min(currentEssence, parsedEssence);
        }
      }

      const xp = user.rpg.autohunt.xp;
      const currentXp = xp[trait] || 0;
      const xpForMax = getXpForMax(trait);

      if (currentXp >= xpForMax) {
        return message.reply(
          `${config.emoji.warning} Chỉ số này đã đạt cấp độ tối đa [MAX]!`,
        );
      }

      const xpNeededForMax = xpForMax - currentXp;
      if (essenceToSpend > xpNeededForMax) {
        essenceToSpend = xpNeededForMax;
      }

      const lvlBefore = getLvl(currentXp, 0, trait).lvl;
      const nextXp = currentXp + essenceToSpend;
      const lvlAfter = getLvl(nextXp, 0, trait).lvl;

      user.rpg.autohunt.essence = currentEssence - essenceToSpend;
      user.rpg.autohunt.xp[trait] = nextXp;
      user.rpg.autohunt.levels[trait] = lvlAfter;
      user.markModified("rpg");
      await user.save();

      if (lvlAfter > lvlBefore) {
        return message.reply(
          `⚙️ **Nâng Cấp HuntBot**\n` +
            `Nâng cấp thành công chỉ số **${trait}** (Lên cấp **${lvlAfter}**).\n` +
            `Tiêu hao: **${essenceToSpend.toLocaleString()} Essence** | Essence còn lại: **${user.rpg.autohunt.essence.toLocaleString()}**`,
        );
      } else {
        return message.reply(
          `⚙️ **Nạp Essence HuntBot**\n` +
            `Nạp thành công **+${essenceToSpend.toLocaleString()} XP** vào chỉ số **${trait}** (Cấp ${lvlAfter} \`[${getLvl(nextXp, 0, trait).currentxp}/${getLvl(nextXp, 0, trait).maxxp}]\`).\n` +
            `Tiêu hao: **${essenceToSpend.toLocaleString()} Essence** | Essence còn lại: **${user.rpg.autohunt.essence.toLocaleString()}**`,
        );
      }
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

      const xp = user.rpg.autohunt.xp;
      const effInfo = getLvl(xp.efficiency, 0, 'efficiency');
      const gainInfo = getLvl(xp.gain, 0, 'gain');
      const expInfo = getLvl(xp.experience, 0, 'experience');
      const radInfo = getLvl(xp.radar, 0, 'radar');

      const huntsCount = Math.floor(elapsedHours * effInfo.stat);
      const essenceGain = Math.floor(elapsedHours * gainInfo.stat);
      const xpGain = Math.floor(elapsedHours * expInfo.stat);

      let gearsDropped = [];
      const {
        generateRpgGearDrop,
        addRpgGearToUser,
      } = require("../../utils/rpgUtil");

      // Simulate drops in background
      for (let i = 0; i < huntsCount; i++) {
        const droppedItem = await generateRpgGearDrop(user, {
          forceDrop: false,
          dropRateBonus: radInfo.stat / 100,
        });
        if (droppedItem) {
          gearsDropped.push(droppedItem);
          addRpgGearToUser(user, droppedItem);
        }
      }

      // Add essence and XP
      user.rpg.autohunt.essence = (user.rpg.autohunt.essence || 0) + essenceGain;
      user.rpg.autohunt.totalEssence = (user.rpg.autohunt.totalEssence || 0) + essenceGain;
      const previousLevel = user.rpg.level;
      const levelsGained = addRpgExp(user.rpg, xpGain);
      user.rpg.power = calculateRpgPower(user);

      // Update quest progress
      const { updateQuestProgress } = require("../../utils/questUtil");
      if (xpGain > 0) {
        await updateQuestProgress(user, "exp_gain", xpGain, message.channel);
      }
      // Quest hunt_loot chỉ được hoàn thành qua hunt thủ công, không tính cho autohunt

      // Reset states
      user.rpg.autohunt.isActive = false;
      user.rpg.autohunt.startTime = null;
      user.rpg.autohunt.durationHours = 0;
      user.rpg.autohunt.captchaCode = null;
      user.rpg.autohunt.pendingDuration = 0;
      user.rpg.autohunt.dmReminder = false;
      user.markModified("rpg");
      await user.save();

      const embed = renderHarvestReport(
        elapsedHours,
        huntsCount,
        xpGain,
        essenceGain,
        gearsDropped,
        levelsGained,
        previousLevel,
        user.rpg.level
      );

      return message.reply({ embeds: [embed] });
    }

    // 4. CAPTCHA AND START AUTOHUNT
    let cokeAmount = null;
    let durationHours = null;
    let captchaInput = null;

    const arg0 = args[0]?.trim();
    const arg1 = args[1]?.trim();

    const isDuration = (str) => {
      if (!str) return false;
      if (/^\d+(\.\d+)?[hH]$/.test(str)) return true;
      const val = parseFloat(str);
      return !isNaN(val) && val > 0 && val <= 48;
    };

    const parseDuration = (str) => {
      const match = str.match(/^(\d+(\.\d+)?)[hH]?$/);
      return match ? parseFloat(match[1]) : null;
    };

    if (arg0 && isDuration(arg0)) {
      durationHours = parseDuration(arg0);
      captchaInput = arg1;
    } else if (arg1 && isDuration(arg1)) {
      durationHours = parseDuration(arg1);
      captchaInput = arg0;
    } else if (arg0 && !isNaN(parseInt(arg0))) {
      cokeAmount = parseInt(arg0);
      captchaInput = arg1;
    } else if (arg1 && !isNaN(parseInt(arg1))) {
      cokeAmount = parseInt(arg1);
      captchaInput = arg0;
    }

    if (durationHours !== null || cokeAmount !== null) {
      if (user.rpg.autohunt.isActive) {
        return message.reply(
          `${config.emoji.warning} HuntBot của bạn đang đi săn! Gõ \`${config.prefix}xautohunt\` để xem trạng thái hoặc \`${config.prefix}xautohunt claim\` để nhận thưởng sớm.`,
        );
      }

      const xp = user.rpg.autohunt.xp;
      const effInfo = getLvl(xp.efficiency, 0, 'efficiency');
      const durInfo = getLvl(xp.duration, 0, 'duration');
      const costInfo = getLvl(xp.cost, 0, 'cost');
      const gainInfo = getLvl(xp.gain, 0, 'gain');
      const expInfo = getLvl(xp.experience, 0, 'experience');

      const maxDuration = durInfo.stat;
      const efficiency = effInfo.stat;
      const costPerHunt = costInfo.stat;

      let duration = durationHours;
      if (cokeAmount !== null) {
        duration = cokeAmount / (efficiency * costPerHunt);
      }

      if (duration < 0.1) {
        return message.reply(
          `${config.emoji.no} Thời gian Auto Hunt hoặc số lượng Coke không hợp lệ! Vui lòng chọn thời gian dài hơn.`,
        );
      }

      if (duration > maxDuration) {
        duration = maxDuration;
      }

      // Calculate final Coke cost for this duration
      const totalCost = Math.round(duration * efficiency * costPerHunt);

      if (user.coke < totalCost) {
        return message.reply(
          `${config.emoji.no} Bạn không có đủ Coke để trả chi phí thuê HuntBot.\n` +
            `Chi phí yêu cầu: **${totalCost.toLocaleString()} Coke** | Số dư của bạn: **${user.coke.toLocaleString()} Coke**`,
        );
      }

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

        const durHrs = Math.floor(duration);
        const durMins = Math.round((duration - durHrs) * 60);
        const durationStr = durHrs > 0 ? `${durHrs}h` : `${durMins}m`;

        return message.reply({
          content: `🤖 | **${memberName}**, Here is your password!\n| Use the command \`xautohunt ${durationStr} {password}\``,
          files: [attachment],
        });
      }

      // Case 4b: VERIFY CAPTCHA AND START
      const expectedCaptcha = user.rpg.autohunt.captchaCode;
      const expectedDuration = user.rpg.autohunt.pendingDuration;

      if (!expectedCaptcha || Math.abs(expectedDuration - duration) > 0.02) {
        const durHrs = Math.floor(duration);
        const durMins = Math.round((duration - durHrs) * 60);
        const durationStr = durHrs > 0 ? `${durHrs}h` : `${durMins}m`;

        return message.reply(
          `${config.emoji.no} Mã bảo mật hoặc số giờ không khớp với phiên hiện tại. Vui lòng gõ \`xautohunt ${durationStr}\` để lấy captcha mới.`,
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
      user.rpg.autohunt.dmReminder = false; // Reset reminder
      user.markModified("rpg");
      await user.save();

      const hrs = Math.floor(duration);
      const mins = Math.round((duration - hrs) * 60);
      const timeStr = `${hrs}H ${mins}M`;

      const huntsCount = Math.floor(duration * efficiency);

      const replyMsg = await message.reply(
        `🤖 | **BEEP BOOP.** **${memberName}** , YOU SPENT **${totalCost.toLocaleString()}** Coke\n` +
          `| **I WILL BE BACK IN ${timeStr} WITH ${huntsCount.toLocaleString()} HUNTS,**\n` +
          `| **${Math.floor(duration * gainInfo.stat).toLocaleString()} ESSENCE, AND ${Math.floor(duration * expInfo.stat).toLocaleString()} EXPERIENCE**`,
      );

      // React to the message with ⏰
      await replyMsg.react("⏰").catch(() => {});

      // Setup a collector to listen for reactions (valid for 5 minutes)
      const collector = replyMsg.createReactionCollector({
        filter: (reaction, u) => reaction.emoji.name === "⏰" && u.id === message.author.id,
        time: 5 * 60 * 1000,
        max: 1,
      });

      collector.on("collect", async (reaction, u) => {
        try {
          const refreshedUser = await User.findOne({ userId: message.author.id });
          if (refreshedUser && refreshedUser.rpg?.autohunt?.isActive) {
            refreshedUser.rpg.autohunt.dmReminder = true;
            refreshedUser.markModified("rpg");
            await refreshedUser.save();

            await message.reply(`${config.emoji.yes || "✅"} Đã cài đặt nhắc nhở gửi qua DM khi autohunt kết thúc!`).catch(() => {});

            const elapsedMs = Date.now() - new Date(refreshedUser.rpg.autohunt.startTime).getTime();
            const totalDurationMs = refreshedUser.rpg.autohunt.durationHours * 60 * 60 * 1000;
            const remainingMs = Math.max(0, totalDurationMs - elapsedMs);

            setTimeout(async () => {
              try {
                const checkUser = await User.findOne({ userId: message.author.id });
                if (checkUser && checkUser.rpg?.autohunt?.isActive && checkUser.rpg?.autohunt?.dmReminder) {
                  const discordUser = await message.client.users.fetch(message.author.id).catch(() => null);
                  if (discordUser) {
                    const dmChannel = await discordUser.createDM();
                    await dmChannel.send(`⏰ **[HuntBot]** Autohunt của bạn đã kết thúc! Hãy dùng lệnh \`${config.prefix}xautohunt\` để nhận thưởng.`);
                  }
                  checkUser.rpg.autohunt.dmReminder = false;
                  checkUser.markModified("rpg");
                  await checkUser.save();
                }
              } catch (err) {
                console.error(`Failed to send autohunt DM reminder to user ${message.author.id}:`, err);
              }
            }, remainingMs);
          }
        } catch (err) {
          console.error("Error setting up autohunt reminder:", err);
        }
      });

      return replyMsg;
    }

    // 5. STATUS / VIEW PANEL (No args)
    return message.reply({ embeds: [renderAutohuntPanel(user, memberName, rank, totalUsers, botInfo)] });
  }
}

module.exports = new XautohuntCommand();
