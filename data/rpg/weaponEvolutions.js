const normalizeWeaponKey = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/đ/g, "d")
  .replace(/Đ/g, "D")
  .toLowerCase()
  .replace(/\s+/g, "");

const WEAPON_EVOLUTIONS = {
  warhammer: {
    key: "warhammer",
    name: "Búa Rèn",
    aliases: ["warhammer", "búa rèn"],
    requiredUpgradeLevel: 10,
    cokeCost: 250000,
    stoneId: "somber-9",
    stoneQuantity: 1,
    branches: {
      thorshammer: {
        key: "thorshammer",
        name: "Búa Lôi Thần Thor",
        emoji: "⚡",
        style: "Thiên vật lý + ARC",
        description: "STR (S) + ARC (A), DEX (B); 45% cơ hội làm choáng mục tiêu trong 1 lượt.",
        scaling: { str: "S", dex: "B", int: "-", arc: "A" },
      },
      odinhammer: {
        key: "odinhammer",
        name: "Búa Toàn Tri Odin",
        emoji: "🦉",
        style: "Thiên phép + ARC",
        description: "INT (S) + ARC (A), STR (B); đòn đánh thứ 3 gây 1.7x sát thương trong Dungeon.",
        scaling: { str: "B", dex: "-", int: "S", arc: "A" },
      },
    },
  },
};

const getWeaponEvolution = (subType) => {
  const clean = normalizeWeaponKey(subType);
  return Object.values(WEAPON_EVOLUTIONS).find((recipe) =>
    [recipe.key, recipe.name, ...(recipe.aliases || [])]
      .some((value) => normalizeWeaponKey(value) === clean)
  ) || null;
};

const getEvolutionBranch = (recipeOrKey, branchKey) => {
  const recipe = typeof recipeOrKey === "string"
    ? WEAPON_EVOLUTIONS[normalizeWeaponKey(recipeOrKey)]
    : recipeOrKey;
  const cleanBranchKey = normalizeWeaponKey(branchKey);
  return recipe?.branches?.[cleanBranchKey] || null;
};

module.exports = {
  WEAPON_EVOLUTIONS,
  normalizeWeaponKey,
  getWeaponEvolution,
  getEvolutionBranch,
};
