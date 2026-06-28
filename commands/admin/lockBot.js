const { isDev } = require('../../utils/userUtil')
const { UserFriendlyError } = require('../../utils/errors')
const config = require('../../data/config');
const BotLock = require('../../models/BotLock');

const BaseCommand = require('../../core/BaseCommand');

class LockBotCommand extends BaseCommand {
  constructor() {
    super({
  name: 'lock',
  description: 'Khóa bot toàn bộ hoặc khóa một tính năng/lệnh cụ thể',
        cooldown: 0
    });
  }

  async execute(message, args = []) {
    if (!isDev(message.author.id)) {
      throw new UserFriendlyError(`${config.emoji.no} Bạn không có quyền dùng lệnh này!`)
    }

    let doc = await BotLock.findById('singleton');
    if (!doc) {
      doc = await BotLock.create({ _id: 'singleton', locked: false, lockedFeatures: [] });
    }

    const feature = args.join(' ').trim().toLowerCase();

    if (!feature) {
      
      doc.locked = !doc.locked;
      await doc.save();
      message.client.botLocked = doc.locked;
      message.client.allowedIds = config.permissions.dev_ids;

      if (message.client.botLocked) {
        await message.reply('🔒 Bot đã bị **khóa**. Chỉ Admin có thể sử dụng lệnh.');
      } else {
        await message.reply('🔓 Bot đã được **mở khóa**, mọi người có thể sử dụng lệnh.');
      }
    } else {
      
      if (doc.lockedFeatures.includes(feature)) {
        return message.reply(`⚠️ Tính năng/lệnh **${feature}** đã được khóa từ trước.`);
      }
      doc.lockedFeatures.push(feature);
      await doc.save();
      message.client.lockedFeatures = doc.lockedFeatures;

      await message.reply(`🔒 Tính năng/lệnh **${feature}** đã bị **khóa**. Người dùng thông thường không thể sử dụng.`);
    }
    }
}

module.exports = new LockBotCommand();
