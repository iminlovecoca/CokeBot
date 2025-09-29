const User = require('../../models/User');
const { getRandomWord, shuffleWord } = require('../../utils/dictionary');
const { setCooldown, getRemainingCooldown, notifyCooldown } = require('../../utils/cooldown');

const activeGames = new Map();
const cooldownSeconds = 5;

module.exports = {
  name: 'gw',
  aliases: ['guessword', 'gheptu'],
  description: 'Trò chơi ghép chữ từ chữ bị đảo',

  async execute(message) {
    const channelId = message.channel.id;
    const cd = getRemainingCooldown(channelId, 'guessword');
    if (cd > 0) return notifyCooldown(message, cd);

    if (activeGames.has(channelId)) {
      return message.reply('⚠️ **|** Trò chơi đang diễn ra trong kênh này.');
    }

    const word = getRandomWord();
    const shuffled = shuffleWord(word);
    const hint = shuffled.split('').join('/');

    const msg = await message.channel.send(`🧠 **|** Ghép chữ: **${hint}**`);
    activeGames.set(channelId, { answer: word, message: msg, ended: false });

    const filter = m => !m.author.bot;
    const collector = message.channel.createMessageCollector({ filter, time: 45000 });

    collector.on('collect', async m => {
      const game = activeGames.get(channelId);
      if (!game || game.ended) return;

      if (m.content.toLowerCase() === game.answer.toLowerCase()) {
        game.ended = true;

        const reward = 250;
        await User.updateOne(
          { userId: m.author.id },
          { $inc: { coke: reward, guesswordWins: 1 } }
        );

        await m.react('✅').catch(() => { });
        await m.channel.send(
          `🎉 **|** <@${m.author.id}> đoán đúng! Nhận được **${reward.toLocaleString()} coke**`
        );

        activeGames.delete(channelId);
        setCooldown(channelId, 'guessword', cooldownSeconds);
        collector.stop();
      }
      else {
        await m.react('❌').catch(() => { });
      }
    });

    collector.on('end', async () => {
      const game = activeGames.get(channelId);
      if (game && !game.ended) {
        await message.channel.send(
          `⏰ **|** Hết giờ! Không ai trả lời đúng.\n🔍 Đáp án là: **${game.answer}**`
        );
        activeGames.delete(channelId);
        setCooldown(channelId, 'guessword', cooldownSeconds);
      }
    });
  }
};
