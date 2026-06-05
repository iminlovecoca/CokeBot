const { EmbedBuilder } = require("discord.js");
const config = require("../../data/config");
const { requireRpgCharacter } = require("../../utils/rpgUtil");

// Max levels for each autohunt trait
const maxLevels = {
  efficiency: 215,
  duration: 235,
  cost: 5,
  gain: 200,
  experience: 200,
  radar: 99,
};

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

module.exports = {
  name: "xupgrade",
  aliases: ["upgrade", "up", "xup"],
  description: "Nâng cấp chỉ số HuntBot bằng Essence.",
  usage: `${config.prefix}xupgrade <chỉ số> [lượng essence]`,
  examples: [
    { intent: "Nâng cấp tối đa efficiency bằng toàn bộ Essence", command: `${config.prefix}xupgrade eff` },
    { intent: "Nâng cấp efficiency sử dụng tối đa 5000 Essence", command: `${config.prefix}xupgrade eff 5000` },
  ],

  async execute(message, args = []) {
    const { user } = await requireRpgCharacter(message.author.id);

    // Initialize autohunt state if not present
    if (!user.rpg.autohunt) {
      user.rpg.autohunt = {
        isActive: false,
        startTime: null,
        durationHours: 0,
        essence: 0,
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

    const inputTrait = args[0]?.toLowerCase();
    const trait = traitMapping[inputTrait];
    if (!trait) {
      return message.reply(
        `${config.emoji.no} Chỉ số nâng cấp không hợp lệ. Các chỉ số: \`efficiency\` (\`eff\`), \`duration\` (\`dur\`), \`cost\`, \`gain\`, \`experience\` (\`exp\`), \`radar\` (\`rad\`).`
      );
    }

    const currentLvl = user.rpg.autohunt.levels[trait] || 1;
    const maxLvl = maxLevels[trait];
    if (currentLvl >= maxLvl) {
      return message.reply(`${config.emoji.warning} Chỉ số này đã đạt cấp độ tối đa [MAX]!`);
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

    let tempLvl = currentLvl;
    let spent = 0;
    const costFunc = upgradeCostFuncs[trait];

    while (tempLvl < maxLvl) {
      const nextUpgradeCost = costFunc(tempLvl);
      if (spent + nextUpgradeCost <= essenceToSpend) {
        spent += nextUpgradeCost;
        tempLvl++;
      } else {
        break;
      }
    }

    if (tempLvl === currentLvl) {
      const nextCost = costFunc(currentLvl);
      return message.reply(
        `${config.emoji.no} Bạn không có đủ Essence để nâng cấp chỉ số này thêm dù chỉ 1 cấp.\n` +
          `Yêu cầu: **${nextCost.toLocaleString()} Essence** | Bạn định chi tối đa: **${essenceToSpend.toLocaleString()} Essence** (Hiện có: **${currentEssence.toLocaleString()}**)`
      );
    }

    user.rpg.autohunt.essence = currentEssence - spent;
    user.rpg.autohunt.levels[trait] = tempLvl;
    user.markModified("rpg");
    await user.save();

    return message.reply(
      `⚙️ **Nâng Cấp HuntBot**\n` +
        `Nâng cấp chỉ số **${trait}** thành công thêm **${tempLvl - currentLvl} cấp** (Lên cấp **${tempLvl}**).\n` +
        `Tiêu hao: **${spent.toLocaleString()} Essence** | Essence còn lại: **${user.rpg.autohunt.essence.toLocaleString()}**`
    );
  },
};
