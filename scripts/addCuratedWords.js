/**
 * Script to add curated missing words (including sua bien, seafood, drinks, fruits, daily terms)
 * to CokeBot's dictionary files:
 * 1. data/official-words.txt (2-word terms for word chaining)
 * 2. data/words.txt (all-word dictionary)
 * 3. data/gwdata.json (JSON word bank)
 * 4. data/contribute-words.txt (fallback persistent contribution list)
 */

const fs = require('fs');
const path = require('path');

const VIETNAMESE_REGEX = /^[a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ\s]+$/;

function normalize(w) {
  if (!w || typeof w !== 'string') return null;
  const n = w.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!VIETNAMESE_REGEX.test(n)) return null;
  const parts = n.split(' ');
  if (parts.length !== 2) return null;
  return n;
}

const curatedWords = [
  // === 1. SỨA (JELLYFISH) & DIRECT DERIVATIVES ===
  'sứa biển', 'sứa trắng', 'sứa gai', 'sứa đá', 'sứa chấm', 'sứa hoa', 'sứa nón', 'sứa hộp', 'sứa dù',
  'sứa độc', 'sứa muối', 'sứa ngâm', 'sứa khô', 'sứa tươi', 'sứa cảnh', 'sứa vắt', 'sứa xào', 'sứa hấp',
  'sứa luộc', 'sứa nướng', 'sứa trôi', 'sứa dạt', 'sứa chết', 'sứa sống', 'sứa con', 'sứa mẹ', 'sứa rơm',
  'sứa tép', 'sứa bông', 'sứa đĩa', 'sứa vàng', 'sứa nấm', 'canh sứa', 'lẩu sứa', 'chả sứa', 'mắm sứa',
  'mùa sứa', 'món sứa', 'vớt sứa', 'bắt sứa', 'nuôi sứa', 'thịt sứa', 'nọc sứa', 'tua sứa', 'dù sứa',
  'ngứa sứa', 'đốt sứa', 'chích sứa',

  // === 2. BIỂN CONTINUATIONS (from sứa biển -> biển ...) ===
  'biển xanh', 'biển mặn', 'biển đêm', 'biển dâu', 'biển lớn', 'biển vắng', 'biển tên', 'biển phòng',
  'biển cấm', 'biển chỉ', 'biển dẫn', 'biển rạng', 'biển rộng', 'biển lặng', 'biển ngút', 'biển xa',
  'biển cạn', 'biển sâu', 'biển đảo', 'biển triều', 'biển êm', 'biển sóng', 'biển cát',

  // === 3. XANH CONTINUATIONS (from biển xanh -> xanh ...) ===
  'xanh thẳm', 'xanh đọt', 'xanh mạ', 'xanh mướt', 'xanh um', 'xanh rêu', 'xanh ngọc', 'xanh non',

  // === 4. SEAFOOD, FISH & MARINE LIFE ===
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

  // === 5. MEAT, POULTRY & HOTPOT DISHES ===
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

  // === 6. SOUTHERN & NORTHERN FRUITS (TRÁI ... / QUẢ ...) ===
  'trái xoài', 'trái mít', 'trái cam', 'trái quýt', 'trái bưởi', 'trái chanh', 'trái ổi', 'trái mận',
  'trái đào', 'trái táo', 'trái nho', 'trái lê', 'trái na', 'trái dừa', 'trái bơ', 'trái dâu',
  'trái vải', 'trái nhãn', 'trái cóc', 'trái khế', 'trái me', 'trái ớt', 'trái sung', 'trái sầu',
  'trái măng', 'trái dưa', 'trái bầu', 'trái bí', 'trái mướp', 'trái khổ', 'trái cà',

  // === 7. PLANTS, FLOWERS, LEAVES & VEGETABLES ===
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

  // === 8. NOODLES, RICE & TRADITIONAL DISHES ===
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

  // === 9. BEVERAGES & CAFE CULTURE ===
  'trà đá', 'trà nóng', 'trà chanh', 'trà tắc', 'trà đào', 'trà dâu', 'trà vải', 'trà sen', 'trà lài',
  'trà hoa', 'trà nhài', 'trà búp', 'trà mạn', 'trà đắng', 'trà gừng', 'trà sâm', 'trà sữa', 'trà bí',
  'sữa đặc', 'sữa bột', 'sữa chua', 'sữa đậu', 'sữa bắp', 'sữa hạt', 'sữa dừa', 'sữa tươi',
  'nước dừa', 'nước mía', 'nước cam', 'nước chanh', 'nước bưởi', 'nước sấu', 'nước me', 'nước dâu',
  'nước táo', 'nước cóc', 'nước ổi', 'nước xoài', 'nước sâm', 'nước ngô', 'nước suối', 'nước khoáng',
  'nước lèo', 'nước dùng', 'nước chấm', 'nước xốt', 'nước mắm', 'nước tương',

  // === 10. KITCHEN, HOME & APPLIANCES ===
  'nồi lẩu', 'nồi đồng', 'nồi chiên', 'chảo xào', 'chảo gang', 'bát cơm', 'chén canh', 'chén dĩa',
  'chén sứ', 'đĩa cơm', 'đĩa thịt', 'đĩa cá', 'đĩa rau', 'đũa mun', 'thìa cơm', 'muỗng cơm',
  'phòng thờ', 'phòng nét', 'giường nệm', 'tủ giày', 'tủ nhôm', 'tủ nhựa', 'tủ gỗ', 'tủ mát',

  // === 11. CLOTHING, FOOTWEAR & COLORS ===
  'áo dạ', 'áo đấu', 'quần ngố', 'quần thun', 'quần ngủ', 'quần suông',
  'giày bệt', 'giày múa', 'dép quai', 'dép kẹp', 'dép sục', 'tất lười', 'vớ chân', 'vớ ngắn', 'mũ vành',
  'đỏ đô', 'đỏ gạch', 'đỏ rượu', 'đỏ cam', 'vàng chanh', 'vàng cam', 'vàng mơ', 'vàng đồng',
  'đen nhánh', 'đen bóng', 'đen mun', 'tím huế', 'tím lịm', 'tím thẫm', 'hồng phấn', 'hồng hào',
  'nâu sẫm', 'nâu đất', 'nâu đồng', 'xám xịt', 'xám tro', 'xám bạc',

  // === 12. FEELINGS, SENSATIONS & PHYSICAL STATES ===
  'sống vội', 'sống chậm', 'đau ví', 'đau tay', 'đau chân', 'đau thấu',
  'mỏi cổ', 'mỏi vai', 'mỏi tay', 'mỏi gối', 'ngứa cổ', 'ngứa mắt', 'cay mũi',
  'đắng chát', 'ngọt sớt', 'ngọt nước', 'ngọt lịm', 'ngọt bùi', 'mặn mòi', 'mặn chát',

  // === 13. MODERN LIFE, INTERNET, GAMING & COLLOQUIAL TERMS ===
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

const dataDir = path.join(__dirname, '../data');
const officialPath = path.join(dataDir, 'official-words.txt');
const wordsPath = path.join(dataDir, 'words.txt');
const gwdataPath = path.join(dataDir, 'gwdata.json');
const contributePath = path.join(dataDir, 'contribute-words.txt');

// Read existing official words
const existingOfficial = fs.readFileSync(officialPath, 'utf8')
  .split(/\r?\n/)
  .map(w => w.trim().normalize('NFC'))
  .filter(Boolean);

const officialSet = new Set(existingOfficial);
const addedWords = [];

for (const raw of curatedWords) {
  const norm = normalize(raw);
  if (norm && !officialSet.has(norm)) {
    officialSet.add(norm);
    addedWords.push(norm);
  }
}

console.log(`Đã tìm thấy ${addedWords.length} từ mới cần thêm vào từ điển!`);
console.log('Từ mới tiêu biểu:', addedWords.slice(0, 30));

const collator = new Intl.Collator('vi', { sensitivity: 'base' });
const sortedOfficial = Array.from(officialSet).sort((a, b) => collator.compare(a, b));

// 1. Update official-words.txt
fs.writeFileSync(officialPath, sortedOfficial.join('\n') + '\n', 'utf8');
console.log(`✅ Đã cập nhật ${officialPath} (${sortedOfficial.length.toLocaleString()} từ ghép 2 tiếng).`);

// 2. Update gwdata.json
fs.writeFileSync(gwdataPath, JSON.stringify(sortedOfficial, null, 2), 'utf8');
console.log(`✅ Đã cập nhật ${gwdataPath} (${sortedOfficial.length.toLocaleString()} từ).`);

// 3. Update words.txt
const existingWords = fs.readFileSync(wordsPath, 'utf8')
  .split(/\r?\n/)
  .map(w => w.trim().normalize('NFC'))
  .filter(Boolean);
const wordsSet = new Set(existingWords);
for (const w of addedWords) {
  wordsSet.add(w);
}
const sortedWords = Array.from(wordsSet).sort((a, b) => collator.compare(a, b));
fs.writeFileSync(wordsPath, sortedWords.join('\n') + '\n', 'utf8');
console.log(`✅ Đã cập nhật ${wordsPath} (${sortedWords.length.toLocaleString()} dòng).`);

// 4. Update contribute-words.txt
let existingContribute = [];
if (fs.existsSync(contributePath)) {
  existingContribute = fs.readFileSync(contributePath, 'utf8')
    .split(/\r?\n/)
    .map(w => w.trim().normalize('NFC'))
    .filter(Boolean);
}
const contributeSet = new Set(existingContribute);
for (const w of addedWords) {
  contributeSet.add(w);
}
const sortedContribute = Array.from(contributeSet).sort((a, b) => collator.compare(a, b));
fs.writeFileSync(contributePath, sortedContribute.join('\n') + '\n', 'utf8');
console.log(`✅ Đã cập nhật ${contributePath} (${sortedContribute.length.toLocaleString()} dòng).`);

console.log('🎉 Hoàn tất cập nhật!');
