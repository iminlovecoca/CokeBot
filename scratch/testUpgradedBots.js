const { simulateBattle } = require("../rpg/battle");

// Test: Lv.80 Player Assassin vs Upgraded Lv.82 Mythic Bot Titan (Paladin)
const player = {
  userId: "real_player",
  rpg: {
    name: "Player Assassin",
    level: 80,
    classKey: "assassin",
    stats: { dex: 450, str: 280, arc: 150, vigor: 180, pr: 50, mr: 40, int: 20 },
    items: [
      { id: "pw1", slot: "weapon", power: 4500, subType: "riverofblood", enhance: 12 },
      { id: "pa1", slot: "armor", power: 2800, enhance: 12 },
      { id: "ph1", slot: "helmet", power: 2100, enhance: 12 },
      { id: "pb1", slot: "boots", power: 2100, enhance: 12 }
    ],
    equipped: { weapon: "pw1", armor: "pa1", helmet: "ph1", boots: "pb1" },
    equippedPet: { level: 75 }
  }
};

const botTitan = {
  userId: "bot_pvp_13",
  rpg: {
    name: "Titan",
    level: 82,
    classKey: "paladin",
    stats: { vigor: 600, pr: 275, mr: 200, str: 175, dex: 50, int: 10, arc: 10 },
    items: [
      { id: "w_bot_pvp_13", slot: "weapon", power: 5100, subType: "shieldhex", enhance: 12 },
      { id: "a_bot_pvp_13", slot: "armor", power: 3400, enhance: 12 },
      { id: "h_bot_pvp_13", slot: "helmet", power: 2500, enhance: 12 },
      { id: "b_bot_pvp_13", slot: "boots", power: 2500, enhance: 12 }
    ],
    equipped: { weapon: "w_bot_pvp_13", armor: "a_bot_pvp_13", helmet: "h_bot_pvp_13", boots: "b_bot_pvp_13" },
    equippedPet: { level: 78 }
  }
};

const res = simulateBattle(player, botTitan);
console.log("=== BATTLE VS UPGRADED MYTHIC BOT TITAN ===");
console.log(`Player Max HP: ${res.p1.maxHp.toLocaleString()} | Bot Titan Max HP: ${res.p2.maxHp.toLocaleString()}`);
console.log(`Turns: ${res.turns} | Winner: ${res.winner?.name}`);
console.log("\nLast 6 Logs:");
console.log(res.logs.slice(-6).join("\n"));
