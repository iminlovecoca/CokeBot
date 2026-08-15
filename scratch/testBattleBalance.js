const { simulateBattle } = require("../rpg/battle");

// Test 1: Mythic Player (Lv.80 Assassin) vs Mythic Bot (Lv.80 Paladin Titan)
const p1 = {
  userId: "p1",
  rpg: {
    name: "Player Assassin",
    level: 80,
    classKey: "assassin",
    stats: { dex: 160, str: 90, arc: 40, vigor: 50, pr: 20, mr: 15, int: 10 },
    equippedWeapon: { power: 1500, subType: "riverofblood" },
    equippedPet: { level: 70 }
  }
};

const p2 = {
  userId: "bot_pvp_13",
  rpg: {
    name: "Bot Titan",
    level: 80,
    classKey: "paladin",
    stats: { vigor: 177, pr: 71, mr: 53, str: 53, dex: 10, int: 10, arc: 10 },
    equippedWeapon: { power: 1500, subType: "shieldhex" },
    equippedPet: { level: 70 }
  }
};

const res = simulateBattle(p1, p2);
console.log("=== BATTLE SIMULATION TEST ===");
console.log(`P1 (${res.p1.name} - ${res.p1.classKey.toUpperCase()}): Max HP = ${res.p1.maxHp.toLocaleString()}`);
console.log(`P2 (${res.p2.name} - ${res.p2.classKey.toUpperCase()}): Max HP = ${res.p2.maxHp.toLocaleString()}`);
console.log(`Turns: ${res.turns}, Winner: ${res.winner?.name || "Draw"}`);
console.log("Logs sample (First 5 turns):");
console.log(res.logs.slice(0, 6).join("\n"));
