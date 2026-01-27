const { getUser, decBalance } = require('../../utils/userUtil');
const { getDrop, addDrop, delDrop } = require('../../utils/dropUtil');
const { checkAndSetCooldown } = require('../../utils/cooldown')
const { UserFriendlyError } = require('../../utils/errors')
const config = require('../../data/config');

module.exports = {
  name: 'drop',
  description: 'Thả coke xuống kênh để người khác nhặt',
  usage: '`!drop <số tiền>`',
  examples: '`!drop 7777777`',
  async execute(message, args) {
    const amount = parseInt(args[0]);
    const userId = message.author.id;
    const channelId = message.channel.id;
    const duration = 10;

    if (isNaN(amount) || amount <= 0) {
      throw new UserFriendlyError(`${config.emoji.no} **|** Vui lòng nhập số coke hợp lệ để thả.`);
    }

    const remaining = checkAndSetCooldown(userId, 'drop', duration)
    if (remaining > 0) {
      return message.reply(`⏱ **|** Bạn cần chờ **${remaining} giây** trước khi dùng lại \`!drop\`.`);
    }

    const ongoingDrop = await getDrop(channelId);
    if (ongoingDrop) {
      return message.reply('⚠️ **|** Đã có một drop đang diễn ra trong kênh này! Hãy chờ drop kết thúc trước khi thả mới.');
    }

    const user = await getUser(userId);
    if (user.coke < amount) {
      throw new UserFriendlyError(`${config.emoji.no} **|** Bạn không đủ coke để thả!`);
    }

    await decBalance(userId, amount);
    await addDrop(channelId, amount, duration * 1000);
    const dropMsg = await message.channel.send(
      `:credit_card: **|** Đại gia **${message.member.displayName}** vừa thả **${amount.toLocaleString()} coke** xuống!\n` +
      `⏱  **|** Dùng \`!pickup\` để nhặt trong **${duration} giây**!`
    );

    let remainingSec = duration;
    const interval = setInterval(async () => {
      remainingSec--;

      if (remainingSec <= 0) {
        clearInterval(interval);
        await delDrop(channelId);
        dropMsg.edit(`${config.emoji.money} **|** Drop đã kết thúc!`).catch(() => {});
      } else {
        dropMsg.edit(
          `:credit_card: **|** Đại gia **${message.member.displayName}** vừa thả **${amount.toLocaleString()} coke**!\n` +
          `⏱  **|** Dùng \`!pickup\` để nhặt. Còn lại: **${remainingSec}s**`
        ).catch(() => {});
      }
    }, 1000);
  }
};
