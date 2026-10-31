const config = require("./config");

const PET_STAT_ICONS = {
  hp: config.emoji?.petStats?.hp || "<:hp:1563835102738391061>",
  att: config.emoji?.petStats?.att || "<:att:1563835100452360203>",
  pr: config.emoji?.petStats?.pr || "<:pr:1563835111286382694>",
  wp: config.emoji?.petStats?.wp || "<:wp:1563835114465787945>",
  mag: config.emoji?.petStats?.mag || "<:mag:1563835107033219102>",
  mr: config.emoji?.petStats?.mr || "<:mr:1563835109461729290>",
  hybrid: config.emoji?.petStats?.hybrid || "<:hybrid:1563835104856510535>",
};

const PET_TIERS = {
  Common: {
    name: "Common",
    emoji: "<:common:1530878565489311826>",
    catchRate: 0.8893865, // ~88.94% (OwO Common + Uncommon)
    baseHp: 10,
    baseAtk: 2,
    baseDef: 2,
    points: 1,
  },
  Rare: {
    name: "Rare",
    emoji: "<:rare:1530878574104547378>",
    catchRate: 0.10, // 10.0% (OwO Rare)
    baseHp: 25,
    baseAtk: 5,
    baseDef: 4,
    points: 5,
  },
  Epic: {
    name: "Epic",
    emoji: "<:epic:1530878567955566642>",
    catchRate: 0.01, // 1.0% (OwO Epic)
    baseHp: 50,
    baseAtk: 10,
    baseDef: 8,
    points: 25,
  },
  Generation: {
    name: "Generation",
    emoji: config.emoji?.ranks?.generation || "<a:Generation:1563835095541092352>",
    catchRate: 0.0005, // 0.05%
    baseHp: 75,
    baseAtk: 15,
    baseDef: 12,
    points: 50,
  },
  Legendary: {
    name: "Legendary",
    emoji: "<:legendary:1530878570858287205>",
    catchRate: 0.0005, // 0.05% (OwO Legendary)
    baseHp: 100,
    baseAtk: 20,
    baseDef: 15,
    points: 100,
  },
  Mythic: {
    name: "Mythic",
    emoji: "<a:mythic:1530878614843686912>",
    catchRate: 0.0001, // 0.01% (OwO Gem)
    baseHp: 180,
    baseAtk: 35,
    baseDef: 28,
    points: 500,
  },
  Ancient: {
    name: "Ancient",
    emoji: "<a:ancient:1530878606656540814>",
    catchRate: 0.00001, // 0.001% (OwO Fabled)
    baseHp: 300,
    baseAtk: 60,
    baseDef: 50,
    points: 2500,
  },
  Divine: {
    name: "Divine",
    emoji: "<a:divine:1530878610515165365>",
    catchRate: 0.0000025, // 0.00025% (OwO Distorted)
    baseHp: 500,
    baseAtk: 100,
    baseDef: 80,
    points: 10000,
  },
  Secret: {
    name: "Secret",
    emoji: config.emoji?.ranks?.secret || "<a:Secret:1563835098355339285>",
    catchRate: 0.000001, // 0.0001% (OwO Hidden)
    baseHp: 800,
    baseAtk: 160,
    baseDef: 130,
    points: 25000,
  },

};

/**
 * 6 Battle Stats per Pet (Standard species stats calibrated strictly to OwO Bot standards):
 * - hp  (Máu):        Max HP  = (2 * hp * level) + 500
 * - att (Vật lý):     PATK    = (att * level) + 100
 * - pr  (Kháng VL):   PR%     = 80 * (25 + 2 * pr * level) / (125 + 2 * pr * level)
 * - wp  (Năng lượng): Max WP  = (2 * wp * level) + 500
 * - mag (Phép):       MATK    = (mag * level) + 100
 * - mr  (Kháng Phép): MR%     = 80 * (25 + 2 * mr * level) / (125 + 2 * mr * level)
 *
 * Total stat points per tier (Standard OwO baseline):
 * - Common:    15 points (Bee, Bug, Ladybug, Butterfly, Snail)
 * - Rare:      17 points (Duck, Rooster, Pig, Cow, Sheep)
 * - Epic:      18 points (Monkey, Parrot, Horse, Scorpion, Dolphin)
 * - Legendary: 20 points (Mammoth, Eagle, Sabertiger, Shark, Snake)
 * - Mythic:    21 points (Redsnake, Rockcat, Moonwolf, Crocnekton, Icebear)
 * - Ancient:   22 points (Argentinosaurus, Titanoceratops, Tyrannosaurus, Mosasaurus, Quetzalcoatlus)
 * - Divine:    23 points (Kirin, Leviathan, Griffin, Phoenix, Shenlong)
 * - Bot:       21 points (cbot, rbot, ebot, lbot, mbot, abot, dbot - matches OwO Bot Tier)
 */
