const axios = require("axios");

const DEFAULT_API_BASE_URL =
  process.env.FOOTBALL_BET_API_BASE_URL ||
  "https://www.thesportsdb.com/api/v1/json/3";
const PROVIDER = normalizeText(process.env.FOOTBALL_BET_PROVIDER || "");
const COMPETITION_ID = process.env.FOOTBALL_BET_COMPETITION_ID || "";
const SEASON = process.env.FOOTBALL_BET_SEASON || "";
const FIXTURES_URL = process.env.FOOTBALL_BET_FIXTURES_URL || "";
const RESULT_URL = process.env.FOOTBALL_BET_RESULT_URL || "";
const COMPETITIONS_JSON = process.env.FOOTBALL_BET_COMPETITIONS_JSON || "";
const AUTH_HEADER_NAME = process.env.FOOTBALL_BET_AUTH_HEADER || "";
const AUTH_TOKEN = process.env.FOOTBALL_BET_AUTH_TOKEN || "";
const CUSTOM_HEADERS_JSON = process.env.FOOTBALL_BET_HTTP_HEADERS_JSON || "";
const SCORE_MULTIPLIER = Number(process.env.FOOTBALL_BET_SCORE_MULTIPLIER || 6);

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeTeamName(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slugify(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.events)) {
    return payload.events;
  }

  if (Array.isArray(payload?.matches)) {
    return payload.matches;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.response)) {
    return payload.response;
  }

  if (payload && typeof payload === "object" && (payload.id || payload.idEvent)) {
    return [payload];
  }

  return [];
}

function parseJsonObject(input) {
  if (!input) {
    return {};
  }

  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function parseJsonArray(input) {
  if (!input) {
    return [];
  }

  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed).map(([key, value]) => ({
        key,
        ...(value && typeof value === "object" ? value : { id: value }),
      }));
    }
  } catch {
    return [];
  }

  return [];
}

function normalizeCompetitionSource(source, index = 0) {
  if (!source || typeof source !== "object") {
    return null;
  }

  const id = String(source.id || source.competitionId || "").trim();
  const fixturesUrl = String(source.fixturesUrl || source.fixturesURL || "").trim();
  const resultUrl = String(source.resultUrl || source.resultURL || "").trim();
  const name = String(source.name || source.label || source.competitionName || id).trim();
  const key = slugify(source.key || source.slug || name || id || `league-${index + 1}`);
  const provider = normalizeText(source.provider || PROVIDER);
  const season =
    source.season === undefined ? "" : String(source.season || "").trim();

  if (!key || (!id && !fixturesUrl)) {
    return null;
  }

  return {
    key,
    name: name || key,
    id,
    fixturesUrl,
    resultUrl,
    provider,
    season,
  };
}

function getConfiguredCompetitions() {
  const sources = parseJsonArray(COMPETITIONS_JSON)
    .map(normalizeCompetitionSource)
    .filter(Boolean);

  if (sources.length > 0) {
    return sources;
  }

  const legacySource = normalizeCompetitionSource({
    key: "default",
    name: "Default",
    id: COMPETITION_ID,
    season: SEASON,
    fixturesUrl: FIXTURES_URL,
    resultUrl: RESULT_URL,
  });

  return legacySource ? [legacySource] : [];
}

function listFootballCompetitions() {
  return getConfiguredCompetitions().map(({ key, name, id, fixturesUrl }) => ({
    key,
    name,
    id,
    hasCustomFixturesUrl: Boolean(fixturesUrl),
  }));
}

function resolveCompetitionSource(competitionKey) {
  const competitions = getConfiguredCompetitions();
  if (!competitionKey) {
    return competitions.length === 1 ? competitions[0] : null;
  }

  const normalizedKey = slugify(competitionKey);
  const normalizedText = normalizeText(competitionKey);

  return (
    competitions.find(
      (competition) =>
        competition.key === normalizedKey ||
        normalizeText(competition.name) === normalizedText ||
        String(competition.id) === String(competitionKey),
    ) || null
  );
}

