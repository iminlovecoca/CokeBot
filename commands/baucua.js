const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Collection,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const User = require('../models/User');

const symbols = ['🦀', '🦐', '🍐', '🐓', '🫎', '🦈'];
const names = ['cua', 'tôm', 'bầu', 'gà', 'hươu', 'cá'];
const activeGames = new Map();
const MAX_BET_PER_CHOICE = 250000;

module.exports = {
    name: 'bc',
    description: 'Chơi Bầu Cua',
    async execute(message) {
        const gameKey = message.channel.id;
        if (activeGames.has(gameKey)) {
            return message.reply('⚠️ | Đang có ván Bầu Cua diễn ra! Hãy nhấn nút ở tin nhắn trò chơi để chọn con vật.');
        }

        const gameData = {
            choices: new Collection(), // userId => { choice: amount }
            results: null,
            buttonsMessage: null,
            timeLeft: 30
        };
        activeGames.set(gameKey, gameData);

        const buttons = names.map((name, i) =>
            new ButtonBuilder()
                .setCustomId(`bc_${name}`)
                .setLabel(`${symbols[i]} ${name}`)
                .setStyle(ButtonStyle.Secondary)
        );

        const rows = [
            new ActionRowBuilder().addComponents(buttons.slice(0, 3)),
            new ActionRowBuilder().addComponents(buttons.slice(3, 6))
        ];

        const msg = await message.channel.send({
            content: `🔘 **__BẦU CUA__** 🔘`,
            components: rows
        });

        gameData.buttonsMessage = msg;

        const countdown = setInterval(async () => {
            if (gameData.timeLeft <= 0) return clearInterval(countdown);
            gameData.timeLeft--;
            try {
                await msg.edit({
                    content: `🔘 **__BẦU CUA__** 🔘\n\t**Đã bắt đầu *(Còn ${gameData.timeLeft}s)*`,
                    components: rows
                });
            } catch { }
        }, 1000);

        const collector = msg.createMessageComponentCollector({ time: 30000 });

        collector.on('collect', async interaction => {
            const userId = interaction.user.id;
            const choice = interaction.customId.split('_')[1];

            const modal = new ModalBuilder()
                .setCustomId(`bet_modal_${choice}`)
                .setTitle('Đặt cược cho ' + choice);

            const betInput = new TextInputBuilder()
                .setCustomId('bet_amount')
                .setLabel('Nhập số tiền cược (tối đa 250000)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(betInput));
            await interaction.showModal(modal);

            const submitted = await interaction.awaitModalSubmit({
                time: 15000,
                filter: i => i.user.id === userId && i.customId === `bet_modal_${choice}`
            }).catch(() => { });

            if (!submitted) return;

            const amount = parseInt(submitted.fields.getTextInputValue('bet_amount'));
            if (isNaN(amount) || amount <= 0 || amount > MAX_BET_PER_CHOICE) {
                return submitted.reply({ content: `❌ | Số tiền không hợp lệ!`, ephemeral: true });
            }

            let user = await User.findOne({ userId });
            if (!user || user.coke < amount) {
                return submitted.reply({ content: `❌ | Bạn không đủ coke để đặt cược!`, ephemeral: true });
            }

            if (!gameData.choices.has(userId)) {
                gameData.choices.set(userId, {});
            }

            const userChoices = gameData.choices.get(userId);
            if (userChoices[choice]) {
                return submitted.reply({ content: `⚠️ | Bạn đã đặt cược cho **${choice}** rồi.`, ephemeral: true });
            }

            // Trừ tiền ngay khi đặt cược
            userChoices[choice] = amount;
            user.coke -= amount;
            await user.save();

            await submitted.reply({ content: `✅ | Đã cược **${amount.toLocaleString()} coke** vào **${choice}**`, ephemeral: true });
        });

        collector.on('end', async () => {
            const results = [];
            for (let i = 0; i < 3; i++) {
                results.push(names[Math.floor(Math.random() * names.length)]);
            }

            gameData.results = results;
            const emojiResults = results.map(r => symbols[names.indexOf(r)]).join('  ');

            const players = [...gameData.choices.entries()];
            let allResults = '';

            for (const [userId, choiceMap] of players) {
                const user = await User.findOne({ userId });
                if (!user) continue;

                const totalBet = Object.values(choiceMap).reduce((a, b) => a + b, 0);
                let gain = 0;
                for (const [choice, amount] of Object.entries(choiceMap)) {
                    const hitCount = results.filter(r => r === choice).length;
                    if (hitCount > 0) {
                        gain += amount + (amount * hitCount);
                    }
                }


                user.coke += gain;
                await user.save();

                allResults += `**<@${userId}>**\n➡️ Chọn: **${Object.entries(choiceMap).map(([c, a]) => `${c} (${a.toLocaleString()})`).join(', ')}**\n<:Economy_Cowoncy:1386429292883214397> Đặt: **${totalBet.toLocaleString()} coke**\n`;
                allResults += gain > 0
                    ? `✅ Trúng → Nhận: **${gain.toLocaleString()} coke**\n\n`
                    : `❌ Không trúng → Mất: **${totalBet.toLocaleString()} coke**\n\n`;
            }

            if (!allResults) allResults = '*Không có người chơi nào hợp lệ!*';

            const resultEmbed = new EmbedBuilder()
                .setTitle('🎲 KẾT QUẢ BẦU CUA 🎲')
                .setColor('Green')
                .setDescription(`**KẾT QUẢ:** ${emojiResults}\n\n${allResults}`);

            await message.channel.send({ embeds: [resultEmbed] });
            try {
                await gameData.buttonsMessage.edit({ content: '⏱ **Ván đã kết thúc!**', components: [] });
            } catch (err) {
                console.warn('Không thể chỉnh sửa message:', err.message);
            }

            activeGames.delete(gameKey);
        });
    }
};