const PET_SPECIES = [
  // --- Common (Total: 15 points - OwO Common Standard) ---
  {
    key: "bee",
    name: "Ong",
    tier: "Common",
    emoji: "🐝",
    aliases: ["bee", "ong"],
    role: "Hỗ Trợ Kháng Phép",
    battleStats: { hp: 1, att: 5, pr: 2, wp: 3, mag: 3, mr: 1 },
    description: "Chú ong chăm chỉ bay lượn tích lũy mật ngọt và kháng phép tự nhiên.",
  },
  {
    key: "bug",
    name: "Sâu",
    tier: "Common",
    emoji: "🐛",
    aliases: ["bug", "sau"],
    role: "Cân Bằng Khởi Đầu",
    battleStats: { hp: 3, att: 2, pr: 2, wp: 4, mag: 2, mr: 2 },
    description: "Chú sâu nhỏ kiên trì với lớp vỏ mềm mại dẻo dai.",
  },
  {
    key: "snail",
    name: "Ốc Sên",
    tier: "Common",
    emoji: "🐌",
    aliases: ["snail", "ocsen"],
    role: "Tanker Khởi Đầu",
    battleStats: { hp: 6, att: 1, pr: 3, wp: 2, mag: 2, mr: 1 },
    description: "Ốc sên mang chiếc vỏ kiên cố chống chọi mọi ngoại lực.",
  },
  {
    key: "ladybug",
    name: "Bọ Rùa",
    tier: "Common",
    emoji: "🐞",
    aliases: ["ladybug", "borua"],
    role: "Hộ Vệ Giáp Kép",
    battleStats: { hp: 4, att: 2, pr: 2, wp: 3, mag: 2, mr: 2 },
    description: "Bọ rùa may mắn mang lại lớp giáp hộ thể cân bằng.",
  },
  {
    key: "butterfly",
    name: "Bướm",
    tier: "Common",
    emoji: "🦋",
    aliases: ["butterfly", "buom"],
    role: "Hồi Phục / Phép Sơ Cấp",
    battleStats: { hp: 1, att: 1, pr: 1, wp: 5, mag: 5, mr: 2 },
    description: "Đôi cánh bướm rực rỡ hội tụ linh khí và ma pháp trị liệu.",
  },

  // --- Rare (Total: 17 points - OwO Rare Standard) ---
  {
    key: "duck",
    name: "Vịt",
    tier: "Rare",
    emoji: "🦆",
    aliases: ["duck", "vit"],
    role: "Song Tu Vật Lý và Phép",
    battleStats: { hp: 2, att: 6, pr: 1, wp: 2, mag: 5, mr: 1 },
    description: "Chú vịt linh hoạt vừa tấn công vật lý vừa phóng thủy thuật.",
  },
  {
    key: "rooster",
    name: "Gà Trống",
    tier: "Rare",
    emoji: "🐓",
    aliases: ["rooster", "gatrong", "ga"],
    role: "Công Kích Vật Lý",
    battleStats: { hp: 3, att: 6, pr: 3, wp: 1, mag: 1, mr: 3 },
    description: "Gà trống oai phong cất tiếng gáy đánh thức sức mạnh dũng mãnh.",
  },
  {
    key: "pig",
    name: "Heo",
    tier: "Rare",
    emoji: "🐖",
    aliases: ["pig", "heo", "lợn"],
    role: "Đấu Sĩ Bền Bỉ",
    battleStats: { hp: 4, att: 2, pr: 3, wp: 2, mag: 2, mr: 4 },
    description: "Chú heo tròn trĩnh sở hữu thể lực và sức chống chịu dẻo dai.",
  },
  {
    key: "cow",
    name: "Bò",
    tier: "Rare",
    emoji: "🐄",
    aliases: ["cow", "bo"],
    role: "Tanker Vật Lý",
    battleStats: { hp: 5, att: 4, pr: 3, wp: 1, mag: 1, mr: 3 },
    description: "Chú bò kiên cường mang lại nguồn sinh lực và giáp trụ vững vàng.",
  },
  {
    key: "sheep",
    name: "Cừu",
    tier: "Rare",
    emoji: "🐑",
    aliases: ["sheep", "cuu"],
    role: "Tanker Kháng Phép",
    battleStats: { hp: 5, att: 2, pr: 2, wp: 3, mag: 1, mr: 4 },
    description: "Cừu bông ấm áp hấp thụ và xua tan các đòn ma pháp.",
  },

  // --- Epic (Total: 18 points - OwO Epic Standard) ---
  {
    key: "monkey",
    name: "Khỉ",
    tier: "Epic",
    emoji: "🐒",
    aliases: ["monkey", "khi"],
    role: "Đấu Sĩ Song Công",
    battleStats: { hp: 3, att: 6, pr: 2, wp: 1, mag: 4, mr: 2 },
    description: "Chú khỉ thông minh biến ảo giữa đòn đánh vật lý và cổ ngữ.",
  },
  {
    key: "parrot",
    name: "Vẹt",
    tier: "Epic",
    emoji: "🦜",
    aliases: ["parrot", "vet"],
    role: "Trợ Thủ Năng Lượng (WP)",
    battleStats: { hp: 2, att: 1, pr: 2, wp: 7, mag: 4, mr: 2 },
    description: "Vẹt sặc sỡ nhạy bén với nguồn năng lượng vũ khí dồi dào.",
  },
  {
    key: "horse",
    name: "Ngựa",
    tier: "Epic",
    emoji: "🐎",
    aliases: ["horse", "ngua"],
    role: "Chiến Mã Sinh Lực",
    battleStats: { hp: 9, att: 2, pr: 2, wp: 3, mag: 1, mr: 1 },
    description: "Chiến mã dũng mãnh với lượng máu và bền bỉ phi thường.",
  },
  {
    key: "scorpion",
    name: "Bọ Cạp",
    tier: "Epic",
    emoji: "🦂",
    aliases: ["scorpion", "bocap"],
    role: "Thiết Giáp Công Kích",
    battleStats: { hp: 3, att: 6, pr: 4, wp: 2, mag: 1, mr: 2 },
    description: "Bọ cạp nguy hiểm sở hữu đòn độc chí mạng và lớp vỏ cứng cáp.",
  },
  {
    key: "dolphin",
    name: "Cá Heo",
    tier: "Epic",
    emoji: "🐬",
    aliases: ["dolphin", "caheo"],
    role: "Pháp Sư Trị Liệu",
    battleStats: { hp: 2, att: 1, pr: 1, wp: 4, mag: 8, mr: 2 },
    description: "Cá heo biển sâu tràn đầy trí tuệ và ma pháp hồi phục đồng đội.",
  },

  // --- Generation (Special Event Pets - Sự kiện Halloween Tháng 10 - Chuẩn OwO Special: 19 points) ---
  {
    key: "ghostie",
    name: "Ma Kẹo Ngọt",
    tier: "Generation",
    emoji: config.emoji?.pets?.ghostie || "<:nov_ghostie_2026:1565936013514379354>",
    asset: "assets/pets/emojis/pet_gen_ghostie.png",
    aliases: ["ghostie", "conma", "ghost", "spooky", "spookyghost", "makeongot", "nov_ghostie_2026"],
    role: "Pháp Sư Linh Hồn / Hồi Phục WP",
    battleStats: { hp: 2, att: 0, pr: 1, wp: 7, mag: 6, mr: 3 },
    description: "Bóng ma nhỏ bé háu ăn luôn cầm theo kẹo Halloween, bay lượn hư ảo với nguồn năng lượng WP dồi dào và ma thuật kẹo ngọt.",
  },
  {
    key: "vampbat",
    name: "Dơi Cà Rồng",
    tier: "Generation",
    emoji: config.emoji?.pets?.vampbat || "<:nov_vampat_2026:1565936015518994473>",
    asset: "assets/pets/emojis/pet_gen_vampbat.png",
    aliases: ["vampbat", "doicarong", "bat", "vampire", "vampirebat", "doi_carong", "nov_vampat_2026"],
    role: "Sát Thủ Hút Máu / Đột Kích Tốc Độ",
    battleStats: { hp: 3, att: 8, pr: 2, wp: 2, mag: 3, mr: 1 },
    description: "Chú dơi ma cà rồng tí hon khoác áo choàng đỏ kiêu hãnh, chuyên đột kích bóng đêm với những cú cắn vật lý hút máu chí mạng.",
  },

  // --- Legendary (Total: 20 points - OwO Legendary Standard) ---
  {
    key: "mammoth",
    name: "Voi Ma Mút",
    tier: "Legendary",
    emoji: "<a:mammoth:1531537276675559434>",
    aliases: ["mammoth", "voimamut"],
    role: "Siêu Tanker Tiền Tuyến",
    battleStats: { hp: 10, att: 2, pr: 4, wp: 1, mag: 0, mr: 3 },
    description: "Voi ma mút thời băng hà sở hữu lớp giáp và lượng máu khổng lồ.",
  },
  {
    key: "eagle",
    name: "Đại Bàng",
    tier: "Legendary",
    emoji: "<a:eagle:1531537266042736731>",
    aliases: ["eagle", "daibang"],
    role: "Chủ Lực Vật Lý",
    battleStats: { hp: 2, att: 12, pr: 2, wp: 1, mag: 1, mr: 2 },
    description: "Chúa tể bầu trời sải cánh uy dũng với đòn bổ nhào xuyên thủng mọi mục tiêu.",
  },
  {
    key: "sabertiger",
    name: "Hổ Răng Kiếm",
    tier: "Legendary",
    emoji: "<a:sabertiger:1531537287836340255>",
    aliases: ["sabertiger", "horangkiem", "saber"],
    role: "Sát Thủ Kỹ Năng",
    battleStats: { hp: 3, att: 10, pr: 2, wp: 3, mag: 0, mr: 2 },
    description: "Mãnh thú tiền sử hung tợn với đôi nanh kiếm xé rách mọi kẻ thù.",
  },
  {
    key: "shark",
    name: "Cá Mập",
    tier: "Legendary",
    emoji: "<a:shark:1531537293465354281>",
    aliases: ["shark", "camap"],
    role: "Chủ Lực Thủy Pháp",
    battleStats: { hp: 2, att: 1, pr: 1, wp: 2, mag: 13, mr: 1 },
    description: "Sát thủ đại dương cuồng bạo triệu hồi sóng dữ nghiền nát đối thủ.",
  },
  {
    key: "snake",
    name: "Rắn",
    tier: "Legendary",
    emoji: "<a:snake:1531537301522350191>",
    aliases: ["snake", "ran"],
    role: "Sát Thủ Độc Kích",
    battleStats: { hp: 2, att: 11, pr: 3, wp: 1, mag: 1, mr: 2 },
    description: "Xà vương hiểm hóc kết hợp sát thương vật lý cao và khả năng phòng ngự khéo léo.",
  },

  // --- Mythic (Total: 21 points - OwO Gem Standard) ---
  {
    key: "redsnake",
    name: "Xích Huyết Xà",
    tier: "Mythic",
    emoji: "<:redsnake:1531358996177621124>",
    aliases: ["redsnake", "xichhuyetxa"],
    role: "Pháp Sư Huyết Hỏa",
    battleStats: { hp: 2, att: 1, pr: 1, wp: 4, mag: 11, mr: 2 },
    description: "Con rắn huyền bí mang dòng máu đỏ rực như ngọn lửa ma pháp bùng cháy.",
  },
  {
    key: "rockcat",
    name: "Thạch Nham Miêu",
    tier: "Mythic",
    emoji: "<:rockcat:1531002667680137417>",
    aliases: ["rockcat", "thachnhammieu"],
    role: "Pháo Đài Kháng Kép",
    battleStats: { hp: 7, att: 1, pr: 6, wp: 1, mag: 0, mr: 6 },
    description: "Linh miêu bọc đá kiên cố sở hữu cả kháng vật lý lẫn kháng phép thượng thừa.",
  },
  {
    key: "moonwolf",
    name: "Nguyệt Lang",
    tier: "Mythic",
    emoji: "<:moonwolf:1531002665536983091>",
    aliases: ["moonwolf", "nguyetlang"],
    role: "Hồi Phục / Trợ Thủ Ánh Trăng",
    battleStats: { hp: 2, att: 1, pr: 2, wp: 7, mag: 7, mr: 2 },
    description: "Sói tuyết dưới ánh mặt trăng mang nguồn năng lượng WP và ma lực dồi dào.",
  },
  {
    key: "crocnekton",
    name: "Thủy Ngạc Nekton",
    tier: "Mythic",
    emoji: "<:crocnekton:1531002661883740201>",
    aliases: ["crocnekton", "thuyngac"],
    role: "Đấu Sĩ Tuyến Đầu",
    battleStats: { hp: 5, att: 9, pr: 3, wp: 2, mag: 0, mr: 2 },
    description: "Cá sấu vực thẳm vừa chịu đòn bền bỉ vừa tung cú đớp chí mạng.",
  },
  {
    key: "icebear",
    name: "Băng Hùng",
    tier: "Mythic",
    emoji: "<:icebear:1531002670121222354>",
    aliases: ["icebear", "banghung"],
    role: "Chắn Băng Kháng Phép",
    battleStats: { hp: 11, att: 1, pr: 2, wp: 2, mag: 0, mr: 5 },
    description: "Gấu bắc cực khổng lồ sở hữu lượng máu cực lớn và lớp băng chống phép.",
  },

  // --- Ancient (Total: 22 points - OwO Fabled Standard) ---
  {
    key: "argentinosaurus",
    name: "Argentinosaurus",
    tier: "Ancient",
    emoji: "<:Argentinosaurus:1531012502815772743>",
    aliases: ["argentinosaurus", "argentino"],
    role: "Cự Long Sinh Lực",
    battleStats: { hp: 15, att: 0, pr: 3, wp: 1, mag: 0, mr: 3 },
    description: "Khủng long cổ đại siêu khổng lồ với lượng sinh lực (HP 15) gần như bất tận.",
  },
  {
    key: "titanoceratops",
    name: "Titanoceratops",
    tier: "Ancient",
    emoji: "<:Titanoceratops:1531002661883740201>",
    aliases: ["titanoceratops", "titano"],
    role: "Thiết Khiên Cổ Đại",
    battleStats: { hp: 6, att: 1, pr: 8, wp: 2, mag: 0, mr: 5 },
    description: "Khủng long ba sừng khổng lồ với tấm khiên đầu cứng nhất giới tự nhiên.",
  },
  {
    key: "tyrannosaurus",
    name: "Tyrannosaurus",
    tier: "Ancient",
    emoji: "<:Tyrannosaurus:1531012505105596478>",
    aliases: ["tyrannosaurus", "trex"],
    role: "Bạo Chúa Vật Lý",
    battleStats: { hp: 2, att: 15, pr: 2, wp: 1, mag: 0, mr: 2 },
    description: "Bạo chúa cổ đại cai trị muôn loài với sức cắn vật lý (ATT 15) hủy diệt.",
  },
  {
    key: "mosasaurus",
    name: "Mosasaurus",
    tier: "Ancient",
    emoji: "<:Mosasaurus:1531012511317622814>",
    aliases: ["mosasaurus", "mosa"],
    role: "Thủy Quái Phép Thuật",
    battleStats: { hp: 2, att: 0, pr: 1, wp: 3, mag: 12, mr: 4 },
    description: "Thủy quái biển cổ đại nuốt chửng mọi sinh vật bằng ma pháp đại dương.",
  },
  {
    key: "quetzalcoatlus",
    name: "Quetzalcoatlus",
    tier: "Ancient",
    emoji: "<:Quetzalcoatlus:1531012513548996788>",
    aliases: ["quetzalcoatlus", "quetzal"],
    role: "Thần Điểu Năng Lượng (WP)",
    battleStats: { hp: 2, att: 1, pr: 1, wp: 10, mag: 6, mr: 2 },
    description: "Dực long cổ đại mang nguồn năng lượng WP bất tận để kích hoạt vũ khí liên tục.",
  },

  // --- Divine (Total: 23 points - OwO Distorted Standard) ---
  {
    key: "kirin",
    name: "Kỳ Lân",
    tier: "Divine",
    emoji: "<:Kirin:1531346257019404378>",
    aliases: ["kirin", "kylan"],
    role: "Thánh Thú Hộ Mệnh",
    battleStats: { hp: 3, att: 0, pr: 2, wp: 8, mag: 5, mr: 5 },
    description: "Thần thú Kỳ Lân mang lại điềm lành, hồi phục thánh quang và kháng phép tối cao.",
  },
  {
    key: "leviathan",
    name: "Leviathan",
    tier: "Divine",
    emoji: "<:Leviathan:1531346259497975889>",
    aliases: ["leviathan", "thuyquai"],
    role: "Chúa Tể Biển Sâu (Tanker)",
    battleStats: { hp: 13, att: 0, pr: 4, wp: 2, mag: 0, mr: 4 },
    description: "Thủy quái thần thoại bất khả xâm phạm với lượng máu và kháng kép khổng lồ.",
  },
  {
    key: "griffin",
    name: "Điểu Sư Griffin",
    tier: "Divine",
    emoji: "<:Griffin:1531346254217351229>",
    aliases: ["griffin", "dieusu"],
    role: "Chiến Thần Vật Lý",
    battleStats: { hp: 4, att: 13, pr: 3, wp: 1, mag: 0, mr: 2 },
    description: "Sinh vật thần thánh kết hợp sức mạnh sư tử và tốc độ đại bàng.",
  },
  {
    key: "phoenix",
    name: "Phượng Hoàng",
    tier: "Divine",
    emoji: "<:Phoenix:1531346250903851188>",
    aliases: ["phoenix", "phuonghoang"],
    role: "Thần Hỏa Pháp Sư",
    battleStats: { hp: 1, att: 0, pr: 1, wp: 4, mag: 16, mr: 1 },
    description: "Phượng hoàng tái sinh từ tro tàn với ngọn lửa thần ma pháp (MAG 16) cực đại.",
  },
  {
    key: "shenlong",
    name: "Thần Long",
    tier: "Divine",
    emoji: "<:Shenlong:1531346248525807698>",
    aliases: ["shenlong", "thanlong"],
    role: "Thiên Đạo Toàn Năng",
    battleStats: { hp: 2, att: 8, pr: 2, wp: 2, mag: 8, mr: 1 },
    description: "Rồng thần tối cao làm chủ cả sát thương vật lý lẫn pháp thuật tối thượng.",
  },



  // --- Secret (Sẽ cập nhật thú sau khi mở nhiệm vụ/điều kiện bí mật) ---
];

