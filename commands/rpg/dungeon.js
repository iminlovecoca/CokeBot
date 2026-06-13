const config = require("../../data/config");

module.exports = {
  name: "dungeon",
  aliases: ["dg", "dungeons"],
  description: "Tính năng khiêu chiến Dungeon RPG (Sắp ra mắt)",
  usage: `${config.prefix}dungeon`,

  async execute(message, args) {
    return message.reply("**Coming soon**");
  },
};
