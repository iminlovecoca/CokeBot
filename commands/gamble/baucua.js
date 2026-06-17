const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const random = require("random-number-csprng");
const { checkAndSetCooldown, notifyCooldown } = require("../../utils/cooldown");
const { incBalance, decBalance } = require("../../utils/userUtil");
const { getBetAmount } = require("../../utils/gameUtil");
const config = require("../../data/config");
const emoji = config.emoji;
const settings = config.gamble_settings;

// Danh sách 6 con vật bầu cua tôm cá
const ITEMS = [
  { id: "cua", name: "Cua", emoji: "🦀" },
  { id: "tom", name: "Tôm", emoji: "🦐" },
  { id: "bau", name: "Bầu", emoji: "🍐" },
  { id: "ga", name: "Gà", emoji: "🐓" },
  { id: "huou", name: "Hươu", emoji: "🦌" },
  { id: "ca", name: "Cá", emoji: "🐟" }
];

const activeGames = new Map();

// Hàm tạo giao diện bảng đặt cược
function generateGameEmbed(game) {
  const timestampDiscord = `<t:${Math.floor((game.createdAt + 60000) / 1000)}:R>`;

  const embed = new EmbedBuilder()
    .setColor("#FFD700")
    .setTitle("BẦU CUA TÔM CÁ")
    .setDescription(
      `**Chủ sòng:** <@${game.hostId}>\n` +
      `**Thời gian kết thúc:** ${timestampDiscord}\n\n` +
      `**Click các nút bên dưới để chọn và cược (Tối đa 250k):**`
    );

  const betDetails = [];
  ITEMS.forEach((item) => {
    const itemBets = [];
    for (const [userId, bets] of game.bets.entries()) {
      const amountOnItem = bets
        .filter((b) => b.choice === item.id)
        .reduce((sum, b) => sum + b.amount, 0);
      if (amountOnItem > 0) {
        const username = game.usernames.get(userId) || `<@${userId}>`;
        itemBets.push(`${username} (**${amountOnItem.toLocaleString()}**)`);
      }
    }

    if (itemBets.length > 0) {
      betDetails.push(`${item.emoji} **${item.name}**: ${itemBets.join(", ")}`);
    } else {
      betDetails.push(`${item.emoji} **${item.name}**: *Chưa có cược*`);
    }
  });

  embed.addFields({
    name: "DANH SÁCH ĐẶT CƯỢC",
    value: betDetails.join("\n")
  });

  return embed;
}

// Hàm tạo các nút đặt cược (🦀 🦐 🍐 🐓 🦌 🐟)
function generateGameButtons(gameId, disabled = false) {
  const row1 = new ActionRowBuilder();
  const row2 = new ActionRowBuilder();

  ITEMS.slice(0, 3).forEach((item) => {
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId(`bc_btn_${gameId}_${item.id}`)
        .setLabel(`${item.emoji} ${item.name}`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled)
    );
  });

  ITEMS.slice(3, 6).forEach((item) => {
    row2.addComponents(
      new ButtonBuilder()
        .setCustomId(`bc_btn_${gameId}_${item.id}`)
        .setLabel(`${item.emoji} ${item.name}`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled)
    );
  });

  return [row1, row2];
}