/**
 * Retrieve 6-stat profile (0 - 19 points each) and scaled combat metrics at a given pet level.
 * Exact OwO Wiki scaling formulas:
 * - HP  = (2 * hp * level) + 500
 * - WP  = (2 * wp * level) + 500
 * - ATT = (att * level) + 100
 * - MAG = (mag * level) + 100
 * - PR% = 80 * (25 + 2 * pr * level) / (125 + 2 * pr * level)
 * - MR% = 80 * (25 + 2 * mr * level) / (125 + 2 * mr * level)
 */
function getPetBattleStats(speciesOrPet, levelInput = 1) {
  const key = speciesOrPet?.key || "";
  const matchedSpecies = findPetSpecies(key) || PET_SPECIES.find((s) => s.key.toLowerCase() === String(key).toLowerCase());
  // Standard stats are strictly anchored to the pet species definition (matching OwO where every animal has fixed standard stats)
  const raw = matchedSpecies?.battleStats || speciesOrPet?.battleStats || speciesOrPet?.stats?.battleStats || {
    hp: 3,
    att: 3,
    pr: 2,
    wp: 3,
    mag: 3,
    mr: 2,
  };

  const clamp0to19 = (v) => Math.max(0, Math.min(19, Math.round(Number(v) || 0)));
  const hp = clamp0to19(raw.hp);
  const att = clamp0to19(raw.att ?? raw.str);
  const pr = clamp0to19(raw.pr);
  const wp = clamp0to19(raw.wp);
  const mag = clamp0to19(raw.mag);
  const mr = clamp0to19(raw.mr);

  const level = Math.max(1, Number(levelInput || speciesOrPet?.level || 1));
  const maxHp = 2 * hp * level + 500;
  const maxWp = 2 * wp * level + 500;
  const physAtk = att * level + 100;
  const magAtk = mag * level + 100;
  const physResPct = Math.round(80 * ((25 + 2 * pr * level) / (125 + 2 * pr * level)));
  const magResPct = Math.round(80 * ((25 + 2 * mr * level) / (125 + 2 * mr * level)));

  return {
    points: { hp, att, pr, wp, mag, mr },
    totalPoints: hp + att + pr + wp + mag + mr,
    role: matchedSpecies?.role || speciesOrPet?.role || "Linh Thú Chiến Đấu",
    scaled: {
      maxHp,
      maxWp,
      physAtk,
      magAtk,
      physResPct,
      magResPct,
    },
  };
}

