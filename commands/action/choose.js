const BaseCommand = require('../../core/BaseCommand');
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

class ChooseCommand extends BaseCommand {
  constructor() {
    super({
      name: "choose",
      description: "Chọn ngẫu nhiên 1 lựa chọn từ danh sách (cách nhau bởi dấu phẩy)",
      usage: `${config.prefix}choose <lựa chọn 1>, <lựa chọn 2>, ...`,
      examples: [
        {
          intent: "Chọn giữa táo, cam và chuối",
          command: `${config.prefix}choose táo, cam, chuối`,
        },
      ],
      cooldown: 3
    });
  }

  execute(message, args) {
    const msgs = [
      "Tôi chọn ?!",
      "Tôi thích ?!",
      "Tôi yêu ?!",
      "? là lựa chọn tốt nhất",
      "Chắc chắn là ?!",
      "? 100%",
    ];

    if (!args.length) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn phải nhập ít nhất 2 lựa chọn, ví dụ: \`${config.prefix}choose táo, cam, chuối\``,
      );
    }

    const choices = args
      .join(" ")
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (choices.length < 2) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn cần ít nhất 2 lựa chọn để tôi chọn!`,
      );
    }

    const choice = choices[Math.floor(Math.random() * choices.length)];
    let msgTemplate = msgs[Math.floor(Math.random() * msgs.length)];
    msgTemplate = msgTemplate.replace("?", choice);
    message.channel.send(
      `🎲 **|** **${message.author.username}**, ${msgTemplate}`,
    );
  }
}

module.exports = new ChooseCommand();
