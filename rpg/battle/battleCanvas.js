const { createCanvas, loadImage } = require("canvas");
const path = require("path");
const fs = require("fs");
const { getCharacterAssetPath } = require("../../utils/rpgUtil");

const imageCache = new Map();
const emojiCache = new Map();

/**
 * Pre-cache standard background assets into RAM.
 */
async function getCachedImage(filePath) {
  if (!filePath) return null;
  if (imageCache.has(filePath)) {
    return imageCache.get(filePath);
  }
  if (!fs.existsSync(filePath)) return null;
  try {
    const img = await loadImage(filePath);
    imageCache.set(filePath, img);
    return img;
  } catch (err) {
    console.error(`Failed to pre-cache image from ${filePath}:`, err);
    return null;
  }
}

/**
 * Fetch and memory-cache Discord Emoji image (static & animated GIFs/PNGs) as Canvas Image.
 */
async function getEmojiImage(emojiStr) {
  if (!emojiStr) return null;
  if (emojiCache.has(emojiStr)) {
    return emojiCache.get(emojiStr);
  }
  const match = emojiStr.match(/<(a)?:[^:]+:(\d+)>/);
  if (!match) return null;

  const isAnimated = Boolean(match[1]);
  const emojiId = match[2];
  const primaryExt = isAnimated ? "gif" : "png";
  const primaryUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${primaryExt}`;

  try {
    const img = await loadImage(primaryUrl);
    emojiCache.set(emojiStr, img);
    return img;
  } catch (err) {
    try {
      const fallbackUrl = `https://cdn.discordapp.com/emojis/${emojiId}.png`;
      const img = await loadImage(fallbackUrl);
      emojiCache.set(emojiStr, img);
      return img;
    } catch (e2) {
      console.error(`Failed to load emoji image for ${emojiStr}:`, e2);
      return null;
    }
  }
}

/**
 * Load equipped pet image (supports Legendary assets, Discord emojis, and Unicode emojis).
 */
async function getPetCanvasImage(petInput) {
  if (!petInput) return null;

  let pet = petInput;
  const { PET_SPECIES } = require("../../data/pets");
  const petKey = typeof petInput === "string" ? petInput : petInput.key;
  const foundSpecies = PET_SPECIES.find((s) => s.key === petKey || s.aliases?.includes(petKey));

  const key = petKey || foundSpecies?.key;
  const emoji = (typeof petInput === "object" ? petInput.emoji : null) || foundSpecies?.emoji;

  const petKeyMap = {
    sabertiger: path.join(__dirname, "../../assets/ranks/legendary/legendary_saber_tiger_badge.png"),
    mammoth: path.join(__dirname, "../../assets/ranks/legendary/legendary_mammoth.png"),
    eagle: path.join(__dirname, "../../assets/ranks/legendary/legendary_eagle_fullbody.png"),
    shark: path.join(__dirname, "../../assets/ranks/legendary/legendary_shark.png"),
    snake: path.join(__dirname, "../../assets/ranks/legendary/legendary_snake.png"),
  };

  // 1. Check legendary PNG badge assets
  if (key && petKeyMap[key] && fs.existsSync(petKeyMap[key])) {
    return await getCachedImage(petKeyMap[key]);
  }

  // 2. Check Discord custom emoji (<:name:id> or <a:name:id>)
  if (emoji && (emoji.includes("<:") || emoji.includes("<a:"))) {
    const discordImg = await getEmojiImage(emoji);
    if (discordImg) return discordImg;
  }

  // 3. Render Unicode emoji or fallback text on a 74x74 Canvas
  if (emoji) {
    if (emojiCache.has(emoji)) {
      return emojiCache.get(emoji);
    }
    try {
      const c = createCanvas(74, 74);
      const ctx = c.getContext("2d");
      ctx.font = '50px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, 37, 37);
      emojiCache.set(emoji, c);
      return c;
    } catch (err) {
      console.error(`Failed to create canvas for emoji ${emoji}:`, err);
    }
  }

  return null;
}

/**
 * Load transparent character sprite asset (resolves skins and base class assets).
 */
async function getTransparentCharacter(userOrAsset) {
  if (!userOrAsset) return null;
  let filePath = null;

  if (typeof userOrAsset === "object" && userOrAsset.rpg) {
    filePath = getCharacterAssetPath(userOrAsset);
  } else if (typeof userOrAsset === "string") {
    if (fs.existsSync(userOrAsset)) {
      filePath = userOrAsset;
    } else {
      filePath = path.join(__dirname, "../../assets/characters", userOrAsset);
    }
  }

  return await getCachedImage(filePath);
}

