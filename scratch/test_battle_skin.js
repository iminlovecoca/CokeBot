const { getCharacterAssetPath } = require("../utils/rpgUtil");
const fs = require("fs");

console.log("Checking Warrior_02.png path...");
const path1 = getCharacterAssetPath("Warrior_02.png");
console.log("Path:", path1);
console.log("Exists:", fs.existsSync(path1));

console.log("Checking WarriorUX.png path...");
const path2 = getCharacterAssetPath("WarriorUX.png");
console.log("Path:", path2);
console.log("Exists:", fs.existsSync(path2));

console.log("Checking Warrior_male.png path...");
const path3 = getCharacterAssetPath("Warrior_male.png");
console.log("Path:", path3);
console.log("Exists:", fs.existsSync(path3));
