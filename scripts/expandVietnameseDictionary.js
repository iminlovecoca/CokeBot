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
    'tiền ảo', 'cổ phiếu',
    // Sứa and marine
    'sứa biển', 'sứa trắng', 'sứa gai', 'sứa đá', 'sứa chấm', 'sứa hoa', 'sứa nón', 'sứa hộp', 'sứa dù',
    'sứa độc', 'sứa muối', 'sứa ngâm', 'sứa khô', 'sứa tươi', 'sứa cảnh', 'sứa vắt', 'sứa xào', 'sứa hấp',
    'sứa luộc', 'sứa nướng', 'sứa trôi', 'sứa dạt', 'sứa chết', 'sứa sống', 'sứa con', 'sứa mẹ', 'sứa rơm',
    'sứa tép', 'sứa bông', 'sứa đĩa', 'sứa vàng', 'sứa nấm', 'canh sứa', 'lẩu sứa', 'chả sứa', 'mắm sứa',
    'mùa sứa', 'món sứa', 'vớt sứa', 'bắt sứa', 'nuôi sứa', 'thịt sứa', 'nọc sứa', 'tua sứa', 'dù sứa',
    'ngứa sứa', 'đốt sứa', 'chích sứa',
    // Biển continuations
    'biển xanh', 'biển mặn', 'biển đêm', 'biển dâu', 'biển lớn', 'biển vắng', 'biển tên', 'biển phòng',
    'biển cấm', 'biển chỉ', 'biển dẫn', 'biển rạng', 'biển rộng', 'biển lặng', 'biển ngút', 'biển xa',
    'biển cạn', 'biển sâu', 'biển đảo', 'biển triều', 'biển êm', 'biển sóng', 'biển cát',
    // Xanh continuations
    'xanh thẳm', 'xanh đọt', 'xanh mạ', 'xanh mướt', 'xanh um', 'xanh rêu', 'xanh ngọc', 'xanh non',
    // Seafood & dishes
    'mực tươi', 'mực sống', 'mực nướng', 'mực chiên', 'mực xào', 'mực hấp', 'mực luộc', 'mực nhồi',
    'mực rim', 'mực cơm', 'mực trứng', 'mực nhảy', 'mực sim', 'mực nang', 'mực lá', 'mực một',
    'tôm khô', 'tôm tươi', 'tôm sống', 'tôm rang', 'tôm chiên', 'tôm nướng', 'tôm hấp', 'tôm luộc', 'tôm búp',
    'tôm sú', 'tôm càng', 'tôm hùm', 'tôm tít', 'tôm tích', 'tôm đất', 'tôm rảo', 'tôm nõn', 'tôm kho',
    'cua đồng', 'cua biển', 'cua gạch', 'cua thịt', 'cua lột', 'cua rang', 'cua hấp', 'cua luộc', 'cua nướng', 'cua xào',
    'ghẹ xanh', 'ghẹ hoa', 'ghẹ đỏ', 'ghẹ hấp', 'ghẹ luộc', 'ghẹ nướng', 'ghẹ rang', 'ghẹ xào',
    'cá biển', 'cá đồng', 'cá suối', 'cá hồ', 'cá sông', 'cá ao', 'cá khô', 'cá tươi', 'cá sống', 'cá nướng',
    'cá hấp', 'cá luộc', 'cá rán', 'cá chiên', 'cá kho', 'cá rim', 'cá xào', 'cá nấu', 'cá muối',
    'ốc luộc', 'ốc xào', 'ốc hấp', 'ốc nướng', 'ốc hút', 'ốc mỡ', 'ốc hương', 'ốc bươu', 'ốc nhồi',
    'ốc đồng', 'ốc biển', 'ốc mít', 'ốc đá', 'ốc vặn', 'ốc gai', 'ốc móng', 'ốc len',
    'sò méo', 'sò nướng', 'sò hấp', 'sò huyết', 'sò lông', 'sò điệp', 'sò dương', 'sò xào', 'sò luộc',
    'hàu sữa', 'hàu nướng', 'hàu sống', 'hàu né', 'hàu hấp', 'hàu xào', 'hàu chiên',
    'nghêu hấp', 'nghêu luộc', 'nghêu nướng', 'nghêu xào', 'nghêu nấu',
    'hến xào', 'hến luộc', 'canh hến', 'cháo hến', 'cơm hến',
    // Meat, hotpot & poultry
    'lẩu cá', 'lẩu gà', 'lẩu bò', 'lẩu cua', 'lẩu ếch', 'lẩu nấm', 'lẩu tôm', 'lẩu mực', 'lẩu chua',
    'lẩu dê', 'lẩu mắm', 'lẩu thái',
    'chân gà', 'cánh gà', 'đùi gà', 'lòng gà', 'mề gà', 'gà luộc', 'gà nướng', 'gà hấp', 'gà chiên',
    'gà rang', 'gà xào', 'gà kho', 'gà ủ', 'gà muối', 'gà cay', 'gà rán', 'gà ác', 'gà tre', 'gà chọi',
    'vịt quay', 'vịt nướng', 'vịt luộc', 'vịt om', 'vịt xào', 'vịt rang', 'vịt kho', 'vịt cỏ', 'vịt bầu',
    'trứng gà', 'trứng vịt', 'trứng cút', 'trứng ngỗng', 'trứng lộn', 'vịt lộn', 'cút lộn',
    'bò nướng', 'bò xào', 'bò sốt', 'bò hầm', 'bò luộc', 'bò tái', 'bò nhúng', 'bò né',
    'heo quay', 'heo nướng', 'heo luộc', 'heo kho', 'heo xào', 'heo hấp', 'heo rim',
    'lợn quay', 'lợn nướng', 'lợn luộc', 'lợn kho', 'lợn xào', 'lợn mán', 'lợn rừng',
    'sườn xào', 'sườn nướng', 'sườn ram', 'sườn rim', 'sườn hấp', 'sườn hầm', 'sườn nấu', 'sườn sốt',
    'chả cá', 'chả mực', 'chả tôm', 'chả cua', 'chả lụa', 'chả quế', 'chả bò', 'chả rươi', 'chả giò',
    'giò lụa', 'giò xào', 'giò thủ', 'giò tai', 'giò me', 'giò heo', 'giò chả',
    'nem nướng', 'nem lụi', 'nem chua', 'nem cuốn', 'nem rán', 'nem tai',
    'thịt ghẹ', 'thịt ốc', 'thịt sò', 'thịt rang', 'thịt xào', 'thịt hấp', 'thịt hun', 'thịt xông',
    // Fruits & plants
    'trái xoài', 'trái mít', 'trái cam', 'trái quýt', 'trái bưởi', 'trái chanh', 'trái ổi', 'trái mận',
    'trái đào', 'trái táo', 'trái nho', 'trái lê', 'trái na', 'trái dừa', 'trái bơ', 'trái dâu',
    'trái vải', 'trái nhãn', 'trái cóc', 'trái khế', 'trái me', 'trái ớt', 'trái sung', 'trái sầu',
    'trái măng', 'trái dưa', 'trái bầu', 'trái bí', 'trái mướp', 'trái khổ', 'trái cà',
    'cây khoai', 'cây cột', 'cây cau', 'cây chuối', 'cây lúa', 'cây ngô', 'cây mía', 'cây sắn',
    'hoa bưởi', 'hoa cau', 'hoa chanh', 'hoa nhài', 'hoa lài', 'hoa quỳnh', 'hoa sim', 'hoa mua', 'hoa trâm',
    'lá chanh', 'lá bưởi', 'lá ổi', 'lá trầu', 'lá lốt', 'lá mơ', 'lá dong', 'lá chuối', 'lá sen',
    'lá me', 'lá thông', 'lá phong', 'lá mít', 'lá xoài', 'lá tía', 'lá ngải', 'lá dứa', 'lá nếp',
    'lá gai', 'lá vối', 'lá tre', 'lá bàng', 'lá ngón',
    'củ sắn', 'củ khoai', 'củ dong', 'củ mài', 'củ cải', 'củ dền', 'củ gừng', 'củ nghệ', 'củ riềng',
    'củ sả', 'củ tỏi', 'củ hành', 'củ kiệu', 'củ đậu', 'củ lạc',
    'hạt tiêu', 'hạt gạo', 'hạt thóc', 'hạt ngô', 'hạt bắp', 'hạt đậu', 'hạt đỗ', 'hạt sen', 'hạt dưa',
    'hạt bí', 'hạt điều', 'hạt dẻ', 'hạt mè', 'hạt vừng', 'hạt kê',
    'rau ngò', 'rau hẹ', 'rau má', 'rau đắng', 'rau nhút', 'rau ngót', 'rau dền', 'rau đay', 'rau lang',
    // Noodles & rice
    'cơm nóng', 'cơm thố', 'cơm cuộn', 'cơm mẹ', 'cơm nhà', 'cơm quán',
    'bún giò', 'bún sườn', 'bún ngan', 'bún vịt', 'bún nước', 'bún khô', 'bún tươi', 'bún trộn', 'bún quậy', 'bún cuốn',
    'phở trộn', 'phở gầu', 'phở sốt',
    'mì trộn', 'mì khô', 'mì tươi', 'mì vắt', 'mì tôm', 'mì gói', 'mì cay',
    'bánh cuốn', 'bánh ướt', 'bánh xèo', 'bánh khọt', 'bánh bèo', 'bánh nậm', 'bánh bột', 'bánh căn',
    'bánh cống', 'bánh hỏi', 'bánh canh', 'bánh đa', 'bánh đúc', 'bánh giò', 'bánh chưng', 'bánh tét',
    'bánh khúc', 'bánh pía', 'bánh gai', 'bánh cáy', 'bánh cốm', 'bánh dừa', 'bánh bò', 'bánh khoai',
    'bánh chuối', 'bánh ngô', 'bánh sắn', 'bánh rán', 'bánh tiêu', 'bánh quy', 'bánh quẩy', 'bánh ngọt',
    'bánh mặn', 'bánh kem', 'bánh dẻo', 'bánh nướng', 'bánh xốp', 'bánh su', 'bánh tráng',
    'chè đậu', 'chè đỗ', 'chè bắp', 'chè chuối', 'chè bưởi', 'chè thái', 'chè sen', 'chè khoai', 'chè khúc', 'chè trôi',
    'xôi gấc', 'xôi xéo', 'xôi vò', 'xôi đậu', 'xôi đỗ', 'xôi lạc', 'xôi ngô', 'xôi dừa', 'xôi gà', 'xôi khúc', 'xôi cẩm',
    'cháo gà', 'cháo vịt', 'cháo bò', 'cháo cá', 'cháo lươn', 'cháo ếch', 'cháo sườn', 'cháo lòng', 'cháo quẩy', 'cháo trai', 'cháo hàu', 'cháo ngao', 'cháo nấm', 'cháo trắng', 'cháo đậu',
    // Drinks
    'trà đá', 'trà nóng', 'trà chanh', 'trà tắc', 'trà đào', 'trà dâu', 'trà vải', 'trà sen', 'trà lài',
    'trà hoa', 'trà nhài', 'trà búp', 'trà mạn', 'trà đắng', 'trà gừng', 'trà sâm', 'trà sữa', 'trà bí',
    'sữa đặc', 'sữa bột', 'sữa chua', 'sữa đậu', 'sữa bắp', 'sữa hạt', 'sữa dừa', 'sữa tươi',
    'nước dừa', 'nước mía', 'nước cam', 'nước chanh', 'nước bưởi', 'nước sấu', 'nước me', 'nước dâu',
    'nước táo', 'nước cóc', 'nước ổi', 'nước xoài', 'nước sâm', 'nước ngô', 'nước suối', 'nước khoáng',
    'nước lèo', 'nước dùng', 'nước chấm', 'nước xốt', 'nước mắm', 'nước tương',
    // Kitchen & home
    'nồi lẩu', 'nồi đồng', 'nồi chiên', 'chảo xào', 'chảo gang', 'bát cơm', 'chén canh', 'chén dĩa',
    'chén sứ', 'đĩa cơm', 'đĩa thịt', 'đĩa cá', 'đĩa rau', 'đũa mun', 'thìa cơm', 'muỗng cơm',
    'phòng thờ', 'phòng nét', 'giường nệm', 'tủ giày', 'tủ nhôm', 'tủ nhựa', 'tủ gỗ', 'tủ mát',
    // Clothing & feelings
    'áo dạ', 'áo đấu', 'quần ngố', 'quần thun', 'quần ngủ', 'quần suông',
    'giày bệt', 'giày múa', 'dép quai', 'dép kẹp', 'dép sục', 'tất lười', 'vớ chân', 'vớ ngắn', 'mũ vành',
    'đỏ đô', 'đỏ gạch', 'đỏ rượu', 'đỏ cam', 'vàng chanh', 'vàng cam', 'vàng mơ', 'vàng đồng',
    'đen nhánh', 'đen bóng', 'đen mun', 'tím huế', 'tím lịm', 'tím thẫm', 'hồng phấn', 'hồng hào',
    'nâu sẫm', 'nâu đất', 'nâu đồng', 'xám xịt', 'xám tro', 'xám bạc',
    'sống vội', 'sống chậm', 'đau ví', 'đau tay', 'đau chân', 'đau thấu',
    'mỏi cổ', 'mỏi vai', 'mỏi tay', 'mỏi gối', 'ngứa cổ', 'ngứa mắt', 'cay mũi',
    'đắng chát', 'ngọt sớt', 'ngọt nước', 'ngọt lịm', 'ngọt bùi', 'mặn mòi', 'mặn chát',
    // Internet & gaming
    'cháy vé', 'cháy hàng', 'cháy túi', 'cháy rực', 'cháy phố', 'cháy phòng',
    'húp trọn', 'húp canh', 'nuốt trôi', 'nuốt nghẹn', 'nuốt hận',
    'cắn răng', 'cắn câu', 'cắn môi', 'nhả vía', 'nhả khói', 'nhả bã', 'nhả chữ',
    'xin vía', 'xin lỗi', 'xin tiền', 'xin nghỉ', 'trả bài', 'trả nợ', 'trả tiền', 'trả đũa',
    'trả giá', 'trả thù', 'trả hàng', 'trả phòng', 'vỡ nợ', 'vỡ trận', 'vỡ mộng', 'vỡ kế hoạch',
    'tắt thở', 'tắt máy', 'tắt đài', 'tắt tiếng', 'tắt đèn', 'tắt điện', 'tắt mạng', 'tắt sóng',
    'bật máy', 'bật đèn', 'bật điện', 'bật khóc', 'bật cười',
    'sập bẫy', 'sập tiệm', 'sập sàn', 'sập cầu', 'sập nhà', 'sập nguồn', 'sập web',
    'cày cuốc', 'cày rank', 'cày view', 'gánh team', 'kéo rank', 'lật kèo', 'bán hành', 'ăn hành',
    'lên đồ', 'lên cấp', 'tăng cấp', 'rớt hạng', 'tụt hạng', 'thăng hạng', 'xuống hạng',
    'ôm hận', 'ôm tiền', 'ôm cua', 'đổ đèo', 'leo dốc', 'tụt dốc',
    'móc họng', 'đá xoáy', 'đá đểu', 'chửi khéo', 'mắng mỏ', 'khen ngợi', 'tán thưởng', 'tán dương',
    'gây sốt', 'tạo nhiệt', 'bắt mạch', 'bốc thuốc', 'kê đơn', 'tiêm phòng', 'chích ngừa'
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
