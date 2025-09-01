const random = require('random-number-csprng');
const {
  setCooldown,
  getRemainingCooldown,
  notifyCooldown
} = require('../../utils/cooldown')
const { incBalance } = require('../../utils/userUtil')
const { getBetAmount } = require('../../utils/gameUtil')
const config = require('../../data/config.json')
const emoji = config.emoji

const maxBet = 250000
const minBet = 1
const cooldownSeconds = 15

const moving = emoji.slots_rolling
const currency = emoji.money
const symbols = [
  emoji.slots_eggplant,
  emoji.slots_heart,
  emoji.slots_lychee,
  emoji.slots_coin,
  emoji.slots_U,
  emoji.slots_W
]

module.exports = {
  name: 's',
  aliases: ['slot', 'slots'],
  description: 'Chơi slot để kiếm coke!',
  async execute(message, args) {
    try {
      const userId = message.author.id
      let bet = args.length == 0 ? 'min' : args[0]
      const amount = await getBetAmount(bet, userId, maxBet, minBet)

      const cooldown = getRemainingCooldown(userId, 's')
      if (cooldown > 0) return notifyCooldown(message, cooldown)

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
        const len = (symbols.length - 1);
        let slot1 = Math.floor(Math.random() * (symbols.length - 1));
        let slot2 = Math.floor(Math.random() * (symbols.length - 1));
        let slot3 = Math.floor(Math.random() * (symbols.length - 1));
        // if (slot3 === slot1) 
        //   slot2 = (slot1 + Math.ceil(Math.random() * (len - 1))) % (symbols.length - 1);
        // if (slot2 === len - 1) slot2++;
        if (slot3 == slot1)
          slot2 = (slot1 + Math.ceil(Math.random() * (symbols.length - 2))) % (symbols.length - 1);
        if (slot2 == symbols.length - 2) slot2++;
        rslots.push(symbols[slot1], symbols[slot2], symbols[slot3]);
      }
      await incBalance(userId, win - amount)
      const member = await message.guild.members.fetch(userId).catch(() => null);
      const name = member?.displayName || message.author.username;

      const betText = `${currency} ${amount.toLocaleString()}`
      const winText = win > 0 ? `${currency} ${win.toLocaleString()}` : 'cức...'

      let machine =
        '**  `___SLOTS___`**\n` ` ' +
        moving + ' ' + moving + ' ' + moving +
        ' ` ` ' + name + ' cược ' + betText +
        '\n  `|         |`\n  `|   COKE  |`';

      const msg = await message.channel.send(machine);

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
    } catch (error) {
      return await message.reply(error.message)
    }
  }
}