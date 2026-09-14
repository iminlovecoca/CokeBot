const path = require("path");
const fs = require("fs");

const SKIN_PRICES = {
  
  "Warrior_02.png": 250000,
  "Warrior_03.png": 300000,
  "Warrior_04.png": 350000,
  "WarriorMecha.gif": { coke: 3500000, souls: 125 },
  
  "Assassin_13.png": 250000,
  "Assassin_14.png": 280000,
  "Assassin_15.png": 320000,
  "Assassin_16.png": 350000,
  
  "Mage_07.png": 250000,
  "Mage_08.png": 300000,
  "Mage_10.png": 350000,
  
  "Paladin_18.png": 250000,
  "Paladin_20.png": 350000,
};

const HONOR_RANKS = ["Legendary", "Mythic", "Ancient", "Divine"];
const HONOR_SKIN_PATTERN = /^([A-Z][A-Za-z]+)Honor(Legendary|Mythic|Ancient|Divine)(?:_(male|female))?\.(png|gif)$/i;

const getClassPrefix = (classKey) => {
  const normalized = String(classKey || "warrior").trim().toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const normalizeGender = (gender) => String(gender || "male").trim().toLowerCase() === "female" ? "female" : "male";

const getHonorSkinFile = (classKey, rankName, gender = "male") => {
  const rank = HONOR_RANKS.find(
    (value) => value.toLowerCase() === String(rankName || "").trim().toLowerCase(),
  );
  return rank ? `${getClassPrefix(classKey)}Honor${rank}_${normalizeGender(gender)}.png` : null;
};

const getHonorSkinFiles = (classKey, rankName) => ({
  male: getHonorSkinFile(classKey, rankName, "male"),
  female: getHonorSkinFile(classKey, rankName, "female"),
});

const getHonorSkinInfo = (skinFileName) => {
  const match = String(skinFileName || "").match(HONOR_SKIN_PATTERN);
  if (!match) return null;
  const rank = HONOR_RANKS.find((value) => value.toLowerCase() === match[2].toLowerCase());
  return rank ? {
    className: match[1],
    rank,
    gender: match[3] ? normalizeGender(match[3]) : null,
    fileName: skinFileName,
  } : null;
};

const isHonorSkin = (skinFileName) => Boolean(getHonorSkinInfo(skinFileName));

const getGenderFromCharacterAsset = (assetFile) =>
  /_female(?:\.[a-z0-9]+)?$/i.test(String(assetFile || "")) ? "female" : "male";

const isSkinForGender = (skinFileName, gender) => {
  const honorInfo = getHonorSkinInfo(skinFileName);
  return !honorInfo || honorInfo.gender === null || honorInfo.gender === normalizeGender(gender);
};

const getHonorSkinOwnershipKeys = (skinFileName) => {
  const honorInfo = getHonorSkinInfo(skinFileName);
  if (!honorInfo || !honorInfo.gender) return [skinFileName];
  return [skinFileName, `${honorInfo.className}Honor${honorInfo.rank}.png`];
};

const getSkinPrice = (skinFileName) => {
  const name = skinFileName.toLowerCase();

  if (isHonorSkin(skinFileName) || name.includes("ux")) {
    return null; 
  }
  if (SKIN_PRICES[skinFileName]) {
    return SKIN_PRICES[skinFileName];
  }
  
  return 300000;
};

const resolveGachaSkinName = (user, banner) => {
  const classKey = user.rpg.classKey || "warrior";
  const classPrefix = classKey.charAt(0).toUpperCase() + classKey.slice(1);
  
  
  let suffix = banner.weaponKey || "UX";
  suffix = suffix.replace(/\.png$/i, "");
  
  
  if (suffix.toLowerCase().startsWith(classPrefix.toLowerCase())) {
    return suffix + ".png";
  }
  
  return classPrefix + suffix + ".png";
};

module.exports = {
  prices: SKIN_PRICES,
  honorRanks: HONOR_RANKS,
  getHonorSkinFile,
  getHonorSkinFiles,
  getHonorSkinInfo,
  isHonorSkin,
  getGenderFromCharacterAsset,
  isSkinForGender,
  getHonorSkinOwnershipKeys,
  getSkinPrice,
  resolveGachaSkinName,
};
