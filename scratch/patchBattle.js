const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../commands/rpg/battle/battle.js");
let content = fs.readFileSync(filePath, "utf8");
const isCrlf = content.includes("\r\n");

let normalized = content.replace(/\r\n/g, "\n");

const targetSearch = `      if (receiverUser.rpg?.godsetBackup) {
        return message.reply(
          \`\${config.emoji.no} Đối phương không thể tham gia PvP lúc này.\`,
        );
      }`;

const targetReplace = `      const hiddenBattleIds = config.permissions.hidden_battle_ids || ["1136526046557118505"];
      const { isDev } = require("../../../utils/userUtil");
      const isTargetHidden = hiddenBattleIds.includes(receiverId) || receiverUser.rpg?.hiddenFromBattle;
      if (isTargetHidden && senderId !== receiverId && !isDev(senderId)) {
        return message.reply(
          \`\${config.emoji.no} Không tìm thấy người chơi này!\`,
        );
      }
      if (receiverUser.rpg?.godsetBackup) {
        return message.reply(
          \`\${config.emoji.no} Đối phương không thể tham gia PvP lúc này.\`,
        );
      }`;

if (!normalized.includes(targetSearch)) {
  console.error("Target search string not found!");
  process.exit(1);
}

normalized = normalized.replace(targetSearch, targetReplace);

const aggSearch = `      const opponents = await User.aggregate([
        {
          $match: {
            "rpg.classKey": { $ne: null },
            userId: { $ne: senderId, $regex: /^\\d+$/ },
            "rpg.godsetBackup": null,
          }
        },
        { $sample: { size: 5 } }
      ]).catch(() => []);`;

const aggReplace = `      const hiddenBattleIds = config.permissions.hidden_battle_ids || ["1136526046557118505"];
      const excludedIds = Array.from(new Set([senderId, ...hiddenBattleIds]));
      const opponents = await User.aggregate([
        {
          $match: {
            "rpg.classKey": { $ne: null },
            userId: { $nin: excludedIds, $regex: /^\\d+$/ },
            "rpg.godsetBackup": null,
            "rpg.hiddenFromBattle": { $ne: true },
          }
        },
        { $sample: { size: 5 } }
      ]).catch(() => []);`;

if (!normalized.includes(aggSearch)) {
  console.error("Agg search string not found!");
  process.exit(1);
}

normalized = normalized.replace(aggSearch, aggReplace);

if (isCrlf) {
  normalized = normalized.replace(/\n/g, "\r\n");
}

fs.writeFileSync(filePath, normalized, "utf8");
console.log("Successfully patched battle.js!");
