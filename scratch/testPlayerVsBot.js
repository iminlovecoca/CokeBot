const { simulateBattle } = require("../rpg/battle");

// A well-built Lv.125 End-Game Player Assassin
const endPlayer = {
  userId: "pro_player",
  rpg: {
    name: "Vua Sát Thủ (Pro Player)",
    level: 125,
    classKey: "assassin",
    stats: { dex: 1500, str: 900, arc: 500, vigor: 500, pr: 120, mr: 80, int: 20 },
    items: [
      { id: "pw1", name: "River of Blood Tuyệt Thế +15", slot: "weapon", power: 13500, subType: "riverofblood", enhance: 15 },
      { id: "pa1", name: "Thần Giáp Huyết Nguyệt +15", slot: "armor", power: 9000, enhance: 15 },
      { id: "ph1", name: "Mặt Nạ Vô Danh Thần Cấp +15", slot: "helmet", power: 6500, enhance: 15 },
      { id: "pb1", name: "Chiến Hài Xé Gió +15", slot: "boots", power: 6500, enhance: 15 }
    ],
    equipped: { weapon: "pw1", armor: "pa1", helmet: "ph1", boots: "pb1" },
    equippedPet: { key: "phoenix", name: "Phượng Hoàng", level: 100, tier: "Divine" }
  }
};

// Divine Bot Berserk (Lv.128 Warrior)
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
    equippedPet: { key: "shenlong", name: "Thần Long", level: 100, tier: "Divine" }
  }
};

const res = simulateBattle(endPlayer, botBerserk);
console.log("=== SIMULATION: END-GAME PLAYER VS SUPREME BOT BERSERK ===");
console.log(`Player Max HP: ${res.p1.maxHp.toLocaleString()} | Bot Berserk Max HP: ${res.p2.maxHp.toLocaleString()}`);
console.log(`Turns: ${res.turns} | Winner: ${res.winner?.name}`);
console.log("\nLast 8 Logs:");
console.log(res.logs.slice(-8).join("\n"));
