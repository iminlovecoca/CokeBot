const path = require("path");
const config = require("../data/config");
const { UserFriendlyError } = require("./errors");
const { getUser } = require("./userUtil");

const classEntries = () => Object.entries(config.rpg.classes || {});

const getRpgClass = (classKey) => {
  const normalized = String(classKey || "").toLowerCase();
  return config.rpg.classes?.[normalized] || null;
};

const getClassAssetPath = (rpgClass) =>
  path.join(__dirname, "../assets/characters", rpgClass.asset);

const getRpgXpNeeded = (level) => Math.floor(100 * Math.pow(level, 2.15));

const getRpgRank = (level) => {
  if (level >= 120) return "Transcendent";
  if (level >= 100) return "Immortal";
  if (level >= 80) return "Ascendant";
  if (level >= 60) return "Champion";
  if (level >= 40) return "Hero";
  if (level >= 20) return "Elite";
  return "Novice";
};

const getRpgItems = (user) => {
  const items = user.rpg?.items || [];
  let modified = false;
  for (const item of items) {
    if (!item.uid) {
      item.uid = `w-legacy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      modified = true;
    }
  }
  if (modified) {
    user.markModified("rpg");
  }
  return items;
};

const getEquippedItems = (user) => {
  const items = getRpgItems(user);
  const equipped = user.rpg?.equipped || {};
  return Object.fromEntries(
    Object.entries(equipped)
      .map(([slot, itemId]) => [slot, items.find((item) => item.id === itemId)])
      .filter(([, item]) => item),
  );
};

const dungeonWeapons = [
  { name: "Shadow Dagger", key: "shadowdagger", emoji: "<:shadowdagger:1514232151766339635>" },
  { name: "Poison Dagger", key: "poisondagger", emoji: "<:poisondagger:1514232154173866004>" },
  { name: "Fire Sword", key: "firesword", emoji: "<:firesword:1514232156279406682>" },
  { name: "Green Staff", key: "greenstaff", emoji: "<:greenstaff:1514232158502518945>" },
  { name: "Blue Staff", key: "bluestaff", emoji: "<:bluestaff:1514232160897339442>" },
  { name: "Crimson Dagger", key: "crimsondagger", emoji: "<:crimsondagger:1514232163158065252>" },
  { name: "Holy Sword", key: "holysword", emoji: "<:holysword:1514232165334777876>" },
  { name: "Dark Sword", key: "darksword", emoji: "<:darksword:1514232167595769949>" },
  { name: "Dark Staff", key: "darkstaff", emoji: "<:darkstaff:1514232169529348106>" }
];
const dungeonKeys = dungeonWeapons.map(dw => dw.key);

const subTypes = {
  weapon: [
    { name: "Longsword", emoji: "<:longsword:1514231939865903104>" },
    { name: "Staff", emoji: "<:staff:1514231936581898240>" },
    { name: "Dagger", emoji: "<:dagger:1514231934191009853>" }
  ],
  armor: [
    { name: "Assassin Armor", emoji: "<:assassinarmor:1514232235480453201>" },
    { name: "Heavy Armor", emoji: "<:heavyarmor:1514232237724401716>" },
    { name: "Mage Robe", emoji: "<:magerobe:1514232240052375712>" }
  ],
  helmet: [
    { name: "Warrior Helmet", emoji: "<:warriorhelmet:1514232262793629836>" },
    { name: "Assassin Hood", emoji: "<:assassinhood:1514232265247559802>" },
    { name: "Wizard Hat", emoji: "<:wizardhat:1514232268246482985>" }
  ],
  boots: [
    { name: "Assassin Boot", emoji: "<:assassinboot:1514232291617149070>" },
    { name: "Mage Boot", emoji: "<:mageboot:1514232293634609182>" },
    { name: "Knight Boot", emoji: "<:knightboot:1514232296000192582>" }
  ],
  ring: [
    { name: "Ring", emoji: "<:ring:1514236487707791391>" },
    { name: "Mage Ring", emoji: "<:magering:1514236485556113559>" },
    { name: "Dragon Ring", emoji: "<:dragonring:1514236496868151426>" }
  ],
  necklace: [
    { name: "Necklace", emoji: "<:necklace:1514236494859206729>" },
    { name: "Ember Necklace", emoji: "<:emberneck:1514236492891820062>" },
    { name: "Crystal Necklace", emoji: "<:cristalneck:1514236490102607933>" }
  ]
};


const getItemImageFile = (item) => {
  const slot = String(item.slot || "").toLowerCase();
  const subType = String(item.subType || "").toLowerCase();
  const rarity = String(item.rarity || "").toLowerCase();

  if (slot === "weapon") {
    const lowerSubType = subType.toLowerCase().replace(/\s+/g, "");
    if (dungeonKeys.includes(lowerSubType)) {
      return `Weapon/${lowerSubType}.png`;
    }
    if (subType.includes("sword") || subType.includes("longsword")) {
      if (rarity === "divine") return "Weapon/holysword.png";
      if (rarity === "mythic" || rarity === "ancient") return "Weapon/darksword.png";
      if (rarity === "legendary") return "Weapon/firesword.png";
      return "Weapon/normalsword.png";
    } else if (subType.includes("staff")) {
      if (rarity === "divine") return "Weapon/darkstaff.png";
      if (rarity === "mythic" || rarity === "ancient") return "Weapon/greenstaff.png";
      if (rarity === "legendary") return "Weapon/bluestaff.png";
      return "Weapon/normalstaff.png";
    } else if (subType.includes("dagger")) {
      if (rarity === "divine") return "Weapon/shadowdagger.png";
      if (rarity === "mythic" || rarity === "ancient") return "Weapon/crimsondagger.png";
      if (rarity === "legendary") return "Weapon/poisondagger.png";
      return "Weapon/normaldagger.png";
    }
    return "Weapon/normalsword.png";
  }

  if (slot === "armor") {
    if (subType.includes("assassin")) return "Armor/assassinarmor.png";
    if (subType.includes("heavy")) return "Armor/heavyarmor.png";
    if (subType.includes("mage") || subType.includes("robe")) return "Armor/magerobe.png";
    return "Armor/heavyarmor.png";
  }

  if (slot === "helmet") {
    if (subType.includes("warrior") || subType.includes("helm")) return "Helmet/warriorhelm.png";
    if (subType.includes("assassin") || subType.includes("hood")) return "Helmet/assassinhood.png";
    if (subType.includes("wizard") || subType.includes("hat")) return "Helmet/wizardhat.png";
    return "Helmet/warriorhelm.png";
  }

  if (slot === "boots") {
    if (subType.includes("assassin")) return "Boot/assassinboot.png";
    if (subType.includes("knight") || subType.includes("boot")) return "Boot/knightboot.png";
    if (subType.includes("mage")) return "Boot/mageboot.png";
    return "Boot/knightboot.png";
  }

  if (slot === "ring") {
    if (subType.includes("mage")) return "Ring/magering.png";
    if (subType.includes("dragon")) return "Ring/dragonring.png";
    return "Ring/ring.png";
  }

  if (slot === "necklace") {
    if (subType.includes("ember")) return "Necklace/emberneck.png";
    if (subType.includes("crystal") || subType.includes("cristal")) return "Necklace/cristalneck.png";
    return "Necklace/necklace.png";
  }

  return null;
};

const getLegacyMapping = (slot) => {
  const mappings = {
    weapon: { subType: "Longsword", emoji: "<:longsword:1514231939865903104>" },
    armor: { subType: "Heavy Armor", emoji: "<:heavyarmor:1514232237724401716>" },
    helmet: { subType: "Warrior Helmet", emoji: "<:warriorhelmet:1514232262793629836>" },
    boots: { subType: "Knight Boot", emoji: "<:knightboot:1514232296000192582>" },
    ring: { subType: "Ring", emoji: "<:ring:1514236487707791391>" },
    necklace: { subType: "Necklace", emoji: "<:necklace:1514236494859206729>" },
  };
  return mappings[String(slot).toLowerCase()] || { subType: "", emoji: "" };
};

const getWeaponScaling = (item) => {
  if (item.scaling) return item.scaling;
  
  const scaling = { str: "-", dex: "-", int: "-", arc: "-" };
  const subType = String(item.subType || "Longsword").toLowerCase();
  const rarity = item.rarity || "Common";
  
  let prim = "str", sec = "dex";
  if (subType.includes("staff")) {
    prim = "int";
    sec = "arc";
  } else if (subType.includes("dagger")) {
    prim = "dex";
    sec = "arc";
  }
  
  const primaryGrades = {
    Common: "D",
    Rare: "C",
    Epic: "B",
    Legendary: "A",
    Mythic: "S",
    Ancient: "S",
    Divine: "S"
  };
  const secondaryGrades = {
    Common: "E",
    Rare: "D",
    Epic: "C",
    Legendary: "B",
    Mythic: "B",
    Ancient: "A",
    Divine: "S"
  };
  
  let primGrade = primaryGrades[rarity] || "E";
  let secGrade = secondaryGrades[rarity] || "E";
  
  const cleanSubType = subType.toLowerCase().replace(/\s+/g, "");
  const isDungeonWeapon = dungeonKeys.includes(cleanSubType);
  if (isDungeonWeapon) {
    const bumpGrade = (grade) => {
      const grades = ["-", "E", "D", "C", "B", "A", "S"];
      const idx = grades.indexOf(grade);
      if (idx === -1) return grade;
      return grades[Math.min(grades.length - 1, idx + 1)];
    };
    primGrade = bumpGrade(primGrade);
    secGrade = bumpGrade(secGrade);
  }
  
  scaling[prim] = primGrade;
  scaling[sec] = secGrade;
  return scaling;
};

const getWeaponPower = (item, effectiveStats) => {
  if (item.slot !== "weapon") return item.power || 0;
  
  const base = item.power || 0;
  const scaling = getWeaponScaling(item);
  const gradeMultipliers = { S: 2.0, A: 1.5, B: 1.1, C: 0.8, D: 0.5, E: 0.2, "-": 0.0 };
  
  const multStr = gradeMultipliers[scaling.str] || 0;
  const multDex = gradeMultipliers[scaling.dex] || 0;
  const multInt = gradeMultipliers[scaling.int] || 0;
  const multArc = gradeMultipliers[scaling.arc] || 0;
  
  const valStr = effectiveStats.str || 0;
  const valDex = effectiveStats.dex || 0;
  const valInt = effectiveStats.int || 0;
  const valArc = effectiveStats.arc || 0;
  
  const bonusPercent = (multStr * valStr + multDex * valDex + multInt * valInt + multArc * valArc) / 99;
  const upgradedBase = base * (1 + (item.upgradeLevel || 0) * 0.10);
  return Math.floor(upgradedBase * (1 + bonusPercent));
};

const emptyStats = () => ({
  vigor: 0,
  pr: 0,
  mr: 0,
  str: 0,
  dex: 0,
  int: 0,
  arc: 0,
});

const statLabels = {
  vigor: "Vigor",
  pr: "PR",
  mr: "MR",
  str: "Strengh",
  dex: "Dexterity",
  int: "Intelligence",
  arc: "Arcane",
};

const formatStats = (stats = {}) => {
  const mappedStats = {};
  for (const [key, value] of Object.entries(stats)) {
    const normalized = key.toLowerCase();
    let targetStat = normalized;
    if (normalized === "luck") targetStat = "arc";
    else if (normalized === "vit") targetStat = "vigor";
    else if (normalized === "def") targetStat = "pr";
    else if (normalized === "agi") targetStat = "dex";
    
    mappedStats[targetStat] = (mappedStats[targetStat] || 0) + value;
  }
  
  return Object.entries(mappedStats)
    .filter(([, value]) => value)
    .map(([key, value]) => `${statLabels[key.toLowerCase()] || key.toUpperCase()} +${value}`)
    .join(", ");
};

const getStartingStats = (user) => {
  if (!user?.rpg?.classKey) return { vigor: 0, pr: 0, mr: 0, str: 0, dex: 0, int: 0, arc: 0 };
  const rpgClass = getRpgClass(user.rpg.classKey);
  return rpgClass?.stats || { vigor: 0, pr: 0, mr: 0, str: 0, dex: 0, int: 0, arc: 0 };
};

const getAllocatedPoints = (user) => {
  const current = user.rpg.stats || {};
  const starting = getStartingStats(user);
  
  let allocated = 0;
  for (const key of ["vigor", "pr", "mr", "str", "dex", "int", "arc"]) {
    const curVal = current[key] !== undefined ? current[key] : (starting[key] || 0);
    const startVal = starting[key] || 0;
    allocated += Math.max(0, curVal - startVal);
  }
  return allocated;
};

const getAvailablePoints = (user) => {
  const level = user.rpg.level || 1;
  const allocated = getAllocatedPoints(user);
  return Math.max(0, (level - 1) - allocated);
};

const getEffectiveRpgStats = (user) => {
  const stats = emptyStats();
  if (!user?.rpg?.classKey) return stats;

  const startingStats = getStartingStats(user);
  const baseStats = user.rpg.stats || {};

  for (const stat of Object.keys(stats)) {
    stats[stat] = baseStats[stat] !== undefined ? baseStats[stat] : (startingStats[stat] || 0);
  }

  for (const item of Object.values(getEquippedItems(user))) {
    for (const [stat, value] of Object.entries(item.stats || {})) {
      const normalized = stat.toLowerCase();
      let targetStat = normalized;
      if (normalized === "luck") targetStat = "arc";
      else if (normalized === "vit") targetStat = "vigor";
      else if (normalized === "def") targetStat = "pr";
      else if (normalized === "agi") targetStat = "dex";
      
      if (stats[targetStat] !== undefined) {
        stats[targetStat] = (stats[targetStat] || 0) + value;
      }
    }
  }
  return stats;
};

const calculateRpgPower = (user) => {
  const equipped = getEquippedItems(user);
  const effectiveStats = getEffectiveRpgStats(user);
  
  return Object.values(equipped).reduce((total, item) => {
    if (item.slot === "weapon") {
      return total + getWeaponPower(item, effectiveStats);
    }
    return total + (item.power || 0);
  }, 0);
};

const calculateStarterPower = () => 0;

const hasRpgCharacter = (user) => Boolean(user?.rpg?.classKey);

const selectRpgClass = async (userId, classKey) => {
  const rpgClass = getRpgClass(classKey);
  if (!rpgClass) {
    throw new UserFriendlyError(
      `${config.emoji.no} Class không hợp lệ. Hãy chọn Warrior, Mage, Assassin hoặc Paladin.`,
    );
  }

  const user = await getUser(userId);
  if (hasRpgCharacter(user)) {
    throw new UserFriendlyError(
      `${config.emoji.no} Bạn đã chọn **${getRpgClass(user.rpg.classKey)?.name || user.rpg.classKey}** rồi. Class hiện tại chưa thể đổi.`,
    );
  }

  user.set("rpg", {
    classKey,
    characterAsset: rpgClass.asset,
    level: config.rpg.starting_level,
    exp: 0,
    power: calculateStarterPower(),
    stats: rpgClass.stats,
    rank: getRpgRank(config.rpg.starting_level),
    equipped: {},
    items: [],
    lastItemId: 0,
    lastHuntAt: null,
    lastBossAt: null,
    createdAt: new Date(),
  });

  await user.save();
  return { user, rpgClass };
};

const requireRpgCharacter = async (userId) => {
  const user = await getUser(userId);
  if (!hasRpgCharacter(user)) {
    throw new UserFriendlyError(
      `${config.emoji.warning} Bạn chưa có nhân vật RPG. Dùng \`${config.prefix}class\` để chọn class trước khi chơi.`,
    );
  }
  return { user, rpgClass: getRpgClass(user.rpg.classKey) };
};

