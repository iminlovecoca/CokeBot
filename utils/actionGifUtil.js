const axios = require("axios");

// High-quality direct CDN GIF links (Tenor / Imgur) that Discord proxy will never block (403)
const fallbackGifs = {
  slap: [
    "https://media.tenor.com/XiYu1SoBq8AAAAAC/anime-slap.gif",
    "https://media.tenor.com/Ws6dm1hLpxAAAAAC/slap-anime.gif",
    "https://media.tenor.com/E3Baf2vZfiUAAAAAC/slap-anime.gif",
    "https://i.imgur.com/r9aU2xv.gif",
    "https://i.imgur.com/kImuG2u.gif",
  ],
  hug: [
    "https://media.tenor.com/kCZvBxgWgDAAAAAC/anime-hug.gif",
    "https://media.tenor.com/gg777-Kj0nAAAAAC/anime-hug.gif",
    "https://media.tenor.com/DVOTpTx2wAIAAAAC/hug-anime.gif",
    "https://i.imgur.com/rS2b2AV.gif",
    "https://i.imgur.com/nTJn750.gif",
  ],
  kiss: [
    "https://media.tenor.com/dn_npOCD30AAAAAC/anime-kiss.gif",
    "https://media.tenor.com/v4-BDWfaGXAAAAAC/kiss-anime.gif",
    "https://media.tenor.com/F02aB3LhD0AAAAAC/kiss-anime.gif",
    "https://i.imgur.com/sGVvCdQ.gif",
    "https://i.imgur.com/gAflFkL.gif",
  ],
  punch: [
    "https://media.tenor.com/Swsq21wT1nAAAAAC/punch-anime.gif",
    "https://media.tenor.com/g9hHp3w8fKAAAAAC/anime-punch.gif",
    "https://media.tenor.com/4q_Kx1-5x9AAAAAC/anime-punch.gif",
    "https://i.imgur.com/m44qY9B.gif",
    "https://i.imgur.com/HU46cZz.gif",
  ],
  bully: [
    "https://media.tenor.com/4vY3_kM8T_gAAAAAC/anime-bully.gif",
    "https://media.tenor.com/7123d6s0E4AAAAAC/anime-bully.gif",
    "https://i.imgur.com/W87Xq1a.gif",
  ],
  curse: [
    "https://media.tenor.com/f04S1k2_q4AAAAAC/anime-shoot.gif",
    "https://media.tenor.com/978280jS81kAAAAAC/anime-angry.gif",
    "https://i.imgur.com/0uB350L.gif",
  ],
};

/**
 * Get a high-quality, working GIF URL for action commands (slap, hug, kiss, punch, etc.)
 * Uses OtakuGifs / Waifu.pics API with reliable Tenor/Imgur fallback.
 * @param {string} action - Action name (slap, hug, kiss, punch, bully, curse)
 * @returns {Promise<string>} Direct GIF URL
 */
async function getActionGif(action) {
  const category = (action || "slap").toLowerCase();

  // Try OtakuGifs API first
  try {
    const res = await axios.get(
      `https://api.otakugifs.xyz/gif?reaction=${category}`,
      { timeout: 2000 },
    );
    if (res.data?.url && typeof res.data.url === "string" && res.data.url.startsWith("http")) {
      return res.data.url;
    }
  } catch (_) {}

  // Try waifu.pics API second
  try {
    const res = await axios.get(
      `https://api.waifu.pics/sfw/${category}`,
      { timeout: 2000 },
    );
    if (res.data?.url && typeof res.data.url === "string" && res.data.url.startsWith("http")) {
      return res.data.url;
    }
  } catch (_) {}

  // Fallback to pre-cached working Tenor / Imgur direct image links
  const fallbacks = fallbackGifs[category] || fallbackGifs.slap;
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

module.exports = { getActionGif };
