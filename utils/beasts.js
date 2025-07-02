// utils/beasts.js

const beastList = {
  C: [
    '🐜 Kiến', '🐝 Ong', '🕷️ Nhện', '🪰 Ruồi', '🪳 Gián', '🦂 Bọ cạp', '🦟 Muỗi', '🪱 Giun', '🐞 Bọ rùa', '🐛 Sâu bướm',
    '🐸 Ếch', '🦑 Mực', '🦋 Bươm bướm', '🪲 Bọ hung', '🐌 Ốc sên'
  ],
  U: [
    '🐁 Chuột', '🦉 Cú mèo', '🐿️ Sóc', '🐰 Thỏ', '🦔 Nhím', '🐘 Voi', '🦆 Vịt', '🦇 Dơi', '🦜 Vẹt nhỏ', '🪿 Ngỗng',
    '🪼 Sứa', '🐙 Bạch tuộc', '🐢 Rùa'
  ],
  R: [
    '🐶 Chó', '🐱 Mèo', '🐷 Heo', '🐮 Bò', '🐴 Ngựa', '🐓 Gà trống', '🦃 Gà tây', '🐐 Dê', '🐑 Cừu', '🦩 Hồng hạc',
    '🐧 Chim cánh cụt', '🦭 Hải cẩu'
  ],
  E: [
    '🦁 Sư tử', '🐯 Hổ', '🐺 Sói', '🐊 Cá sấu', '🐍 Rắn', '🐆 Báo', '🦈 Cá mập', '🐻 Gấu', '🦅 Đại bàng', '🦊 Cáo',
    '🐻‍❄️ Gấu bắc cực', '🦛 Hà mã'
  ],
  M: [
    '🐫 Lạc đà', '🧝‍♂️ Yêu tinh', '🧛‍♂️ Ma cà rồng', '🧟‍♂️ Xác sống', '🧙‍♂️ Pháp sư', '🧞‍♂️ Thần đèn', '🧜‍♀️ Người cá',
    '🦚 Công', '🫎 Nai sừng tấm', '🦄 Unicorn'
  ],
  L: [
    '🦖 Khủng long bạo chúa', '🦕 Khủng long cổ dài', '🦣 Voi ma mút', '🦍 Khỉ đột', '👻 Hồn ma', '🦏 Tê giác',
    '🦧 Đười ươi', '🐼 Gấu trúc', '🦬 Bò rừng', '🐳 Cá voi'
  ],
  L: [
    '🦖 Khủng long bạo chúa', '🦕 Khủng long cổ dài', '🦣 Voi ma mút','🐉 Rồng', '🐦‍🔥 Phượng hoàng'
  ]
};

function getRandomBeast() {
  const rarities = Object.keys(beastList);
  const weights = {
    C: 45,
    U: 25,
    R: 15,
    E: 10,
    M: 4,
    L: 1,
    A: 0.5
  };

  const totalWeight = rarities.reduce((sum, r) => sum + weights[r], 0);
  let rand = Math.random() * totalWeight;

  let selectedRarity;
  for (const rarity of rarities) {
    if (rand < weights[rarity]) {
      selectedRarity = rarity;
      break;
    }
    rand -= weights[rarity];
  }

  const list = beastList[selectedRarity];
  const full = list[Math.floor(Math.random() * list.length)];
  const [emoji, ...nameParts] = full.split(' ');
  const name = nameParts.join(' ');

  const rarityMap = {
    C: 'Common',
    U: 'Uncommon',
    R: 'Rare',
    E: 'Epic',
    M: 'Mythical',
    L: 'Legendary',
    A: 'Ancient'
  };

  return {
    name,
    emoji,
    rarity: rarityMap[selectedRarity]
  };
}

function getMultipleRandomBeasts(amount = 10) {
  const result = [];
  for (let i = 0; i < amount; i++) {
    result.push(getRandomBeast());
  }
  return result;
}

module.exports = {
  getRandomBeast,
  getMultipleRandomBeasts
};
