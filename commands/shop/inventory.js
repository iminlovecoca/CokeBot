const BaseCommand = require('../../core/BaseCommand');
const { EmbedBuilder } = require('discord.js');
const { initPage } = require('../../utils/pageUtil');
const { UserFriendlyError } = require('../../utils/errors');
const { formatActiveGemsBadges } = require('../../utils/gemUtil');
const config = require('../../data/config');
const ITEMS_PER_PAGE = 9;

class InventoryCommand extends BaseCommand {
  constructor() {
    super({
      name: 'inventory',
      description: 'Kiểm tra túi đồ của bạn hoặc lọc theo ngọc săn thú.',
      aliases: ['inv'],
      usage: `${config.prefix}inv [gems]`,
      examples: [
        { intent: 'Xem túi đồ của bạn', command: `${config.prefix}inv` },
        { intent: 'Chỉ xem ngọc săn thú trong túi đồ', command: `${config.prefix}inv gems` },
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

    const allItems = message.client.allItems || [];
    let userItems = Array.from(user.inventory.entries())
      .map(([itemId, quantity]) => {
        const itemData = allItems.find(i => i.item_id === itemId);
        if (!itemData) return null;
        return { ...itemData, quantity };
      })
      .filter(Boolean);

    // Support `xinv gems` filter
    const isGemsFilter = args[0]?.toLowerCase() === 'gems' || args[0]?.toLowerCase() === 'gem';
    if (isGemsFilter) {
      userItems = userItems.filter(i => i.item_type === 'gem');
      if (userItems.length === 0) {
        throw new UserFriendlyError(`${config.emoji.no} Bạn không có viên ngọc nào trong túi đồ!`);
      }
    }

    const totalPages = Math.ceil(userItems.length / ITEMS_PER_PAGE);
    const activeBadges = formatActiveGemsBadges(user);
    
    const generateDisplay = (page) => {
      const startIdx = page * ITEMS_PER_PAGE;
      const pageItems = userItems.slice(startIdx, startIdx + ITEMS_PER_PAGE);

      let desc = `Những vật phẩm trong túi đồ của bạn. Dùng \`${config.prefix}use <id>\` để sử dụng chúng.`;
      if (activeBadges) {
        desc += `\n💎 **Ngọc đang kích hoạt:** ${activeBadges} *(Xem chi tiết: \`${config.prefix}gem\`)*`;
      }

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(isGemsFilter ? `Túi ngọc săn thú của ${message.author.username}` : `Túi đồ của ${message.author.username}`)
        .setDescription(desc)
        .setFooter({ text: `Trang ${page + 1}/${totalPages}` });

      pageItems.forEach(item => {
        embed.addFields({ name: `${item.emoji} ${item.name} (x${item.quantity})`, value: `\`${item.item_id}\``, inline: true });
      });
      embed.addFields({ name: '\u200B', value: '\u200B', inline: true });
      return { embeds: [embed], skipV2: true };
    };

    await initPage(message, generateDisplay, totalPages, `${config.prefix}inventory`);
  }
}

module.exports = new InventoryCommand();