function parseKickoff(raw) {
  const dateValue =
    raw.utcDate ||
    raw.dateEvent ||
    raw.date ||
    raw.kickoff ||
    raw.startTime ||
    "";
  const timeValue = raw.strTime || raw.time || raw.utcTime || "";

  if (raw.timestamp) {
    const timestamp = Number(raw.timestamp);
    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp * 1000);
    }
  }

  if (!dateValue) {
    return null;
  }

  const isoCandidate = timeValue
    ? `${dateValue}T${timeValue.length <= 5 ? `${timeValue}:00` : timeValue}`
    : dateValue;

  const parsed = new Date(isoCandidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildFixtureTag(fixture) {
  const datePart = fixture.kickoffAt
    ? fixture.kickoffAt.toISOString().slice(0, 10)
    : "unknown-date";
  const homePart = slugify(fixture.homeTeam) || "home";
  const awayPart = slugify(fixture.awayTeam) || "away";
  const idPart = slugify(fixture.matchId || fixture.rawMatchId || "match");
  return `${datePart}-${homePart}-vs-${awayPart}-${idPart}`;
}

function normalizeFixture(raw, competitionSource = null) {
  const homeTeam =
    raw.strHomeTeam ||
    raw.homeTeam?.name ||
    raw.homeTeam ||
    raw.home?.name ||
    raw.home ||
    raw.team_home ||
    "";
  const awayTeam =
    raw.strAwayTeam ||
    raw.awayTeam?.name ||
    raw.awayTeam ||
    raw.away?.name ||
    raw.away ||
    raw.team_away ||
    "";
  const matchId = String(
    raw.idEvent ||
      raw.id ||
      raw.fixture?.id ||
      raw.idFixture ||
      raw.idMatch ||
      raw.matchId ||
      raw.fixture_id ||
      raw.id ||
      "",
  );
  const kickoffAt = parseKickoff(raw);

  if (!homeTeam || !awayTeam || !kickoffAt) {
    return null;
  }

  const fixture = {
    matchId:
      matchId ||
      `${slugify(homeTeam)}-${slugify(awayTeam)}-${kickoffAt.getTime()}`,
    fixtureTag: raw.tag || raw.fixtureTag || "",
    competitionName:
      raw.strLeague ||
      raw.competition?.name ||
      raw.competitionName ||
      raw.competition ||
      raw.league ||
      competitionSource?.name ||
      "",
    homeTeam,
    awayTeam,
    kickoffAt,
    competitionKey: competitionSource?.key || "",
    raw,
  };

  fixture.fixtureTag = fixture.fixtureTag || buildFixtureTag(fixture);
  return fixture;
}

function normalizeScorePair(raw) {
  const home =
    raw.intHomeScore ??
    raw.homeScore ??
    raw.score?.fullTime?.home ??
    raw.score?.winner?.home ??
    raw.goals?.home ??
    raw.score_home ??
    raw.home_goals ??
    raw.goalsHomeTeam;
  const away =
    raw.intAwayScore ??
    raw.awayScore ??
    raw.score?.fullTime?.away ??
    raw.score?.winner?.away ??
    raw.goals?.away ??
    raw.score_away ??
    raw.away_goals ??
    raw.goalsAwayTeam;
  const homeScore = Number(home);
  const awayScore = Number(away);

  if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    return null;
  }

  return { home: homeScore, away: awayScore };
}

function normalizeStatus(raw) {
  return String(
    raw.strStatus ||
      raw.status ||
      raw.match?.status ||
      raw.fixture?.status?.short ||
      raw.fixture?.status?.long ||
      raw.status ||
      raw.match_status ||
      raw.fixture_status ||
      raw.state ||
      "",
  ).trim();
}

async function requestJson(url) {
  const headers = {
    ...parseJsonObject(CUSTOM_HEADERS_JSON),
  };

  if (AUTH_HEADER_NAME && AUTH_TOKEN) {
    headers[AUTH_HEADER_NAME] = AUTH_TOKEN;
  }

  const response = await axios.get(url, {
    timeout: 20000,
    headers,
  });
  return response.data;
}

function buildFixturesUrl(competitionSource) {
  if (competitionSource.fixturesUrl) {
    return competitionSource.fixturesUrl;
  }

  if (
    competitionSource.provider === "football-data" ||
    DEFAULT_API_BASE_URL.includes("football-data.org")
  ) {
    const params = competitionSource.season
      ? `?season=${encodeURIComponent(competitionSource.season)}`
      : "";
    return `${DEFAULT_API_BASE_URL}/competitions/${encodeURIComponent(competitionSource.id)}/matches${params}`;
  }

  return `${DEFAULT_API_BASE_URL}/eventsnextleague.php?id=${encodeURIComponent(competitionSource.id)}`;
}

function buildResultUrl(fixture, competitionSource) {
  const resultUrl = competitionSource?.resultUrl || RESULT_URL;
  if (resultUrl) {
    return resultUrl.replace(
      /\{\{\s*matchId\s*\}\}/g,
      encodeURIComponent(fixture.matchId),
    );
  }

  if (
    competitionSource?.provider === "football-data" ||
    DEFAULT_API_BASE_URL.includes("football-data.org")
  ) {
    return `${DEFAULT_API_BASE_URL}/matches/${encodeURIComponent(fixture.matchId)}`;
  }

  return `${DEFAULT_API_BASE_URL}/lookupevent.php?id=${encodeURIComponent(fixture.matchId)}`;
}

async function fetchCompetitionFixtures(competitionSource, limit) {
  const now = Date.now();
  const data = await requestJson(buildFixturesUrl(competitionSource));
  return extractArray(data)
    .map((item) => normalizeFixture(item, competitionSource))
    .filter(Boolean)
    .filter((fixture) => fixture.kickoffAt.getTime() > now)
    .sort((left, right) => left.kickoffAt - right.kickoffAt)
    .slice(0, limit);
}

