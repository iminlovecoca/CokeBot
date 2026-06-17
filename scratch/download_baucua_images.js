const axios = require("axios");
const fs = require("fs");
const path = require("path");

const EMOTE_MAP = {
  cua: "u1f980", // 🦀
  tom: "u1f990", // 🦐
  bau: "u1f350", // 🍐
  ga: "u1f413",  // 🐓
  huou: "u1f98c",// 🦌
  ca: "u1f41f"   // 🐟
};

async function downloadImages() {
  const targetDir = path.join(__dirname, "../assets/images/baucua");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const [key, code] of Object.entries(EMOTE_MAP)) {
    const url = `https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/128/emoji_${code}.png`;
    const destPath = path.join(targetDir, `${key}.png`);
    console.log(`Downloading ${key} from ${url}...`);

    try {
      const response = await axios({
        method: "GET",
        url: url,
        responseType: "stream"
      });

      const writer = fs.createWriteStream(destPath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
      console.log(`Successfully saved ${key}.png`);
    } catch (err) {
      console.error(`Failed to download ${key}:`, err.message);
    }
  }
}

downloadImages();
