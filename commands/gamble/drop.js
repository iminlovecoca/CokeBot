const User = require('../../models/User');
const Drop = require('../../models/Drop');
const { setCooldown, getRemainingCooldown } = require('../../utils/cooldown');

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

    // Cooldown
    const remaining = getRemainingCooldown(userId, 'drop');
    if (remaining > 0) {
      return message.reply(`⏱ | Bạn cần chờ **${remaining} giây** trước khi dùng lại \`!drop\`.`);
    }

    // Đang có drop trong kênh
    const ongoingDrop = await Drop.findOne({ channelId });
    if (ongoingDrop) {
      return message.reply('⚠️ | Đã có một drop đang diễn ra trong kênh này! Hãy chờ drop kết thúc trước khi thả mới.');
    }

    const user = await User.findOne({ userId });
    if (!user || user.coke < amount) {
      return message.reply('❌ | Bạn không đủ coke để thả!');
    }

    // Tính thuế theo bậc
    let taxRate = 0;
    if (amount >= 2_000_000) taxRate = 0.3;
    else if (amount >= 1_000_000) taxRate = 0.2;
    else if (amount >= 500_000) taxRate = 0.1;
    else if (amount >= 100_000) taxRate = 0.05;

    const tax = Math.floor(amount * taxRate);
    const finalAmount = amount - tax;

    // Trừ tiền người dùng
    await User.updateOne({ userId }, { $inc: { coke: -amount } });

    // Lưu drop vào DB
    await Drop.findOneAndUpdate(
      { channelId },
      {
        channelId,
        amount: finalAmount,
        picked: [],
        expireAt: new Date(Date.now() + 30000)
      },
      { upsert: true }
    );

    setCooldown(userId, 'drop', 30); // cooldown 30s

    // Thông báo thuế nếu có
    const taxNote = taxRate > 0
      ? `💸 | **${tax.toLocaleString()} coke** (${Math.round(taxRate * 100)}%) đã bị đánh thuế vì bạn giàu!\n`
      : '';

    const dropMsg = await message.channel.send(
      `:credit_card: | Đại gia **${message.member.displayName}** vừa thả **${finalAmount.toLocaleString()} coke** xuống!\n` +
      taxNote +
      `⏱ | Dùng \`!pickup\` để nhặt trong **30 giây**!`
    );

    // Đếm ngược tự động xoá
    let remainingSec = 30;
    const interval = setInterval(async () => {
      remainingSec--;

      if (remainingSec <= 0) {
        clearInterval(interval);
        await Drop.deleteOne({ channelId });
        dropMsg.edit(':dollar: | Drop đã kết thúc!').catch(() => {});
      } else {
        dropMsg.edit(
          `:credit_card: | Đại gia **${message.member.displayName}** vừa thả **${finalAmount.toLocaleString()} coke**!\n` +
          taxNote +
          `⏱ | Dùng \`!pickup\` để nhặt. Còn lại: **${remainingSec}s**`
        ).catch(() => {});
      }
    }, 1000);
  }
};
