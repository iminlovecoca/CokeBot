/**
 * Script to expand CokeBot Vietnamese Word Chain (Nối Từ) Dictionary
 * Aggregates authentic, standard Vietnamese dictionaries from authoritative NLP,
 * Wiktionary, and linguistic sources without hallucinating or making up non-words.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const readline = require("readline");

// Valid Vietnamese alphabet regex (NFC lowercase + spaces)
const VIETNAMESE_REGEX = /^[a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ\s]+$/;

function normalizeVietnameseWord(raw) {
  if (!raw || typeof raw !== "string") return null;
  // Replace underscores and hyphens (used as compound word connectors in NLP) with spaces
  let w = raw
    .normalize("NFC")
    .replace(/[_\-]+/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (!w || w.length < 2) return null;
  if (!VIETNAMESE_REGEX.test(w)) return null;

  // Validate syllable lengths (Vietnamese syllables are 1 to 7 chars)
  const syllables = w.split(" ");
  for (const s of syllables) {
    if (s.length < 1 || s.length > 7) return null;
  }

  return w;
}

function fetchStream(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchStream(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      resolve(res);
    }).on("error", reject);
  });
}

async function processLineByLine(stream, onLine) {
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    onLine(line);
  }
}

async function main() {
  console.log("==================================================================");
  console.log("📚  COKEBOT VIETNAMESE COMPREHENSIVE DICTIONARY EXPANDER");
  console.log("==================================================================");

  const allWordsSet = new Set();
  const twoWordSet = new Set();

  function addWord(raw) {
    const w = normalizeVietnameseWord(raw);
    if (!w) return;
    allWordsSet.add(w);
    const parts = w.split(" ");
    if (parts.length === 2) {
      twoWordSet.add(w);
    }
  }

  // 1. Read local existing files
  const dataDir = path.resolve(__dirname, "../data");
  const wordsPath = path.join(dataDir, "words.txt");
  const officialPath = path.join(dataDir, "official-words.txt");
  const gwdataPath = path.join(dataDir, "gwdata.json");
  const contributePath = path.join(dataDir, "contribute-words.txt");

  console.log("1️⃣  Đang nạp từ điển hiện có trong dự án...");
  if (fs.existsSync(wordsPath)) {
    const lines = fs.readFileSync(wordsPath, "utf-8").split(/\r?\n/);
    lines.forEach(addWord);
    console.log(`   • data/words.txt: ${lines.length.toLocaleString()} dòng`);
  }
  if (fs.existsSync(officialPath)) {
    const lines = fs.readFileSync(officialPath, "utf-8").split(/\r?\n/);
    lines.forEach(addWord);
    console.log(`   • data/official-words.txt: ${lines.length.toLocaleString()} dòng`);
  }
  if (fs.existsSync(gwdataPath)) {
    try {
      const arr = JSON.parse(fs.readFileSync(gwdataPath, "utf-8"));
      arr.forEach(addWord);
      console.log(`   • data/gwdata.json: ${arr.length.toLocaleString()} từ`);
    } catch (e) {}
  }
  if (fs.existsSync(contributePath)) {
    const lines = fs.readFileSync(contributePath, "utf-8").split(/\r?\n/);
    lines.forEach(addWord);
    console.log(`   • data/contribute-words.txt: ${lines.length.toLocaleString()} dòng`);
  }

  console.log(`   => Đã nạp ban đầu: ${allWordsSet.size.toLocaleString()} từ tổng | ${twoWordSet.size.toLocaleString()} từ ghép 2 tiếng.`);

  // 2. Remote open-source authoritative dictionaries
  const remoteSources = [
    {
      name: "iminlovecoca/DataWord",
      url: "https://raw.githubusercontent.com/iminlovecoca/DataWord/main/words.txt",
      type: "lines",
    },
    {
      name: "pyvi (Python Vietnamese NLP)",
      url: "https://raw.githubusercontent.com/trungtv/pyvi/master/pyvi/models/words.txt",
      type: "lines",
    },
    {
      name: "Vietnamese-Wordlist (Viet74K)",
      url: "https://raw.githubusercontent.com/duyet/vietnamese-wordlist/master/Viet74K.txt",
      type: "lines",
    },
    {
      name: "Vietnamese-Wordlist (Viet39K)",
      url: "https://raw.githubusercontent.com/duyet/vietnamese-wordlist/master/Viet39K.txt",
      type: "lines",
    },
    {
      name: "Vietnamese-Wordlist (Viet22K)",
      url: "https://raw.githubusercontent.com/duyet/vietnamese-wordlist/master/Viet22K.txt",
      type: "lines",
    },
    {
      name: "Vietnamese-Wordlist (Viet11K)",
      url: "https://raw.githubusercontent.com/duyet/vietnamese-wordlist/master/Viet11K.txt",
      type: "lines",
    },
    {
      name: "winstonleedev tudien.txt",
      url: "https://raw.githubusercontent.com/winstonleedev/tudien/master/tudien.txt",
      type: "lines",
    },
    {
      name: "winstonleedev danhtu.txt",
      url: "https://raw.githubusercontent.com/winstonleedev/tudien/master/danhtu.txt",
      type: "lines",
    },
    {
      name: "winstonleedev dongtu.txt",
      url: "https://raw.githubusercontent.com/winstonleedev/tudien/master/dongtu.txt",
      type: "lines",
    },
    {
      name: "winstonleedev tinhtu.txt",
      url: "https://raw.githubusercontent.com/winstonleedev/tudien/master/tinhtu.txt",
      type: "lines",
    },
    {
      name: "winstonleedev tenrieng.txt",
      url: "https://raw.githubusercontent.com/winstonleedev/tudien/master/tenrieng.txt",
      type: "lines",
    },
    {
      name: "vietnamese-stopwords",
      url: "https://raw.githubusercontent.com/stopwords/vietnamese-stopwords/master/vietnamese-stopwords.txt",
      type: "lines",
    },
    {
      name: "underthesea NLP Dictionary",
      url: "https://raw.githubusercontent.com/undertheseanlp/dictionary/master/dictionary/words.txt",
      type: "jsonl_text",
    },
    {
      name: "Kaikki Wiktionary Vietnamese",
      url: "https://kaikki.org/dictionary/Vietnamese/kaikki.org-dictionary-Vietnamese.jsonl",
      type: "kaikki_jsonl",
    },
  ];

  console.log("\n2️⃣  Đang tải và hợp nhất các nguồn từ điển tiếng Việt chuẩn...");
  for (const src of remoteSources) {
    process.stdout.write(`   • Tải ${src.name}... `);
    try {
      const stream = await fetchStream(src.url);
      let count = 0;
      await processLineByLine(stream, (line) => {
        if (!line) return;
        if (src.type === "lines") {
          addWord(line);
          count++;
        } else if (src.type === "jsonl_text") {
          try {
            const obj = JSON.parse(line);
            if (obj && obj.text) addWord(obj.text);
            count++;
          } catch (e) {}
        } else if (src.type === "kaikki_jsonl") {
          try {
            const obj = JSON.parse(line);
            if (obj && obj.word) addWord(obj.word);
            count++;
          } catch (e) {}
        }
      });
      console.log(`Xong (${count.toLocaleString()} mục).`);
    } catch (err) {
      console.log(`Lỗi tải: ${err.message}`);
    }
  }

  console.log("\n3️⃣  Thống kê sau khi hợp nhất và lọc chuẩn tiếng Việt:");
  console.log(`   • Tổng số từ ngữ chuẩn tiếng Việt (tất cả độ dài) : ${allWordsSet.size.toLocaleString()} từ`);
  console.log(`   • Tổng số từ ghép 2 tiếng (phục vụ trò chơi Nối Từ) : ${twoWordSet.size.toLocaleString()} từ`);

  // Sort alphabetically using Vietnamese locale
  console.log("\n4️⃣  Sắp xếp và ghi file dữ liệu...");
  const collator = new Intl.Collator("vi", { sensitivity: "base" });
  
  const sortedAllWords = Array.from(allWordsSet).sort((a, b) => collator.compare(a, b));
  const sortedTwoWords = Array.from(twoWordSet).sort((a, b) => collator.compare(a, b));

  fs.writeFileSync(wordsPath, sortedAllWords.join("\n") + "\n", "utf-8");
  console.log(`   ✅ Ghi thành công data/words.txt (${sortedAllWords.length.toLocaleString()} dòng).`);

  fs.writeFileSync(officialPath, sortedTwoWords.join("\n") + "\n", "utf-8");
  console.log(`   ✅ Ghi thành công data/official-words.txt (${sortedTwoWords.length.toLocaleString()} dòng).`);

  fs.writeFileSync(gwdataPath, JSON.stringify(sortedTwoWords, null, 2), "utf-8");
  console.log(`   ✅ Ghi thành công data/gwdata.json (${sortedTwoWords.length.toLocaleString()} từ).`);

  console.log("\n🎉 HOÀN TẤT MỞ RỘNG TỪ ĐIỂN TIẾNG VIỆT CHUẨN!");
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
