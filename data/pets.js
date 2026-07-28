const PET_TIERS = {
  Common: {
    name: "Common",
    emoji: "<:common:1530878565489311826>",
    baseHp: 10,
    baseAtk: 2,
    baseDef: 2,
    points: 20,
  },
  Rare: {
    name: "Rare",
    emoji: "<:rare:1530878574104547378>",
    baseHp: 25,
    baseAtk: 5,
    baseDef: 4,
    points: 50,
  },
  Epic: {
    name: "Epic",
    emoji: "<:epic:1530878567955566642>",
    baseHp: 50,
    baseAtk: 10,
    baseDef: 8,
    points: 100,
  },
  Legendary: {
    name: "Legendary",
    emoji: "<:legendary:1530878570858287205>",
    baseHp: 100,
    baseAtk: 20,
    baseDef: 15,
    points: 200,
  },
  Mythic: {
    name: "Mythic",
    emoji: "<a:mythic:1530878614843686912>",
    baseHp: 180,
    baseAtk: 35,
    baseDef: 28,
    points: 400,
  },
  Ancient: {
    name: "Ancient",
    emoji: "<a:ancient:1530878606656540814>",
    baseHp: 300,
    baseAtk: 60,
    baseDef: 50,
    points: 700,
  },
  Divine: {
    name: "Divine",
    emoji: "<a:divine:1530878610515165365>",
    baseHp: 500,
    baseAtk: 100,
    baseDef: 80,
    points: 1200,
  },
};

