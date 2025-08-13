const danisaEmoji = '<:danisa:1404057793920635043>';
const ownerId = '745950731638407210';
const User = require('../../models/User');

module.exports = {
  name: 'cookie',
  description: 'Tặng hoặc tự thưởng bánh Danisa',
  async execute(message, args) {
    const authorId = message.author.id;

    // Lấy user author hoặc tạo mới
    let authorUser = await User.findOne({ userId: authorId });
    if (!authorUser) {
      authorUser = new User({ userId: authorId, luck: 0, cookie: 0 });
    }

    if (!args.length) {
      // tự thưởng 1 bánh Dasani
      authorUser.cookie += 1;
      await authorUser.save();
      return message.reply(
        `${danisaEmoji} | Bạn vừa tự thưởng cho mình 1 hộp bánh **Danisa**! Giờ bạn có **${authorUser.cookie} hộp.**` 
      );
    }

    // Nếu có args, user tag người khác
    const userMention = message.mentions.users.first();
    if (!userMention) {
      return message.reply('❌ Bạn phải tag một người dùng hợp lệ!');
    }

    if (userMention.id === authorId) {
      return message.reply('❌ Bạn không thể tặng bánh **Danisa** cho chính mình!');
    }

    // Kiểm tra owner để bypass kiểm tra bánh
    if (authorId !== ownerId) {
      if (authorUser.cookie <= 0) {
        return message.reply('❌ Bạn không còn chiếc bánh Danisa nào để tặng!');
      }
      // Trừ 1 bánh khi tặng
      authorUser.cookie -= 1;
      await authorUser.save();
    }

    // Thưởng 1 bánh Dasani cho người được tặng
    let targetUser = await User.findOne({ userId: userMention.id });
    if (!targetUser) {
      targetUser = new User({ userId: userMention.id, luck: 0, cookie: 0 });
    }
    targetUser.cookie += 1;
    await targetUser.save();

    // Lấy displayName của người được tặng và người tặng
    const targetDisplayName = message.guild.members.cache.get(userMention.id)?.displayName || userMention.username;
    const authorDisplayName = message.guild.members.cache.get(authorId)?.displayName || message.author.username;

    return message.channel.send(
      `${danisaEmoji} **| ${targetDisplayName}**, bạn vừa nhận được 1 hộp **Danisa** từ **${authorDisplayName}**. Hãy thưởng thức nhé~ ${danisaEmoji}`
    );
  }
};
