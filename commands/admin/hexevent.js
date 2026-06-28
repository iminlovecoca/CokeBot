const { UserFriendlyError } = require("../../utils/errors");
const { isDev, isAdmin } = require("../../utils/userUtil");
const config = require("../../data/config");
const HexEventState = require("../../models/HexEventState");
const { DateTime } = require("luxon");

module.exports = {
  name: "hexevent",
  aliases: ["hexe", "hexev"],
  description: "Quản lý sự kiện Hex (start/stop/status).",
  usage: `${config.prefix}hexevent <start|stop|status>`,

  async execute(message, args) {
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không có quyền dùng lệnh này.`,
      );
    }

    const action = args[0]?.toLowerCase();
    if (!action || !["start", "stop", "status"].includes(action)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Vui lòng nhập hành động hợp lệ: \`start\`, \`stop\`, hoặc \`status\`. Ví dụ: \`${config.prefix}hexevent status\``
      );
    }

    if (action === "status") {
      const state = await HexEventState.findById("hex_event");
      if (!state || !state.active) {
        return message.reply("🟣 **[Sự Kiện Hex]** Hiện tại sự kiện đang **TẮT**.");
      }

      const timezone = config.rpg.boss?.spawn_timezone || "Asia/Ho_Chi_Minh";
      const now = DateTime.now().setZone(timezone);
      const expiresAt = DateTime.fromJSDate(state.expiresAt).setZone(timezone);

      if (now > expiresAt) {
        state.active = false;
        state.expiresAt = null;
        await state.save();
        return message.reply("🟣 **[Sự Kiện Hex]** Sự kiện đã hết hạn vào lúc " + expiresAt.toFormat("dd/MM/yyyy HH:mm:ss") + " và đã được tự động tắt.");
      }

      const diff = expiresAt.diff(now, ["days", "hours", "minutes"]);
      const diffStr = `${Math.floor(diff.days)} ngày ${Math.floor(diff.hours)} giờ ${Math.floor(diff.minutes)} phút`;

      return message.reply(
        `🟣 **[Sự Kiện Hex]**\n` +
        `• Trạng thái: **ĐANG HOẠT ĐỘNG**\n` +
        `• Bắt đầu: **${DateTime.fromJSDate(state.activatedAt).setZone(timezone).toFormat("dd/MM/yyyy HH:mm:ss")}**\n` +
        `• Hết hạn: **${expiresAt.toFormat("dd/MM/yyyy HH:mm:ss")}** (Còn lại: **${diffStr}**)\n` +
        `• Kích hoạt bởi: <@${state.activatedBy}>`
      );
    }

    if (action === "start") {
      const timezone = config.rpg.boss?.spawn_timezone || "Asia/Ho_Chi_Minh";
      const now = DateTime.now().setZone(timezone);
      const dayOfWeek = now.weekday; // 1: Monday, ..., 7: Sunday
      let daysToAdd = 0;
      if (dayOfWeek === 1) {
        daysToAdd = 0; // Expires end of today (Monday)
      } else {
        daysToAdd = 8 - dayOfWeek; // Expires end of upcoming Monday
      }
      
      const expiresAtDate = now.plus({ days: daysToAdd }).set({ hour: 23, minute: 59, second: 59, millisecond: 999 }).toJSDate();

      let state = await HexEventState.findById("hex_event");
      if (!state) {
        state = new HexEventState({ _id: "hex_event" });
      }

      state.active = true;
      state.activatedAt = new Date();
      state.expiresAt = expiresAtDate;
      state.activatedBy = message.author.id;

      await state.save();

      return message.reply(
        `🟣 **[Sự Kiện Hex]** Đã kích hoạt sự kiện thành công!\n` +
        `• Hạn dùng: Đến hết thứ Hai tuần này/sau (**${DateTime.fromJSDate(expiresAtDate).setZone(timezone).toFormat("dd/MM/yyyy HH:mm:ss")}**).`
      );
    }

    if (action === "stop") {
      const state = await HexEventState.findById("hex_event");
      if (!state || !state.active) {
        return message.reply("🟣 **[Sự Kiện Hex]** Sự kiện vốn đã tắt.");
      }

      state.active = false;
      state.expiresAt = null;
      await state.save();

      return message.reply("🟣 **[Sự Kiện Hex]** Đã hủy kích hoạt sự kiện thành công.");
    }
  },
};
