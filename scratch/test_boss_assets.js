const path = require("path");
const fs = require("fs");

// Mock __dirname to match features directory
const getBossAssetPath = (boss) => {
  // Simulating the path resolution in features/rpgBossSpawner.js
  const rpgeventPath = path.join(__dirname, "../assets/rpgevent", boss.asset || "boss_01.webp");
  if (fs.existsSync(rpgeventPath)) {
    return rpgeventPath;
  }
  return path.join(__dirname, "../assets/bosses", boss.asset || "boss_01.webp");
};

const testHexia = {
  key: "hexia",
  asset: "Hexia.png"
};

const testGodhexa = {
  key: "godhexa",
  asset: "Godhexa.png"
};

const testRegular = {
  key: "boss_01",
  asset: "boss_01.png"
};

console.log("Hexia asset path resolved to:", getBossAssetPath(testHexia));
console.log("Godhexa asset path resolved to:", getBossAssetPath(testGodhexa));
console.log("Regular boss asset path resolved to:", getBossAssetPath(testRegular));

if (getBossAssetPath(testHexia).includes("rpgevent")) {
  console.log("✅ Hexia path matches 'rpgevent' directory.");
} else {
  console.error("❌ Hexia path should resolve to 'rpgevent' directory.");
}

if (getBossAssetPath(testRegular).includes("bosses")) {
  console.log("✅ Regular boss path matches 'bosses' directory.");
} else {
  console.error("❌ Regular boss path should resolve to 'bosses' directory.");
}
