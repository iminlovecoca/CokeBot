const random = require('random-number-csprng');
const { setCooldown, getRemainingCooldown } = require('../../utils/cooldown');
const { debitIfEnough, adjustCoke } = require('../../utils/cokeManager');

const diceEmojis = [
  '<:dice_1:1403773853146288258>', '<:dice_2:1403773866505011473>', '<:dice_3:1403773877569458268>',
  '<:dice_4:1403773888722108537>', '<:dice_5:1403773898515943504>', '<:dice_6:1404015916311642252>'
];
const moving = '<a:dice_rolldice:1403773919751831643>';
const currency = '<:money2:1403773842832359505>';
const maxBet = 250000;

module.exports = {
  name: 'tx',
  description: '🎲 Chơi tài xỉu bằng coke!',
  async execute(message, args) {
    const cooldownSeconds = 20;
    const userId = message.author.id;

    const remaining = getRemainingCooldown(userId, 'tx');
    if (remaining > 0) {
      const msg = await message.reply(`⏱ | Vui lòng chờ **${remaining} giây**`);
      let count = remaining;
      const interval = setInterval(async () => {
        count--;
        if (count <= 0) {
          clearInterval(interval);
          try { await msg.delete(); } catch { }
        } else {
          try { await msg.edit(`⏱ | Vui lòng chờ **${count} giây**`); } catch { }
        }
      }, 1000);
      return;
    }

    const choiceArg = args[0]?.toLowerCase();
    const amountArg = args[1];
    if (!['t', 'x'].includes(choiceArg)) {
      return message.reply('❌ | Cú pháp: `!tx t 100` hoặc `!tx x all`');
    }
    const choice = choiceArg === 't' ? 'tai' : 'xiu';

    let amount = 0;
    if (amountArg === 'all') {
      const deb = await debitIfEnough(userId, 1);
      if (!deb.ok) return message.reply('❌ | Bạn không có coke!');
      await adjustCoke(userId, deb.balance);
      amount = Math.min(deb.balance, maxBet);
    } else if (!isNaN(amountArg)) {
      amount = parseInt(amountArg);
      if (amount > maxBet) amount = maxBet;
    } else {
      return message.reply('❌ | Vui lòng nhập số tiền hợp lệ!');
    }

    // TRỪ TIỀN NGAY
    const deb = await debitIfEnough(userId, amount);
    if (!deb.ok) return message.reply('❌ | Không đủ coke hoặc số tiền không hợp lệ!');

    // Random xúc xắc
    let rolls = [];
    let sum, triple;
    do {
      const r1 = await random(1, 6);
      const r2 = await random(1, 6);
      const r3 = await random(1, 6);
      sum = r1 + r2 + r3;
      triple = r1 === r2 && r2 === r3;
      rolls = [r1, r2, r3];
    } while (triple);

    const outcome = sum >= 11 ? 'tai' : 'xiu';
    const [roll1, roll2, roll3] = rolls;
    const rollEmoji = rolls.map(i => diceEmojis[i - 1]);

    let win = 0;
    let multiplier = 0;
    if (outcome === choice) {
      multiplier = 2;
      win = amount * multiplier;
    }

    const member = await message.guild.members.fetch(userId).catch(() => null);
    const name = member?.displayName || message.author.username;

    const betText = `${currency} ${amount.toLocaleString()}`;
    const winText = win > 0 ? `${currency} ${win.toLocaleString()} (x${multiplier})` : 'trắng... 😢';

    const wait = ms => new Promise(res => setTimeout(res, ms));

    let display = `**  \`__TÀI XỈU__\`**\n\` \` ${moving} ${moving} ${moving} \` \` ${name} cược ${betText}\n  \`|         |\`\n  \`|   COKE  |\``;
    const msg = await message.channel.send(display);

    await wait(1000);
    display = `**  \`__TÀI XỈU__\`**\n\` \` ${rollEmoji[0]} ${moving} ${moving} \` \` ${name} cược ${betText}\n  \`|         |\`\n  \`|   COKE  |\``;
    await msg.edit(display);

    await wait(700);
    display = `**  \`__TÀI XỈU__\`**\n\` \` ${rollEmoji[0]} ${moving} ${rollEmoji[2]} \` \` ${name} cược ${betText}\n  \`|         |\`\n  \`|   COKE  |\``;
    await msg.edit(display);

    await wait(1000);
    if (win > 0) await adjustCoke(userId, win);

    display = `**  \`__TÀI XỈU__\`**\n\` \` ${rollEmoji[0]} ${rollEmoji[1]} ${rollEmoji[2]} \` \` ${name} cược ${betText}\n  \`|         |\`  ${sum} điểm → **${outcome.toUpperCase()}**\n  \`|   COKE  |\`  Bạn ${win > 0 ? 'thắng' : 'thua'} ${winText}`;
    await msg.edit(display);

    setCooldown(userId, 'tx', cooldownSeconds);
  }
};
