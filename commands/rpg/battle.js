const BaseCommand = require("../../core/BaseCommand");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const config = require("../../data/config");
const User = require("../../models/User");
const { getUser } = require("../../utils/userUtil");
const { checkAndSetCooldown, notifyCooldown } = require("../../utils/cooldown");
const {
  addRpgExp,
  calculateRpgPower,
  getEffectiveRpgStats,
  getRpgClass,
  requireRpgCharacter,
  getRpgXpNeeded,
  getEquippedItems,
  dungeonKeys,
  getCharacterAssetPath,
  getItemImageFile,
  getEquippedPetBonuses,
  addPetExp,
} = require("../../utils/rpgUtil");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

const CLASS_ATTACK_TYPES = {
  warrior: "physical",
  archer: "physical",
  mage: "magical",
  assassin: "physical",
  paladin: "physical",
  wretch: "physical",
};

const imageCache = new Map();
const usernameCache = new Map();

const getCachedImage = async (imagePath) => {
  if (imageCache.has(imagePath)) {
    return imageCache.get(imagePath);
  }
  if (fs.existsSync(imagePath)) {
    const img = await loadImage(imagePath);
    imageCache.set(imagePath, img);
    return img;
  }
  return null;
};

const transparentCharCache = new Map();

const getTransparentCharacter = async (pAsset) => {
  if (transparentCharCache.has(pAsset)) {
    return transparentCharCache.get(pAsset);
  }

  const pImgPath = getCharacterAssetPath(pAsset);
  if (!fs.existsSync(pImgPath)) {
    return null;
  }

  const img = await loadImage(pImgPath);
  const width = 200;
  const height = 200;
  const tempCanvas = createCanvas(width, height);
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(img, 0, 0, width, height);

  transparentCharCache.set(pAsset, tempCanvas);
  return tempCanvas;
};


const preloadAssets = async () => {
  try {
    const bgPath = path.join(__dirname, "../../assets/backgrounds/battlebg.png");
    await getCachedImage(bgPath);

    const charactersDir = path.join(__dirname, "../../assets/characters");
    if (fs.existsSync(charactersDir)) {
      const files = fs.readdirSync(charactersDir);
      for (const file of files) {
        if (file.endsWith(".png")) {
          await getTransparentCharacter(file);
        }
      }
    }
  } catch (error) {
    console.error("[Battle] Failed to preload assets:", error);
  }
};
preloadAssets();

const transparentAssetCache = new Map();

const getTransparentAsset = async (imagePath, filterFn) => {
  if (transparentAssetCache.has(imagePath)) {
    return transparentAssetCache.get(imagePath);
  }
  const img = await getCachedImage(imagePath);
  if (!img) return null;

  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    const a = data[i+3];
    if (filterFn(r, g, b, a)) {
      data[i+3] = 0; // Make transparent
    }
  }

  ctx.putImageData(imgData, 0, 0);
  transparentAssetCache.set(imagePath, canvas);
  return canvas;
};

const emojiCanvasCache = new Map();

const getEmojiImage = async (emojiStr) => {
  if (emojiCanvasCache.has(emojiStr)) {
    return emojiCanvasCache.get(emojiStr);
  }
  const match = emojiStr.match(/:(\d+)>/);
  if (!match) return null;
  const emojiId = match[1];
  const url = `https://cdn.discordapp.com/emojis/${emojiId}.png`;
  try {
    const img = await loadImage(url);
    emojiCanvasCache.set(emojiStr, img);
    return img;
  } catch (err) {
    console.error(`Failed to load emoji image from ${url}:`, err);
    return null;
  }
};

