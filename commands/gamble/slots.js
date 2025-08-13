// File: s.js (Slots)
const User = require('../../models/User');
const random = require('random-number-csprng');
const { setCooldown, getRemainingCooldown } = require('../../utils/cooldown');

const moving = '<a:slots_rollRecovered2:1403778802542313604>';
const currency = '<:money2:1403773842832359505>';
const symbols = [
  '<:slots_eggplant:1403773769465594027>',
  '<:slots_heart:1403773780962181270>',
  '<:slots_lychee:1403773792781861004>',
  '<a:slots_coin:1403773750448623716>',
  '<:slots_U:1403773817301766346>',
  '<:slots_W:1403773828533981286>'
];
const maxBet = 250000;

module.exports = {
  name: 's',
  description: 'Chơi slot để kiếm coke!',
  async execute(message, args) {
    const cooldownSeconds = 20;
    const userId = message.author.id;

    const remaining = getRemainingCooldown(userId, 's');
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

    let user = await User.findOne({ userId }) || await User.create({ userId });

    let amount = 0;
    if (!args[0]) {
      amount = 1;
    } else if (args[0] === 'all') {
      if (user.coke <= 0) return message.reply('❌ | Bạn không có coke!');
      amount = Math.min(user.coke, maxBet);
    } else if (!isNaN(args[0])) {
      amount = parseInt(args[0]);
      if (amount > maxBet) amount = maxBet;
    } else {
      return message.reply('❌ | Cú pháp: `!s <số tiền>` hoặc `!s all`');
    }

    if (amount <= 0 || user.coke < amount)
      return message.reply('❌ | Số tiền cược không hợp lệ hoặc không đủ coke!');

    let rslots = [];
    const rand = (await random(1, 1000)) / 10;
    let win = 0;

    if (rand <= 20) {
      win = amount;
      rslots.push(symbols[0], symbols[0], symbols[0]);
    } else if (rand <= 40) {
      win = amount * 2;
      rslots.push(symbols[1], symbols[1], symbols[1]);
    } else if (rand <= 45) {
      win = amount * 3;
      rslots.push(symbols[2], symbols[2], symbols[2]);
    } else if (rand <= 47.5) {
      win = amount * 4;
      rslots.push(symbols[3], symbols[3], symbols[3]);
    } else if (rand <= 48.5) {
      win = amount * 10;
      rslots.push(symbols[4], symbols[5], symbols[4]);
    } else {
      const len = symbols.length - 1;
      let slot1 = Math.floor(Math.random() * len);
      let slot2 = Math.floor(Math.random() * len);
      let slot3 = Math.floor(Math.random() * len);
      if (slot3 === slot1) slot2 = (slot1 + Math.ceil(Math.random() * (len - 1))) % len;
      if (slot2 === len - 1) slot2++;
      rslots.push(symbols[slot1], symbols[slot2], symbols[slot3]);
    }

    user.coke += win - amount;
    await user.save();

    const member = await message.guild.members.fetch(userId).catch(() => null);
    const name = member?.displayName || message.author.username;

    const betText = `${currency} ${amount.toLocaleString()}`;
    const winText = win > 0 ? `${currency} ${win.toLocaleString()}` : 'cut... 😢';

    let machine =
      '**  `___SLOTS___`**\n` ` ' +
      moving + ' ' + moving + ' ' + moving +
      ' ` ` ' + name + ' cược ' + betText +
      '\n  `|         |`\n  `|   COKE  |`';

    const msg = await message.channel.send(machine);
    const wait = ms => new Promise(r => setTimeout(r, ms));

    setTimeout(async () => {
      machine =
        '**  `___SLOTS___`**\n` ` ' +
        rslots[0] + ' ' + moving + ' ' + moving +
        ' ` ` ' + name + ' cược ' + betText +
        '\n  `|         |`\n  `|   COKE  |`';
      await msg.edit(machine);

      setTimeout(async () => {
        machine =
          '**  `___SLOTS___`**\n` ` ' +
          rslots[0] + ' ' + moving + ' ' + rslots[2] +
          ' ` ` ' + name + ' cược ' + betText +
          '\n  `|         |`\n  `|   COKE  |`';
        await msg.edit(machine);

        setTimeout(async () => {
          machine =
            '**  `___SLOTS___`**\n` ` ' +
            rslots[0] + ' ' + rslots[1] + ' ' + rslots[2] +
            ' ` ` ' + name + ' cược ' + betText +
            '\n  `|         |`   và ăn ' + winText +
            '\n  `|   COKE  |`';
          await msg.edit(machine);
        }, 1000);
      }, 700);
    }, 1000);

    setCooldown(userId, 's', cooldownSeconds);
  }
};
