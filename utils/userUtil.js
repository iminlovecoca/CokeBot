const mongoose = require("mongoose");
const User = require("../models/User");
const Cokemon = require("../models/cokemon/Cokemon");
const ActiveNet = require("../models/cokemon/ActiveNet");
const { runTransactionWithRetry } = require("./miscUtil");
const { formatVNCurrency } = require("./format");
const { getPerDayLimit, getPerTransactionLimit } = require("./transactionUtil");
const {
  getCokemonName,
  getCokemonEmoji,
  getCokemonXpNeeded,
  addCokemonXp,
  getItem,
} = require("./cokemonUtil");
const { UserFriendlyError, handleUtilityError } = require("./errors");
const config = require("../data/config");
const settings = config.cokemon_settings;

const getOrCreateUser = async (userId) => {
  let user = await User.findOne({ userId });
  if (!user) {
    user = new User({
      userId,
      level: 1,
      xp: 0,
      coke: 0,
      dailyXp: 0,
      dailyStreak: 0,
    });
    await user.save();
  }
  return user;
};

const getUser = async (userId, session = null) => {
  const query = User.findOne({ userId });
  if (session) query.session(session);
  const user = await query;
  if (!user) {
    throw new UserFriendlyError(
      `${config.emoji.no} Không thể tìm thấy dữ liệu người chơi.`,
    );
  }
  return user;
};

const isDev = (userId) => {
  return userId === config.permissions.owner_id || config.permissions.dev_ids.includes(userId) || userId === process.env.OWNER_ID;
};

const isAdmin = (userId) => {
  return userId === config.permissions.owner_id || config.permissions.admin_ids.includes(userId) || userId === process.env.OWNER_ID;
};

const validateBeforeGiving = async (senderId, receiverId, amount, dateKey) => {
  const sender = await User.findOne({ userId: senderId });
  const receiver = await User.findOne({ userId: receiverId });

  if (senderId === receiverId) {
    return `${config.emoji.no} Không thể tự chuyển cho chính mình.`;
  }
  if (!sender || sender.coke < amount) {
    return `${config.emoji.no} Bạn không đủ coke để chuyển.`;
  }
  if (!sender || sender.coke < amount) {
    return `${config.emoji.no} Người nhận chưa có tài khoản trong hệ thống.`;
  }
  if (!receiver) {
    return `${config.emoji.no} Người nhận chưa có tài khoản trong hệ thống.`;
  }
  if (receiver.bannedUntil && receiver.bannedUntil > Date.now()) {
    return `${config.emoji.no} Người nhận hiện đang bị cấm sử dụng bot.`;
  }

  const senderPerDayLimit = sender.vipLevel
    ? Infinity
    : getPerDayLimit(sender.level || 1)[0];
  const receiverPerDayLimit = receiver.vipLevel
    ? Infinity
    : getPerDayLimit(receiver.level || 1)[1];
  const senderPerTransLimit = sender.vipLevel
    ? Infinity
    : getPerTransactionLimit(sender.level || 1);
  const senderDailyGive = sender.dailyGive || {};
  const receiverDailyReceive = receiver.dailyReceive || {};
  const sentToday = senderDailyGive[dateKey] || 0;
  const receivedToday = receiverDailyReceive[dateKey] || 0;

  if (amount > senderPerTransLimit) {
    return `${config.emoji.no} Vượt giới hạn giao dịch (**${senderPerTransLimit.toLocaleString()}**).`;
  }
  if (
    sentToday + amount > senderPerDayLimit &&
    receiverPerDayLimit < Infinity
  ) {
    return `${config.emoji.no} Vượt giới hạn chuyển hôm nay (**${senderPerDayLimit.toLocaleString()}**).`;
  }
  if (
    receivedToday + amount > receiverPerDayLimit &&
    senderPerDayLimit < Infinity
  ) {
    return `${config.emoji.no} Người nhận đã vượt giới hạn nhận hôm nay (**${receiverPerDayLimit.toLocaleString()}**).`;
  }
  return;
};

