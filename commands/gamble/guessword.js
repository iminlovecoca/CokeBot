const BaseCommand = require('../../core/BaseCommand');
const { getRandomWord, shuffleWord } = require('../../utils/dictionary');
const { checkAndSetCooldown, notifyCooldown } = require('../../utils/cooldown');
const config = require('../../data/config');

const activeGames = new Map();

class GuessWordCommand extends BaseCommand {
  constructor() {
    super({
      name: 'gw',
      aliases: ['guessword', 'gheptu'],
      description: 'Trò chơi ghép chữ từ chữ bị đảo',
      usage: `${config.prefix}gw`,
      examples: [
        { intent: 'Chơi ghép chữ', command: `${config.prefix}gw` }
      ],
      cooldown: 0 
    });
  }

  async execute(message, args) {
    const channelId = message.channel.id;
    const remainingCooldown = checkAndSetCooldown(channelId, 'guessword', config.gamble_settings.cooldown_second);
    if (remainingCooldown > 0) {
      return notifyCooldown(message, remainingCooldown);
    }

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

    const userRepository = message.client.services.get('userRepository');

    collector.on('collect', async m => {
      const game = activeGames.get(channelId);
      if (!game || game.ended) return;

      if (m.content.toLowerCase() === game.answer.toLowerCase()) {
        game.ended = true;

        const reward = 250;
        
        let targetUser = await userRepository.getOrCreate(m.author.id);
        targetUser.coke += reward;
        targetUser.guesswordWins = (targetUser.guesswordWins || 0) + 1;
        await targetUser.save();

        await m.react('✅').catch(() => { });
        await m.channel.send(
          `🎉 **|** <@${m.author.id}> đoán đúng! Nhận được **${reward.toLocaleString()} coke**`
        );

        activeGames.delete(channelId);
        checkAndSetCooldown(channelId, 'guessword', config.gamble_settings.cooldown_second);
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
      }
    });
  }
}

module.exports = new GuessWordCommand();
