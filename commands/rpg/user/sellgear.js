const BaseCommand = require("../../../core/BaseCommand");
const config = require("../../../data/config");

class SellgearCommand extends BaseCommand {
  constructor() {
    super({
      name: "sellgear",
      aliases: ["sg", "rpgsell"],
      description: "Bán trang bị RPG để nhận Coke (Đã hợp nhất vào lệnh sell chuẩn OwO).",
      usage: `${config.prefix}sell <cw | rw | ew | dw | allweapons | w<id>>`,
      examples: [
        { intent: "Bán toàn bộ vũ khí Common", command: `${config.prefix}sell cw` },
        { intent: "Bán toàn bộ vũ khí Rare", command: `${config.prefix}sell rw` },
        { intent: "Bán toàn bộ vũ khí Divine", command: `${config.prefix}sell dw` },
        { intent: "Bán vũ khí theo ID", command: `${config.prefix}sell w5` },
      ],
      cooldown: 0
    });
  }

  async execute(message, args) {
    const sellCommand = require("../../shop/sell");
    return sellCommand.execute(message, args);
  }
}

module.exports = new SellgearCommand();
