const { getDrop, updateDrop } = require('../../utils/dropUtil');
const { incBalance } = require('../../utils/userUtil')

module.exports = {
  name: 'pickup',
  aliases: ['pk', 'earn', 'claim'],
  description: 'Nhặt coke ngẫu nhiên từ sàn (1 lần/đợt)',

  async execute(message) {
    const userId = message.author.id;
    const channelId = message.channel.id;

    const drop = await getDrop(channelId);
    if (!drop || drop.amount <= 0) {
      return message.reply('❌ **|** Không có coke nào để nhặt.');
    }

    if (drop.picked.includes(userId)) {
      return message.reply('❌ **|** Bạn đã nhặt trong đợt này rồi!');
    }

    const percent = Math.floor(Math.random() * 31) + 10;
    const amount = Math.max(1, Math.floor(drop.amount * percent / 100));

    await updateDrop(channelId, amount, userId)
    await incBalance(userId, amount);

    return message.channel.send(
      `:credit_card: **|** **${message.member.displayName}** đã nhặt được **${amount.toLocaleString()} coke** từ sàn!`
    );
  }
};