const giveCmd = async (senderId, receiverId, amount, vnNow, dateKey) => {
  try {
    const giveTransaction = async (session) => {
      const sender = await User.findOne({ userId: senderId }).session(session);
      const receiver = await User.findOne({ userId: receiverId }).session(session);

      if (!sender.vipLevel) {
        await User.updateOne(
          { userId: receiverId },
          { $inc: { [`dailyReceive.${dateKey}`]: amount } },
        ).session(session);
      }
      if (!receiver.vipLevel) {
        await User.updateOne(
          { userId: senderId },
          { $inc: { [`dailyGive.${dateKey}`]: amount } },
        ).session(session);
      }
      await User.updateOne(
        { userId: senderId },
        {
          $inc: { coke: -amount },
          $push: {
            transferHistory: {
              to: receiverId,
              amount,
              date: vnNow,
            },
          },
        },
      ).session(session);
      await User.updateOne(
        { userId: receiverId },
        {
          $inc: { coke: amount },
          $push: {
            receiveHistory: {
              from: senderId,
              amount,
              date: vnNow,
            },
          },
        },
      ).session(session);
    };

    await runTransactionWithRetry(giveTransaction);
    return true;
  } catch (error) {
    console.error("[giveCmd] Transaction failed:", error);
    return false;
  }
};

const getTotalCoke = async (userId) => {
  const user = await getUser(userId);
  const totalCoke = (user?.coke || 0) + (user?.bank || 0);
  return totalCoke;
};

const decBalance = async (userId, amount) => {
  await User.updateOne({ userId }, { $inc: { coke: -amount } });
};

const incBalance = async (userId, amount) => {
  await User.updateOne({ userId }, { $inc: { coke: amount } });
};

const daysToMilliseconds = (days) => days * 24 * 60 * 60 * 1000;

const removeTransferalOlderThanNDays = async (userId, n) => {
  await User.updateOne(
    { userId },
    {
      $pull: {
        transferHistory: {
          date: { $gte: Date.now() - daysToMilliseconds(n) },
        },
      },
    },
  );
};

const removeReceiptOlderThanNDays = async (userId, n) => {
  await User.updateOne(
    { userId },
    {
      $pull: {
        receiveHistory: {
          date: { $gte: Date.now() - daysToMilliseconds(n) },
        },
      },
    },
  );
};

const buyItem = async (client, userId, itemId, quantity) => {
  return handleUtilityError(async () => {
    let resultData = {};
    const buyTransaction = async (session) => {
      const item = client.allItems.find((i) => i.item_id === itemId);
      if (!item) {
        throw new UserFriendlyError(
          `${config.emoji.no} Vật phẩm không tồn tại.`,
        );
      }

      if (item.price === null || item.price === undefined) {
        throw new UserFriendlyError(
          `${config.emoji.no} Vật phẩm này không được bán trong Cửa hàng.`,
        );
      }

      const user = await getUser(userId, session);
      const totalCost = item.price * quantity;
      if (user.coke < totalCost) {
        throw new UserFriendlyError(
          `${config.emoji.no} Bạn không đủ tiền! Bạn cần ${totalCost} coke nhưng chỉ có ${user.coke} coke.`,
        );
      }

      user.coke -= totalCost;
      const currentQuantity = user.inventory.get(itemId) || 0;
      user.inventory.set(itemId, currentQuantity + quantity);
      await user.save({ session });
      resultData = { item, cost: totalCost };
    };
    await runTransactionWithRetry(buyTransaction);
    return resultData;
  }, "buyItem");
};

