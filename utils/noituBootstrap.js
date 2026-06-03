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

  let currentText = "";
  let sha = null;

  try {
    const current = await axios.get(contentsUrl, { headers: authHeaders });
    sha = current.data.sha;
    currentText = Buffer.from(current.data.content, "base64").toString("utf8");
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`[Noitu GitHub] ${filePath} not found on repository, attempting to create it.`);
    } else {
      throw error;
    }
  }

  const currentWords = currentText
    .split(/\r?\n/)
    .map(normalizeWord)
    .filter(Boolean);

  if (currentWords.includes(normalized)) {
    return true;
  }

  const nextText = [...currentWords, normalized].join("\n") + "\n";
  const payload = {
    message: `Add accepted word: ${normalized}`,
    content: Buffer.from(nextText, "utf8").toString("base64"),
    branch: githubBranch,
  };
  if (sha) {
    payload.sha = sha;
  }

  try {
    await axios.put(contentsUrl, payload, { headers: authHeaders });
  } catch (error) {
    if (error.response && [401, 403, 404].includes(error.response.status)) {
      throw new Error(`Lỗi xác thực GitHub (${error.response.status}). Hãy đảm bảo GITHUB_TOKEN trong .env đã chính xác và có quyền ghi (Contents: Read & Write) vào repository ${githubRepoOwner}/${githubRepoName}.`);
    }
    throw error;
  }

  return true;
}

async function fetchWithRetry(url, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent": "CokeBot/1.0.0 (Discord Bot; github.com/iminlovecoca/CokeBot)",
        },
      });
      return response;
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      console.warn(`[Noitu Sync] Fetch failed for ${url}, retrying in ${delay}ms... (Error: ${error.message})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
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
    const response = await fetchWithRetry(`${wordDataUrl}?t=${Date.now()}`);
    const baseLines = response.data.toLowerCase().trim().split(/\r?\n/);
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
      console.error("[Noitu Sync] Critical: No local words database fallback exists!");
    }
  }

  console.log("[Noitu Sync] Downloading contribute words from GitHub...");
  let contributeLines = [];
  try {
    const contributeResponse = await fetchWithRetry(`${contributeWordsUrl}?t=${Date.now()}`);
    contributeLines = contributeResponse.data.toLowerCase().trim().split(/\r?\n/);
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
        .split(/\r?\n/);
    }
  }

  const baseWordsRaw = fs
    .readFileSync(wordDatabasePath, "utf8")
    .toLowerCase()
    .split(/\r?\n/);
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