class BattleCanvas {
  /**
   * Render ultra-fast PvP Battle Frame with Equipped Pets in top corner square boxes.
   */
  static async renderPvPImage(
    p1AssetOrUser, p2AssetOrUser,
    p1Hp, p1MaxHp, p1Rage, p1Pet, p1Effects,
    p2Hp, p2MaxHp, p2Rage, p2Pet, p2Effects,
    resultStatus
  ) {
    const width = 1024;
    const height = 535;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // 1. Draw Background Template
    const bgPath = path.join(__dirname, "../../assets/backgrounds/battle_template.png");
    const bg = await getCachedImage(bgPath);
    if (bg) {
      ctx.drawImage(bg, 0, 0, width, height);
    } else {
      ctx.fillStyle = "#1e1f22";
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Pre-load all character and pet images in parallel
    const [img1, img2, p1PetImg, p2PetImg] = await Promise.all([
      getTransparentCharacter(p1AssetOrUser),
      getTransparentCharacter(p2AssetOrUser),
      getPetCanvasImage(p1Pet),
      getPetCanvasImage(p2Pet),
    ]);

    // 3. Draw Player 1 Character Sprite
    if (img1) {
      ctx.save();
      ctx.rect(73 + 4, 136 + 4, 212 - 8, 354 - 8);
      ctx.clip();
      ctx.translate(73 + 212 / 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img1, -120, 240, 240, 240);
      ctx.restore();
    }

    // 4. Draw Player 2 Character Sprite
    if (img2) {
      ctx.save();
      ctx.rect(735 + 4, 136 + 4, 211 - 8, 354 - 8);
      ctx.clip();
      ctx.drawImage(img2, 735 + (211 - 240) / 2, 240, 240, 240);
      ctx.restore();
    }

    // 5. Draw Equipped Pets in the top corner square boxes
    if (p1PetImg) {
      ctx.drawImage(p1PetImg, 27 + (94 - 74) / 2, 22 + (95 - 74) / 2, 74, 74);
    }
    if (p2PetImg) {
      ctx.drawImage(p2PetImg, 903 + (94 - 74) / 2, 22 + (95 - 74) / 2, 74, 74);
    }

    // 6. Draw HP and Rage Bars (Player 1)
    ctx.fillStyle = "rgb(30,31,35)";
    ctx.fillRect(142, 44, 276, 20);
    const hp1Ratio = Math.max(0, Math.min(1, p1Hp / p1MaxHp));
    if (hp1Ratio > 0) {
      ctx.fillStyle = "rgb(203,63,69)";
      ctx.fillRect(142, 44, Math.floor(276 * hp1Ratio), 20);
    }

    ctx.fillStyle = "rgb(30,31,35)";
    ctx.fillRect(142, 76, 276, 20);
    const rage1Ratio = Math.max(0, Math.min(1, p1Rage / 100));
    if (rage1Ratio > 0) {
      ctx.fillStyle = "rgb(68,144,209)";
      ctx.fillRect(142, 76, Math.floor(276 * rage1Ratio), 20);
    }

    // 7. Draw HP and Rage Bars (Player 2)
    ctx.fillStyle = "rgb(30,31,35)";
    ctx.fillRect(606, 44, 276, 20);
    const hp2Ratio = Math.max(0, Math.min(1, p2Hp / p2MaxHp));
    if (hp2Ratio > 0) {
      ctx.fillStyle = "rgb(203,63,69)";
      ctx.fillRect(606 + (276 - Math.floor(276 * hp2Ratio)), 44, Math.floor(276 * hp2Ratio), 20);
    }

    ctx.fillStyle = "rgb(30,31,35)";
    ctx.fillRect(606, 76, 276, 20);
    const rage2Ratio = Math.max(0, Math.min(1, p2Rage / 100));
    if (rage2Ratio > 0) {
      ctx.fillStyle = "rgb(68,144,209)";
      ctx.fillRect(606 + (276 - Math.floor(276 * rage2Ratio)), 76, Math.floor(276 * rage2Ratio), 20);
    }

    // 8. Render HP and Rage Text Numbers over bars
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Player 1 HP & Rage text
    ctx.fillText(`${Math.max(0, Math.floor(p1Hp))}/${Math.floor(p1MaxHp)}`, 142 + 138, 44 + 10);
    ctx.fillText(`${Math.floor(p1Rage || 0)}% Nộ`, 142 + 138, 76 + 10);

    // Player 2 HP & Rage text
    ctx.fillText(`${Math.max(0, Math.floor(p2Hp))}/${Math.floor(p2MaxHp)}`, 606 + 138, 44 + 10);
    ctx.fillText(`${Math.floor(p2Rage || 0)}% Nộ`, 606 + 138, 76 + 10);

    // 9. Draw Status Overlay (KO / TIMEOUT) if final frame
    if (resultStatus === "ko") {
      const koPath = path.join(__dirname, "../../assets/backgrounds/ko_stamp.png");
      const koImg = await getCachedImage(koPath);
      if (koImg) {
        ctx.drawImage(koImg, (width - 320) / 2, (height - 180) / 2, 320, 180);
      }
    }

    return {
      buffer: canvas.toBuffer("image/png"),
      name: `battle_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.png`,
    };
  }
}

module.exports = BattleCanvas;
