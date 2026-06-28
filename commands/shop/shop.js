const BaseCommand = require('../../core/BaseCommand');
const { EmbedBuilder } = require('discord.js');
const { initPage } = require('../../utils/pageUtil');
const config = require('../../data/config');
const ITEMS_PER_PAGE = 5;

class ShopCommand extends BaseCommand {
  constructor() {
    super({
      name: 'shop',
      description: 'Hiển thị giao diện cửa hàng.',
      usage: `${config.prefix}shop`,
      examples: [
        { intent: 'Mở cửa hàng', command: `${config.prefix}shop` }
      ],
      cooldown: 5
    });
  }

  async execute(message, args) {
    const allItems = message.client.allItems.filter(item => item.price !== null);

    const regularItems = allItems.filter(item => !item.item_id.startsWith("somber-") && !item.item_id.startsWith("cristal-"));
    const stoneItems = allItems.filter(item => item.item_id.startsWith("somber-") || item.item_id.startsWith("cristal-"));

    const regularPages = Math.ceil(regularItems.length / ITEMS_PER_PAGE);
    const stonePages = Math.ceil(stoneItems.length / ITEMS_PER_PAGE);
    
    // Check Hex Event status
    let isEventActive = false;
    try {
      const HexEventState = require('../../models/HexEventState');
      const eventState = await HexEventState.findById('hex_event');
      if (eventState && eventState.active && (!eventState.expiresAt || eventState.expiresAt > Date.now())) {
        const { DateTime } = require('luxon');
        const timezone = config.rpg.boss?.spawn_timezone || 'Asia/Ho_Chi_Minh';
        const now = DateTime.now().setZone(timezone);
        const day = now.weekday; // 1: Monday, ..., 6: Saturday, 7: Sunday
        if (day === 6 || day === 7 || day === 1) {
          isEventActive = true;
        }
      }
    } catch (err) {
      console.error("[SHOP] Error checking Hex Event status:", err);
    }

    const totalPages = regularPages + stonePages + (isEventActive ? 1 : 0);

    const generateDisplay = (page) => {
      const paddingChar = '\u2003';
      let pageItems = [];
      let title = 'Cửa Hàng Cokemon';

      if (page < regularPages) {
        const startIdx = page * ITEMS_PER_PAGE;
        pageItems = regularItems.slice(startIdx, startIdx + ITEMS_PER_PAGE);
      } else if (page < regularPages + stonePages) {
        const stonePageIdx = page - regularPages;
        const startIdx = stonePageIdx * ITEMS_PER_PAGE;
        pageItems = stoneItems.slice(startIdx, startIdx + ITEMS_PER_PAGE);
        title = 'Cửa Hàng Cokemon - Đá Cường Hóa';
      } else {
        // Hex Event Shop page!
        title = 'Cửa Hàng Sự Kiện Hex 🟣';
        const embed = new EmbedBuilder()
          .setColor('#9B59B6')
          .setTitle(title)
          .setDescription(`Chào mừng bạn đến với Cửa Hàng Sự Kiện Hex!\nVật phẩm tại đây chỉ mua bằng **Linh Hồn** <:souls:1518749776538243082> và **Mảnh Vũ Khí Hex** <:piece:1518749774403338433>.\nDùng \`${config.prefix}buy <id>\` để mua (Giới hạn tối đa **1 vũ khí** mỗi người chơi).\n*Linh Hồn & Mảnh rơi từ boss Hexia/Godhexa.*`)
          .setFooter({ text: `Trang ${page + 1}/${totalPages}` });
        
        embed.addFields(
          {
            name: `<:Clawhex:1518746346352545792> Clawhex (Móng Vuốt Hex)${paddingChar}•${paddingChar}\`clawhex\``,
            value: `*Gây sát thương để lại hiệu ứng rỉ máu khiến kẻ địch chịu thêm 15% st trong 3 round, đồng thời chịu st rỉ máu bằng 50% Str + 50% Dex ở mỗi round đó từ đối thủ.*\n**Giá:** 520 Linh Hồn + 1 Mảnh Vũ Khí Hex`,
            inline: false
          },
          {
            name: `<:Shieldhex:1518746348973850818> Shieldhex (Khiên Hex)${paddingChar}•${paddingChar}\`shieldhex\``,
            value: `*Hấp thụ sát thương giảm 20% gánh chịu từ đòn của đối thủ trong 3 round sau đó phản lại sát thương bằng 90% sát thương đã hấp thụ trong 3 round đó từ đối thủ.*\n**Giá:** 520 Linh Hồn + 1 Mảnh Vũ Khí Hex`,
            inline: false
          },
          {
            name: `<:Spearhex:1518746351784034366> Spearhex (Thương Hex)${paddingChar}•${paddingChar}\`spearhex\``,
            value: `*Xuyên giáp gây sát thương bỏ qua 10% pr của đối thủ.*\n**Giá:** 520 Linh Hồn + 1 Mảnh Vũ Khí Hex`,
            inline: false
          }
        );
        return { embeds: [embed] };
      }

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(title)
        .setDescription(`Luôn có những vật phẩm hữu ích cho cuộc hành trình của bạn!\nDùng \`${config.prefix}buy <id> [số lượng]\` để mua hoặc \`${config.prefix}sell <id> [số lượng]\` để bán.`)
        .setFooter({ text: `Trang ${page + 1}/${totalPages}` });

      pageItems.forEach(item => {
        embed.addFields({
          name: `${item.emoji} ${item.name}${paddingChar}•${paddingChar}\`${item.item_id}\``,
          value: `*${item.description}*\n**Giá:** ${config.emoji.money} ${item.price}`,
          inline: false
        });
      });
      return { embeds: [embed] };
    };
    
    await initPage(message, generateDisplay, totalPages, `${config.prefix}shop`);
  }
}

module.exports = new ShopCommand();