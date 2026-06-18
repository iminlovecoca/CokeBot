const { EmbedBuilder } = require("discord.js");
const Event = require("../../models/Event");
const { isDev, isAdmin } = require("../../utils/userUtil");
const config = require("../../data/config");

module.exports = {
  name: "setevent",
  description: "Thiết lập một sự kiện RPG mới với thời gian, yêu cầu và phần thưởng tùy chọn (Chỉ Admin)",
  usage: `${config.prefix}setevent`,
  async execute(message, args = []) {
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      return message.reply("❌ Bạn không có quyền sử dụng lệnh này!");
    }

    const filter = (m) => m.author.id === message.author.id;
    const channel = message.channel;

    try {
      // Prompt 1: Event Name
      await message.reply("📝 **Bước 1/7:** Nhập **Tên của sự kiện** (ví dụ: *Sự Kiện Sát Thần*):");
      const nameMsg = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] });
      const name = nameMsg.first().content.trim();
      if (!name) return message.reply("❌ Tên sự kiện không hợp lệ. Đã hủy thiết lập.");

      // Prompt 2: Event Description
      await message.reply("📝 **Bước 2/7:** Nhập **Nội dung/Mô tả sự kiện**:");
      const descMsg = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] });
      const description = descMsg.first().content.trim();
      if (!description) return message.reply("❌ Mô tả sự kiện không hợp lệ. Đã hủy thiết lập.");

      // Prompt 3: Duration
      await message.reply("⏰ **Bước 3/7:** Nhập **Thời gian diễn ra** (ví dụ: `24` cho 24 giờ, `3d` cho 3 ngày):");
      const durMsg = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] });
      const durStr = durMsg.first().content.trim().toLowerCase();
      let durationHours = 0;
      if (durStr.endsWith("d")) {
        durationHours = parseFloat(durStr) * 24;
      } else if (durStr.endsWith("h")) {
        durationHours = parseFloat(durStr);
      } else {
        durationHours = parseFloat(durStr);
      }

      if (isNaN(durationHours) || durationHours <= 0) {
        return message.reply("❌ Thời gian không hợp lệ. Đã hủy thiết lập.");
      }
      const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

      // Prompt 4: Event Requirement
      let requirement = null;
      await message.reply("🎯 **Bước 4/7:** Bạn có muốn thêm **Yêu cầu/Mục tiêu hoàn thành** để được nhận quà không? (Trả lời: `yes`/`no` hoặc `y`/`n`):");
      const reqConfirmMsg = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] });
      const reqConfirm = reqConfirmMsg.first().content.trim().toLowerCase();

      if (reqConfirm === "yes" || reqConfirm === "y") {
        await message.reply("▫️ Nhập loại yêu cầu (`boss_fight` để đánh boss, `pvp_battle` để đấu pvp, `hunt_loot` để loot đồ, `exp_gain` để nhận exp):");
        const reqTypeMsg = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] });
        const type = reqTypeMsg.first().content.trim().toLowerCase();

        const validTypes = ["boss_fight", "pvp_battle", "hunt_loot", "exp_gain"];
        if (!validTypes.includes(type)) {
          return message.reply("❌ Loại yêu cầu không hợp lệ. Đã hủy thiết lập.");
        }

        await message.reply("▫️ Nhập số lượng mục tiêu (ví dụ: `3` đối với đánh boss 3 lần, `5000` đối với 5000 exp):");
        const reqTargetMsg = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] });
        const target = parseInt(reqTargetMsg.first().content.trim());

        if (isNaN(target) || target <= 0) {
          return message.reply("❌ Số lượng mục tiêu không hợp lệ. Đã hủy thiết lập.");
        }

        requirement = { type, target };
      }

      // Prompt 5: Coke Reward
      await message.reply("💰 **Bước 5/7:** Nhập **Số Coke phần thưởng** (chắc chắn có, ví dụ: `50000`):");
      const cokeMsg = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] });
      const coke = parseInt(cokeMsg.first().content.trim());
      if (isNaN(coke) || coke < 0) {
        return message.reply("❌ Số Coke không hợp lệ. Đã hủy thiết lập.");
      }

      // Prompt 6: Gear Reward
      let gear = null;
      await message.reply("🛡️ **Bước 6/7:** Bạn có muốn thêm phần thưởng **Trang bị/Vũ khí** không? (Trả lời: `yes`/`no` hoặc `y`/`n`):");
      const gearConfirmMsg = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] });
      const gearConfirm = gearConfirmMsg.first().content.trim().toLowerCase();

      if (gearConfirm === "yes" || gearConfirm === "y") {
        await message.reply("▫️ Nhập **Độ hiếm/Rank của trang bị** (Common, Rare, Epic, Legendary, Mythic, Ancient, Divine):");
        const rankMsg = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] });
        const rank = rankMsg.first().content.trim();

        await message.reply("▫️ Nhập **Loại trang bị (slot)** (weapon, armor, helmet, boots, ring, necklace):");
        const typeMsg = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] });
        const typeRaw = typeMsg.first().content.trim().toLowerCase();

        // Map slot type like addgear
        const slotMap = {
          "weapon": "weapon", "w": "weapon", "vukhi": "weapon",
          "armor": "armor", "a": "armor", "giap": "armor",
          "helmet": "helmet", "h": "helmet", "mu": "helmet",
          "boots": "boots", "b": "boots", "giay": "boots",
          "ring": "ring", "r": "ring", "nhan": "ring",
          "necklace": "necklace", "n": "necklace", "daychuyen": "necklace"
        };
        const type = slotMap[typeRaw] || typeRaw;

        await message.reply("▫️ Nhập **Tên trang bị (subtype)** (ví dụ: *Crimson Dagger*, *Blue Staff*, *gravitybow*):");
        const gearNameMsg = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] });
        const gearName = gearNameMsg.first().content.trim();

        gear = { rank, type, name: gearName };
      }

      // Prompt 7: Other Reward
      let other = null;
      await message.reply("📦 **Bước 7/7:** Bạn có muốn thêm **Phần thưởng khác** không? (Trả lời: `yes`/`no` hoặc `y`/`n`):");
      const otherConfirmMsg = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] });
      const otherConfirm = otherConfirmMsg.first().content.trim().toLowerCase();

      if (otherConfirm === "yes" || otherConfirm === "y") {
        await message.reply("▫️ Nhập **Mã/Tên vật phẩm** (ví dụ: `dungeonkey`, `wc`, `abyssalhorn`):");
        const itemMsg = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] });
        const itemName = itemMsg.first().content.trim();

        await message.reply("▫️ Nhập **Số lượng**:");
        const qtyMsg = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] });
        const quantity = parseInt(qtyMsg.first().content.trim());

        if (!isNaN(quantity) && quantity > 0) {
          other = { name: itemName, quantity };
        }
      }

      // Create Event
      const event = await Event.create({
        name,
        description,
        expiresAt,
        requirement,
        rewards: {
          coke,
          gear,
          other
        }
      });

      const getRequirementLabel = (type) => {
        const labels = {
          boss_fight: "Đánh Boss Thế Giới",
          pvp_battle: "Thi đấu PvP",
          hunt_loot: "Loot đồ từ Hunt",
          exp_gain: "Nhận Exp RPG",
        };
        return labels[type] || type;
      };

      const reqDisplay = event.requirement && event.requirement.type
        ? `Đạt **${event.requirement.target}** lần **${getRequirementLabel(event.requirement.type)}**`
        : "Không yêu cầu (Nhận ngay)";

      const embed = new EmbedBuilder()
        .setColor("#57F287")
        .setTitle("✅ Thiết Lập Sự Kiện Thành Công!")
        .setDescription(`Đã khởi tạo sự kiện mới thành công. Người chơi có thể sử dụng lệnh \`${config.prefix}event\` để nhận phần thưởng sau khi hoàn thành yêu cầu.`)
        .addFields(
          { name: "Tên sự kiện", value: event.name },
          { name: "Nội dung", value: event.description },
          { name: "Yêu cầu hoàn thành", value: reqDisplay },
          { name: "Thời gian hết hạn", value: `<t:${Math.floor(event.expiresAt.getTime() / 1000)}:F>` },
          {
            name: "Phần thưởng",
            value: `• Coke: **+${event.rewards.coke.toLocaleString()}**\n` +
                   (event.rewards.gear ? `• Trang bị: **[${event.rewards.gear.rank}] ${event.rewards.gear.name} (${event.rewards.gear.type})**\n` : "") +
                   (event.rewards.other ? `• Khác: **${event.rewards.other.name}** x${event.rewards.other.quantity}` : "")
          }
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });

    } catch (err) {
      console.error("[SETEVENT] Error during setup:", err);
      return message.reply("❌ Quá thời gian phản hồi hoặc có lỗi xảy ra. Thiết lập sự kiện đã bị hủy.");
    }
  }
};
