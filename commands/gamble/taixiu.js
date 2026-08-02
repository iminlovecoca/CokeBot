const BaseCommand = require("../../core/BaseCommand");
const { checkAndSetCooldown, notifyCooldown } = require("../../utils/cooldown");
const { incBalance } = require("../../utils/userUtil");
const { getBetAmount } = require("../../utils/gameUtil");
const config = require("../../data/config");
const settings = config.gamble_settings;

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Checks if a string is a tài/xỉu side keyword.
 */
const isSide = (str) => {
  if (!str) return false;
  return ["tai", "tài", "t", "xiu", "xỉu", "x"].includes(str.toLowerCase());
};

/**
 * Parses a side keyword to normalized 'tai' or 'xiu'.
 */
const parseSide = (str) => {
  const lower = str.toLowerCase();
  if (["xiu", "xỉu", "x"].includes(lower)) return "xiu";
  return "tai";
};

class TaixiuCommand extends BaseCommand {
  constructor() {
    super({
      name: "taixiu",
      aliases: ["tx", "dice"],
      description: "Chơi Tài Xỉu 3 viên xúc xắc!",
      usage: `${config.prefix}tx [tai/xiu] [tiền cược|all]`,
      examples: [
        { intent: "Đặt Tài với mức cược tối thiểu", command: `${config.prefix}tx` },
        { intent: "Đặt Tài all-in", command: `${config.prefix}tx tai all` },
        { intent: "Đặt Xỉu 100,000 coke", command: `${config.prefix}tx xiu 100000` },
        { intent: "Đặt nhanh all-in (mặc định Tài)", command: `${config.prefix}tx all` },
      ],
      category: "gamble",
    });
  }

  async execute(message, args, client, locator) {
    const userId = message.author.id;

    // Cooldown check
    const remainingCooldown = checkAndSetCooldown(userId, "taixiu", settings.cooldown_second);
    if (remainingCooldown > 0) {
      return notifyCooldown(message, remainingCooldown);
    }

    // Parse arguments: [side] [amount] — flexible order, both optional
    let side = "tai";
    let betArg = "min";

    if (args.length === 0) {
      // Defaults: tai, min bet
    } else if (args.length === 1) {
      if (isSide(args[0])) {
        side = parseSide(args[0]);
      } else {
        betArg = args[0];
      }
    } else {
      // 2+ args — first is side (if valid), second is amount, or vice versa
      if (isSide(args[0])) {
        side = parseSide(args[0]);
        betArg = args[1];
      } else if (isSide(args[1])) {
        betArg = args[0];
        side = parseSide(args[1]);
      } else {
        betArg = args[0];
      }
    }

    const sideLabel = side === "tai" ? "TÀI" : "XỈU";

    // Validate & resolve bet amount (handles 'all', 'min', numbers)
    const amount = await getBetAmount(betArg, userId, settings.max_bet, settings.min_bet);

    // Get services
    const gambleService = locator.get("gambleService");
    const taixiuService = locator.get("taixiuService");

    // Calculate debuff for high-balance players
    const debuffPercentage = await gambleService.getDebuffPercentage(userId);

    // Roll dice with debuff applied
    const dice = taixiuService.rollDice(side, debuffPercentage);
    const outcome = taixiuService.getOutcome(dice);

    // Determine result
    const isBao = outcome.side === "bao";
    const isWin = !isBao && outcome.side === side;

    // Apply balance change
    if (isBao) {
      // Refund — no change
    } else if (isWin) {
      await incBalance(userId, amount);
    } else {
      await incBalance(userId, -amount);
    }

    // Get player display name
    const member = await message.guild.members.fetch(userId).catch(() => null);
    const name = member?.displayName || message.author.username;

    // === Animation: 4 frames matching OwO Slots pattern ===

    // Frame 0: all dice rolling
    const frame0 = taixiuService.buildFrame(
      dice, [false, false, false], name, amount, sideLabel,
    );
    const msg = await message.channel.send(frame0);

    // Frame 1: reveal dice[0] (left)
    await wait(1000);
    const frame1 = taixiuService.buildFrame(
      dice, [true, false, false], name, amount, sideLabel,
    );
    await msg.edit(frame1).catch(() => {});

    // Frame 2: reveal dice[2] (right), skip middle
    await wait(700);
    const frame2 = taixiuService.buildFrame(
      dice, [true, false, true], name, amount, sideLabel,
    );
    await msg.edit(frame2).catch(() => {});

    // Frame 3: reveal all + result text + outcome label
    await wait(1000);
    const resultType = isBao ? "bao" : (isWin ? "win" : "lose");
    const resultText = taixiuService.buildResultText(resultType, name, amount, sideLabel);
    const frame3 = taixiuService.buildFrame(
      dice, [true, true, true], name, amount, sideLabel,
      resultText, outcome.label,
    );
    await msg.edit(frame3).catch(() => {});
  }
}

module.exports = new TaixiuCommand();
