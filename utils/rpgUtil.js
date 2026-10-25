const path = require("path");
const fs = require("fs");
const config = require("../data/config");
const { UserFriendlyError } = require("./errors");
const { getUser } = require("./userUtil");
const { getHonorSkinInfo, getHonorSkinFile } = require("../data/rpg/skins");

const _assetPathCache = new Map();

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

const normalizeRpgItemId = (value) => {
  const rawId = value && typeof value === "object"
    ? (value.id ?? value.itemId ?? value.item_id)
    : value;
  const cleanId = String(rawId ?? "").trim().replace(/^g\s*/i, "");
  return /^\d+$/.test(cleanId) ? Number(cleanId) : null;
};

const normalizeRpgSlot = (slot) => {
  const cleanSlot = String(slot || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  const aliases = {
    weapon: "weapon",
    mainhand: "weapon",
    equippedweapon: "weapon",
    armor: "armor",
    chest: "armor",
    equippedarmor: "armor",
    helmet: "helmet",
    head: "helmet",
    equippedhelmet: "helmet",
    boots: "boots",
    feet: "boots",
    equippedboots: "boots",
    ring: "ring",
    equippedring: "ring",
    necklace: "necklace",
    equippednecklace: "necklace",
  };
  return aliases[cleanSlot] || null;
};

const getRpgItems = (user) => {
  const items = user.rpg?.items || [];
  const isBattleBot = Boolean(user?.isBattleBot || String(user?.userId || "").startsWith("bot_pvp_"));
  let modified = false;
  for (const item of items) {
    if (!item.uid) {
      item.uid = `w-legacy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      modified = true;
    }
    if (item.slot === "weapon" && !isBattleBot) {
      // Force level = 1 to completely remove hidden level of weapons
      if (item.level !== 1) {
        item.level = 1;
        modified = true;
      }
      
      const rarityConfig = config.rpg.gear_rarities[item.rarity] || config.rpg.gear_rarities.Common;
      const isDungeon = isDungeonWeaponHelper(item.slot, item.subType || item.subtype);
      let powerRarityConfig = rarityConfig;
      if (isDungeon) {
        const getNextRarity = (rar) => {
          const rarities = ["Common", "Rare", "Epic", "Legendary", "Mythic", "Ancient", "Divine"];
          const idx = rarities.indexOf(rar);
          if (idx === -1) return rar;
          return rarities[Math.min(rarities.length - 1, idx + 1)];
        };
        powerRarityConfig = config.rpg.gear_rarities[getNextRarity(item.rarity)] || rarityConfig;
      }
      
      const levelBonus = 4; // level = 1, so levelBonus = 1 * 4.5 = 4
      const qualityVal = typeof item.quality === "number" ? item.quality : 50;
      const variance = 0.9 + 0.2 * ((qualityVal - 10) / 90);
      const correctedPower = Math.floor((powerRarityConfig.power + levelBonus) * variance);
      
      if (item.power !== correctedPower) {
        item.power = correctedPower;
        modified = true;
      }
    }
  }
  if (modified && typeof user.markModified === "function") {
    user.markModified("rpg");
  }
  return items;
};

const getEquippedItems = (user) => {
  const items = getRpgItems(user);
  const equipped = user.rpg?.equipped || {};
  const res = {};
  const findById = (value) => {
    const itemId = normalizeRpgItemId(value);
    return itemId === null ? null : items.find((item) => normalizeRpgItemId(item) === itemId);
  };
  const assign = (slot, value) => {
    const normalizedSlot = normalizeRpgSlot(slot);
    if (!normalizedSlot || res[normalizedSlot]) return;
    const item = findById(value) || (
      value && typeof value === "object" && normalizeRpgItemId(value) !== null ? value : null
    );
    if (!item) return;
    res[normalizedSlot] = item.slot === normalizedSlot
      ? item
      : { ...item, slot: normalizedSlot };
  };
  const equippedEntries = equipped instanceof Map
    ? [...equipped.entries()]
    : Object.entries(equipped);
  // Prefer the canonical lowercase slot when legacy data contains both
  // aliases (for example `Ring` and `ring`) for the same equipment slot.
  equippedEntries.sort(([leftSlot], [rightSlot]) => {
    const leftCanonical = normalizeRpgSlot(leftSlot) === String(leftSlot).trim();
    const rightCanonical = normalizeRpgSlot(rightSlot) === String(rightSlot).trim();
    return Number(rightCanonical) - Number(leftCanonical);
  });
  for (const [slot, item] of equippedEntries) assign(slot, item);

  const legacyFields = {
    weapon: ["equippedWeapon", "equipped_weapon"],
    armor: ["equippedArmor", "equipped_armor"],
    helmet: ["equippedHelmet", "equipped_helmet"],
    boots: ["equippedBoots", "equipped_boots"],
    ring: ["equippedRing", "equipped_ring"],
    necklace: ["equippedNecklace", "equipped_necklace"],
  };
  for (const [slot, fields] of Object.entries(legacyFields)) {
    for (const field of fields) {
      if (user.rpg?.[field] !== undefined && user.rpg?.[field] !== null) {
        assign(slot, user.rpg[field]);
        break;
      }
    }
  }
  return res;
};

const dungeonWeapons = [
  { name: "Shadow Dagger", key: "shadowdagger", emoji: "<:shadowdagger:1514232151766339635>" },
  { name: "Poison Dagger", key: "poisondagger", emoji: "<:poisondagger:1514232154173866004>" },
  { name: "Fire Sword", key: "firesword", emoji: "<:firesword:1514232156279406682>" },
  { name: "Green Staff", key: "greenstaff", emoji: "<:greenstaff:1514232158502518945>" },
  { name: "Blue Staff", key: "bluestaff", emoji: "<:bluestaff:1514232160897339442>" },
  { name: "Crimson Dagger", key: "crimsondagger", emoji: "<:crimsondagger:1514232163158065252>" },
  { name: "Holy Sword", key: "holysword", emoji: "<:Holysword:1523379675076755556>" },
  { name: "Dark Sword", key: "darksword", emoji: "<:darksword:1514232167595769949>" },
  { name: "Dark Staff", key: "darkstaff", emoji: "<:darkstaff:1514232169529348106>" },
  { name: "Gravity Bow", key: "gravitybow", emoji: "<:GravityBow:1516389241347641415>" },
  { name: "Dusk and Dawn", key: "duskanddawn", emoji: "<:DuskandDawn:1517552769270153277>" },
  { name: "River of Blood", key: "riverofblood", emoji: "<:RiverofBlood:1517552771824615424>" },
  { name: "Axesnake", key: "axesnake", emoji: "<:Axesnake:1518746343999406240>" },
  { name: "Sun Bow", key: "sunbow", emoji: "<:Sunbow:1518746354728304720>" },
  { name: "Clawhex", key: "clawhex", emoji: "<:Clawhex:1518746346352545792>" },
  { name: "Spearhex", key: "spearhex", emoji: "<:Spearhex:1518746351784034366>" },
  { name: "Shieldhex", key: "shieldhex", emoji: "<:Shieldhex:1518746348973850818>" },
  { name: "Lunashard", key: "lunashard", emoji: "<:Lunashard:1523374307986772088>" },
  { name: "Eclipsesoul", key: "eclipsesoul", emoji: "<:Eclipsesoul:1523374305256280065>" },
  { name: "Fallenangel", key: "fallenangel", emoji: "<:Fallenangel:1523380721098559630>" },
  { name: "Greeddagger", key: "greeddagger", emoji: "<:Greeddagger:1523380718510543150>" },
  { name: "Asmodeus", key: "asmodeus", emoji: "<:Asmodeus:1523380716027645962>" },
  { name: "Soulreaper", key: "soulreaper", emoji: "<:Soulreaper:1523374310608207882>" },
  { name: "Beelzebub", key: "beelzebub", emoji: "<:Beelzebub:1523380713032913006>" },
  { name: "Satan", key: "satan", emoji: "<:Satan:1523380709476274176>" },
  { name: "Bladesorrow", key: "bladesorrow", emoji: "<:Bladesorrow:1523374302685298848>" },
  { name: "Găng Tay Băng Giá", key: "frostgauntlet", emoji: "<:frostgauntlet:1544258397564567602>" },
  { name: "Quỷ Thư", key: "demonbook", emoji: "📖" },
  { name: "Búa Lôi Thần Thor", key: "thorshammer", emoji: "🔨" },
  { name: "Búa Toàn Tri Odin", key: "odinhammer", emoji: "🦉" },
  { name: "Darkhold", key: "darkhold", emoji: "<:darkhold:1544258394695934002>" },
];
const dungeonKeys = dungeonWeapons.map(dw => dw.key);

const NORMAL_WEAPONS = ["longsword", "dagger", "staff", "warhammer"];
const EVENT_WEAPONS = ["duskanddawn", "riverofblood", "axesnake", "sunbow", "clawhex", "spearhex", "shieldhex", "lunashard", "eclipsesoul", "bladesorrow", "frostgauntlet", "demonbook", "thorshammer", "odinhammer", "darkhold", "soulreaper"];

// Vũ khí top-tier (boss chương cuối + event/dungeon mạnh): tăng trưởng theo
// cấp cường hóa thấp hơn vũ khí đặc biệt thường để giữ cân bằng endgame.
const TOP_TIER_WEAPONS = [
  "fallenangel", "greeddagger", "asmodeus", "soulreaper", "beelzebub", "satan",
  "holysword", "darksword", "darkstaff",
  "duskanddawn", "riverofblood", "axesnake", "sunbow", "clawhex", "spearhex",
  "shieldhex", "lunashard", "eclipsesoul", "bladesorrow", "frostgauntlet",
  "demonbook", "thorshammer", "odinhammer", "darkhold",
];

const isTopTierWeapon = (subType) => {
  if (!subType) return false;
  const clean = String(subType).toLowerCase().replace(/\s+/g, "");
  return TOP_TIER_WEAPONS.includes(clean);
};

const getWeaponCategory = (subType) => {
  if (!subType) return null;
  const clean = String(subType).toLowerCase().replace(/\s+/g, "");
  if (NORMAL_WEAPONS.includes(clean)) return "normal";
  if (EVENT_WEAPONS.includes(clean)) return "event";
  
  const found = dungeonWeapons.find(dw => 
    dw.key === clean || dw.name.toLowerCase().replace(/\s+/g, "") === clean
  );
  if (found) {
    if (EVENT_WEAPONS.includes(found.key)) return "event";
    return "dungeon";
  }
  return null;
};

const getDungeonWeaponKey = (subType) => {
  if (!subType) return null;
  const subNameClean = String(subType).toLowerCase().replace(/\s+/g, "");
  
  const found = dungeonWeapons.find(dw => 
    dw.key === subNameClean || dw.name.toLowerCase().replace(/\s+/g, "") === subNameClean
  );
  if (found) return found.key;

  // Specific alias mappings for compound / event / gacha / Vietnamese names
  if (subNameClean.includes("darkhold") || subNameClean.includes("bithuathacam")) return "darkhold";
  if (subNameClean.includes("soulreaper") || subNameClean.includes("luoihailinhhon")) return "soulreaper";
  if (subNameClean.includes("frostgauntlet") || subNameClean.includes("gangtaybanggia")) return "frostgauntlet";
  if (subNameClean.includes("bladesorrow") || subNameClean.includes("bithuong")) return "bladesorrow";
  if (subNameClean.includes("duskanddawn") || subNameClean.includes("songcuc")) return "duskanddawn";
  if (subNameClean.includes("riverofblood") || subNameClean.includes("huyethai")) return "riverofblood";
  if (subNameClean.includes("gravitybow") || subNameClean.includes("trongluc")) return "gravitybow";
  if (subNameClean.includes("thorshammer") || subNameClean.includes("bualoithan")) return "thorshammer";
  if (subNameClean.includes("odinhammer") || subNameClean.includes("buatoantri")) return "odinhammer";
  if (subNameClean.includes("demonbook") || subNameClean.includes("quythu")) return "demonbook";
  if (subNameClean.includes("fallenangel") || subNameClean.includes("sanga")) return "fallenangel";
  if (subNameClean.includes("greeddagger") || subNameClean.includes("thamlam")) return "greeddagger";
  if (subNameClean.includes("asmodeus") || subNameClean.includes("ducvong")) return "asmodeus";
  if (subNameClean.includes("beelzebub") || subNameClean.includes("hoaitu")) return "beelzebub";
  if (subNameClean.includes("satan") || subNameClean.includes("hoanguc")) return "satan";
  if (subNameClean.includes("holysword") || subNameClean.includes("thanhkiem")) return "holysword";
  if (subNameClean.includes("darksword") || subNameClean.includes("hackiem")) return "darksword";
  if (subNameClean.includes("darkstaff") || subNameClean.includes("hactruong")) return "darkstaff";
  if (subNameClean.includes("bluestaff") || subNameClean.includes("lamtinh")) return "bluestaff";
  if (subNameClean.includes("greenstaff") || subNameClean.includes("mocdiep")) return "greenstaff";
  if (subNameClean.includes("crimsondagger") || subNameClean.includes("huyetnguyet")) return "crimsondagger";
  if (subNameClean.includes("shadowdagger") || subNameClean.includes("anhhon")) return "shadowdagger";
  if (subNameClean.includes("poisondagger") || subNameClean.includes("thuocdoc")) return "poisondagger";
  if (subNameClean.includes("firesword") || subNameClean.includes("hoalong")) return "firesword";
  if (subNameClean.includes("axesnake") || subNameClean.includes("mangxa")) return "axesnake";
  if (subNameClean.includes("sunbow") || subNameClean.includes("thaiduong")) return "sunbow";
  if (subNameClean.includes("clawhex") || subNameClean.includes("quytrao")) return "clawhex";
  if (subNameClean.includes("spearhex") || subNameClean.includes("quythuong")) return "spearhex";
  if (subNameClean.includes("shieldhex") || subNameClean.includes("quykhien")) return "shieldhex";
  if (subNameClean.includes("lunashard") || subNameClean.includes("manhtrang")) return "lunashard";
  if (subNameClean.includes("eclipsesoul") || subNameClean.includes("nhatthuc")) return "eclipsesoul";

  for (const dw of dungeonWeapons) {
    if (subNameClean.includes(dw.key)) return dw.key;
  }

  const dCfg = config.dungeon || {};
  if (dCfg.default_boss?.first_clear_reward?.name) {
    const defaultName = dCfg.default_boss.first_clear_reward.name.toLowerCase().replace(/\s+/g, "");
    if (subNameClean === defaultName || subNameClean.includes(defaultName)) {
      return dCfg.default_boss.first_clear_reward.claim_key;
    }
  }
  
  if (dCfg.chapters) {
    for (const ch of Object.values(dCfg.chapters)) {
      if (ch.boss?.first_clear_reward?.name) {
        const chName = ch.boss.first_clear_reward.name.toLowerCase().replace(/\s+/g, "");
        if (subNameClean === chName || subNameClean.includes(chName)) {
          return ch.boss.first_clear_reward.claim_key;
        }
      }
    }
  }

  return null;
};

const isDungeonWeaponHelper = (slot, subType) => {
  if (slot !== "weapon") return false;
  return getDungeonWeaponKey(subType) !== null;
};

const isDungeonWeapon = (item) => {
  if (!item) return false;
  return isDungeonWeaponHelper(item.slot, item.subType || item.subtype);
};

const getCharacterAssetPath = (avatarFileOrUser) => {
  let avatarFile = avatarFileOrUser;
  if (typeof avatarFileOrUser === "object" && avatarFileOrUser?.rpg) {
    const rpgClass = getRpgClass(avatarFileOrUser.rpg.classKey || "warrior");
    avatarFile = avatarFileOrUser.rpg.characterAsset || rpgClass?.asset || "Warrior_male.png";
  }
  if (!avatarFile || typeof avatarFile !== "string") avatarFile = "Warrior_male.png";

  if (_assetPathCache.has(avatarFile)) {
    return _assetPathCache.get(avatarFile);
  }

  const root = path.join(__dirname, "..");
  let assetPath = path.join(root, "assets/characters", avatarFile);
  if (!fs.existsSync(assetPath)) {
    const skinsDir = path.join(root, "assets/skins");
    if (fs.existsSync(skinsDir)) {
      const subdirs = fs.readdirSync(skinsDir);
      for (const subdir of subdirs) {
        const fullSubdir = path.join(skinsDir, subdir);
        if (fs.statSync(fullSubdir).isDirectory()) {
          const checkPath = path.join(fullSubdir, avatarFile);
          if (fs.existsSync(checkPath)) {
            assetPath = checkPath;
            break;
          }
        }
      }
    }

    // Old seasons stored a single non-gendered honor filename. Keep those
    // records renderable after the gendered male/female assets are introduced.
    const honorInfo = getHonorSkinInfo(avatarFile);
    if (!fs.existsSync(assetPath) && honorInfo?.gender === null) {
      const fallbackFile = getHonorSkinFile(honorInfo.className, honorInfo.rank, "male");
      for (const subdir of fs.existsSync(skinsDir) ? fs.readdirSync(skinsDir) : []) {
        const fullSubdir = path.join(skinsDir, subdir);
        if (!fs.statSync(fullSubdir).isDirectory()) continue;
        const fallbackPath = path.join(fullSubdir, fallbackFile);
        if (fs.existsSync(fallbackPath)) {
          assetPath = fallbackPath;
          break;
        }
      }
    }
  }
  _assetPathCache.set(avatarFile, assetPath);
  return assetPath;
};

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
    { name: "Mage Necklace", emoji: "<:mageneck:1517491429478367252>" }
  ]
};


const removeVietnameseTones = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

const getCleanName = (name) => {
  if (!name) return "";
  let clean = name.replace(/<:[a-zA-Z0-9_]+:[0-9]+>/g, "");
  clean = clean.replace(/[\u00a9\u00ae\u2000-\u3300\ud83c\ud000-\ud83d\udfff\ud83e\ud000-\ud83e\udfff]/g, "");
  clean = clean.replace(/\+\d+/g, "");
  return clean.replace(/\s+/g, " ").trim();
};

const _readdirCache = new Map();
const readCachedDir = (dirPath) => {
  try {
    if (_readdirCache.has(dirPath)) return _readdirCache.get(dirPath);
    const files = fs.readdirSync(dirPath);
    _readdirCache.set(dirPath, files);
    return files;
  } catch (e) {
    return [];
  }
};

const findImageInDir = (subDir, subType, name, extraCandidate = null) => {
  const dirPath = path.join(__dirname, "../assets/items", subDir);
  if (!fs.existsSync(dirPath)) return null;

  const files = readCachedDir(dirPath);
  const candidates = [];
  if (subType) {
    candidates.push(removeVietnameseTones(subType).toLowerCase().replace(/\s+/g, ""));
    const words = String(subType).split(/\s+/);
    for (const w of words) {
      if (w.length >= 4) {
        candidates.push(w.toLowerCase());
      }
    }
  }
  if (name) {
    const clean = getCleanName(name);
    if (clean) {
      candidates.push(removeVietnameseTones(clean).toLowerCase().replace(/\s+/g, ""));
    }
  }
  if (extraCandidate) {
    candidates.push(removeVietnameseTones(extraCandidate).toLowerCase().replace(/\s+/g, ""));
  }

  for (const cand of candidates) {
    if (!cand) continue;
    const match = files.find(f => {
      const fName = f.toLowerCase().replace(/\s+/g, "");
      return fName === `${cand}.png` || fName === cand;
    });
    if (match) {
      return `${subDir}/${match}`;
    }
  }
  return null;
};

const getItemImageFile = (item) => {
  if (!item) return null;
  const slot = String(item.slot || "").toLowerCase();
  let subType = String(item.subType || item.subtype || "").trim();
  if (!subType || subType.toLowerCase() === "undefined") {
    subType = getCleanName(item.name || "");
  }

  if (slot === "weapon") {
    const dungKey = getDungeonWeaponKey(subType);
    const matched = findImageInDir("Weapon", subType, item.name, dungKey);
    if (matched) return matched;

    if (dungKey) {
      if (dungKey === "gravitybow") {
        return "Weapon/GravityBow.png";
      }
      const weaponDir = path.join(__dirname, "../assets/items/Weapon");
      if (fs.existsSync(weaponDir)) {
        const files = readCachedDir(weaponDir);
        const fileMatch = files.find(f => f.toLowerCase() === `${dungKey}.png` || f.toLowerCase() === `${dungKey}`);
        if (fileMatch) return `Weapon/${fileMatch}`;
      }
      return `Weapon/${dungKey}.png`;
    }

    if (item.imageKey && !item.imageKey.includes("longsword")) {
      const directPath = path.join(__dirname, "../assets/items", item.imageKey);
      if (fs.existsSync(directPath)) return item.imageKey;
    }

    const lowerSub = subType.toLowerCase();
    if (lowerSub.includes("staff")) {
      return "Weapon/staff.png";
    }
    if (lowerSub.includes("dagger") || lowerSub.includes("dangger")) {
      return "Weapon/dagger.png";
    }
    return "Weapon/longsword.png";
  }

  if (slot === "armor") {
    const matched = findImageInDir("Armor", subType, item.name);
    if (matched) return matched;
    const lowerSub = subType.toLowerCase();
    if (lowerSub.includes("assassin")) return "Armor/assassinarmor.png";
    if (lowerSub.includes("mage") || lowerSub.includes("robe")) return "Armor/magerobe.png";
    if (lowerSub.includes("heavy") || lowerSub.includes("armor")) return "Armor/heavyarmor.png";
    return "Armor/heavyarmor.png";
  }

  if (slot === "helmet") {
    const matched = findImageInDir("Helmet", subType, item.name);
    if (matched) return matched;
    const lowerSub = subType.toLowerCase();
    if (lowerSub.includes("assassin") || lowerSub.includes("hood")) return "Helmet/assassinhood.png";
    if (lowerSub.includes("wizard") || lowerSub.includes("hat")) return "Helmet/wizardhat.png";
    if (lowerSub.includes("warrior") || lowerSub.includes("helm") || lowerSub.includes("helmet")) return "Helmet/warriorhelm.png";
    return "Helmet/warriorhelm.png";
  }

  if (slot === "boots") {
    const matched = findImageInDir("Boot", subType, item.name);
    if (matched) return matched;
    const lowerSub = subType.toLowerCase();
    if (lowerSub.includes("assassin")) return "Boot/assassinboot.png";
    if (lowerSub.includes("mage")) return "Boot/mageboot.png";
    if (lowerSub.includes("knight") || lowerSub.includes("boot")) return "Boot/knightboot.png";
    return "Boot/knightboot.png";
  }

  if (slot === "ring") {
    const matched = findImageInDir("Ring", subType, item.name);
    if (matched) return matched;
    const lowerSub = subType.toLowerCase();
    if (lowerSub.includes("mage")) return "Ring/magering.png";
    if (lowerSub.includes("dragon")) return "Ring/dragonring.png";
    return "Ring/ring.png";
  }

  if (slot === "necklace") {
    const matched = findImageInDir("Necklace", subType, item.name);
    if (matched) return matched;
    const lowerSub = subType.toLowerCase();
    if (lowerSub.includes("ember")) return "Necklace/emberneck.png";
    if (lowerSub.includes("crystal") || lowerSub.includes("cristal") || lowerSub.includes("mage")) return "Necklace/mageneck.png";
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

const getWeaponScalingStats = (subType) => {
  let name = String(subType || "").toLowerCase();
  const dungKey = getDungeonWeaponKey(subType);
  if (dungKey) {
    name = dungKey;
  }

  
  if (name.includes("duskanddawn") || name.includes("dusk and dawn") || name.includes("dusk")) {
    return { prim: "int", sec: "dex" };
  }
  if (name.includes("riverofblood") || name.includes("river of blood") || name.includes("river")) {
    return { prim: "arc", sec: "dex" };
  }

  if (name.includes("staff") || name.includes("trượng")) {
    return { prim: "int", sec: "arc" };
  }
  if (name.includes("dagger") || name.includes("đao") || name.includes("đoản đao")) {
    return { prim: "dex", sec: "arc" };
  }
  return { prim: "str", sec: "dex" };
};

const getWeaponScaling = (item) => {
  const isDungeon = isDungeonWeapon(item);
  const subTypeClean = String(item.subType || "").toLowerCase().replace(/\s+/g, "");
  const weaponKey = getDungeonWeaponKey(item.subType) || subTypeClean;
  const isStaff = subTypeClean.includes("staff") || subTypeClean.includes("trượng");
  const isDagger = subTypeClean.includes("dagger") || subTypeClean.includes("đao") || subTypeClean.includes("đoản đao");
  const isDuskAndDawn = subTypeClean.includes("dusk");
  const isRiverOfBlood = subTypeClean.includes("river");

  const hasScalingBug = item.scaling && (
    (isStaff && item.scaling.int === "-") ||
    (isDagger && item.scaling.dex === "-") ||
    (isDuskAndDawn && item.scaling.int === "-") ||
    (isRiverOfBlood && item.scaling.arc === "-")
  );

  if (item.scaling && !isDungeon && !hasScalingBug) return item.scaling;
  
  const scaling = { str: "-", dex: "-", int: "-", arc: "-" };
  const subType = String(item.subType || "Longsword").toLowerCase().replace(/\s+/g, "");
  const rarity = item.rarity || "Common";
  
  if (weaponKey.includes("gravitybow")) {
    return { str: "-", dex: "S", int: "A", arc: "B" };
  }

  if (weaponKey.includes("lunashard")) {
    return { str: "-", dex: "S", int: "-", arc: "A" };
  }
  if (weaponKey.includes("eclipsesoul")) {
    return { str: "-", dex: "-", int: "S", arc: "A" };
  }
  if (weaponKey.includes("axesnake")) {
    return { str: "S", dex: "-", int: "-", arc: "-" };
  }
  if (weaponKey.includes("sunbow")) {
    return { str: "-", dex: "S", int: "S", arc: "-" };
  }
  if (weaponKey.includes("clawhex")) {
    return { str: "S", dex: "S", int: "-", arc: "-" };
  }
  if (weaponKey.includes("spearhex")) {
    return { str: "S", dex: "-", int: "-", arc: "S" };
  }
  if (weaponKey.includes("shieldhex")) {
    return { str: "-", dex: "-", int: "-", arc: "-", pr: "S", mr: "S" };
  }
  if (weaponKey.includes("bladesorrow")) {
    return { str: "S", dex: "A", int: "-", arc: "-" };
  }
  if (weaponKey.includes("frostgauntlet")) {
    return { str: "-", dex: "-", int: "S", arc: "A" };
  }
  if (weaponKey.includes("demonbook")) {
    return { str: "-", dex: "-", int: "S", arc: "A" };
  }
  if (weaponKey.includes("thorshammer")) {
    return { str: "S", dex: "-", int: "-", arc: "A" };
  }
  if (weaponKey.includes("odinhammer")) {
    return { str: "-", dex: "-", int: "S", arc: "A" };
  }
  if (weaponKey.includes("darkhold")) {
    return { str: "-", dex: "B", int: "S", arc: "B" };
  }
  if (weaponKey.includes("soulreaper")) {
    return { str: "C", dex: "S", int: "-", arc: "S" };
  }
  
  const { prim, sec } = getWeaponScalingStats(subType);
  
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
  const multPr = gradeMultipliers[scaling.pr] || 0;
  const multMr = gradeMultipliers[scaling.mr] || 0;
  
  const valStr = effectiveStats.str || 0;
  const valDex = effectiveStats.dex || 0;
  const valInt = effectiveStats.int || 0;
  const valArc = effectiveStats.arc || 0;
  const valPr = effectiveStats.pr || 0;
  const valMr = effectiveStats.mr || 0;
  
  const bonusPercent = (multStr * valStr + multDex * valDex + multInt * valInt + multArc * valArc + multPr * valPr + multMr * valMr) / 99;
  const isDungeon = isDungeonWeapon(item);
  const balance = config.rpg?.balance || {};
  const subTypeClean = String(item.subType || item.subtype || "").toLowerCase().replace(/\s+/g, "");
  let configuredUpgradeScale;
  if (!isDungeon) {
    configuredUpgradeScale = Number(balance.normal_weapon_upgrade_scale);
  } else if (isTopTierWeapon(subTypeClean)) {
    configuredUpgradeScale = Number(balance.top_weapon_upgrade_scale);
    if (!Number.isFinite(configuredUpgradeScale)) {
      configuredUpgradeScale = Number(balance.special_weapon_upgrade_scale);
    }
  } else {
    configuredUpgradeScale = Number(balance.special_weapon_upgrade_scale);
  }
  const upgradeScale = Number.isFinite(configuredUpgradeScale)
    ? Math.max(0, configuredUpgradeScale)
    : (isDungeon ? 0.40 : 0.10);
  const upgradedBase = base * (1 + (item.upgradeLevel || 0) * upgradeScale);
  let finalPower = Math.floor(upgradedBase * (1 + bonusPercent));
  if (subTypeClean.includes("river")) {
    const riverMultiplier = Number(balance.river_of_blood_power_multiplier);
    finalPower = Math.floor(finalPower * (Number.isFinite(riverMultiplier) ? riverMultiplier : 1.05));
  }
  return finalPower;
};

// =========================================================
// Phase 2: Stat-Gameplay Integration
// Unified combat math shared by dungeon / PvP / world boss.
// =========================================================

// Mitigation: armor / (armor + 150 + level * 2).
// At level 1 a defense of ~150 gives ~50% reduction and the
// value of each point of PR/MR stays meaningful as level grows.
const getPhysicalMitigation = (armor, level = 1) => {
  const a = Math.max(0, armor || 0);
  return a / (a + 150 + (level || 1) * 2);
};

const getMagicalMitigation = (mr, level = 1) => {
  const m = Math.max(0, mr || 0);
  return m / (m + 150 + (level || 1) * 2);
};

// Weapon "sets": each set grants a global bonus when the player
// owns that weapon, regardless of mode. This gives weapon choice a
// character-wide identity instead of only affecting attack rolls.
const WEAPON_SETS = {
  shadowdagger: { name: "Bóng Đêm", color: "#6b6b6b", bonus: { critRate: 0.03, evasion: 0.06 } },
  poisondagger: { name: "Chất Độc", color: "#3fae53", bonus: { critRate: 0.03, poison: 0.15 } },
  firesword: { name: "Hỏa Ngục", color: "#d14b2b", bonus: { bossDamage: 0.04, burn: 0.15 } },
  greenstaff: { name: "Sinh Khí", color: "#2fbf6f", bonus: { healBonus: 0.15, maxHp: 0.05 } },
  bluestaff: { name: "Băng Giá", color: "#3b82f6", bonus: { mrPierce: 0.10, freezeChance: 0.05 } },
  crimsondagger: { name: "Khát Máu", color: "#b91c1c", bonus: { critRate: 0.05, lifesteal: 0.03 } },
  holysword: { name: "Thánh Quang", color: "#e3b341", bonus: { bossDamage: 0.06, healBonus: 0.10 } },
  darksword: { name: "Bóng Tối", color: "#374151", bonus: { pvpDamage: 0.05, critRate: 0.03 } },
  darkstaff: { name: "Hư Vô", color: "#4c1d95", bonus: { pvpDamage: 0.05, mrPierce: 0.10 } },
  gravitybow: { name: "Hấp Dẫn", color: "#7c3aed", bonus: { doubleHit: 0.05, critRate: 0.02 } },
  duskanddawn: { name: "Hoàng Hôn", color: "#a855f7", bonus: { dual: true, critRate: 0.04 } },
  riverofblood: { name: "Dòng Máu", color: "#dc2626", bonus: { lifesteal: 0.05, bleedPower: 0.20 } },
  axesnake: { name: "Mãng Xà", color: "#166534", bonus: { armorShred: 0.05 } },
  sunbow: { name: "Thái Dương", color: "#f59e0b", bonus: { pierceAll: 0.05 } },
  clawhex: { name: "Quỷ Trảo", color: "#047857", bonus: { bleedPower: 0.25, critRate: 0.02 } },
  spearhex: { name: "Quỷ Thương", color: "#0f766e", bonus: { pierceAll: 0.05, pvpDamage: 0.03 } },
  shieldhex: { name: "Quỷ Khiên", color: "#64748b", bonus: { maxHp: 0.08, reflection: 0.10 } },
  lunashard: { name: "Mảnh Trăng", color: "#93c5fd", bonus: { doubleHit: 0.06, critRate: 0.02 } },
  eclipsesoul: { name: "Linh Hồn", color: "#8b5cf6", bonus: { mrPierce: 0.15, bossDamage: 0.03 } },
  fallenangel: { name: "Sa Ngã", color: "#c0a050", bonus: { reflection: 0.15, critRate: 0.03 } },
  greeddagger: { name: "Tham Lam", color: "#22c55e", bonus: { lifesteal: 0.06, critRate: 0.03 } },
  asmodeus: { name: "Dục Vọng", color: "#e11d48", bonus: { critRate: 0.05, pvpDamage: 0.04 } },
  soulreaper: { name: "Thu Hồn", color: "#581c87", bonus: { critRate: 0.05, lifesteal: 0.04 } },
  beelzebub: { name: "Phàm Ăn", color: "#65a30d", bonus: { maxHp: 0.06, healBonus: 0.10 } },
  satan: { name: "Hỏa Ngục", color: "#dc2626", bonus: { bossDamage: 0.06, pvpDamage: 0.06 } },
  bladesorrow: { name: "Bi Thương", color: "#a855f7", bonus: { critRate: 0.04, bossDamage: 0.04 } },
  frostgauntlet: { name: "Băng Quyền", color: "#22d3ee", bonus: { critRate: 0.03, bossDamage: 0.03 } },
  darkhold: { name: "Hắc Thư", color: "#312e81", bonus: { mrPierce: 0.12, bossDamage: 0.05 } },
  bithuathacamdarkhold: { name: "Hắc Thư", color: "#312e81", bonus: { mrPierce: 0.12, bossDamage: 0.05 } },
  luoihailinhhonsoulreaper: { name: "Thu Hồn", color: "#581c87", bonus: { critRate: 0.05, lifesteal: 0.04 } },
  thorshammer: { name: "Lôi Thần", color: "#eab308", bonus: { critRate: 0.04, bossDamage: 0.04 } },
  odinhammer: { name: "Toàn Tri", color: "#38bdf8", bonus: { mrPierce: 0.10, critRate: 0.03 } },
  demonbook: { name: "Quỷ Chú", color: "#7c2d12", bonus: { mrPierce: 0.08, bossDamage: 0.04 } },
};

const getWeaponSetBonus = (user) => {
  if (!user?.rpg) return null;
  const equipped = getEquippedItems(user);
  const weaponKey = getDungeonWeaponKey(equipped.weapon?.subType || equipped.weapon?.subtype || "");
  if (!weaponKey) return null;
  if (String(equipped.weapon?.rarity || "").toLowerCase() === "common") return null;
  return WEAPON_SETS[weaponKey] || null;
};

// Extend effective stats with set-bonus derived combat layers, so the
// rest of the pipeline (dungeon / PvP / boss) can consume one shape.
const computeCombatStats = (user, effectiveStats) => {
  const stats = effectiveStats || getEffectiveRpgStats(user);
  const level = user?.rpg?.level || 1;
  const equipped = getEquippedItems(user);

  let physicalDef = (stats.pr || 0) * 10;
  let magicalDef = (stats.mr || 0) * 10;
  for (const item of Object.values(equipped)) {
    if (item.slot === "weapon") continue;
    physicalDef += (item.power || 0) * 1.5;
    magicalDef += (item.power || 0) * 1.5;
  }

  const set = getWeaponSetBonus(user);
  let maxHpBonus = 0;
  if (set?.bonus?.maxHp) maxHpBonus = set.bonus.maxHp;

  let power = calculateRpgPower(user);
  if (set?.bonus?.maxHp) power += 0;

  return {
    stats,
    level,
    set,
    physicalDef,
    magicalDef,
    maxHpBonus,
    physMitigation: getPhysicalMitigation(physicalDef, level),
    magMitigation: getMagicalMitigation(magicalDef, level),
    power,
  };
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
  return rpgClass?.stats ? { ...rpgClass.stats } : { vigor: 0, pr: 0, mr: 0, str: 0, dex: 0, int: 0, arc: 0 };
};

const sanitizeRpgStats = (user) => {
  if (!user?.rpg?.classKey || user.isBattleBot || user.userId?.startsWith?.("bot_pvp_")) return false;
  const starting = getStartingStats(user);
  if (!user.rpg.stats || typeof user.rpg.stats !== "object") {
    user.rpg.stats = { ...starting };
    return true;
  }
  let modified = false;
  for (const key of ["vigor", "pr", "mr", "str", "dex", "int", "arc"]) {
    const minVal = starting[key] || 0;
    let curVal = user.rpg.stats[key];
    if (curVal === undefined || isNaN(curVal) || curVal < minVal) {
      user.rpg.stats[key] = minVal;
      modified = true;
    } else if (curVal > 99) {
      user.rpg.stats[key] = 99;
      modified = true;
    }
  }
  return modified;
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

const getEquippedPet = (user) => {
  const equipped = user?.rpg?.equippedPet;
  if (!equipped) return null;
  const pets = user?.rpg?.pets || [];
  return pets.find((p) => p.id === equipped.id || p.key === equipped.key) || equipped;
};

const getEquippedPetBonuses = (user) => {
  const pet = getEquippedPet(user);
  if (!pet) return { hpPct: 0, atkPct: 0, defPct: 0, baseHp: 0, baseAtk: 0, baseDef: 0, pet: null };
  const lvl = pet.level || 1;
  const { PET_TIERS } = require("../data/pets");
  const tierConfig = PET_TIERS[pet.tier] || PET_TIERS.Common;
  const baseHp = pet.stats?.baseHp || tierConfig.baseHp;
  const baseAtk = pet.stats?.baseAtk || tierConfig.baseAtk;
  const baseDef = pet.stats?.baseDef || tierConfig.baseDef;

  return {
    hpPct: lvl * 0.005,   // +0.5% per level
    atkPct: lvl * 0.004,  // +0.4% per level
    defPct: lvl * 0.0035, // +0.35% per level
    baseHp,
    baseAtk,
    baseDef,
    pet,
  };
};

const addPetExp = (user, amount) => {
  const pet = getEquippedPet(user);
  if (!pet) return { leveledUp: false, pet: null };
  const { getPetXpNeeded } = require("../data/pets");
  let exp = (pet.exp || 0) + amount;
  let level = pet.level || 1;
  let leveledUp = false;

  while (exp >= getPetXpNeeded(level)) {
    exp -= getPetXpNeeded(level);
    level += 1;
    leveledUp = true;
  }

  pet.exp = exp;
  pet.level = level;
  
  if (Array.isArray(user.rpg.pets)) {
    const petIdx = user.rpg.pets.findIndex((p) => p.id === pet.id || p.key === pet.key);
    if (petIdx > -1) {
      user.rpg.pets[petIdx].exp = exp;
      user.rpg.pets[petIdx].level = level;
    }
  }
  user.rpg.equippedPet = pet;
  user.markModified("rpg");
  return { leveledUp, level, pet };
};

// --- Pet combat (pet tham chiến: gây sát thương độc lập theo level + tier) ---
const DEFAULT_PET_TIER_ATK_MULT = {
  Common: 1.0,
  Rare: 1.6,
  Epic: 2.5,
  Legendary: 4.0,
  Mythic: 6.5,
  Ancient: 10.0,
  Divine: 16.0,
};

// Heuristic: pet cowsaát thương theo baseAtk/level/tier. PvP dùng hệ số nhỏ hơn
// vì HP người chơi thấp hơn nhiều so với boss dungeon.
const PET_MODE_SCALE = {
  dungeon: 1.0,
  boss: 1.0,
  pvp: 0.35,
};

const getPetCombatStats = (pet) => {
  if (!pet) return null;
  const { PET_TIERS } = require("../data/pets");
  const tierConfig = PET_TIERS[pet.tier] || PET_TIERS.Common;
  const baseAtk = pet.stats?.baseAtk || pet.baseAtk || tierConfig.baseAtk;
  const baseDef = pet.stats?.baseDef || pet.baseDef || tierConfig.baseDef;
  const level = pet.level || 1;
  return { tier: pet.tier, level, baseAtk, baseDef };
};

// Sát thương pet (độc lập) cho 1 đòn, theo mode.
const petAttackDamage = (pet, mode = "dungeon") => {
  const cs = getPetCombatStats(pet);
  if (!cs) return 0;
  const configuredPetMultipliers = config.rpg?.balance?.pet_tier_attack_multiplier || {};
  const atkMult = Number(configuredPetMultipliers[cs.tier]);
  const safeAtkMult = Number.isFinite(atkMult)
    ? Math.max(0, atkMult)
    : (DEFAULT_PET_TIER_ATK_MULT[cs.tier] || DEFAULT_PET_TIER_ATK_MULT.Common);
  const modeScale = PET_MODE_SCALE[mode] ?? 1.0;
  // (baseAtk + level*2) * tierMult * modeScale
  return Math.max(1, Math.floor((cs.baseAtk + cs.level * 2) * safeAtkMult * modeScale));
};

const getPetAttackLog = (pet, mode = "dungeon", damage) => {
  if (!pet) return "";
  const emoji = pet.emoji || "🐾";
  const name = pet.nickname || pet.name || "Thú cưng";
  const dmg = damage !== undefined ? damage : petAttackDamage(pet, mode);
  const dmgStr = dmg.toLocaleString();
  if (mode === "pvp") return `${emoji} **[${name}]** lao vào tấn công! Gây **${dmgStr}** sát thương.`;
  return `${emoji} **[${name}]** tấn công! Gây **${dmgStr}** sát thương.`;
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

  const isBot = Boolean(user?.isBattleBot || user?.userId?.startsWith?.("bot_pvp_"));
  for (const stat of Object.keys(stats)) {
    const val = Math.max(0, Math.floor(stats[stat] || 0));
    stats[stat] = isBot ? val : Math.min(99, val);
  }

  return stats;
};

const calculateRpgPower = (user) => {
  if ((user?.isBattleBot || user?.userId?.startsWith("bot_pvp_")) && typeof user.rpg?.power === "number" && user.rpg.power > 0) {
    return user.rpg.power;
  }
  const equipped = getEquippedItems(user);
  const effectiveStats = getEffectiveRpgStats(user);
  
  let gearPower = Object.values(equipped).reduce((total, item) => {
    if (item.slot === "weapon") {
      return total + getWeaponPower(item, effectiveStats);
    }
    return total + (item.power || 0);
  }, 0);

  const equippedPet = getEquippedPet(user);
  let petPower = 0;
  if (equippedPet) {
    const tierMulti = { Common: 100, Rare: 250, Epic: 500, Legendary: 1000, Mythic: 2000, Ancient: 3500, Divine: 5000 };
    const petB = getEquippedPetBonuses(user);
    const rawPetPower = (tierMulti[equippedPet.tier] || 100)
      + petB.baseHp * 2
      + petB.baseAtk * 5
      + petB.baseDef * 4
      + (equippedPet.level || 1) * 35;
    const configuredPetContribution = Number(config.rpg?.balance?.pet_power_contribution);
    const petContribution = Number.isFinite(configuredPetContribution)
      ? Math.max(0, configuredPetContribution)
      : 0.80;
    petPower = Math.floor(rawPetPower * petContribution);
  }

  return gearPower + petPower;
};

const calculateStarterPower = () => 0;

const hasRpgCharacter = (user) => Boolean(user?.rpg?.classKey);

const selectRpgClass = async (userId, classKey) => {
  const rpgClass = getRpgClass(classKey);
  if (!rpgClass) {
    throw new UserFriendlyError(
      `${config.emoji.no} Class không hợp lệ. Hãy chọn Warrior, Archer, Mage, Assassin, Paladin hoặc Wretch.`,
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
    freeClassChangeUsed: false,
    migratedToWarrior: true,
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
  if (sanitizeRpgStats(user)) {
    user.rpg.power = calculateRpgPower(user);
    if (typeof user.markModified === 'function') user.markModified('rpg');
    await user.save().catch(() => {});
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

const maxVarianceByRarity = {
  Common: 1,
  Rare: 1,
  Epic: 2,
  Legendary: 3,
  Mythic: 4,
  Ancient: 5,
  Divine: 7
};

const generateGearStats = (slot, rarity, quality, subType = "") => {
  if (slot === "weapon") {
    return {};
  }
  const rarityConfig = config.rpg.gear_rarities[rarity] || { stat: 1 };
  const statBase = rarityConfig.stat || 1;
  const maxVar = maxVarianceByRarity[rarity] || 1;

  const qualityVal = typeof quality === "number" ? quality : 50;
  const qualityFactor = Math.max(0, Math.min(1, (qualityVal - 10) / 90));
  const varRoll = Math.round(qualityFactor * (maxVar - 1));

  let fixedStat = null;
  let randomPool = ["vigor", "pr", "mr", "str", "dex", "int", "arc"];

  const subTypeLower = String(subType || "").toLowerCase();

  if (slot === "helmet") {
    fixedStat = "vigor";
    if (subTypeLower.includes("warrior") || subTypeLower.includes("knight")) {
      randomPool = ["pr", "mr"];
    } else if (subTypeLower.includes("wizard") || subTypeLower.includes("mage") || subTypeLower.includes("hat")) {
      randomPool = ["arc"];
    } else if (subTypeLower.includes("assassin") || subTypeLower.includes("hood")) {
      randomPool = ["dex"];
    } else {
      randomPool = ["pr", "mr", "arc", "dex"];
    }
  } else if (slot === "armor") {
    fixedStat = "vigor";
    if (subTypeLower.includes("heavy")) {
      randomPool = ["pr", "mr"];
    } else if (subTypeLower.includes("mage") || subTypeLower.includes("robe")) {
      randomPool = ["arc", "int"];
    } else if (subTypeLower.includes("assassin")) {
      randomPool = ["dex", "arc"];
    } else {
      randomPool = ["pr", "mr", "arc", "int", "dex"];
    }
  } else if (slot === "ring") {
    if (subTypeLower.includes("mage")) {
      fixedStat = "int";
    } else if (subTypeLower.includes("dragon")) {
      fixedStat = "dex";
    } else {
      fixedStat = "str";
    }
    randomPool = ["vigor", "pr", "mr", "str", "dex", "int", "arc"].filter(s => s !== fixedStat);
  } else if (slot === "necklace") {
    if (subTypeLower.includes("mage")) {
      fixedStat = "int";
    } else if (subTypeLower.includes("ember")) {
      fixedStat = "dex";
    } else {
      fixedStat = "str";
    }
    randomPool = ["vigor", "pr", "mr", "str", "dex", "int", "arc"].filter(s => s !== fixedStat);
  } else if (slot === "boots") {
    if (subTypeLower.includes("mage")) {
      fixedStat = "int";
    } else if (subTypeLower.includes("knight")) {
      fixedStat = "str";
    } else if (subTypeLower.includes("assassin")) {
      fixedStat = "dex";
    } else {
      fixedStat = "str";
    }
    randomPool = ["vigor", "pr", "mr", "str", "dex", "int", "arc"].filter(s => s !== fixedStat);
  } else {
    
    const pool = ["str", "int", "dex", "arc", "vigor"];
    const picked = pickUnique(pool, 2);
    const stats = {};
    stats[picked[0]] = statBase + varRoll;
    stats[picked[1]] = statBase + varRoll;
    return stats;
  }

  
  
  const qualitySeed = Math.round((typeof quality === "number" ? quality : 50) * 1000);
  const randomIndex = qualitySeed % randomPool.length;
  const randomStat = randomPool[randomIndex] || "vigor";
  const stats = {};
  stats[fixedStat] = statBase + varRoll;
  stats[randomStat] = statBase + varRoll;

  return stats;
};

const getGearDisplayName = (item) => {
  if (!item) return "";
  const bracketEmoji = {
    Common: "<:common:1530878565489311826>",
    Rare: "<:rare:1530878574104547378>",
    Epic: "<:epic:1530878567955566642>",
    Legendary: "<:legendary:1530878570858287205>",
    Mythic: "<a:mythic:1530878614843686912>",
    Ancient: "<a:ancient:1530878606656540814>",
    Divine: "<a:divine:1530878610515165365>",
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
  const dungWeapon = dungeonWeapons.find(dw => dw.key === getDungeonWeaponKey(subTypeName));
  if (dungWeapon) {
    emoji = dungWeapon.emoji;
    subTypeName = dungWeapon.name;
  } else if (!subTypeName || emoji === slotEmoji[item.slot]) {
    const mapping = getLegacyMapping(item.slot);
    if (mapping.subType) {
      subTypeName = mapping.subType;
      emoji = mapping.emoji;
    }
  }
  
  emoji = emoji || slotEmoji[item.slot] || "🛡️";
  subTypeName = subTypeName || (item.slot ? item.slot.toUpperCase() : "");
  const upgradeStr = item.upgradeLevel && item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : "";
  const favoriteStr = item.isFavorite ? " ⭐" : "";
  return `${rank}${emoji} ${subTypeName}${upgradeStr}${favoriteStr}`;
};

let globalLastItemId = null;

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
    if (foundDungeon) {
      const isDev = (config.permissions?.dev_ids || []).includes(user?.userId) || 
                    user?.userId === process.env.OWNER_ID || 
                    user?.userId === "123456" || 
                    options.fromAdmin ||
                    options.allowRiverOfBlood;
      if (!isDev) {
        const category = getWeaponCategory(subNameClean);
        if (category === "event") {
          if (!options.fromEvent) {
            throw new UserFriendlyError(`${config.emoji?.no || "❌"} Vũ khí sự kiện (${foundDungeon.name}) chỉ có thể sở hữu từ Sự kiện đặc biệt.`);
          }
        } else if (category === "dungeon") {
          if (!options.fromDungeon) {
            throw new UserFriendlyError(`${config.emoji?.no || "❌"} Vũ khí phó bản (${foundDungeon.name}) chỉ có thể sở hữu từ Dungeon.`);
          }
        }
      }
    }
    const foundSlot = slotSubtypes.find(st => st.name.toLowerCase().replace(/\s+/g, "") === subNameClean);
    if (foundDungeon) {
      chosenSubtype = { name: foundDungeon.name, emoji: options.emoji || foundDungeon.emoji };
    } else if (foundSlot) {
      chosenSubtype = { name: foundSlot.name, emoji: foundSlot.emoji };
    } else {
      chosenSubtype = { name: options.subType, emoji: options.emoji || (slot === "weapon" ? "🗡️" : "🛡️") };
    }
  } else {
    chosenSubtype = slotSubtypes[Math.floor(Math.random() * slotSubtypes.length)] || { name: slot.toUpperCase(), emoji: "🛡️" };
  }

  const isDungeon = isDungeonWeaponHelper(slot, chosenSubtype.name);

  let rarity, rarityConfig;
  if (options.rarity && config.rpg.gear_rarities[options.rarity]) {
    rarity = options.rarity;
    rarityConfig = config.rpg.gear_rarities[rarity];
  } else if (isDungeon) {
    rarity = "Ancient";
    rarityConfig = config.rpg.gear_rarities["Ancient"];
  } else {
    let rarityConfigMap = config.rpg.gear_rarities;
    if (options.fromWc) {
      rarityConfigMap = {
        Common: { rate: 50, power: 45, sell: 120, stat: 1 },
        Rare: { rate: 35, power: 90, sell: 350, stat: 2 },
        Epic: { rate: 13.5, power: 180, sell: 1100, stat: 4 },
        Legendary: { rate: 1.2, power: 380, sell: 4200, stat: 7 },
        Mythic: { rate: 0.2, power: 780, sell: 15000, stat: 11 },
        Ancient: { rate: 0.08, power: 1450, sell: 65000, stat: 16 },
        Divine: { rate: 0.02, power: 2800, sell: 250000, stat: 24 },
      };
    }
    const rarityEntries = Object.entries(rarityConfigMap).filter(
      ([r]) => !options.allowedRarities || options.allowedRarities.includes(r),
    );
    const result = weightedPick(
      rarityEntries.length ? rarityEntries : Object.entries(rarityConfigMap),
      ([, value]) => value.rate ?? value.weight ?? 0,
    );
    rarity = result[0];
    rarityConfig = result[1];
  }

  const level = 1;

  
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
  const quality = Math.floor((((variance - 0.9) / 0.2) * 90 + 10) * 10) / 10;
  const stats = generateGearStats(slot, rarity, quality, chosenSubtype.name);
  const sellPrice = Math.floor((powerRarityConfig.sell + level * 18) * variance);

  let scaling = null;
  if (slot === "weapon") {
    const subName = getDungeonWeaponKey(chosenSubtype.name) || chosenSubtype.name.toLowerCase();
    if (subName.includes("gravitybow")) {
      scaling = { str: "-", dex: "S", int: "A", arc: "B" };
    } else if (subName.includes("lunashard")) {
      scaling = { str: "-", dex: "S", int: "-", arc: "A" };
    } else if (subName.includes("eclipsesoul")) {
      scaling = { str: "-", dex: "-", int: "S", arc: "A" };
    } else if (subName.includes("bladesorrow")) {
      scaling = { str: "S", dex: "A", int: "-", arc: "-" };
    } else if (subName.includes("frostgauntlet")) {
      scaling = { str: "-", dex: "-", int: "S", arc: "A" };
    } else if (subName.includes("demonbook")) {
      scaling = { str: "-", dex: "-", int: "S", arc: "A" };
    } else if (subName.includes("thorshammer")) {
      scaling = { str: "S", dex: "-", int: "-", arc: "A" };
    } else if (subName.includes("odinhammer")) {
      scaling = { str: "-", dex: "-", int: "S", arc: "A" };
    } else if (subName.includes("darkhold")) {
      scaling = { str: "-", dex: "B", int: "S", arc: "B" };
    } else if (subName.includes("soulreaper")) {
      scaling = { str: "C", dex: "S", int: "-", arc: "S" };
    } else {
      scaling = { str: "-", dex: "-", int: "-", arc: "-" };
      const { prim, sec } = getWeaponScalingStats(subName);
      
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
  }

  const name = getGearDisplayName({ rarity, slot, subType: chosenSubtype.name, emoji: chosenSubtype.emoji, upgradeLevel: options.upgradeLevel });

  if (globalLastItemId === null) {
    const User = require("../models/User");
    const topUser = await User.findOne().sort({ "rpg.lastItemId": -1 }).exec();
    const dbLastId = topUser?.rpg?.lastItemId || 0;
    const memoryLastId = user.rpg.lastItemId || 0;
    globalLastItemId = Math.max(dbLastId, memoryLastId);
  }
  globalLastItemId += 1;
  const itemId = globalLastItemId;

  user.rpg.lastItemId = itemId;

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
    imageKey: options.imageKey || getItemImageFile({ slot, rarity, subType: chosenSubtype.name }),
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

const findRpgItem = (user, itemId) => {
  const normalizedId = normalizeRpgItemId(itemId);
  if (normalizedId === null) return null;
  return getRpgItems(user).find((item) => normalizeRpgItemId(item) === normalizedId);
};

const equipRpgItem = async (userId, itemId) => {
  const user = await getUser(userId);
  const item = findRpgItem(user, itemId);
  if (!item) {
    throw new UserFriendlyError(`${config.emoji.no} Không tìm thấy trang bị RPG ID \`${itemId}\`.`);
  }

  const normalizedSlot = normalizeRpgSlot(item.slot);
  if (!normalizedSlot) {
    throw new UserFriendlyError(`${config.emoji.no} Trang bị này có slot không hợp lệ.`);
  }
  const existingEquipped = user.rpg.equipped || {};
  const existingEntries = existingEquipped instanceof Map
    ? [...existingEquipped.entries()]
    : Object.entries(existingEquipped);
  const nextEquipped = {};
  for (const [slot, equippedId] of existingEntries) {
    if (normalizeRpgSlot(slot) !== normalizedSlot) {
      nextEquipped[slot] = equippedId;
    }
  }
  nextEquipped[normalizedSlot] = normalizeRpgItemId(item.id) ?? item.id;
  user.rpg.equipped = nextEquipped;
  user.rpg.power = calculateRpgPower(user);
  user.markModified("rpg");
  await user.save();
  return { user, item };
};

const unequipRpgSlot = async (userId, slot) => {
  const normalizedSlot = normalizeRpgSlot(slot);
  if (!config.rpg.gear_slot_names[normalizedSlot]) {
    throw new UserFriendlyError(
      `${config.emoji.no} Slot không hợp lệ. Các slot: ${Object.keys(config.rpg.gear_slot_names).join(", ")}.`,
    );
  }

  const user = await getUser(userId);
  const equipped = user.rpg.equipped || {};
  const equippedEntries = equipped instanceof Map
    ? [...equipped.entries()]
    : Object.entries(equipped);
  const matchedEntry = equippedEntries.find(
    ([slot]) => normalizeRpgSlot(slot) === normalizedSlot,
  );
  const resolvedEquipped = getEquippedItems(user)[normalizedSlot];
  const itemId = matchedEntry?.[1] ?? resolvedEquipped?.id;
  if (!itemId) {
    throw new UserFriendlyError(
      `${config.emoji.no} Bạn chưa mặc trang bị ở slot **${config.rpg.gear_slot_names[normalizedSlot]}**.`,
    );
  }

  const item = findRpgItem(user, itemId) || resolvedEquipped;
  const nextEquipped = {};
  for (const [slot, equippedId] of equippedEntries) {
    if (normalizeRpgSlot(slot) !== normalizedSlot) {
      nextEquipped[slot] = equippedId;
    }
  }
  user.rpg.equipped = nextEquipped;
  const legacyFields = {
    weapon: ["equippedWeapon", "equipped_weapon"],
    armor: ["equippedArmor", "equipped_armor"],
    helmet: ["equippedHelmet", "equipped_helmet"],
    boots: ["equippedBoots", "equipped_boots"],
    ring: ["equippedRing", "equipped_ring"],
    necklace: ["equippedNecklace", "equipped_necklace"],
  };
  for (const field of legacyFields[normalizedSlot] || []) {
    if (user.rpg[field] !== undefined) delete user.rpg[field];
  }
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

  if (item.isGodset) {
    throw new UserFriendlyError(`${config.emoji.no} Trang bị từ God Set không thể bán!`);
  }

  if (item.isFavorite) {
    throw new UserFriendlyError(
      `${config.emoji.no} Trang bị này đang được yêu thích ⭐ và đã bị khóa. Hãy bỏ yêu thích trước khi bán!`,
    );
  }

  if (Object.values(user.rpg.equipped || {}).some((equippedId) => Number(equippedId) === Number(item.id))) {
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

const revokeRpgGodset = async (userId, client) => {
  const User = require("../models/User");
  const user = await User.findOne({ userId });
  if (!user || !user.rpg || !user.rpg.godsetBackup) return false;

  const backup = user.rpg.godsetBackup;

  
  user.rpg.level = backup.level || 1;
  user.rpg.exp = backup.exp || 0;
  user.rpg.rank = backup.rank || "Novice";
  user.rpg.stats = backup.stats ? { ...backup.stats } : {};
  user.rpg.equipped = backup.equipped ? { ...backup.equipped } : {};

  
  user.rpg.items = (user.rpg.items || []).filter(item => !item.isGodset);
  user.rpg.isGodMode = false;

  
  user.rpg.power = calculateRpgPower(user);

  
  user.rpg.godsetBackup = undefined;
  user.markModified("rpg");
  await user.save();

  if (client) {
    try {
      const discordUser = await client.users.fetch(userId).catch(() => null);
      if (discordUser) {
        const dmChannel = await discordUser.createDM().catch(() => null);
        if (dmChannel) {
          await dmChannel.send(`⚠️ **[CokeBot]** God Set của bạn đã bị thu hồi/hết hạn. Nhân vật của bạn đã được khôi phục về trạng thái trước đó.`).catch(() => null);
        }
      }
    } catch (err) {
      console.error(`Failed to send godset revocation notification to ${userId}:`, err);
    }
  }

  return true;
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
  
  const seed = item.id || 1;
  const pseudoRandom = (Math.sin(seed) + 1) / 2; 
  return Math.floor((10 + pseudoRandom * 90) * 10) / 10;
};

const findRpgItemGlobal = async (itemId) => {
  const User = require("../models/User");
  const owner = await User.findOne({ "rpg.items.id": Number(itemId) }).exec();
  if (!owner) return null;
  const item = owner.rpg.items.find((it) => Number(it.id) === Number(itemId));
  return { item, owner };
};

const seedUpgradeStones = async (client) => {
  const Item = require("../models/cokemon/Item");
  const STONES_TO_SEED = [
    { item_id: "somber-1", name: "Somber Smithing Stone [1]", description: "Đá Somber cấp 1 dùng để nâng cấp vũ khí thường lên +1 -> +3", item_type: "tool", price: 5000, emoji: "<:Somber1:1516030370099761322>" },
    { item_id: "somber-2", name: "Somber Smithing Stone [2]", description: "Đá Somber cấp 2 dùng để nâng cấp vũ khí thường lên +4 -> +6", item_type: "tool", price: 10000, emoji: "<:Somber2:1516030372901687347>" },
    { item_id: "somber-3", name: "Somber Smithing Stone [3]", description: "Đá Somber cấp 3 dùng để nâng cấp vũ khí thường lên +7 -> +9", item_type: "tool", price: 20000, emoji: "<:Somber3:1516030375443566675>" },
    { item_id: "somber-4", name: "Somber Smithing Stone [4]", description: "Đá Somber cấp 4 dùng để nâng cấp vũ khí thường lên +10 -> +12. Nhận từ Boss theo giờ.", item_type: "tool", price: null, emoji: "<:Somber4:1516030379369431091>" },
    { item_id: "somber-5", name: "Somber Smithing Stone [5]", description: "Đá Somber cấp 5 dùng để nâng cấp vũ khí thường lên +13 -> +15. Nhận từ Boss theo giờ.", item_type: "tool", price: null, emoji: "<:Somber5:1516030385241329746>" },
    { item_id: "somber-6", name: "Somber Smithing Stone [6]", description: "Đá Somber cấp 6 dùng để nâng cấp vũ khí thường lên +16 -> +18. Nhận từ Boss theo giờ.", item_type: "tool", price: null, emoji: "<:Somber6:1516030387782942880>" },
    { item_id: "somber-7", name: "Somber Smithing Stone [7]", description: "Đá Somber cấp 7 dùng để nâng cấp vũ khí thường lên +19 -> +21. Nhận từ Boss cấp Thượng Nhân.", item_type: "tool", price: null, emoji: "<:Somber7:1516030382762496191>" },
    { item_id: "somber-8", name: "Somber Smithing Stone [8]", description: "Đá Somber cấp 8 dùng để nâng cấp vũ khí thường lên +22 -> +24. Nhận từ Boss cấp Thượng Nhân.", item_type: "tool", price: null, emoji: "<:Somber8:1516030389855060018>" },
    { item_id: "somber-9", name: "Somber Ancient Dragon Smithing Stone", description: "Đá Somber rồng cổ đại dùng để nâng cấp vũ khí thường lên tối đa +25. Nhận từ Boss cấp Thượng Nhân.", item_type: "tool", price: null, emoji: "<:Somber9:1516030391960735905>" },
    { item_id: "cristal-1", name: "Cristal Smithing Stone [1]", description: "Đá Cristal cấp 1 dùng để nâng cấp vũ khí dungeon lên +1. Nhận khi diệt Boss Dungeon Chương 1.", item_type: "tool", price: null, emoji: "<:Cristal1:1516030438529961985>" },
    { item_id: "cristal-2", name: "Cristal Smithing Stone [2]", description: "Đá Cristal cấp 2 dùng để nâng cấp vũ khí dungeon lên +2. Nhận khi diệt Boss Dungeon Chương 2.", item_type: "tool", price: null, emoji: "<:Cristal2:1516030440840888390>" },
    { item_id: "cristal-3", name: "Cristal Smithing Stone [3]", description: "Đá Cristal cấp 3 dùng để nâng cấp vũ khí dungeon lên +3. Nhận khi diệt Boss Dungeon Chương 3.", item_type: "tool", price: null, emoji: "<:Cristal3:1516030443089170512>" },
    { item_id: "cristal-4", name: "Cristal Smithing Stone [4]", description: "Đá Cristal cấp 4 dùng để nâng cấp vũ khí dungeon lên +4. Nhận khi diệt Boss Dungeon Chương 4.", item_type: "tool", price: null, emoji: "<:Cristal4:1516030446465712178>" },
    { item_id: "cristal-5", name: "Cristal Smithing Stone [5]", description: "Đá Cristal cấp 5 dùng để nâng cấp vũ khí dungeon lên +5. Nhận khi diệt Boss Dungeon Chương 5.", item_type: "tool", price: null, emoji: "<:Cristal5:1516030455785193595>" },
    { item_id: "cristal-6", name: "Cristal Smithing Stone [6]", description: "Đá Cristal cấp 6 dùng để nâng cấp vũ khí dungeon lên +6. Nhận khi diệt Boss Dungeon Chương 6.", item_type: "tool", price: null, emoji: "<:Cristal6:1516030458301907014>" },
    { item_id: "cristal-7", name: "Cristal Smithing Stone [7]", description: "Đá Cristal cấp 7 dùng để nâng cấp vũ khí dungeon lên +7.", item_type: "tool", price: null, emoji: "<:Cristal7:1516030460004663408>" },
    { item_id: "cristal-8", name: "Cristal Smithing Stone [8]", description: "Đá Cristal cấp 8 dùng để nâng cấp vũ khí dungeon lên +8.", item_type: "tool", price: null, emoji: "<:Cristal8:1516030462970302555>" },
    { item_id: "cristal-9", name: "Cristal Ancient Dragon Smithing Stone", description: "Đá Cristal rồng cổ đại dùng để nâng cấp vũ khí dungeon lên tối đa +10.", item_type: "tool", price: null, emoji: "<:Cristal9:1516030465461715005>" },
  ];

  for (const stone of STONES_TO_SEED) {
    let dbStone = await Item.findOne({ item_id: stone.item_id });
    if (!dbStone) {
      dbStone = await Item.create(stone);
      console.log(`💎 Seeded upgrade stone in DB: ${stone.item_id}`);
    } else {
      let changed = false;
      if (dbStone.price !== stone.price) { dbStone.price = stone.price; changed = true; }
      if (dbStone.emoji !== stone.emoji) { dbStone.emoji = stone.emoji; changed = true; }
      if (dbStone.name !== stone.name) { dbStone.name = stone.name; changed = true; }
      if (dbStone.description !== stone.description) { dbStone.description = stone.description; changed = true; }
      if (changed) {
        await dbStone.save();
        console.log(`💎 Updated upgrade stone in DB: ${stone.item_id}`);
      }
    }

    const cachedIdx = client.allItems.findIndex((i) => i.item_id === stone.item_id);
    const stoneObj = dbStone.toObject ? dbStone.toObject() : dbStone;
    if (cachedIdx > -1) {
      client.allItems[cachedIdx] = stoneObj;
    } else {
      client.allItems.push(stoneObj);
    }
  }
};



module.exports = {
  getEquippedPet,
  getEquippedPetBonuses,
  addPetExp,
  getPetCombatStats,
  petAttackDamage,
  getPetAttackLog,
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
  generateGearStats,
  generateRpgGearDrop,
  addRpgGearToUser,
  findRpgItem,
  findRpgItemGlobal,
  equipRpgItem,
  unequipRpgSlot,
  sellRpgItem,
  revokeRpgGodset,
  getBossForPower,
  getItemQuality,
  getGearDisplayName,
  getItemImageFile,
  getWeaponPower,
  WEAPON_SETS,
  getWeaponSetBonus,
  computeCombatStats,
  getPhysicalMitigation,
  getMagicalMitigation,
  emptyStats,
  getStartingStats,
  sanitizeRpgStats,
  getAllocatedPoints,
  getAvailablePoints,
  getWeaponScaling,
  getLegacyMapping,
  dungeonWeapons,
  dungeonKeys,
  seedUpgradeStones,
  isDungeonWeapon,
  isDungeonWeaponHelper,
  isTopTierWeapon,
  getDungeonWeaponKey,
  getCharacterAssetPath,
  subTypes,
};
