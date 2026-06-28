const BaseCommand = require("../../core/BaseCommand");
const random = require("random-number-csprng");
const { decBalance, incBalance } = require("../../utils/userUtil");
const { checkAndSetCooldown, notifyCooldown } = require("../../utils/cooldown");
const { getBetAmount } = require("../../utils/gameUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");
const emoji = config.emoji;
const settings = config.gamble_settings;

class CoinflipCommand extends BaseCommand {
  constructor() {
    super({
      name: "cf",
      aliases: ["coinflip", "flip"],
      description: "Chơi tung đồng xu!",
      usage: `${config.prefix}cf <h/t> [tiền cược|all]`,
      examples: [
        {
          intent: "Chọn mặt sấp (tails) và cược mức tối thiểu",
          command: `${config.prefix}cf t`,
        },
        {
          intent: "Chọn mặt ngửa (heads) và cược tất cả tiền",
          command: `${config.prefix}cf h all`,
        },
      ],
      category: "gamble"
    });
  }

  async execute(message, args, client, locator) {
    const userId = message.author.id;
    const isSide = (str) => {
      if (!str) return false;
      return ["heads", "h", "head", "tails", "t", "tail"].includes(str.toLowerCase());
    };

    let choice = "h";
    let bet = "min";

    if (args.length === 1) {
      if (isSide(args[0])) {
        choice = ["tails", "t", "tail"].includes(args[0].toLowerCase()) ? "t" : "h";
        bet = "min";
      } else {
        choice = "h";
        bet = args[0];
      }
    } else if (args.length >= 2) {
      if (isSide(args[0])) {
        choice = ["tails", "t", "tail"].includes(args[0].toLowerCase()) ? "t" : "h";
        bet = args[1];
      } else {
        choice = "h";
        bet = args[0];
      }
    }

    const betAmount = await getBetAmount(
      bet,
      userId,
      settings.max_bet,
      settings.min_bet,
    );

    const remainingCooldown = checkAndSetCooldown(
      userId,
      "cf",
      settings.cooldown_second,
    );
    if (remainingCooldown > 0) {
      return notifyCooldown(message, remainingCooldown);
    }

    let text = `**${message.member?.displayName || message.author.username}** đã cược ${emoji.money} **${betAmount.toLocaleString()}** và chọn ${choice === "h" ? "**Ngửa (heads)**" : "**Sấp (tails)**"}\n`;
    text += `Đồng xu quay... ${emoji.coinflip}`;
    const msg = await message.reply(text);

    const gambleService = locator.get("gambleService");
    const debuffPercentage = await gambleService.getDebuffPercentage(userId);
    const winProbability = 0.5 * (1 - debuffPercentage);
    
    const rand = await random(0, 100);
    const result =
      rand < winProbability * 100 ? choice : choice === "h" ? "t" : "h";

    let win = result === choice;
    const sign = win ? 1 : -1;
    await incBalance(userId, sign * betAmount);

    setTimeout(async () => {
      let resultEmoji = result === "h" ? emoji.heads : emoji.tails;
      let resultText = `Đồng xu quay... ${resultEmoji} và bạn `;
      if (win) {
        resultText += `thắng ${emoji.money} **${(betAmount * 2).toLocaleString()}**!!`;
      } else {
        resultText += "thua hết... :c";
      }
      await msg.edit(
        `**${message.member?.displayName || message.author.username}** đã cược ${emoji.money} **${betAmount.toLocaleString()}** và chọn ${choice === "h" ? "**Ngửa (heads)**" : "**Sấp (tails)**"}\n${resultText}`,
      );
    }, 2000);
  }
}

module.exports = new CoinflipCommand();
