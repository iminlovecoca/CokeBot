const BaseCommand = require('../../core/BaseCommand');
const { getDrop, updateDrop } = require('../../utils/dropUtil');
const { incBalance } = require('../../utils/userUtil');
const { UserFriendlyError } = require('../../utils/errors');
const config = require('../../data/config');

class PickupCommand extends BaseCommand {
  constructor() {
    super({
      name: 'pickup',
      aliases: ['claim'],
      description: 'Nhặt coke ngẫu nhiên từ sàn (1 lần/đợt)',
      usage: `${config.prefix}pickup`,
      examples: [
        { intent: 'Nhặt coke trên sàn', command: `${config.prefix}pickup` }
      ],
      cooldown: 0
    });
  }

  async execute(message, args) {
    const userId = message.author.id;
    const channelId = message.channel.id;

    const drop = await getDrop(channelId);
    if (!drop || drop.amount <= 0) {
      throw new UserFriendlyError(`${config.emoji.no} **|** Không có coke nào để nhặt.`);
    }

    if (drop.picked.includes(userId)) {
      throw new UserFriendlyError(`${config.emoji.no} **|** Bạn đã nhặt trong đợt này rồi!`);
    }

    const percent = Math.floor(Math.random() * 31) + 10;
    const amount = Math.max(1, Math.floor(drop.amount * percent / 100));

    await updateDrop(channelId, amount, userId);
    await incBalance(userId, amount);

    await message.channel.send(
      `:credit_card: **|** **${message.member?.displayName || message.author.username}** đã nhặt được **${amount.toLocaleString()} coke** từ sàn!`
    );
  }
}

module.exports = new PickupCommand();
