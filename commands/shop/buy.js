const BaseCommand = require('../../core/BaseCommand');
const { buyItem } = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

class BuyCommand extends BaseCommand {
  constructor() {
    super({
      name: "buy",
      description: "Mua một vật phẩm từ cửa hàng.",
      usage: `${config.prefix}buy <id> [số lượng]`,
      examples: [
        {
          intent: "Mua 1 vật phẩm (ví dụ: sun-stone)",
          command: `${config.prefix}buy sun-stone`,
        },
        {
          intent: "Mua 3 vật phẩm cùng lúc",
          command: `${config.prefix}buy sun-stone 3`,
        },
      ],
      cooldown: 3
    });
  }

  async execute(message, args) {
    const itemId = args[0];
    let quantity = 1; // Default quantity is 1

    if (!itemId) {
      throw new UserFriendlyError(
        `${config.prefix}buy <id> [số lượng]. Ví dụ: \`${config.prefix}buy lure-flame\``,
      );
    }

    const cleanId = String(itemId).toLowerCase().replace(/\s+/g, "");
    if (["spearhex", "shieldhex", "clawhex"].includes(cleanId)) {
      // Hex event weapon buying logic
      // Load event state
      const HexEventState = require("../../models/HexEventState");
      const eventState = await HexEventState.findById("hex_event");
      if (!eventState || !eventState.active || (eventState.expiresAt && eventState.expiresAt < Date.now())) {
        throw new UserFriendlyError("🟣 Sự kiện Hex hiện không diễn ra!");
      }
      
      const { DateTime } = require("luxon");
      const timezone = config.rpg.boss?.spawn_timezone || "Asia/Ho_Chi_Minh";
      const now = DateTime.now().setZone(timezone);
      const day = now.weekday; // 1: Monday, ..., 6: Saturday, 7: Sunday
      if (day !== 6 && day !== 7 && day !== 1) {
        throw new UserFriendlyError("🟣 Cửa hàng sự kiện Hex chỉ mở từ thứ Bảy đến hết thứ Hai hàng tuần!");
      }
      
      const { requireRpgCharacter, generateRpgGearDrop, addRpgGearToUser } = require("../../utils/rpgUtil");
      const { user } = await requireRpgCharacter(message.author.id);
      
      if (!user.rpg.claimedEvents) user.rpg.claimedEvents = [];
      if (user.rpg.claimedEvents.includes("bought_hex_weapon")) {
        throw new UserFriendlyError("🟣 Bạn đã sở hữu vũ khí Hex từ sự kiện này! Mỗi người chơi chỉ được mua tối đa 1 vũ khí Hex.");
      }
      
      if (!user.inventory) user.inventory = new Map();
      const souls = user.inventory.get("souls") || 0;
      const pieces = user.inventory.get("hexpiece") || 0;
      
      if (souls < 520 || pieces < 1) {
        throw new UserFriendlyError(`🟣 Bạn không đủ tài nguyên! Yêu cầu **520 Linh Hồn** <:souls:1518749776538243082> và **1 Mảnh Vũ Khí Hex** <:piece:1518749774403338433>.\nBạn hiện có: **${souls}** Linh Hồn và **${pieces}** Mảnh.`);
      }
      
      user.inventory.set("souls", souls - 520);
      user.inventory.set("hexpiece", pieces - 1);
      user.rpg.claimedEvents.push("bought_hex_weapon");
      user.markModified("inventory");
      user.markModified("rpg");
      
      const subTypeMap = {
        spearhex: "Spearhex",
        shieldhex: "Shieldhex",
        clawhex: "Clawhex"
      };
      
      const gear = await generateRpgGearDrop(user, {
        forceDrop: true,
        slot: "weapon",
        subType: subTypeMap[cleanId],
        rarity: "Mythic",
        fromEvent: true
      });
      
      if (!gear) {
        throw new Error("Không thể tạo vũ khí Hex. Vui lòng liên hệ Admin.");
      }
      
      gear.power = 1450;
      addRpgGearToUser(user, gear);
      await user.save();
      
      return message.reply(
        `🟣 **${message.author.username}** đã mua thành công **${gear.name}** phẩm chất **Mythic** (Sức mạnh cơ bản **1450**) với giá **520 Linh Hồn** và **1 Mảnh Vũ Khí Hex**!`
      );
    }

    if (args[1]) {
      quantity = parseInt(args[1]);
      if (isNaN(quantity) || quantity <= 0) {
        throw new UserFriendlyError(
          `${config.emoji.no} Số lượng không hợp lệ. Vui lòng nhập một số lớn hơn 0.`,
        );
      }
    }

    const { msg, item } = await buyItem(message.author.id, cleanId, quantity);

    if (msg) {
      return message.reply(msg);
    }

    if (item) {
      await message.reply(
        `${config.emoji.yes} Đã mua thành công **${quantity}x ${item.name}** với giá **${(item.price * quantity).toLocaleString()} coke**!`,
      );
    } else {
      await message.reply(
        `${config.emoji.no} Không tìm thấy vật phẩm với ID \`${cleanId}\`.`,
      );
    }
  }
}

module.exports = new BuyCommand();
