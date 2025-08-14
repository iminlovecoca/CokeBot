const { setCooldown, getRemainingCooldown } = require('../../utils/cooldown');
const { getCoke, debitIfEnough, adjustCoke } = require('../../utils/cokeManager');

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
          try { await msg.delete(); } catch {}
        } else {
          try { await msg.edit(`⏱ | Vui lòng chờ **${count} giây**`); } catch {}
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

    const balance = await getCoke(userId);
    let amount = 0;
    if (amountArg === 'all') {
      if (balance <= 0) return message.reply('❌ | Bạn không có coke!');
      amount = Math.min(balance, maxBet);
    } else if (!isNaN(amountArg)) {
      amount = Math.min(parseInt(amountArg), maxBet);
    } else {
      return message.reply('❌ | Vui lòng nhập số tiền hợp lệ!');
    }
    if (amount <= 0) return message.reply('❌ | Không đủ coke hoặc số tiền không hợp lệ!');

    const deb = await debitIfEnough(userId, amount);
    if (!deb.ok) return message.reply('❌ | Bạn không đủ coke để cược!');

    const outcome = Math.random() < 0.5 ? 'tai' : 'xiu';

    let rolls, sum, triple;
    while (true) {
      const r1 = 1 + Math.floor(Math.random() * 6);
      const r2 = 1 + Math.floor(Math.random() * 6);
      const r3 = 1 + Math.floor(Math.random() * 6);
      sum = r1 + r2 + r3;
      triple = r1 === r2 && r2 === r3;
      if (triple) continue;
      if (outcome === 'tai' && sum >= 11 && sum <= 17) { rolls = [r1, r2, r3]; break; }
      if (outcome === 'xiu' && sum >= 4 && sum <= 10) { rolls = [r1, r2, r3]; break; }
    }
    const [roll1, roll2, roll3] = rolls;

    let win = 0;
    let multiplier = 0;

    if (outcome === choice) {
      multiplier = triple ? 3 : 2;
      win = amount * multiplier;
    }

    if (win > 0) await adjustCoke(userId, win);

    const rollEmoji = rolls.map(i => diceEmojis[i - 1]);

    const member = await message.guild.members.fetch(userId).catch(() => null);
    const name = member?.displayName || message.author.username;

    const betText = `${currency} ${amount.toLocaleString()}`;
    const winText = win > 0 ? `${currency} ${win.toLocaleString()}${multiplier > 1 ? ` (x${multiplier})` : ''}` : 'trắng... 😢';

    let display = `**  \`__TÀI XỈU__\`**\n\` \` ${moving} ${moving} ${moving} \` \` ${name} cược ${betText}\n  \`|         |\`\n  \`|   COKE  |\``;
    const msg = await message.channel.send(display);

    await wait(1000);
    display = `**  \`__TÀI XỈU__\`**\n\` \` ${rollEmoji[0]} ${moving} ${moving} \` \` ${name} cược ${betText}\n  \`|         |\`\n  \`|   COKE  |\``;
    try { await msg.edit(display); } catch {}

    await wait(700);
    display = `**  \`__TÀI XỈU__\`**\n\` \` ${rollEmoji[0]} ${moving} ${rollEmoji[2]} \` \` ${name} cược ${betText}\n  \`|         |\`\n  \`|   COKE  |\``;
    try { await msg.edit(display); } catch {}

    await wait(1000);
    display = `**  \`__TÀI XỈU__\`**\n\` \` ${rollEmoji[0]} ${rollEmoji[1]} ${rollEmoji[2]} \` \` ${name} cược ${betText}\n  \`|         |\`  ${sum} điểm → **${outcome.toUpperCase()}**\n  \`|   COKE  |\`  Bạn ${win > 0 ? 'thắng' : 'thua'} ${winText}`;
    try { await msg.edit(display); } catch {}

    setCooldown(userId, 'tx', cooldownSeconds);
  }
};

function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}
