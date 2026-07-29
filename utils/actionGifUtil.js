const axios = require('axios');

// Fallback high-quality GIFs with consistent 16:9 / 4:3 anime aspect ratio in case API is slow
const fallbackGifs = {
  slap: [
    "https://nekos.best/api/v2/slap/d87df204-40e7-44d1-8b9f-3f7976686f12.gif",
    "https://nekos.best/api/v2/slap/170b6d2e-0ee8-4a6c-9a42-70b985474f82.gif",
    "https://nekos.best/api/v2/slap/080512cf-b593-4a15-b04e-2db24c16183e.gif",
    "https://nekos.best/api/v2/slap/7027bc30-fbf9-450f-a39c-70bf8dc115a3.gif",
    "https://nekos.best/api/v2/slap/4a686616-d336-4144-8848-f58444a7f05b.gif"
  ],
  hug: [
    "https://nekos.best/api/v2/hug/0002.gif",
    "https://nekos.best/api/v2/hug/0010.gif",
    "https://nekos.best/api/v2/hug/0015.gif",
    "https://nekos.best/api/v2/hug/0020.gif"
  ],
  kiss: [
    "https://nekos.best/api/v2/kiss/0005.gif",
    "https://nekos.best/api/v2/kiss/0012.gif",
    "https://nekos.best/api/v2/kiss/0018.gif"
  ],
  punch: [
    "https://nekos.best/api/v2/punch/0003.gif",
    "https://nekos.best/api/v2/punch/0009.gif",
    "https://nekos.best/api/v2/punch/0015.gif"
  ],
  bully: [
    "https://api.waifu.pics/sfw/bully",
    "https://nekos.best/api/v2/pat/0005.gif"
  ],
  curse: [
    "https://nekos.best/api/v2/shoot/0005.gif",
    "https://nekos.best/api/v2/bored/0002.gif"
  ]
};

/**
 * Get a high-quality GIF URL for action commands (slap, hug, kiss, punch, etc.)
 * Uses nekos.best / waifu.pics API with fallback
 * @param {string} action - Action name (slap, hug, kiss, punch, bully, curse)
 * @returns {Promise<string>} GIF URL
 */
async function getActionGif(action) {
  const category = action.toLowerCase();
  
  // Try nekos.best API first (fast Cloudflare CDN)
  try {
    const res = await axios.get(`https://nekos.best/api/v2/${category}`, { timeout: 2500 });
    if (res.data?.results?.[0]?.url) {
      return res.data.results[0].url;
    }
  } catch (_) {}

  // Try waifu.pics API as second choice
  try {
    const res = await axios.get(`https://api.waifu.pics/sfw/${category}`, { timeout: 2500 });
    if (res.data?.url) {
      return res.data.url;
    }
  } catch (_) {}

  // Fallback to pre-cached working links
  const fallbacks = fallbackGifs[category] || fallbackGifs.slap;
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

module.exports = { getActionGif };
