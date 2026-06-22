const testQuestRerollAndLootbox = () => {
  // --- TEST 1: Quest Reroll No Duplicates ---
  console.log("--- TEST 1: QUEST REROLL NO DUPLICATES ---");
  const QUEST_TEMPLATES = {
    beginner: [
      { text: "Quest A" },
      { text: "Quest B" },
      { text: "Quest C" }
    ]
  };

  const generateRandomQuest = (tier, excludeTexts = []) => {
    const templates = QUEST_TEMPLATES[tier];
    let filtered = templates.filter(t => !excludeTexts.includes(t.text));
    if (filtered.length === 0) {
      filtered = templates;
    }
    const template = filtered[Math.floor(Math.random() * filtered.length)];
    return { text: template.text };
  };

  // Mock active quests: A and B
  const activeQuests = [{ text: "Quest A" }, { text: "Quest B" }];

  // Let's roll a new quest to replace Quest B. We want to avoid Quest A (active) and Quest B (old).
  // Exclude texts should contain both active quests (Quest A and Quest B).
  const activeTexts = activeQuests.map(q => q.text);
  console.log("Active texts to exclude:", activeTexts);

  // We should repeat the roll 50 times and check if it ever rolls Quest A or Quest B.
  let duplicateCount = 0;
  for (let i = 0; i < 50; i++) {
    const newQuest = generateRandomQuest("beginner", activeTexts);
    if (activeTexts.includes(newQuest.text)) {
      duplicateCount++;
    }
  }

  console.log(`Duplicate rolled count: ${duplicateCount} (Expected: 0)`);
  if (duplicateCount === 0) {
    console.log("PASS: Quest reroll avoids active/old quest duplicates.");
  } else {
    console.log("FAIL: Quest reroll generated duplicates.");
  }

  // --- TEST 2: Lootbox Weapon Sorting ---
  console.log("\n--- TEST 2: LOOTBOX WEAPON SORTING ---");
  const openedGears = [
    { id: 1, rarity: "Epic", quality: 85.5 },
    { id: 2, rarity: "Legendary", quality: 45.0 },
    { id: 3, rarity: "Epic", quality: 95.0 },
    { id: 4, rarity: "Divine", quality: 60.5 },
    { id: 5, rarity: "Common", quality: 99.0 },
    { id: 6, rarity: "Ancient", quality: 78.0 }
  ];

  const rarityRank = {
    Divine: 7,
    Ancient: 6,
    Mythic: 5,
    Legendary: 4,
    Epic: 3,
    Rare: 2,
    Common: 1
  };

  openedGears.sort((a, b) => {
    const rankA = rarityRank[a.rarity] || 0;
    const rankB = rarityRank[b.rarity] || 0;
    if (rankA !== rankB) return rankB - rankA;
    return (b.quality || 0) - (a.quality || 0);
  });

  console.log("Sorted gears:");
  openedGears.forEach(g => console.log(`• Rarity: ${g.rarity}, Quality: ${g.quality}% (ID: ${g.id})`));

  const isSortedCorrectly = 
    openedGears[0].rarity === "Divine" &&
    openedGears[1].rarity === "Ancient" &&
    openedGears[2].rarity === "Legendary" &&
    openedGears[3].rarity === "Epic" && openedGears[3].quality === 95.0 &&
    openedGears[4].rarity === "Epic" && openedGears[4].quality === 85.5 &&
    openedGears[5].rarity === "Common";

  if (isSortedCorrectly) {
    console.log("PASS: Lootbox gears are sorted by rarity and quality descending successfully.");
  } else {
    console.log("FAIL: Lootbox gears sorting order incorrect.");
  }
};

testQuestRerollAndLootbox();
