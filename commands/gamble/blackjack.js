const BaseCommand = require("../../core/BaseCommand");
const {
  formatCards,
  createNewDeck,
  drawNewCard,
  getBestHandValue,
  isBust,
  isBlackJack,
  isDoubleAce,
  isNguLinh,
  isDealerStay
} = require("../../utils/blackJackUtil.js");
const { checkAndSetCooldown, notifyCooldown } = require("../../utils/cooldown");
const { decBalance, incBalance } = require("../../utils/userUtil");
const { getBetAmount, checkAndClearExpiredGame } = require("../../utils/gameUtil");
const BlackJackGame = require("../../models/BlackJackGame");
const config = require("../../data/config");
const emoji = config.emoji;
const settings = config.gamble_settings;

const hitEmoji = "👊";
const standEmoji = "🛑";

class BlackjackCommand extends BaseCommand {
  constructor() {
    super({
      name: "blackjack",
      aliases: ["bj", "xidach"],
      description: "Chơi bài xì dách (blackjack).",
      usage: `${config.prefix}bj [tiền cược|all]`,
      examples: [
        { intent: "Cược toàn bộ số tiền hiện có", command: `${config.prefix}bj all` },
        { intent: "Cược 10,000 coke", command: `${config.prefix}bj 10000` }
      ],
      category: "gamble"
    });
  }

  async execute(message, args, client, locator) {
    const userId = message.author.id;
    const game = await checkAndClearExpiredGame(userId, BlackJackGame);

    const remainingCooldown = checkAndSetCooldown(userId, "bj", settings.cooldown_second);
    if (remainingCooldown > 0) {
      return notifyCooldown(message, remainingCooldown);
    }

    if (game) {
      const playerHand = game.player;
      const dealerHand = game.dealer;
      const deck = game.deck;
      await this.blackjack(message, playerHand, dealerHand, deck, game.bet, true, locator);
    } else {
      await this.startNewGame(message, args, userId, settings, locator);
    }
  }

  async startNewGame(message, args, userId, settings, locator) {
    const gameRepo = locator.get("gameRepository");
    let bet = args.length == 0 ? "min" : args[0];
    const betAmount = await getBetAmount(bet, userId, settings.max_bet, settings.min_bet);
    const deck = createNewDeck();
    const playerHand = [drawNewCard(deck), drawNewCard(deck)];
    const dealerHand = [drawNewCard(deck), drawNewCard(deck)];
    await decBalance(userId, betAmount);
    await gameRepo.createGame(userId, betAmount, playerHand, dealerHand, deck);
    await this.blackjack(message, playerHand, dealerHand, deck, betAmount, false, locator);
  }

  async blackjack(message, playerHand, dealerHand, deck, bet, resume, locator) {
    const embed = this.generateEmbed(message.author, playerHand, dealerHand, bet);
    const filter = (reaction, user) =>
      [hitEmoji, standEmoji].includes(reaction.emoji.name) && user.id === message.author.id;
    if (resume) {
      embed.footer.text = `🎲 ~ Tiếp tục ván bài cũ!`;
    }

    const sentMessage = await message.reply({ embeds: [embed], skipV2: true });
    await sentMessage.react(hitEmoji);
    await sentMessage.react(standEmoji);

    const collector = sentMessage.createReactionCollector({ filter, time: 60000 });
    const gameRepo = locator.get("gameRepository");
    let isProcessing = false;

    collector.on("collect", async (react) => {
      if (isProcessing) {
        await react.users.remove(message.author.id).catch(() => {});
        return;
      }
      isProcessing = true;

      const game = await gameRepo.getActiveGame(message.author.id);
      if (!game) {
        collector.stop();
        await sentMessage.edit(`${emoji.no} Ván bài đã kết thúc!`).catch(() => {});
        isProcessing = false;
        return;
      }

      if (react.emoji.name === hitEmoji) {
        await this.handleHit(sentMessage, message.author, playerHand, dealerHand, deck, bet, collector, locator);
        isProcessing = false;
      } else {
        collector.stop();
        await this.handleStand(sentMessage, message.author, playerHand, dealerHand, deck, bet, collector, locator);
      }
      await react.users.remove(message.author.id).catch(() => {});
    });

    collector.on("end", (_, reason) => {
      if (reason == "time")
        sentMessage.edit(`**⏱ |** Đã hết thời gian tương tác. Nhập \`${config.prefix}bj\` để tiếp tục!`);
    });
  }

  generateEmbed(author, playerHand, dealerHand, bet, hide = true, result, embedColor) {
    let color = 8240363;
    let footer = "🎲 ~ Ván bài đang diễn ra";
    let dealerValue = getBestHandValue(dealerHand, hide);
    if (result) {
      color = embedColor;
      footer = `🎲 ~ ${result}`;
    } else {
      dealerValue += "+?";
    }

    const embed = {
      color: color,
      footer: { text: footer },
      author: {
        name: `${author.username}, bạn cược ${bet} coke để chơi xì dách`,
        iconURL: author.displayAvatarURL({ dynamic: true, size: 1024 })
      },
      fields: [
        {
          name: `Nhà cái [${dealerValue}]`,
          value: formatCards(dealerHand, hide),
          inline: true
        },
        {
          name: `${author.username} [${getBestHandValue(playerHand)}]`,
          value: formatCards(playerHand),
          inline: true
        },
      ]
    };
    return embed;
  }

  async handleHit(message, author, playerHand, dealerHand, deck, bet, collector, locator) {
    const card = drawNewCard(deck);
    playerHand.push(card);
    if (isBust(playerHand) || playerHand.length === 5) {
      collector.stop();
      await this.handleStand(message, author, playerHand, dealerHand, deck, bet, collector, locator);
    } else {
      const gameRepo = locator.get("gameRepository");
      await gameRepo.addCardToPlayer(author.id, card);
      await message.edit({
        embeds: [this.generateEmbed(author, playerHand, dealerHand, bet)],
        skipV2: true
      });
    }
  }

