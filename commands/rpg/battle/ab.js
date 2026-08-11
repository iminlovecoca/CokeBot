const BaseCommand = require("../../../core/BaseCommand");
const config = require("../../../data/config");
const confirmationManager = require("../../../utils/confirmationManager");

class AcceptCommand extends BaseCommand {
  constructor() {
    super({
      name: "ab",
      aliases: ["accept", "acceptbattle", "xab"],
      description: "Chấp nhận lời khiêu chiến PvP, chuyển tiền hoặc đề nghị đang chờ.",
      usage: `${config.prefix}ab`,
      examples: [
        {
          intent: "Chấp nhận đề nghị đang chờ",
          command: `${config.prefix}ab`,
        },
      ],
      cooldown: 0,
    });
  }

  async execute(message) {
    return confirmationManager.acceptRequest(message.author.id, message);
  }
}

module.exports = new AcceptCommand();
