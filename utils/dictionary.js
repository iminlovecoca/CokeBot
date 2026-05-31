const fs = require('fs');
const path = require('path');

const words = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/gwdata.json'), 'utf8')
);

function getRandomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

function shuffleWord(word) {
  const chars = word.replace(/\s/g, '').split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

module.exports = {
  getRandomWord,
  shuffleWord
};