  async handleStand(message, author, playerHand, dealerHand, deck, bet, collector, locator) {
    const gameRepo = locator.get("gameRepository");
    const gambleService = locator.get("gambleService");
    const game = await gameRepo.setGameProcessing(author.id);
    if (!game) {
      return message.edit(`${emoji.no} Ván bài đã kết thúc!`);
    }

    const playerValue = getBestHandValue(playerHand);
    const debuffPercentage = await gambleService.getDebuffPercentage(author.id);
    while (!isDealerStay(dealerHand)) {
      if (Math.random() < debuffPercentage) {
        const nextCard = deck[deck.length - 1];
        const potentialHandValue = getBestHandValue([...dealerHand, nextCard]);

        if (isBust(playerHand)) {
          if (potentialHandValue > 21) {
            for (let i = deck.length - 2; i >= 0; i--) {
              if (getBestHandValue([...dealerHand, deck[i]]) <= 21) {
                [deck[deck.length - 1], deck[i]] = [deck[i], deck[deck.length - 1]];
                break;
              }
            }
          }
        } else {
          if (potentialHandValue > 21 || potentialHandValue < playerValue) {
            for (let i = deck.length - 2; i >= 0; i--) {
              const testValue = getBestHandValue([...dealerHand, deck[i]]);
              if (testValue <= 21 && testValue >= playerValue) {
                [deck[deck.length - 1], deck[i]] = [deck[i], deck[deck.length - 1]];
                break;
              }
            }
          }
        }
      }
      const card = drawNewCard(deck);
      dealerHand.push(card);
    }

    const dealerValue = getBestHandValue(dealerHand);

    const playerSpecial = isDoubleAce(playerHand)
      ? "Xì bàng"
      : isBlackJack(playerHand)
        ? "Xì dách"
        : isNguLinh(playerHand)
          ? "Ngũ linh"
          : null;
    const dealerSpecial = isDoubleAce(dealerHand)
      ? "Xì bàng"
      : isBlackJack(dealerHand)
        ? "Xì dách"
        : isNguLinh(dealerHand)
          ? "Ngũ linh"
          : null;

    let reward = 0;
    let net = 0;
    let result = "";

    if (playerSpecial && !dealerSpecial) {
      reward = bet * 2;
      net = reward - bet;
      result = `${playerSpecial}, bạn thắng ${net.toLocaleString()} coke!`;
    } else if (!playerSpecial && dealerSpecial) {
      reward = 0;
      net = -bet;
      result = `Nhà cái thắng với ${dealerSpecial}! Bạn mất ${bet.toLocaleString()} coke.`;
    } else if (playerSpecial && dealerSpecial) {
      const rank = { "Xì bàng": 3, "Xì dách": 2, "Ngũ linh": 1 };
      if (rank[playerSpecial] > rank[dealerSpecial]) {
        reward = bet * 2;
        net = reward - bet;
        result = `${playerSpecial}, bạn thắng ${net.toLocaleString()} coke!`;
      } else if (rank[playerSpecial] < rank[dealerSpecial]) {
        reward = 0;
        net = -bet;
        result = `Nhà cái thắng với ${dealerSpecial}! Bạn mất ${bet.toLocaleString()} coke.`;
      } else {
        if (playerSpecial === "Ngũ linh") {
          if (playerValue < dealerValue) {
            reward = bet * 2;
            net = reward - bet;
            result = `Cả hai cùng có Ngũ linh! Bạn ít điểm hơn (${playerValue} < ${dealerValue}) nên thắng ${net.toLocaleString()} coke!`;
          } else if (playerValue > dealerValue) {
            reward = 0;
            net = -bet;
            result = `Cả hai cùng có Ngũ linh! Nhà cái ít điểm hơn (${dealerValue} < ${playerValue}) nên bạn mất ${bet.toLocaleString()} coke.`;
          } else {
            reward = bet;
            net = 0;
            result = `Hoà! Cả hai cùng có Ngũ linh với ${playerValue} điểm, bạn nhận lại ${bet.toLocaleString()} coke.`;
          }
        } else {
          reward = bet;
          net = 0;
          result = `Hoà! cả hai cùng có ${playerSpecial}, bạn nhận lại ${bet.toLocaleString()} coke.`;
        }
      }
    } else if (isBust(playerHand) && isBust(dealerHand)) {
      reward = bet;
      net = 0;
      result = `Hoà! Cả hai đều ngoắc, bạn nhận lại ${bet.toLocaleString()} coke.`;
    } else if (isBust(playerHand)) {
      reward = 0;
      net = -bet;
      result = `Bạn mất ${bet.toLocaleString()} coke!`;
    } else if (isBust(dealerHand) || playerValue > dealerValue) {
      reward = bet * 2;
      net = reward - bet;
      result = `Bạn thắng ${net.toLocaleString()} coke!`;
    } else if (playerValue < dealerValue) {
      reward = 0;
      net = -bet;
      result = `Bạn mất ${bet.toLocaleString()} coke!`;
    } else {
      reward = bet;
      net = 0;
      result = `Hoà, bạn nhận lại ${bet.toLocaleString()} coke.`;
    }

    if (reward > 0) await incBalance(author.id, reward);

    const color = net > 0 ? 0x00FF00 : net < 0 ? 0xFF0000 : 0x615F5F;
    await message.edit({
      embeds: [this.generateEmbed(author, playerHand, dealerHand, bet, false, result, color)],
      skipV2: true
    });
    await gameRepo.deleteGame(author.id);
  }
}

module.exports = new BlackjackCommand();
