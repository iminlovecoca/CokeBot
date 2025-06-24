const User = require('../models/User');
const random = require('random-number-csprng');
const { setCooldown, getRemainingCooldown } = require('../utils/cooldown');

const diceEmojis = [
  '<:tx1:1386757978320932895>', '<:tx2:1386757989720915968>', '<:tx3:1386758002945818834>',
  '<:tx4:1386758985130049576>', '<:tx5:1386759338965729340>', '<:tx6:1386759599373418556>'
];
const moving = '<a:rolltx:1386763860551274526>';
const currency = '<:Economy_Cowoncy:1386429292883214397>';
const maxBet = 250000;

module.exports = {
  name: 'tx',
  description: 'Chơi tài xỉu bằng coke!',
  async execute(message, args) {
    const cooldownSeconds = 15;
    const remaining = getRemainingCooldown(message.author.id, 'tx');
    if (remaining > 0) {
      const msg = await message.reply(`⏱ | Vui lòng chờ **${remaining} giây**`);
      let count = remaining;
      const interval = setInterval(async () => {
        count--;
        if (count <= 0) {
          clearInterval(interval);
          msg.delete().catch(() => {});
        } else {
          msg.edit(`⏱ | Vui lòng chờ **${count} giây**`);
        }
      }, 1000);
      return;
    }

    const userId = message.author.id;
    const choiceArg = args[0]?.toLowerCase();
    const amountArg = args[1];
    let amount = 0;

    if (!['t', 'x'].includes(choiceArg)) {
      return message.reply('Cú pháp: `!tx t 100` hoặc `!tx x all`');
    }

    const choice = choiceArg === 't' ? 'tai' : 'xiu';
    let user = await User.findOne({ userId }) || await User.create({ userId });

    if (amountArg === 'all') {
      if (user.coke <= 0) return message.reply('Bạn không có coke!');
      amount = Math.min(user.coke, maxBet);
    } else if (!isNaN(amountArg)) {
      amount = parseInt(amountArg);
      if (amount > maxBet) amount = maxBet;
    } else {
      return message.reply('Vui lòng nhập số tiền hợp lệ!');
    }

    if (amount <= 0 || user.coke < amount)
      return message.reply('Không đủ coke hoặc số tiền không hợp lệ!');

    const roll1 = await random(1, 6);
    const roll2 = await random(1, 6);
    const roll3 = await random(1, 6);
    const sum = roll1 + roll2 + roll3;
    const outcome = sum >= 11 ? 'tai' : 'xiu';
    const win = outcome === choice ? amount * 2 : 0;

    user.coke += win - amount;
    await user.save();

    const rolls = [roll1, roll2, roll3];
    const rollEmoji = rolls.map(i => diceEmojis[i - 1]);
    const name = message.author.username;
    const betText = `${currency} ${amount.toLocaleString()}`;
    const winText = win > 0 ? `${currency} ${win.toLocaleString()}` : 'trắng... 😢';

    let display = `**  \`__TÀI XỈU__\`**\n\` \` ${moving} ${moving} ${moving} \` \` ${name} cược ${betText}\n  \`|         |\`\n  \`|   COKE  |\``;
    const msg = await message.channel.send(display);
    const wait = ms => new Promise(r => setTimeout(r, ms));

    await wait(700);
    display = `**  \`__TÀI XỈU__\`**\n\` \` ${rollEmoji[0]} ${moving} ${moving} \` \` ${name} cược ${betText}\n  \`|         |\`\n  \`|   COKE  |\``;
    await msg.edit(display);

    await wait(600);
    display = `**  \`__TÀI XỈU__\`**\n\` \` ${rollEmoji[0]} ${moving} ${rollEmoji[2]} \` \` ${name} cược ${betText}\n  \`|         |\`\n  \`|   COKE  |\``;
    await msg.edit(display);

    await wait(500);
    display = `**  \`__TÀI XỈU__\`**\n\` \` ${rollEmoji[0]} ${rollEmoji[1]} ${rollEmoji[2]} \` \` ${name} cược ${betText}\n  \`|         |\`  ${sum} điểm, bạn ${win > 0 ? 'thắng' : 'thua'} ${winText}\n  \`|   COKE  |\``;
    await msg.edit(display);

    setCooldown(message.author.id, 'tx', cooldownSeconds);
  }
};