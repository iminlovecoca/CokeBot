const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const games = new Map();
const { setCooldown, getRemainingCooldown } = require('../utils/cooldown');

const suits = ['s', 'h', 'd', 'c'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const emojiMap = {
    'As': '<:as:1387744476281180313>', '2s': '<:2s:1387744451430187070>', '3s': '<:3s:1387744435680448662>', '4s': '<:4s:1387744421117689856>',
    '5s': '<:5s:1387744401672900678>', '6s': '<:6s:1387744380521025536>', '7s': '<:7s:1387744359654621246>', '8s': '<:8s:1387744343573663795>',
    '9s': '<:9s:1387744328021049454>', '10s': '<:10s:1387744315001802839>', 'Js': '<:js:1387744943573045398>', 'Qs': '<:qs:1387744494937444524>',
    'Ks': '<:ks:1387744640362352691>',

    'Ah': '<:ah:1387747538479743046>', '2h': '<:2h:1387747525225615400>', '3h': '<:3h:1387747508582879283>', '4h': '<:4h:1387747459903651840>',
    '5h': '<:5h:1387747409458892801>', '6h': '<:6h:1387747390613618870>', '7h': '<:7h:1387747372792283176>', '8h': '<:8h:1387747352663818290>',
    '9h': '<:9h:1387747330081427456>', '10h': '<:10h:1387747310833897543>', 'Jh': '<:jh:1387747288411017328>', 'Qh': '<:qh:1387747094860927130>',
    'Kh': '<:kh:1387747075621650523>',

    'Ad': '<:ad:1387746016584798270>', '2d': '<:2d:1387745830768873482>', '3d': '<:3d:1387745813966618754>', '4d': '<:4d:1387745735952433286>',
    '5d': '<:5d:1387745682936303626>', '6d': '<:6d:1387745631421861898>', '7d': '<:7d:1387745614917537792>', '8d': '<:8d:1387745588853997811>',
    '9d': '<:9d:1387745073038622780>', '10d': '<:10d:1387745042197647493>', 'Jd': '<:jd:1387745008970629201>', 'Qd': '<:qd:1387744996974919791>',
    'Kd': '<:kd:1387744979916558456>',

    'Ac': '<:ac:1387747044189405204>', '2c': '<:2c:1387747027382702190>', '3c': '<:3c:1387747001067900958>', '4c': '<:4c:1387746985385398335>',
    '5c': '<:5c:1387746960357986344>', '6c': '<:6c:1387746942880055397>', '7c': '<:7c:1387746915462156288>', '8c': '<:8c:1387746898496065649>',
    '9c': '<:9c:1387746869517746338>', '10c': '<:10c:1387746849154269266>', 'Jc': '<:jc:1387746825771159592>', 'Qc': '<:qc:1387746055717781626>',
    'Kc': '<:kc:1387746037199798445>'
};

function getCard() {
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    return { name: `${rank}${suit}`, value: getValue(rank) };
}

function getValue(rank) {
    if (rank === 'A') return 11;
    if (['K', 'Q', 'J'].includes(rank)) return 10;
    return parseInt(rank);
}

function calcTotal(cards) {
    let total = cards.reduce((a, b) => a + b.value, 0);
    let aces = cards.filter(c => c.name.startsWith('A')).length;
    while (total > 21 && aces--) total -= 10;
    return total;
}

function hasAce(cards) {
    return cards.some(c => c.name.startsWith('A'));
}

function getDisplay(cards) {
    return cards.map(c => emojiMap[c.name] || c.name).join('  ');
}

module.exports = {
    name: 'bj',
    description: 'Chơi xì dách (blackjack)',
    async execute(message, args) {
        const cooldownSeconds = 15;
        const remaining = getRemainingCooldown(message.author.id, 'bj');
        if (remaining > 0) {
            const msg = await message.reply(`⏱ | Vui lòng chờ **${remaining} giây**`);
            let count = remaining;
            const interval = setInterval(async () => {
                count--;
                if (count <= 0) {
                    clearInterval(interval);
                    msg.delete().catch(() => { });
                } else {
                    msg.edit(`⏱ | Vui lòng chờ **${count} giây**`);
                }
            }, 1000);
            return;
        }
        setCooldown(message.author.id, 'bj', cooldownSeconds);
        const existingGame = games.get(message.author.id);
        if (existingGame) {
            const isTimeout = Date.now() - existingGame.lastAction >= 3600000;
            if (!isTimeout) return message.reply('Bạn đang có ván đang chơi!');
            clearTimeout(existingGame.timeout);
            games.delete(message.author.id);
        }

        const userId = message.author.id;
        let user = await User.findOne({ userId }) || await User.create({ userId });

        let bet = parseInt(args[0]);
        if (args[0] === 'all') bet = Math.min(user.coke, 250000);
        if (isNaN(bet) || bet <= 0) return message.reply('💸 Vui lòng nhập số cược hợp lệ hoặc "all"!');
        if (bet > 250000) bet = 250000;
        if (user.coke < bet) return message.reply('🚫 Bạn không đủ coke để cược!');

        user.coke -= bet;
        await user.save();

        const player = [getCard(), getCard()];
        const dealer = [getCard(), getCard()];

        const game = {
            player,
            dealer,
            message,
            bet,
            user,
            timeout: setTimeout(() => games.delete(message.author.id), 3600000),
            lastAction: Date.now(),
        };
        games.set(message.author.id, game);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('hit').setEmoji('👊').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('stand').setEmoji('🛑').setStyle(ButtonStyle.Secondary)
            );


        const total = calcTotal(player);
        const aceMark = hasAce(player) ? ' *' : '';

        const embed = new EmbedBuilder()
            .setDescription(`**${message.author.username}**, bạn cược ${bet.toLocaleString()} coke\n\n` +
                `**Dealer** [${dealer[0].value}+?]\n${getDisplay([dealer[0]])}<:back:1387747558880841789>\n\n**${message.author.username}** [${total}]${aceMark}` +
                `\n${getDisplay(player)}\n\n🎲 ~ đang diễn ra`)
            .setColor('Blue');

        const sent = await message.reply({ embeds: [embed], components: [row] });

        const filter = (i) => i.user.id === message.author.id;
        const collector = sent.createMessageComponentCollector({ filter, time: 3600000 });

        collector.on('collect', async (interaction) => {
            await interaction.deferUpdate();
            if (!games.has(message.author.id)) return;
            const game = games.get(message.author.id);
            game.lastAction = Date.now();

            if (interaction.customId === 'hit') {
                game.player.push(getCard());
                const total = calcTotal(game.player);
                const aceMark = hasAce(game.player) ? ' *' : '';
                if (total > 21 || game.player.length >= 5) {
                    await endGame(game, sent);
                    games.delete(message.author.id);
                    collector.stop();
                } else {
                    const embed = new EmbedBuilder()
                        .setDescription(`**${message.author.username}**, bạn cược ${game.bet.toLocaleString()} coke\n\n` +
                            `**Dealer** [${game.dealer[0].value}+?]\n${getDisplay([game.dealer[0]])}<:back:1387747558880841789>\n\n**${message.author.username}** [${total}]${aceMark}` +
                            `\n${getDisplay(game.player)}\n\n🎲 ~ đang diễn ra`)
                        .setColor('Blue');
                    await sent.edit({ embeds: [embed] });
                }
            } else if (interaction.customId === 'stand') {
                await endGame(game, sent);
                games.delete(message.author.id);
                collector.stop();
            }
        });
    },
};