module.exports = {
  name: "baucua",
  aliases: ["bc", "bctc"],
  description: "🎲 Trò chơi Bầu Cua Tôm Cá nhiều người chơi bằng Coke!",
  usage: `${config.prefix}baucua`,
  examples: [
    {
      intent: "Khởi động bàn chơi bầu cua tôm cá cho cả kênh tham gia",
      command: `${config.prefix}baucua`
    }
  ],

  async execute(message) {
    const channelId = message.channel.id;
    const client = message.client;

    // Cooldown theo kênh để tránh spam tạo bàn chơi
    const remainingCooldown = checkAndSetCooldown(
      channelId,
      "baucua",
      settings.cooldown_second || 30
    );
    if (remainingCooldown > 0) {
      return notifyCooldown(message, remainingCooldown);
    }

    if (activeGames.has(channelId)) {
      return message.reply(`${emoji.no} **|** Trò chơi Bầu Cua đang diễn ra trong kênh này rồi!`);
    }

    const gameId = Math.random().toString(36).substring(2, 9);
    const game = {
      gameId,
      channelId,
      hostId: message.author.id,
      status: "betting",
      createdAt: Date.now(),
      bets: new Map(), // Map<userId, Array<{ choice, amount }>>
      usernames: new Map(), // Map<userId, string>
      message: null,
      timer: null,
      modalCollectorListener: null
    };

    activeGames.set(channelId, game);

    const embed = generateGameEmbed(game);
    const buttons = generateGameButtons(gameId, false);

    const mainMsg = await message.channel.send({
      embeds: [embed],
      components: buttons
    });
    game.message = mainMsg;

    // Lắng nghe tương tác của người chơi
    const interactionListener = async (interaction) => {
      // 1. Xử lý khi người chơi nhấn nút chọn con vật
      if (interaction.isButton() && interaction.customId.startsWith(`bc_btn_${gameId}_`)) {
        if (game.status !== "betting") {
          return interaction.reply({
            content: `${emoji.no} Đã hết thời gian đặt cược cho phiên game này!`,
            ephemeral: true
          });
        }

        const choiceId = interaction.customId.split("_").pop();
        const item = ITEMS.find((i) => i.id === choiceId);
        if (!item) return;

        // Mỗi người chỉ được đặt cược tối đa 1 lần trong 1 ván
        const userBets = game.bets.get(interaction.user.id) || [];
        if (userBets.length > 0) {
          return interaction.reply({
            content: `${emoji.no} Bạn đã đặt cược trong ván này rồi! Mỗi người chỉ được đặt cược 1 lần.`,
            ephemeral: true
          });
        }

        const maxRemainingBet = 250000;

        // Mở Modal nhập tiền cược
        const modal = new ModalBuilder()
          .setCustomId(`bc_modal_${gameId}_${choiceId}`)
          .setTitle(`Cược ${item.name} (Tối đa ${maxRemainingBet.toLocaleString()})`);

        const betInput = new TextInputBuilder()
          .setCustomId("bc_input_amount")
          .setLabel(`Số Coke muốn cược vào ${item.name}:`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(`Nhập số tiền hoặc 'all' (Tối đa: ${maxRemainingBet.toLocaleString()})`)
          .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(betInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
      }

      // 2. Xử lý khi người chơi submit Modal
      if (interaction.isModalSubmit() && interaction.customId.startsWith(`bc_modal_${gameId}_`)) {
        if (game.status !== "betting") {
          return interaction.reply({
            content: `${emoji.no} Đã hết thời gian đặt cược cho phiên game này!`,
            ephemeral: true
          });
        }

        const choiceId = interaction.customId.split("_").pop();
        const item = ITEMS.find((i) => i.id === choiceId);
        if (!item) return;

        const betInputVal = interaction.fields.getTextInputValue("bc_input_amount").trim();

        // Mỗi người chỉ được đặt cược tối đa 1 lần trong 1 ván
        const userBets = game.bets.get(interaction.user.id) || [];
        if (userBets.length > 0) {
          return interaction.reply({
            content: `${emoji.no} Bạn đã đặt cược trong ván này rồi! Mỗi người chỉ được đặt cược 1 lần.`,
            ephemeral: true
          });
        }

        const maxRemainingBet = 250000;

        try {
          // Sử dụng hàm tiện ích getBetAmount của bot để đảm bảo tính đồng nhất
          const amount = await getBetAmount(betInputVal, interaction.user.id, maxRemainingBet, 1);

          // Trừ tiền cược ngay lập tức
          await decBalance(interaction.user.id, amount);

          // Lưu cược vào game state
          userBets.push({ choice: choiceId, amount });
          game.bets.set(interaction.user.id, userBets);
          game.usernames.set(
            interaction.user.id,
            interaction.member?.displayName || interaction.user.username
          );

          // Phản hồi ẩn thông báo cược thành công
          await interaction.reply({
            content: `${emoji.yes} Bạn đã đặt cược thành công **${amount.toLocaleString()}** Coke vào **${item.emoji} ${item.name}**!`,
            ephemeral: true
          });

          // Cập nhật lại giao diện bảng cược
          await game.message.edit({ embeds: [generateGameEmbed(game)] }).catch(() => null);
        } catch (error) {
          // Bắt lỗi UserFriendlyError từ getBetAmount (như thiếu tiền cược, nhập chữ không hợp lệ, v.v.)
          return interaction.reply({
            content: error.message || `${emoji.no} Lỗi đặt cược không hợp lệ. Vui lòng thử lại!`,
            ephemeral: true
          });
        }
      }
    };

    client.on("interactionCreate", interactionListener);
    game.modalCollectorListener = interactionListener;

    // Timeout kết thúc nhận cược sau 1 phút
    game.timer = setTimeout(async () => {
      await runRollingPhase(game, client);
    }, 60000);
  }
};

// Hàm xử lý việc lắc xúc xắc và trả thưởng
async function runRollingPhase(game, client) {
  try {
    if (game.status !== "betting") return;
    game.status = "rolling";

    // Hủy đăng ký lắng nghe sự kiện
    if (game.modalCollectorListener) {
      client.removeListener("interactionCreate", game.modalCollectorListener);
    }

    // Cập nhật giao diện thông báo đang lắc (bỏ các emoji trang trí thừa)
    const disabledButtons = generateGameButtons(game.gameId, true);
    const rollingEmbed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("BẦU CUA TÔM CÁ")
      .setDescription(
        `**Người tạo:** <@${game.hostId}>\n` +
        `**Đã hết thời gian đặt cược!**\n\n` +
        `**Đang lắc đĩa...**\n` +
        `**[ ? ]  [ ? ]  [ ? ]**`
      );

    await game.message.edit({
      embeds: [rollingEmbed],
      components: disabledButtons
    }).catch(() => null);

    // Chờ 3 giây lắc đĩa như yêu cầu
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Chọn ngẫu nhiên kết quả 3 viên xúc xắc bầu cua
    const results = [];
    for (let i = 0; i < 3; i++) {
      const idx = await random(0, 5);
      results.push(ITEMS[idx]);
    }

    const winPlayers = [];
    const losePlayers = [];
    const drawPlayers = [];

    // Tính tiền thưởng và phân loại người chơi
    for (const [userId, userBets] of game.bets.entries()) {
      const totalBet = userBets.reduce((sum, b) => sum + b.amount, 0);
      let totalPrize = 0;
      const details = [];

      for (const bet of userBets) {
        const matchCount = results.filter((r) => r.id === bet.choice).length;
        if (matchCount > 0) {
          // Hoàn cược + thắng gấp x lần số lượng xuất hiện (ví dụ: trúng 1 con -> nhận x2 tiền cược)
          const prize = bet.amount * (matchCount + 1);
          totalPrize += prize;
          details.push(`${ITEMS.find((i) => i.id === bet.choice).emoji} thắng x${matchCount} (+**${(bet.amount * matchCount).toLocaleString()}**)`);
        } else {
          details.push(`${ITEMS.find((i) => i.id === bet.choice).emoji} thua (-**${bet.amount.toLocaleString()}**)`);
        }
      }

      // Trả thưởng vào tài khoản người chơi
      if (totalPrize > 0) {
        await incBalance(userId, totalPrize);
      }

      const netProfit = totalPrize - totalBet;
      const username = game.usernames.get(userId) || `<@${userId}>`;

      if (netProfit > 0) {
        winPlayers.push({ username, netProfit, details });
      } else if (netProfit < 0) {
        losePlayers.push({ username, netProfit, details });
      } else {
        drawPlayers.push({ username, netProfit, details });
      }
    }

    // Tạo hiển thị kết quả xúc xắc (bỏ các emoji lấp lánh trang trí)
    const resultDisplay =
      `**KẾT QUẢ XÚC XẮC**\n\n` +
      `**[ ${results[0].emoji} ${results[0].name} ]** ` +
      `**[ ${results[1].emoji} ${results[1].name} ]** ` +
      `**[ ${results[2].emoji} ${results[2].name} ]**`;

    const embedResult = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("KẾT QUẢ BẦU CUA")
      .setDescription(
        `**Người tạo:** <@${game.hostId}>\n` +
        `**Trận đấu kết thúc!**\n\n` +
        `${resultDisplay}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**CHI TIẾT TRẢ THƯỞNG**`
      );

    const resultLines = [];
    if (winPlayers.length > 0) {
      resultLines.push(`**Thắng cuộc:**`);
      winPlayers.forEach((p) => {
        resultLines.push(`• **${p.username}**: nhận lại và thắng **+${p.netProfit.toLocaleString()}** Coke (${p.details.join(", ")})`);
      });
    }
    if (losePlayers.length > 0) {
      if (resultLines.length > 0) resultLines.push("");
      resultLines.push(`**Thua cuộc:**`);
      losePlayers.forEach((p) => {
        resultLines.push(`• **${p.username}**: mất **-${Math.abs(p.netProfit).toLocaleString()}** Coke (${p.details.join(", ")})`);
      });
    }
    if (drawPlayers.length > 0) {
      if (resultLines.length > 0) resultLines.push("");
      resultLines.push(`⚖️ **Hòa vốn:**`);
      drawPlayers.forEach((p) => {
        resultLines.push(`• **${p.username}**: hòa vốn (${p.details.join(", ")})`);
      });
    }

    if (resultLines.length === 0) {
      embedResult.addFields({
        name: "Thông tin",
        value: "Không có người chơi nào tham gia đặt cược trong phiên này."
      });
    } else {
      embedResult.addFields({
        name: "Bảng kết quả",
        value: resultLines.join("\n")
      });
    }

    await game.message.edit({
      embeds: [embedResult],
      components: []
    }).catch(() => null);

  } catch (error) {
    console.error("[Baucua Error] Error in runRollingPhase:", error);
    try {
      await game.message.reply(`❌ **Đã xảy ra lỗi hệ thống khi tính kết quả Bầu Cua:** \`${error.message}\`. Vui lòng liên hệ Admin!`).catch(() => null);
    } catch (msgErr) {
      console.error("[Baucua Error] Failed to send error message to channel:", msgErr);
    }
  } finally {
    // Xóa game khỏi danh sách game đang chạy
    activeGames.delete(game.channelId);
  }
}
