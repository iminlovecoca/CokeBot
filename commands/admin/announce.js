const https = require("https");
const { isDev } = require("../../utils/userUtil");
const { splitMessage } = require("../../utils/miscUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");
const DISCORD_CHAR_LIMIT = 2000;

module.exports = {
  name: "announce",
  aliases: ["notice"],
  description: "Gửi một thông báo đến một kênh cụ thể.",
  usage: `${config.prefix}announce <#channel|channelId> [nội dung] (đính kèm file .md hoặc .txt để gửi nội dung từ file)`,
  examples: `${config.prefix}announce #general Hello World!`,
  async execute(message, args) {
    if (!isDev(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không có quyền dùng lệnh này!`,
      );
    }

    if (args.length < 1) {
      throw new UserFriendlyError(
        `${config.emoji.no} Cú pháp không hợp lệ. Dùng: \`${this.usage}\``,
      );
    }

    const channelArg = args[0];
    let announcementContent = args.slice(1).join(" ");
    const targetChannel =
      message.mentions.channels.first() ||
      (await message.client.channels
        .fetch(channelArg.replace(/[<#>]/g, ""))
        .catch(() => null));
    if (!targetChannel || !targetChannel.isTextBased()) {
      throw new UserFriendlyError(`${config.emoji.no} Không tìm thấy kênh.`);
    }

    const attachment = message.attachments.first();
    if (attachment) {
      if (
        !attachment.name.endsWith(".txt") &&
        !attachment.name.endsWith(".md")
      ) {
        throw new UserFriendlyError(
          `${config.emoji.no} File đính kèm phải là file \`.txt\` hoặc \`.md\`.`,
        );
      }

      announcementContent = await new Promise((resolve, reject) => {
        https.get(attachment.url, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve(data));
          res.on("error", (err) => reject(err));
        });
      });
    } else if (!announcementContent) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn phải cung cấp nội dung thông báo hoặc đính kèm một file text.`,
      );
    }

    const messageChunks = splitMessage(
      `${announcementContent}`,
      DISCORD_CHAR_LIMIT,
    );
    for (const chunk of messageChunks) {
      if (chunk.length > 0) {
        await targetChannel.send(chunk);
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    await message.channel.send(
      `${config.emoji.yes} Thông báo đã được gửi thành công đến <#${targetChannel.id}>!`,
    );
  },
};