const generatePvPImage = async (
  p1Asset, p2Asset,
  p1Hp, p1MaxHp, p1Rage, p1Weapon, p1Effects,
  p2Hp, p2MaxHp, p2Rage, p2Weapon, p2Effects,
  resultStatus
) => {
  const width = 1024;
  const height = 535;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Load Background template
  const bgPath = path.join(__dirname, "../../assets/backgrounds/battle_template.png");
  const bg = await getCachedImage(bgPath);
  if (bg) {
    ctx.drawImage(bg, 0, 0, width, height);
  } else {
    ctx.fillStyle = "#1e1f22";
    ctx.fillRect(0, 0, width, height);
  }

  // Helper to check if asset faces right by default (e.g. GIF skins like WarriorMecha)
  const facesRightByDefault = (assetName) => {
    if (!assetName) return false;
    const lower = assetName.toLowerCase();
    return lower.endsWith(".gif") || lower.includes("mecha");
  };

  // Load character images
  const img1 = await getTransparentCharacter(p1Asset);
  if (img1) {
    ctx.save();
    // Clip to Left Frame (wooden border)
    ctx.rect(73 + 4, 136 + 4, 212 - 8, 354 - 8);
    ctx.clip();
    if (facesRightByDefault(p1Asset)) {
      // Already faces right naturally, draw without flipping
      ctx.drawImage(img1, 73 + (212 - 240) / 2, 240, 240, 240);
    } else {
      // Native left-facing image, mirror it to face right
      ctx.translate(73 + 212 / 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img1, -120, 240, 240, 240);
    }
    ctx.restore();
  }

  const img2 = await getTransparentCharacter(p2Asset);
  if (img2) {
    ctx.save();
    // Clip to Right Frame
    ctx.rect(735 + 4, 136 + 4, 211 - 8, 354 - 8);
    ctx.clip();
    if (facesRightByDefault(p2Asset)) {
      // Native right-facing image, mirror it to face left towards Player 1
      ctx.translate(735 + 211 / 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img2, -120, 240, 240, 240);
    } else {
      // Already faces left naturally, draw without flipping
      ctx.drawImage(img2, 735 + (211 - 240) / 2, 240, 240, 240);
    }
    ctx.restore();
  }

  // Load and Draw Weapons
  const getWeaponPath = (weapon) => {
    if (!weapon) return null;
    const key = weapon.imageKey || getItemImageFile(weapon);
    return key ? path.join(__dirname, "../../assets/items", key) : null;
  };

  const w1Path = getWeaponPath(p1Weapon);
  if (w1Path && fs.existsSync(w1Path)) {
    const w1Img = await getCachedImage(w1Path);
    if (w1Img) {
      ctx.drawImage(w1Img, 27 + (94 - 74) / 2, 22 + (95 - 74) / 2, 74, 74);
    }
  }

  const w2Path = getWeaponPath(p2Weapon);
  if (w2Path && fs.existsSync(w2Path)) {
    const w2Img = await getCachedImage(w2Path);
    if (w2Img) {
      ctx.drawImage(w2Img, 903 + (94 - 74) / 2, 22 + (95 - 74) / 2, 74, 74);
    }
  }

  // Draw HP and Rage Bars (Left Side) - Left to Right
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

  // Draw HP and Rage Bars (Right Side) - Right to Left
  ctx.fillStyle = "rgb(30,31,35)";
  ctx.fillRect(606, 44, 276, 20);
  const hp2Ratio = Math.max(0, Math.min(1, p2Hp / p2MaxHp));
  if (hp2Ratio > 0) {
    ctx.fillStyle = "rgb(203,63,69)";
    const fillWidth = Math.floor(276 * hp2Ratio);
    ctx.fillRect(882 - fillWidth, 44, fillWidth, 20);
  }

  ctx.fillStyle = "rgb(30,31,35)";
  ctx.fillRect(606, 76, 276, 20);
  const rage2Ratio = Math.max(0, Math.min(1, p2Rage / 100));
  if (rage2Ratio > 0) {
    ctx.fillStyle = "rgb(68,144,209)";
    const fillWidth = Math.floor(276 * rage2Ratio);
    ctx.fillRect(882 - fillWidth, 76, fillWidth, 20);
  }

  // Draw Text Overlays
  ctx.font = "bold 18px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(`${Math.max(0, Math.floor(p1Hp))}/${p1MaxHp}`, 142 + 276 / 2, 44 + 10);
  ctx.fillText(`${Math.floor(p1Rage)}% Nộ`, 142 + 276 / 2, 76 + 10);

  ctx.fillText(`${Math.max(0, Math.floor(p2Hp))}/${p2MaxHp}`, 606 + 276 / 2, 44 + 10);
  ctx.fillText(`${Math.floor(p2Rage)}% Nộ`, 606 + 276 / 2, 76 + 10);

  // Draw active passive emojis on the Canvas inside the empty spaces (y = 103)
  const drawEmojiList = async (effects, xStart) => {
    if (!effects) return;
    const emojis = [];
    if (effects.bleedRounds > 0) emojis.push("<:bleed:1521938497642958889>");
    if (effects.healReduced) emojis.push("<:healreduction:1523340558855045190>");
    if (effects.armorReduced > 0) emojis.push("<:break:1521938480337391736>");
    if (effects.armorBoosted > 0) emojis.push("<:atkup:1521938477359300648>");

    let currentX = xStart;
    for (const em of emojis) {
      const emImg = await getEmojiImage(em);
      if (emImg) {
        ctx.drawImage(emImg, currentX, 103, 24, 24);
        currentX += 30; // spacing
      }
    }
  };

  await drawEmojiList(p1Effects, 142);
  await drawEmojiList(p2Effects, 606);

  // Draw K.O. or Time Out Overlay (with black background removed and scaled down to 60%)
  if (resultStatus === "ko") {
    const koPath = path.join(__dirname, "../../assets/backgrounds/ko.png");
    if (fs.existsSync(koPath)) {
      const koImg = await getTransparentAsset(koPath, (r, g, b) => r < 40 && g < 40 && b < 40);
      if (koImg) {
        ctx.drawImage(koImg, (1024 - 346) / 2, (535 - 205) / 2, 346, 205);
      }
    }
  } else if (resultStatus === "timeout") {
    const toPath = path.join(__dirname, "../../assets/backgrounds/timeout.png");
    if (fs.existsSync(toPath)) {
      const toImg = await getTransparentAsset(toPath, (r, g, b) => r < 40 && g < 40 && b < 40);
      if (toImg) {
        ctx.drawImage(toImg, (1024 - 360) / 2, (535 - 290) / 2, 360, 290);
      }
    }
  }

  const buffer = canvas.toBuffer("image/png");
  const filename = `pvp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
  return { buffer, name: filename };
};

const simulatePvP = (p1, p2) => {
  let turn = 1;
  const maxTurns = 12;
  const logs = [];

  const history = [];

  p1.effects = { 
    armorReduced: 0, 
    healReduced: false, 
    healReducedRounds: 0, 
    bleedRounds: 0, 
    bleedDamage: 0, 
    shieldhexAbsorbed: 0, 
    shieldhexRounds: 0,
    armorBoosted: 0,
    armorBoostedRounds: 0
  };
  p2.effects = { 
    armorReduced: 0, 
    healReduced: false, 
    healReducedRounds: 0, 
    bleedRounds: 0, 
    bleedDamage: 0, 
    shieldhexAbsorbed: 0, 
    shieldhexRounds: 0,
    armorBoosted: 0,
    armorBoostedRounds: 0
  };

  p1.rage = 0;
  p2.rage = 0;

  const saveState = (currentTurn) => {
    history.push({
      turn: currentTurn,
      p1: {
        hp: p1.hp,
        rage: p1.rage,
        effects: { ...p1.effects }
      },
      p2: {
        hp: p2.hp,
        rage: p2.rage,
        effects: { ...p2.effects }
      }
    });
  };

  // Save initial state (Turn 0)
  saveState(0);

  let turnOrder =
    (p1.effectiveStats.dex || 0) > (p2.effectiveStats.dex || 0)
      ? [p1, p2]
      : (p1.effectiveStats.dex || 0) < (p2.effectiveStats.dex || 0)
        ? [p2, p1]
        : Math.random() < 0.5
          ? [p1, p2]
          : [p2, p1];

  while (turn <= maxTurns && p1.hp > 0 && p2.hp > 0) {
    const attacker = turnOrder[0];
    const defender = turnOrder[1];

    // Decrement bleed
    if (attacker.effects.bleedRounds > 0) {
      attacker.hp = Math.max(0, attacker.hp - attacker.effects.bleedDamage);
      attacker.effects.bleedRounds -= 1;
      logs.push(`🩸 **${attacker.name}** bị mất **${attacker.effects.bleedDamage}** HP do chảy máu!`);
      if (attacker.hp <= 0) break;
    }

    // Decrement heal reduce
    if (attacker.effects.healReducedRounds > 0) {
      attacker.effects.healReducedRounds -= 1;
      if (attacker.effects.healReducedRounds <= 0) {
        attacker.effects.healReduced = false;
      }
    }

    // Decrement armor boost
    if (attacker.effects.armorBoostedRounds > 0) {
      attacker.effects.armorBoostedRounds -= 1;
      if (attacker.effects.armorBoostedRounds <= 0) {
        attacker.effects.armorBoosted = 0;
      }
    }

    // Check if casting skill
    const isCastingSkill = attacker.rage >= 100;
    let skillName = "";
    let skillMult = 1.0;
    let skillIgnoreMR = false;
    let skillForceCrit = false;

    if (isCastingSkill) {
      attacker.rage = 0; // Consume rage
      const classKey = attacker.classKey;
      if (classKey === "warrior") {
        skillName = "Đòn Đánh Cuồng Nộ";
        skillMult = 1.5;
        attacker.effects.armorBoosted = 0.25;
        attacker.effects.armorBoostedRounds = 2;
      } else if (classKey === "archer") {
        skillName = "Mưa Tên";
        skillMult = 1.3;
        if (Math.random() < 0.5) {
          defender.effects.bleedRounds = 2;
          defender.effects.bleedDamage = Math.floor(attacker.effectiveStats.dex * 0.3);
        }
      } else if (classKey === "mage") {
        skillName = "Bão Phép Thuật";
        skillMult = 1.8;
        skillIgnoreMR = true;
      } else if (classKey === "assassin") {
        skillName = "Ám Sát";
        skillMult = 1.5;
        skillForceCrit = true;
      } else if (classKey === "paladin") {
        skillName = "Thánh Lực Bảo Hộ";
        skillMult = 1.0;
        const healAmt = Math.floor(attacker.maxHp * 0.15);
        let healReduceFactor = 1.0;
        if (attacker.effects.healReduced) healReduceFactor *= 0.7;
        if (defender.rpgClass?.bonuses?.healReduction) healReduceFactor *= 1 - defender.rpgClass.bonuses.healReduction;
        const finalHealAmt = Math.floor(healAmt * healReduceFactor);
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + finalHealAmt);
      } else if (classKey === "wretch") {
        skillName = "Cú Đập May Rủi";
        skillMult = 0.5 + Math.random() * 1.7;
      }
    }

    const LOCKED_WEAPONS = ["poisondagger", "duskanddawn", "riverofblood", "axesnake", "clawhex", "spearhex", "shieldhex", "darksword", "darkstaff", "holysword"];

    let attackerSubType = attacker.weapon?.subType ? attacker.weapon.subType.toLowerCase().replace(/\s+/g, "") : "";
    if (LOCKED_WEAPONS.includes(attackerSubType)) {
      attackerSubType = "";
    }
    if (attackerSubType.includes("shieldhex") && attacker.effects.shieldhexRounds >= 3) {
      const reflectDmg = Math.floor((attacker.effects.shieldhexAbsorbed || 0) * 0.90);
      defender.hp = Math.max(0, defender.hp - reflectDmg);
      attacker.effects.shieldhexAbsorbed = 0;
      attacker.effects.shieldhexRounds = 0;
      logs.push(`🛡️ **${attacker.name}** phản lại **${reflectDmg}** sát thương phản đòn lên **${defender.name}**!`);
      if (defender.hp <= 0) break;
    }

    const defenderEvasion = Math.min(
      0.15,
      ((defender.effectiveStats.dex || 0) * 0.1 + (defender.effectiveStats.arc || 0) * 0.05) / 100
    );
    const isEvaded = Math.random() < defenderEvasion;

    const attackerWeapon = attacker.weapon;
    let cleanSubType = attackerWeapon?.subType
      ? attackerWeapon.subType.toLowerCase().replace(/\s+/g, "")
      : "";
    if (LOCKED_WEAPONS.includes(cleanSubType)) {
      cleanSubType = "";
    }
    const isDungeonWeapon = dungeonKeys.includes(cleanSubType);

    let axesnakeTriggered = false;
    let sunbowTriggered = false;
    let clawhexTriggered = false;
    let spearhexTriggered = false;
    let shieldhexTriggered = false;
    let riverofbloodTriggered = false;

    const hasTriggered = isDungeonWeapon && Math.random() < 0.45;
    let blueStaffPierce = false;
    let crimsonDaggerPierce = false;
    let holySwordDouble = false;

    if (hasTriggered) {
      if (cleanSubType === "axesnake") {
        axesnakeTriggered = true;
        defender.effects.armorReduced = Math.min(0.9, (defender.effects.armorReduced || 0) + 0.10);
      } else if (cleanSubType === "sunbow") {
        sunbowTriggered = true;
      } else if (cleanSubType === "clawhex") {
        clawhexTriggered = true;
        defender.effects.bleedRounds = 3;
        defender.effects.bleedDamage = Math.floor((attacker.effectiveStats.str || 0) * 0.5 + (attacker.effectiveStats.dex || 0) * 0.5);
      } else if (cleanSubType === "spearhex") {
        spearhexTriggered = true;
      } else if (cleanSubType === "shieldhex") {
        shieldhexTriggered = true;
      } else if (cleanSubType === "riverofblood") {
        riverofbloodTriggered = true;
      } else if (cleanSubType === "shadowdagger") {
        defender.effects.armorReduced = 0.3;
      } else if (cleanSubType === "poisondagger") {
        attacker.nextAttackMult = 1.5;
      } else if (cleanSubType === "firesword") {
        defender.effects.healReduced = true;
        defender.effects.healReducedRounds = 2;
      } else if (cleanSubType === "bluestaff") {
        blueStaffPierce = true;
      } else if (cleanSubType === "crimsondagger") {
        crimsonDaggerPierce = true;
      } else if (cleanSubType === "holysword") {
        attacker.holySwordHits = (attacker.holySwordHits || 0) + 1;
        if (attacker.holySwordHits >= 3) {
          attacker.holySwordHits = 0;
          holySwordDouble = true;
        }
      } else if (cleanSubType === "darksword") {
        defender.effects.damageReduced = 0.3;
      } else if (cleanSubType === "darkstaff") {
        const textEffects = ["burn", "weakness", "pierce"];
        const chosenEffect = textEffects[Math.floor(Math.random() * textEffects.length)];
        if (chosenEffect === "burn") {
          defender.effects.healReduced = true;
          defender.effects.healReducedRounds = 2;
        } else if (chosenEffect === "weakness") {
          defender.effects.damageReduced = 0.3;
        } else {
          defender.effects.armorReduced = 0.3;
        }
      }
    } else if (cleanSubType === "holysword") {
      attacker.holySwordHits = (attacker.holySwordHits || 0) + 1;
      if (attacker.holySwordHits >= 3) {
        attacker.holySwordHits = 0;
      }
    }

    let poisonMult = 1.0;
    if (attacker.nextAttackMult) {
      poisonMult = attacker.nextAttackMult;
      delete attacker.nextAttackMult;
    }

    if (isEvaded) {
      if (isCastingSkill) {
        logs.push(`Lượt ${turn}: **${attacker.name}** dùng kỹ năng [${skillName}] nhưng bị **${defender.name}** né mất!`);
      } else {
        logs.push(`Lượt ${turn}: **${attacker.name}** tấn công nhưng bị **${defender.name}** né mất!`);
      }
    } else {
      let isCrit = false;
      if (skillForceCrit) {
        isCrit = true;
      } else {
        const classCritBonus = attacker.rpgClass.bonuses?.critRate || 0;
        const attackerCritRate = Math.min(
          0.5,
          ((attacker.effectiveStats.arc || 0) * 0.2 + (attacker.effectiveStats.dex || 0) * 0.1) / 100 + classCritBonus
        );
        isCrit = Math.random() < attackerCritRate;
      }
      const critMult = 1.5 + (attacker.effectiveStats.dex || 0) * 0.002;

      const isMagical = CLASS_ATTACK_TYPES[attacker.classKey] === "magical";
      const baseAtk = isMagical
        ? (attacker.effectiveStats.int || 0) * 3.5 + (attacker.effectiveStats.arc || 0) * 1.5
        : (attacker.effectiveStats.str || 0) * 2.5 + (attacker.effectiveStats.dex || 0) * 1.5;

      let rawDamage = baseAtk + attacker.gearPower;
      if (clawhexTriggered) {
        rawDamage *= 1.15;
      }

      rawDamage *= 0.85 + Math.random() * 0.3;
      if (isCastingSkill) {
        rawDamage *= skillMult;
      }
      if (isCrit) {
        rawDamage *= critMult;
      }

      let defenderMitigation = 0;
      if (isMagical) {
        let mr = (defender.effectiveStats.mr || 0) * 12.0 + (defender.defensePower || 0);
        if (blueStaffPierce) mr *= 0.75;
        if (sunbowTriggered) mr *= 0.90;
        if (skillIgnoreMR) mr *= 0.75;
        defenderMitigation = mr / (mr + 1000);
      } else {
        let armor = (defender.effectiveStats.pr || 0) * 12.0 + (defender.defensePower || 0);
        if (defender.effects.armorBoostedRounds > 0) {
          armor *= (1 + (defender.effects.armorBoosted || 0));
        }
        if (defender.effects.armorReduced) {
          armor *= 1 - defender.effects.armorReduced;
        }
        if (crimsonDaggerPierce) armor *= 0.5;
        if (spearhexTriggered) armor *= 0.90;
        if (sunbowTriggered) armor *= 0.90;
        defenderMitigation = armor / (armor + 1000);
      }

      const defenderPvpDefBonus = defender.rpgClass.bonuses?.pvpDefense || 0;
      let finalMult = (1 - defenderMitigation) * (1 - defenderPvpDefBonus);
      if (holySwordDouble) finalMult *= 2.0;
      if (poisonMult > 1.0) finalMult *= poisonMult;
      if (attacker.effects.damageReduced) {
        finalMult *= 1 - attacker.effects.damageReduced;
        delete attacker.effects.damageReduced;
      }

      let damage = Math.max(5, Math.floor((rawDamage * finalMult) / 10));

      let defenderSubType = defender.weapon?.subType ? defender.weapon.subType.toLowerCase().replace(/\s+/g, "") : "";
      if (LOCKED_WEAPONS.includes(defenderSubType)) {
        defenderSubType = "";
      }
      if (defenderSubType.includes("shieldhex")) {
        damage = Math.floor(damage * 0.80);
        defender.effects.shieldhexAbsorbed = (defender.effects.shieldhexAbsorbed || 0) + damage;
        defender.effects.shieldhexRounds = (defender.effects.shieldhexRounds || 0) + 1;
      }

      defender.hp = Math.max(0, defender.hp - damage);
      defender.rage = Math.min(100, defender.rage + 10); // Gain rage on taking hit

      let logMsg = "";
      if (isCastingSkill) {
        logMsg = `Lượt ${turn}: **${attacker.name}** dùng kỹ năng [${skillName}] gây **${damage}** st`;
        if (isCrit) logMsg += " (Chí mạng!)";
        if (attacker.classKey === "warrior") logMsg += " và tăng 25% Giáp";
        if (attacker.classKey === "archer" && defender.effects.bleedRounds > 0) logMsg += " và gây Chảy máu";
        if (attacker.classKey === "paladin") logMsg += " và hồi máu";
      } else {
        logMsg = `Lượt ${turn}: **${attacker.name}** tấn công thường gây **${damage}** st`;
        if (isCrit) logMsg += " (Chí mạng!)";
      }
      logs.push(logMsg + "!");

      if ((hasTriggered && cleanSubType === "greenstaff") || riverofbloodTriggered) {
        let baseHeal = 0;
        if (riverofbloodTriggered) {
          baseHeal = Math.max(1, Math.floor(damage * 0.02));
        } else {
          baseHeal = Math.floor((attacker.maxHp - attacker.hp) * 0.10);
        }
        let healReduceFactor = 1.0;
        if (attacker.effects.healReduced) healReduceFactor *= 0.7;
        if (defender.rpgClass?.bonuses?.healReduction) healReduceFactor *= 1 - defender.rpgClass.bonuses.healReduction;
        const finalHealAmt = Math.floor(baseHeal * healReduceFactor);
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + finalHealAmt);
        logs.push(`✨ **${attacker.name}** hồi **${finalHealAmt}** HP từ hiệu ứng vũ khí!`);
      }
    }

    // Gain rage on attacking (only if not cast skill)
    if (!isCastingSkill) {
      attacker.rage = Math.min(100, attacker.rage + 50);
    }


    saveState(turn);

    if (defender.hp <= 0) {
      break;
    }

    turnOrder = [defender, attacker];
    turn += 1;
  }

  // Save final state
  const lastState = history[history.length - 1];
  if (!lastState || lastState.turn !== (turn - 1)) {
    saveState(turn - 1);
  }

  let winner, loser, isDraw = false;
  if (p1.hp <= 0) {
    winner = p2;
    loser = p1;
  } else if (p2.hp <= 0) {
    winner = p1;
    loser = p2;
  } else {
    isDraw = true;
  }

  const totalTurns = (p1.hp <= 0 || p2.hp <= 0) ? turn : (turn - 1);
  return { winner, loser, isDraw, turns: totalTurns, logs, history };
};

class BattleCommand extends BaseCommand {
  constructor() {
    super({
      name: "battle",
      aliases: ["b", "pvp", "arena"],
      description: "Khiêu chiến PvP với người chơi khác hoặc ngẫu nhiên.",
      usage: `${config.prefix}battle [@mention]`,
      examples: [
        {
          intent: "PVP ngẫu nhiên với người đã tạo class",
          command: `${config.prefix}battle`,
        },
        {
          intent: "Khiêu chiến một người chơi cụ thể",
          command: `${config.prefix}battle @Khang`,
        },
      ],
      cooldown: 0
    });
  }

  async execute(message, args = []) {
    const senderId = message.author.id;
    const targetMention = message.mentions.users.first();

    const cooldownSeconds = 15;
    const remaining = checkAndSetCooldown(senderId, "pvp", cooldownSeconds);
    if (remaining > 0) {
      return notifyCooldown(message, remaining);
    }

    let senderUser, senderClass;
    try {
      const res = await requireRpgCharacter(senderId);
      senderUser = res.user;
      senderClass = res.rpgClass;
    } catch {
      return message.reply(
        `${config.emoji.warning} Bạn chưa tạo nhân vật RPG. Hãy gõ \`${config.prefix}class\` để tạo nhân vật trước khi PvP.`,
      );
    }

    if (senderUser.rpg?.godsetBackup) {
      return message.reply(
        `${config.emoji.no} Bạn không thể tham gia PvP lúc này.`,
      );
    }

    if (targetMention) {
      const receiverId = targetMention.id;
      if (receiverId === senderId) {
        return message.reply(
          `${config.emoji.no} Bạn không thể tự chiến đấu với chính mình!`,
        );
      }

      if (targetMention.bot) {
        return message.reply(
          `${config.emoji.no} Bạn không thể khiêu chiến với Bot!`,
        );
      }

      let receiverUser, receiverClass;
      try {
        const res = await requireRpgCharacter(receiverId);
        receiverUser = res.user;
        receiverClass = res.rpgClass;
      } catch {
        return message.reply(
          `${config.emoji.no} Đối phương chưa tạo nhân vật RPG. Họ cần dùng lệnh \`${config.prefix}class\` trước.`,
        );
      }

      if (receiverUser.rpg?.godsetBackup) {
        return message.reply(
          `${config.emoji.no} Đối phương không thể tham gia PvP lúc này.`,
        );
      }

      const challengeEmbed = new EmbedBuilder()
        .setColor(senderClass.color)
        .setTitle("⚔️ Thách Đấu PvP")
        .setDescription(
          `🛡️ **<@${senderId}>** (${senderClass.name} Lvl ${senderUser.rpg.level}) đã khiêu chiến **<@${receiverId}>** (${receiverClass.name} Lvl ${receiverUser.rpg.level})!\n\n` +
            `Bạn có chấp nhận lời thách đấu này không?`,
        )
        .setFooter({ text: "Lời mời thách đấu hết hạn sau 60 giây." });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("pvp_accept")
          .setLabel("Chấp nhận")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("pvp_decline")
          .setLabel("Từ chối")
          .setStyle(ButtonStyle.Danger),
      );

      const prompt = await message.reply({
        embeds: [challengeEmbed],
        components: [row],
        skipV2: true,
      });

      const collector = prompt.createMessageComponentCollector({
        filter: (interaction) => interaction.user.id === receiverId,
        time: 60000,
      });

      collector.on("collect", async (interaction) => {
        if (interaction.customId === "pvp_accept") {
          collector.stop("accepted");
          await interaction.deferUpdate();
          const { updateQuestProgress } = require("../../utils/questUtil");
          await Promise.all([
            updateQuestProgress(senderUser, "pvp_battle", 1, message.channel),
            updateQuestProgress(receiverUser, "pvp_battle", 1, message.channel),
          ]);
          await runPvPBattle(message, prompt, senderUser, receiverUser);
        } else if (interaction.customId === "pvp_decline") {
          collector.stop("declined");
          await interaction.update({
            content: `❌ <@${receiverId}> đã từ chối lời khiêu chiến từ <@${senderId}>.`,
            embeds: [],
            components: [],
          });
        }
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "accepted" || reason === "declined") return;
        await prompt
          .edit({
            content: `⌛ Lời khiêu chiến đã hết hạn. <@${receiverId}> đã không trả lời kịp thời.`,
            embeds: [],
            components: [],
          })
          .catch(() => {});
      });
    } else {
      const opponents = await User.aggregate([
        {
          $match: {
            "rpg.classKey": { $ne: null },
            userId: { $ne: senderId, $regex: /^\d+$/ },
            "rpg.godsetBackup": null,
          }
        },
        { $sample: { size: 5 } }
      ]).catch(() => []);

      if (!opponents || opponents.length === 0) {
        return message.reply(
          `${config.emoji.no} Không tìm thấy người chơi nào khác có nhân vật RPG trong dữ liệu game để thách đấu.`,
        );
      }

      let randomOpponent = null;
      for (const oppRaw of opponents) {
        const discordUser = await message.client.users.fetch(oppRaw.userId).catch(() => null);
        if (discordUser && !discordUser.bot) {
          randomOpponent = await User.findOne({ userId: oppRaw.userId });
          break;
        }
      }

      if (!randomOpponent) {
        return message.reply(
          `${config.emoji.no} Không tìm thấy người chơi hợp lệ (không phải Bot) để thách đấu.`,
        );
      }

      await runPvPBattle(message, null, senderUser, randomOpponent);
    }
  }
}