const sellItem = async (client, userId, itemId, quantity) => {
  return handleUtilityError(async () => {
    let resultData = {};
    const sellTransaction = async (session) => {
      const item = client.allItems.find((i) => i.item_id === itemId);
      if (!item) {
        throw new UserFriendlyError(
          `${config.emoji.no} Vật phẩm không tồn tại.`,
        );
      }

      if (item.price === null || item.price === undefined) {
        throw new UserFriendlyError(
          `${config.emoji.no} Vật phẩm này không thể bán vào Cửa hàng.`,
        );
      }

      const user = await getUser(userId, session);
      if (!user) {
        throw new UserFriendlyError(
          `${config.emoji.no} Bạn không có vật phẩm nào để bán.`,
        );
      }

      const ownedQuantity = user.inventory.get(itemId) || 0;
      if (ownedQuantity < quantity) {
        throw new UserFriendlyError(
          `${config.emoji.no} Bạn không có đủ vật phẩm để bán. Bạn chỉ có ${ownedQuantity} ${item.name}.`,
        );
      }

      const sellPrice = Math.floor(item.price * settings.sell_percentage);
      const totalGain = sellPrice * quantity;
      user.coke += totalGain;
      const newQuantity = ownedQuantity - quantity;

      if (newQuantity === 0) {
        user.inventory.delete(itemId);
      } else {
        user.inventory.set(itemId, newQuantity);
      }
      await user.save({ session });
      resultData = { item, gain: totalGain };
    };
    await runTransactionWithRetry(sellTransaction);
    return resultData;
  }, "sellItem");
};