/**
 * Generate pet stats for both 3v3 Pet Battle (6 stats 0-19) and RPG companion bonuses
 */
function generatePetStats(species) {
  const matchedSpecies = findPetSpecies(species?.key) || species;
  const tierConfig = PET_TIERS[matchedSpecies?.tier] || PET_TIERS.Common;
  const { points } = getPetBattleStats(matchedSpecies, 1);

  return {
    baseHp: tierConfig.baseHp + points.hp * 6,
    baseAtk: tierConfig.baseAtk + Math.max(points.att, points.mag) * 2,
    baseDef: tierConfig.baseDef + (points.pr + points.mr) * 2,
    battleStats: { ...points },
  };
}

/**
 * Get EXP needed for a pet to reach next level (Max Level 101)
 */
function getPetXpNeeded(level) {
  if (level >= 101) return 9999999;
  return Math.floor((1000 + Math.pow(level, 4)) * 0.8);
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

/**
 * Roll for Pet Catch during hunt according to independent rates.
 * @param {boolean} [isAutohunt=false] - If true, applies 50% lower rate penalty for AFK autohunt
 */
function rollHuntPetDrop(isAutohunt = false) {
  const mult = isAutohunt ? 0.5 : 1.0;

  const getRandomSpecies = (tier) => {
    if (tier === "Generation") {
      const { isMonthlyEventActive, getActiveMonthlyEventPetKeys } = require("../utils/eventUtil");
      if (!isMonthlyEventActive()) return null;
      const activeKeys = getActiveMonthlyEventPetKeys();
      const list = PET_SPECIES.filter((s) => s.tier === tier && activeKeys.includes(s.key));
      if (!list.length) return null;
      return list[Math.floor(Math.random() * list.length)];
    }
    const list = PET_SPECIES.filter((s) => s.tier === tier);
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  };

  if (Math.random() < 0.000001 * mult) {
    const s = getRandomSpecies("Secret");
    if (s) return s;
  }
  if (Math.random() < 0.0000025 * mult) return getRandomSpecies("Divine");
  if (Math.random() < 0.00001 * mult)  return getRandomSpecies("Ancient");
  if (Math.random() < 0.0001 * mult)   return getRandomSpecies("Mythic");
  if (Math.random() < 0.0005 * mult)   return getRandomSpecies("Legendary");
  if (Math.random() < 0.0005 * mult) {
    const g = getRandomSpecies("Generation");
    if (g) return g;
  }
  if (Math.random() < 0.01 * mult)     return getRandomSpecies("Epic");
  if (Math.random() < 0.10 * mult)     return getRandomSpecies("Rare");
  if (Math.random() < 0.8893865 * mult) return getRandomSpecies("Common");

  return getRandomSpecies("Common");
}

module.exports = {
  PET_STAT_ICONS,
  PET_TIERS,
  PET_SPECIES,
  getPetBattleStats,
  generatePetStats,
  getPetXpNeeded,
  findPetSpecies,
  rollHuntPetDrop,
};
