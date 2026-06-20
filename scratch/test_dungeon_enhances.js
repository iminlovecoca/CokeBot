const { isDungeonWeapon } = require("../utils/rpgUtil");

// Mock item
const dungeonWeapon = {
  slot: "weapon",
  subType: "firesword",
  upgradeLevel: 0
};

const normalWeapon = {
  slot: "weapon",
  subType: "sword",
  upgradeLevel: 0
};

const getEnhanceCostAndMaterial = (item, currentLvl) => {
  const isDungeon = isDungeonWeapon(item);
  const nextLvl = currentLvl + 1;
  let cokeCost = 0;
  let stoneId = "";
  let stoneQty = 0;

  if (isDungeon) {
    cokeCost = Math.floor(20000 + currentLvl * 47777);
    if (nextLvl === 10) {
      stoneId = "cristal-9";
      stoneQty = 1;
    } else {
      const tier = Math.min(8, nextLvl);
      stoneId = `cristal-${tier}`;
      stoneQty = 1;
    }
  } else {
    cokeCost = Math.floor(10000 + currentLvl * 7916);
    if (nextLvl === 25) {
      stoneId = "somber-9";
      stoneQty = 1;
    } else {
      const tier = Math.floor((nextLvl - 1) / 3) + 1;
      stoneId = `somber-${tier}`;
      stoneQty = ((nextLvl - 1) % 3 + 1) * 2;
    }
  }

  return { cokeCost, stoneId, stoneQty };
};

console.log("=== TESTING ENHANCEMENT LOGIC FOR DUNGEON WEAPON ===");
for (let lvl = 0; lvl < 10; lvl++) {
  const result = getEnhanceCostAndMaterial(dungeonWeapon, lvl);
  console.log(`+${lvl} -> +${lvl + 1}: cost ${result.cokeCost.toLocaleString()} Coke, material ${result.stoneQty}x ${result.stoneId}`);
}

console.log("\n=== TESTING ENHANCEMENT LOGIC FOR NORMAL WEAPON (Sample levels) ===");
const sampleLevels = [0, 1, 2, 23, 24];
for (const lvl of sampleLevels) {
  const result = getEnhanceCostAndMaterial(normalWeapon, lvl);
  console.log(`+${lvl} -> +${lvl + 1}: cost ${result.cokeCost.toLocaleString()} Coke, material ${result.stoneQty}x ${result.stoneId}`);
}
