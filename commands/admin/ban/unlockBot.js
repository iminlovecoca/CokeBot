const { isDev } = require("../../../utils/userUtil")
const { UserFriendlyError } = require("../../../utils/errors")
const config = require("../../../data/config");
const BotLock = require("../../../models/BotLock");
const BaseCommand = require("../../../core/BaseCommand");
class UnlockBotCommand extends BaseCommand {
  constructor() {
    super({
  name: 'unlock',
  description: 'Mở khóa bot toàn bộ hoặc mở khóa một tính năng/lệnh cụ thể',
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
      doc.locked = false;
      await doc.save();
      message.client.botLocked = false;
      await message.reply('🔓 Bot đã được **mở khóa**, mọi người có thể sử dụng lệnh.');
    } else {
      if (!doc.lockedFeatures.includes(feature)) {
        return message.reply(`⚠️ Tính năng/lệnh **${feature}** chưa từng bị khóa.`);
      }
      doc.lockedFeatures = doc.lockedFeatures.filter(f => f !== feature);
      await doc.save();
      message.client.lockedFeatures = doc.lockedFeatures;
      await message.reply(`🔓 Tính năng/lệnh **${feature}** đã được **mở khóa**. Mọi người có thể sử dụng bình thường.`);
    }
    }
}
module.exports = new UnlockBotCommand();