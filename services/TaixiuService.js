const BaseService = require("./BaseService");

// Win messages — cheeky Vietnamese, OwO-style
const WIN_MESSAGES = [
  (e, amt) => `và húp ${e} **${amt}**.`,
  (e, amt) => `ăn đậm ${e} **${amt}**.`,
  (e, amt) => `lại kiếm được ${e} **${amt}** 🤑`,
  (e, amt) => `đỏ dữ bây 🔥`,
  (e, amt) => `bỏ túi gọn ${e} **${amt}** 💰`,
  (e, amt) => `thắng ngọt ${e} **${amt}** 🍬`,
];

// Lose messages — slightly toxic but not too much
const LOSE_MESSAGES = [
  (e, amt) => `rồi cống luôn ${e} **${amt}**.`,
  (e, amt) => `đóng học phí ${e} **${amt}**.`,
  (e, amt) => `còn cái nịt 🩲`,
  (e, amt) => `đen thế nhỉ 🌚`,
  (e, amt) => `bay màu ${e} **${amt}** 💨`,
  (e, amt) => `mất trắng ${e} **${amt}** 😭`,
];

class TaixiuService extends BaseService {
  constructor(locator) {
    super(locator);
    // Dice face emojis indexed 1-6, slot 0 unused
    this._diceFaces = null;
    this._rollingEmoji = null;
    this._moneyEmoji = null;
  }

  /**
   * Lazy-load emojis from config to avoid circular require at construction time.
   */
  _loadEmojis() {
    if (this._diceFaces) return;
    const config = require("../data/config");
    const e = config.emoji;
    this._diceFaces = [null, e.dice_1, e.dice_2, e.dice_3, e.dice_4, e.dice_5, e.dice_6];
    this._rollingEmoji = e.taixiu_rolling;
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
   * Tam hoa is never affected by debuff.
   * @param {string} playerSide - 'tai' or 'xiu'
   * @param {number} debuffPercentage - 0 to 1
   * @returns {number[]} [d1, d2, d3]
   */
  rollDice(playerSide, debuffPercentage = 0) {
    let dice = this._rollThree();
    let outcome = this._getOutcome(dice);

    // Bão is always honored — no debuff applied
    if (outcome.side === "bao") return dice;

    // If player wins and debuff triggers, re-roll until player loses or tam hoa
    if (outcome.side === playerSide && debuffPercentage > 0 && Math.random() < debuffPercentage) {
      for (let i = 0; i < 30; i++) {
        dice = this._rollThree();
        outcome = this._getOutcome(dice);
        // Accept if player loses or bão
        if (outcome.side !== playerSide || outcome.side === "bao") break;
      }
    }

    return dice;
  }

  /** Rolls 3 independent dice. */
  _rollThree() {
    return [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ];
  }

  /**
   * Determines the outcome from 3 dice.
   * @param {number[]} dice - [d1, d2, d3]
   * @returns {{ side: string, label: string }}
   */
  getOutcome(dice) {
    return this._getOutcome(dice);
  }

  _getOutcome(dice) {
    const [d1, d2, d3] = dice;

    // Bão — all three identical
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
   * Builds a text frame for the tài xỉu animation.
   * Mirrors the slots.js layout: header → dice row + bet info → bottom display.
   *
   * @param {number[]} dice - [d1, d2, d3] final values
   * @param {boolean[]} revealed - [bool, bool, bool] which dice are shown
   * @param {string} name - player display name
   * @param {number} amount - bet amount
   * @param {string} sideLabel - 'TÀI' or 'XỈU'
   * @param {string|null} resultText - appended after bet info on final frame
   * @param {string|null} outcomeLabel - 'TÀI', 'XỈU', or 'TAM HOA' for bottom display
   * @returns {string}
   */
  buildFrame(dice, revealed, name, amount, sideLabel, resultText = null, outcomeLabel = null) {
    this._loadEmojis();
    const rolling = this._rollingEmoji;

    // Build dice row — revealed dice show face emoji, hidden show rolling
    const d0 = revealed[0] ? this.getDiceEmoji(dice[0]) : rolling;
    const d1 = revealed[1] ? this.getDiceEmoji(dice[1]) : rolling;
    const d2 = revealed[2] ? this.getDiceEmoji(dice[2]) : rolling;

    const betText = `${this._moneyEmoji} **${amount.toLocaleString()}**`;

    // Bet info line — during animation shows just bet, final frame shows result
    let infoLine;
    if (resultText) {
      infoLine = resultText;
    } else {
      infoLine = `${name} cược ${betText} vào **${sideLabel}**`;
    }

    // Bottom outcome display
    const bottomLabel = outcomeLabel
      ? `|   ${outcomeLabel}${" ".repeat(Math.max(0, 7 - outcomeLabel.length))}|`
      : "|         |";

    return (
      '**  `___TÀI XỈU___`**\n' +
      "` ` " + d0 + " " + d1 + " " + d2 + " ` ` " + infoLine + "\n" +
      "  `|         |`\n" +
      "  `" + bottomLabel + "`"
    );
  }

  /**
   * Builds the final result info text for the bet line.
   * @param {'win'|'lose'|'tamhoa'} result
   * @param {string} name
   * @param {number} amount
   * @param {string} sideLabel - 'TÀI' or 'XỈU'
   * @returns {string}
   */
  buildResultText(result, name, amount, sideLabel) {
    this._loadEmojis();
    const e = this._moneyEmoji;
    const amtStr = amount.toLocaleString();
    const betText = `${e} **${amtStr}**`;

    if (result === "bao") {
      return `Bão! Hoàn lại ${betText}, lần này coi như hòa.`;
    }

    const pool = result === "win" ? WIN_MESSAGES : LOSE_MESSAGES;
    const msg = pool[Math.floor(Math.random() * pool.length)](e, amtStr);

    return `${name} cược ${betText} vào **${sideLabel}** ${msg}`;
  }
}

module.exports = TaixiuService;
