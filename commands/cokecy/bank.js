const { DateTime } = require('luxon');
const User = require('../../models/User');
const {
  getOrCreateUser, bankCmd, computeInterest,
  updateGiveDate, sendCmd, withdrawCmd
} = require('../../utils/userUtil') 
const { formatVNCurrency } = require('../../utils/format')

module.exports = {
  name: 'bank',
  description: 'Gửi hoặc rút coke để nhận lãi suất hàng ngày (4%/năm)',
  async execute(message, args) {
    const userId = message.author.id;
    const name = message.member?.displayName || message.author.username;
    let user = await getOrCreateUser(userId)

    const now = DateTime.now().setZone('Asia/Ho_Chi_Minh');
    const lastUpdate = user.bankLastUpdate
      ? DateTime.fromJSDate(user.bankLastUpdate).setZone('Asia/Ho_Chi_Minh')
      : now;
    const daysPassed = Math.floor(now.diff(lastUpdate, 'days').days);
    const interest = await computeInterest(userId, daysPassed)
    const [action, value] = args;

    if (!action) {
      let msg = `:coin: **${name}**, số dư ngân hàng: **${formatVNCurrency(user.bank)} coke**\n`;
      msg += `📈 Lãi suất: **4%/năm** (~0.011%/ngày)\n`;
      msg += `:trackball: Cập nhật lần cuối: \`${lastUpdate.toFormat('dd/MM/yyyy')}\`\n`;

      if (interest > 0) {
        msg += `💰 Bạn vừa nhận: **${formatVNCurrency(interest)} coke** tiền lãi sau **${daysPassed} ngày**!\n`;
      }

      await message.reply(msg);
      return
    }

    if (['send', 'deposit', 'gửi'].includes(action)) {
      const amount = value === 'all' ? user.coke : parseInt(value);
      const msg = await sendCmd(userId, amount)
      await message.reply(msg)
      return
    }

    if (['rút', 'withdraw'].includes(action)) {
      const amount = value === 'all' ? user.bank : parseInt(value);
      const msg = await withdrawCmd(userId, amount)
      await message.reply(msg)
      return
    }

    await message.reply(
      '❓ Cách dùng lệnh:\n' +
      '`!bank` — Xem số dư và lãi suất\n' +
      '`!bank send <số tiền>` — Gửi coke vào ngân hàng\n' +
      '`!bank withdraw <số tiền>` — Rút coke từ ngân hàng\n' +
      'Ví dụ: `!bank send 10000`, `!bank withdraw all`'
    );
  }
};
