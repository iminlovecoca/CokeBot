const BattleCanvas = require("../rpg/battle/battleCanvas");
const fs = require("fs");
const path = require("path");

async function testKO() {
  const resultKO = await BattleCanvas.renderPvPImage(
    { rpg: { characterAsset: "Mage_male.png", battleRank: "Mythic" } },
    { rpg: { characterAsset: "Warrior_male.png", battleRank: "Rare" } },
    18973, 18973, 35, "icebear", [],
    0, 2505, 15, "duck", [],
    "ko"
  );

  const outDir = "C:\\Users\\khang\\.gemini\\antigravity\\brain\\e1573dd0-adcd-4dc8-99fb-f3fe38332066";
  const outPath = path.join(outDir, "test_battle_ko.png");
  fs.writeFileSync(outPath, resultKO.buffer);
  console.log(`✅ Saved KO test image to: ${outPath}`);

  const resultTimeout = await BattleCanvas.renderPvPImage(
    { rpg: { characterAsset: "Mage_male.png", battleRank: "Mythic" } },
    { rpg: { characterAsset: "Warrior_male.png", battleRank: "Rare" } },
    12000, 18973, 80, "icebear", [],
    10000, 15000, 60, "duck", [],
    "timeout"
  );

  const outTimeoutPath = path.join(outDir, "test_battle_timeout.png");
  fs.writeFileSync(outTimeoutPath, resultTimeout.buffer);
  console.log(`✅ Saved Timeout test image to: ${outTimeoutPath}`);
}

testKO().catch(console.error);
