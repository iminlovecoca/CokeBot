const testGearStatFilters = () => {
  // Mock items list
  const allItems = [
    { id: 1, slot: "armor", subType: "Heavy Armor", stats: { vigor: 10, str: 5 } },
    { id: 2, slot: "helmet", subType: "Warrior Helmet", stats: { vit: 15, def: 5 } }, // using vit (vigor alias) and def (pr alias)
    { id: 3, slot: "boots", subType: "Knight Boot", stats: { mr: 8, dex: 4 } },
    { id: 4, slot: "ring", subType: "Dragon Ring", stats: { int: 12, agi: 6 } }, // using agi (dex alias)
    { id: 5, slot: "necklace", subType: "Ember Necklace", stats: { arc: 10, luck: 4 } }, // using luck (arc alias)
    { id: 6, slot: "weapon", subType: "Longsword", stats: {} } // weapon has no secondary stats
  ];

  const getFilteredItems = (filterType) => {
    let filtered = [...allItems];
    if (filterType.startsWith("stat_")) {
      const statName = filterType.slice(5);
      filtered = filtered.filter((item) => {
        if (!item.stats) return false;
        const getStatVal = (k) => {
          const val = item.stats[k];
          if (typeof val === "number") return val;
          return 0;
        };
        if (statName === "vigor") return getStatVal("vigor") > 0 || getStatVal("vit") > 0;
        if (statName === "pr") return getStatVal("pr") > 0 || getStatVal("def") > 0;
        if (statName === "dex") return getStatVal("dex") > 0 || getStatVal("agi") > 0;
        if (statName === "arc") return getStatVal("arc") > 0 || getStatVal("luck") > 0;
        return getStatVal(statName) > 0;
      });
    }
    return filtered;
  };

  console.log("--- RUNNING GEAR STAT FILTERS TEST ---");

  // Test vigor filter (should match item 1 [vigor] and item 2 [vit])
  const vigorFiltered = getFilteredItems("stat_vigor");
  console.log(`Vigor Filter count: ${vigorFiltered.length} (Expected: 2)`);
  console.log(`Matched item IDs: ${vigorFiltered.map(i => i.id).join(", ")} (Expected: 1, 2)`);

  // Test pr filter (should match item 2 [def])
  const prFiltered = getFilteredItems("stat_pr");
  console.log(`PR Filter count: ${prFiltered.length} (Expected: 1)`);
  console.log(`Matched item IDs: ${prFiltered.map(i => i.id).join(", ")} (Expected: 2)`);

  // Test mr filter (should match item 3 [mr])
  const mrFiltered = getFilteredItems("stat_mr");
  console.log(`MR Filter count: ${mrFiltered.length} (Expected: 1)`);
  console.log(`Matched item IDs: ${mrFiltered.map(i => i.id).join(", ")} (Expected: 3)`);

  // Test str filter (should match item 1 [str])
  const strFiltered = getFilteredItems("stat_str");
  console.log(`Str Filter count: ${strFiltered.length} (Expected: 1)`);
  console.log(`Matched item IDs: ${strFiltered.map(i => i.id).join(", ")} (Expected: 1)`);

  // Test dex filter (should match item 3 [dex] and item 4 [agi])
  const dexFiltered = getFilteredItems("stat_dex");
  console.log(`Dex Filter count: ${dexFiltered.length} (Expected: 2)`);
  console.log(`Matched item IDs: ${dexFiltered.map(i => i.id).join(", ")} (Expected: 3, 4)`);

  // Test int filter (should match item 4 [int])
  const intFiltered = getFilteredItems("stat_int");
  console.log(`Int Filter count: ${intFiltered.length} (Expected: 1)`);
  console.log(`Matched item IDs: ${intFiltered.map(i => i.id).join(", ")} (Expected: 4)`);

  // Test arc filter (should match item 5 [arc, luck])
  const arcFiltered = getFilteredItems("stat_arc");
  console.log(`Arc Filter count: ${arcFiltered.length} (Expected: 1)`);
  console.log(`Matched item IDs: ${arcFiltered.map(i => i.id).join(", ")} (Expected: 5)`);

  if (
    vigorFiltered.length === 2 && prFiltered.length === 1 && mrFiltered.length === 1 &&
    strFiltered.length === 1 && dexFiltered.length === 2 && intFiltered.length === 1 &&
    arcFiltered.length === 1
  ) {
    console.log("\nPASS: All stat filter test cases passed successfully!");
  } else {
    console.log("\nFAIL: Some stat filter test cases failed.");
  }
};

testGearStatFilters();
