const BaseCommand = require("../../core/BaseCommand");
const random = require("random-number-csprng");
const { checkAndSetCooldown, notifyCooldown } = require("../../utils/cooldown");
const { incBalance } = require("../../utils/userUtil");
const { getBetAmount } = require("../../utils/gameUtil");
const config = require("../../data/config");
const emoji = config.emoji;

const diceEmojis = [
  emoji.dice_1,
  emoji.dice_2,
  emoji.dice_3,
  emoji.dice_4,
  emoji.dice_5,
  emoji.dice_6,
];
const moving = emoji.dice_rolling;

class TaiXiuCommand extends BaseCommand {
  constructor() {
    super({
      name: "taixiu",
      aliases: ["tx", "doden"],
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
      category: "gamble"
    });
  }

  async execute(message, args, client, locator) {
    const settings = config.gamble_settings;
    const userId = message.author.id;
    const remainingCooldown = checkAndSetCooldown(
      userId,
      "tx",
      settings.cooldown_second,
    );
    if (remainingCooldown > 0) {
      return notifyCooldown(message, remainingCooldown);
    }

    const isChoice = (str) => {
      if (!str) return false;
      return ["tai", "t", "xiu", "x"].includes(str.toLowerCase());
    };

    let choice = "tai";
    let bet = "min";

    if (args.length === 1) {
      if (isChoice(args[0])) {
        choice = ["xiu", "x"].includes(args[0].toLowerCase()) ? "xiu" : "tai";
        bet = "min";
      } else {
        choice = "tai";
        bet = args[0];
      }
    } else if (args.length >= 2) {
      if (isChoice(args[0])) {
        choice = ["xiu", "x"].includes(args[0].toLowerCase()) ? "xiu" : "tai";
        bet = args[1];
      } else {
        choice = "tai";
        bet = args[0];
      }
    }

    const amount = await getBetAmount(
      bet,
      userId,
      settings.max_bet,
      settings.min_bet,
    );

    
    const gambleService = locator.get("gambleService");
    const debuffPercentage = await gambleService.getDebuffPercentage(userId);

    const rollDice = async () => {
      const r1 = await random(1, 6);
      const r2 = await random(1, 6);
      const r3 = await random(1, 6);
      const sum = r1 + r2 + r3;
      const isTriple = r1 === r2 && r2 === r3;
      const outcome = sum >= 11 ? "tai" : "xiu";
      return { rolls: [r1, r2, r3], sum, isTriple, outcome };
    };

    let result = await rollDice();
    let playerWins = !result.isTriple && (result.outcome === choice);

    
    if (playerWins && debuffPercentage > 0) {
      if (Math.random() < debuffPercentage) {
        
        while (playerWins) {
          result = await rollDice();
          playerWins = !result.isTriple && (result.outcome === choice);
        }
      }
    }

    const { rolls, sum, isTriple, outcome } = result;
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

    display = `**  \`__TÀI XỈU__\`**\n\` \` ${rollEmoji[0]} ${rollEmoji[1]} ${rollEmoji[2]} \` \` ${name} cược ${betText}\n  \`|         |\`  ${sum} điểm → **${isTriple ? `BÃO (${rolls[0]}-${rolls[1]}-${rolls[2]})` : outcome.toUpperCase()}**\n  \`|   COKE  |\`  Bạn ${win > 0 ? "thắng" : "thua"} ${winText}`;
    await msg.edit(display);
  }
}

module.exports = new TaiXiuCommand();
