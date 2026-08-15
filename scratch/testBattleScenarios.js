const { simulateBattle } = require("../rpg/battle");

// Scenario 1: Balanced Equal Matchup (Mythic Lv.80 vs Mythic Lv.80)
const pMythic1 = {
  userId: "p1",
  rpg: {
    name: "Player Assassin",
    level: 80,
    classKey: "assassin",
    stats: { dex: 160, str: 90, arc: 40, vigor: 60, pr: 25, mr: 20, int: 10 },
    equippedWeapon: { power: 1500 },
    equippedPet: { level: 70 }
  }
};

const pMythic2 = {
  userId: "p2",
  rpg: {
    name: "Bot Titan (Paladin)",
    level: 80,
    classKey: "paladin",
    stats: { vigor: 177, pr: 71, mr: 53, str: 53, dex: 10, int: 10, arc: 10 },
    equippedWeapon: { power: 1500 },
    equippedPet: { level: 70 }
  }
};

const resEqual = simulateBattle(pMythic1, pMythic2);
console.log("=== SCENARIO 1: EQUAL MATCHUP (Lv.80 vs Lv.80) ===");
console.log(`P1 HP: ${resEqual.p1.maxHp.toLocaleString()} | P2 HP: ${resEqual.p2.maxHp.toLocaleString()}`);
console.log(`Turns: ${resEqual.turns} turns (Winner: ${resEqual.winner?.name})`);

// Scenario 2: Massive Outclass Matchup (Divine Lv.125 vs Common Lv.20)
const pDivine = {
  userId: "pDivine",
  rpg: {
    name: "Berserk (Divine)",
    level: 125,
    classKey: "warrior",
    stats: { str: 280, vigor: 260, pr: 120, dex: 100, int: 10, mr: 50, arc: 10 },
    equippedWeapon: { power: 6500 }, // +15 Divine Weapon
    equippedPet: { level: 99 }
  }
};

const pCommon = {
  userId: "pCommon",
  rpg: {
    name: "Shadow (Common)",
    level: 20,
    classKey: "assassin",
    stats: { dex: 25, str: 20, vigor: 15, pr: 8, mr: 8, int: 5, arc: 5 },
    equippedWeapon: { power: 250 },
    equippedPet: { level: 15 }
  }
};

const resOutclass = simulateBattle(pDivine, pCommon);
console.log("\n=== SCENARIO 2: OUTCLASS MATCHUP (Lv.125 Divine vs Lv.20 Common) ===");
console.log(`P1 Divine HP: ${resOutclass.p1.maxHp.toLocaleString()} | P2 Common HP: ${resOutclass.p2.maxHp.toLocaleString()}`);
console.log(`Turns: ${resOutclass.turns} turns (Winner: ${resOutclass.winner?.name})`);
console.log(`Turn 1 Action: ${resOutclass.logs[0] || "None"}`);
