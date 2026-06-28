const { EmbedBuilder } = require("discord.js");
const { getUser, isDev } = require("../../utils/userUtil");
const { formatDateTimeToVietnamese } = require("../../utils/miscUtil");
const { DateTime } = require("luxon");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

const BaseCommand = require('../../core/BaseCommand');

class CheckbanCommand extends BaseCommand {
  constructor() {
    super({
  name: "checkban",
  description: "Kiểm tra tình trạng cấm của người dùng.",
  usage: `${config.prefix}checkban <@user|userId>`,
        cooldown: 0
    });
  }

  async execute(message, args) {
    if (!isDev(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không có quyền dùng lệnh này!`,
      );
    }

    const target =
      message.mentions.users.first() ||
      (await message.client.users.fetch(args[0]).catch(() => null));
    if (!target) {
      throw new UserFriendlyError(
        `${config.emoji.no} Không tìm thấy người dùng.`,
      );
    }

    const user = await getUser(target.id);
    const embed = new EmbedBuilder()
      .setTitle(`Tình trạng của ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor("#FFFFFF");

    if (!user || !user.bannedUntil || user.bannedUntil < new Date()) {
      embed
        .setDescription(`${config.emoji.yes} Người dùng này không bị cấm.`)
        .setColor("#2ECC71");
    } else {
      const banExpirationDate = formatDateTimeToVietnamese(
        DateTime.fromJSDate(new Date(user.bannedUntil)),
      );
      const reason =
        user.anticheat?.last_flag_reason ||
        "Không có lý do cụ thể (có thể do ban tay).";

      embed
        .setDescription(`🚫 Người dùng này đang bị cấm!`)
        .addFields(
          { name: "Hết hạn vào", value: banExpirationDate, inline: true },
          { name: "Lý do", value: `\`${reason}\``, inline: false },
        )
        .setColor("#E74C3C");
    }
    await message.reply({ embeds: [embed] });
    }
}

module.exports = new CheckbanCommand();
