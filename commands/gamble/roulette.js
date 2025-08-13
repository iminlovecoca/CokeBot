const User = require('../../models/User');
const { setCooldown, getRemainingCooldown } = require('../../utils/cooldown');

const RED_NUMBERS = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36];
const MAX_BET = 250000;
const COOLDOWN_SECONDS = 20;

function numberToEmoji(num) {
  return num.toString().split('').map(d =>
    [":zero:", ":one:", ":two:", ":three:", ":four:", ":five:", ":six:", ":seven:", ":eight:", ":nine:"][parseInt(d)]
  ).join(' ');
}

module.exports = {
  name: 'r',
  description: 'Chơi roulette !',
  async execute(message, args) {
    const userId = message.author.id;
    const member = await message.guild.members.fetch(userId).catch(() => null);
    const displayName = member?.displayName || message.author.username;

    const remaining = getRemainingCooldown(userId, 'roulette');
    if (remaining > 0) {
      const msg = await message.reply(`⏱ | Vui lòng chờ **${remaining} giây**`);
      let count = remaining;
      const interval = setInterval(async () => {
        count--;
        if (count <= 0) {
          clearInterval(interval);
          msg.delete().catch(() => { });
        } else {
          msg.edit(`⏱ | Vui lòng chờ **${count} giây**`);
        }
      }, 1000);
      return;
    }

    if (args.length !== 2) {
      return message.reply('❌ | Cú pháp đúng: `!r <red/black/0-36> <số tiền>`');
    }

    const [betTypeRaw, amountArgRaw] = args;
    const betType = betTypeRaw?.toLowerCase();
    const isValidBet =
      betType === 'red' || betType === 'black' || (!isNaN(betType) && parseInt(betType) >= 0 && parseInt(betType) <= 36);

    if (!isValidBet) {
      return message.reply('❌ | Loại cược không hợp lệ. Chỉ chấp nhận `red`, `black`, hoặc số từ `0` đến `36`.');
    }


    const user = await User.findOne({ userId });
    if (!user) return message.reply('❌ | Không tìm thấy người chơi!');
    if (user.coke <= 0) return message.reply('❌ | Bạn không đủ coke để chơi!');

    let amount = 0;
    if (amountArgRaw?.toLowerCase() === 'all') {
      amount = Math.min(user.coke, MAX_BET);
    } else {
      amount = parseInt(amountArgRaw);
    }

    if (isNaN(amount) || amount <= 0 || amount > MAX_BET) {
      return message.reply('❌ | Số tiền cược không hợp lệ (tối đa 250.000 coke).');
    }

    if (user.coke < amount) {
      return message.reply('❌ | Bạn không đủ coke để đặt cược số tiền này!');
    }

    user.coke -= amount;
    await user.save();
    setCooldown(userId, 'roulette', COOLDOWN_SECONDS);

    const rolling = '<a:Roulette:1393258726835753044>';
    const betDisplay = isNaN(betType) ? `**${betType.toUpperCase()}**` : `**${betType}**`;
    const wait = ms => new Promise(r => setTimeout(r, ms));

    // Step 1
    let machine = '**  `__ROULETTE__`**\n` ` ' +
      rolling + ' ' + rolling + ' ' + rolling +
      ' ` ` ' + displayName + ' cược ' + betDisplay +
      '\n  `|         |`\n  `|   COKE  |`';
    const spinMsg = await message.channel.send(machine);
    await wait(1000);

    const result = Math.floor(Math.random() * 37);
    const isRed = RED_NUMBERS.includes(result);
    const isBlack = BLACK_NUMBERS.includes(result);
    const colorEmoji = isRed ? '🔴' : isBlack ? '⚫' : '🟢';

    let payout = 0;
    let winMessage = '💸 Bạn đã thua!';

    // Step 2: hiển thị màu trước
    machine = '**  `__ROULETTE__`**\n` ` ' +
      colorEmoji + ' ' + rolling + ' ' + rolling +
      ' ` ` ' + displayName + ' cược ' + betDisplay +
      '\n  `|         |`\n  `|   COKE  |`';
    await spinMsg.edit(machine);
    await wait(1000);

    const paddedResult = result.toString().padStart(2, '0');
    const digits = paddedResult.split('').map(d =>
      [":zero:", ":one:", ":two:", ":three:", ":four:", ":five:", ":six:", ":seven:", ":eight:", ":nine:"][parseInt(d)]
    );
    const digit1 = digits[0];
    const digit2 = digits[1];

    // Step 3: hiện digit1
    machine = '**  `__ROULETTE__`**\n` ` ' +
      colorEmoji + ' ' + digit1 + ' ' + rolling +
      ' ` ` ' + displayName + ' cược ' + betDisplay +
      '\n  `|         |`\n  `|   COKE  |`';
    await spinMsg.edit(machine);
    await wait(1000);

    // Step 4: hiện digit2 + kết quả
    if (!isNaN(betType)) {
      if (parseInt(betType) === result) {
        payout = amount * 14;
        winMessage = `🎉 Trúng số **${result}** → Nhận **${payout.toLocaleString()} coke**!`;
      }
    } else if (betType === 'red' && isRed) {
      payout = amount * 2;
      winMessage = `🔴 → Nhận **${payout.toLocaleString()} coke**!`;
    } else if (betType === 'black' && isBlack) {
      payout = amount * 2;
      winMessage = `⚫ → Nhận **${payout.toLocaleString()} coke**!`;
    }

    if (payout > 0) {
      user.coke += payout;
      await user.save();
    }

    machine = '**  `__ROULETTE__`**\n` ` ' +
      colorEmoji + ' ' + digit1 + ' ' + digit2 +
      ' ` ` ' + displayName + ' cược ' + betDisplay +
      '\n  `|         |`   và ' + winMessage +
      `\n  \`|   COKE  |\`\n  📌 Đã cược: **${amount.toLocaleString()} coke**\n`;

    await spinMsg.edit(machine);
  }
};
