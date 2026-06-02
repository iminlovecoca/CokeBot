const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

module.exports = {
  name: "prefix",
  aliases: ["pf"],
  description: "Xem hoặc thay đổi prefix của bot trong server hiện tại.",
  usage: `${config.prefix}prefix [set <prefix>|reset]`,
  examples: [
    { intent: "Xem prefix hiện tại", command: `${config.prefix}prefix` },
    { intent: "Đổi prefix thành x", command: `${config.prefix}prefix set x` },
    {
      intent: "Đặt lại prefix mặc định",
      command: `${config.prefix}prefix reset`,
    },
  ],
  async execute(message, args) {
    const guildId = message.guild?.id;
    if (!guildId) {
      throw new UserFriendlyError(
        `${config.emoji.no} Lệnh này chỉ dùng trong server.`,
      );
    }

    const subCommand = (args[0] || "").toLowerCase();
    const nextPrefix = (args[1] || "").trim();
    const currentPrefix = await message.client.db.getPrefix(guildId);

    if (!subCommand) {
      return message.reply(
        `${config.emoji.yes} Prefix hiện tại của server này là **${currentPrefix}**.`,
      );
    }

    if (subCommand === "set") {
      if (!nextPrefix) {
        throw new UserFriendlyError(
          `${config.emoji.no} Cú pháp: \`${config.prefix}prefix set <prefix>\``,
        );
      }

      if (nextPrefix.length > 3) {
        throw new UserFriendlyError(
          `${config.emoji.no} Prefix quá dài. Hãy dùng tối đa 3 ký tự.`,
        );
      }

      await message.client.db.setPrefix(guildId, nextPrefix);
      return message.reply(
        `${config.emoji.yes} Đã đổi prefix của server thành **${nextPrefix}**.`,
      );
    }

    if (subCommand === "reset") {
      const defaultPrefix = process.env.PREFIX ?? "u";
      await message.client.db.setPrefix(guildId, defaultPrefix);
      return message.reply(
        `${config.emoji.yes} Đã đặt lại prefix về mặc định **${defaultPrefix}**.`,
      );
    }

    throw new UserFriendlyError(
      `${config.emoji.no} Cú pháp không hợp lệ. Dùng: \`${config.prefix}prefix [set <prefix>|reset]\``,
    );
  },
};
