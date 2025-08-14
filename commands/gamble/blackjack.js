// const { EmbedBuilder } = require('discord.js');
// const Game = require('../../models/Game');
// const bjUtil = require('../../utils/blackjackutil');
// const { setCooldown, getRemainingCooldown } = require('../../utils/cooldown');
// const { getCoke, debitIfEnough, adjustCoke } = require('../../utils/cokeManager');

// const hitEmoji = '👊';
// const standEmoji = '🛑';
// const games = new Map();
// const maxBet = 250_000;
// const gameExpireTime = 30 * 60 * 1000;

// module.exports = {
//   name: 'bj',
//   description: 'Chơi bài xì dách (blackjack) bằng emoji',
//   async execute(message, args) {
//     try {
//       const userId = message.author.id;
//       const cooldown = getRemainingCooldown(userId, 'bj');
//       if (cooldown > 0) return notifyCooldown(message, cooldown);
//       setCooldown(userId, 'bj', 15);

//       if (games.has(userId))
//         return message.reply('⚠️ Bạn đang có một ván Blackjack đang diễn ra.');

//       let ongoingGame = await Game.findOne({ userId, active: true });
//       if (ongoingGame) {
//         if (Date.now() - ongoingGame.date.getTime() <= gameExpireTime) {
//           return resumeGame(message, userId, ongoingGame);
//         } else {
//           await Game.deleteOne({ userId });
//           return message.reply('⏱ | Ván Blackjack cũ của bạn đã hết hạn và bạn đã mất coke cược.');
//         }
//       }


//       const balance = await getCoke(userId);
//       const bet = parseBet(args[0], balance);
//       if (!bet) return message.reply('❌ | Số tiền cược không hợp lệ hoặc không đủ coke!');

//       const deb = await debitIfEnough(userId, bet);
//       if (!deb.ok) return message.reply('❌ | Bạn không đủ coke để cược!');

//       const deck = bjUtil.createDeck();
//       if (!Array.isArray(deck) || deck.length === 0) {
//         return message.reply('❌ Không thể tạo bộ bài, vui lòng thử lại sau.');
//       }

//       const player = [bjUtil.drawCard(deck), bjUtil.drawCard(deck)];
//       const dealer = [bjUtil.drawCard(deck), bjUtil.drawCard(deck)];

//       await Game.findOneAndUpdate(
//         { userId },
//         {
//           userId,
//           bet,
//           deck,
//           player,
//           dealer,
//           active: true,
//           date: new Date()
//         },
//         { upsert: true, new: true }
//       );

//       return startGame(message, userId, { deck, player, dealer, bet, messageObj: null });
//     } catch (err) {
//       console.error('BJ Command Error:', err);
//       message.reply('❌ Có lỗi xảy ra khi bắt đầu game.');
//     }
//   },
// };

// function parseBet(arg, coke) {
//   if (!arg) return null;
//   if (arg === 'all') return Math.min(coke, maxBet);
//   const bet = parseInt(String(arg).replace(/[,\.]/g, ''));
//   if (isNaN(bet) || bet <= 0 || bet > coke) return null;
//   return Math.min(bet, maxBet);
// }

// function notifyCooldown(message, cooldown) {
//   return message.reply(`⏱ | Vui lòng chờ **${cooldown}s** để chơi lại.`).then((msg) => {
//     let remaining = cooldown;
//     const interval = setInterval(() => {
//       remaining--;
//       if (remaining > 0) msg.edit(`⏱ | Vui lòng chờ **${remaining}s** để chơi lại.`);
//       else {
//         clearInterval(interval);
//         msg.delete().catch(() => {});
//       }
//     }, 1000);
//   });
// }

// async function resumeGame(message, userId, gameData) {
//   const embed = renderEmbed(message.author, gameData.player, gameData.dealer, false, gameData.bet, true);
//   return message.reply({ embeds: [embed] }).then(async (msg) => {
//     await msg.react(hitEmoji);
//     await msg.react(standEmoji);
//     games.set(userId, { ...gameData.toObject?.() ?? gameData, message: msg });
//     setupCollector(message, userId, msg);
//   });
// }

