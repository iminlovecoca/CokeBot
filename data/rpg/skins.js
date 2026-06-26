const path = require("path");
const fs = require("fs");

const SKIN_PRICES = {
  // Warrior
  "Warrior_02.png": 250000,
  "Warrior_03.png": 300000,
  "Warrior_04.png": 350000,
  // Assassin
  "Assassin_13.png": 250000,
  "Assassin_14.png": 280000,
  "Assassin_15.png": 320000,
  "Assassin_16.png": 350000,
  // Mage
  "Mage_07.png": 250000,
  "Mage_08.png": 300000,
  "Mage_10.png": 350000,
  // Paladin
  "Paladin_18.png": 250000,
  "Paladin_20.png": 350000,
};

const getSkinPrice = (skinFileName) => {
  const name = skinFileName.toLowerCase();
  // Skins with "UX" in their name are limited (Gacha) skins
  if (name.includes("ux")) {
    return null; // Limited (Hữu hạn)
  }
  if (SKIN_PRICES[skinFileName]) {
    return SKIN_PRICES[skinFileName];
  }
  // Default fallback price for other skins
  return 300000;
};

const resolveGachaSkinName = (user, banner) => {
  const classKey = user.rpg.classKey || "warrior";
  const classPrefix = classKey.charAt(0).toUpperCase() + classKey.slice(1);
  
  // Use banner.weaponKey as the skin suffix (e.g. "UX", "UX1", "UX2")
  let suffix = banner.weaponKey || "UX";
  suffix = suffix.replace(/\.png$/i, "");
  
  // If the suffix already includes the class prefix, just return suffix + .png
  if (suffix.toLowerCase().startsWith(classPrefix.toLowerCase())) {
    return suffix + ".png";
  }
  
  return classPrefix + suffix + ".png";
};

module.exports = {
  prices: SKIN_PRICES,
  getSkinPrice,
  resolveGachaSkinName,
};
