const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../../data/config");
const { requireRpgCharacter } = require("../../../utils/rpgUtil");
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
class UpgradeCommand extends BaseCommand {
  constructor() {
    super({
      name: "upgrade",
      aliases: ["up", "xup"],
      description: "Nâng cấp chỉ số HuntBot bằng Essence.",
      usage: `${config.prefix}upgrade <chỉ số> [lượng essence]`,
      examples: [
        { intent: "Nạp toàn bộ Essence vào efficiency", command: `${config.prefix}upgrade eff` },
        { intent: "Nạp tối đa 5000 Essence vào efficiency", command: `${config.prefix}upgrade eff 5000` },
      ],
      cooldown: 0
    });
  }
  async execute(message, args = []) {
    const { user } = await requireRpgCharacter(message.author.id);
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
    const inputTrait = args[0]?.toLowerCase();
    const trait = traitMapping[inputTrait];
    if (!trait) {
      return message.reply(
        `${config.emoji.no} Chỉ số nâng cấp không hợp lệ. Các chỉ số: \`efficiency\` (\`eff\`), \`duration\` (\`dur\`), \`cost\`, \`gain\`, \`experience\` (\`exp\`), \`radar\` (\`rad\`).`
      );
    }
    const currentEssence = user.rpg.autohunt.essence || 0;
    if (currentEssence <= 0) {
      return message.reply(`${config.emoji.no} Bạn không có Essence nào để nâng cấp.`);
    }
    let essenceToSpend = currentEssence;
    if (args[1] && !isNaN(args[1])) {
      const parsedEssence = parseInt(args[1]);
      if (parsedEssence > 0) {
        essenceToSpend = Math.min(currentEssence, parsedEssence);
      }
    }
    const xp = user.rpg.autohunt.xp;
    const currentXp = xp[trait] || 0;
    const xpForMax = getXpForMax(trait);
    if (currentXp >= xpForMax) {
      return message.reply(`${config.emoji.warning} Chỉ số này đã đạt cấp độ tối đa [MAX]!`);
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
          `Tiêu hao: **${essenceToSpend.toLocaleString()} Essence** | Essence còn lại: **${user.rpg.autohunt.essence.toLocaleString()}**`
      );
    } else {
      return message.reply(
        `⚙️ **Nạp Essence HuntBot**\n` +
          `Nạp thành công **+${essenceToSpend.toLocaleString()} XP** vào chỉ số **${trait}** (Cấp ${lvlAfter} \`[${getLvl(nextXp, 0, trait).currentxp}/${getLvl(nextXp, 0, trait).maxxp}]\`).\n` +
          `Tiêu hao: **${essenceToSpend.toLocaleString()} Essence** | Essence còn lại: **${user.rpg.autohunt.essence.toLocaleString()}**`
      );
    }
  }
}
module.exports = new UpgradeCommand();