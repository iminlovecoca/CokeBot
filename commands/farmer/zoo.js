// const User = require('../../models/User');
// const animalUtil = require('../../utils/animalsUtil');

// const categoryEmojis = {
//   Common: '<:CommonH:1397284687545892915>',
//   Uncommon: '<:UncommonH:1397284709746085891>',
//   Rare: '<:RareH:1397284725147828314>',
//   Epic: '<:EpicH:1397284739525771274>',
//   Mythic: '<:MythicH:1397284767183143175>',
//   Legendary: '<:LegandaryH:1397284792608882708>',
//   Poison: '<:PoisonH:1397284806282448906>',
//   Ancient: '<:AncientH:1397284825840484473>',
//   Gacha: '<:Gacha:1404757376195760249>',
// };
// const blank = '<:blank:1403928807395819671>';

// module.exports = {
//   name: 'z',
//   description: 'Xem danh sách thú bạn đang sở hữu',
//   async execute(message) {
//     const member = message.member;
//     const user = await User.findOne({ userId: message.author.id });
//     if (!user || !user.zoo) return message.reply('❌ | Bạn chưa sở hữu thú nào!');

//     const zoo = user.zoo;
//     let content = `🌿 🌱 🌳 **${member.displayName}'s Zoo!** 🌳 🌿 🌱\n\n`;

//     for (const category of Object.keys(animalUtil)) {
//       const animals = animalUtil[category];
//       if (!Array.isArray(animals) || animals.length === 0) continue;

//       const ownedAnimals = animals.filter(animal => zoo[animal] > 0);

//       let rows = [];
//       for (let i = 0; i < ownedAnimals.length; i += 5) {
//         const group = ownedAnimals.slice(i, i + 5)
//           .map(animal => `${animal}\`${String(zoo[animal]).padStart(3, '0')}\``)
//           .join(' ');
//         // Thêm <blank> | vào các hàng tiếp theo (trừ hàng đầu tiên)
//         if (i === 0) {
//           rows.push(group);
//         } else {
//           rows.push(`<:blank:1403928807395819671> **|** ${group}`);
//         }
//       }

//       if (rows.length > 0) {
//         const emojiLabel = categoryEmojis[category] || category;
//         content += `${emojiLabel} **|**  ${rows.join('\n')}\n`;
//       }
//     }

//     content += `\n **Zoo Points: ${user.zooPoints?.toLocaleString() || 0}**`;

//     message.reply(content);
//   },
// };
