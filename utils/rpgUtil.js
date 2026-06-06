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

const emptyStats = () => ({
  str: 0,
  int: 0,
  agi: 0,
  vit: 0,
  def: 0,
  luck: 0,
});

const formatStats = (stats = {}) =>
  Object.entries(stats)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key.toUpperCase()} +${value}`)
    .join(", ");

const getEffectiveRpgStats = (user) => {
  const stats = emptyStats();
  if (!user?.rpg?.classKey) return stats;

  const rpgClass = getRpgClass(user.rpg.classKey);
  const baseStats = rpgClass?.stats || user.rpg.stats || {};
  const level = user.rpg.level || 1;

  for (const stat of Object.keys(stats)) {
    const base = baseStats[stat] || 0;
    // Scale base stats: base + base * (level - 1) * 0.1
    stats[stat] = base + Math.floor(base * (level - 1) * 0.1);
  }

  for (const item of Object.values(getEquippedItems(user))) {
    for (const [stat, value] of Object.entries(item.stats || {})) {
      stats[stat] = (stats[stat] || 0) + value;
    }
  }
  return stats;
};

const calculateRpgPower = (user) => {
  return Object.values(getEquippedItems(user)).reduce(
    (total, item) => total + (item.power || 0),
    0,
  );
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
  const statPool = slotConfig.stat_pool || ["str", "int", "agi", "vit", "def", "luck"];
  const statBase = rarityConfig.stat || 1;
  const levelBonus = Math.floor((level || 1) / 12);
  const stats = {};

  for (const stat of pickUnique(statPool, 2)) {
    stats[stat] = statBase + levelBonus + Math.floor(Math.random() * (statBase + 1));
  }

  return stats;
};

const generateRpgGearDrop = async (user, options = {}) => {
  const rpgClass = getRpgClass(user.rpg.classKey);
  const effectiveStats = getEffectiveRpgStats(user);
  const luck = effectiveStats.luck || 0;
  const dropBonus = rpgClass.bonuses?.dropRate || 0;
  const gearDropConfig = config.rpg.gear_drop || {};
  const baseDropRate = gearDropConfig.drop_rate ?? config.rpg.gear_drop_rate ?? 0;
  const luckDropRate = luck * (gearDropConfig.luck_rate_per_point ?? 0);
  const dropRate = Math.min(
    gearDropConfig.max_drop_rate ?? 1,
    baseDropRate + dropBonus + luckDropRate + (options.dropRateBonus || 0),
  );

  if (!options.forceDrop && Math.random() > dropRate) return null;

  const [slot] = weightedPick(
    Object.entries(config.rpg.gear_slots),
    ([, value]) => value.rate ?? value.weight ?? 0,
  );
  const rarityEntries = Object.entries(config.rpg.gear_rarities).filter(
    ([rarity]) =>
      !options.allowedRarities || options.allowedRarities.includes(rarity),
  );
  const [rarity, rarityConfig] = weightedPick(
    rarityEntries.length ? rarityEntries : Object.entries(config.rpg.gear_rarities),
    ([, value]) => value.rate ?? value.weight ?? 0,
  );

  const level = user.rpg.level || 1;
  const levelBonus = Math.floor(level * 4.5);
  const variance = 0.9 + Math.random() * 0.2;
  const power = Math.floor((rarityConfig.power + levelBonus) * variance);
  const stats = generateGearStats(slot, rarityConfig, level);
  const quality = Math.floor((((variance - 0.9) / 0.2) * 90 + 10) * 10) / 10;
  const sellPrice = Math.floor((rarityConfig.sell + level * 18) * variance);
  const name = `${rarity} ${config.rpg.gear_slot_names[slot]}`;

  const compareStats = (s1 = {}, s2 = {}) => {
    const keys1 = Object.keys(s1).sort();
    const keys2 = Object.keys(s2).sort();
    if (keys1.length !== keys2.length) return false;
    return keys1.every((key) => s1[key] === s2[key]);
  };

  const User = require("../models/User");
  let itemId = null;
  const users = await User.find({ "rpg.items": { $exists: true } }).exec();
  for (const u of users) {
    for (const item of u.rpg.items) {
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
    if (itemId) break;
  }

  if (!itemId) {
    const topUser = await User.findOne().sort({ "rpg.lastItemId": -1 }).exec();
    itemId = Math.max(1, (topUser?.rpg?.lastItemId || 0) + 1);
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
    imageKey: `todo_${slot}_${rarity.toLowerCase()}`,
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
};
