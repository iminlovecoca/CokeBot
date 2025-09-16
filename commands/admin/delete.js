const User = require('../../models/User');
const OWNER_ID = '745950731638407210';

async function resetUserData(user) {
  const keepLevel = user.level;
  const keepXp = user.xp;       

  user.coke = 0;
  user.cokeGC = 0;

  user.dailyStreak = 0;
  user.lastDaily = null;
  user.dailyXp = 0;
  user.lastXpReset = null;

  user.vipLevel = 0;
  user.vipUntil = null;

  user.bannedUntil = null;
  user.bannedReason = '';

  user.cookieDailyCount = 0;
  user.cookieDailyDate = '';
  user.cookie = 0;
  user.tea = 0;
  user.luck = 0;

  user.bank = 0;
  user.bankLastUpdate = null;
  user.transferHistory = [];
  user.receiveHistory = [];

  user.dailyGive = {};
  user.dailyReceive = {};
  user.lastWork = 0;

  user.zoo = {};
  user.zooPoints = 0;
  user.huntStones = { boost: {}, multi: {}, fixed: {} };

  user.inventory = {};
  user.last_cokemon_id = 0;
  user.cokedex = {};

  user.warned = false;
  user.warnedAt = null;

  user.level = keepLevel;
  user.xp = keepXp;

  await user.save();
}

module.exports = {
  name: 'delete',
  description: 'Reset dữ liệu người chơi (chỉ dành cho Owner)',

  async execute(message, args) {
    if (message.author.id !== OWNER_ID)
      return message.reply('❌ | Lệnh này chỉ dành cho **Owner**.');

    const target = message.mentions.users.first();
    const isDeleteAll = args[0] === 'all';

    if (isDeleteAll) {
      const confirm = await message.reply('⚠️ Bạn có chắc muốn reset toàn bộ dữ liệu người chơi? Gõ `yes` để xác nhận.');

      const filter = m => m.author.id === message.author.id;
      const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000 });

      if (!collected.size || collected.first().content.toLowerCase() !== 'yes') {
        return message.channel.send('❌ Huỷ thao tác reset toàn bộ.');
      }

      const users = await User.find({});
      for (const user of users) {
        await resetUserData(user);
      }
      return message.channel.send('✅ Đã reset toàn bộ dữ liệu người chơi.');
    }

    if (!target) return message.reply('❌ | Cú pháp đúng: `!delete @user` hoặc `!delete all`');

    const confirmMsg = await message.reply(`⚠️ Bạn có chắc muốn reset dữ liệu của **${target.username}** (giữ lại level)? Gõ \`yes\` để xác nhận.`);

    const filter = m => m.author.id === message.author.id;
    const collector = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });

    collector.on('collect', async m => {
      if (m.content.toLowerCase() === 'yes') {
        const user = await User.findOne({ userId: target.id });
        if (user) {
          await resetUserData(user);
          message.channel.send(`✅ Đã reset dữ liệu của **${target.username}** (giữ lại level).`);
        } else {
          message.channel.send(`⚠️ Không tìm thấy dữ liệu của **${target.username}**.`);
        }
      } else {
        message.channel.send('❌ Đã huỷ thao tác reset.');
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        message.channel.send('⌛ Hết thời gian, thao tác reset đã bị huỷ.');
      }
    });
  }
};
