// const User = require('../../models/User');
// const { setCooldown, getRemainingCooldown } = require('../../utils/cooldown');

// const maxBet = 250000;
// const cokecy = '<:money2:1403773842832359505>';
// const spin = '<a:coinflip:1394380327014891530>';
// const heads = '<:head:436677933977960478>';
// const tails = '<:tail:436677926398853120>';
// const cooldownSeconds = 20;

// module.exports = {
//   name: 'cf',
//   description: 'Chơi coinflip !',
//   async execute(message, args) {
//     const userId = message.author.id;
//     const remaining = getRemainingCooldown(userId, 'coinflip');
//     if (remaining > 0) {
//       const msg = await message.reply(`⏱ | Vui lòng chờ **${remaining}s** để chơi lại.`);
//       let count = remaining;
//       const interval = setInterval(async () => {
//         count--;
//         if (count <= 0) {
//           clearInterval(interval);
//           msg.delete().catch(() => {});
//         } else {
//           msg.edit(`⏱ | Vui lòng chờ **${count}s** để chơi lại.`);
//         }
//       }, 1000);
//       return;
//     }

//     let bet = 1, choice = 'h';
//     let arg1 = args[0];
//     if (!arg1) return message.reply('❌ | Cú pháp: `!cf <số tiền|all> <heads/tails>`');
//     if (!isNaN(arg1)) {
//       bet = parseInt(arg1);
//       arg1 = args[1];
//     } else if (arg1.toLowerCase() === 'all') {
//       bet = 'all';
//       arg1 = args[1];
//     } else if (args[1] && !isNaN(args[1])) {
//       bet = parseInt(args[1]);
//     } else if (args[1] && args[1].toLowerCase() === 'all') {
//       bet = 'all';
//     }
//     if (arg1) {
//       arg1 = arg1.toLowerCase();
//       if (['heads', 'h', 'head'].includes(arg1)) choice = 'h';
//       else if (['tails', 't', 'tail'].includes(arg1)) choice = 't';
//       else return message.reply('❌ | Bạn phải chọn `heads` hoặc `tails`!');
//     }

//     if (bet === 0) return message.reply("❌ | Không thể cược 0 coke!");
//     if (bet < 0) return message.reply("❌ | Số tiền cược không hợp lệ!");
//     if (!choice) return message.reply('❌ | Bạn phải chọn `heads` hoặc `tails`!');

//     const user = await User.findOne({ userId });
//     if (!user || user.coke <= 0) return message.reply('❌ | Bạn không đủ coke!');
//     if (bet === 'all') bet = Math.min(user.coke, maxBet);
//     if (bet > maxBet) bet = maxBet;
//     if (user.coke < bet) return message.reply('❌ | Bạn không đủ coke để cược số này!');

//     user.coke -= bet;
//     await user.save();
//     setCooldown(userId, 'coinflip', cooldownSeconds);

//     let text = `**${message.member?.displayName || message.author.username}** đã cược **${cokecy} ${bet.toLocaleString()}** và chọn ${choice === 'h' ? '**heads**' : '**tails**'}\n`;
//     text += `Đồng xu quay... ${spin}`;
//     const msg = await message.reply(text);

//     setTimeout(async () => {
//       const rand = Math.random() < 0.5 ? 't' : 'h';
//       let win = rand === choice;
//       let resultEmoji = rand === 'h' ? heads : tails;
//       let resultText = `Đồng xu quay... ${resultEmoji} và bạn `;
//       if (win) {
//         user.coke += bet * 2;
//         await user.save();
//         resultText += `thắng **${cokecy} ${(bet * 2).toLocaleString()}**!!`;
//       } else {
//         resultText += 'thua hết... :c';
//       }
//       await msg.edit(`**${message.member?.displayName || message.author.username}** đã cược **${cokecy} ${bet.toLocaleString()}** và chọn ${choice === 'h' ? '**heads**' : '**tails**'}\n${resultText}`);
//     }, 2000);
//   }
// };