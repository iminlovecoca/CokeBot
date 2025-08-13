const suits = ['s', 'c', 'h', 'd']; 
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const emojiMap = {
  'As': '<:as:1387744476281180313>', '2s': '<:2s:1387744451430187070>', '3s': '<:3s:1387744435680448662>', '4s': '<:4s:1387744421117689856>',
  '5s': '<:5s:1387744401672900678>', '6s': '<:6s:1387744380521025536>', '7s': '<:7s:1387744359654621246>', '8s': '<:8s:1387744343573663795>',
  '9s': '<:9s:1387744328021049454>', '10s': '<:10s:1387744315001802839>', 'Js': '<:js:1387744943573045398>', 'Qs': '<:qs:1387744494937444524>',
  'Ks': '<:ks:1387744640362352691>',
  'Ah': '<:ah:1387747538479743046>', '2h': '<:2h:1387747525225615400>', '3h': '<:3h:1387747508582879283>', '4h': '<:4h:1387747459903651840>',
  '5h': '<:5h:1387747409458892801>', '6h': '<:6h:1387747390613618870>', '7h': '<:7h:1387747372792283176>', '8h': '<:8h:1387747352663818290>',
  '9h': '<:9h:1387747330081427456>', '10h': '<:10h:1387747310833897543>', 'Jh': '<:jh:1387747288411017328>', 'Qh': '<:qh:1387747094860927130>',
  'Kh': '<:kh:1387747075621650523>',
  'Ad': '<:ad:1387746016584798270>', '2d': '<:2d:1387745830768873482>', '3d': '<:3d:1387745813966618754>', '4d': '<:4d:1387745735952433286>',
  '5d': '<:5d:1387745682936303626>', '6d': '<:6d:1387745631421861898>', '7d': '<:7d:1387745614917537792>', '8d': '<:8d:1387745588853997811>',
  '9d': '<:9d:1387745073038622780>', '10d': '<:10d:1387745042197647493>', 'Jd': '<:jd:1387745008970629201>', 'Qd': '<:qd:1387744996974919791>',
  'Kd': '<:kd:1387744979916558456>',
  'Ac': '<:ac:1387747044189405204>', '2c': '<:2c:1387747027382702190>', '3c': '<:3c:1387747001067900958>', '4c': '<:4c:1387746985385398335>',
  '5c': '<:5c:1387746960357986344>', '6c': '<:6c:1387746942880055397>', '7c': '<:7c:1387746915462156288>', '8c': '<:8c:1387746898496065649>',
  '9c': '<:9c:1387746869517746338>', '10c': '<:10c:1387746849154269266>', 'Jc': '<:jc:1387746825771159592>', 'Qc': '<:qc:1387746055717781626>',
  'Kc': '<:kc:1387746037199798445>'
};

function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ name: `${rank}${suit}`, value: getValue(rank) });
    }
  }
  return shuffle(deck);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getValue(rank) {
  if (rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(rank)) return 10;
  return parseInt(rank);
}

function drawCard(deck) {
  if (!deck || !Array.isArray(deck)) {
    throw new Error("Deck không hợp lệ");
  }
  if (deck.length === 0) {
    throw new Error("Deck đã hết bài");
  }
  return deck.pop();
}

function calcHandValue(hand) {
  const validCards = hand.filter(c => c && typeof c.name === 'string' && typeof c.value === 'number');
  let total = validCards.reduce((sum, card) => sum + card.value, 0);
  let aces = validCards.filter(c => c.name.startsWith('A')).length;

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function getCardDisplay(hand) {
  return hand.map(c => emojiMap[c.name] || c.name).join(' ');
}

function backEmoji() {
  return '<:back:1387747558880841789>';
}

module.exports = {
  createDeck,
  drawCard,
  calcHandValue,
  getCardDisplay,
  backEmoji
};
