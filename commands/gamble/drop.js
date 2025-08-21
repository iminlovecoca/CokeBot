const User = require('../../models/User');
const Drop = require('../../models/Drop');
const { setCooldown, getRemainingCooldown } = require('../../utils/cooldown');
const { adjustCoke } = require('../../utils/cokeManager');

module.exports = {
  name: 'drop',
  description: 'Thả coke xuống kênh để người khác nhặt',

  async execute(message, args) {
    const amount = parseInt(args[0]);
    const userId = message.author.id;
    const channelId = message.channel.id;

    if (isNaN(amount) || amount <= 0) {
      return message.reply('❌ | Vui lòng nhập số coke hợp lệ để thả.');
    }

    const remaining = getRemainingCooldown(userId, 'drop');
    if (remaining > 0) {
      return message.reply(`⏱ | Bạn cần chờ **${remaining} giây** trước khi dùng lại \`!drop\`.`);
    }

    const ongoingDrop = await Drop.findOne({ channelId });
    if (ongoingDrop) {
      return message.reply('⚠️ | Đã có một drop đang diễn ra trong kênh này! Hãy chờ drop kết thúc trước khi thả mới.');
    }

    const user = await User.findOne({ userId });
    if (!user || user.coke < amount) {
      return message.reply('❌ | Bạn không đủ coke để thả!');
    }

    const taxRate = 0.05;
    const tax = Math.floor(amount * taxRate);
    const finalAmount = amount - tax;

    await adjustCoke(userId, -amount);

    await Drop.findOneAndUpdate(
      { channelId },
      {
        channelId,
        amount: finalAmount,
        picked: [],
        expireAt: new Date(Date.now() + 10_000)
      },
      { upsert: true }
    );

    setCooldown(userId, 'drop', 10);

    const taxNote = `<:money2:1403773842832359505> **| ${tax.toLocaleString()} coke** (5%) đã bị đánh thuế.\n`;

    const dropMsg = await message.channel.send(
      `:credit_card: **|** Đại gia **${message.member.displayName}** vừa thả **${finalAmount.toLocaleString()} coke** xuống!\n` +
      taxNote +
      `⏱  **|** Dùng \`!pickup\` để nhặt trong **10 giây**!`
    );

    let remainingSec = 10;
    const interval = setInterval(async () => {
      remainingSec--;

      if (remainingSec <= 0) {
        clearInterval(interval);
        await Drop.deleteOne({ channelId });
        dropMsg.edit('<:money2:1403773842832359505> **|** Drop đã kết thúc!').catch(() => {});
      } else {
        dropMsg.edit(
          `:credit_card: **|** Đại gia **${message.member.displayName}** vừa thả **${finalAmount.toLocaleString()} coke**!\n` +
          taxNote +
          `⏱  **|** Dùng \`!pickup\` để nhặt. Còn lại: **${remainingSec}s**`
        ).catch(() => {});
      }
    }, 1000);
  }
};