const useItem = async (client, user, channelId, itemId, targetId, quantity) => {
  return handleUtilityError(async () => {
    const item = getItem(client, itemId);
    if (!item) {
      throw new UserFriendlyError(
        `${config.emoji.no} Vật phẩm với ID \`${itemId}\` không tồn tại.`,
      );
    }

    let quantityToUse = quantity;
    let resultMessage = "";
    if (item.item_type === "lure") {
      const spawningChannels = Object.keys(config.channel_themes || {});
      if (!spawningChannels.includes(channelId)) {
        throw new UserFriendlyError(
          `${config.emoji.no} Bạn không thể dùng bả ở kênh này!`,
        );
      }

      const isDefaultChannel = !config.channel_themes[channelId];
      if (isDefaultChannel) {
        const cooldownEndTime = client.lureCooldowns.get(user.id);
        if (cooldownEndTime && Date.now() < cooldownEndTime) {
          const remainingMinutes = Math.ceil(
            (cooldownEndTime - Date.now()) / 60000,
          );
          throw new UserFriendlyError(
            `${config.emoji.no} Bạn đang trong thời gian hồi. Bạn có thể dùng bả tiếp theo sau ${remainingMinutes} phút.`,
          );
        }
      }

      if (quantity > 1) {
        throw new UserFriendlyError(
          `${config.emoji.no} Bạn chỉ có thể sử dụng một bả mỗi lần.`,
        );
      }

      if (client.activeLures.has(channelId)) {
        throw new UserFriendlyError(
          `${config.emoji.no} Đã có một loại bả đang hoạt động ở kênh này.`,
        );
      }

      const channelTheme = config.channel_themes[channelId];
      if (channelTheme && item.boosts_type) {
        const isCompatible = item.boosts_type.some((type) =>
          channelTheme.main_types.includes(type),
        );
        if (!isCompatible) {
          throw new UserFriendlyError(
            `${config.emoji.no} Loại bả này không tương thích với hệ sinh thái ở đây!`,
          );
        }
      }
    } else if (item.item_type === "tool" && (itemId === "wc" || itemId === "weapon_box" || itemId === "abyssalhorn")) {
      const { hasRpgCharacter } = require("./rpgUtil");
      const dbUser = await User.findOne({ userId: user.id });
      if (!hasRpgCharacter(dbUser)) {
        throw new UserFriendlyError(
          `${config.emoji.no} Bạn chưa tạo nhân vật RPG. Hãy dùng lệnh \`${config.prefix}class\` để tạo nhân vật trước khi sử dụng vật phẩm này.`
        );
      }
      if (itemId === "abyssalhorn") {
        if (client.rpgBosses && client.rpgBosses.has(channelId)) {
          throw new UserFriendlyError(
            `${config.emoji.no} Đang có một Boss Thế Giới đang xuất hiện tại kênh này rồi!`
          );
        }
        quantityToUse = 1;
      } else {
        if (quantity === "all") {
          quantityToUse = dbUser.inventory.get(itemId) || 0;
        } else {
          quantityToUse = quantity;
        }
      }
      if (quantityToUse <= 0) {
        throw new UserFriendlyError(
          `${config.emoji.no} Bạn không có vật phẩm này trong túi đồ.`
        );
      }
    } else if (item.item_type === "tool" && itemId === "catch-net") {
      const currentNet = await ActiveNet.findOne({ userId: user.id });
      const maxUses = settings.max_stacked_nets * settings.catch_net_uses;
      const currentUses = currentNet ? currentNet.uses : 0;
      if (currentUses > maxUses - settings.catch_net_uses) {
        throw new UserFriendlyError(
          `${config.emoji.no} ${item.name} của bạn đã đầy! Bạn không thể nạp thêm.`,
        );
      }

      const remainingCapacity = maxUses - currentUses;
      const usesToAdd = settings.catch_net_uses * quantity;
      if (usesToAdd > remainingCapacity) {
        quantityToUse = Math.floor(remainingCapacity / settings.catch_net_uses);
        resultMessage = `${config.emoji.warning} Chỉ nạp thêm ${quantityToUse} lần do số lượng ${item.name}${item.emoji} tối đa cho phép là ${settings.max_stacked_nets}.\n`;
      }
    } else if (item.item_type === "consumable" && itemId === "rare-candy") {
      const cokemonId = parseInt(targetId);
      if (isNaN(cokemonId)) {
        throw new UserFriendlyError(
          `${config.emoji.no} Bạn phải cung cấp ID của Cokemon để cho ăn ${item.name}.`,
        );
      }

      const cokemon = await getCokemon(user.id, cokemonId);
      const maxLevel = config.cokemon_settings.max_level;
      if (cokemon.level >= maxLevel) {
        throw new UserFriendlyError(
          `${config.emoji.no} **${cokemon.nickname || cokemon.species_id.name}** đã đạt cấp độ tối đa!`,
        );
      }

      const levelsToMax = maxLevel - cokemon.level;
      if (quantity > levelsToMax) {
        quantityToUse = levelsToMax;
        resultMessage = `${config.emoji.warning} **${getCokemonName(cokemon)}** chỉ cần ${levelsToMax} cấp nữa để đạt cấp độ tối đa. Chỉ sử dụng **${quantityToUse} ${item.name} ${item.emoji}**.\n`;
      }
    } else if (itemId === "souls" || itemId === "hexpiece") {
      throw new UserFriendlyError(
        `🟣 **Linh Hồn** và **Mảnh Vũ Khí Hex** không thể sử dụng trực tiếp.\n` +
        `Hãy dùng chúng để mua vũ khí Hex cực phẩm tại **Cửa Hàng Sự Kiện Hex** (gõ \`xshop\` và chuyển sang trang 3)!`
      );
    } else {
      throw new UserFriendlyError(
        `${config.emoji.no} Vật phẩm này không thể sử dụng được.`,
      );
    }

    if (quantityToUse > 0) {
      await consumeItem(user.id, itemId, quantityToUse);
    } else {
      return {
        success: true,
        message: `${config.emoji.no} Không có vật phẩm nào được sử dụng.`,
      };
    }

    if (item.item_type === "lure") {
      const expirationTime = Date.now() + settings.lure_duration_ms;
      client.activeLures.set(channelId, {
        expires_at: expirationTime,
        boosts_type: item.boosts_type,
        ownerId: user.id,
      });
      resultMessage += `✨ **${user.username || user.id}** đã sử dụng **${item.name}**${item.emoji}!`;
    } else if (item.item_type === "tool" && itemId === "catch-net") {
      const updatedNet = await ActiveNet.findOneAndUpdate(
        { userId: user.id },
        {
          $inc: { uses: quantityToUse * settings.catch_net_uses },
          $setOnInsert: { caught: new Map() },
        },
        { upsert: true, new: true },
      );
      if (resultMessage === "") {
        resultMessage += `${config.emoji.yes} Bạn đã nạp thêm **${quantityToUse} x ${item.name}**${item.emoji}!\n`;
      }
      resultMessage += `Tổng số lượt của bạn bây giờ là **${updatedNet.uses}**. Một bản tổng kết sẽ được gửi khi hết lượt.`;
    } else if (item.item_type === "consumable" && itemId === "rare-candy") {
      const cokemon = await getCokemon(user.id, parseInt(targetId));
      const originalLevel = cokemon.level;

      for (let i = 0; i < quantityToUse; i++) {
        if (cokemon.level >= config.cokemon_settings.max_level) break;
        const xpNeeded =
          getCokemonXpNeeded(cokemon.level + 1) - cokemon.experience;
        await addCokemonXp(cokemon, xpNeeded);
      }
      resultMessage += `🎉 **${getCokemonName(cokemon)}** ${getCokemonEmoji(cokemon)} đã ăn ${quantityToUse} ${item.name} ${item.emoji} và tăng từ **cấp ${originalLevel}** lên **cấp ${cokemon.level}**!`;
    } else if (item.item_type === "tool" && itemId === "abyssalhorn") {
      const { spawnBossNow } = require("../features/rpgBossSpawner");
      const spawnedBoss = await spawnBossNow(client, channelId);
      if (spawnedBoss) {
        resultMessage = `📢 **${user.username || user.id}** đã sử dụng **Tù Và Vực Thẳm** <:AbyssalHorn:1517221292124930190> và thức tỉnh **${spawnedBoss.boss.name}** tại kênh này!`;
      } else {
        resultMessage = `❌ Triệu hồi Boss thất bại, vui lòng thử lại sau.`;
      }
    } else if (item.item_type === "tool" && (itemId === "wc" || itemId === "weapon_box")) {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        throw new UserFriendlyError("Không tìm thấy channel.");
      }

      const { generateRpgGearDrop, addRpgGearToUser } = require("./rpgUtil");
      const dbUser = await User.findOne({ userId: user.id });
      const gears = [];
      for (let i = 0; i < quantityToUse; i++) {
        const gear = await generateRpgGearDrop(dbUser, { forceDrop: true, fromWc: true });
        if (gear) {
          addRpgGearToUser(dbUser, gear);
          gears.push(gear);
        }
      }
      
      const rarityRank = {
        Divine: 7,
        Ancient: 6,
        Mythic: 5,
        Legendary: 4,
        Epic: 3,
        Rare: 2,
        Common: 1
      };
      gears.sort((a, b) => {
        const rankA = rarityRank[a.rarity] || 0;
        const rankB = rarityRank[b.rarity] || 0;
        if (rankA !== rankB) return rankB - rankA;
        return (b.quality || 0) - (a.quality || 0);
      });

      await dbUser.save();

      const username = user.username || "Khang";
      const member = channel.guild ? await channel.guild.members.fetch(user.id).catch(() => null) : null;
      const displayName = member ? member.displayName : username;

      const initialContent = quantityToUse === 1
        ? `<a:wcstake:1512793702815240383> | **${displayName}** opens a weapon crate\n<a:wcstake:1512793702815240383> | and finds a ...`
        : `<a:wcstake:1512793702815240383> | **${displayName}** is opening **${quantityToUse}** weapon crates...`;
      const sentMsg = await channel.send(initialContent);

      setTimeout(async () => {
        const bracketEmoji = {
          Common: "<:common:1530878565489311826>",
          Rare: "<:rare:1530878574104547378>",
          Epic: "<:epic:1530878567955566642>",
          Legendary: "<:legendary:1530878570858287205>",
          Mythic: "<a:mythic:1530878614843686912>",
          Ancient: "<a:ancient:1530878606656540814>",
          Divine: "<a:divine:1530878610515165365>",
        };
        const slotEmoji = {
          weapon: "🗡️",
          armor: "🛡️",
          helmet: "🪖",
          boots: "🥾",
          ring: "💍",
          necklace: "📿",
        };
        
        let finalContent = "";
        if (quantityToUse === 1) {
          const g = gears[0];
          finalContent = `<a:wcopen:1512793700181475469> | \`G${g.id}\` ${g.name} **${g.quality.toFixed(1)}%**`;
        } else {
          const emojiLine = gears.map(g => {
            const gBracket = bracketEmoji[g.rarity] || "<:common:1530878565489311826>";
            const gEmoji = g.emoji || slotEmoji[g.slot] || "🛡️";
            return `${gBracket}${gEmoji}`;
          }).slice(0, 20).join(" ");
          
          finalContent = `<a:wcopen:1512793700181475469> | **${displayName}** opened **${quantityToUse}** weapon crates: ${emojiLine}`;
          if (gears.length > 20) {
            finalContent += ` và **${gears.length - 20}** trang bị khác.`;
          }
        }
        await sentMsg.edit(finalContent).catch(() => null);
      }, 2500);

      return { resultMessage: null, itemType: "lure" };
    }
    return { resultMessage, itemType: item.item_type };
  }, "useItem");
};

