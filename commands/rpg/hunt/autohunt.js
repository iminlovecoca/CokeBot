const BaseCommand = require("../../../core/BaseCommand");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require("discord.js");
const config = require("../../../data/config");
const User = require("../../../models/User");
const {
  requireRpgCharacter,
  addRpgExp,
  calculateRpgPower,
} = require("../../../utils/rpgUtil");
const {
  generateVerificationCode,
  generateCaptchaImage,
} = require("../../../utils/anticheat");
const { checkAndSetCooldown, notifyCooldown } = require("../../../utils/cooldown");
const { getRpgColor, getRarityEmoji, formatRpgBar, formatRpgFooter, formatRpgTitle } = require("../../../utils/rpgUi");
const traits = {
  efficiency: { inc: 10, pow: 1.748, base: 25, upg: 1, max: 215, prefix: " lượt/giờ" },
  duration: { inc: 10, pow: 1.7, base: 0.5, upg: 0.1, max: 235, prefix: " giờ" },
  cost: { inc: 1000, pow: 3.4, base: 10, upg: -1, max: 5, prefix: " Coke" },
  gain: { inc: 10, pow: 1.8, base: 0, upg: 25, max: 200, prefix: " Essence/giờ" },
  experience: { inc: 10, pow: 1.8, base: 0, upg: 35, max: 200, prefix: " EXP/giờ" },
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
const bots = [
  { emoji: '<:common:1530878565489311826>', label: 'Common Bot' },
  { emoji: '<:rare:1530878574104547378>', label: 'Rare Bot' },
  { emoji: '<:epic:1530878567955566642>', label: 'Epic Bot' },
  { emoji: '<:legendary:1530878570858287205>', label: 'Legendary Bot' },
  { emoji: '<a:mythic:1530878614843686912>', label: 'Mythic Bot' },
  { emoji: '<a:ancient:1530878606656540814>', label: 'Ancient Bot' },
  { emoji: '<a:divine:1530878610515165365>', label: 'Divine Bot' },
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
  if (hrs === 0) return `${mins} phút`;
  if (mins === 0) return `${hrs} giờ`;
  return `${hrs} giờ ${mins} phút`;
};
const getEmojiCdnUrl = (emojiStr) => {
  const match = emojiStr.match(/:(\d+)>/);
  if (match) {
    return `https://cdn.discordapp.com/emojis/${match[1]}.png`;
  }
  return "https://i.imgur.com/PZcZpZg.png";
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
      return `\`Cấp ${info.lvl} • TỐI ĐA\`\n\`[${formatRpgBar(info.currentxp, info.maxxp, 16)}]\``;
    }
    const bar = `[${formatRpgBar(info.currentxp, info.maxxp, 16)}]`;
    return `\`Cấp ${info.lvl}\` \`[${info.currentxp.toLocaleString()}/${info.maxxp.toLocaleString()}]\`\n\`${bar}\``;
  };
  const maxhunt = Math.floor(durInfo.stat * effInfo.stat);
  const maxCost = maxhunt * costInfo.stat;
  const embed = new EmbedBuilder()
    .setColor(getRpgColor("brand"))
    .setTitle(formatRpgTitle(`HuntBot • ${memberName}`, "🏹"))
    .setThumbnail(getEmojiCdnUrl(botInfo.emoji))
    .setDescription(
      `Tự động đi săn để tích lũy Essence, EXP và chiến lợi phẩm.\n` +
        `Bắt đầu: \`${config.prefix}autohunt <Coke | thời lượng>\`  •  Nâng cấp: \`${config.prefix}upgrade <trait>\`\n` +
        `Đổi trang bị dư lấy Essence: \`${config.prefix}sacrifice <rarity> <số lượng>\`.\n\n`,
    )
    .addFields(
      {
        name: `Hiệu suất • ${effInfo.stat}${effInfo.prefix}`,
        value: drawProgress(effInfo),
        inline: true,
      },
      {
        name: `Thời lượng • ${durInfo.stat}${durInfo.prefix}`,
        value: drawProgress(durInfo),
        inline: true,
      },
      {
        name: `${config.emoji.money} Chi phí • ${costInfo.stat}${costInfo.prefix}`,
        value: drawProgress(costInfo),
        inline: true,
      },
      {
        name: `Essence • ${gainInfo.stat}${gainInfo.prefix}`,
        value: drawProgress(gainInfo),
        inline: true,
      },
      {
        name: `Kinh nghiệm • ${expInfo.stat}${expInfo.prefix}`,
        value: drawProgress(expInfo),
        inline: true,
      },
      {
        name: `Radar • ${radInfo.stat.toFixed(5)}${radInfo.prefix}`,
        value: drawProgress(radInfo),
        inline: true,
      },
      {
        name: `<:Essence:1517230428828995594> Essence hiện có • ${essence.toLocaleString()}`,
        value: `Tối đa mỗi lượt: **${maxhunt.toLocaleString()}** chuyến • **${(gainInfo.stat * durInfo.stat).toLocaleString()}** Essence • **${(expInfo.stat * durInfo.stat).toLocaleString()}** EXP\nChi phí ước tính: **${maxCost.toLocaleString()}** ${config.emoji.money}`,
        inline: false,
      },
    )
    .setFooter(formatRpgFooter(`Xếp hạng #${rank.toLocaleString()} • ${botInfo.label}`));
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
    const activeBar = `\`[${formatRpgBar(elapsedMs, durationMs, 20)}]\``;
    embed.addFields({
      name: `${botInfo.emoji} HuntBot đang hoạt động`,
      value: `Hoàn thành **${pct}%** • **${huntsCount.toLocaleString()}** chuyến đã thực hiện\n` +
        `Quay lại sau khoảng **${formatDuration(remainingMs)}**\n` +
        `${activeBar}\n\n` +
        `*Dùng \`${config.prefix}autohunt claim\` để nhận thưởng sớm và dừng đi săn.*`,
      inline: false,
    });
  }
  return embed;
};
const toSuperscript = (num, minDigits = 1) => {
  const map = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
  };
  let str = String(Math.max(0, num));
  if (str.length < minDigits) {
    str = '0'.repeat(minDigits - str.length) + str;
  }
  return str.split('').map(c => map[c] || c).join('');
};
const renderHarvestReportLines = (elapsedHours, huntsCount, xpGain, essenceGain, gearsDropped, levelsGained, previousLevel, newLevel, botInfo, petsCaught = [], totalDuplicatePetExp = 0) => {
  const ebotEmoji = botInfo.emoji || "🤖";
  const blankEmoji = config.emoji.blank || "<:blank:1403928807395819671>";
  const rarityOrder = ["Common", "Rare", "Epic", "Legendary", "Mythic", "Ancient", "Divine"];
  const groupedByRarity = {};
  for (const r of rarityOrder) {
    groupedByRarity[r] = {};
  }
  let biggest = 0;
  for (const item of gearsDropped) {
    const rarity = item.rankName || item.tier || item.rarity || "Common";
    const itemEmoji = item.emoji || (item.subType === "Staff" ? "<:staff:1514231936581898240>" : "<:longsword:1514231939865903104>");
    if (!groupedByRarity[rarity]) {
      groupedByRarity[rarity] = {};
    }
    groupedByRarity[rarity][itemEmoji] = (groupedByRarity[rarity][itemEmoji] || 0) + 1;
    if (groupedByRarity[rarity][itemEmoji] > biggest) {
      biggest = groupedByRarity[rarity][itemEmoji];
    }
  }
  const digits = Math.trunc(Math.log10(biggest || 1) + 1);
  const lines = [
    `${ebotEmoji} **|** **HuntBot đã hoàn thành** • ${huntsCount.toLocaleString()} lượt săn`,
    `${blankEmoji} **|** Nhận **${essenceGain.toLocaleString()} Essence** và **${xpGain.toLocaleString()} EXP**`,
  ];
  if (petsCaught.length > 0) {
    const petStr = petsCaught.map((p) => `${getRarityEmoji(p.tier)} ${p.emoji} **${p.name}**`).join(", ");
    lines.push(`🔮 **|** 🎉 **Linh thú mới:** ${petStr}`);
  }
  if (totalPetExpGained > 0) {
    lines.push(`🐾 **|** Linh thú đang trang bị nhận được **+${totalPetExpGained.toLocaleString()} EXP**!`);
  }
  for (const rarity of rarityOrder) {
    const itemsMap = groupedByRarity[rarity];
    if (itemsMap && Object.keys(itemsMap).length > 0) {
      const rarityEmoji = getRarityEmoji(rarity);
      const itemStrings = Object.entries(itemsMap).map(([emoji, count]) => {
        return `${emoji}${toSuperscript(count, digits)}`;
      });
      const chunkSize = 6;
      for (let i = 0; i < itemStrings.length; i += chunkSize) {
        const chunk = itemStrings.slice(i, i + chunkSize);
        const prefixEmoji = i === 0 ? rarityEmoji : blankEmoji;
        lines.push(`${prefixEmoji} **|** ${chunk.join("   ")}`);
      }
    }
  }
  return lines;
};

