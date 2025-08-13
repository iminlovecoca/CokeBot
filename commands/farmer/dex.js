const animalUtil = require('../../utils/animalsUtil');

module.exports = {
  name: 'dex',
  description: 'Xem thông tin chi tiết về thú: !dex <tên thú hoặc emoji>',
  async execute(message, args) {
    if (!args.length) return message.reply('❌ | Vui lòng nhập tên hoặc emoji thú: `!dex <name>`');

    const query = args.join(' ').toLowerCase();
    let found = null;
    let foundCategory = null;

    // Tìm thú theo tên hoặc emoji
    for (const [category, animals] of Object.entries(animalUtil)) {
      for (const animal of animals) {
        const animalName = animal.replace(/:/g, '').toLowerCase();
        if (
          animalName === query ||
          animal.toLowerCase() === query ||
          (query.length > 1 && animalName.includes(query))
        ) {
          found = animal;
          foundCategory = category;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      return message.reply('❌ | Không tìm thấy thú nào phù hợp!');
    }

    // Nếu là custom emoji thì gửi ảnh lớn
    if (found.startsWith('<:') || found.startsWith('<a:')) {
      const match = found.match(/<a?:\w+:(\d+)>/);
      if (match) {
        const emojiId = match[1];
        const isAnimated = found.startsWith('<a:');
        const url = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=256&quality=lossless`;
        return message.reply({
          content:
            `**Tên:** ${found.replace(/<a?:|:\d+>/g, '')}\n` +
            `**Emoji:** ${found}\n` +
            `**Phân loại:** ${foundCategory}`,
          files: [url]
        });
      }
    }

    // Nếu là emoji mặc định thì chỉ gửi text
    const info = [
      `**Tên:** ${found.replace(/:/g, '')}`,
      `**Emoji:** ${found}`,
      `**Phân loại:** ${foundCategory}`,
    ];

    return message.reply(info.join('\n'));
  }
};