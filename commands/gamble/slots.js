const random = require('random-number-csprng');
const { checkAndSetCooldown, notifyCooldown } = require('../../utils/cooldown')
const { incBalance } = require('../../utils/userUtil')
const { getBetAmount } = require('../../utils/gameUtil')
const { getDebuffPercentage } = require('../../utils/miscUtil')
const config = require('../../data/config')
const emoji = config.emoji
const settings = config.gamble_settings

const moving = emoji.slots_rolling
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
  usage: '`!s [tiền cược|all]`',
  examples: '`!s`\n`!slot all`',
  async execute(message, args) {
    try {
      const userId = message.author.id
      const remainingCooldown = checkAndSetCooldown(userId, 's', settings.cooldown_second)
      if (remainingCooldown > 0) {
        return notifyCooldown(message, remainingCooldown)
      }

      let bet = args.length == 0 ? 'min' : args[0]
      const amount = await getBetAmount(bet, userId, settings.max_bet, settings.min_bet)

      let rslots = [];
      const rand = (await random(1, 1000)) / 10;
      let win = 0;

      const debuffPercentage = await getDebuffPercentage(userId)
      if (rand <= 20 * (1 - debuffPercentage)) {
        win = amount;
        rslots.push(symbols[0], symbols[0], symbols[0]);
      } else if (rand <= 40 * (1 - debuffPercentage)) {
        win = amount * 2;
        rslots.push(symbols[1], symbols[1], symbols[1]);
      } else if (rand <= 45 * (1 - debuffPercentage)) {
        win = amount * 3;
        rslots.push(symbols[2], symbols[2], symbols[2]);
      } else if (rand <= 47.5 * (1 - debuffPercentage)) {
        win = amount * 4;
        rslots.push(symbols[3], symbols[3], symbols[3]);
      } else if (rand <= 48.5 * (1 - debuffPercentage)) {
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

      const betText = `${emoji.money} ${amount.toLocaleString()}`
      const winText = win > 0 ? `${emoji.money} ${win.toLocaleString()}` : 'cức...'

      const wait = ms => new Promise(res => setTimeout(res, ms));

      let machine =
        '**  `___SLOTS___`**\n` ` ' +
        moving + ' ' + moving + ' ' + moving +
        ' ` ` ' + name + ' cược ' + betText +
        '\n  `|         |`\n  `|   COKE  |`';

      const msg = await message.channel.send(machine);

      await wait(1000);
      machine =
        '**  `___SLOTS___`**\n` ` ' +
        rslots[0] + ' ' + moving + ' ' + moving +
        ' ` ` ' + name + ' cược ' + betText +
        '\n  `|         |`\n  `|   COKE  |`';
      await msg.edit(machine);

      await wait(700);
      machine =
        '**  `___SLOTS___`**\n` ` ' +
        rslots[0] + ' ' + moving + ' ' + rslots[2] +
        ' ` ` ' + name + ' cược ' + betText +
        '\n  `|         |`\n  `|   COKE  |`';
        await msg.edit(machine);

      await wait(1000);
      machine =
        '**  `___SLOTS___`**\n` ` ' +
        rslots[0] + ' ' + rslots[1] + ' ' + rslots[2] +
        ' ` ` ' + name + ' cược ' + betText +
        '\n  `|         |`   và ăn ' + winText +
        '\n  `|   COKE  |`';
      await msg.edit(machine);
    } catch (error) {
      return await message.reply(error.message)
    }
  }
}