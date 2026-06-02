const fs = require('fs');
const path = require('path');

const gwDataPath = path.join(__dirname, '../data/gwdata.json');
let wordsCache = null;
let mtimeCache = 0;

function getWords() {
  if (!fs.existsSync(gwDataPath)) {
    return [];
  }
  try {
    const mtime = fs.statSync(gwDataPath).mtimeMs;
    if (!wordsCache || mtime !== mtimeCache) {
      wordsCache = JSON.parse(fs.readFileSync(gwDataPath, 'utf8'));
      mtimeCache = mtime;
    }
  } catch (error) {
    console.error('[Dictionary Cache] Error reading gwdata.json:', error);
    if (!wordsCache) {
      wordsCache = [];
    }
  }
  return wordsCache;
}

function getRandomWord() {
  const words = getWords();
  if (words.length === 0) return "nối từ";
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
