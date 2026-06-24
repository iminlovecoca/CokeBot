const dungeon = require("../commands/rpg/dungeon");

const testTargetingAndMadness = () => {
  console.log("🧪 BẮT ĐẦU KIỂM THỬ TARGETING VÀ MADNESS DUNGEON...");

  // 1. Test madness increment scaling for each chapter
  console.log("\n--- 1. Kiểm thử Madness Increment theo Chapter ---");
  for (let chapter = 1; chapter <= 6; chapter++) {
    const madnessIncrement = 0.05 + (chapter - 1) * 0.03;
    console.log(`Chương ${chapter}: Tăng điên loạn mỗi lượt = +${(madnessIncrement * 100).toFixed(0)}% (Sức mạnh tăng x${(1 + madnessIncrement).toFixed(2)})`);
  }

  // 2. Test selectBossTarget logic
  console.log("\n--- 2. Kiểm thử Tỉ lệ chọn Mục tiêu (Taunt) ---");
  
  // We need to access the selectBossTarget function. Since it is local in dungeon.js,
  // we can copy the logic here to verify its mathematical correctness.
  const selectBossTargetMock = (alivePlayers) => {
    const classWeights = {
      paladin: 300,
      warrior: 250,
      wretch: 180,
      assassin: 120,
      mage: 75,
      archer: 75,
    };

    let totalWeight = 0;
    const weightedPlayers = alivePlayers.map((p) => {
      const classKey = (p.classKey || "wretch").toLowerCase();
      const weight = classWeights[classKey] !== undefined ? classWeights[classKey] : 10;
      totalWeight += weight;
      return { player: p, weight };
    });

    let roll = Math.random() * totalWeight;
    for (const wp of weightedPlayers) {
      roll -= wp.weight;
      if (roll <= 0) {
        return wp.player;
      }
    }
    return alivePlayers[0];
  };

  const runSimulation = (players, iterations = 100000) => {
    const counts = {};
    players.forEach(p => counts[p.name] = 0);

    for (let i = 0; i < iterations; i++) {
      const target = selectBossTargetMock(players);
      counts[target.name]++;
    }

    console.log(`\nĐội hình tham gia: ${players.map(p => `${p.name} (${p.classKey})`).join(", ")}`);
    console.log(`Kết quả mô phỏng ${iterations.toLocaleString()} lần boss đánh:`);
    players.forEach(p => {
      const percentage = (counts[p.name] / iterations * 100).toFixed(2);
      console.log(`- ${p.name} (${p.classKey}): Bị đánh ${counts[p.name].toLocaleString()} lần (~${percentage}%)`);
    });
  };

  // Test Case A: Đội hình đầy đủ (Paladin, Warrior, Mage)
  runSimulation([
    { name: "Người chơi 1", classKey: "paladin" },
    { name: "Người chơi 2", classKey: "warrior" },
    { name: "Người chơi 3", classKey: "mage" }
  ]);

  // Test Case B: Đội hình không có Paladin (Warrior, Assassin, Archer)
  runSimulation([
    { name: "Người chơi 1", classKey: "warrior" },
    { name: "Người chơi 2", classKey: "assassin" },
    { name: "Người chơi 3", classKey: "archer" }
  ]);

  // Test Case C: Đội hình 2 Paladin và 1 Assassin
  runSimulation([
    { name: "Người chơi 1", classKey: "paladin" },
    { name: "Người chơi 2", classKey: "paladin" },
    { name: "Người chơi 3", classKey: "assassin" }
  ]);
};

testTargetingAndMadness();
