const BaseCommand = require("../../../core/BaseCommand");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const {
  requireRpgCharacter,
  calculateRpgPower,
} = require("../../../utils/rpgUtil");
const {
  findPetSpecies,
  generatePetStats,
  computePetStatEffects,
  PET_STAT_ICONS,
} = require("../../../data/pets");
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
  async execute(message, args = []) {
    const { user } = await requireRpgCharacter(message.author.id);
    const query = args.join(" ").trim();
    if (!query) {
      return message.channel.send(
        `${config.emoji.warning} Vui lòng nhập tên Linh Thú muốn trang bị. Ví dụ: \`${config.prefix}addpet shark\` hoặc \`${config.prefix}addpet daibang\`.`
      );
    }
    user.rpg.pets = user.rpg.pets || [];
    const removeTones = (str) =>
      str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D") : "";
    const cleanQuery = removeTones(query).toLowerCase();
    const sp = findPetSpecies(query);

    // If the user has caught this animal in their zoo, ensure it's unlocked in user.rpg.pets
    if (sp && user.zoo && user.zoo[sp.key]) {
      const zEntry = user.zoo[sp.key];
      const hasEverCaught = typeof zEntry === "object" && zEntry !== null
        ? ((zEntry.totalCount || 0) > 0 || (zEntry.count || 0) > 0)
        : Number(zEntry) > 0;
      if (hasEverCaught && !user.rpg.pets.some((p) => p && p.key === sp.key)) {
        user.rpg.pets.push({
          id: `pet-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          key: sp.key,
          name: sp.name,
          nickname: sp.name,
          tier: sp.tier,
          emoji: sp.emoji,
          level: 1,
          exp: 0,
          stats: generatePetStats(sp),
          createdAt: new Date(),
        });
      }
    }

    const pets = user.rpg.pets;
    if (pets.length === 0) {
      return message.channel.send(
        `${config.emoji.no} Bạn chưa thu phục Linh Thú nào. Hãy dùng \`${config.prefix}hunt\` để săn thú nhé!`
      );
    }

    const targetPet = pets.find((p) => {
      if (sp && sp.key === p.key) return true;
      if (p.key && p.key.toLowerCase() === query.toLowerCase()) return true;
      if (p.name && removeTones(p.name).toLowerCase().includes(cleanQuery)) return true;
      if (p.nickname && removeTones(p.nickname).toLowerCase().includes(cleanQuery)) return true;
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
    user.rpg.equippedPet = targetPet;
    user.rpg.power = calculateRpgPower(user);
    user.markModified("rpg");
    await user.save();
    const lvl = targetPet.level || 1;
    const fx = computePetStatEffects(targetPet, lvl);
    const icons = {
      hp: config.emoji?.petStats?.hp || PET_STAT_ICONS.hp,
      att: config.emoji?.petStats?.att || PET_STAT_ICONS.att,
      pr: config.emoji?.petStats?.pr || PET_STAT_ICONS.pr,
      wp: config.emoji?.petStats?.wp || PET_STAT_ICONS.wp,
      mag: config.emoji?.petStats?.mag || PET_STAT_ICONS.mag,
      mr: config.emoji?.petStats?.mr || PET_STAT_ICONS.mr,
    };
    return message.channel.send(
      `✨ **Thành Công!** Bạn đã trang bị Linh Thú ${targetPet.emoji} **${targetPet.name}** (Lv.**${lvl}** • *${fx.role}*)!\n` +
        `⚡ Lực chiến nhân vật: **${user.rpg.power.toLocaleString()}** Power\n` +
        `${icons.hp} **+${(fx.hpPct * 100).toFixed(1)}% HP** (+${(fx.regenHpPct * 100).toFixed(2)}% Hồi HP/lượt) | ${icons.wp} **+${fx.ragePerTurn} Nộ/MP mỗi lượt**\n` +
        `${icons.att} **+${(fx.patkPct * 100).toFixed(1)}% ST Vật lý** | ${icons.mag} **+${(fx.matkPct * 100).toFixed(1)}% ST Phép** (+${(fx.skillDmgPct * 100).toFixed(1)}% ST Kỹ năng)\n` +
        `${icons.pr} **+${fx.bonusPr} PR** (-${(fx.physDmgReducePct * 100).toFixed(1)}% ST Vật lý) | ${icons.mr} **+${fx.bonusMr} MR** (+${(fx.statusResistPct * 100).toFixed(1)}% Kháng hiệu ứng & -${(fx.dotReducePct * 100).toFixed(1)}% ST DoT)`
    );
  }
}
module.exports = new AddPetCommand();