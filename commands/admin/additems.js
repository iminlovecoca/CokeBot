const config = require("../../data/config");

module.exports = {
  name: "additems",
  description: "Thêm vật phẩm hoặc vũ khí bất kì cho một user (Chỉ Dev)",
  usage: `${config.prefix}additems @user <item_id> [số lượng]`,
  async execute(message, args) {
    if (!config.permissions.dev_ids.includes(message.author.id)) {
      return message.reply("❌ Bạn không có quyền dùng lệnh này!");
    }

    const target = args[0];
    if (!target) {
      return message.reply(`❌ Cú pháp: \`${config.prefix}additems @user <item_id> [số lượng]\``);
    }

    const mention = message.mentions.users.first() || await message.client.users.fetch(target).catch(() => null);
    if (!mention) {
      return message.reply("❌ Không tìm thấy user.");
    }

    const itemIdInput = args[1]?.trim();
    if (!itemIdInput) {
      return message.reply("❌ Vui lòng cung cấp ID vật phẩm hoặc ID trang bị RPG.");
    }

    const quantity = parseInt(args[2]) || 1;
    if (quantity <= 0) {
      return message.reply("❌ Số lượng phải là số nguyên dương.");
    }

    const isWeapon = /^[gG]?\d+$/.test(itemIdInput);
    if (isWeapon) {
      const weaponId = Number(itemIdInput.replace(/^[gG]/, ""));
      const { findRpgItemGlobal, addRpgGearToUser } = require("../../utils/rpgUtil");
      const result = await findRpgItemGlobal(weaponId);
      if (!result) {
        return message.reply(`❌ Không tìm thấy trang bị RPG nào có ID \`G${String(weaponId).padStart(3, "0")}\` trong hệ thống.`);
      }

      const { item } = result;
      const User = require("../../models/User");
      const dbUser = await User.findOne({ userId: mention.id }) || await User.create({ userId: mention.id });

      const itemRaw = item.toObject ? item.toObject() : item;

      for (let i = 0; i < quantity; i++) {
        const clonedItem = {
          ...itemRaw,
          uid: `w-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          droppedAt: new Date(),
        };
        addRpgGearToUser(dbUser, clonedItem);
      }
      await dbUser.save();

      return message.reply(`✅ Đã thêm **${quantity}x** trang bị **${item.name}** (\`G${String(weaponId).padStart(3, "0")}\`) cho ${mention}.`);
    } else {
      const allItems = message.client.allItems || [];
      const itemData = allItems.find(i => i.item_id === itemIdInput.toLowerCase());
      if (!itemData) {
        return message.reply(`❌ Không tìm thấy vật phẩm nào có ID \`${itemIdInput}\` trong hệ thống.`);
      }

      const User = require("../../models/User");
      const dbUser = await User.findOne({ userId: mention.id }) || await User.create({ userId: mention.id });

      if (!dbUser.inventory) {
        dbUser.inventory = new Map();
      }

      const currentVal = dbUser.inventory.get(itemData.item_id) || 0;
      dbUser.inventory.set(itemData.item_id, currentVal + quantity);
      dbUser.markModified("inventory");
      await dbUser.save();

      return message.reply(`✅ Đã thêm **${quantity}x** vật phẩm **${itemData.name}** (${itemData.emoji || ""}) cho ${mention}.`);
    }
  },
};