async function endGame(game, sent) {
    let dealerTotal = calcTotal(game.dealer);
    while (dealerTotal < 17) {
        const newCard = getCard();
        game.dealer.push(newCard);
        dealerTotal = calcTotal(game.dealer);
        if (dealerTotal === 17) break;
    }

    const playerTotal = calcTotal(game.player);
    let result = '';
    let reward = 0;

    if (playerTotal > 21 && dealerTotal > 21) {
        game.user.coke += game.bet;
        await game.user.save();
        result = 'Hoà! Cả hai cùng ngoắc';
    } else if (playerTotal > 21) {
        result = 'Ngoắc!';
    } else if (dealerTotal > 21) {
        reward = game.bet * 2;
        result = 'Bạn thắng!';
    } else if (game.player.length === 2 && game.player.every(c => c.name.startsWith('A'))) {
        reward = game.bet * 3;
        result = 'Xì bàng! Bạn thắng lớn!';
    } else if (game.player.length === 5 && playerTotal <= 21) {
        reward = game.bet * 3;
        result = 'Ngũ linh! Bạn thắng lớn!';
    } else if (playerTotal === 21 && game.player.length === 2) {
        reward = game.bet * 2;
        result = 'Xì dách! Bạn thắng!';
    } else if (playerTotal > dealerTotal) {
        reward = game.bet * 2;
        result = 'Bạn thắng!';
    } else if (playerTotal < dealerTotal) {
        result = 'Bạn thua!';
    } else {
        game.user.coke += game.bet;
        await game.user.save();
        result = 'Hoà!.';
    }

    if (reward > 0) {
        game.user.coke += reward;
        await game.user.save();
        result += `\n💰 | Bạn nhận : **${reward.toLocaleString()} coke**`;
    }

    let color = 'Grey';
    if (result.includes('thắng')) color = 'Green';
    else if (result.includes('Ngoắc') || result.includes('thua')) color = 'Red';

    const embed = new EmbedBuilder()
        .setDescription(`**Dealer** [${dealerTotal}]\n${getDisplay(game.dealer)}\n\n**${game.message.author.username}** [${playerTotal}]` +
            `\n${getDisplay(game.player)}\n\n🎲 ~${result}`)
        .setColor(color);

    await sent.edit({ embeds: [embed], components: [] });
}
