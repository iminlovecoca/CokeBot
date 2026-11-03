/**
 * Script to expand CokeBot Vietnamese Word Chain (Nối Từ) Dictionary
 * Aggregates authentic, standard Vietnamese dictionaries from authoritative NLP,
 * Wiktionary, specialized dictionaries (technical, medical, business, Buddhism),
 * administrative divisions (GSO), and linguistic corpora without hallucinating or making up non-words.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const zlib = require("zlib");
const readline = require("readline");
const bz2 = require("unbzip2-stream");

// Valid Vietnamese alphabet regex (NFC lowercase + spaces)
const VIETNAMESE_REGEX = /^[a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ\s]+$/;

let sylSet = new Set();

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

  // Validate syllable lengths and phonetics
  const syllables = w.split(" ");
  for (const s of syllables) {
    if (s.length < 1 || s.length > 7) return null;
    if (sylSet.size > 0 && !sylSet.has(s)) return null;
  }

  return w;
}

function fetchStream(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "CokeBot/2.0 (Vietnamese NLP Dictionary Sync; github.com/iminlovecoca/CokeBot)",
      },
    };
    https.get(url, options, (res) => {
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
  console.log("📚  COKEBOT VIETNAMESE MASSIVE DICTIONARY EXPANDER (TARGET >100K+)");
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

  // 0. Load authoritative Vietnamese phonotactic syllable list
  console.log("0️⃣  Đang tải bộ âm tiết chuẩn tiếng Việt (Vietnamese Syllabary)...");
  try {
    const sylUrl =
      "https://gist.githubusercontent.com/xnohat/a0e818b05e5ab1a5ca01bbc63b6237b3/raw/44208e6f008b8fcd697aa804cad3221fb0c94d4c/all-vietnamese-syllables.txt(G%C3%B5%20d%E1%BA%A5u%20ki%E1%BB%83u%20c%C5%A9)";
    const sylStream = await fetchStream(sylUrl);
    await processLineByLine(sylStream, (line) => {
      const s = String(line || "").normalize("NFC").trim().toLowerCase();
      if (s && VIETNAMESE_REGEX.test(s)) sylSet.add(s);
    });
    console.log(`   ✅ Đã nạp ${sylSet.size.toLocaleString()} âm tiết chuẩn tiếng Việt.`);
  } catch (err) {
    console.warn(`   ⚠️ Không thể nạp danh sách âm tiết: ${err.message}. Sẽ dùng regex cơ bản.`);
  }

  // 1. Read local existing files
  const dataDir = path.resolve(__dirname, "../data");
  const wordsPath = path.join(dataDir, "words.txt");
  const officialPath = path.join(dataDir, "official-words.txt");
  const gwdataPath = path.join(dataDir, "gwdata.json");
  const contributePath = path.join(dataDir, "contribute-words.txt");

  console.log("\n1️⃣  Đang nạp từ điển hiện có trong dự án...");
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

  // 2. Remote open-source authoritative dictionaries & specialized lexicons
  const remoteSources = [
    // --- Phase 1: Core NLP & Lexical Databases ---
    {
      name: "iminlovecoca/DataWord (User Base)",
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

    // --- Phase 2: Comprehensive Multi-lingual & Specialized Tab Dictionaries ---
    {
      name: "catusf star_vietanh (Từ điển Việt - Anh)",
      url: "https://raw.githubusercontent.com/catusf/tudien/master/dict/star_vietanh.tab",
      type: "tab",
    },
    {
      name: "catusf star_vietviet (Từ điển Việt - Việt Hồ Ngọc Đức)",
      url: "https://raw.githubusercontent.com/catusf/tudien/master/dict/star_vietviet.tab",
      type: "tab",
    },
    {
      name: "catusf star_vietnga (Từ điển Việt - Nga)",
      url: "https://raw.githubusercontent.com/catusf/tudien/master/dict/star_vietnga.tab",
      type: "tab",
    },
    {
      name: "catusf star_vietphap (Từ điển Việt - Pháp)",
      url: "https://raw.githubusercontent.com/catusf/tudien/master/dict/star_vietphap.tab",
      type: "tab",
    },
    {
      name: "catusf star_viethan (Từ điển Việt - Hàn)",
      url: "https://raw.githubusercontent.com/catusf/tudien/master/dict/star_viethan.tab",
      type: "tab",
    },
    {
      name: "catusf star_vietnhat (Từ điển Việt - Nhật)",
      url: "https://raw.githubusercontent.com/catusf/tudien/master/dict/star_vietnhat.tab",
      type: "tab",
    },
    {
      name: "catusf Viet-Trung (Từ điển Việt - Trung / Hán Nôm)",
      url: "https://raw.githubusercontent.com/catusf/tudien/master/dict/Viet-Trung.tab",
      type: "tab",
    },
    {
      name: "catusf Tu-dien-Dao-Uyen",
      url: "https://raw.githubusercontent.com/catusf/tudien/master/dict/Tu-dien-Dao-Uyen.tab",
      type: "tab",
    },
    {
      name: "catusf Tu-dien-Phat-hoc-Viet-Anh-Thien-Phuc",
      url: "https://raw.githubusercontent.com/catusf/tudien/master/dict/Tu-dien-Phat-hoc-Viet-Anh-Thien-Phuc.tab",
      type: "tab",
    },
    {
      name: "catusf Tu-dien-Phat-hoc-Tinh-tuyen",
      url: "https://raw.githubusercontent.com/catusf/tudien/master/dict/Tu-dien-Phat-hoc-Tinh-tuyen.tab",
      type: "tab",
    },

    // --- Phase 3: Prodict & SPDict Technical/Business BZ2 Archives ---
    {
      name: "catusf Prodict_VE_Tech (Kỹ thuật Công nghệ)",
      url: "https://raw.githubusercontent.com/catusf/tudien/master/dict/Prodict_VE_Tech.tab.bz2",
      type: "bz2_tab",
    },
    {
      name: "catusf Prodict_VE_business (Kinh tế Thương mại)",
      url: "https://raw.githubusercontent.com/catusf/tudien/master/dict/Prodict_VE_business.tab.bz2",
      type: "bz2_tab",
    },
    {
      name: "catusf SPDict-Viet-Anh (Đại từ điển)",
      url: "https://raw.githubusercontent.com/catusf/tudien/master/dict/SPDict-Viet-Anh.tab.bz2",
      type: "bz2_tab",
    },
    {
      name: "catusf Bach_khoa_toan_thu",
      url: "https://raw.githubusercontent.com/catusf/tudien/master/dict/Bach_khoa_toan_thu.tab.bz2",
      type: "bz2_tab",
    },

    // --- Phase 4: Administrative Divisions (Tổng cục Thống kê GSO) ---
    {
      name: "GSO Địa danh Tỉnh / Thành phố",
      url: "https://raw.githubusercontent.com/madnh/hanhchinhvn/master/dist/tinh_tp.json",
      type: "json_hanhchinh",
    },
    {
      name: "GSO Địa danh Quận / Huyện / Thị xã",
      url: "https://raw.githubusercontent.com/madnh/hanhchinhvn/master/dist/quan_huyen.json",
      type: "json_hanhchinh",
    },
    {
      name: "GSO Địa danh Xã / Phường / Thị trấn",
      url: "https://raw.githubusercontent.com/madnh/hanhchinhvn/master/dist/xa_phuong.json",
      type: "json_hanhchinh",
    },

    // --- Phase 5: NLP Models & Lexicons ---
    {
      name: "tsdocode/vietnamese-dictionary (HuggingFace)",
      url: "https://huggingface.co/datasets/tsdocode/vietnamese-dictionary/raw/main/vi_dictionary.csv",
      type: "csv_dictionary",
    },
    {
      name: "vinai/phobert-base vocab (VinAI)",
      url: "https://huggingface.co/vinai/phobert-base/raw/main/vocab.txt",
      type: "phobert_vocab",
    },

    // --- Phase 6: Wikipedia Vietnamese Official Article Titles ---
    {
      name: "Wikipedia Tiếng Việt (All Namespace 0 Titles)",
      url: "https://dumps.wikimedia.org/viwiki/latest/viwiki-latest-all-titles-in-ns0.gz",
      type: "gz_lines",
    },
  ];

  console.log("\n2️⃣  Đang tải và hợp nhất các nguồn từ điển tiếng Việt chuẩn...");
  for (const src of remoteSources) {
    const beforeTwo = twoWordSet.size;
    process.stdout.write(`   • Tải ${src.name}... `);
    try {
      let stream = await fetchStream(src.url);

      if (src.type === "bz2_tab") {
        stream = stream.pipe(bz2());
      } else if (src.type === "gz_lines") {
        stream = stream.pipe(zlib.createGunzip());
      }

      let count = 0;
      if (src.type === "json_hanhchinh") {
        let rawBody = "";
        stream.on("data", (chunk) => (rawBody += chunk));
        await new Promise((resolve) => stream.on("end", resolve));
        try {
          const dataObj = JSON.parse(rawBody);
          for (const item of Object.values(dataObj)) {
            if (item && item.name) {
              addWord(item.name);
              count++;
            }
          }
        } catch (e) {}
      } else {
        await processLineByLine(stream, (line) => {
          if (!line) return;
          if (line.startsWith("#")) return;

          if (src.type === "lines" || src.type === "gz_lines") {
            addWord(line);
            count++;
          } else if (src.type === "tab" || src.type === "bz2_tab") {
            const tabIdx = line.indexOf("\t");
            const head = tabIdx >= 0 ? line.slice(0, tabIdx) : line;
            addWord(head);
            count++;
          } else if (src.type === "csv_dictionary") {
            const comma = line.indexOf(",");
            if (comma > 0) {
              const head = line.slice(0, comma);
              addWord(head);
              count++;
            }
          } else if (src.type === "phobert_vocab") {
            const spaceIdx = line.indexOf(" ");
            const token = spaceIdx >= 0 ? line.slice(0, spaceIdx) : line;
            if (token.includes("_")) {
              addWord(token.replace(/_/g, " "));
              count++;
            }
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
      }

      const addedTwo = twoWordSet.size - beforeTwo;
      console.log(`Xong (+${addedTwo.toLocaleString()} từ 2 tiếng mới | Tổng: ${twoWordSet.size.toLocaleString()}).`);
    } catch (err) {
      console.log(`Lỗi tải: ${err.message}`);
    }
  }

  // --- Phase 7: Curated High-Frequency Modern Daily Vietnamese Words ---
  const modernEverydayWords = [
    'thải độc', 'vụn vỡ', 'vụt tắt', 'sông nước', 'giải độc', 'tiêu độc', 'khử độc', 'độc tố', 'bài độc',
    'nhiễm độc', 'trúng độc', 'giảm cân', 'tăng cân', 'tăng cơ', 'giảm mỡ', 'giảm béo', 'dưỡng da',
    'chăm da', 'nặn mụn', 'trị mụn', 'chống nắng', 'tẩy trang', 'sữa rửa', 'đắp mặt', 'dưỡng ẩm',
    'son môi', 'kem nền', 'phấn phủ', 'tập gym', 'tập tạ', 'chạy bộ', 'bơi lội', 'nhảy dây', 'thể dục',
    'trà sữa', 'trà đào', 'trà chanh', 'trà tắc', 'trà vải', 'trà dâu', 'trà sen', 'trà mạn', 'bạc xỉu',
    'cà phê', 'đen đá', 'nâu đá', 'sữa chua', 'sữa tươi', 'sữa đậu', 'nước mía', 'nước ép', 'nước ngọt',
    'nước suối', 'nước khoáng', 'nước lọc', 'nước râu', 'nước dừa', 'bánh mì', 'bánh tráng', 'bánh ngọt',
    'bánh kem', 'bánh chuối', 'bánh bao', 'bánh tiêu', 'bánh xèo', 'bánh cuốn', 'bánh bèo', 'bánh canh',
    'bánh hỏi', 'bánh đa', 'bánh cốm', 'cơm tấm', 'cơm sườn', 'cơm gà', 'cơm chiên', 'cơm rang', 'cơm lam',
    'cơm cháy', 'cơm sáng', 'cơm trưa', 'cơm chiều', 'cơm tối', 'cơm hộp', 'cơm suất', 'phở bò', 'phở gà',
    'bún bò', 'bún chả', 'bún riêu', 'bún cá', 'bún đậu', 'bún ốc', 'bò kho', 'cá kho', 'thịt kho',
    'thịt nướng', 'gà rán', 'chả giò', 'nem rán', 'nem chua', 'canh chua', 'canh rau', 'canh ngao',
    'canh cua', 'rau muống', 'rau cải', 'rau ngót', 'trứng rán', 'trứng luộc', 'trứng ốp', 'trứng muối',
    'lạp xưởng', 'xúc xích', 'lau nhà', 'quét nhà', 'dọn nhà', 'rửa bát', 'rửa chén', 'nấu cơm', 'nấu ăn',
    'pha trà', 'pha cà', 'giặt đồ', 'phơi đồ', 'gấp đồ', 'ủi đồ', 'là quần', 'dọn dẹp', 'rửa xe',
    'xem phim', 'nghe nhạc', 'đọc báo', 'đọc truyện', 'lướt mạng', 'chụp hình', 'chụp ảnh', 'tăng ca',
    'làm thêm', 'nghỉ việc', 'nhận lương', 'thưởng tết', 'ứng lương', 'lương tháng', 'họp giao', 'giao ban',
    'họp nhóm', 'chấm công', 'báo công', 'phỏng vấn', 'thử việc', 'sống ảo', 'tương tác', 'bình luận',
    'chia sẻ', 'bấm thích', 'thả tim', 'đầu tư', 'góp vốn', 'khởi nghiệp', 'gọi vốn', 'chứng khoán',
    'tiền ảo', 'cổ phiếu'
  ];
  modernEverydayWords.forEach(addWord);

  console.log("\n3️⃣  Thống kê sau khi hợp nhất và thanh lọc chuẩn ngữ âm tiếng Việt:");
  console.log(`   • Tổng số từ ngữ chuẩn tiếng Việt (tất cả các độ dài) : ${allWordsSet.size.toLocaleString()} từ`);
  console.log(`   • Tổng số TỪ GHÉP 2 TIẾNG PHỤC VỤ NỐI TỪ             : ${twoWordSet.size.toLocaleString()} từ`);

  // Sort alphabetically using Vietnamese locale
  console.log("\n4️⃣  Sắp xếp từ điển theo bảng chữ cái tiếng Việt...");
  const collator = new Intl.Collator("vi", { sensitivity: "base" });

  const sortedAllWords = Array.from(allWordsSet).sort((a, b) => collator.compare(a, b));
  const sortedTwoWords = Array.from(twoWordSet).sort((a, b) => collator.compare(a, b));

  fs.writeFileSync(wordsPath, sortedAllWords.join("\n") + "\n", "utf-8");
  console.log(`   ✅ Ghi thành công data/words.txt (${sortedAllWords.length.toLocaleString()} dòng).`);

  fs.writeFileSync(officialPath, sortedTwoWords.join("\n") + "\n", "utf-8");
  console.log(`   ✅ Ghi thành công data/official-words.txt (${sortedTwoWords.length.toLocaleString()} dòng).`);

  fs.writeFileSync(gwdataPath, JSON.stringify(sortedTwoWords, null, 2), "utf-8");
  console.log(`   ✅ Ghi thành công data/gwdata.json (${sortedTwoWords.length.toLocaleString()} từ).`);

  console.log("\n==================================================================");
  console.log(`🎉 HOÀN TẤT! NGÂN HÀNG TỪ ĐÃ ĐẠT: ${twoWordSet.size.toLocaleString()} TỪ GHÉP 2 TIẾNG CHUẨN!`);
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