const addRpgExp = (rpg, amount) => {
  let exp = (rpg.exp || 0) + amount;
  let level = rpg.level || 1;
  let levelsGained = 0;

  while (exp >= getRpgXpNeeded(level)) {
    exp -= getRpgXpNeeded(level);
    level += 1;
    levelsGained += 1;
  }

  rpg.exp = exp;
  rpg.level = level;
  rpg.rank = getRpgRank(level);

  return levelsGained;
};

const weightedPick = (entries, getRate) => {
  const totalWeight = entries.reduce((total, entry) => total + getRate(entry), 0);
  let roll = Math.random() * totalWeight;

  for (const entry of entries) {
    roll -= getRate(entry);
    if (roll <= 0) return entry;
  }

  return entries[entries.length - 1];
};

const pickUnique = (items, count) => {
  const pool = [...items];
  const picked = [];
  while (pool.length && picked.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
};

const pickRpgHuntGround = () => {
  const grounds = config.rpg.hunt_grounds || [];
  return grounds[Math.floor(Math.random() * grounds.length)] || {
    key: "default",
    name: "Bãi quái",
    emoji: "⚔️",
  };
};

const generateGearStats = (slot, rarityConfig, level) => {
  const slotConfig = config.rpg.gear_slots?.[slot] || {};
  const statPool = slotConfig.stat_pool || ["str", "int", "dex", "vigor", "pr", "mr", "arc"];
  const statBase = rarityConfig.stat || 1;
  const levelBonus = Math.floor((level || 1) / 12);
  const stats = {};

  for (const stat of pickUnique(statPool, 2)) {
    stats[stat] = statBase + levelBonus + Math.floor(Math.random() * (statBase + 1));
  }

  return stats;
};

const getGearDisplayName = (item) => {
  if (!item) return "";
  const bracketEmoji = {
    Common: "<:Common:1390024590347997245>",
    Rare: "<:Rare:1390024624380706916>",
    Epic: "<:Epic:1390024749517770832>",
    Legendary: "<:Legendary:1390024772200567026>",
    Mythic: "<:Mythic:1390024789279772833>",
    Ancient: "<:Ancient:1390024806535004333>",
    Divine: "<:Divine:1512512382507683880>",
  };
  const slotEmoji = {
    weapon: "🗡️",
    armor: "🛡️",
    helmet: "🪖",
    boots: "🥾",
    ring: "💍",
    necklace: "📿",
  };
  const rank = bracketEmoji[item.rarity] || "";
  
  let emoji = item.emoji;
  let subTypeName = item.subType;
  if (!subTypeName || emoji === slotEmoji[item.slot]) {
    const mapping = getLegacyMapping(item.slot);
    if (mapping.subType) {
      subTypeName = mapping.subType;
      emoji = mapping.emoji;
    }
  }
  
  emoji = emoji || slotEmoji[item.slot] || "🛡️";
  subTypeName = subTypeName || (item.slot ? item.slot.toUpperCase() : "");
  const upgradeStr = item.upgradeLevel && item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : "";
  return `${rank}${emoji} ${subTypeName}${upgradeStr}`;
};

const generateRpgGearDrop = async (user, options = {}) => {
  const rpgClass = getRpgClass(user.rpg.classKey);
  const effectiveStats = getEffectiveRpgStats(user);
  const luck = effectiveStats.arc || 0;
  const dropBonus = rpgClass.bonuses?.dropRate || 0;
  const gearDropConfig = config.rpg.gear_drop || {};
  const baseDropRate = gearDropConfig.drop_rate ?? config.rpg.gear_drop_rate ?? 0;
  const luckDropRate = luck * (gearDropConfig.luck_rate_per_point ?? 0);
  const dropRate = Math.min(
    gearDropConfig.max_drop_rate ?? 1,
    baseDropRate + dropBonus + luckDropRate + (options.dropRateBonus || 0),
  );

  if (!options.forceDrop && Math.random() > dropRate) return null;

  const slot = options.slot || weightedPick(
    Object.entries(config.rpg.gear_slots),
    ([, value]) => value.rate ?? value.weight ?? 0,
  )[0];

  const slotSubtypes = subTypes[slot] || [];
  let chosenSubtype;
  if (options.subType) {
    const subNameClean = options.subType.toLowerCase().replace(/\s+/g, "");
    const foundDungeon = dungeonWeapons.find(dw => dw.key === subNameClean || dw.name.toLowerCase().replace(/\s+/g, "") === subNameClean);
    const foundSlot = slotSubtypes.find(st => st.name.toLowerCase().replace(/\s+/g, "") === subNameClean);
    if (foundDungeon) {
      chosenSubtype = { name: foundDungeon.name, emoji: foundDungeon.emoji };
    } else if (foundSlot) {
      chosenSubtype = { name: foundSlot.name, emoji: foundSlot.emoji };
    } else {
      chosenSubtype = { name: options.subType, emoji: slot === "weapon" ? "🗡️" : "🛡️" };
    }
  } else {
    chosenSubtype = slotSubtypes[Math.floor(Math.random() * slotSubtypes.length)] || { name: slot.toUpperCase(), emoji: "🛡️" };
  }

  let rarity, rarityConfig;
  if (options.rarity && config.rpg.gear_rarities[options.rarity]) {
    rarity = options.rarity;
    rarityConfig = config.rpg.gear_rarities[rarity];
  } else {
    const rarityEntries = Object.entries(config.rpg.gear_rarities).filter(
      ([r]) => !options.allowedRarities || options.allowedRarities.includes(r),
    );
    const result = weightedPick(
      rarityEntries.length ? rarityEntries : Object.entries(config.rpg.gear_rarities),
      ([, value]) => value.rate ?? value.weight ?? 0,
    );
    rarity = result[0];
    rarityConfig = result[1];
  }

  const level = options.level || (slot === "weapon" ? 1 : (user.rpg.level || 1));

  // Power config bump for Dungeon Weapons: quality and power is 1 tier higher
  const isDungeon = slot === "weapon" && dungeonKeys.includes(chosenSubtype.name.toLowerCase().replace(/\s+/g, ""));
  let powerRarityConfig = rarityConfig;
  if (isDungeon) {
    const getNextRarity = (rar) => {
      const rarities = ["Common", "Rare", "Epic", "Legendary", "Mythic", "Ancient", "Divine"];
      const idx = rarities.indexOf(rar);
      if (idx === -1) return rar;
      return rarities[Math.min(rarities.length - 1, idx + 1)];
    };
    powerRarityConfig = config.rpg.gear_rarities[getNextRarity(rarity)] || rarityConfig;
  }

  const levelBonus = Math.floor(level * 4.5);
  const variance = 0.9 + Math.random() * 0.2;
  const power = Math.floor((powerRarityConfig.power + levelBonus) * variance);
  const stats = generateGearStats(slot, powerRarityConfig, level);
  const quality = Math.floor((((variance - 0.9) / 0.2) * 90 + 10) * 10) / 10;
  const sellPrice = Math.floor((powerRarityConfig.sell + level * 18) * variance);

  let scaling = null;
  if (slot === "weapon") {
    scaling = { str: "-", dex: "-", int: "-", arc: "-" };
    const subName = chosenSubtype.name.toLowerCase();
    let prim = "str", sec = "dex";
    if (subName.includes("staff")) {
      prim = "int";
      sec = "arc";
    } else if (subName.includes("dagger")) {
      prim = "dex";
      sec = "arc";
    }
    
    const primaryGrades = {
      Common: "D",
      Rare: "C",
      Epic: "B",
      Legendary: "A",
      Mythic: "S",
      Ancient: "S",
      Divine: "S"
    };
    const secondaryGrades = {
      Common: "E",
      Rare: "D",
      Epic: "C",
      Legendary: "B",
      Mythic: "B",
      Ancient: "A",
      Divine: "S"
    };
    
    let primGrade = primaryGrades[rarity] || "E";
    let secGrade = secondaryGrades[rarity] || "E";
    if (isDungeon) {
      const bumpGrade = (grade) => {
        const grades = ["-", "E", "D", "C", "B", "A", "S"];
        const idx = grades.indexOf(grade);
        if (idx === -1) return grade;
        return grades[Math.min(grades.length - 1, idx + 1)];
      };
      primGrade = bumpGrade(primGrade);
      secGrade = bumpGrade(secGrade);
    }
    
    scaling[prim] = primGrade;
    scaling[sec] = secGrade;
  }

  const name = getGearDisplayName({ rarity, slot, subType: chosenSubtype.name, emoji: chosenSubtype.emoji, upgradeLevel: options.upgradeLevel });

  const compareStats = (s1 = {}, s2 = {}) => {
    const keys1 = Object.keys(s1).sort();
    const keys2 = Object.keys(s2).sort();
    if (keys1.length !== keys2.length) return false;
    return keys1.every((key) => s1[key] === s2[key]);
  };

  const User = require("../models/User");
  let itemId = null;

  // 1. Check the current user's inventory first (already loaded in memory)
  const currentItems = user.rpg.items || [];
  for (const item of currentItems) {
    if (
      item.name === name &&
      item.slot === slot &&
      item.rarity === rarity &&
      item.level === level &&
      item.power === power &&
      item.quality === quality &&
      item.sellPrice === sellPrice &&
      compareStats(item.stats, stats)
    ) {
      itemId = item.id;
      break;
    }
  }

  // 2. If not found, run a targeted query for other users who own this item
  if (!itemId) {
    const matchingUser = await User.findOne({
      userId: { $ne: user.userId },
      "rpg.items": {
        $elemMatch: {
          name,
          slot,
          rarity,
          level,
          power,
          quality,
          sellPrice
        }
      }
    }).lean().exec();

    if (matchingUser) {
      const matchedItem = matchingUser.rpg.items.find((item) =>
        item.name === name &&
        item.slot === slot &&
        item.rarity === rarity &&
        item.level === level &&
        item.power === power &&
        item.quality === quality &&
        item.sellPrice === sellPrice &&
        compareStats(item.stats, stats)
      );
      if (matchedItem) {
        itemId = matchedItem.id;
      }
    }
  }

  if (!itemId) {
    const topUser = await User.findOne().sort({ "rpg.lastItemId": -1 }).exec();
    const dbLastId = topUser?.rpg?.lastItemId || 0;
    const memoryLastId = user.rpg.lastItemId || 0;
    itemId = Math.max(1, Math.max(dbLastId, memoryLastId) + 1);
  }

  user.rpg.lastItemId = Math.max(user.rpg.lastItemId || 0, itemId);

  return {
    id: itemId,
    uid: `w-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    slot,
    rarity,
    level,
    power,
    stats,
    quality,
    sellPrice,
    imageKey: getItemImageFile({ slot, rarity, subType: chosenSubtype.name }),
    subType: chosenSubtype.name,
    emoji: chosenSubtype.emoji,
    scaling,
    upgradeLevel: options.upgradeLevel || 0,
    droppedAt: new Date(),
  };
};

const addRpgGearToUser = (user, item) => {
  if (!item) return;
  user.rpg.items = [...getRpgItems(user), item];
  user.markModified("rpg");
};

const findRpgItem = (user, itemId) =>
  getRpgItems(user).find((item) => item.id === Number(itemId));

const equipRpgItem = async (userId, itemId) => {
  const user = await getUser(userId);
  const item = findRpgItem(user, itemId);
  if (!item) {
    throw new UserFriendlyError(`${config.emoji.no} Không tìm thấy trang bị RPG ID \`${itemId}\`.`);
  }

  user.rpg.equipped = {
    ...(user.rpg.equipped || {}),
    [item.slot]: item.id,
  };
  user.rpg.power = calculateRpgPower(user);
  user.markModified("rpg");
  await user.save();
  return { user, item };
};

