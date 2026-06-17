const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder
} = require("discord.js");
const { createCanvas } = require("canvas");
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

// Hàm tạo các nút đặt cược (xanh lá success)
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

// Hàm vẽ 3 thẻ xúc xắc kết quả bằng Canvas (giống phong cách thẻ bài OwO)
function generateRollImage(results) {
  const width = 600;
  const height = 250;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Nền ảnh tối giống dark mode của Discord
  ctx.fillStyle = "#2f3136";
  ctx.fillRect(0, 0, width, height);

  const cardWidth = 150;
  const cardHeight = 210;
  const gap = 25;
  const startX = (width - (3 * cardWidth + 2 * gap)) / 2;
  const y = 20;

  const colors = {
    cua: { border: "#e74c3c", name: "CUA", bg: "#1e1f22" },
    tom: { border: "#e67e22", name: "TÔM", bg: "#1e1f22" },
    bau: { border: "#2ecc71", name: "BẦU", bg: "#1e1f22" },
    ga: { border: "#f1c40f", name: "GÀ", bg: "#1e1f22" },
    huou: { border: "#d35400", name: "HƯƠU", bg: "#1e1f22" },
    ca: { border: "#3498db", name: "CÁ", bg: "#1e1f22" }
  };

  const drawRoundRect = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  for (let i = 0; i < 3; i++) {
    const item = results[i];
    const cfg = colors[item.id] || { border: "#FFD700", name: item.name.toUpperCase(), bg: "#1e1f22" };
    const cardX = startX + i * (cardWidth + gap);

    // Vẽ bóng đổ nhẹ cho thẻ
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Vẽ nền thẻ bài
    drawRoundRect(cardX, y, cardWidth, cardHeight, 12);
    ctx.fillStyle = cfg.bg;
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Vẽ viền thẻ bài
    drawRoundRect(cardX, y, cardWidth, cardHeight, 12);
    ctx.lineWidth = 4;
    ctx.strokeStyle = cfg.border;
    ctx.stroke();

    // Tiêu đề thẻ: XÚC XẮC 1, 2, 3
    ctx.fillStyle = "#a3a6ac";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`XÚC XẮC ${i + 1}`, cardX + cardWidth / 2, y + 25);

    // Vạch kẻ chia nhỏ dưới tiêu đề
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + 20, y + 42);
    ctx.lineTo(cardX + cardWidth - 20, y + 42);
    ctx.stroke();

    // Vẽ tên con vật lớn có màu sắc ở giữa thẻ
    ctx.fillStyle = cfg.border;
    ctx.font = "bold 34px sans-serif";
    ctx.fillText(cfg.name, cardX + cardWidth / 2, y + 105);

    // Vẽ vòng tròn viền trang trí xung quanh tên
    ctx.beginPath();
    ctx.arc(cardX + cardWidth / 2, y + 105, 42, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Vẽ Emoji của con vật ở góc dưới
    ctx.fillStyle = "#ffffff";
    ctx.font = "24px sans-serif";
    ctx.fillText(item.emoji, cardX + cardWidth / 2, y + 165);
  }

  return canvas.toBuffer("image/png");
}

module.exports = {
  name: "baucua",
  aliases: ["bc", "bctc"],
  description: "🎲 Trò chơi Bầu Cua Tôm Cá cược bằng Coke phong cách OwO!",
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

          await game.message.edit({ embeds: [generateGameEmbed(game)] }).catch(() => null);
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

    // Cập nhật giao diện đang lắc
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

    // Vẽ hình ảnh xúc xắc kết quả bằng canvas
    const imageBuffer = generateRollImage(results);
    const attachment = new AttachmentBuilder(imageBuffer, { name: "roll.png" });

    // Tạo bảng xếp hạng trả thưởng (Bảng căn cột style OwO)
    const resultLines = [];
    resultLines.push("` Rank ` `   Payout   ` ` Player `");

    const allPlayers = [...winPlayers, ...losePlayers, ...drawPlayers];
    allPlayers.sort((a, b) => b.netProfit - a.netProfit);

    allPlayers.forEach((p, index) => {
      const rankStr = String(index + 1).padEnd(4, " ");
      const profitSign = p.netProfit >= 0 ? "+" : "";
      const profitStr = `${profitSign}${p.netProfit.toLocaleString()}`.padEnd(10, " ");
      
      resultLines.push(`\`  ${rankStr} \` \` ${profitStr} \` ${p.username} (${p.details.join(", ")})`);
    });

    const embedResult = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("KẾT QUẢ BẦU CUA")
      .setDescription(
        `**Người tạo:** <@${game.hostId}>\n` +
        `**Trận đấu kết thúc!**\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**CHI TIẾT TRẢ THƯỞNG**`
      )
      .setImage("attachment://roll.png");

    if (resultLines.length === 1) {
      embedResult.addFields({
        name: "Bảng kết quả",
        value: "*Không có người chơi nào tham gia đặt cược.*"
      });
    } else {
      embedResult.addFields({
        name: "Bảng kết quả",
        value: resultLines.join("\n")
      });
    }

    await game.message.edit({
      embeds: [embedResult],
      files: [attachment],
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
