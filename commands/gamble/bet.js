const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const mongoose = require("mongoose");
const FootballBet = require("../../models/FootballBet");
const { getUser } = require("../../utils/userUtil");
const {
  SCORE_MULTIPLIER,
  fetchUpcomingFixtures,
  listFootballCompetitions,
  parseExactScorePrediction,
  resolveFixtureTeamSide,
} = require("../../utils/footballBetApi");

function formatMoney(amount) {
  return Number(amount || 0).toLocaleString("vi-VN");
}

function formatKickoff(date) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function makeFixtureEmbed(fixtures, leagueKey = "") {
  const embed = new EmbedBuilder()
    .setColor(13250094)
    .setTitle("Kèo bóng đá sắp tới")
    .setDescription(
      "Dùng ID/tag bên dưới với `/bet place`: chọn trận trước, rồi chọn loại kèo.",
    )
    .setTimestamp();

  if (fixtures.length === 0) {
    embed.addFields({
      name: "Chưa có trận nào",
      value: leagueKey
        ? `Giải **${leagueKey}** hiện không có trận sắp tới từ nguồn API.`
        : "Nguồn API hiện chưa trả về trận sắp tới cho các giải đã cấu hình.",
    });
    return embed;
  }

  for (const fixture of fixtures) {
    const league = fixture.competitionName
      ? `\nGiải: ${fixture.competitionName}${fixture.competitionKey ? ` (${fixture.competitionKey})` : ""}`
      : "";
    embed.addFields({
      name: fixture.fixtureTag,
      value: `${fixture.homeTeam} vs ${fixture.awayTeam}\nID trận: ${fixture.matchId}\nBắt đầu: ${formatKickoff(fixture.kickoffAt)}${league}`,
    });
  }

  return embed;
}

function makeLeaguesEmbed(competitions) {
  const embed = new EmbedBuilder()
    .setColor(13250094)
    .setTitle("Các giải có thể đặt kèo")
    .setDescription(
      "Dùng key giải với option `league` trong `/bet fixtures` hoặc `/bet place`.",
    )
    .setTimestamp();

  if (competitions.length === 0) {
    embed.addFields({
      name: "Chưa có giải nào",
      value:
        "Hãy cấu hình `FOOTBALL_BET_COMPETITIONS_JSON`, hoặc dùng cấu hình cũ `FOOTBALL_BET_COMPETITION_ID` / `FOOTBALL_BET_FIXTURES_URL`.",
    });
    return embed;
  }

  for (const competition of competitions) {
    embed.addFields({
      name: competition.name,
      value: `Key: \`${competition.key}\`${competition.id ? `\nID: ${competition.id}` : ""}`,
    });
  }

  return embed;
}

function findFixture(fixtures, tag) {
  const normalizedTag = tag.toLowerCase();
  return fixtures.find(
    (item) =>
      item.fixtureTag === tag ||
      item.matchId === tag ||
      item.fixtureTag.toLowerCase() === normalizedTag,
  );
}

function canonicalTeamName(fixture, teamText) {
  const side = resolveFixtureTeamSide(fixture, teamText);
  if (side === "home") return fixture.homeTeam;
  if (side === "away") return fixture.awayTeam;
  return teamText;
}

function parseScoreBetPrediction(prediction) {
  const text = String(prediction || "").trim();
  const match = text.match(/^(.+?)\s+(\d+\s*[:\-]\s*\d+)$/);

  if (!match) {
    return null;
  }

  return {
    team: match[1].trim(),
    score: match[2].trim(),
  };
}

async function createBet({
  interaction,
  fixture,
  betType,
  team,
  score,
  amount,
}) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const user = await getUser(interaction.user.id, session);

      if ((user.coke || 0) < amount) {
        throw new Error(
          `Bạn không đủ coke. Cần ${formatMoney(amount)} nhưng chỉ có ${formatMoney(user.coke || 0)}.`,
        );
      }

      const existingBet = await FootballBet.findOne({
        userId: interaction.user.id,
        matchId: fixture.matchId,
        status: "pending",
      }).session(session);

      if (existingBet) {
        throw new Error("Bạn đã có kèo pending cho trận này rồi.");
      }

      const pickTeam = canonicalTeamName(fixture, team);

      user.coke -= amount;
      await user.save({ session });

      await FootballBet.create(
        [
          {
            userId: interaction.user.id,
            guildId: interaction.guildId,
            matchId: fixture.matchId,
            fixtureTag: fixture.fixtureTag,
            competitionName: fixture.competitionName,
            competitionKey: fixture.competitionKey || "",
            homeTeam: fixture.homeTeam,
            awayTeam: fixture.awayTeam,
            kickoffAt: fixture.kickoffAt,
            betType,
            prediction: score ? `${pickTeam} ${score}` : pickTeam,
            pickTeam,
            predictedScore: score ? parseExactScorePrediction(score) : null,
            stake: amount,
            status: "pending",
            source: fixture.raw,
          },
        ],
        { session },
      );
    });

    const betLabel = betType === "winner" ? "kèo đội thắng" : "kèo tỉ số";
    const pickText = score ? `${team} ${score}` : team;

    return interaction.reply({
      content:
        `✅ Đã đặt **${betLabel}** cho trận **${fixture.homeTeam} vs ${fixture.awayTeam}** với lựa chọn **${pickText}** và ${formatMoney(amount)} coke. ` +
        `Nếu thắng, payout sẽ theo hệ số x${SCORE_MULTIPLIER}. ID trận: \`${fixture.matchId}\`. Tag trận: \`${fixture.fixtureTag}\``,
      ephemeral: true,
    });
  } catch (error) {
    return interaction.reply({
      content: `❌ Không đặt được kèo: ${error.message}`,
      ephemeral: true,
    });
  } finally {
    session.endSession();
  }
}