const consumeItem = async (userId, itemId, quantity = 1) => {
  return handleUtilityError(async () => {
    const consumeTransaction = async (session) => {
      const user = await getUser(userId, session);
      const ownedQuantity = user.inventory.get(itemId) || 0;
      if (ownedQuantity < quantity) {
        throw new UserFriendlyError(
          `${config.emoji.no} Bạn không có đủ vật phẩm. Cần ${quantity}, đang có ${ownedQuantity}.`,
        );
      }

      const newQuantity = ownedQuantity - quantity;
      if (newQuantity === 0) {
        user.inventory.delete(itemId);
      } else {
        user.inventory.set(itemId, newQuantity);
      }
      await user.save({ session });
    };
    await runTransactionWithRetry(consumeTransaction);
  }, "consumeItem");
};

const getCokemon = async (userId, cokemonUid) => {
  const cokemon = await Cokemon.findOne({ owner_id: userId, uid: cokemonUid })
    .populate("species_id")
    .populate("ability")
    .populate("held_item_id");
  if (!cokemon) {
    throw new UserFriendlyError(
      `${config.emoji.no} Không tìm thấy Cokemon với ID ${cokemonUid} trong bộ sưu tập của bạn.`,
    );
  }
  return cokemon;
};

const getAllCokemonWithUids = async (userId, Uids) => {
  return await Cokemon.find({ owner_id: userId, uid: { $in: Uids } })
    .populate("species_id")
    .populate("ability")
    .populate("held_item_id");
};

