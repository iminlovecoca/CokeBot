/**
 * Test script to verify World Boss attack fix
 */
const { getClassSuffixSetBonus } = require("../utils/rpgUtil");
const bossCommand = require("../commands/rpg/hunt/boss");
const User = require("../models/User");
const SpawnedBoss = require("../models/SpawnedBoss");

async function runTest() {
  console.log("==================================================================");
  console.log("⚔️  WORLD BOSS ATTACK MECHANISM VERIFICATION");
  console.log("==================================================================");

  // 1. Check getClassSuffixSetBonus export
  console.log("1️⃣  Kiểm tra hàm getClassSuffixSetBonus trong utils/rpgUtil.js...");
  if (typeof getClassSuffixSetBonus !== "function") {
    throw new Error("getClassSuffixSetBonus is NOT a function!");
  }
  console.log("   ✅ getClassSuffixSetBonus đã được export và sẵn sàng sử dụng!");

  // 2. Mock activeBoss and user
  console.log("2️⃣  Tạo môi trường mô phỏng World Boss (Malzareth) & Người chơi tấn công...");
  const mockBoss = {
    key: "boss_01",
    name: "Malzareth",
    rank: "thuong",
    hp: 162500,
    armor: 45,
    magicResist: 30,
    attackPower: 120,
    damageType: "physical",
  };

  const activeBoss = {
    id: "test_boss_1",
    boss: mockBoss,
    hp: 162500,
    maxHp: 162500,
    participants: new Map(),
    messageIds: ["msg_1"],
    effects: { armorReduced: 0, healReduced: false },
  };

  const mockUser = {
    userId: "test_user_1",
    coke: 50000,
    rpg: {
      name: "Hero",
      level: 50,
      classKey: "warrior",
      power: 25000,
      dailyDrops: {},
      stats: { vigor: 20, str: 35, dex: 25, int: 10, arc: 15, pr: 12, mr: 10 },
      equipped: {
        weapon: 1,
        armor: 2,
        helmet: 3,
        boots: 4,
        ring: 5,
        necklace: 6,
      },
      items: [
        {
          id: 1,
          slot: "weapon",
          name: "Thánh Kiếm",
          subType: "holysword",
          rarity: "Epic",
          quality: 85,
          power: 12000,
          fixedPassive: { name: "Thánh Quang" },
          randomPassive: { type: "burn", value: 0.12, emoji: "🔥" },
        },
        { id: 2, slot: "armor", rarity: "Epic", classSuffix: "knight", power: 2500 },
        { id: 3, slot: "helmet", rarity: "Epic", classSuffix: "knight", power: 2500 },
        { id: 4, slot: "boots", rarity: "Epic", classSuffix: "knight", power: 2500 },
        { id: 5, slot: "ring", rarity: "Epic", classSuffix: "knight", power: 2500 },
        { id: 6, slot: "necklace", rarity: "Epic", classSuffix: "knight", power: 2500 },
      ],
    },
    save: async () => {},
    markModified: () => {},
  };

  // 3. Test getClassSuffixSetBonus on mockUser
  const bonus = getClassSuffixSetBonus(mockUser);
  console.log(`   • Full set 5 món [Hiệp Sĩ]: Active=${bonus.active}, Multiplier=${bonus.multiplier} (+${bonus.percent}%)`);
  if (!bonus.active || bonus.suffix !== "knight") {
    throw new Error("getClassSuffixSetBonus failed on 5-piece knight set!");
  }
  console.log("   ✅ Kích hoạt Set 5 món chính xác!");

  // 4. Test performBossAttack execution
  console.log("3️⃣  Thử nghiệm thực thi đòn tấn công Boss World qua bossCommand.performBossAttack...");

  // Mock client & channel
  const mockMsg = {
    id: "msg_1",
    edit: async () => mockMsg,
    delete: async () => {},
    attachments: { first: () => null },
  };

  const mockChannel = {
    id: "test_channel_1",
    isTextBased: () => true,
    send: async () => mockMsg,
    messages: {
      cache: new Map([["msg_1", mockMsg]]),
      fetch: async () => mockMsg,
    },
  };

  const mockClient = {
    rpgBosses: new Map([["test_channel_1", activeBoss]]),
    users: {
      cache: new Map([["test_user_1", { displayName: "Hero", username: "Hero", displayAvatarURL: () => "https://example.com/avatar.png" }]]),
      fetch: async () => ({ displayName: "Hero", username: "Hero", displayAvatarURL: () => "https://example.com/avatar.png" }),
    },
  };

  // Mock User model & SpawnedBoss model
  const origFindOne = User.findOne;
  const origFindByIdAndUpdate = SpawnedBoss.findByIdAndUpdate;
  const origFindOneAndUpdate = SpawnedBoss.findOneAndUpdate;

  User.findOne = () => ({
    lean: async () => mockUser,
    exec: async () => mockUser,
    then: (resolve) => resolve(mockUser),
  });

  SpawnedBoss.findByIdAndUpdate = async () => ({});
  SpawnedBoss.findOneAndUpdate = async () => ({});

  try {
    const result = await bossCommand.performBossAttack({
      client: mockClient,
      channel: mockChannel,
      userId: "test_user_1",
    });

    console.log(`   • Kết quả attack: ok=${result.ok}`);
    if (!result.ok) {
      throw new Error(`performBossAttack failed with content: ${result.content}`);
    }

    const participant = activeBoss.participants.get("test_user_1");
    console.log(`   • Sát thương người chơi gây ra: ${participant.damage.toLocaleString()} DMG`);
    console.log(`   • Máu boss còn lại: ${activeBoss.hp.toLocaleString()} / ${activeBoss.maxHp.toLocaleString()} HP`);
    console.log(`   • Lượt đánh của người chơi: ${participant.attacks}`);

    if (activeBoss.hp >= 162500) {
      throw new Error("Boss HP did not decrease!");
    }
    if (participant.damage <= 0) {
      throw new Error("Participant damage was 0!");
    }

    console.log("   ✅ Boss đã bị trừ máu chính xác và bảng sát thương đã cập nhật!");
    console.log("\n🎉 HOÀN TẤT KIỂM ĐỊNH FIX LỖI WORLD BOSS THÀNH CÔNG 100%!");
  } finally {
    User.findOne = origFindOne;
    SpawnedBoss.findByIdAndUpdate = origFindByIdAndUpdate;
    SpawnedBoss.findOneAndUpdate = origFindOneAndUpdate;
  }
}

runTest().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
