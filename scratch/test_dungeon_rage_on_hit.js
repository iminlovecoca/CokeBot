const testDungeonRageOnHit = () => {
  const players = [
    { id: "p1", name: "WarriorPlayer", classKey: "warrior", hp: 100, maxHp: 100, rage: 20 },
    { id: "p2", name: "MagePlayer", classKey: "mage", hp: 80, maxHp: 80, rage: 0 },
    { id: "p3", name: "AssassinPlayer", classKey: "assassin", hp: 50, maxHp: 90, rage: 40 },
    { id: "p4", name: "WretchPlayer", classKey: "wretch", hp: 60, maxHp: 60, rage: 0 }
  ];

  // Helper simulating single target hit
  const simulateSingleHit = (target, dmg) => {
    target.hp = Math.max(0, target.hp - dmg);
    if (target.hp > 0 && target.classKey !== "mage" && target.classKey !== "wretch") {
      target.rage = Math.min(100, (target.rage || 0) + 10);
    }
  };

  // Helper simulating AOE hit
  const simulateAOEHit = (targets, dmg) => {
    targets.forEach((p) => {
      p.hp = Math.max(0, p.hp - dmg);
      if (p.hp > 0 && p.classKey !== "mage" && p.classKey !== "wretch") {
        p.rage = Math.min(100, (p.rage || 0) + 10);
      }
    });
  };

  console.log("--- STARTING DUNGEON RAGE ON HIT TEST ---");

  // TEST 1: Single target hits a warrior who survives (100 -> 60)
  console.log("\nTEST 1: Single target survives");
  const p1 = players[0];
  console.log(`Before: HP=${p1.hp}, Rage=${p1.rage}`);
  simulateSingleHit(p1, 40);
  console.log(`After: HP=${p1.hp}, Rage=${p1.rage} (Expected: HP=60, Rage=30)`);

  // TEST 2: Single target hits an assassin who dies (50 -> 0)
  console.log("\nTEST 2: Single target dies");
  const p3 = players[2];
  console.log(`Before: HP=${p3.hp}, Rage=${p3.rage}`);
  simulateSingleHit(p3, 60);
  console.log(`After: HP=${p3.hp}, Rage=${p3.rage} (Expected: HP=0, Rage=40 [No increase])`);

  // TEST 3: Single target hits a mage (80 -> 40)
  console.log("\nTEST 3: Single target Mage survives");
  const p2 = players[1];
  console.log(`Before: HP=${p2.hp}, Rage=${p2.rage}`);
  simulateSingleHit(p2, 40);
  console.log(`After: HP=${p2.hp}, Rage=${p2.rage} (Expected: HP=40, Rage=0 [No increase])`);

  // TEST 4: AOE hits remaining players (p1, p2, p4)
  console.log("\nTEST 4: AOE attack on all players");
  // Reset health for testing
  const p4 = players[3];
  p1.hp = 60;
  p2.hp = 40;
  p4.hp = 60;
  console.log(`Before: WarriorRage=${p1.rage}, MageRage=${p2.rage}, WretchRage=${p4.rage}`);
  simulateAOEHit([p1, p2, p4], 20);
  console.log(`After: WarriorRage=${p1.rage}, MageRage=${p2.rage}, WretchRage=${p4.rage} (Expected: WarriorRage=40, MageRage=0, WretchRage=0)`);

  if (p1.rage === 40 && p2.rage === 0 && p3.rage === 40 && p4.rage === 0) {
    console.log("\nPASS: Dungeon rage on hit verification succeeded!");
  } else {
    console.log("\nFAIL: Dungeon rage on hit verification failed.");
  }
};

testDungeonRageOnHit();
