const BaseService = require("./BaseService");

// Win messages — cheeky Vietnamese, OwO-style
const WIN_MESSAGES = [
  (e, amt) => `và húp ${e} **${amt}**.`,
  (e, amt) => `ăn đậm ${e} **${amt}**.`,
  (e, amt) => `lại kiếm được ${e} **${amt}** 🤑`,
  (e, amt) => `đỏ dữ bây 🔥`,
  (e, amt) => `bỏ túi gọn ${e} **${amt}** 💰`,
];

// Lose messages — slightly toxic but not too much, OwO-style
const LOSE_MESSAGES = [
  (e, amt) => `rồi cống luôn ${e} **${amt}**.`,
  (e, amt) => `đóng học phí ${e} **${amt}**.`,
  (e, amt) => `còn cái nịt 🩲`,
  (e, amt) => `đen thế nhỉ 🌚`,
  (e, amt) => `bay màu ${e} **${amt}** 💨`,
];

class TaixiuService extends BaseService {
  constructor(locator) {
    super(locator);
    this._diceFaces = null;
    this._rollingEmoji = null;
    this._moneyEmoji = null;
  }

  /**
   * Lazy-load emojis from config to avoid circular require.
   */
  _loadEmojis() {
    if (this._diceFaces) return;
    const config = require("../data/config");
    const e = config.emoji;
    this._diceFaces = [
      null,
      e.dice_1,
      e.dice_2,
      e.dice_3,
      e.dice_4,
      e.dice_5,
      e.dice_6,
    ];
    this._rollingEmoji = e.taixiu_rolling || e.dice_rolling;
    this._moneyEmoji = e.money;
  }

  /** Returns the emoji for a dice face value (1-6). */
  getDiceEmoji(value) {
    this._loadEmojis();
    return this._diceFaces[value];
  }

  /** Returns the rolling animation emoji. */
  getRollingEmoji() {
    this._loadEmojis();
    return this._rollingEmoji;
  }

  /** Returns the money emoji. */
  getMoneyEmoji() {
    this._loadEmojis();
    return this._moneyEmoji;
  }

  /**
   * Rolls 3 independent dice (1-6 each).
   * Applies gamble debuff: if player would win, debuff chance re-rolls to a loss.
   * Bão is never affected by debuff.
   */
  rollDice(playerSide, debuffPercentage = 0) {
    let dice = this._rollThree();
    let outcome = this._getOutcome(dice);

    if (outcome.side === "bao") return dice;

    if (
      outcome.side === playerSide &&
      debuffPercentage > 0 &&
      Math.random() < debuffPercentage
    ) {
      for (let i = 0; i < 30; i++) {
        dice = this._rollThree();
        outcome = this._getOutcome(dice);
        if (outcome.side !== playerSide || outcome.side === "bao") break;
      }
    }

    return dice;
  }

  _rollThree() {
    return [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ];
  }

  getOutcome(dice) {
    return this._getOutcome(dice);
  }

  _getOutcome(dice) {
    const [d1, d2, d3] = dice;

    // Bão — 3 identical dice
    if (d1 === d2 && d2 === d3) {
      return { side: "bao", label: "BÃO" };
    }

    const total = d1 + d2 + d3;
    if (total >= 11) {
      return { side: "tai", label: "TÀI" };
    }
    return { side: "xiu", label: "XỈU" };
  }

  /**
   * Builds the OwO-style text frame.
   * Format matches OwO Slots:
   * **  `___TÀI XỈU___`**
   * ` ` d0 d1 d2 ` ` **Player** cược <:cokecy:...> 100,000 vào **TÀI**
   * [resultText on new line if final frame]
   *   `|   TÀI   |`
   *   `|         |`
   */
  buildFrame(
    dice,
    revealed,
    name,
    amount,
    sideLabel,
    resultText = null,
    outcomeLabel = null,
  ) {
    this._loadEmojis();
    const rolling = this._rollingEmoji;

    const d0 = revealed[0] ? this.getDiceEmoji(dice[0]) : rolling;
    const d1 = revealed[1] ? this.getDiceEmoji(dice[1]) : rolling;
    const d2 = revealed[2] ? this.getDiceEmoji(dice[2]) : rolling;

    const betText = `${this._moneyEmoji} **${amount.toLocaleString()}**`;
    const boldName = `**${name}**`;

    // Title line
    let output = "**  `___TÀI XỈU___`**\n";

    // Dice row + player bet info line
    output +=
      "` ` " +
      d0 +
      " " +
      d1 +
      " " +
      d2 +
      " ` ` " +
      boldName +
      " cược " +
      this._moneyEmoji +
      " " +
      amount.toLocaleString() +
      " vào **" +
      sideLabel +
      "**";

    // Result outcome message on next line (final frame)
    if (resultText) {
      output += "\n" + resultText;
    }

    // Centered box display (9 chars inside | |)
    const boxLabel = outcomeLabel ? `|   ${outcomeLabel}   |` : "|         |";

    output += "\n  `" + boxLabel + "`";
    output += "\n  `|         |`";

    return output;
  }

  /**
   * Builds the final result text for the second line.
   */
  buildResultText(result, name, amount, sideLabel) {
    this._loadEmojis();
    const e = this._moneyEmoji;
    const amtStr = amount.toLocaleString();

    if (result === "bao") {
      return `Bão! Hoàn lại ${e} **${amtStr}**, lần này coi như hòa.`;
    }

    const pool = result === "win" ? WIN_MESSAGES : LOSE_MESSAGES;
    const msg = pool[Math.floor(Math.random() * pool.length)](e, amtStr);

    return msg;
  }
}

module.exports = TaixiuService;