module.exports = new BattleCommand();

const runPvPBattle = async (message, promptMessage, user1OrId, user2OrId) => {
  const user1 = typeof user1OrId === "object" && user1OrId.save ? user1OrId : await User.findOne({ userId: user1OrId });
  const user2 = typeof user2OrId === "object" && user2OrId.save ? user2OrId : await User.findOne({ userId: user2OrId });
  const p1Id = user1.userId;
  const p2Id = user2.userId;

  const class1 = getRpgClass(user1.rpg.classKey);
  const class2 = getRpgClass(user2.rpg.classKey);

  const stats1 = getEffectiveRpgStats(user1);
  const stats2 = getEffectiveRpgStats(user2);

  const petB1 = getEquippedPetBonuses(user1);
  const petB2 = getEquippedPetBonuses(user2);

  const baseHp1 = 150 + stats1.vigor * 20 + user1.rpg.level * 20;
  const baseHp2 = 150 + stats2.vigor * 20 + user2.rpg.level * 20;

  const maxHp1 = Math.floor(baseHp1 * (1 + (petB1.hpPct || 0)));
  const maxHp2 = Math.floor(baseHp2 * (1 + (petB2.hpPct || 0)));

  
  let p1Name = user1.rpg.name || usernameCache.get(p1Id);
  let p2Name = user2.rpg.name || usernameCache.get(p2Id);

  if (!p1Name || !p2Name) {
    const u1Cached = message.client.users.cache.get(p1Id);
    const u2Cached = message.client.users.cache.get(p2Id);

    if (!p1Name && u1Cached) {
      p1Name = u1Cached.username;
      usernameCache.set(p1Id, p1Name);
    }
    if (!p2Name && u2Cached) {
      p2Name = u2Cached.username;
      usernameCache.set(p2Id, p2Name);
    }

    if (!p1Name || !p2Name) {
      const fetchPromises = [];
      if (!p1Name) {
        fetchPromises.push(
          message.client.users.fetch(p1Id)
            .then((u) => { 
              p1Name = u.username; 
              usernameCache.set(p1Id, u.username);
            })
            .catch(() => { p1Name = `Người chơi #${p1Id.slice(-4)}`; })
        );
      }
      if (!p2Name) {
        fetchPromises.push(
          message.client.users.fetch(p2Id)
            .then((u) => { 
              p2Name = u.username; 
              usernameCache.set(p2Id, u.username);
            })
            .catch(() => { p2Name = `Người chơi #${p2Id.slice(-4)}`; })
        );
      }
      await Promise.all(fetchPromises);
    }
  }

  const equipped1 = getEquippedItems(user1);
  const equipped2 = getEquippedItems(user2);

  const getDefPower = (equipped) => {
    let def = 0;
    if (equipped.armor) def += equipped.armor.power || 0;
    if (equipped.helmet) def += equipped.helmet.power || 0;
    if (equipped.boots) def += equipped.boots.power || 0;
    return def;
  };

  const player1 = {
    id: p1Id,
    name: p1Name,
    level: user1.rpg.level,
    classKey: user1.rpg.classKey,
    classLabel: class1.name,
    rpgClass: class1,
    effectiveStats: stats1,
    maxHp: maxHp1,
    hp: maxHp1,
    gearPower: calculateRpgPower(user1),
    defensePower: getDefPower(equipped1),
    dbUser: user1,
    weapon: equipped1.weapon,
  };

  const player2 = {
    id: p2Id,
    name: p2Name,
    level: user2.rpg.level,
    classKey: user2.rpg.classKey,
    classLabel: class2.name,
    rpgClass: class2,
    effectiveStats: stats2,
    maxHp: maxHp2,
    hp: maxHp2,
    gearPower: calculateRpgPower(user2),
    defensePower: getDefPower(equipped2),
    dbUser: user2,
    weapon: equipped2.weapon,
  };

  const result = simulatePvP(player1, player2);

  let winUser,
    loseUser,
    cokeWinner = 0,
    finalHp1 = 0,
    finalHp2 = 0;
  const isP1Winner = result.winner && result.winner.id === player1.id;

  if (result.isDraw) {
    addRpgExp(user1.rpg, 50);
    user1.rpg.power = calculateRpgPower(user1);
    user1.markModified("rpg");

    addRpgExp(user2.rpg, 50);
    user2.rpg.power = calculateRpgPower(user2);
    user2.markModified("rpg");

    const { updateQuestProgress } = require("../../utils/questUtil");
    await Promise.all([
      updateQuestProgress(user1, "exp_gain", 50, message.channel),
      updateQuestProgress(user2, "exp_gain", 50, message.channel),
    ]);

    finalHp1 = Math.max(1, player1.hp);
    finalHp2 = Math.max(1, player2.hp);
  } else {
    winUser = result.winner.dbUser;
    loseUser = result.loser.dbUser;

    const isTargeted = !!promptMessage;
    if (!isTargeted) {
      if (result.winner.id === p1Id) {
        user1.rpg.pvpStreak = (user1.rpg.pvpStreak || 0) + 1;
      } else {
        user1.rpg.pvpStreak = 0;
      }
      user1.markModified("rpg");
    }

    addRpgExp(winUser.rpg, 200);
    winUser.rpg.power = calculateRpgPower(winUser);
    winUser.markModified("rpg");

    addRpgExp(loseUser.rpg, 50);
    loseUser.rpg.power = calculateRpgPower(loseUser);
    loseUser.markModified("rpg");

    // Award Pet EXP for participating in battle
    addPetExp(user1, 40);
    addPetExp(user2, 40);

    const { updateQuestProgress } = require("../../utils/questUtil");
    await Promise.all([
      updateQuestProgress(
        user1,
        "exp_gain",
        result.winner.id === p1Id ? 200 : 50,
        message.channel,
      ),
      updateQuestProgress(
        user2,
        "exp_gain",
        result.winner.id === p2Id ? 200 : 50,
        message.channel,
      ),
    ]);

    finalHp1 =
      result.winner.id === player1.id ? Math.max(1, result.winner.hp) : 0;
    finalHp2 =
      result.winner.id === player2.id ? Math.max(1, result.winner.hp) : 0;
  }

  
  await Promise.all([user1.save(), user2.save()]);

  const battleDisplay = user1.rpg?.settings?.battleDisplay || "image";
  const battleSpeed = user1.rpg?.settings?.battleSpeed || "instant";
  const battleLogs = user1.rpg?.settings?.battleLogs || "false";

  const showImage = !["text", "compact"].includes(battleDisplay);

  const memberName = message.member?.displayName || message.author.displayName || message.author.username;
  const weapon1Emoji = player1.weapon?.emoji ? ` ${player1.weapon.emoji}` : "";
  const weapon2Emoji = player2.weapon?.emoji ? ` ${player2.weapon.emoji}` : "";

  let footerText = "";
  if (result.isDraw) {
    footerText = `Hòa sau ${result.turns} lượt! | Cả hai nhận +50 XP | Chuỗi thắng được giữ nguyên`;
  } else {
    const winText = isP1Winner ? "Chiến thắng" : "Thất bại";
    const xpGained = isP1Winner ? 200 : 50;
    const isTargeted = !!promptMessage;
    let streakText = "";
    if (isTargeted) {
      streakText = "Không tính chuỗi";
    } else {
      const streak = isP1Winner ? user1.rpg.pvpStreak : 0;
      streakText = `Chuỗi thắng: ${streak}`;
    }
    footerText = `${winText} trong ${result.turns} lượt! | +${xpGained} XP | ${streakText}`;
  }

  const finalEmbed = new EmbedBuilder()
    .setColor(result.isDraw ? "#F1C40F" : isP1Winner ? "#2ECC71" : "#E74C3C")
    .setAuthor({
      name: `${memberName} Đang chiến đấu!`,
      iconURL: message.author.displayAvatarURL({ dynamic: true })
    })
    .addFields(
      {
        name: `${player1.name}${weapon1Emoji} (${player1.classLabel})`,
        value: `LV. **${player1.level}**\n⚔ Lực chiến: **${Math.floor(player1.gearPower).toLocaleString()}**`,
        inline: true,
      },
      {
        name: `${player2.name}${weapon2Emoji} (${player2.classLabel})`,
        value: `LV. **${player2.level}**\n⚔ Lực chiến: **${Math.floor(player2.gearPower).toLocaleString()}**`,
        inline: true,
      },
    );

  if (battleLogs === "true" && result.logs && result.logs.length > 0) {
    const logSnippet = result.logs.slice(-8).join("\n");
    finalEmbed.addFields({
      name: "📜 Nhật ký trận đấu",
      value: logSnippet.length > 1024 ? logSnippet.substring(0, 1021) + "..." : logSnippet,
      inline: false,
    });
  } else if (battleLogs === "link" && result.logs && result.logs.length > 0) {
    finalEmbed.addFields({
      name: "📜 Nhật ký trận đấu",
      value: `*Trận đấu diễn ra trong ${result.turns} lượt.*`,
      inline: false,
    });
  }

  const getActiveStatusEmojis = (effects) => {
    if (!effects) return "";
    const list = [];
    if (effects.bleedRounds > 0) list.push("<:bleed:1521938497642958889>");
    if (effects.healReduced) list.push("<:healreduction:1523340558855045190>");
    if (effects.armorReduced > 0) list.push("<:break:1521938480337391736>");
    if (effects.armorBoosted > 0) list.push("<:atkup:1521938477359300648>");
    return list.length > 0 ? " " + list.join(" ") : "";
  };

  if (showImage && result.history && result.history.length > 0) {
    const history = result.history;
    const totalStates = history.length;

    let indices = [totalStates - 1]; // Default "instant": show only final frame immediately
    if (battleSpeed === "short") {
      indices = totalStates > 1 ? [0, totalStates - 1] : [0];
    } else if (battleSpeed === "lengthy") {
      const mid1Index = Math.max(1, Math.min(totalStates - 2, Math.floor(totalStates * 0.33)));
      const mid2Index = Math.max(mid1Index + 1, Math.min(totalStates - 2, Math.floor(totalStates * 0.66)));
      indices = [0];
      if (totalStates > 2) indices.push(mid1Index);
      if (totalStates > 3) indices.push(mid2Index);
      indices.push(totalStates - 1);
    }

    let activeMessage = promptMessage;

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const state = history[idx];
      const isFinalFrame = i === indices.length - 1;
      let finalStatus = null;
      if (isFinalFrame) {
        finalStatus = result.isDraw ? "timeout" : "ko";
      }

      const imgData = await generatePvPImage(
        player1.dbUser.rpg.characterAsset || player1.rpgClass.asset,
        player2.dbUser.rpg.characterAsset || player2.rpgClass.asset,
        state.p1.hp,
        player1.maxHp,
        state.p1.rage || 0,
        player1.weapon,
        state.p1.effects,
        state.p2.hp,
        player2.maxHp,
        state.p2.rage || 0,
        player2.weapon,
        state.p2.effects,
        finalStatus
      ).catch((err) => {
        console.error("Failed to generate PvP image:", err);
        return null;
      });

      if (imgData) {
        const attachment = new AttachmentBuilder(imgData.buffer, { name: imgData.name });
        
        const p1Status = getActiveStatusEmojis(state.p1.effects);
        const p2Status = getActiveStatusEmojis(state.p2.effects);

        const currentEmbed = EmbedBuilder.from(finalEmbed)
          .setImage(`attachment://${imgData.name}`)
          .setFields([
            {
              name: `${player1.name}${weapon1Emoji} (${player1.classLabel})${p1Status}`,
              value: `LV. **${player1.level}**\n⚔ Lực chiến: **${Math.floor(player1.gearPower).toLocaleString()}**`,
              inline: true,
            },
            {
              name: `${player2.name}${weapon2Emoji} (${player2.classLabel})${p2Status}`,
              value: `LV. **${player2.level}**\n⚔ Lực chiến: **${Math.floor(player2.gearPower).toLocaleString()}**`,
              inline: true,
            }
          ]);

        if (battleLogs === "true" && result.logs && result.logs.length > 0) {
          const logSnippet = result.logs.slice(-8).join("\n");
          currentEmbed.addFields({
            name: "📜 Nhật ký trận đấu",
            value: logSnippet.length > 1024 ? logSnippet.substring(0, 1021) + "..." : logSnippet,
            inline: false,
          });
        }

        if (isFinalFrame) {
          currentEmbed.setFooter({ text: footerText });
        } else {
          currentEmbed.setFooter({ text: `Đang chiến đấu... Lượt ${state.turn}/${result.turns}` });
        }

        const payload = { embeds: [currentEmbed], files: [attachment], skipV2: true };

        if (activeMessage && activeMessage.editable) {
          await activeMessage.edit({ ...payload, components: [] }).catch(() => {});
        } else {
          activeMessage = await message.reply(payload).catch(() => null);
        }
      }

      if (i < indices.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  } else {
    finalEmbed.setFooter({ text: footerText });
    const payload = { embeds: [finalEmbed], skipV2: true };
    if (promptMessage && promptMessage.editable) {
      await promptMessage.edit({ ...payload, components: [] }).catch(() => {});
    } else {
      await message.reply(payload).catch(() => {});
    }
  }
};
