const BaseService = require("./BaseService");

// Win messages — cheeky Vietnamese, OwO-style
const WIN_MESSAGES = [
  (e, amt) => `và húp ${e} **${amt}**.`,
  (e, amt) => `ăn đậm ${e} **${amt}**.`,
  (e, amt) => `lại kiếm được ${e} **${amt}** 🤑`,
  (e, amt) => `đỏ dữ bây 🔥`,
  (e, amt) => `bỏ túi gọn ${e} **${amt}** 💰`,
];

// Lose messages — slightly toxic, OwO-style
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
   * Builds the OwO-style text frame (identical layout to OwO Slots in image 2).
   *
   * Line 1: **  `___TÀI XỈU___`**
   * Line 2: ` ` d0 d1 d2 ` ` **Player** cược <:cokecy:...> 100,000 vào **TÀI**
   * Line 3:   `|         |`   và húp <:cokecy:...> 100,000.  (result text next to box line 3!)
   * Line 4:   `|   TÀI   |`
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

    const boldName = `**${name}**`;
    const moneyStr = `${this._moneyEmoji} ${amount.toLocaleString()}`;

    // Line 1: Header
    let output = "**  `___TÀI XỈU___`**\n";

    // Line 2: Dice row + bet info
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
      moneyStr +
      " vào **" +
      sideLabel +
      "**\n";

    // Line 3: Upper box + result outcome text right next to it (if present)
    output += "  `|         |`";
    if (resultText) {
      output += "   " + resultText;
    }
    output += "\n";

    // Line 4: Bottom box with centered result label (9 chars: |   TÀI   |)
    const bottomLabel = outcomeLabel ? `|   ${outcomeLabel}   |` : "|         |";
    output += "  `" + bottomLabel + "`";

    return output;
  }

  /**
   * Builds the final result outcome text placed on Line 3 next to `|         |`.
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
