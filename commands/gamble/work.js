const BaseCommand = require('../../core/BaseCommand');
const { UserFriendlyError } = require('../../utils/errors');
const jobs = require('../../data/jobs.json');
const config = require('../../data/config');

class WorkCommand extends BaseCommand {
  constructor() {
    super({
      name: 'work',
      aliases: ['job', 'working', 'wk'],
      description: 'Làm việc mỗi 3 giờ để nhận coke',
      usage: `${config.prefix}work`,
      examples: [
        { intent: 'Làm việc kiếm coke', command: `${config.prefix}work` }
      ],
      cooldown: 0 // Handled manually for detailed time format
    });
  }

  async execute(message, args) {
    const userId = message.author.id;
    const userRepository = message.client.services.get('userRepository');
    const user = await userRepository.getOrCreate(userId);

    const now = Date.now();
    const cooldown = 3 * 60 * 60 * 1000;

    if (!user.lastWork) user.lastWork = 0;
    const remaining = cooldown - (now - user.lastWork);

    if (remaining > 0) {
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      throw new UserFriendlyError(`⏱ **|** Bạn cần chờ **${h}h ${m}m ${s}s** nữa để làm việc lại.`);
    }

    const reward = Math.floor(Math.random() * (1500 - 500 + 1)) + 500;
    const job = jobs[Math.floor(Math.random() * jobs.length)];

    user.coke += reward;
    user.lastWork = now;
    await user.save();

    return message.reply(`💼 **|** Bạn vừa **${job}** và nhận được **${reward.toLocaleString()} coke**!`);
  }
}

module.exports = new WorkCommand();
