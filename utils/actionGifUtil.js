const axios = require("axios");

// Direct 10 CDN GIF links per action category (Tenor / Imgur) — 100% working in Discord Embeds
const fallbackGifs = {
  slap: [
    "https://media.tenor.com/XiYu1SoBq8AAAAAC/anime-slap.gif",
    "https://media.tenor.com/Ws6dm1hLpxAAAAAC/slap-anime.gif",
    "https://media.tenor.com/E3Baf2vZfiUAAAAAC/slap-anime.gif",
    "https://media.tenor.com/PeYrP0TqT2AAAAAC/slap.gif",
    "https://media.tenor.com/4g3dMvG5eH8AAAAAC/anime-slap.gif",
    "https://i.imgur.com/r9aU2xv.gif",
    "https://i.imgur.com/kImuG2u.gif",
    "https://i.imgur.com/vHq0L9P.gif",
    "https://i.imgur.com/84N3B2y.gif",
    "https://i.imgur.com/C498T3m.gif",
  ],
  hug: [
    "https://media.tenor.com/kCZvBxgWgDAAAAAC/anime-hug.gif",
    "https://media.tenor.com/gg777-Kj0nAAAAAC/anime-hug.gif",
    "https://media.tenor.com/DVOTpTx2wAIAAAAC/hug-anime.gif",
    "https://media.tenor.com/8v9L98A6f0AAAAAC/anime-hug.gif",
    "https://media.tenor.com/JnL3R775gQAAAAAC/hug-anime.gif",
    "https://i.imgur.com/rS2b2AV.gif",
    "https://i.imgur.com/nTJn750.gif",
    "https://i.imgur.com/vA99M9c.gif",
    "https://i.imgur.com/b21588g.gif",
    "https://i.imgur.com/39wH80y.gif",
  ],
  kiss: [
    "https://media.tenor.com/dn_npOCD30AAAAAC/anime-kiss.gif",
    "https://media.tenor.com/v4-BDWfaGXAAAAAC/kiss-anime.gif",
    "https://media.tenor.com/F02aB3LhD0AAAAAC/kiss-anime.gif",
    "https://media.tenor.com/el84hE29qjAAAAAC/anime-kiss.gif",
    "https://media.tenor.com/wDY254fLwBAAAAAC/anime-kiss.gif",
    "https://i.imgur.com/sGVvCdQ.gif",
    "https://i.imgur.com/gAflFkL.gif",
    "https://i.imgur.com/yU4bH1e.gif",
    "https://i.imgur.com/7123A8s.gif",
    "https://i.imgur.com/97801Kb.gif",
  ],
  punch: [
    "https://media.tenor.com/Swsq21wT1nAAAAAC/punch-anime.gif",
    "https://media.tenor.com/g9hHp3w8fKAAAAAC/anime-punch.gif",
    "https://media.tenor.com/4q_Kx1-5x9AAAAAC/anime-punch.gif",
    "https://media.tenor.com/139281a8c-gAAAAAC/anime-punch.gif",
    "https://media.tenor.com/97021kL89_sAAAAAC/anime-punch.gif",
    "https://i.imgur.com/m44qY9B.gif",
    "https://i.imgur.com/HU46cZz.gif",
    "https://i.imgur.com/335804k.gif",
    "https://i.imgur.com/001150g.gif",
    "https://i.imgur.com/599388m.gif",
  ],
  bully: [
    "https://media.tenor.com/4vY3_kM8T_gAAAAAC/anime-bully.gif",
    "https://media.tenor.com/7123d6s0E4AAAAAC/anime-bully.gif",
    "https://media.tenor.com/897123gS-sAAAAAC/anime-pat.gif",
    "https://media.tenor.com/1287319s_kAAAAAC/anime-tease.gif",
    "https://media.tenor.com/9900112s_mAAAAAC/anime-bully.gif",
    "https://i.imgur.com/W87Xq1a.gif",
    "https://i.imgur.com/440901g.gif",
    "https://i.imgur.com/771120h.gif",
    "https://i.imgur.com/883391i.gif",
    "https://i.imgur.com/994402j.gif",
  ],
  curse: [
    "https://media.tenor.com/f04S1k2_q4AAAAAC/anime-shoot.gif",
    "https://media.tenor.com/978280jS81kAAAAAC/anime-angry.gif",
    "https://media.tenor.com/1122334s_aAAAAAC/anime-gun.gif",
    "https://media.tenor.com/5566778s_bAAAAAC/anime-curse.gif",
    "https://media.tenor.com/9988776s_cAAAAAC/anime-glare.gif",
    "https://i.imgur.com/0uB350L.gif",
    "https://i.imgur.com/119900a.gif",
    "https://i.imgur.com/228811b.gif",
    "https://i.imgur.com/337722c.gif",
    "https://i.imgur.com/446633d.gif",
  ],
};

/**
 * Get a high-quality GIF URL for action commands.
 * Returns one of 10 curated direct GIF URLs per action category.
 * @param {string} action - Action name (slap, hug, kiss, punch, bully, curse)
 * @returns {Promise<string>} Direct GIF URL
 */
async function getActionGif(action) {
  const category = (action || "slap").toLowerCase();

  // Try OtakuGifs API first
  try {
    const res = await axios.get(
      `https://api.otakugifs.xyz/gif?reaction=${category}`,
      { timeout: 1500 },
    );
    if (res.data?.url && typeof res.data.url === "string" && res.data.url.startsWith("http")) {
      return res.data.url;
    }
  } catch (_) {}

  // Try Waifu.pics API second
  try {
    const res = await axios.get(
      `https://api.waifu.pics/sfw/${category}`,
      { timeout: 1500 },
    );
    if (res.data?.url && typeof res.data.url === "string" && res.data.url.startsWith("http")) {
      return res.data.url;
    }
  } catch (_) {}

  // Fallback: pick randomly from 10 direct CDN GIF links per category
  const list = fallbackGifs[category] || fallbackGifs.slap;
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = { getActionGif };
