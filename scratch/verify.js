const User = require("../models/User");

// Mock mongoose findOne to avoid buffering timeout without DB connection
User.findOne = () => ({
  lean: () => ({
    exec: async () => null
  }),
  sort: () => ({
    exec: async () => null
  }),
  exec: async () => null
});

const {
  emptyStats,
  getEffectiveRpgStats,
  calculateRpgPower,
  generateRpgGearDrop,
  getGearDisplayName,
  getItemImageFile,
  getWeaponPower
} = require("../utils/rpgUtil");

console.log("=== VERIFYING STATS AND SCALING SYSTEM ===");

// 1. Test emptyStats
const baseStats = emptyStats();
console.log("Empty stats template:", baseStats);
if (!baseStats.hasOwnProperty("vigor") || !baseStats.hasOwnProperty("pr") || !baseStats.hasOwnProperty("mr")) {
  console.error("FAIL: missing vigor, pr, or mr in emptyStats");
  process.exit(1);
}
console.log("SUCCESS: emptyStats contains correct keys.");

// 2. Mock User
const mockUser = {
  userId: "123456",
  rpg: {
    classKey: "warrior",
    level: 10,
    stats: {
      vigor: 10,
      str: 5,
      dex: 5,
    },
    equipped: {},
    items: [],
    lastItemId: 0
  }
};

// 3. Test getEffectiveRpgStats
const effective = getEffectiveRpgStats(mockUser);
console.log("Effective stats for level 10 mock user (vigor:10, str:5, dex:5):", effective);
if (effective.vigor !== 10 || effective.str !== 5 || effective.dex !== 5) {
  console.error("FAIL: effective stats do not match mock stats directly");
  process.exit(1);
}
console.log("SUCCESS: getEffectiveRpgStats reads base stats correctly.");

// 4. Test generateRpgGearDrop Mocking
const mockDropGenerator = async () => {
  // Let's mock a drop
  const weaponItem = await generateRpgGearDrop(mockUser, { forceDrop: true, slot: "weapon", rarity: "Legendary" });
  console.log("Generated Legendary Weapon:", {
    id: weaponItem.id,
    name: getGearDisplayName(weaponItem),
    subType: weaponItem.subType,
    rarity: weaponItem.rarity,
    power: weaponItem.power,
    scaling: weaponItem.scaling,
    imageFile: getItemImageFile(weaponItem)
  });

  const subName = weaponItem.subType.toLowerCase();
  let correctScaling = false;
  if (subName.includes("claymore") && weaponItem.scaling.str === "A" && weaponItem.scaling.int === "B") {
    correctScaling = true;
  } else if (subName.includes("rapier") && weaponItem.scaling.dex === "A" && weaponItem.scaling.int === "B") {
    correctScaling = true;
  } else if (subName.includes("halberd") && weaponItem.scaling.str === "A" && weaponItem.scaling.arc === "B") {
    correctScaling = true;
  } else if ((subName.includes("sword") || subName.includes("longsword")) && weaponItem.scaling.str === "A" && weaponItem.scaling.regular !== "S" && weaponItem.scaling.dex === "B") {
    // Note: 'regular' check not needed, just normal sword check
    correctScaling = true;
  } else if ((subName.includes("sword") || subName.includes("longsword")) && weaponItem.scaling.str === "A" && weaponItem.scaling.dex === "B") {
    correctScaling = true;
  } else if (subName.includes("staff") && weaponItem.scaling.int === "A" && weaponItem.scaling.arc === "B") {
    correctScaling = true;
  } else if (subName.includes("dagger") && weaponItem.scaling.dex === "A" && weaponItem.scaling.arc === "B") {
    correctScaling = true;
  }

  if (!correctScaling) {
    console.error("FAIL: Legendary weapon scaling incorrect for subtype " + weaponItem.subType, weaponItem.scaling);
    process.exit(1);
  }
  console.log("SUCCESS: scaling grades assigned correctly.");

  const armorItem = await generateRpgGearDrop(mockUser, { forceDrop: true, slot: "armor", rarity: "Common" });
  console.log("Generated Common Armor:", {
    id: armorItem.id,
    name: getGearDisplayName(armorItem),
    subType: armorItem.subType,
    stats: armorItem.stats,
    imageFile: getItemImageFile(armorItem)
  });

  // Calculate scaled weapon power
  const scaledPower = getWeaponPower(weaponItem, effective);
  console.log(`Weapon base power: ${weaponItem.power}, scaled power: ${scaledPower}`);
  if (scaledPower <= weaponItem.power) {
    console.error("FAIL: weapon power did not scale up with stats");
    process.exit(1);
  }
  console.log("SUCCESS: weapon power scaled correctly.");

  // 5. Test new special weapon subtypes scaling
  console.log("Testing special weapon subtypes scaling...");
  // Dusk and Dawn and River of Blood are dungeon weapons (Ancient rarity forced, grades bumped by 1)
  // Ancient base: prim=S, sec=A → bumped: prim=S, sec=S
  const duskAndDawn = await generateRpgGearDrop(mockUser, { forceDrop: true, slot: "weapon", subType: "Dusk and Dawn", emoji: "<:DuskandDawn:1517552769270153277>" });
  if (duskAndDawn.scaling.int !== "S" || duskAndDawn.scaling.dex !== "S") {
    console.error("FAIL: Dusk and Dawn (INT + DEX) scaling incorrect:", duskAndDawn.scaling);
    process.exit(1);
  }
  const riverOfBlood = await generateRpgGearDrop(mockUser, { forceDrop: true, slot: "weapon", subType: "River of Blood", emoji: "<:RiverofBlood:1517552771824615424>" });
  if (riverOfBlood.scaling.arc !== "S" || riverOfBlood.scaling.dex !== "S") {
    console.error("FAIL: River of Blood (ARC + DEX) scaling incorrect:", riverOfBlood.scaling);
    process.exit(1);
  }
  console.log("SUCCESS: Special weapon scaling (Dusk and Dawn, River of Blood) verified.");
  console.log(`  Dusk and Dawn [${duskAndDawn.rarity}]: INT=${duskAndDawn.scaling.int}, DEX=${duskAndDawn.scaling.dex}`);
  console.log(`  River of Blood [${riverOfBlood.rarity}]: ARC=${riverOfBlood.scaling.arc}, DEX=${riverOfBlood.scaling.dex}`);
};

mockDropGenerator().then(() => {
  console.log("=== ALL TESTS PASSED SUCCESSFULLY! ===");
  process.exit(0);
}).catch(err => {
  console.error("CRITICAL ERROR IN TESTS:", err);
  process.exit(1);
});
