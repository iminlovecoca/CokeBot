const User = require("../../models/User");
const { createRandomCokemon } = require("../../utils/cokemonUtil");
const {
  getUser,
  isDev,
  addCokemon,
  addCokemons,
} = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

const BaseCommand = require('../../core/BaseCommand');

class AddCokemonCommand extends BaseCommand {
  constructor() {
    super({
  name: "addcokemon",
  description: "Tặng một cokemon cụ thể cho người dùng.",
  usage: `${config.prefix}addcokemon <@user> <tên_cokemon|random> [level|số_lượng] [--shiny]`,
  examples: `${config.prefix}addcokemon @user Snorlax 25 --shiny\n${config.prefix}addcokemon @user random 100`,
  hidden: true,
        cooldown: 0
    });
  }

  async execute(message, args) {
    if (!isDev(message.author.id)) {
      return message.reply(
        `${config.emoji.no} Bạn không đủ quyền hạn để sử dụng lệnh.`,
      );
    }

    const targetUser = message.mentions.users.first();
    const commandType = args[1]?.toLowerCase();
    if (!targetUser || !commandType) {
      throw new UserFriendlyError(
        `${config.emoji.no} Cú pháp không đúng. Dùng: \`${config.prefix}addcokemon <@user> <tên_cokemon|random> ...\``,
      );
    }

    if (commandType === "random") {
      const quantity = parseInt(args[2]);
      if (isNaN(quantity) || quantity <= 0 || quantity > 100) {
        throw new UserFriendlyError(
          `${config.emoji.no} Vui lòng nhập số lượng hợp lệ (1-100).`,
        );
      }

      await message.channel.send(`Đang tạo ${quantity} Cokemon ngẫu nhiên...`);
      const cokemonDataArray = [];
      for (let i = 0; i < quantity; i++) {
        const cokemon = await createRandomCokemon();
        cokemonDataArray.push({
          owner_id: targetUser.id,
          original_owner_id: message.author.id,
          catch_method: "gifted",
          ...cokemon,
        });
      }

      await addCokemons(cokemonDataArray);
      return message.reply(
        `${config.emoji.yes} Đã tặng thành công **${cokemonDataArray.length}** Cokemon ngẫu nhiên cho **${targetUser.username}**.`,
      );
    } else {
      const cokemonName = commandType;
      const levelArg = parseInt(args[2]);
      const isShiny = args.includes("--shiny");
      const level = isNaN(levelArg) ? 5 : levelArg;
      if (level < 1 || level > config.cokemon_settings.max_level) {
        throw new UserFriendlyError(
          `${config.emoji.no} Level phải từ 1 đến ${config.cokemon_settings.max_level}.`,
        );
      }

      const cokemon = await createRandomCokemon(cokemonName, level, isShiny);
      const cokemonData = {
        owner_id: targetUser.id,
        original_owner_id: message.author.id,
        catch_method: "gifted",
        ...cokemon,
      };

      await addCokemon(cokemonData);
      const shinyText = isShiny ? " ✨" : "";
      await message.reply(
        `${config.emoji.yes} Đã tặng thành công một **${cokemon.name}**${shinyText} (Cấp ${level}) cho **${targetUser.username}**.`,
      );
    }
    }
}

module.exports = new AddCokemonCommand();