module.exports = {
  name: "bet",
  data: new SlashCommandBuilder()
    .setName("bet")
    .setDescription("Đặt kèo bóng đá theo đội thắng hoặc tỉ số")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("fixtures")
        .setDescription("Xem các trận sắp tới và ID/tag để đặt kèo")
        .addStringOption((option) =>
          option
            .setName("league")
            .setDescription(
              "Key giải từ /bet leagues. Bỏ trống để xem tất cả giải đã cấu hình",
            )
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leagues")
        .setDescription("Xem các giải bóng đá đang được cấu hình để đặt kèo"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("place")
        .setDescription("Chọn trận trước rồi chọn loại kèo")
        .addStringOption((option) =>
          option
            .setName("id")
            .setDescription("ID hoặc tag trận đấu từ /bet fixtures")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Loại kèo muốn đặt")
            .addChoices(
              { name: "Kèo đội thắng", value: "winner" },
              { name: "Kèo tỉ số", value: "score" },
            )
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("prediction")
            .setDescription(
              "Đội thắng hoặc đội thắng kèm tỉ số, ví dụ Arsenal / Arsenal 2-1",
            )
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Số coke đặt cược")
            .setMinValue(1)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("league")
            .setDescription(
              "Key giải từ /bet leagues nếu muốn tìm trận trong một giải cụ thể",
            )
            .setRequired(false),
        ),
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "leagues") {
      return interaction.reply({
        embeds: [makeLeaguesEmbed(listFootballCompetitions())],
        ephemeral: true,
      });
    }

    if (subcommand === "fixtures") {
      try {
        const league = interaction.options.getString("league")?.trim() || "";
        const fixtures = await fetchUpcomingFixtures(10, league);
        return interaction.reply({
          embeds: [makeFixtureEmbed(fixtures, league)],
          ephemeral: true,
        });
      } catch (error) {
        return interaction.reply({
          content: `❌ Không lấy được lịch đấu: ${error.message}`,
          ephemeral: true,
        });
      }
    }

    const tag = (
      interaction.options.getString("id") ||
      interaction.options.getString("tag")
    ).trim();
    const league = interaction.options.getString("league")?.trim() || "";
    const amount = interaction.options.getInteger("amount");
    const betType =
      interaction.options.getString("type") ||
      (subcommand === "winner" || subcommand === "score" ? subcommand : "");
    const prediction = interaction.options.getString("prediction")?.trim();
    let team = interaction.options.getString("team")?.trim() || "";
    let score = "";

    if (!["winner", "score"].includes(betType)) {
      return interaction.reply({
        content:
          "❌ Loại kèo không hợp lệ. Hãy chọn `Kèo đội thắng` hoặc `Kèo tỉ số`.",
        ephemeral: true,
      });
    }

    let fixture;
    try {
      const fixtures = await fetchUpcomingFixtures(50, league);
      fixture = findFixture(fixtures, tag);
    } catch (error) {
      return interaction.reply({
        content: `❌ Không thể tra trận đấu: ${error.message}`,
        ephemeral: true,
      });
    }

    if (!fixture) {
      return interaction.reply({
        content:
          "❌ Không tìm thấy trận đấu theo ID/tag này. Dùng `/bet fixtures` để lấy ID/tag hợp lệ.",
        ephemeral: true,
      });
    }

    if (betType === "winner") {
      team = prediction || team;
    } else {
      const parsedPrediction = prediction
        ? parseScoreBetPrediction(prediction)
        : {
            team: interaction.options.getString("team")?.trim() || "",
            score: interaction.options.getString("score")?.trim() || "",
          };

      if (!parsedPrediction?.team || !parsedPrediction?.score) {
        return interaction.reply({
          content:
            "❌ Dự đoán tỉ số không hợp lệ. Hãy nhập dạng `Tên đội 2-1`, ví dụ `Arsenal 2-1`.",
          ephemeral: true,
        });
      }

      team = parsedPrediction.team;
      score = parsedPrediction.score;
    }

    const teamSide = resolveFixtureTeamSide(fixture, team);
    if (!teamSide) {
      return interaction.reply({
        content: `❌ Không tìm thấy đội **${team}** trong trận này. Hãy nhập đúng tên đội trong trận đấu.`,
        ephemeral: true,
      });
    }

    if (fixture.kickoffAt.getTime() <= Date.now()) {
      return interaction.reply({
        content: "❌ Trận này đã bắt đầu rồi, không thể đặt kèo mới.",
        ephemeral: true,
      });
    }

    if (betType === "winner") {
      return createBet({
        interaction,
        fixture,
        betType: "winner",
        team,
        amount,
      });
    }

    const parsedScore = parseExactScorePrediction(score);
    if (!parsedScore) {
      return interaction.reply({
        content: "❌ Tỉ số không hợp lệ. Hãy nhập dạng `2-1` hoặc `1:0`.",
        ephemeral: true,
      });
    }

    const predictedWinnerSide =
      parsedScore.home > parsedScore.away
        ? "home"
        : parsedScore.away > parsedScore.home
          ? "away"
          : "draw";

    if (predictedWinnerSide === "draw") {
      return interaction.reply({
        content:
          "❌ Kèo tỉ số hiện tại phải có đội thắng. Hãy nhập tỉ số không hoà, ví dụ `2-1`.",
        ephemeral: true,
      });
    }

    if (predictedWinnerSide !== teamSide) {
      return interaction.reply({
        content: "❌ Đội bạn chọn phải khớp với đội thắng trong tỉ số dự đoán.",
        ephemeral: true,
      });
    }

    return createBet({
      interaction,
      fixture,
      betType: "score",
      team,
      score,
      amount,
    });
  },
};
