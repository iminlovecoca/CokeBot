const { PermissionsBitField } = require("discord.js");
const { syncNoituData } = require("../../utils/noituBootstrap");
const { countWordInDictionary } = require("../../utils/noituGame");
const config = require("../../data/config");

module.exports = {
  name: "sync",
  aliases: ["reload", "update"],
  description: "Đồng bộ thủ công từ điển nối từ từ GitHub",
  usage: `${config.prefix} noitu sync`,
  async execute(message, args, client) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return message.reply("Bạn cần có quyền Admin để thực hiện thao tác này!");
    }

    const statusMsg = await message.reply("⏳ Đang đồng bộ từ điển từ GitHub, vui lòng chờ...");
    try {
      await syncNoituData();
      await statusMsg.edit(`✅ Đồng bộ từ điển thành công! Hiện tại có **${countWordInDictionary()}** từ trong từ điển.`);
    } catch (error) {
      console.error("[Noitu Sync Prefix Command] Error:", error);
      await statusMsg.edit(`❌ Đồng bộ thất bại: ${error.message}`);
    }
  },
};
