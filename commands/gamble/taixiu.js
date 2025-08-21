const random = require('random-number-csprng');
const {
  setCooldown,
  getRemainingCooldown,
  notifyCooldown
} = require('../../utils/cooldown')
const { decBalance, incBalance } = require('../../utils/userUtil')
const { getBetAmount } = require('../../utils/gameUtil')
const config = require('../../data/config.json')
const emoji = config.emoji

const diceEmojis = [
  emoji.dice_1, emoji.dice_2, emoji.dice_3,
  emoji.dice_4, emoji.dice_5, emoji.dice_6
]
const moving = emoji.dice_rolling
const currency = emoji.money
const maxBet = 250000
const minBet = 1
const cooldownSeconds = 15

module.exports = {
  name: 'tx',
  description: '🎲 Chơi tài xỉu bằng coke!',
  async execute(message, args) {
    try {
      const userId = message.author.id;
      const cooldown = getRemainingCooldown(userId, 'tx')
      if (cooldown > 0) return notifyCooldown(message, cooldown)

      let choice
      if (args.length == 0) {
        return await message.reply('❌ | Cú pháp: `!tx <t/x> <số tiền|all>`')
      } else {
        choice = args[0].toLowerCase();
        if (['tai', 't'].includes(choice)) {
          choice = 'tai'
        } else if (['xiu', 'x'].includes(choice)) {
          choice = 'xiu'
        } else {
          return await message.reply('❌ | Bạn phải chọn `tai` hoặc `xiu`!')
        }
      }
      let bet = args.length == 1 ? 'min' : args[1]
      const amount = await getBetAmount(bet, userId, maxBet, minBet)
      await decBalance(userId, amount)

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
      if (win > 0) await incBalance(userId, win)

      display = `**  \`__TÀI XỈU__\`**\n\` \` ${rollEmoji[0]} ${rollEmoji[1]} ${rollEmoji[2]} \` \` ${name} cược ${betText}\n  \`|         |\`  ${sum} điểm → **${outcome.toUpperCase()}**\n  \`|   COKE  |\`  Bạn ${win > 0 ? 'thắng' : 'thua'} ${winText}`;
      await msg.edit(display);

      setCooldown(userId, 'tx', cooldownSeconds);
    } catch(error) {
      return await message.reply(error.message)
    }
  }
};