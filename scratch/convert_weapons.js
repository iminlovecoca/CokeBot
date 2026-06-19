const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const { getGearDisplayName, getItemImageFile, getWeaponScaling } = require("../utils/rpgUtil");

// Weapon subtypes being removed → convert to these
const OBSOLETE_WEAPON_SUBTYPES = ["halberd", "claymore", "rapier"];
const FALLBACK_SUBTYPE = "Longsword";
const FALLBACK_EMOJI = "<:longsword:1514231939865903104>";

const runSync = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cokebot";
    console.log("Connecting to database...");
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    const users = await User.find({ "rpg.classKey": { $ne: null } }).exec();
    console.log(`Found ${users.length} RPG users.`);

    let convertedCount = 0;
    let updatedUsersCount = 0;

    for (const user of users) {
      if (!user.rpg || !user.rpg.items) continue;

      let modified = false;

      for (const item of user.rpg.items) {
        if (item.slot !== "weapon") continue;

        const subTypeLower = String(item.subType || "").toLowerCase();
        const isObsolete = OBSOLETE_WEAPON_SUBTYPES.some(t => subTypeLower.includes(t));

        if (isObsolete) {
          console.log(`  Converting: "${item.subType}" (ID ${item.id}) → ${FALLBACK_SUBTYPE}`);
          item.subType = FALLBACK_SUBTYPE;
          item.emoji = FALLBACK_EMOJI;
          item.imageKey = getItemImageFile(item);
          // Recalculate scaling for longsword
          item.scaling = {
            str: (() => {
              const r = item.rarity;
              const grades = { Common: "D", Rare: "C", Epic: "B", Legendary: "A", Mythic: "S", Ancient: "S", Divine: "S" };
              return grades[r] || "E";
            })(),
            dex: (() => {
              const r = item.rarity;
              const grades = { Common: "E", Rare: "D", Epic: "C", Legendary: "B", Mythic: "B", Ancient: "A", Divine: "S" };
              return grades[r] || "E";
            })(),
            int: "-",
            arc: "-"
          };
          item.name = getGearDisplayName(item);
          convertedCount++;
          modified = true;
        }
      }

      if (modified) {
        user.markModified("rpg");
        await user.save();
        updatedUsersCount++;
      }
    }

    console.log(`\n🎉 Weapon Cleanup Completed!`);
    console.log(`- Converted ${convertedCount} obsolete weapons across ${updatedUsersCount} users.`);
    console.log(`- Obsolete types removed: ${OBSOLETE_WEAPON_SUBTYPES.join(", ")}`);
    console.log(`- All converted to: ${FALLBACK_SUBTYPE}`);

    await mongoose.connection.close();
    console.log("Database connection closed.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runSync();