const unequipRpgSlot = async (userId, slot) => {
  const normalizedSlot = String(slot || "").toLowerCase();
  if (!config.rpg.gear_slot_names[normalizedSlot]) {
    throw new UserFriendlyError(
      `${config.emoji.no} Slot không hợp lệ. Các slot: ${Object.keys(config.rpg.gear_slot_names).join(", ")}.`,
    );
  }

  const user = await getUser(userId);
  const itemId = user.rpg.equipped?.[normalizedSlot];
  if (!itemId) {
    throw new UserFriendlyError(
      `${config.emoji.no} Bạn chưa mặc trang bị ở slot **${config.rpg.gear_slot_names[normalizedSlot]}**.`,
    );
  }

  const item = findRpgItem(user, itemId);
  user.rpg.equipped = { ...(user.rpg.equipped || {}) };
  delete user.rpg.equipped[normalizedSlot];
  user.rpg.power = calculateRpgPower(user);
  user.markModified("rpg");
  await user.save();
  return { user, item, slot: normalizedSlot };
};

const sellRpgItem = async (userId, itemId) => {
  const user = await getUser(userId);
  const item = findRpgItem(user, itemId);
  if (!item) {
    throw new UserFriendlyError(`${config.emoji.no} Không tìm thấy trang bị RPG ID \`${itemId}\`.`);
  }

  if (Object.values(user.rpg.equipped || {}).includes(item.id)) {
    throw new UserFriendlyError(
      `${config.emoji.no} Bạn đang mặc trang bị này. Hãy đổi sang món khác trước khi bán.`,
    );
  }

  user.rpg.items = getRpgItems(user).filter((ownedItem) => ownedItem.id !== item.id);
  user.coke += item.sellPrice || 0;
  user.rpg.power = calculateRpgPower(user);
  user.markModified("rpg");
  await user.save();
  return { user, item, cokeGain: item.sellPrice || 0 };
};

