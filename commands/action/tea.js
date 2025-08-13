const teaEmoji = '🍵'; // hoặc emoji bạn thích
const ownerId = '745950731638407210';
const User = require('../../models/User');

module.exports = {
  name: 'tea',
  description: 'Tặng hoặc tự thưởng trà',
  async execute(message, args) {
    const authorId = message.author.id;

    // Lấy user author hoặc tạo mới
    let authorUser = await User.findOne({ userId: authorId });
    if (!authorUser) {
      authorUser = new User({ userId: authorId, luck: 0, tea: 0 });
    }

    if (!args.length) {
      // tự thưởng 1 trà
      authorUser.tea += 1;
      await authorUser.save();
      return message.reply(
        `${teaEmoji} | Bạn vừa tự thưởng cho mình 1 tách **trà**! Giờ bạn có **${authorUser.tea} tách**.`
      );
    }

    // Nếu có args, user tag người khác
    const userMention = message.mentions.users.first();
    if (!userMention) {
      return message.reply('❌ Bạn phải tag một người dùng hợp lệ!');
    }

    if (userMention.id === authorId) {
      return message.reply('❌ Bạn không thể tặng trà cho chính mình khi đã dùng tag!');
    }

    // Kiểm tra owner để bypass kiểm tra trà
    if (authorId !== ownerId) {
      if (authorUser.tea <= 0) {
        return message.reply('❌ Bạn không còn tách trà nào để tặng!');
      }
      // Trừ 1 trà khi tặng
      authorUser.tea -= 1;
      await authorUser.save();
    }

    // Thưởng 2 trà cho người được tặng
    let targetUser = await User.findOne({ userId: userMention.id });
    if (!targetUser) {
      targetUser = new User({ userId: userMention.id, luck: 0, tea: 0 });
    }
    targetUser.tea += 1;
    await targetUser.save();

    // Lấy displayName của người được tặng và người tặng
    const targetDisplayName = message.guild.members.cache.get(userMention.id)?.displayName || userMention.username;
    const authorDisplayName = message.guild.members.cache.get(authorId)?.displayName || message.author.username;

    return message.channel.send(
      `${teaEmoji} **| ${targetDisplayName}**, bạn vừa nhận được 1 tách trà nóng từ **${authorDisplayName}**. Hãy thư giãn và thưởng thức nhé~ ${teaEmoji}`
    );
  }
};
