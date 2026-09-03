const { UserFriendlyError } = require("./errors");
const { getGearDisplayName, getItemImageFile } = require("./rpgUtil");
const { getWeaponEvolution, getEvolutionBranch } = require("../data/rpg/weaponEvolutions");

const evolveRpgWeapon = (item, branchKey) => {
  const recipe = getWeaponEvolution(item?.subType || item?.subtype);
  if (!recipe) {
    throw new UserFriendlyError("❌ Vũ khí này không có nhánh tiến hóa.");
  }

  const branch = getEvolutionBranch(recipe, branchKey);
  if (!branch) {
    throw new UserFriendlyError("❌ Không xác định được nhánh tiến hóa vũ khí.");
  }

  const currentUpgradeLevel = Number(item.upgradeLevel || 0);
  if (currentUpgradeLevel !== recipe.requiredUpgradeLevel) {
    throw new UserFriendlyError(
      `❌ Búa Rèn phải ở đúng **+${recipe.requiredUpgradeLevel}** để tiến hóa, tránh mất cấp cường hóa.`
    );
  }
  const evolvedItem = {
    ...item,
    subType: branch.name,
    emoji: branch.emoji,
    imageKey: getItemImageFile({ ...item, subType: branch.name }),
    scaling: { ...branch.scaling },
    upgradeLevel: currentUpgradeLevel,
    evolutionPath: branch.key,
  };
  evolvedItem.name = getGearDisplayName(evolvedItem);

  return { item: evolvedItem, recipe, branch };
};

module.exports = {
  evolveRpgWeapon,
};
