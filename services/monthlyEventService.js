const cron = require("node-cron");
const { DateTime } = require("luxon");
const { TIMEZONE } = require("../utils/dateUtil");
const { isMonthlyEventActive } = require("../utils/eventUtil");
const { formatEventFaqAnnouncement } = require("../data/event");
const MonthlyEventState = require("../models/MonthlyEventState");

class MonthlyEventService {
  constructor(locator = null) {
    this.locator = locator;
    this.client = null;
    this.cronTask = null;
  }

  /**
   * Initializes the service and starts the periodic scheduler.
   * @param {object} client - Discord Client
   */
  async initialize(client) {
    this.client = client;
    if (this.cronTask) {
      this.cronTask.stop();
    }

    // Check on startup if event is currently active and needs announcement
    await this.checkAndAnnounce().catch((err) => {
      console.error("[MONTHLY_EVENT] Startup announcement check error:", err);
    });

    // Schedule check every 30 minutes to ensure boundary at midnight 00:00 on Day 1 is triggered
    this.cronTask = cron.schedule("*/30 * * * *", () => {
      this.checkAndAnnounce().catch((err) => {
        console.error("[MONTHLY_EVENT] Scheduled announcement error:", err);
      });
    }, { timezone: TIMEZONE });

    console.log("[MONTHLY_EVENT] Monthly Event Service initialized with scheduler.");
  }

  /**
   * Checks if the monthly event is active and hasn't been announced this month yet.
   */
  async checkAndAnnounce() {
    if (!this.client) return;
    if (!isMonthlyEventActive()) return;

    let state = await MonthlyEventState.findById("monthly_event");
    if (!state) {
      state = await MonthlyEventState.create({ _id: "monthly_event" });
    }

    const now = DateTime.now().setZone(TIMEZONE);
    const currentMonthKey = now.toFormat("yyyy-MM");

    // If already announced for this month, skip
    if (state.lastAnnouncedMonth === currentMonthKey) {
      return;
    }

    // Find target channel
    let targetChannel = null;
    if (state.announcementChannelId) {
      targetChannel = await this.client.channels.fetch(state.announcementChannelId).catch(() => null);
    }

    // If no channel specifically configured, find first available announcement/general text channel
    if (!targetChannel) {
      for (const guild of this.client.guilds.cache.values()) {
        const sysChannel = guild.systemChannel;
        if (sysChannel && sysChannel.isTextBased()) {
          targetChannel = sysChannel;
          break;
        }
      }
    }

    if (!targetChannel || !targetChannel.isTextBased()) {
      console.log(`[MONTHLY_EVENT] Event active for ${currentMonthKey}, but no valid announcement channel configured.`);
      return;
    }

    const messageContent = formatEventFaqAnnouncement(now);
    await targetChannel.send({ content: messageContent }).catch((err) => {
      console.error(`[MONTHLY_EVENT] Failed to send announcement to ${targetChannel.id}:`, err);
    });

    state.lastAnnouncedMonth = currentMonthKey;
    state.lastAnnouncedAt = new Date();
    await state.save();

    console.log(`📢 [MONTHLY_EVENT] Successfully announced Monthly Event for ${currentMonthKey} in #${targetChannel.name} (${targetChannel.id})!`);
  }

  /**
   * Sends announcement manually to a specific channel.
   * @param {string} channelId
   * @param {Date|DateTime} [date]
   */
  async broadcastToChannel(channelId, date = null) {
    if (!this.client) throw new Error("Client not initialized.");
    const channel = await this.client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      throw new Error(`Không tìm thấy kênh văn bản hợp lệ với ID ${channelId}!`);
    }

    const content = formatEventFaqAnnouncement(date);
    const sent = await channel.send({ content });

    // Update state to remember this channel and record announcement
    let state = await MonthlyEventState.findById("monthly_event");
    if (!state) {
      state = await MonthlyEventState.create({ _id: "monthly_event" });
    }
    const now = DateTime.now().setZone(TIMEZONE);
    state.lastAnnouncedMonth = now.toFormat("yyyy-MM");
    state.lastAnnouncedAt = new Date();
    state.announcementChannelId = channelId;
    await state.save();

    return sent;
  }

  /**
   * Configures the default announcement channel.
   * @param {string} channelId
   */
  async setChannel(channelId) {
    let state = await MonthlyEventState.findById("monthly_event");
    if (!state) {
      state = await MonthlyEventState.create({ _id: "monthly_event" });
    }
    state.announcementChannelId = channelId;
    await state.save();
    return state;
  }
}

module.exports = MonthlyEventService;
