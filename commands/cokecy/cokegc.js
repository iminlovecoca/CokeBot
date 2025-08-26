// const User = require('../../models/User');
// const EMO_COKEGC = '<a:coinflip:1394380327014891530>'; 

// module.exports = {
//   name: 'buy',
//   description: 'Đổi coke sang CokeGC để quay gacha',

//   async execute(message, args) {
//     const userId = message.author.id;
//     const user = await User.findOne({ userId });
//     if (!user) return message.reply('❌ | Không tìm thấy dữ liệu người dùng.');

//     const amountInput = args[0]?.toLowerCase();
//     let cokeToConvert = 0;

//     if (!amountInput || amountInput === 'all') {
//       cokeToConvert = Math.floor(user.coke / 1_000_000) * 1_000_000;
//     } else {
//       const inputMillion = parseInt(amountInput);
//       if (isNaN(inputMillion) || inputMillion <= 0) {
//         return message.reply('❌ | Số coke không hợp lệ! Nhập số hoặc `all`.');
//       }
//       cokeToConvert = inputMillion * 1_000_000;
//     }

//     if (user.coke < cokeToConvert || cokeToConvert < 1_000_000) {
//       return message.reply(`❌ | Bạn cần ít nhất **1,000,000 coke** để đổi.`);
//     }

//     const gcReceived = cokeToConvert / 1_000_000;

//     user.coke -= cokeToConvert;
//     user.cokeGC += gcReceived;
//     await user.save();

//     return message.channel.send(`🔁 | **${message.member.displayName}** đã đổi **${cokeToConvert.toLocaleString()} coke** lấy **${gcReceived} ${EMO_COKEGC} CokeGC**!`);
//   }
// };