// async function startGame(message, userId, game) {
//   const embed = renderEmbed(message.author, game.player, game.dealer, false, game.bet);
//   return message.reply({ embeds: [embed] }).then(async (msg) => {
//     await msg.react(hitEmoji);
//     await msg.react(standEmoji);
//     games.set(userId, { ...game, message: msg });
//     setupCollector(message, userId, msg);
//   });
// }

// function setupCollector(message, userId, msg) {
//   try {
//     const filter = (reaction, userReact) =>
//       [hitEmoji, standEmoji].includes(reaction.emoji.name) && userReact.id === userId;

//     const collector = msg.createReactionCollector({ filter, time: 90_000 });

//     collector.on('collect', async (reaction, userReact) => {
//       const game = games.get(userReact.id);
//       if (!game || game.message.id !== msg.id) return;

//       try {
//         if (reaction.emoji.name === hitEmoji) {
//           await handleHit(message, userReact, game);
//         } else if (reaction.emoji.name === standEmoji) {
//           collector.stop('stand');
//           await handleStand(message, userReact, game);
//         }
//         await reaction.users.remove(userReact.id).catch(() => {});
//       } catch (err) {
//         console.error('Collector Action Error:', err);
//       }
//     });

//     collector.on('end', async () => {
//       games.delete(userId);
//       // Không hoàn cược, giữ nguyên DB để người chơi gõ !bj mở lại
//     });
//   } catch (err) {
//     console.error('Collector Setup Error:', err);
//   }
// }

// function renderEmbed(authorObj, player, dealer, showDealer, bet, isResume = false) {
//   const safePlayer = Array.isArray(player) ? player.filter(Boolean) : [];
//   const safeDealer = Array.isArray(dealer) ? dealer.filter(Boolean) : [];
//   const dealerCards = showDealer
//     ? bjUtil.getCardDisplay(safeDealer)
//     : `${bjUtil.getCardDisplay([safeDealer[0]])} ${bjUtil.backEmoji()}`;
//   const dealerPoint = showDealer ? `[${bjUtil.calcHandValue(safeDealer)}]` : `[?]`;
//   const resumeText = isResume ? '<:rice:1396919696581857290> ~ tiếp tục ván bài\n\n' : '';

//   const embed = new EmbedBuilder()
//     .setColor('Blue')
//     .setDescription(
//       `${resumeText}\n\n**Dealer** ${dealerPoint}\n${dealerCards}\n\n**${authorObj.username}** [${bjUtil.calcHandValue(safePlayer)}]\n${bjUtil.getCardDisplay(safePlayer)}`
//     )
//     .setAuthor({
//       name: `${authorObj.username}, bạn cược ${bet.toLocaleString()} để chơi xì dách`,
//       iconURL: authorObj.displayAvatarURL({ dynamic: true, size: 1024 }),
//     });

//   return embed;
// }

// async function handleHit(message, user, game) {
//   try {
//     if (!game.deck || !Array.isArray(game.deck) || game.deck.length === 0) {
//       throw new Error('Deck không hợp lệ hoặc đã hết');
//     }
//     const card = bjUtil.drawCard(game.deck);
//     if (!card) throw new Error('Không còn lá bài nào để rút');
//     game.player.push(card);

//     await Game.updateOne({ userId: user.id }, { player: game.player, deck: game.deck });

//     await game.message.edit({
//       embeds: [renderEmbed(message.author, game.player, game.dealer, false, game.bet)],
//     });

//     const playerPoints = bjUtil.calcHandValue(game.player);
//     if (playerPoints > 21 || game.player.length >= 5) {
//       await handleStand(message, user, game);
//     }
//   } catch (err) {
//     console.error('Error in handleHit:', err);
//     await handleStand(message, user, game);
//   }
// }