async function fetchUpcomingFixtures(limit = 10, competitionKey = "") {
  const competitions = getConfiguredCompetitions();
  if (competitions.length === 0) {
    throw new Error(
      "Chưa cấu hình nguồn API bóng đá. Hãy đặt FOOTBALL_BET_COMPETITIONS_JSON, FOOTBALL_BET_FIXTURES_URL hoặc FOOTBALL_BET_COMPETITION_ID.",
    );
  }

  if (competitionKey) {
    const competitionSource = resolveCompetitionSource(competitionKey);
    if (!competitionSource) {
      throw new Error(`Không tìm thấy giải "${competitionKey}". Dùng /bet leagues để xem danh sách giải.`);
    }

    return fetchCompetitionFixtures(competitionSource, limit);
  }

  const fixtureGroups = await Promise.allSettled(
    competitions.map((competition) => fetchCompetitionFixtures(competition, limit)),
  );

  return fixtureGroups
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value)
    .sort((left, right) => left.kickoffAt - right.kickoffAt)
    .slice(0, limit);
}

async function fetchFixtureResult(fixture) {
  const competitionSource = resolveCompetitionSource(fixture?.competitionKey);
  const url = buildResultUrl(fixture, competitionSource);
  const data = await requestJson(url);
  const resultItems = extractArray(data);
  const rawResult =
    resultItems.find(
      (item) =>
        String(
          item.idEvent ||
            item.id ||
            item.idMatch ||
            item.matchId ||
            item.fixture?.id ||
            "",
        ) === fixture.matchId,
    ) || resultItems[0];

  if (!rawResult) {
    return null;
  }

  const score = normalizeScorePair(rawResult);
  const status = normalizeStatus(rawResult);
  if (!score) {
    return null;
  }

  return {
    matchId: fixture.matchId,
    fixtureTag: fixture.fixtureTag,
    competitionName: fixture.competitionName,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    kickoffAt: fixture.kickoffAt,
    competitionKey: fixture.competitionKey || "",
    status,
    score,
    raw: rawResult,
  };
}

function isFinalStatus(status) {
  const normalized = normalizeText(status);
  return (
    normalized.includes("finished") ||
    normalized === "ft" ||
    normalized.includes("full time") ||
    normalized.includes("ended") ||
    normalized.includes("complete")
  );
}

function parseExactScorePrediction(prediction) {
  const text = normalizeText(prediction);
  const match = text.match(/^(\d+)\s*[:\-]\s*(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    home: Number(match[1]),
    away: Number(match[2]),
  };
}

function resolveFixtureTeamSide(fixture, teamText) {
  const normalizedTeam = normalizeTeamName(teamText);
  const homeTeam = normalizeTeamName(fixture?.homeTeam);
  const awayTeam = normalizeTeamName(fixture?.awayTeam);

  if (!normalizedTeam) {
    return null;
  }

  if (normalizedTeam === homeTeam || homeTeam.includes(normalizedTeam)) {
    return "home";
  }

  if (normalizedTeam === awayTeam || awayTeam.includes(normalizedTeam)) {
    return "away";
  }

  return null;
}

function getWinningSide(actualScore) {
  if (!actualScore) {
    return null;
  }

  if (actualScore.home > actualScore.away) {
    return "home";
  }

  if (actualScore.away > actualScore.home) {
    return "away";
  }

  return "draw";
}

function winnerBetWon(predictedTeam, fixture, actualScore) {
  const predictedSide = resolveFixtureTeamSide(fixture, predictedTeam);
  const winningSide = getWinningSide(actualScore);
  return Boolean(predictedSide && predictedSide === winningSide);
}

function scoreBetWon(predictedTeam, predictedScore, fixture, actualScore) {
  const predictedSide = resolveFixtureTeamSide(fixture, predictedTeam);
  const winningSide = getWinningSide(actualScore);

  if (!predictedSide || !predictedScore || winningSide === "draw") {
    return false;
  }

  if (predictedSide !== winningSide) {
    return false;
  }

  return (
    predictedScore.home === actualScore.home &&
    predictedScore.away === actualScore.away
  );
}

function exactScoreWon(prediction, actualScore) {
  const parsed = parseExactScorePrediction(prediction);
  if (!parsed || !actualScore) {
    return false;
  }

  return parsed.home === actualScore.home && parsed.away === actualScore.away;
}

module.exports = {
  SCORE_MULTIPLIER,
  buildFixtureTag,
  exactScoreWon,
  fetchFixtureResult,
  fetchUpcomingFixtures,
  isFinalStatus,
  getWinningSide,
  listFootballCompetitions,
  normalizeTeamName,
  parseExactScorePrediction,
  resolveFixtureTeamSide,
  scoreBetWon,
  normalizeStatus,
  winnerBetWon,
};