const getFilteredCokemon = async (userId, cokemonQuery, speciesQuery) => {
  const finalCokemonQuery = { ...cokemonQuery, owner_id: userId };
  let userCokemon = await Cokemon.find(finalCokemonQuery).populate({
    path: "species_id",
    match: speciesQuery,
  });

  
  
  userCokemon = userCokemon.filter((c) => c.species_id);
  return userCokemon;
};

const registerDexEntry = async (userId, speciesId, isShiny) => {
  const user = await getUser(userId);
  const speciesIdString = speciesId.toString();
  const dexEntry = user.cokedex.get(speciesIdString) || {
    caught: 0,
    has_shiny: false,
    owned: false,
  };
  dexEntry.owned = true;
  if (isShiny && !dexEntry.has_shiny) {
    dexEntry.has_shiny = true;
  }
  user.cokedex.set(speciesIdString, dexEntry);
  await user.save();
};

const addCokemon = async (cokemonData) => {
  return handleUtilityError(async () => {
    const session = await mongoose.startSession();
    try {
      let newCokemon = null;
      let bonusReward = 0;

      await session.withTransaction(async (session) => {
        const user = await getUser(cokemonData.owner_id, session);
        user.last_cokemon_id++;

        newCokemon = new Cokemon({
          ...cokemonData,
          uid: user.last_cokemon_id,
        });

        const speciesIdString = cokemonData.species_id.toString();
        const dexEntry = user.cokedex.get(speciesIdString) || {
          caught: 0,
          has_shiny: false,
          owned: false,
        };
        if (["manual", "net"].includes(cokemonData.catch_method)) {
          dexEntry.caught += 1;
        }
        if (cokemonData.is_shiny && !dexEntry.has_shiny) {
          dexEntry.has_shiny = true;
        }
        if (!dexEntry.owned) {
          await newCokemon.populate("species_id");
          const tier = newCokemon.species_id.tier;
          bonusReward = config.cokemon_settings.tier_release_rewards[tier];
          user.coke += bonusReward;
          dexEntry.owned = true;
        }
        user.cokedex.set(speciesIdString, dexEntry);
        await newCokemon.save({ session });
        await user.save({ session });
      });
      return { cokemon: newCokemon, bonusReward };
    } finally {
      session.endSession();
    }
  }, "addCokemon");
};

