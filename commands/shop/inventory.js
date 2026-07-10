const BaseCommand = require('../../core/BaseCommand');
const { EmbedBuilder } = require('discord.js');
const { initPage } = require('../../utils/pageUtil');
const { UserFriendlyError } = require('../../utils/errors');
const config = require('../../data/config');
const ITEMS_PER_PAGE = 9;

class InventoryCommand extends BaseCommand {
  constructor() {
    super({
      name: 'inventory',
      description: 'Kiểm tra túi đồ của bạn.',
      aliases: ['inv'],
      usage: `${config.prefix}inv`,
      examples: [
        { intent: 'Xem túi đồ của bạn', command: `${config.prefix}inv` }
      ],
      cooldown: 3
    });
  }

  async execute(message, args) {
    const userRepository = message.client.services.get('userRepository');
    const user = await userRepository.getOrCreate(message.author.id);
    
    if (!user.inventory || user.inventory.size === 0) {
      throw new UserFriendlyError(`${config.emoji.no} Túi đồ của bạn trống trơn!`);
    }

    const allItems = message.client.allItems;
    const userItems = Array.from(user.inventory.entries())
      .map(([itemId, quantity]) => {
        const itemData = allItems.find(i => i.item_id === itemId);
        if (!itemData) return null;
        return { ...itemData, quantity };
      })
      .filter(Boolean);

    const totalPages = Math.ceil(userItems.length / ITEMS_PER_PAGE);
    
    const generateDisplay = (page) => {
      const startIdx = page * ITEMS_PER_PAGE;
      const pageItems = userItems.slice(startIdx, startIdx + ITEMS_PER_PAGE);

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Túi đồ của ${message.author.username}`)
        .setDescription(`Những vật phẩm trong túi đồ của bạn. Dùng \`${config.prefix}use <id>\` để sử dụng chúng.`)
        .setFooter({ text: `Trang ${page + 1}/${totalPages}` });

      pageItems.forEach(item => {
        embed.addFields({ name: `${item.emoji}${item.name} (x${item.quantity})`, value: `\`${item.item_id}\``, inline: true });
      });
      embed.addFields({ name: '\u200B', value: '\u200B', inline: true });
      return { embeds: [embed], skipV2: true };
    };

    await initPage(message, generateDisplay, totalPages, `${config.prefix}inventory`);
  }
}

module.exports = new InventoryCommand();