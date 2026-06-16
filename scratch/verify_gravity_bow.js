const User = require("../models/User");

// Mock mongoose findOne/create to avoid buffering timeout without DB connection
User.findOne = () => ({
  lean: () => ({
    exec: async () => null
  }),
  sort: () => ({
    exec: async () => null
  }),
  exec: async () => null
});
User.create = async (data) => data;

const {
  generateRpgGearDrop,
  getWeaponScaling,
  subTypes,
  dungeonWeapons
} = require("../utils/rpgUtil");

async function check() {
  console.log("=== VERIFYING GRAVITY BOW AND SUBTYPES ===");
  
  // 1. Verify subtypes
  console.log("Subtypes of weapon:", subTypes.weapon);
  if (subTypes.weapon.length !== 3) {
    throw new Error(`FAIL: Subtypes length is not 3 (got: ${subTypes.weapon.length})`);
  }
  const names = subTypes.weapon.map(w => w.name);
  if (!names.includes("Longsword") || !names.includes("Staff") || !names.includes("Dagger")) {
    throw new Error("FAIL: Weapon subtypes contain items other than Longsword, Staff, and Dagger!");
  }
  console.log("✅ Weapon subtypes are clean!");

  // 2. Verify Gravity Bow is in dungeonWeapons
  const gb = dungeonWeapons.find(dw => dw.key === "gravitybow");
  if (!gb) {
    throw new Error("FAIL: gravitybow key not found in dungeonWeapons!");
  }
  console.log("✅ Gravity Bow found in dungeonWeapons:", gb);

  // 3. Verify Gravity Bow scaling
  const mockUser = {
    userId: "123456",
    rpg: {
      classKey: "warrior",
      level: 50,
      stats: { vigor: 50, str: 50, dex: 50, int: 50, arc: 50, pr: 10, mr: 10 },
      equipped: {},
      items: [],
      lastItemId: 100
    }
  };

  const gear = await generateRpgGearDrop(mockUser, {
    forceDrop: true,
    slot: "weapon",
    subType: "Gravity Bow"
  });

  console.log("Generated Gravity Bow:", gear.name);
  console.log("Gravity Bow Scaling:", gear.scaling);
  
  if (gear.scaling.dex !== "S" || gear.scaling.arc !== "S" || gear.scaling.int !== "A") {
    throw new Error(`FAIL: Gravity Bow scaling grades are incorrect! Expected (dex: S, arc: S, int: A), got: ${JSON.stringify(gear.scaling)}`);
  }
  console.log("✅ Gravity Bow scaling is correct!");

  console.log("=== ALL TESTS PASSED! ===");
}

check().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
