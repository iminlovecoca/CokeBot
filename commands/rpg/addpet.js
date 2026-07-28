const BaseCommand = require("../../core/BaseCommand");
const config = require("../../data/config");
const { getUser } = require("../../utils/userUtil");
const {
  requireRpgCharacter,
  calculateRpgPower,
} = require("../../utils/rpgUtil");
const { findPetSpecies } = require("../../data/pets");

class AddPetCommand extends BaseCommand {
  constructor() {
    super({
      name: "addpet",
      aliases: ["equipet", "usepet"],
      category: "rpg",
      description: "Trang bị Linh Thú để hỗ trợ lực chiến và chỉ số nhân vật RPG.",
      usage: "xaddpet <tên_pet>",
    });
  }

  async execute({ message, args }) {
    const { user } = await requireRpgCharacter(message.author.id);
    const query = args.join(" ").trim();

    if (!query) {
      return message.channel.send(
        `${config.emoji.warning} Vui lòng nhập tên Linh Thú muốn trang bị. Ví dụ: \`${config.prefix}xaddpet shark\` hoặc \`${config.prefix}xaddpet daibang\`.`
      );
    }

    const pets = user.rpg.pets || [];
    if (pets.length === 0) {
      return message.channel.send(
        `${config.emoji.no} Bạn chưa có Linh Thú nào. Dùng \`${config.prefix}xpet\` để nhận linh thú tân thủ!`
      );
    }

    // Find pet in user's inventory
    const targetPet = pets.find((p) => {
      if (p.name.toLowerCase() === query.toLowerCase()) return true;
      if (p.key.toLowerCase() === query.toLowerCase()) return true;
      if (p.nickname && p.nickname.toLowerCase() === query.toLowerCase())
        return true;
      const sp = findPetSpecies(query);
      if (sp && sp.key === p.key) return true;
      return false;
    });

    if (!targetPet) {
      const sp = findPetSpecies(query);
      if (sp) {
        return message.channel.send(
          `${config.emoji.no} Bạn chưa sở hữu Linh Thú ${sp.emoji} **${sp.name}** (${sp.tier}).`
        );
      }
      return message.channel.send(
        `${config.emoji.no} Không tìm thấy Linh Thú nào khớp với từ khóa **"${query}"**.`
      );
    }

    // Equip the pet
    user.rpg.equippedPet = targetPet;
    user.rpg.power = calculateRpgPower(user);
    user.markModified("rpg");
    await user.save();

    const lvl = targetPet.level || 1;
    const hpPct = (lvl * 0.5).toFixed(1);
    const atkPct = (lvl * 0.4).toFixed(1);
    const defPct = (lvl * 0.35).toFixed(2);

    return message.channel.send(
      `✨ **Thành Công!** Bạn đã trang bị Linh Thú ${targetPet.emoji} **${targetPet.name}** (Lvl **${lvl}**)!\n` +
        `⚡ Lực chiến nhân vật: **${user.rpg.power.toLocaleString()}** Power\n` +
        `❤️ **+${hpPct}% HP** | ⚔️ **+${atkPct}% ATK** | 🛡️ **+${defPct}% DEF**`
    );
  }
}

module.exports = AddPetCommand;
