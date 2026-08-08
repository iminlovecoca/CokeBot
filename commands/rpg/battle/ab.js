const BaseCommand = require("../../../core/BaseCommand");
const config = require("../../../data/config");
const { handleAcceptChallenge } = require("./battle");

class AcceptBattleCommand extends BaseCommand {
  constructor() {
    super({
      name: "ab",
      aliases: ["accept", "acceptbattle", "xab"],
      description: "Chấp nhận lời khiêu chiến PvP.",
      usage: `${config.prefix}ab`,
      examples: [
        {
          intent: "Chấp nhận lời khiêu chiến PvP",
          command: `${config.prefix}ab`,
        },
      ],
      cooldown: 0,
    });
  }

  async execute(message) {
    return handleAcceptChallenge(message);
  }
}

module.exports = new AcceptBattleCommand();
