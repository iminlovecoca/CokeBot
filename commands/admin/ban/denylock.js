const { isDev } = require("../../../utils/userUtil")
const { UserFriendlyError } = require("../../../utils/errors")
const config = require("../../../data/config");
const BotLock = require("../../../models/BotLock");
const BaseCommand = require("../../../core/BaseCommand");
class DenyLockCommand extends BaseCommand {
  constructor() {
    super({
      name: 'denylock',
      aliases: ['deny', 'de'],
      description: 'Hủy quyền sử dụng bot khi bot đang bị khóa của một người dùng',
      usage: `${config.prefix}denylock <userId/tag>`,
      category: 'admin',
      cooldown: 0
    });
  }
  async execute(message, args = []) {
    if (!isDev(message.author.id)) {
      throw new UserFriendlyError(`${config.emoji.no} Bạn không có quyền dùng lệnh này!`);
    }
    const target = args[0];
    if (!target) {
      return message.reply(`⚠️ Vui lòng nhập ID hoặc Tag người dùng!\nCú pháp: \`${config.prefix}denylock <userId/tag>\``);
    }
    const userId = target.replace(/[<@!>]/g, "");
    let doc = await BotLock.findById('singleton');
    if (!doc) {
      doc = await BotLock.create({ _id: 'singleton', locked: false, lockedFeatures: [], allowedUsers: [] });
    }
    if (!doc.allowedUsers.includes(userId)) {
      return message.reply(`⚠️ Người dùng <@${userId}> hiện không có trong danh sách được cho phép.`);
    }
    doc.allowedUsers = doc.allowedUsers.filter(id => id !== userId);
    await doc.save();
    message.client.allowedIds = Array.from(new Set([
      ...(config.permissions.dev_ids || []),
      ...(doc.allowedUsers || [])
    ]));
    await message.reply(`✅ Đã hủy cấp phép cho người dùng <@${userId}> sử dụng bot khi đang bị khóa.`);
  }
}
module.exports = new DenyLockCommand();