const sendHarvestReport = async (message, elapsedHours, huntsCount, xpGain, essenceGain, gearsDropped, levelsGained, previousLevel, newLevel, botInfo, petsCaught = [], totalPetExpGained = 0) => {
  const lines = renderHarvestReportLines(
    elapsedHours,
    huntsCount,
    xpGain,
    essenceGain,
    gearsDropped,
    levelsGained,
    previousLevel,
    newLevel,
    botInfo,
    petsCaught,
    totalPetExpGained
  );

  const chunks = [];
  let cur = [];
  let curLen = 0;

  for (const line of lines) {
    const lineLen = line.length + 1;
    if (curLen + lineLen > 1800 && cur.length > 0) {
      chunks.push(cur.join("\n"));
      cur = [line];
      curLen = lineLen;
    } else {
      cur.push(line);
      curLen += lineLen;
    }
  }
  if (cur.length > 0) {
    chunks.push(cur.join("\n"));
  }

  if (chunks.length === 0) return;

  const firstMsg = await message.reply({ content: chunks[0], skipV2: true }).catch(() => null);
  for (let i = 1; i < chunks.length; i++) {
    await message.channel.send({ content: chunks[i], skipV2: true }).catch(() => null);
  }
  return firstMsg;
};
class XautohuntCommand extends BaseCommand {
  constructor() {
    super({
      name: "xautohunt",
      aliases: ["autohunt", "hb", "ah", "xah", "xhb"],
      description: "Hệ thống đi săn tự động bằng robot HuntBot.",
      usage: `${config.prefix}autohunt [duration_hours | upgrade | claim]`,
      examples: [
        {
          intent: "Xem bảng nâng cấp HuntBot",
          command: `${config.prefix}autohunt`,
        },
        {
          intent: "Bắt đầu tự động săn 24h",
          command: `${config.prefix}autohunt 24`,
        },
        {
          intent: "Nạp 5000 essence để nâng cấp Efficiency",
          command: `${config.prefix}autohunt upgrade eff 5000`,
        },
        {
          intent: "Hiến tế trang bị Common",
          command: `${config.prefix}sacrifice common all`,
        },
        {
          intent: "Nhận phần thưởng autohunt",
          command: `${config.prefix}autohunt claim`,
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
    const User = require("../../../models/User");
    const totalUsers = await User.countDocuments({ "rpg.autohunt": { $exists: true } });
    const rank = await User.countDocuments({
      "rpg.autohunt.totalEssence": { $gt: user.rpg.autohunt.totalEssence || 0 }
    }) + 1;
    const botInfo = getBot(rank, totalUsers);
    if (user.rpg.autohunt.isActive) {
      const startTime = new Date(user.rpg.autohunt.startTime).getTime();
      const durationMs = user.rpg.autohunt.durationHours * 60 * 60 * 1000;
      const elapsedMs = Date.now() - startTime;
      if (elapsedMs >= durationMs) {
        const xp = user.rpg.autohunt.xp;
        const effInfo = getLvl(xp.efficiency, 0, 'efficiency');
        const gainInfo = getLvl(xp.gain, 0, 'gain');
        const expInfo = getLvl(xp.experience, 0, 'experience');
        const radInfo = getLvl(xp.radar, 0, 'radar');
        const elapsedHours = user.rpg.autohunt.durationHours;
        const huntsCount = Math.floor(elapsedHours * effInfo.stat);
        const essenceGain = Math.floor(elapsedHours * gainInfo.stat);
        const xpGain = Math.floor(elapsedHours * expInfo.stat);
        const { rollAnimal, addAnimalToUserZoo } = require("../../../data/animals");
        const { getHuntXp, addPetXp: addPetXpUtil } = require("../../../utils/petXpUtil");
        let animalsDropped = [];
        let petsCaught = [];
        let totalPetExpGained = 0;
        for (let i = 0; i < huntsCount; i++) {
          const caughtAnimal = rollAnimal(1.0, 1.0, {
            isAutohunt: true,
            radarStat: radInfo.stat || 0,
          });
          animalsDropped.push(caughtAnimal);
          const { isNewSpecies, petObj } = addAnimalToUserZoo(user, caughtAnimal, 1);
          const animalTier = caughtAnimal.rankName || caughtAnimal.tier || "Common";
          if (caughtAnimal.rankName === "Bot") {
            essenceGain += (caughtAnimal.essence || 10000);
          }
          if (user.rpg.equippedPet) {
            const petHuntXp = getHuntXp(animalTier);
            addPetXpUtil(user.rpg.equippedPet, petHuntXp, user);
            totalPetExpGained += petHuntXp;
          }
          if (isNewSpecies && petObj) {
            petsCaught.push(petObj);
          }
        }
        if (user.rpg.equippedPet && xpGain > 0) {
          addPetXpUtil(user.rpg.equippedPet, xpGain, user);
          totalPetExpGained += xpGain;
        }
        user.rpg.autohunt.essence = (user.rpg.autohunt.essence || 0) + essenceGain;
        user.rpg.autohunt.totalEssence = (user.rpg.autohunt.totalEssence || 0) + essenceGain;
        const previousLevel = user.rpg.level;
        const levelsGained = addRpgExp(user.rpg, xpGain);
        user.rpg.power = calculateRpgPower(user);
        const { updateQuestProgress } = require("../../../utils/questUtil");
        if (xpGain > 0) {
          await updateQuestProgress(user, "exp_gain", xpGain, message.channel);
        }
        user.rpg.autohunt.isActive = false;
        user.rpg.autohunt.startTime = null;
        user.rpg.autohunt.durationHours = 0;
        user.rpg.autohunt.captchaCode = null;
        user.rpg.autohunt.pendingDuration = 0;
        user.rpg.autohunt.dmReminder = false;
        user.markModified("rpg");
        await user.save();
        return sendHarvestReport(
          message,
          elapsedHours,
          huntsCount,
          xpGain,
          essenceGain,
          animalsDropped,
          levelsGained,
          previousLevel,
          user.rpg.level,
          botInfo,
          petsCaught,
          totalPetExpGained
        );
      }
    }
    const subCommand = args[0]?.toLowerCase();
    if (subCommand === "sacrifice" || subCommand === "sac") {
      const targetRarityAbbr = args[1]?.toLowerCase();
      const targetRarity = rarityMapping[targetRarityAbbr];
      if (!targetRarity) {
        return message.reply(
          `${config.emoji.no} Cú pháp hiến tế không hợp lệ! Hãy dùng: \`${config.prefix}autohunt sacrifice {rarity} {count|all}\`\n` +
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
        (item) => item.rarity === targetRarity && !equippedIds.has(item.id) && !item.isGodset,
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
      const sacIds = new Set(itemsToSacrifice.map((it) => it.id));
      user.rpg.items = userItems.filter((it) => !sacIds.has(it.id));
      user.rpg.autohunt.essence =
        (user.rpg.autohunt.essence || 0) + totalEssenceGain;
      user.rpg.autohunt.totalEssence =
        (user.rpg.autohunt.totalEssence || 0) + totalEssenceGain;
      user.rpg.power = calculateRpgPower(user);
      user.markModified("rpg");
      await user.save();
      return message.reply(
        `🌌 **Tế Đàn Tinh Hoa RPG**\n` +
          `Bạn đã hiến tế **${itemsToSacrifice.length}** trang bị ${getRarityEmoji(targetRarity)} **${targetRarity}** và nhận được **+${totalEssenceGain.toLocaleString()} Essence**!`,
      );
    }
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
          `${config.emoji.warning} Chỉ số **${trait}** đã đạt cấp độ tối đa.`,
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
        const progressInfo = getLvl(nextXp, 0, trait);
        return message.reply(
          `⚙️ **Nạp Essence HuntBot**\n` +
            `Nạp thành công **+${essenceToSpend.toLocaleString()} XP** vào chỉ số **${trait}** (Cấp ${lvlAfter} \`[${progressInfo.currentxp}/${progressInfo.maxxp}]\`).\n` +
            `Tiêu hao: **${essenceToSpend.toLocaleString()} Essence** | Essence còn lại: **${user.rpg.autohunt.essence.toLocaleString()}**`,
        );
      }
    }
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
      const { rollAnimal, addAnimalToUserZoo } = require("../../../data/animals");
      const { getHuntXp, addPetXp: addPetXpUtil } = require("../../../utils/petXpUtil");
      let animalsDropped = [];
      let petsCaught = [];
      let totalPetExpGained = 0;
      // Process animal captures into user.zoo and pet XP per hunt (Strict OwO Autohunt rates with Radar)
      for (let i = 0; i < huntsCount; i++) {
        const caughtAnimal = rollAnimal(1.0, 1.0, {
          isAutohunt: true,
          radarStat: radInfo.stat || 0,
        });
        animalsDropped.push(caughtAnimal);
        const { isNewSpecies, petObj } = addAnimalToUserZoo(user, caughtAnimal, 1);
        const animalTier = caughtAnimal.rankName || caughtAnimal.tier || "Common";
        if (caughtAnimal.rankName === "Bot") {
          essenceGain += (caughtAnimal.essence || 10000);
        }
        if (user.rpg.equippedPet) {
          const petHuntXp = getHuntXp(animalTier);
          addPetXpUtil(user.rpg.equippedPet, petHuntXp, user);
          totalPetExpGained += petHuntXp;
        }
        if (isNewSpecies && petObj) {
          petsCaught.push(petObj);
        }
      }
      if (user.rpg.equippedPet && xpGain > 0) {
        addPetXpUtil(user.rpg.equippedPet, xpGain, user);
        totalPetExpGained += xpGain;
      }
      user.rpg.autohunt.essence = (user.rpg.autohunt.essence || 0) + essenceGain;
      user.rpg.autohunt.totalEssence = (user.rpg.autohunt.totalEssence || 0) + essenceGain;
      const previousLevel = user.rpg.level;
      const levelsGained = addRpgExp(user.rpg, xpGain);
      user.rpg.power = calculateRpgPower(user);
      const { updateQuestProgress } = require("../../../utils/questUtil");
      if (xpGain > 0) {
        await updateQuestProgress(user, "exp_gain", xpGain, message.channel);
      }
      user.rpg.autohunt.isActive = false;
      user.rpg.autohunt.startTime = null;
      user.rpg.autohunt.durationHours = 0;
      user.rpg.autohunt.captchaCode = null;
      user.rpg.autohunt.pendingDuration = 0;
      user.rpg.autohunt.dmReminder = false;
      user.markModified("rpg");
      await user.save();
      return sendHarvestReport(
        message,
        elapsedHours,
        huntsCount,
        xpGain,
        essenceGain,
        animalsDropped,
        levelsGained,
        previousLevel,
        user.rpg.level,
        botInfo,
        petsCaught,
        totalPetExpGained
      );
    }
    if (subCommand) {
      const durInfo = getLvl(user.rpg.autohunt.xp.duration, 0, 'duration');
      const maxDurationHours = durInfo.stat;
      let requestedHours = null;
      if (subCommand === "all" || subCommand === "max") {
        requestedHours = maxDurationHours;
      } else {
        const match = subCommand.match(/^(\d+(?:\.\d+)?)(?:h|hr|hrs|g|giờ)?$/i);
        if (match) {
          requestedHours = parseFloat(match[1]);
        }
      }
      if (requestedHours !== null && !isNaN(requestedHours) && requestedHours > 0) {
        if (user.rpg.autohunt.isActive) {
          return message.reply(
            `${config.emoji.warning} HuntBot của bạn hiện đang đi săn rồi! Gõ \`${config.prefix}autohunt\` để xem thông tin tiến trình.`
          );
        }
        const actualDurationHours = Math.min(requestedHours, maxDurationHours);
        const effInfo = getLvl(user.rpg.autohunt.xp.efficiency, 0, 'efficiency');
        const gainInfo = getLvl(user.rpg.autohunt.xp.gain, 0, 'gain');
        const expInfo = getLvl(user.rpg.autohunt.xp.experience, 0, 'experience');
        const costInfo = getLvl(user.rpg.autohunt.xp.cost, 0, 'cost');
        const huntsCount = Math.floor(actualDurationHours * effInfo.stat);
        const expectedEssence = Math.floor(actualDurationHours * gainInfo.stat);
        const expectedXp = Math.floor(actualDurationHours * expInfo.stat);
        const totalCost = huntsCount * costInfo.stat;
        if ((user.coke || 0) < totalCost) {
          return message.reply(
            `${config.emoji.no} Bạn không đủ Coke! Cần **${totalCost.toLocaleString()} Coke** để HuntBot đi săn **${actualDurationHours} giờ** (${huntsCount.toLocaleString()} lượt săn), nhưng bạn chỉ có **${(user.coke || 0).toLocaleString()} Coke**.`
          );
        }
        const providedPassword = args[1]?.toLowerCase();
        const storedPassword = user.rpg.autohunt.captchaCode?.toLowerCase();
        if (!providedPassword || !storedPassword || providedPassword !== storedPassword) {
          const newCode = generateVerificationCode();
          user.rpg.autohunt.captchaCode = newCode;
          user.rpg.autohunt.pendingDuration = actualDurationHours;
          user.markModified("rpg");
          await user.save();
          const imageBuffer = generateCaptchaImage(newCode);
          return message.reply({
            content: `🤖 **Xác thực HuntBot** • ${memberName}\n` +
              `• Nhập lệnh \`${config.prefix}autohunt ${args[0]} {mã}\` để tiếp tục.`,
            files: [{ attachment: imageBuffer, name: "captcha.png" }],
            skipV2: true
          });
        }
        user.coke = (user.coke || 0) - totalCost;
        user.rpg.autohunt.isActive = true;
        user.rpg.autohunt.startTime = new Date();
        user.rpg.autohunt.durationHours = actualDurationHours;
        user.rpg.autohunt.dmReminder = false;
        user.rpg.autohunt.captchaCode = null;
        user.rpg.autohunt.pendingDuration = 0;
        user.markModified("rpg");
        await user.save();
        const hrs = Math.floor(actualDurationHours);
        const mins = Math.round((actualDurationHours - hrs) * 60);
        const timeStr = mins === 0 ? `${hrs} giờ` : `${hrs} giờ ${mins} phút`;
        const startMsg = [
          `🤖 **HuntBot đã bắt đầu** • ${memberName}`,
          `• Thời lượng: **${timeStr}** • Chi phí: **${totalCost.toLocaleString()} Coke**`,
          `• Dự kiến: **${huntsCount.toLocaleString()} lượt săn** • **${expectedEssence.toLocaleString()} Essence** • **${expectedXp.toLocaleString()} EXP**`,
        ].join("\n");

        const sentMsg = await message.reply({ content: startMsg, skipV2: true });

        sentMsg.react("⏰").catch(() => null);

        const reactionCollector = sentMsg.createReactionCollector({
          filter: (reaction, user) => reaction.emoji.name === "⏰" && user.id === message.author.id,
          time: 300000,
        });

        reactionCollector.on("collect", async (reaction, uObj) => {
          const dbUser = await User.findOne({ userId: message.author.id });
          if (dbUser && dbUser.rpg && dbUser.rpg.autohunt && dbUser.rpg.autohunt.isActive) {
            if (!dbUser.rpg.autohunt.dmReminder) {
              dbUser.rpg.autohunt.dmReminder = true;
              dbUser.markModified("rpg");
              await dbUser.save();

              await sentMsg.channel.send({
                content: `<@${message.author.id}> ⏰ **Đã bật thông báo!** Bot sẽ gửi tin nhắn riêng cho bạn khi Autohunt hoàn thành.`
              }).catch(() => null);
            }
          }
        });

        return sentMsg;
      }
    }
    return message.reply({ embeds: [renderAutohuntPanel(user, memberName, rank, totalUsers, botInfo)], skipV2: true });
  }
}
module.exports = new XautohuntCommand();