const addCokemons = async (cokemonDataArray) => {
  if (!cokemonDataArray || cokemonDataArray.length === 0) return;

  const cokemonByOwner = new Map();
  for (const data of cokemonDataArray) {
    if (!cokemonByOwner.has(data.owner_id)) {
      cokemonByOwner.set(data.owner_id, []);
    }
    cokemonByOwner.get(data.owner_id).push(data);
  }

  for (const [userId, userCokemons] of cokemonByOwner.entries()) {
    const user = await getUser(userId);
    let currentUid = user.last_cokemon_id;
    const cokemons = [];

    for (const data of userCokemons) {
      currentUid++;
      cokemons.push({ ...data, uid: currentUid });
      const speciesIdString = data.species_id.toString();
      const dexEntry = user.cokedex.get(speciesIdString) || {
        caught: 0,
        has_shiny: false,
        owned: false,
      };
      if (["manual", "net"].includes(data.catch_method)) {
        dexEntry.caught++;
      }
      if (data.is_shiny && !dexEntry.has_shiny) {
        dexEntry.has_shiny = true;
      }
      dexEntry.owned = true;
      user.cokedex.set(speciesIdString, dexEntry);
    }

    await Cokemon.insertMany(cokemons);
    user.last_cokemon_id = currentUid;
    await user.save();
  }
};

const removeCokemon = async (userId, cokemonUids, totalReward) => {
  return handleUtilityError(async () => {
    let releasedCount = 0;
    const releaseTransaction = async (session) => {
      const cokemonToDelete = await Cokemon.find(
        { owner_id: userId, uid: { $in: cokemonUids } },
        null,
        { session },
      );
      if (cokemonToDelete.length !== cokemonUids.length) {
        throw new UserFriendlyError(
          `${config.emoji.no} Một hoặc nhiều ID cokemon không hợp lệ hoặc không thuộc về bạn.`,
        );
      }
      if (cokemonToDelete.length === 0) {
        throw new UserFriendlyError(
          `${config.emoji.no} Không có cokemon nào được chọn để thả.`,
        );
      }

      const idsToDelete = cokemonToDelete.map((c) => c._id);
      const user = await getUser(userId, session);
      if (user.active_cokemon_id) {
        const isActiveBeingDeleted = idsToDelete.some((id) =>
          id.equals(user.active_cokemon_id),
        );
        if (isActiveBeingDeleted) {
          user.active_cokemon_id = null;
        }
      }

      await Cokemon.deleteMany({ _id: { $in: idsToDelete } }, { session });
      user.coke += totalReward;
      await user.save({ session });
      releasedCount = cokemonToDelete.length;
    };
    await runTransactionWithRetry(releaseTransaction);
    return releasedCount;
  }, "removeCokemon");
};

const toggleFavorite = async (userId, cokemonUid) => {
  return handleUtilityError(async () => {
    let resultData = {};
    const favoriteTransaction = async (session) => {
      const cokemon = await Cokemon.findOne({
        owner_id: userId,
        uid: cokemonUid,
      }).session(session);
      if (!cokemon) {
        throw new UserFriendlyError(
          `${config.emoji.no} Không tìm thấy cokemon với ID ${cokemonUid} trong bộ sưu tập của bạn.`,
        );
      }

      const newStatus = !cokemon.is_favorite;
      cokemon.is_favorite = newStatus;
      await cokemon.save({ session });

      const species = await cokemon.populate("species_id");
      resultData = {
        isFavorite: newStatus,
        cokemonName: getCokemonName(cokemon),
      };
    };
    await runTransactionWithRetry(favoriteTransaction);
    return resultData;
  }, "toggleFavorite");
};

const getActiveCokemon = async (userIdOrUser) => {
  const user = typeof userIdOrUser === "string" ? await getUser(userIdOrUser) : userIdOrUser;
  if (!user.active_cokemon_id) {
    throw new UserFriendlyError(
      `${config.emoji.no} Bạn chưa chọn bạn đồng hành nào. Dùng \`${config.prefix}select <ID>\` để chọn một cokemon.`,
    );
  }
  const cokemon = await Cokemon.findById(user.active_cokemon_id).populate(
    "species_id",
  );
  if (!cokemon) {
    user.active_cokemon_id = null;
    await user.save();
    throw new UserFriendlyError(
      `${config.emoji.warning} Cokemon đồng hành của bạn không còn tồn tại. Vui lòng chọn một cokemon khác.`,
    );
  }
  return cokemon;
};