const getBossForPower = (power) => {
  const tiers = config.rpg.boss?.tiers || [];
  return [...tiers]
    .sort((a, b) => a.recommended_power - b.recommended_power)
    .reduce((selected, boss) => {
      if ((power || 0) >= boss.recommended_power) return boss;
      return selected;
    }, tiers[0]);
};

const getItemQuality = (item) => {
  if (!item) return 0;
  if (typeof item.quality === "number") return item.quality;
  // Fallback to deterministic quality based on item ID/UID
  const seed = item.id || 1;
  const pseudoRandom = (Math.sin(seed) + 1) / 2; // 0 to 1
  return Math.floor((10 + pseudoRandom * 90) * 10) / 10;
};

const findRpgItemGlobal = async (itemId) => {
  const User = require("../models/User");
  const owner = await User.findOne({ "rpg.items.id": Number(itemId) }).exec();
  if (!owner) return null;
  const item = owner.rpg.items.find((it) => it.id === Number(itemId));
  return { item, owner };
};

module.exports = {
  classEntries,
  getRpgClass,
  getClassAssetPath,
  getRpgXpNeeded,
  getRpgRank,
  getRpgItems,
  getEquippedItems,
  getEffectiveRpgStats,
  formatStats,
  calculateRpgPower,
  calculateStarterPower,
  hasRpgCharacter,
  selectRpgClass,
  requireRpgCharacter,
  addRpgExp,
  pickRpgHuntGround,
  generateRpgGearDrop,
  addRpgGearToUser,
  findRpgItem,
  findRpgItemGlobal,
  equipRpgItem,
  unequipRpgSlot,
  sellRpgItem,
  getBossForPower,
  getItemQuality,
  getGearDisplayName,
  getItemImageFile,
  getWeaponPower,
  emptyStats,
  getStartingStats,
  getAllocatedPoints,
  getAvailablePoints,
  getWeaponScaling,
  getLegacyMapping,
  dungeonWeapons,
  dungeonKeys,
};
