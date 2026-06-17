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
const { drawBettingCanvas, drawResultCanvas } = require("../../utils/baucuaCanvas");
const { getDrift } = require("../../utils/timeSync");

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

// Hàm tạo giao diện bảng đặt cược (giống phong cách bảng căn cột của OwO)
function generateGameEmbed(game) {
  const drift = getDrift();
  const timestampDiscord = `<t:${Math.floor((game.createdAt + 60000 - drift) / 1000)}:R>`;

  let description =
    `**Chủ sòng:** <@${game.hostId}>\n` +
    `**Thời gian kết thúc:** ${timestampDiscord}\n\n` +
    `**Click các nút bên dưới để chọn và cược (Tối đa 250k):**\n\n` +
    `**DANH SÁCH ĐẶT CƯỢC**\n`;

  ITEMS.forEach((item) => {
    const itemBets = [];
    let totalItemBet = 0;

    for (const [userId, bets] of game.bets.entries()) {
      const amountOnItem = bets
        .filter((b) => b.choice === item.id)
        .reduce((sum, b) => sum + b.amount, 0);
      if (amountOnItem > 0) {
        totalItemBet += amountOnItem;
        const username = game.usernames.get(userId) || `<@${userId}>`;
        itemBets.push(`${username} (**${amountOnItem.toLocaleString()}**)`);
      }
    }

    const playersStr = itemBets.length > 0 ? itemBets.join(", ") : "*Chưa có cược*";
    description += `${item.emoji} **${item.name}** (${totalItemBet.toLocaleString()}): ${playersStr}\n`;
  });

  const embed = new EmbedBuilder()
    .setColor("#248046") // Màu xanh lá giống OwO
    .setTitle("BẦU CUA TÔM CÁ")
    .setDescription(description)
    .setImage(`attachment://baucua_betting_${game.gameId}.png`);

  return embed;
}