const selectActiveCokemon = async (userId, cokemonUid) => {
  return handleUtilityError(async () => {
    const session = await mongoose.startSession();
    try {
      let resultData = {};
      await session.withTransaction(async (session) => {
        const cokemonToSelect = await Cokemon.findOne({
          owner_id: userId,
          uid: cokemonUid,
        }).session(session);
        if (!cokemonToSelect) {
          throw new UserFriendlyError(
            `${config.emoji.no} Không tìm thấy cokemon với ID ${cokemonUid} trong bộ sưu tập của bạn.`,
          );
        }

        await User.updateOne(
          { userId: userId },
          { $set: { active_cokemon_id: cokemonToSelect._id } },
          { upsert: true, session: session },
        );
        const species = await cokemonToSelect.populate("species_id");
        resultData = {
          cokemonName: cokemonToSelect.nickname || species.species_id.name,
          emoji: cokemonToSelect.is_shiny
            ? species.species_id.shiny_emoji || `${species.species_id.emoji}✨`
            : species.species_id.emoji,
        };
      });
      return resultData;
    } finally {
      session.endSession();
    }
  }, "selectActiveCokemon");
};

const getUserXpNeeded = (level) => 2000 + (level - 1) * 1000;

const addUserXp = async (user, amount) => {
  const dailyXpMax = 3000;
  const today = new Date().toISOString().split("T")[0];
  if (user.lastXpReset?.toISOString().split("T")[0] !== today) {
    user.dailyXp = 0;
    user.lastXpReset = new Date();
  }

  if (user.dailyXp >= dailyXpMax) {
    return { leveledUp: false };
  }

  const gain = Math.min(amount, dailyXpMax - user.dailyXp);
  user.xp += gain;
  user.dailyXp += gain;

  let leveledUp = false;
  let oldLevel = user.level;
  let totalReward = 0;

  while (user.xp >= getUserXpNeeded(user.level)) {
    user.xp -= getUserXpNeeded(user.level);
    user.level++;
    const reward = 10000 + (user.level - 1) * 5000;
    totalReward += reward;
    user.coke += reward;
    leveledUp = true;
  }

  if (leveledUp || gain > 0) {
    await user.save();
  }
  return { leveledUp, oldLevel, newLevel: user.level, totalReward };
};

const addToBlacklist = async (userId, message) => {
  await User.updateOne(
    { userId },
    { $set: { isBlacklisted: true } },
    { upsert: true },
  );
  message.client.blacklistedUsers.add(userId);
};

const removeFromBlacklist = async (userId, message) => {
  await User.updateOne({ userId }, { $set: { isBlacklisted: false } });
  message.client.blacklistedUsers.delete(userId);
};

const getRankEmoji = (level) => {
  if (level <= 10) return "<:common:1530878565489311826>";
  if (level <= 20) return "<:rare:1530878574104547378>";
  if (level <= 30) return "<:epic:1530878567955566642>";
  if (level <= 40) return "<:legendary:1530878570858287205>";
  if (level <= 50) return "<a:mythic:1530878614843686912>";
  if (level <= 60) return "<a:ancient:1530878606656540814>";
  return "<a:divine:1530878610515165365>";
};

module.exports = {
  getOrCreateUser,
  getUser,
  isDev,
  isAdmin,
  giveCmd,
  removeTransferalOlderThanNDays,
  removeReceiptOlderThanNDays,
  validateBeforeGiving,
  decBalance,
  incBalance,
  getTotalCoke,
  buyItem,
  sellItem,
  useItem,
  consumeItem,
  getCokemon,
  getAllCokemonWithUids,
  getFilteredCokemon,
  registerDexEntry,
  addCokemon,
  addCokemons,
  removeCokemon,
  toggleFavorite,
  getActiveCokemon,
  selectActiveCokemon,
  getUserXpNeeded,
  addUserXp,
  addToBlacklist,
  removeFromBlacklist,
  getRankEmoji,
};
