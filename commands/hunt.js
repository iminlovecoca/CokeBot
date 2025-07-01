// // commands/hunt.js
// const User = require('../models/User');
// const { getRandomBeast, getMultipleRandomBeasts } = require('../utils/beasts');
// const { setCooldown, getRemainingCooldown } = require('../utils/cooldown');

// module.exports = {
//     name: 'h',
//     aliases: ['hunt'],
//     async execute(message, args) {
//         const userId = message.author.id;
//         const name = message.author.username;

//         const cooldownSeconds = 15;
//         const remaining = getRemainingCooldown(userId, 'hunt');

//         // Nếu đang trong thời gian cooldown thì hiển thị đếm ngược
//         if (remaining > 0) {
//             let countdown = remaining;
//             const reply = await message.reply(`⏱ | Vui lòng chờ **${countdown} giây** để săn tiếp...`);

//             const interval = setInterval(async () => {
//                 countdown--;
//                 if (countdown <= 0) {
//                     clearInterval(interval);
//                     try {
//                         await reply.delete(); // Xoá tin nhắn khi hết đếm ngược
//                     } catch (e) { }
//                 } else {
//                     try {
//                         await reply.edit(`⏱ | Vui lòng chờ **${countdown} giây** để săn tiếp...`);
//                     } catch (e) { }
//                 }
//             }, 1000);

//             return;
//         }

//         // Xác định số lượt bắt
//         let amount = 1;
//         if (args[0] === 'all') {
//             amount = 10;
//         } else if (!isNaN(args[0])) {
//             amount = Math.min(10, Math.max(1, parseInt(args[0])));
//         }

//         const cost = 100 * amount;

//         let user = await User.findOne({ userId });
//         if (!user || user.coke < cost) {
//             return message.reply(`🚫 | Không đủ ${cost} coke để săn ${amount} thú!`);
//         }

//         // Đặt cooldown sau khi đủ điều kiện
//         setCooldown(userId, 'hunt', cooldownSeconds);

//         user.coke -= cost;

//         const beasts = getMultipleRandomBeasts(amount);
//         if (!user.beasts) user.beasts = {};

//         for (const beast of beasts) {
//             if (!user.beasts[beast.rarity]) user.beasts[beast.rarity] = {};
//             if (!user.beasts[beast.rarity][beast.name]) {
//                 user.beasts[beast.rarity][beast.name] = 1;
//             } else {
//                 user.beasts[beast.rarity][beast.name] += 1;
//             }
//         }

//         await user.save();

//         const results = beasts.map(b => `${b.emoji} **${b.name}** (${b.rarity})`).join('\n');
//         message.reply(`🎯 | **${name}** đã bắt được:\n${results}`);
//     }
// };
