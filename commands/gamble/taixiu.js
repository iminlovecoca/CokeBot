const random = require("random-number-csprng");
const { checkAndSetCooldown, notifyCooldown } = require("../../utils/cooldown");
const { incBalance } = require("../../utils/userUtil");
const { getBetAmount } = require("../../utils/gameUtil");
const { getDebuffPercentage } = require("../../utils/miscUtil");
const config = require("../../data/config");
const emoji = config.emoji;
const settings = config.gamble_settings;

const diceEmojis = [
  emoji.dice_1,
  emoji.dice_2,
  emoji.dice_3,
  emoji.dice_4,
  emoji.dice_5,
  emoji.dice_6,
];
const moving = emoji.dice_rolling;

module.exports = {
  name: "tx",
  aliases: ["taixiu", "doden"],
  description: "🎲 Chơi tài xỉu bằng coke!",
  usage: `${config.prefix}tx <t/x> [tiền cược|all]`,
  examples: [
    {
      intent: "Cược tài (t) với tất cả tiền",
      command: `${config.prefix}tx t all`,
    },
    {
      intent: "Cược xỉu (x) với 100,000 coke",
      command: `${config.prefix}tx x 100000`,
    },
  ],
  async execute(message, args) {
    const userId = message.author.id;
    const remainingCooldown = checkAndSetCooldown(
      userId,
      "tx",
      settings.cooldown_second,
    );
    if (remainingCooldown > 0) {
      return notifyCooldown(message, remainingCooldown);
    }

    let choice;
    if (args.length == 0) {
      return await message.reply(
        `${emoji.no} Cú pháp: \`${config.prefix}tx <t/x> [số tiền|all]\``,
      );
    } else {
      choice = args[0].toLowerCase();
      if (["tai", "t"].includes(choice)) {
        choice = "tai";
      } else if (["xiu", "x"].includes(choice)) {
        choice = "xiu";
      } else {
        return await message.reply(
          `${emoji.no} Bạn phải chọn \`tai\` hoặc \`xiu\`!`,
        );
      }
    }
    let bet = args.length == 1 ? "min" : args[1];
    const amount = await getBetAmount(
      bet,
      userId,
      settings.max_bet,
      settings.min_bet,
    );

    const debuffPercentage = await getDebuffPercentage(userId);
    const winProbability = 0.5 * (1 - debuffPercentage);
    const playerWins = Math.random() < winProbability;
    const finalOutcome = playerWins ? choice : choice === "tai" ? "xiu" : "tai";

    const generateDiceRolls = async (targetOutcome) => {
      let rolls, sum, isTriple;
      while (true) {
        const r1 = await random(1, 6);
        const r2 = await random(1, 6);
        const r3 = await random(1, 6);
        sum = r1 + r2 + r3;
        isTriple = r1 === r2 && r2 === r3;
        const currentOutcome = sum >= 11 ? "tai" : "xiu";

        if (!isTriple && currentOutcome === targetOutcome) {
          rolls = [r1, r2, r3];
          return { rolls, sum };
        }
      }
    };

    const { rolls, sum } = await generateDiceRolls(finalOutcome);
    const [roll1, roll2, roll3] = rolls;
    const rollEmoji = rolls.map((i) => diceEmojis[i - 1]);

    let win = 0;
    let multiplier = 0;
    if (playerWins) {
      multiplier = 2;
      win = amount * multiplier;
    }

    await incBalance(userId, win - amount);
    const member = await message.guild.members.fetch(userId).catch(() => null);
    const name = member?.displayName || message.author.username;

    const betText = `${emoji.money} ${amount.toLocaleString()}`;
    const winText =
      win > 0
        ? `${emoji.money} ${win.toLocaleString()} (x${multiplier})`
        : "trắng... 😢";

    const wait = (ms) => new Promise((res) => setTimeout(res, ms));

    let display = `**  \`__TÀI XỈU__\`**\n\` \` ${moving} ${moving} ${moving} \` \` ${name} cược ${betText}\n  \`|         |\`\n  \`|   COKE  |\``;
    const msg = await message.channel.send(display);

    await wait(1000);
    display = `**  \`__TÀI XỈU__\`**\n\` \` ${rollEmoji[0]} ${moving} ${moving} \` \` ${name} cược ${betText}\n  \`|         |\`\n  \`|   COKE  |\``;
    await msg.edit(display);

    await wait(700);
    display = `**  \`__TÀI XỈU__\`**\n\` \` ${rollEmoji[0]} ${moving} ${rollEmoji[2]} \` \` ${name} cược ${betText}\n  \`|         |\`\n  \`|   COKE  |\``;
    await msg.edit(display);

    await wait(1000);

    display = `**  \`__TÀI XỈU__\`**\n\` \` ${rollEmoji[0]} ${rollEmoji[1]} ${rollEmoji[2]} \` \` ${name} cược ${betText}\n  \`|         |\`  ${sum} điểm → **${finalOutcome.toUpperCase()}**\n  \`|   COKE  |\`  Bạn ${win > 0 ? "thắng" : "thua"} ${winText}`;
    await msg.edit(display);
  },
};