// Hàm tạo các nút đặt cược (màu xanh Success)
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
  description: "🎲 Trò chơi Bầu Cua Tôm Cá nhiều người chơi phong cách OwO!",
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

    // Cooldown theo kênh
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
      hostUsername: message.member?.displayName || message.author.username,
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
    const attachment = await drawBettingCanvas(game);

    const mainMsg = await message.channel.send({
      embeds: [embed],
      files: [attachment],
      components: buttons
    });
    game.message = mainMsg;

    // Lắng nghe tương tác của người chơi
    const interactionListener = async (interaction) => {
      // 1. Xử lý nút bấm chọn con vật
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

        // Mở Modal đặt cược
        const modal = new ModalBuilder()
          .setCustomId(`bc_modal_${gameId}_${choiceId}`)
          .setTitle(`Cược ${item.name} (Tối đa ${maxRemainingBet.toLocaleString()})`);

        const betInput = new TextInputBuilder()
          .setCustomId("bc_input_amount")
          .setLabel(`Số Coke muốn cược vào ${item.name}:`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(`Nhập số tiền hoặc 'all' (Tối đa: 250,000)`)
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
          // Sử dụng hàm tiện ích getBetAmount
          const amount = await getBetAmount(betInputVal, interaction.user.id, maxRemainingBet, 1);

          // Trừ tiền cược
          await decBalance(interaction.user.id, amount);

          // Ghi nhận cược
          userBets.push({ choice: choiceId, amount });
          game.bets.set(interaction.user.id, userBets);
          game.usernames.set(
            interaction.user.id,
            interaction.member?.displayName || interaction.user.username
          );

          await interaction.reply({
            content: `${emoji.yes} Bạn đã đặt cược thành công **${amount.toLocaleString()}** Coke vào **${item.emoji} ${item.name}**!`,
            ephemeral: true
          });

          const attachment = await drawBettingCanvas(game);
          await game.message.edit({
            embeds: [generateGameEmbed(game)],
            files: [attachment]
          }).catch(() => null);
        } catch (error) {
          return interaction.reply({
            content: error.message || `${emoji.no} Lỗi đặt cược không hợp lệ. Vui lòng thử lại!`,
            ephemeral: true
          });
        }
      }
    };

    client.on("interactionCreate", interactionListener);
    game.modalCollectorListener = interactionListener;

    // Timeout kết thúc đặt cược sau 1 phút
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

    // Cập nhật giao diện thông báo đang lắc
    const disabledButtons = generateGameButtons(game.gameId, true);
    const rollingEmbed = new EmbedBuilder()
      .setColor("#248046")
      .setTitle("BẦU CUA TÔM CÁ")
      .setDescription(
        `**Người tạo:** <@${game.hostId}>\n` +
        `**Đã hết thời gian đặt cược!**\n\n` +
        `**Đang lắc đĩa...**\n` +
        `\` 🎲 Lắc... \` \` 🎲 Lắc... \` \` 🎲 Lắc... \``
      );

    await game.message.edit({
      embeds: [rollingEmbed],
      components: disabledButtons,
      files: [] // Xóa hình nền đặt cược cũ
    }).catch(() => null);

    // Chờ 3 giây
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Lấy kết quả ngẫu nhiên 3 xúc xắc
    const results = [];
    for (let i = 0; i < 3; i++) {
      const idx = await random(0, 5);
      results.push(ITEMS[idx]);
    }

    const winPlayers = [];
    const losePlayers = [];
    const drawPlayers = [];

    // Tính tiền thưởng và phân loại
    for (const [userId, userBets] of game.bets.entries()) {
      const totalBet = userBets.reduce((sum, b) => sum + b.amount, 0);
      let totalPrize = 0;
      const details = [];

      for (const bet of userBets) {
        const matchCount = results.filter((r) => r.id === bet.choice).length;
        if (matchCount > 0) {
          const prize = bet.amount * (matchCount + 1);
          totalPrize += prize;
          details.push(`${ITEMS.find((i) => i.id === bet.choice).emoji} thắng x${matchCount} (+**${(bet.amount * matchCount).toLocaleString()}**)`);
        } else {
          details.push(`${ITEMS.find((i) => i.id === bet.choice).emoji} thua (-**${bet.amount.toLocaleString()}**)`);
        }
      }

      if (totalPrize > 0) {
        await incBalance(userId, totalPrize);
      }

      const netProfit = totalPrize - totalBet;
      const username = game.usernames.get(userId) || `<@${userId}>`;

      if (netProfit > 0) {
        winPlayers.push({ userId, username, netProfit, details });
      } else if (netProfit < 0) {
        losePlayers.push({ userId, username, netProfit, details });
      } else {
        drawPlayers.push({ userId, username, netProfit, details });
      }
    }

    const allPlayers = [...winPlayers, ...losePlayers, ...drawPlayers];
    allPlayers.sort((a, b) => b.netProfit - a.netProfit);

    const resultLines = [];
    resultLines.push("` Rank ` `   Payout   ` ` Player `");

    allPlayers.forEach((p, index) => {
      const rankStr = String(index + 1).padEnd(4, " ");
      const profitSign = p.netProfit >= 0 ? "+" : "";
      const profitStr = `${profitSign}${p.netProfit.toLocaleString()}`.padEnd(10, " ");
      resultLines.push(`\`  ${rankStr} \` \` ${profitStr} \` ${p.username} (${p.details.join(", ")})`);
    });

    let totalBet = 0;
    let totalWinners = 0;
    allPlayers.forEach(p => {
      const userBets = game.bets.get(p.userId) || [];
      totalBet += userBets.reduce((sum, b) => sum + b.amount, 0);
      if (p.netProfit > 0) totalWinners++;
    });

    // Vẽ và gửi kết quả bằng Canvas (chỉ chứa 3 xúc xắc rolled khổng lồ)
    const resultAttachment = await drawResultCanvas(game, results);
    const embedResult = new EmbedBuilder()
      .setColor("#248046")
      .setTitle("KẾT QUẢ BẦU CUA")
      .setDescription(
        `**Người tạo:** <@${game.hostId}>\n` +
        `**Trận đấu kết thúc!**\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**CHI TIẾT TRẢ THƯỞNG**\n` +
        (resultLines.length === 1 ? "*Không có người chơi nào đặt cược.*" : resultLines.join("\n")) +
        `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**THỐNG KÊ PHIÊN CHƠI**\n` +
        `• Tổng tiền cược: **${totalBet.toLocaleString()} Coke**\n` +
        `• Số người thắng: **${totalWinners} người chơi**\n` +
        `• Tổng số người chơi: **${game.bets.size} người chơi**`
      )
      .setImage(`attachment://baucua_result_${game.gameId}.png`);

    await game.message.edit({
      embeds: [embedResult],
      files: [resultAttachment],
      components: []
    }).catch((err) => console.error("[Baucua Edit Result Error]", err));

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
