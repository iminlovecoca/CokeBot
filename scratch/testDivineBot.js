const { simulateBattle } = require("../rpg/battle");

// Test: Lv.100 Player Mage vs Supreme Divine Bot Berserk (Lv.128 Warrior)
const playerMage = {
  userId: "player_mage",
  rpg: {
    name: "Player Mage",
    level: 100,
    classKey: "mage",
    stats: { int: 650, arc: 350, mr: 180, vigor: 250, pr: 80, str: 20, dex: 40 },
    items: [
      { id: "pw1", slot: "weapon", power: 7500, subType: "bluestaff", enhance: 14 },
      { id: "pa1", slot: "armor", power: 4500, enhance: 14 },
      { id: "ph1", slot: "helmet", power: 3200, enhance: 14 },
      { id: "pb1", slot: "boots", power: 3200, enhance: 14 }
    ],
    equipped: { weapon: "pw1", armor: "pa1", helmet: "ph1", boots: "pb1" },
    equippedPet: { level: 90 }
  }
};

const botBerserk = {
  userId: "bot_pvp_19",
  rpg: {
    name: "Berserk",
    level: 128,
    classKey: "warrior",
    stats: { str: 1368, vigor: 1224, pr: 504, dex: 504, int: 10, mr: 10, arc: 10 },
    items: [
      { id: "w_bot_pvp_19", slot: "weapon", power: 13800, subType: "eclipsesoul", enhance: 15 },
      { id: "a_bot_pvp_19", slot: "armor", power: 9200, enhance: 15 },
      { id: "h_bot_pvp_19", slot: "helmet", power: 6800, enhance: 15 },
      { id: "b_bot_pvp_19", slot: "boots", power: 6800, enhance: 15 }
    ],
    equipped: { weapon: "w_bot_pvp_19", armor: "a_bot_pvp_19", helmet: "h_bot_pvp_19", boots: "b_bot_pvp_19" },
    equippedPet: { level: 100 }
  }
};

const res = simulateBattle(playerMage, botBerserk);
console.log("=== BATTLE VS SUPREME DIVINE BOT BERSERK ===");
console.log(`Player Max HP: ${res.p1.maxHp.toLocaleString()} | Bot Berserk Max HP: ${res.p2.maxHp.toLocaleString()}`);
console.log(`Turns: ${res.turns} | Winner: ${res.winner?.name}`);
console.log("\nLast 6 Logs:");
console.log(res.logs.slice(-6).join("\n"));
