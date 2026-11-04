const BaseCommand = require('../../core/BaseCommand');
const { buyItem } = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

class BuyCommand extends BaseCommand {
  constructor() {
    super({
      name: "buy",
      description: "Mua một vật phẩm hoặc vũ khí từ cửa hàng.",
      usage: `${config.prefix}buy <id> [số lượng]`,
      examples: [
        {
          intent: "Mua 1 hộp vũ khí (Weapon Crate)",
          command: `${config.prefix}buy 100`,
        },
        {
          intent: "Mua vũ khí từ shop hàng ngày (slot 101-110)",
          command: `${config.prefix}buy 101`,
        },
        {
          intent: "Mua 1 vật phẩm (ví dụ: sun-stone)",
          command: `${config.prefix}buy sun-stone`,
        },
      ],
      cooldown: 3
    });
  }

  async execute(message, args) {
    const itemId = args[0];
    let quantity = 1; 

    if (!itemId) {
      throw new UserFriendlyError(
        `${config.prefix}buy <id> [số lượng]. Ví dụ: \`${config.prefix}buy 100\` hoặc \`${config.prefix}buy 101\``,
      );
    }

    const cleanId = String(itemId).toLowerCase().replace(/\s+/g, "");

    // 1. Weapon Crate (ID 100, wc, crate, weaponcrate, 099)
    if (["100", "wc", "crate", "weaponcrate", "099"].includes(cleanId)) {
      if (args[1]) {
        quantity = parseInt(args[1], 10);
        if (isNaN(quantity) || quantity <= 0) {
          throw new UserFriendlyError(
            `${config.emoji.no} Số lượng không hợp lệ. Vui lòng nhập một số lớn hơn 0.`
          );
        }
      }
      const CRATE_PRICE = 40000;
      const totalCost = CRATE_PRICE * quantity;
      const { getUser } = require("../../utils/userUtil");
      const user = await getUser(message.author.id);

      if (user.coke < totalCost) {
        throw new UserFriendlyError(
          `${config.emoji.no} Bạn không đủ Coke! Cần **${totalCost.toLocaleString()} Coke** nhưng bạn chỉ có **${user.coke.toLocaleString()} Coke**.`
        );
      }

      user.coke -= totalCost;
      if (!user.inventory) user.inventory = new Map();
      const currentWc = (user.inventory instanceof Map ? user.inventory.get("wc") : user.inventory.wc) || 0;
      if (user.inventory instanceof Map) {
        user.inventory.set("wc", currentWc + quantity);
      } else {
        user.inventory.wc = currentWc + quantity;
      }
      user.markModified("inventory");
      await user.save();

      return message.reply(
        `${config.emoji.yes} Đã mua thành công **${quantity.toLocaleString()}x Hộp Vũ Khí (Weapon Crate)** <:crate:1512793698025603282> với giá **${totalCost.toLocaleString()} Coke**! Dùng \`${config.prefix}wc\` để mở.`
      );
    }

    // 2. Daily Weapon Shop Slots (IDs 101 to 110)
    const slotInt = parseInt(cleanId, 10);
    if (!isNaN(slotInt) && slotInt >= 101 && slotInt <= 110) {
      const weaponShopCommand = require("../rpg/user/weaponshop");
      const { getUser } = require("../../utils/userUtil");
      const user = await getUser(message.author.id);
      const buyRes = await weaponShopCommand.processBuy(user, slotInt, message.channel);
      if (!buyRes.ok) {
        throw new UserFriendlyError(buyRes.message);
      }
      const successEmbed = weaponShopCommand.buildSuccessEmbed(user, buyRes.weapon, buyRes.item);
      return message.reply({ embeds: [successEmbed] });
    }

    // 3. Command aliases like "coke buy weapon <id>" or "coke buy ws <id>"
    if (["weapon", "ws", "weaponshop", "vukhi"].includes(cleanId)) {
      const weaponShopCommand = require("../rpg/user/weaponshop");
      if (!args[1]) {
        return weaponShopCommand.execute(message, []);
      }
      let slotNum = parseInt(args[1], 10);
      if (slotNum === 100) {
        const { getUser } = require("../../utils/userUtil");
        const user = await getUser(message.author.id);
        const buyRes = await weaponShopCommand.processBuy(user, 100, message.channel);
        if (!buyRes.ok) throw new UserFriendlyError(buyRes.message);
        return message.reply({ embeds: [weaponShopCommand.buildCrateSuccessEmbed(user, buyRes.price, buyRes.remainingCoke)] });
      }
      if (slotNum >= 1 && slotNum <= 10) slotNum += 100;
      if (slotNum < 101 || slotNum > 110) {
        throw new UserFriendlyError(
          `Vui lòng chọn ô vũ khí từ 101 đến 110 (hoặc 100 cho Weapon Crate). Ví dụ: \`${config.prefix}buy 101\` hoặc xem danh sách tại \`${config.prefix}ws\`.`
        );
      }
      const { getUser } = require("../../utils/userUtil");
      const user = await getUser(message.author.id);
      const buyRes = await weaponShopCommand.processBuy(user, slotNum, message.channel);
      if (!buyRes.ok) {
        throw new UserFriendlyError(buyRes.message);
      }
      const successEmbed = weaponShopCommand.buildSuccessEmbed(user, buyRes.weapon, buyRes.item);
      return message.reply({ embeds: [successEmbed] });
    }

    if (["dungeonkey", "key", "dungeon_key", "001", "1"].includes(cleanId)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Chìa khóa phó bản (Dungeon Key) hiện **không còn bán** trong Cửa Hàng. Bạn có thể nhận được từ phần thưởng hoàn thành **Checklist hàng ngày** (${config.prefix}cl)!`
      );
    }
    if (["lootbox", "lb", "box", "hopqua", "050", "50"].includes(cleanId)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Hộp Quà (Lootbox) hiện **không còn bán** trong Cửa Hàng. Bạn có thể kiếm được từ hoạt động Săn Thú (${config.prefix}hunt), Checklist hàng ngày (${config.prefix}cl), hoặc phần thưởng thăng cấp!`
      );
    }
    if (["spearhex", "shieldhex", "clawhex"].includes(cleanId)) {
      const HexEventState = require("../../models/HexEventState");
      const eventState = await HexEventState.findById("hex_event");
      if (!eventState || !eventState.active || (eventState.expiresAt && eventState.expiresAt < Date.now())) {
        throw new UserFriendlyError("🟣 Sự kiện Hex hiện không diễn ra!");
      }
      
      const { DateTime } = require("luxon");
      const timezone = config.rpg.boss?.spawn_timezone || "Asia/Ho_Chi_Minh";
      const now = DateTime.now().setZone(timezone);
      const day = now.weekday; 
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

    const { item } = await buyItem(message.client, message.author.id, cleanId, quantity);

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