const PET_SPECIES = [
  // --- Common ---
  {
    key: "bee",
    name: "Ong",
    tier: "Common",
    emoji: "🐝",
    aliases: ["bee", "ong"],
    description: "Chú ong chăm chỉ bay lượn tích lũy mật ngọt và sinh lực.",
  },
  {
    key: "bug",
    name: "Sâu",
    tier: "Common",
    emoji: "🐛",
    aliases: ["bug", "sau"],
    description: "Chú sâu nhỏ kiên trì với lớp vỏ mềm mại dẻo dai.",
  },
  {
    key: "snail",
    name: "Ốc Sên",
    tier: "Common",
    emoji: "🐌",
    aliases: ["snail", "ocsen"],
    description: "Ốc sên mang chiếc vỏ kiên cố chống chọi mọi ngoại lực.",
  },
  {
    key: "ladybug",
    name: "Bọ Rùa",
    tier: "Common",
    emoji: "🐞",
    aliases: ["ladybug", "borua"],
    description: "Bọ rùa may mắn mang lại sinh khí nhẹ nhàng.",
  },
  {
    key: "butterfly",
    name: "Bướm",
    tier: "Common",
    emoji: "🦋",
    aliases: ["butterfly", "buom"],
    description: "Đôi cánh bướm rực rỡ lướt nhẹ trong gió.",
  },

  // --- Rare ---
  {
    key: "duck",
    name: "Vịt",
    tier: "Rare",
    emoji: "🦆",
    aliases: ["duck", "vit"],
    description: "Chú vịt nhanh nhẹn bơi lội linh hoạt trên mặt nước.",
  },
  {
    key: "rooster",
    name: "Gà Trống",
    tier: "Rare",
    emoji: "🐓",
    aliases: ["rooster", "gatrong", "ga"],
    description: "Gà trống oai phong cất tiếng gáy đánh thức sức mạnh dũng mãnh.",
  },
  {
    key: "pig",
    name: "Heo",
    tier: "Rare",
    emoji: "🐖",
    aliases: ["pig", "heo", "lợn"],
    description: "Chú heo tròn trĩnh sở hữu thể lực dồi dào dẻo dai.",
  },
  {
    key: "cow",
    name: "Bò",
    tier: "Rare",
    emoji: "🐄",
    aliases: ["cow", "bo"],
    description: "Chú bò kiên cường mang lại nguồn sinh lực cuồn cuộn.",
  },
  {
    key: "sheep",
    name: "Cừu",
    tier: "Rare",
    emoji: "🐑",
    aliases: ["sheep", "cuu"],
    description: "Cừu bông ấm áp xua tan những ma pháp tà khí.",
  },

  // --- Epic ---
  {
    key: "monkey",
    name: "Khỉ",
    tier: "Epic",
    emoji: "🐒",
    aliases: ["monkey", "khi"],
    description: "Chú khỉ thông minh, nhanh trí và vô cùng lanh lợi.",
  },
  {
    key: "parrot",
    name: "Vẹt",
    tier: "Epic",
    emoji: "🦜",
    aliases: ["parrot", "vet"],
    description: "Vẹt sặc sỡ nhạy bén với ma pháp nguyên tố.",
  },
  {
    key: "horse",
    name: "Ngựa",
    tier: "Epic",
    emoji: "🐎",
    aliases: ["horse", "ngua"],
    description: "Chiến mã dũng mãnh phi nước đại trên mọi chiến trường.",
  },
  {
    key: "scorpion",
    name: "Bọ Cạp",
    tier: "Epic",
    emoji: "🦂",
    aliases: ["scorpion", "bocap"],
    description: "Bọ cạp nguy hiểm sở hữu đòn độc chí mạng và giáp cứng.",
  },
  {
    key: "dolphin",
    name: "Cá Heo",
    tier: "Epic",
    emoji: "🐬",
    aliases: ["dolphin", "caheo"],
    description: "Cá heo biển sâu tràn đầy trí tuệ và dòng chảy pháp thuật.",
  },

  // --- Legendary ---
  {
    key: "mammoth",
    name: "Voi Ma Mút",
    tier: "Legendary",
    emoji: "<a:mammoth:1531537276675559434>",
    aliases: ["mammoth", "voimamut"],
    description: "Voi ma mút thời băng hà sở hữu lớp giáp và sức mạnh khổng lồ.",
  },
  {
    key: "eagle",
    name: "Đại Bàng",
    tier: "Legendary",
    emoji: "<a:eagle:1531537266042736731>",
    aliases: ["eagle", "daibang"],
    description: "Chúa tể bầu trời sải cánh uy dũng với tầm nhìn và tốc độ vượt trội.",
  },
  {
    key: "sabertiger",
    name: "Hổ Răng Kiếm",
    tier: "Legendary",
    emoji: "<a:sabertiger:1531537287836340255>",
    aliases: ["sabertiger", "horangkiem", "saber"],
    description: "Mãnh thú tiễn hung tợn với đôi nanh kiếm xé rách mọi kẻ thù.",
  },
  {
    key: "shark",
    name: "Cá Mập",
    tier: "Legendary",
    emoji: "<a:shark:1531537293465354281>",
    aliases: ["shark", "camap"],
    description: "Sát thủ đại dương cuồng bạo tấn công áp đảo đối thủ.",
  },
  {
    key: "snake",
    name: "Rắn",
    tier: "Legendary",
    emoji: "<a:snake:1531537301522350191>",
    aliases: ["snake", "ran"],
    description: "Xà vương hiểm hóc siết chặt ma lực và né tránh chí mạng.",
  },

  // --- Mythic ---
  {
    key: "redsnake",
    name: "Xích Huyết Xà",
    tier: "Mythic",
    emoji: "<:redsnake:1531358996177621124>",
    aliases: ["redsnake", "xichhuyetxa"],
    description: "Con rắn huyền bí mang dòng máu đỏ rực như ngọn lửa bùng cháy.",
  },
  {
    key: "rockcat",
    name: "Thạch Nham Miêu",
    tier: "Mythic",
    emoji: "<:rockcat:1531002667680137417>",
    aliases: ["rockcat", "thachnhammieu"],
    description: "Linh miêu bọc đá kiên cố sở hữu thân thủ và khả năng phòng thủ tuyệt hảo.",
  },
  {
    key: "moonwolf",
    name: "Nguyệt Lang",
    tier: "Mythic",
    emoji: "<:moonwolf:1531002665536983091>",
    aliases: ["moonwolf", "nguyetlang"],
    description: "Sói tuyết dưới ánh mặt trăng mang ma lực bí ẩn của bầu trời đêm.",
  },
  {
    key: "crocnekton",
    name: "Thủy Ngạc Nekton",
    tier: "Mythic",
    emoji: "<:crocnekton:1531002661883740201>",
    aliases: ["crocnekton", "thuyngac"],
    description: "Cá sấu vực thẳm bộc phát uy lực cuồng bạo xé rách lá chắn ma pháp.",
  },
  {
    key: "icebear",
    name: "Băng Hùng",
    tier: "Mythic",
    emoji: "<:icebear:1531002670121222354>",
    aliases: ["icebear", "banghung"],
    description: "Gấu bắc cực khổng lồ sở hữu lượng máu và lớp băng bảo hộ vững chắc.",
  },

  // --- Ancient ---
  {
    key: "argentinosaurus",
    name: "Argentinosaurus",
    tier: "Ancient",
    emoji: "<:Argentinosaurus:1531012502815772743>",
    aliases: ["argentinosaurus", "argentino"],
    description: "Khủng long cổ đại siêu khổng lồ với lượng sinh lực cực đại.",
  },
  {
    key: "titanoceratops",
    name: "Titanoceratops",
    tier: "Ancient",
    emoji: "<:Titanoceratops:1531002661883740201>",
    aliases: ["titanoceratops", "titano"],
    description: "Khủng long ba sừng khổng lồ húc đổ mọi rào chắn bảo vệ.",
  },
  {
    key: "tyrannosaurus",
    name: "Tyrannosaurus",
    tier: "Ancient",
    emoji: "<:Tyrannosaurus:1531012505105596478>",
    aliases: ["tyrannosaurus", "trex"],
    description: "Bạo chúa cổ đại cai trị muôn loài với sức mạnh áp đảo.",
  },
  {
    key: "mosasaurus",
    name: "Mosasaurus",
    tier: "Ancient",
    emoji: "<:Mosasaurus:1531012511317622814>",
    aliases: ["mosasaurus", "mosa"],
    description: "Thủy quái biển cổ đại nuốt chửng ma pháp đối phương.",
  },
  {
    key: "quetzalcoatlus",
    name: "Quetzalcoatlus",
    tier: "Ancient",
    emoji: "<:Quetzalcoatlus:1531012513548996788>",
    aliases: ["quetzalcoatlus", "quetzal"],
    description: "Thằn lằn có cánh cổ đại bao phủ bầu trời với tốc độ thần tốc.",
  },

  // --- Divine ---
  {
    key: "kirin",
    name: "Kỳ Lân",
    tier: "Divine",
    emoji: "<:Kirin:1531346257019404378>",
    aliases: ["kirin", "kylan"],
    description: "Thần thú Kỳ Lân mang lại điềm lành, trường thọ và thánh lực.",
  },
  {
    key: "leviathan",
    name: "Leviathan",
    tier: "Divine",
    emoji: "<:Leviathan:1531346259497975889>",
    aliases: ["leviathan", "thuyquai"],
    description: "Thủy quái huyền thoại thống trị đại dương vô tận.",
  },
  {
    key: "griffin",
    name: "Điểu Sư Griffin",
    tier: "Divine",
    emoji: "<:Griffin:1531346254217351229>",
    aliases: ["griffin", "dieusu"],
    description: "Sinh vật huyền thoại kết hợp sức mạnh đại bàng và sư tử thần thánh.",
  },
  {
    key: "phoenix",
    name: "Phượng Hoàng",
    tier: "Divine",
    emoji: "<:Phoenix:1531346250903851188>",
    aliases: ["phoenix", "phuonghoang"],
    description: "Phượng hoàng tái sinh từ tro tàn với ngọn lửa thần ma pháp.",
  },
  {
    key: "shenlong",
    name: "Thần Long",
    tier: "Divine",
    emoji: "<:Shenlong:1531346248525807698>",
    aliases: ["shenlong", "thanlong"],
    description: "Rồng thần tối cao nắm giữ thiên đạo và vạn vật vương quyền.",
  },
];

