const User = require('../../models/User');
const { getRandomWord, shuffleWord } = require('../../utils/dictionary');

const cooldown = new Set();
const activeGames = new Map();

module.exports = {
  name: 'gw',
  aliases: ['guessword', 'gheptu'],
  description: 'Trò chơi ghép chữ từ chữ bị đảo',

  async execute(message) {
    const channelId = message.channel.id;

    if (cooldown.has(channelId)) {
      return message.reply('⚠️ Chờ 5 giây để bắt đầu trò chơi mới!');
    }

    if (activeGames.has(channelId)) {
      return message.reply('⚠️ Trò chơi đang diễn ra trong kênh này.');
    }

    activeGames.set(channelId, { answer: null, message: null, ended: false });

    const word = getRandomWord();
    const shuffled = shuffleWord(word);
    const hint = shuffled.split('').join('/');

    const msg = await message.channel.send(`🧠 Ghép chữ: **${hint}**`);
    activeGames.set(channelId, { answer: word, message: msg, ended: false });

    const filter = m => !m.author.bot;
    const collector = message.channel.createMessageCollector({ filter, time: 45000 });

    collector.on('collect', async m => {
      const game = activeGames.get(channelId);
      if (!game || game.ended) return;

      if (m.content.toLowerCase() === game.answer.toLowerCase()) {
        game.ended = true;

        const wordCount = game.answer.trim().split(/\s+/).length;
        let reward = 2000;
        if (wordCount === 2) reward = 2500;
        else if (wordCount === 3) reward = 5000;
        else if (wordCount >= 4) reward = 10000;

        await User.updateOne({ userId: m.author.id }, { $inc: { coke: reward } });
        await m.react('✅');
        await m.channel.send(`🎉 <@${m.author.id}> đoán đúng! Nhận được **${reward.toLocaleString()} coke**`);

        activeGames.delete(channelId);
        cooldown.add(channelId);
        setTimeout(() => cooldown.delete(channelId), 5000);
        collector.stop();
      } else {
        await m.react('❌').catch(() => {});
      }
    });

    collector.on('end', async () => {
      const game = activeGames.get(channelId);
      if (game && !game.ended) {
        if (message.channel) { 
          await message.channel.send(`⏰ Hết giờ! Không ai trả lời đúng.\n🔍 Đáp án là: **${game.answer}**`);
        }
        activeGames.delete(channelId);
        cooldown.add(channelId);
        setTimeout(() => cooldown.delete(channelId), 5000);
      }
    });
  }
};
