const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Collection
} = require('discord.js');
const { adjustCoke, debitIfEnough } = require('../../utils/cokeManager');

const symbols = ['🦀', '🦐', '🍐', '🐓', '🦌', '🦈'];
const names = ['cua', 'tôm', 'bầu', 'gà', 'hươu', 'cá'];
const activeGames = new Map();
const MAX_BET = 250000;

module.exports = {
  name: 'bc',
  description: '🎲 Chơi Bầu Cua bằng coke!',
  async execute(message) {
    const channelId = message.channel.id;
    if (activeGames.has(channelId)) {
      return message.reply('⚠️ | Vừa có một ván Bầu Cua trong kênh này. Hãy đặt cược tại tin nhắn trước.');
    }

    const gameData = {
      timeLeft: 30,
      choices: new Collection(),
      results: null,
      message: null
    };
    activeGames.set(channelId, gameData);

    const buttons = names.map((name, i) => new ButtonBuilder()
      .setCustomId(`bc_${name}`)
      .setLabel(`${symbols[i]} ${name}`)
      .setStyle(ButtonStyle.Secondary));

    const rows = [
      new ActionRowBuilder().addComponents(buttons.slice(0, 3)),
      new ActionRowBuilder().addComponents(buttons.slice(3))
    ];

    const gameMsg = await message.channel.send({
      content: `🎮 **Bấm để đặt cược!** - Còn **${gameData.timeLeft}s**`,
      components: rows
    });
    gameData.message = gameMsg;

    const countdown = setInterval(() => {
      gameData.timeLeft--;
      if (gameData.timeLeft <= 0) {
        clearInterval(countdown);
      } else {
        gameMsg.edit({
          content: `🎮 **Bấm để đặt cược!** - Còn **${gameData.timeLeft}s**`,
          components: rows
        }).catch(() => {});
      }
    }, 1000);

    const collector = gameMsg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async (interaction) => {
      const userId = interaction.user.id;
      const choice = interaction.customId.split('_')[1];

      const modal = new ModalBuilder()
        .setCustomId(`bet_modal_${choice}`)
        .setTitle(`🎯 Đặt cược cho ${choice.toUpperCase()}`);

      const input = new TextInputBuilder()
        .setCustomId('bet_amount')
        .setLabel(`Nhập số tiền (tối đa ${MAX_BET.toLocaleString()})`)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);

      const submitted = await interaction.awaitModalSubmit({
        time: 15000,
        filter: i => i.user.id === userId && i.customId === `bet_modal_${choice}`
      }).catch(() => null);

      if (!submitted) return;

      if (!activeGames.has(channelId) || gameData.timeLeft <= 0) {
        return submitted.reply({ content: '❌ | Ván đã kết thúc, bạn không thể đặt cược!', ephemeral: true });
      }

      const amount = parseInt(submitted.fields.getTextInputValue('bet_amount'));
      if (isNaN(amount) || amount <= 0 || amount > MAX_BET) {
        return submitted.reply({ content: '❌ | Số tiền không hợp lệ!', ephemeral: true });
      }

      if (!gameData.choices.has(userId)) gameData.choices.set(userId, {});
      const userBets = gameData.choices.get(userId);

      if (userBets[choice]) {
        return submitted.reply({ content: `⚠️ | Bạn đã đặt cho **${choice}** rồi!`, ephemeral: true });
      }

      const deb = await debitIfEnough(userId, amount);
      if (!deb.ok) {
        return submitted.reply({ content: '❌ | Bạn không đủ coke!', ephemeral: true });
      }

      userBets[choice] = amount;
      await submitted.reply({
        content: `✅ | Đã đặt **${amount.toLocaleString()} coke** cho **${choice}**!`,
        ephemeral: true
      });
    });

    collector.on('end', async () => {
      const results = Array.from({ length: 3 }, () => names[Math.floor(Math.random() * names.length)]);
      gameData.results = results;

      const emojiResult = results.map(r => symbols[names.indexOf(r)]).join('  ');
      let resultText = `**🎯 Kết quả:** ${emojiResult}\n\n`;

      for (const [userId, bets] of gameData.choices.entries()) {
        let gain = 0;
        let total = 0;

        for (const [choice, amount] of Object.entries(bets)) {
          total += amount;
          const hit = results.filter(r => r === choice).length;
          if (hit > 0) gain += amount * (hit + 1);
        }

        if (gain > 0) await adjustCoke(userId, gain);

        resultText += `**<@${userId}>**\n➡️ Đã cược: ${Object.entries(bets).map(([c, a]) => `${c} (${a})`).join(', ')}\n`;
        resultText += gain > 0
          ? `🎉 Nhận: **${gain.toLocaleString()} coke**\n\n`
          : `💀 Mất: **${total.toLocaleString()} coke**\n\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle('🎲 KẾT QUẢ BẦU CUA')
        .setColor('Green')
        .setDescription(resultText || '*Không có ai tham gia!*');

      await message.channel.send({ embeds: [embed] });

      try {
        await gameData.message.edit({
          content: '⏱ | Ván đã kết thúc!',
          components: []
        });
      } catch {}

      activeGames.delete(channelId);
    });
  }
};
