const { getUser, isDev, isAdmin } = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

module.exports = {
  name: "resetgacha",
  aliases: ["gachareset", "rgacha"],
  description: "Reset trạng thái gacha vũ khí của người chơi về mặc định (chỉ Admin).",
  usage: `${config.prefix}resetgacha <@user|userId>`,

  async execute(message, args) {
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không có quyền dùng lệnh này!`
      );
    }

    const arg0 = args[0];
    if (!arg0) {
      throw new UserFriendlyError(
        `❌ Vui lòng nhập ID hoặc tag người dùng cần reset. Cú pháp: \`${this.usage}\``
      );
    }

    const target =
      message.mentions.users.first() ||
      (await message.client.users.fetch(arg0).catch(() => null));

    if (!target) {
      throw new UserFriendlyError(`❌ Không tìm thấy người dùng \`${arg0}\`.`);
    }

    const dbUser = await getUser(target.id);
    if (!dbUser || !dbUser.rpg || !dbUser.rpg.classKey) {
      throw new UserFriendlyError(`❌ Người dùng này chưa tạo nhân vật RPG.`);
    }

    // Reset gacha state
    dbUser.rpg.gachaWpPity = 0;
    dbUser.rpg.gachaWpGuaranteed = false;
    dbUser.markModified("rpg");
    await dbUser.save();

    return message.reply(
      `✅ Đã reset trạng thái gacha vũ khí của **${target.username}** về mặc định (Pity: **0**, Bảo hiểm: **50/50**).`
    );
  },
};
