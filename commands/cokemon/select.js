const {
  getActiveCokemon,
  selectActiveCokemon,
} = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

const BaseCommand = require('../../core/BaseCommand');

class SelectCommand extends BaseCommand {
  constructor() {
    super({
  name: "select",
  aliases: ["active"],
  description:
    "Chọn một cokemon làm bạn đồng hành để nhận XP và tăng tình bạn.",
  usage: `${config.prefix}select <id>`,
  examples: [
    { intent: "Xem bạn đồng hành hiện tại", command: `${config.prefix}select` },
    {
      intent: "Chọn Cokemon có ID 27 làm bạn đồng hành",
      command: `${config.prefix}select 27`,
    },
  ],
        cooldown: 0
    });
  }

  async execute(message, args) {
    if (args.length === 0) {
      const activeCokemon = await getActiveCokemon(message.author.id);
      const species = activeCokemon.species_id;
      const displayEmoji = activeCokemon.is_shiny
        ? species.shiny_emoji || `${species.emoji}✨`
        : species.emoji;
      await message.reply(
        `Bạn đồng hành hiện tại của bạn là **${activeCokemon.nickname || species.name}** ${displayEmoji} (ID: ${activeCokemon.uid}).`,
      );
    } else {
      const cokemonUid = parseInt(args[0]);
      if (isNaN(cokemonUid)) {
        throw new UserFriendlyError(
          `${config.emoji.no} Bạn cần cung cấp ID của cokemon bạn muốn chọn. Ví dụ: \`${config.prefix}select 12\``,
        );
      }

      const { cokemonName, emoji } = await selectActiveCokemon(
        message.author.id,
        cokemonUid,
      );
      await message.reply(
        `${config.emoji.yes} Bạn đã chọn **${cokemonName}** ${emoji} (ID: ${cokemonUid}) làm bạn đồng hành mới!`,
      );
    }
    }
}

module.exports = new SelectCommand();
