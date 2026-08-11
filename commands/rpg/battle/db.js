const BaseCommand = require("../../../core/BaseCommand");
const config = require("../../../data/config");
const confirmationManager = require("../../../utils/confirmationManager");

class DeclineCommand extends BaseCommand {
  constructor() {
    super({
      name: "db",
      aliases: ["decline", "declinebattle", "xdb"],
      description: "Từ chối hoặc hủy lời khiêu chiến PvP, chuyển tiền hoặc đề nghị đang chờ.",
      usage: `${config.prefix}db`,
      examples: [
        {
          intent: "Từ chối hoặc hủy đề nghị đang chờ",
          command: `${config.prefix}db`,
        },
      ],
      cooldown: 0,
    });
  }

  async execute(message) {
    return confirmationManager.declineRequest(message.author.id, message);
  }
}

module.exports = new DeclineCommand();
