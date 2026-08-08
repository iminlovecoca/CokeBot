const BaseCommand = require("../../../core/BaseCommand");
const config = require("../../../data/config");
const { handleDeclineChallenge } = require("./battle");

class DeclineBattleCommand extends BaseCommand {
  constructor() {
    super({
      name: "db",
      aliases: ["decline", "declinebattle", "xdb"],
      description: "Từ chối lời khiêu chiến PvP.",
      usage: `${config.prefix}db`,
      examples: [
        {
          intent: "Từ chối lời khiêu chiến PvP",
          command: `${config.prefix}db`,
        },
      ],
      cooldown: 0,
    });
  }

  async execute(message) {
    return handleDeclineChallenge(message);
  }
}

module.exports = new DeclineBattleCommand();
