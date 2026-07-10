const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ComponentType
} = require('discord.js');

const config      = require('../../data/config');
const gardenCfg   = config.garden;
const SEEDS       = gardenCfg.seeds;                // { vegetable, flower, fruit }
const SEED_KEYS   = Object.keys(SEEDS);             // ['vegetable','flower','fruit']
const Garden      = require('../../models/Garden');
const User        = require('../../models/User');

// ─── Constants ─────────────────────────────────────────────────────────────────

const BUG_CHANCE      = gardenCfg.bug_chance;
const BUG_APPEAR_MIN  = gardenCfg.bug_appear_min  * 1000;
const BUG_APPEAR_MAX  = gardenCfg.bug_appear_max  * 1000;
const BUG_DESTROY_MIN = gardenCfg.bug_destroy_min * 1000;
const BUG_DESTROY_MAX = gardenCfg.bug_destroy_max * 1000;
const BUGS            = gardenCfg.bugs;
const EVENTS          = gardenCfg.events;
const GROWTH_EMOJIS   = gardenCfg.growth_emojis;   // ['🌱','🌿','🌾']
const TTL             = gardenCfg.collector_ttl_minutes * 60 * 1000;
const WATER_COOLDOWN  = (gardenCfg.water_cooldown_hours || 6) * 3600000; // ms

// All seed types have 3 growth stages; growth_hours controls speed
const MAX_GROWTH = { vegetable: 3, flower: 3, fruit: 3 };

// ─── Helpers ───────────────────────────────────────────────────────────────────

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const emptyCell = () => ({
  plant: null, growth: 0, seedType: null, hasBug: false,
  bugType: null, bugAppearsAt: null, bugDestroyAt: null,
  immune: false, plantedAt: null, isWatered: false
});

const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  const a = new Date(d1), b = new Date(d2);
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate();
};

const isNewDay  = (garden) => !isSameDay(garden.lastCheckinDate, new Date());
const maxGrowth = (cell)   => MAX_GROWTH[cell.seedType] || 3;
const isReady   = (cell)   => !!(cell.plant && cell.growth >= maxGrowth(cell));

/** True if water cooldown has passed (6h by default). */
function canWaterNow(garden) {
  if (!garden.lastWateredDate) return true;
  return (Date.now() - new Date(garden.lastWateredDate).getTime()) >= WATER_COOLDOWN;
}

/** Minutes until next watering is allowed. */
function minutesUntilWater(garden) {
  if (!garden.lastWateredDate) return 0;
  const elapsed = Date.now() - new Date(garden.lastWateredDate).getTime();
  const remaining = WATER_COOLDOWN - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
}

/**
 * Recalculate growth of all cells based on elapsed real time since they were watered.
 */
function updateGrowthFromTime(garden) {
  const now = Date.now();
  let dirty = false;
  for (const cell of garden.cells) {
    if (!cell.plant || !cell.isWatered || !cell.plantedAt) continue;
    const seedCfg  = SEEDS[cell.seedType];
    if (!seedCfg) continue;
    const max     = maxGrowth(cell);
    const totalMs = (seedCfg.growth_hours || 8) * 3600000;
    const msPerStage = totalMs / max;
    const elapsed  = now - new Date(cell.plantedAt).getTime();
    const computed = Math.min(max, Math.floor(elapsed / msPerStage));
    if (computed > cell.growth) {
      cell.growth = computed;
      dirty = true;
    }
  }
  if (dirty) garden.markModified('cells');
  return dirty;
}

