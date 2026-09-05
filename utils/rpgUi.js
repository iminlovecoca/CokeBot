const config = require("../data/config");

const ui = config.rpg?.ui || {};
const colors = ui.colors || {};

const getRpgColor = (colorKey, fallback = colors.brand || "#5865F2") => {
  if (colors[colorKey]) return colors[colorKey];
  if (typeof colorKey === "string" && /^#[0-9a-f]{6}$/i.test(colorKey)) return colorKey;
  return fallback;
};

const getRpgColorNumber = (colorKey, fallback = colors.brand || "#5865F2") => {
  if (typeof colorKey === "number" && Number.isFinite(colorKey)) return colorKey;
  if (Array.isArray(colorKey) && colorKey.length === 3) return colorKey;
  const color = getRpgColor(colorKey, fallback);
  if (typeof color === "number" && Number.isFinite(color)) return color;
  if (Array.isArray(color) && color.length === 3) return color;
  if (typeof color === "string" && /^#?[0-9a-f]{6}$/i.test(color)) {
    return parseInt(color.replace(/^#/, ""), 16);
  }
  return 0x5865F2;
};

const getClassEmoji = (classKey) =>
  ui.classEmojis?.[String(classKey || "").toLowerCase()] || ui.icons?.rpg || "⚔️";

const resolveUiKey = (collection, value) => {
  const rawValue = String(value || "").trim();
  if (!rawValue || !collection) return null;
  if (Object.prototype.hasOwnProperty.call(collection, rawValue)) return rawValue;
  const normalizedValue = rawValue.toLowerCase();
  return Object.keys(collection).find((key) => key.toLowerCase() === normalizedValue) || null;
};

const getRarityEmoji = (rarity) => {
  const key = resolveUiKey(ui.rarityEmojis, rarity);
  return key ? ui.rarityEmojis[key] : "";
};

const getRarityColor = (rarity, fallback = colors.brand || "#5865F2") => {
  const key = resolveUiKey(ui.rarityColors, rarity);
  return key ? ui.rarityColors[key] : fallback;
};

const getSlotEmoji = (slot) => {
  const key = resolveUiKey(ui.slotEmojis, slot);
  return (key ? ui.slotEmojis[key] : null) || ui.icons?.gear || "🛡️";
};

const getSlotLabel = (slot) => {
  const key = resolveUiKey(ui.slotNames, slot);
  return (key ? ui.slotNames[key] : null) || "Trang bị";
};

const getStatLabel = (stat) => {
  const key = resolveUiKey(ui.statNames, stat);
  return (key ? ui.statNames[key] : null) || String(stat || "").toUpperCase();
};

const getStatusEmoji = (statusKey) => {
  const statusEmojis = config.emoji?.status;
  const key = resolveUiKey(statusEmojis, statusKey);
  return key ? statusEmojis[key] : "";
};

const formatRpgBar = (value, max = 100, length = 10) => {
  const safeMax = Math.max(1, Number(max) || 1);
  const ratio = Math.max(0, Math.min(1, (Number(value) || 0) / safeMax));
  const filled = Math.round(ratio * length);
  return `${"▰".repeat(filled)}${"▱".repeat(length - filled)}`;
};

const DEFAULT_UI_ICONS = new Set([
  "⚔️", "🛡️", "🗡️", "🏹", "🎴", "⚙️", "🏆", "👥", "🐾", "📊", "📈", "📦",
  "🔎", "🧙", "✨", "🌌", "🔨", "💎", "✅", "❌", "⚠️", "❤️", "💠", "🧰",
  "🔮", "🪵", "🗺️", "🪙", "⏱️", "⏳", "🔧", "📡", "💀", "🥀", "🎉", "💰", "🤝",
  "🔒", "👤", "🚫",
]);
const formatRpgTitle = (title, icon = "") => {
  const iconText = String(icon || "").trim();
  if (!iconText || DEFAULT_UI_ICONS.has(iconText)) return title;
  return `${iconText} ${title}`;
};

const formatRpgFooter = (text) => ({
  text: text || "CokeBot RPG",
});

const formatRpgStatLine = (stat, value, suffix = "") =>
  `${getStatLabel(stat)} **${Number(value) || 0}${suffix}**`;

const isExpiredInteractionError = (error) => {
  const code = error?.code || error?.rawError?.code;
  const message = String(error?.message || "").toLowerCase();
  return code === 10062 || code === 40060 ||
    message.includes("unknown interaction") ||
    message.includes("already acknowledged");
};

const safeInteractionCall = async (interaction, method, ...args) => {
  if (!interaction || typeof interaction[method] !== "function") return false;
  try {
    await interaction[method](...args);
    return true;
  } catch (error) {
    if (!isExpiredInteractionError(error)) {
      console.error(`[RPG UI] ${method} failed:`, error);
    }
    return false;
  }
};

const safeDeferUpdate = async (interaction) => {
  if (interaction?.deferred || interaction?.replied) return true;
  return safeInteractionCall(interaction, "deferUpdate");
};

const safeInteractionUpdate = (interaction, payload) =>
  safeInteractionCall(interaction, "update", payload);

const safeInteractionReply = (interaction, payload) =>
  safeInteractionCall(interaction, "reply", payload);

const safeInteractionFollowUp = (interaction, payload) =>
  safeInteractionCall(interaction, "followUp", payload);

const safeInteractionEditReply = (interaction, payload) =>
  safeInteractionCall(interaction, "editReply", payload);

module.exports = {
  ui,
  colors,
  getRpgColor,
  getRpgColorNumber,
  getClassEmoji,
  getRarityEmoji,
  getRarityColor,
  getSlotEmoji,
  getSlotLabel,
  getStatLabel,
  getStatusEmoji,
  formatRpgBar,
  formatRpgTitle,
  formatRpgFooter,
  formatRpgStatLine,
  isExpiredInteractionError,
  safeInteractionCall,
  safeDeferUpdate,
  safeInteractionUpdate,
  safeInteractionReply,
  safeInteractionFollowUp,
  safeInteractionEditReply,
};