// async function handleStand(message, user, game) {
//   try {
//     while (bjUtil.calcHandValue(game.dealer) < 17 && game.dealer.length < 5) {
//       if (!game.deck || !Array.isArray(game.deck) || game.deck.length === 0) break;
//       const card = bjUtil.drawCard(game.deck);
//       game.dealer.push(card);
//     }
//   } catch (err) {
//     console.error('Error in handleStand:', err);
//   }

//   const playerPoint = bjUtil.calcHandValue(game.player);
//   const dealerPoint = bjUtil.calcHandValue(game.dealer);

//   const isDoubleAce = (hand) =>
//     hand.length === 2 && hand.every((c) => c?.name?.startsWith('A'));
//   const isBlackjack = (hand) => hand.length === 2 && bjUtil.calcHandValue(hand) === 21;
//   const isFiveCard = (hand) => hand.length === 5 && bjUtil.calcHandValue(hand) <= 21;

//   const playerSpecial = isDoubleAce(game.player)
//     ? 'Xì bàng'
//     : isBlackjack(game.player)
//     ? 'Xì dách'
//     : isFiveCard(game.player)
//     ? 'Ngũ linh'
//     : null;
//   const dealerSpecial = isDoubleAce(game.dealer)
//     ? 'Xì bàng'
//     : isBlackjack(game.dealer)
//     ? 'Xì dách'
//     : isFiveCard(game.dealer)
//     ? 'Ngũ linh'
//     : null;

//   let reward = 0;
//   let result = '';

//   if (playerSpecial && !dealerSpecial) {
//     reward = game.bet * 3;
//     result = `**${playerSpecial}**, bạn thắng ${(reward - game.bet).toLocaleString()} coke!`;
//   } else if (!playerSpecial && dealerSpecial) {
//     result = `Dealer thắng với **${dealerSpecial}**!`;
//   } else if (playerSpecial && dealerSpecial) {
//     const rank = { 'Xì bàng': 3, 'Xì dách': 2, 'Ngũ linh': 1 };
//     if (rank[playerSpecial] > rank[dealerSpecial]) {
//       reward = game.bet * 3;
//       result = `**${playerSpecial}**, bạn thắng!`;
//     } else if (rank[playerSpecial] < rank[dealerSpecial]) {
//       result = `Dealer thắng với **${dealerSpecial}**!`;
//     } else {
//       reward = game.bet;
//       result = `Hoà! cả hai cùng có **${playerSpecial}**.`;
//     }
//   } else if (playerPoint > 21 && dealerPoint > 21) {
//     reward = game.bet;
//     result = 'Hoà! cả hai đều ngoắc.';
//   } else if (playerPoint > 21) {
//     result = `Bạn mất ${game.bet.toLocaleString()} coke!`;
//   } else if (dealerPoint > 21 || playerPoint > dealerPoint) {
//     reward = game.bet * 2;
//     result = `Bạn thắng ${(reward - game.bet).toLocaleString()} coke!`;
//   } else if (playerPoint < dealerPoint) {
//     result = `Bạn mất ${game.bet.toLocaleString()} coke!`;
//   } else {
//     reward = game.bet;
//     result = 'Hoà, không mất coke.';
//   }

//   if (reward > 0) await adjustCoke(user.id, reward);

//   const net = reward - game.bet;
//   const embedColor = net > 0 ? 'Green' : net < 0 ? 'Red' : 'Grey';

//   const embed = new EmbedBuilder()
//     .setColor(embedColor)
//     .setDescription(
//       `**Dealer** [${dealerPoint}]\n${bjUtil.getCardDisplay(game.dealer)}\n\n` +
//       `**${message.author.username}** [${playerPoint}]\n${bjUtil.getCardDisplay(game.player)}\n\n` +
//       `${result}`
//     )
//     .setAuthor({
//       name: `${message.author.username}, bạn cược ${game.bet.toLocaleString()} để chơi xì dách`,
//       iconURL: message.author.displayAvatarURL({ dynamic: true, size: 1024 }),
//     });

//   await game.message.edit({ embeds: [embed] });
//   games.delete(user.id);
//   await Game.deleteOne({ userId: user.id }).catch(() => {});
// }