/** Returns remaining time string until fully grown. */
function timeUntilReady(cell) {
  if (!cell.plant || !cell.isWatered || !cell.plantedAt) return null;
  if (isReady(cell)) return null;
  const seedCfg = SEEDS[cell.seedType];
  if (!seedCfg) return null;
  const totalMs  = (seedCfg.growth_hours || 8) * 3600000;
  const elapsed = Date.now() - new Date(cell.plantedAt).getTime();
  const remaining = totalMs - elapsed;
  if (remaining <= 0) return 'ngay bây giờ';
  const h = Math.floor(remaining / 3600000);
  const m = Math.ceil((remaining % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function isBugVisible(cell, now) {
  if (!cell.plant || !cell.hasBug || cell.immune) return false;
  const ap = cell.bugAppearsAt ? new Date(cell.bugAppearsAt).getTime() : null;
  const dp = cell.bugDestroyAt ? new Date(cell.bugDestroyAt).getTime() : null;
  return ap && ap <= now && !(dp && dp <= now);
}

function getCellEmoji(cell, now) {
  if (!cell.plant) return '🟫';
  if (isBugVisible(cell, now)) return cell.bugType || '🐛';
  if (isReady(cell)) return cell.plant;                  // actual plant = harvestable
  const f = cell.growth / maxGrowth(cell);               // progress 0→1
  if (f < 0.34) return GROWTH_EMOJIS[0];                // 🌱
  if (f < 0.67) return GROWTH_EMOJIS[1];                // 🌿
  return GROWTH_EMOJIS[2];                               // 🌾
}

const getCellStyle = (cell, now) => {
  if (!cell.plant)           return ButtonStyle.Secondary;
  if (isBugVisible(cell, now)) return ButtonStyle.Danger;
  if (isReady(cell))         return ButtonStyle.Success;
  if (!cell.isWatered)       return ButtonStyle.Secondary; // Dormant (Gray)
  return ButtonStyle.Primary;                             // Growing (Blue)
};

const isCellClickable = (cell, now) => isBugVisible(cell, now);

// ─── Bug Processor ─────────────────────────────────────────────────────────────

function processBugDestruction(garden) {
  const now = Date.now();
  let dirty = false;
  for (const cell of garden.cells) {
    if (!cell.plant || !cell.hasBug || cell.immune) continue;
    const dp = cell.bugDestroyAt ? new Date(cell.bugDestroyAt).getTime() : null;
    if (dp && dp <= now) { Object.assign(cell, emptyCell()); dirty = true; }
  }
  if (dirty) garden.markModified('cells');
  return dirty;
}

// ─── Daily Check-in ────────────────────────────────────────────────────────────

/**
 * Call at garden open. Returns { isNew, autoWatered }.
 * If new day and rain event is active → auto-water plants.
 */
function processDailyCheckin(garden) {
  if (!isNewDay(garden)) return { isNew: false, autoWatered: false };

  garden.totalDays = (garden.totalDays || 0) + 1;
  garden.lastCheckinDate = new Date();

  // Rain event: auto-water for today
  let autoWatered = false;
  if (garden.activeEvent?.eventType === 'rain') {
    doWater(garden);
    clearActiveEvent(garden);
    autoWatered = true;
  }

  garden.markModified('activeEvent');
  return { isNew: true, autoWatered };
}

// ─── Core Actions ──────────────────────────────────────────────────────────────

/**
 * Internal water: set isWatered = true and plantedAt = now for all dry plants.
 */
function doWater(garden) {
  const now = Date.now();
  const isSunny = garden.nextWaterDoubled;
  garden.nextWaterDoubled = false;

  for (const cell of garden.cells) {
    if (cell.plant && !cell.isWatered) {
      cell.isWatered = true;
      if (isSunny) {
        // Sunny event: plant gets instantly boosted to 50% growth progress
        const seedCfg = SEEDS[cell.seedType];
        const totalMs = (seedCfg?.growth_hours || 8) * 3600000;
        cell.plantedAt = new Date(now - totalMs / 2);
      } else {
        cell.plantedAt = new Date(now);
      }
      cell.growth = 0;
    }
  }
  garden.lastWateredDate = new Date();
  garden.markModified('cells');
}

function clearActiveEvent(garden) {
  garden.activeEvent = { eventType: null, name: null, emoji: null };
}

/** Plant a seed of given type in a random empty cell. */
function actionPlant(garden, seedType) {
  const seedCfg = SEEDS[seedType];
  if (!seedCfg) return { ok: false, msg: '❌ Loại hạt giống không hợp lệ.' };

  const inv = garden.inventory[seedType] || 0;
  if (inv <= 0) return { ok: false, msg: `❌ Không có **${seedCfg.name}**! Mua thêm ở 🛒 Cửa hàng.` };

  const empties = garden.cells.reduce((a, c, i) => { if (!c.plant) a.push(i); return a; }, []);
  if (empties.length === 0) return { ok: false, msg: '❌ Khu vườn đã đầy! Thu hoạch để trồng thêm.' };

  const idx   = empties[Math.floor(Math.random() * empties.length)];
  const plant = seedCfg.plants[Math.floor(Math.random() * seedCfg.plants.length)];
  const now   = Date.now();
  const cell  = garden.cells[idx];

  Object.assign(cell, emptyCell());
  cell.plant    = plant;
  cell.seedType = seedType;

  // Rain event: automatically water upon planting
  const isRain = garden.activeEvent?.eventType === 'rain';
  if (isRain) {
    cell.isWatered = true;
    cell.plantedAt = new Date();
  } else {
    cell.isWatered = false;
    cell.plantedAt = null;
  }

  garden.inventory[seedType] -= 1;
  garden.markModified('inventory');

  if (Math.random() < BUG_CHANCE) {
    const appearsAt = new Date(now + rand(BUG_APPEAR_MIN, BUG_APPEAR_MAX));
    cell.hasBug      = true;
    cell.bugType     = BUGS[Math.floor(Math.random() * BUGS.length)];
    cell.bugAppearsAt  = appearsAt;
    cell.bugDestroyAt  = new Date(appearsAt.getTime() + rand(BUG_DESTROY_MIN, BUG_DESTROY_MAX));
  }

  garden.markModified('cells');
  return { ok: true, idx, plant, seedType, isRain };
}

/** Water all plants — free, no cooldown. */
function actionWater(garden) {
  const hasPlants = garden.cells.some(c => c.plant);
  if (!hasPlants) return { ok: false, msg: '❌ Chưa có cây nào trong vườn!' };

  const hasUnwatered = garden.cells.some(c => c.plant && !c.isWatered);
  if (!hasUnwatered) return { ok: false, msg: '💧 Tất cả cây đều đã được tưới!' };

  doWater(garden);
  return { ok: true };
}

/** Harvest all ready plants. Earnings go to User.coke. */
async function actionHarvest(garden, userId) {
  const ready = garden.cells.filter(c => isReady(c));
  if (ready.length === 0) return { ok: false, msg: '❌ Chưa có cây nào sẵn sàng thu hoạch!' };

  const isLucky = garden.luckyHarvestActive || garden.activeEvent?.eventType === 'lucky';
  let total = 0;

  for (const cell of garden.cells) {
    if (!isReady(cell)) continue;
    const seedCfg = SEEDS[cell.seedType] || SEEDS.vegetable;
    let earn = rand(seedCfg.harvest_min, seedCfg.harvest_max);
    if (isLucky) earn *= 2;
    total += earn;
    Object.assign(cell, emptyCell());
  }

  garden.totalEarned = (garden.totalEarned || 0) + total;

  if (isLucky) {
    garden.luckyHarvestActive = false;
    if (garden.activeEvent?.eventType === 'lucky') clearActiveEvent(garden);
    garden.markModified('activeEvent');
  }

  garden.markModified('cells');

  await User.updateOne({ userId }, { $inc: { coke: total } });
  return { ok: true, count: ready.length, earned: total, isLucky };
}

/** Catch a bug on a cell. */
function actionCatchBug(garden, cellIdx) {
  const now  = Date.now();
  const cell = garden.cells[cellIdx];
  if (!cell?.plant || !isBugVisible(cell, now)) return { ok: false };
  cell.hasBug = false;
  cell.bugType = cell.bugAppearsAt = cell.bugDestroyAt = null;
  cell.immune  = true;
  garden.markModified('cells');
  return { ok: true, plant: cell.plant };
}

/** Buy seeds from shop. Deduct coke from User. */
async function actionBuySeeds(garden, userId, seedType) {
  const seedCfg = SEEDS[seedType];
  if (!seedCfg) return { ok: false, msg: '❌ Loại hạt giống không hợp lệ.' };

  const user = await User.findOne({ userId });
  if (!user) return { ok: false, msg: '❌ Không tìm thấy tài khoản.' };

  const price = seedCfg.pack_price;
  if (user.coke < price) {
    return { ok: false, msg: `❌ Không đủ ${config.emoji.money}! Cần **${price.toLocaleString()}** để mua **${seedCfg.name} x${seedCfg.pack_size}**.` };
  }

  await User.updateOne({ userId }, { $inc: { coke: -price } });
  garden.inventory[seedType] = (garden.inventory[seedType] || 0) + seedCfg.pack_size;
  garden.markModified('inventory');

  return { ok: true, seedCfg, cokeLeft: user.coke - price };
}

// ─── Random Event ──────────────────────────────────────────────────────────────

function tryTriggerEvent(garden) {
  if (Math.random() > gardenCfg.event_chance) return null;
  if (garden.activeEvent?.eventType) return null;

  const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];

  if (ev.type === 'rainbow') {
    for (const cell of garden.cells) {
      if (cell.plant && !isReady(cell)) cell.growth = Math.min(maxGrowth(cell), cell.growth + 1);
    }
    garden.markModified('cells');
  } else if (ev.type === 'sunny') {
    garden.nextWaterDoubled = true;
  } else if (ev.type === 'rain') {
    // Auto-water immediately (bonus, even if already watered)
    doWater(garden);
    // event clears itself after use (no persistent state needed)
    return ev; // don't set activeEvent for rain; it's instant
  } else if (ev.type === 'lucky') {
    garden.luckyHarvestActive = true;
    garden.activeEvent = { eventType: 'lucky', name: ev.name, emoji: ev.emoji };
    garden.markModified('activeEvent');
  }

  return ev;
}

// ─── UI Builder ────────────────────────────────────────────────────────────────

function buildGardenUI(garden, username, cokeBalance, opts = {}) {
  const now           = Date.now();
  const { triggerEvent, isNewDay: newDay, autoWatered, mode = 'garden' } = opts;

  const plantCount = garden.cells.filter(c => c.plant).length;
  const readyCount = garden.cells.filter(c => isReady(c)).length;
  const bugCount   = garden.cells.filter(c => isBugVisible(c, now)).length;
  const hasUnwatered = garden.cells.some(c => c.plant && !c.isWatered);

  // ── Header
  const inv = garden.inventory;
  const headerLines = [
    `### 🌻 ${username}'s Garden  •  📅 Ngày **${garden.totalDays || 1}**`,
    ``,
    `${config.emoji.money} **Coke:** \`${cokeBalance.toLocaleString()}\`  🌱 **Đất:** \`${plantCount}/25\`  🌾 **Sẵn sàng:** \`${readyCount}\``,
    `🌿 \`${inv.vegetable || 0}\`  🌸 \`${inv.flower || 0}\`  🍎 \`${inv.fruit || 0}\``,
  ];

  if (hasUnwatered)            headerLines.push(``, `⚠️ **Có cây chưa được tưới nước!** Hãy tưới nước để bắt đầu mọc.`);
  if (autoWatered)             headerLines.push(``, `🌧️ **Cơn mưa đã tự động tưới cây cho bạn!**`);
  if (bugCount > 0)            headerLines.push(``, `⚠️ **${bugCount} con sâu!** Bấm ô 🔴 để bắt.`);
  if (garden.nextWaterDoubled) headerLines.push(``, `☀️ Lần tưới tiếp theo sẽ **x2** hiệu quả (tiến độ 50% lập tức)!`);

  const activeEv = garden.activeEvent?.eventType;
  if (activeEv) {
    const ev = EVENTS.find(e => e.type === activeEv);
    if (ev) headerLines.push(``, `${ev.emoji} **Sự kiện: ${ev.name}** — ${ev.desc}`);
  }
  if (triggerEvent) {
    headerLines.push(``, `✨ **Sự kiện xuất hiện!** ${triggerEvent.emoji} **${triggerEvent.name}** — ${triggerEvent.desc}`);
  }

  const textHeader = new TextDisplayBuilder().setContent(headerLines.join('\n'));

  // ── Grid (5×5)
  const gridRows = [];
  for (let row = 0; row < 5; row++) {
    const ar = new ActionRowBuilder();
    for (let col = 0; col < 5; col++) {
      const idx  = row * 5 + col;
      const cell = garden.cells[idx];
      ar.addComponents(
        new ButtonBuilder()
          .setCustomId(`garden_cell_${idx}`)
          .setLabel(getCellEmoji(cell, now))
          .setStyle(getCellStyle(cell, now))
          .setDisabled(!isCellClickable(cell, now))
      );
    }
    gridRows.push(ar);
  }

  // ── Action / Mode rows
  const hasEmpty   = garden.cells.some(c => !c.plant);
  const hasSeeds   = SEED_KEYS.some(k => (inv[k] || 0) > 0);
  const hasPlants  = garden.cells.some(c => c.plant);
  const canHarvest = readyCount > 0;

  let actionRow1, actionRow2;

  if (mode === 'select_seed') {
    // Seed selection row
    actionRow1 = new ActionRowBuilder().addComponents(
      ...SEED_KEYS.map(key => {
        const s = SEEDS[key];
        const count = inv[key] || 0;
        return new ButtonBuilder()
          .setCustomId(`garden_select_${key}`)
          .setLabel(`${s.emoji} ${s.name} (${count})`)
          .setStyle(count > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(count === 0 || !hasEmpty);
      }),
      new ButtonBuilder().setCustomId('garden_cancel_plant').setLabel('❌ Huỷ').setStyle(ButtonStyle.Secondary)
    );
    actionRow2 = null;
  } else {
    actionRow1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('garden_plant')
        .setLabel('🌱 Trồng')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!hasEmpty || !hasSeeds),
      new ButtonBuilder()
        .setCustomId('garden_water')
        .setLabel('💧 Tưới nước')
        .setStyle(hasUnwatered ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(!hasUnwatered),
      new ButtonBuilder()
        .setCustomId('garden_harvest')
        .setLabel(canHarvest ? `🚩 Thu hoạch (${readyCount})` : '🚩 Thu hoạch')
        .setStyle(canHarvest ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(!canHarvest)
    );
    actionRow2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('garden_shop').setLabel('🛒 Cửa hàng').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('garden_refresh').setLabel('🔄 Làm mới').setStyle(ButtonStyle.Secondary)
    );
  }

  // ── Legend
  const legend = new TextDisplayBuilder().setContent(
    `-# 🌱 Mầm → 🌿 Chồi → 🌾 Nở → 🌸🌽🍎 Sẵn sàng (xanh)  |  🔴 = Sâu, bấm để bắt!`
  );

  // ── Assemble
  const container = new ContainerBuilder()
    .setAccentColor(0x57F287)
    .addTextDisplayComponents(textHeader)
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  for (const gr of gridRows) container.addActionRowComponents(gr);

  container
    .addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(legend)
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addActionRowComponents(actionRow1);

  if (actionRow2) container.addActionRowComponents(actionRow2);

  return container;
}

function buildShopUI(garden, cokeBalance) {
  const lines = [
    `### 🛒 Cửa hàng Hạt Giống`,
    ``,
    `${config.emoji.money} **Coke của bạn:** \`${cokeBalance.toLocaleString()}\``,
    ``,
    ...SEED_KEYS.map(key => {
      const s   = SEEDS[key];
      const inv = garden.inventory[key] || 0;
      return `${s.emoji} **${s.name}**  •  x${s.pack_size} gói — **${s.pack_price.toLocaleString()}** ${config.emoji.money}  *(đang có: ${inv})*`;
    }),
    ``,
    `-# Mỗi lần mua = +${SEEDS.vegetable.pack_size} hạt của loại đó.`,
  ];

  const text = new TextDisplayBuilder().setContent(lines.join('\n'));

  const buyRow = new ActionRowBuilder().addComponents(
    ...SEED_KEYS.map(key => {
      const s = SEEDS[key];
      return new ButtonBuilder()
        .setCustomId(`garden_buy_${key}`)
        .setLabel(`${s.emoji} Mua (${s.pack_price.toLocaleString()}💰)`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(cokeBalance < s.pack_price);
    })
  );

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('garden_back').setLabel('↩️ Quay lại').setStyle(ButtonStyle.Secondary)
  );

  return new ContainerBuilder()
    .setAccentColor(0xFEE75C)
    .addTextDisplayComponents(text)
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addActionRowComponents(buyRow)
    .addActionRowComponents(backRow);
}

// ─── Command Export ─────────────────────────────────────────────────────────────

module.exports = {
  name: 'garden',
  aliases: ['farm', 'gr', 'vuon'],
  category: 'gamble',
  data: new SlashCommandBuilder()
    .setName('garden')
    .setDescription('🌻 Trồng cây, tưới nước, bắt sâu và thu hoạch! Minigame farming thư giãn.'),

  async execute(context) {
    const isSlash  = !context.author;
    const userId   = isSlash ? context.user.id   : context.author.id;
    const username = isSlash
      ? (context.user.displayName   || context.user.username)
      : (context.author.displayName || context.author.username);

    // ── Load or create garden
    let garden = await Garden.findOne({ userId });
    if (!garden) {
      garden = new Garden({
        userId,
        cells: Array(25).fill(null).map(() => emptyCell()),
        inventory: { vegetable: 0, flower: 0, fruit: 0 }
      });
    }

    // ── Load user coke balance
    let userDoc = await User.findOne({ userId });
    if (!userDoc) {
      return context.reply({ content: '❌ Bạn chưa có tài khoản! Hãy chat trong server để tạo tài khoản.', ephemeral: true });
    }

    // ── Process bugs, growth & daily check-in
    processBugDestruction(garden);
    updateGrowthFromTime(garden);
    const { isNew, autoWatered } = processDailyCheckin(garden);

    garden.lastActive = new Date();
    await garden.save();

    // ── Initial render
    let mode = 'garden';
    const payload = (container) => ({
      embeds: [], content: null,
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      skipV2: true
    });

    const renderGarden = (opts = {}) =>
      buildGardenUI(garden, username, userDoc?.coke ?? 0, { ...opts, mode });

    let replyMsg;
    const initContainer = renderGarden({ isNewDay: isNew, autoWatered });
    if (isSlash) {
      replyMsg = await context.reply({ ...payload(initContainer), fetchReply: true });
    } else {
      replyMsg = await context.reply(payload(initContainer));
    }

    // ── Collector
    const VALID_IDS = new Set([
      'garden_plant','garden_water','garden_harvest','garden_shop',
      'garden_back','garden_refresh','garden_cancel_plant',
      ...SEED_KEYS.map(k => `garden_select_${k}`),
      ...SEED_KEYS.map(k => `garden_buy_${k}`)
    ]);

    const filter = (i) =>
      i.user.id === userId &&
      (i.customId.startsWith('garden_cell_') || VALID_IDS.has(i.customId));

    const collector = replyMsg.createMessageComponentCollector({
      filter, componentType: ComponentType.Button, time: TTL
    });

    collector.on('collect', async (i) => {
      await i.deferUpdate().catch(() => {});

      // Reload state
      garden  = await Garden.findOne({ userId });
      userDoc = await User.findOne({ userId });
      if (!garden || !userDoc) return;

      processBugDestruction(garden);
      updateGrowthFromTime(garden);

      const cid = i.customId;
      let trigEvent = null;

      // ── Route action
      if (cid === 'garden_shop') {
        mode = 'shop';

      } else if (cid === 'garden_back') {
        mode = 'garden';

      } else if (cid === 'garden_refresh') {
        // just re-render

      } else if (cid === 'garden_plant') {
        mode = 'select_seed';

      } else if (cid === 'garden_cancel_plant') {
        mode = 'garden';

      } else if (cid.startsWith('garden_select_')) {
        const seedType = cid.replace('garden_select_', '');
        const res = actionPlant(garden, seedType);
        if (!res.ok) {
          await i.followUp({ content: res.msg, ephemeral: true }).catch(() => {});
        } else {
          trigEvent = tryTriggerEvent(garden);
        }
        mode = 'garden';

      } else if (cid === 'garden_water') {
        const res = actionWater(garden);
        if (!res.ok) {
          await i.followUp({ content: res.msg, ephemeral: true }).catch(() => {});
        } else {
          trigEvent = tryTriggerEvent(garden);
        }

      } else if (cid === 'garden_harvest') {
        const res = await actionHarvest(garden, userId);
        if (!res.ok) {
          await i.followUp({ content: res.msg, ephemeral: true }).catch(() => {});
        } else {
          // Refresh userDoc after harvest
          userDoc = await User.findOne({ userId });
          trigEvent = tryTriggerEvent(garden);
          if (res.isLucky) {
            await i.followUp({
              content: `🍀 **Ngày May!** Thu hoạch **${res.count}** cây, nhận **${res.earned.toLocaleString()}** ${config.emoji.money} (x2)!`,
              ephemeral: true
            }).catch(() => {});
          }
        }

      } else if (cid.startsWith('garden_buy_')) {
        const seedType = cid.replace('garden_buy_', '');
        const res = await actionBuySeeds(garden, userId, seedType);
        if (!res.ok) {
          await i.followUp({ content: res.msg, ephemeral: true }).catch(() => {});
        } else {
          userDoc = await User.findOne({ userId });
          await i.followUp({
            content: `✅ Đã mua **${res.seedCfg.name} x${res.seedCfg.pack_size}**! Còn lại: \`${(res.cokeLeft).toLocaleString()}\` ${config.emoji.money}`,
            ephemeral: true
          }).catch(() => {});
        }

      } else if (cid.startsWith('garden_cell_')) {
        const idx = parseInt(cid.split('_')[2]);
        const res = actionCatchBug(garden, idx);
        if (res.ok) {
          await i.followUp({
            content: `✅ Bắt sâu thành công! Cây ${res.plant} được cứu và miễn nhiễm từ nay.`,
            ephemeral: true
          }).catch(() => {});
        }
      }

      garden.lastActive = new Date();
      await garden.save().catch(console.error);

      // ── Re-render
      let container;
      if (mode === 'shop') {
        container = buildShopUI(garden, userDoc?.coke ?? 0);
      } else {
        container = buildGardenUI(garden, username, userDoc?.coke ?? 0, { triggerEvent: trigEvent, mode });
      }

      await i.editReply(payload(container)).catch(() => {});
    });
  }
};
