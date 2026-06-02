const fs = require("fs");
const path = require("path");
const axios = require("axios");

const wordDataUrl =
  "https://raw.githubusercontent.com/iminlovecoca/DataWord/main/words.txt";
const contributeWordsUrl =
  "https://raw.githubusercontent.com/iminlovecoca/DataWord/main/accepted-words.txt";
const githubRepoOwner = process.env.DATAWORD_GITHUB_OWNER || "iminlovecoca";
const githubRepoName = process.env.DATAWORD_GITHUB_NAME || "DataWord";
const githubBranch = process.env.DATAWORD_GITHUB_BRANCH || "main";
const githubToken =
  process.env.GITHUB_TOKEN || process.env.DATAWORD_GITHUB_TOKEN || "";

const dataDir = path.join(__dirname, "../data");
const wordDatabasePath = path.join(dataDir, "words.txt");
const officialWordsPath = path.join(dataDir, "official-words.txt");
const contributeWordsPath = path.join(dataDir, "contribute-words.txt");
const reportWordsPath = path.join(dataDir, "report-words.txt");
const queryPath = path.join(dataDir, "query.txt");
const wordPlayedPath = path.join(dataDir, "word-played.txt");
const roundPlayedPath = path.join(dataDir, "round-played.txt");
const dataPath = path.join(dataDir, "data.json");
const wordDataPath = path.join(dataDir, "word-data.json");
const rankingPath = path.join(dataDir, "ranking.json");
const premiumGuildsPath = path.join(dataDir, "premium-guilds.txt");
const gwDataPath = path.join(dataDir, "gwdata.json");

function ensureFile(filePath, defaultContent = "") {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, defaultContent);
  }
}

function normalizeWord(word) {
  return String(word || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseOfficialLines(lines) {
  return lines
    .map(normalizeWord)
    .filter(
      (word) =>
        word.split(/\s+/).length === 2 &&
        !word.includes("-") &&
        !word.includes("(") &&
        !word.includes(")"),
    );
}

async function pushAcceptedWordToGithub(word) {
  const normalized = normalizeWord(word);
  if (!normalized) {
    return false;
  }

  if (!githubToken) {
    throw new Error("Thiếu GITHUB_TOKEN để đẩy từ mới lên GitHub.");
  }

  const filePath = "accepted-words.txt";
  const contentsUrl = `https://api.github.com/repos/${githubRepoOwner}/${githubRepoName}/contents/${filePath}`;
  const authHeaders = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const current = await axios.get(contentsUrl, { headers: authHeaders });
  const sha = current.data.sha;
  const currentText = Buffer.from(current.data.content, "base64").toString(
    "utf8",
  );
  const currentWords = currentText
    .split(/\r?\n/)
    .map(normalizeWord)
    .filter(Boolean);

  if (currentWords.includes(normalized)) {
    return true;
  }

  const nextText = [...currentWords, normalized].join("\n") + "\n";
  await axios.put(
    contentsUrl,
    {
      message: `Add accepted word: ${normalized}`,
      content: Buffer.from(nextText, "utf8").toString("base64"),
      sha,
      branch: githubBranch,
    },
    { headers: authHeaders },
  );

  return true;
}

async function syncNoituData() {
  ensureFile(dataPath, "{}");
  ensureFile(wordDataPath, "{}");
  ensureFile(queryPath, "0");
  ensureFile(rankingPath, "{}");
  ensureFile(premiumGuildsPath, "");
  ensureFile(reportWordsPath, "");
  ensureFile(wordPlayedPath, "0");
  ensureFile(roundPlayedPath, "0");

  console.log("[Noitu Sync] Downloading base words from GitHub...");
  try {
    const response = await axios.get(wordDataUrl);
    const baseLines = response.data.toLowerCase().trim().split("\n");
    fs.writeFileSync(wordDatabasePath, baseLines.join("\n"));
    console.log(
      `[Noitu Sync] Saved ${baseLines.length} base words to words.txt`,
    );
  } catch (error) {
    console.warn(
      "[Noitu Sync] Base word download failed, using local fallback:",
      error.message,
    );
    if (fs.existsSync(gwDataPath)) {
      const localWords = JSON.parse(fs.readFileSync(gwDataPath, "utf8"));
      fs.writeFileSync(wordDatabasePath, localWords.join("\n"));
    } else if (fs.existsSync(officialWordsPath)) {
      fs.writeFileSync(
        wordDatabasePath,
        fs.readFileSync(officialWordsPath, "utf8"),
      );
    } else {
      fs.writeFileSync(
        gwDataPath,
        JSON.stringify(
          fs
            .readFileSync(officialWordsPath, "utf8")
            .split("\n")
            .map(normalizeWord)
            .filter(Boolean),
          null,
          2,
        ),
      );
    }
  }

  console.log("[Noitu Sync] Downloading contribute words from GitHub...");
  let contributeLines = [];
  try {
    const contributeResponse = await axios.get(contributeWordsUrl);
    contributeLines = contributeResponse.data.toLowerCase().trim().split("\n");
    fs.writeFileSync(contributeWordsPath, contributeLines.join("\n"));
  } catch (error) {
    console.warn(
      "[Noitu Sync] Contribute word download failed, using local fallback:",
      error.message,
    );
    if (fs.existsSync(contributeWordsPath)) {
      contributeLines = fs
        .readFileSync(contributeWordsPath, "utf8")
        .toLowerCase()
        .trim()
        .split("\n");
    }
  }

  const baseWordsRaw = fs
    .readFileSync(wordDatabasePath, "utf8")
    .toLowerCase()
    .split("\n");
  const baseWords = parseOfficialLines(baseWordsRaw);
  const merged = Array.from(
    new Set([...baseWords, ...contributeLines.map(normalizeWord)]),
  ).filter((word) => word.split(/\s+/).length === 2);

  fs.writeFileSync(officialWordsPath, merged.join("\n"));
  fs.writeFileSync(gwDataPath, JSON.stringify(merged, null, 2));

  console.log(`[Noitu Sync] Synced ${merged.length} official words.`);
}

module.exports = {
  syncNoituData,
  pushAcceptedWordToGithub,
  paths: {
    wordDatabasePath,
    officialWordsPath,
    contributeWordsPath,
    reportWordsPath,
    queryPath,
    wordPlayedPath,
    roundPlayedPath,
    dataPath,
    wordDataPath,
    rankingPath,
    premiumGuildsPath,
    gwDataPath,
  },
};