/**
 * Generate pet stats with balanced HP, ATK, and DEF
 */
function generatePetStats(species) {
  const tierConfig = PET_TIERS[species.tier] || PET_TIERS.Common;
  const variance = 0.95 + Math.random() * 0.1;
  return {
    baseHp: Math.floor(tierConfig.baseHp * variance),
    baseAtk: Math.floor(tierConfig.baseAtk * variance),
    baseDef: Math.floor(tierConfig.baseDef * variance),
  };
}

/**
 * Get EXP needed for a pet to reach next level
 */
function getPetXpNeeded(level) {
  return Math.floor(50 * Math.pow(level, 1.8));
}

/**
 * Find pet species by key, name, or alias
 */
function findPetSpecies(query) {
  if (!query) return null;
  const clean = query.toLowerCase().replace(/[^a-z0-9]/g, "");
  return PET_SPECIES.find((p) => {
    if (p.key.toLowerCase() === clean) return true;
    if (p.name.toLowerCase().replace(/[^a-z0-9]/g, "") === clean) return true;
    return p.aliases.some(
      (a) => a.toLowerCase().replace(/[^a-z0-9]/g, "") === clean
    );
  });
}

module.exports = {
  PET_TIERS,
  PET_SPECIES,
  generatePetStats,
  getPetXpNeeded,
  findPetSpecies,
};
