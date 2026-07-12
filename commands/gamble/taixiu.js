const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");
const TaixiuState = require("../../models/TaixiuState");
const { startTaixiuLoop } = require("../../features/taixiuEngine");
const config = require("../../data/config");

module.exports = {
  name: "taixiu",
  aliases: ["tx", "sicbo"],
  category: "gamble",
  data: new SlashCommandBuilder()
    .setName("taixiu")
    .setDescription("Quản lý phòng Casino Tài Xỉu 24/7.")
    .addSubcommand(subcommand =>
      subcommand
        .setName("setchannel")
        .setDescription("Thiết lập kênh làm phòng cược Tài Xỉu 24/7.")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Kênh Discord muốn thiết lập làm phòng cược.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    ),

  async execute(context, args = [], client) {
    const isSlash = !context.author;
    const userId = isSlash ? context.user.id : context.author.id;
    const guild = isSlash ? context.guild : context.guild;
    const member = isSlash ? context.member : context.member;

    if (!guild) {
      return context.reply({
        content: "❌ Lệnh này chỉ có thể sử dụng trong Server Discord.",
        ephemeral: true
      });
    }

    // Permission Check: Owner or Administrator
    const isDev = config.permissions?.dev_ids?.includes(userId) || userId === process.env.OWNER_ID;
    const isOwner = userId === guild.ownerId;
    const isAdmin = member?.permissions.has(PermissionFlagsBits.Administrator);

    if (!isDev && !isOwner && !isAdmin) {
      return context.reply({
        content: "❌ Chỉ Quản trị viên (Administrator) mới có quyền thiết lập kênh cược Tài Xỉu.",
        ephemeral: true
      });
    }

    // Determine subcommand
    let sub = "";
    if (isSlash) {
      sub = context.options.getSubcommand();
    } else {
      sub = (args[0] || "").toLowerCase();
    }

    if (sub !== "setchannel") {
      return context.reply({
        content: `💡 Hướng dẫn sử dụng:\n- Gõ \`/taixiu setchannel [channel]\` hoặc \`${config.prefix}taixiu setchannel\` để tạo phòng cược Tài Xỉu 24/7 tại kênh hiện tại.`,
        ephemeral: true
      });
    }

    // Get target channel
    let targetChannel = null;
    if (isSlash) {
      targetChannel = context.options.getChannel("channel") || context.channel;
    } else {
      const mention = context.mentions.channels.first();
      if (mention) {
        targetChannel = mention;
      } else {
        const idArg = args[1];
        if (idArg) {
          targetChannel = guild.channels.cache.get(idArg) || null;
        }
      }
      if (!targetChannel) {
        targetChannel = context.channel;
      }
    }

    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
      return context.reply({
        content: "❌ Kênh được chọn phải là kênh văn bản thông thường (Text Channel).",
        ephemeral: true
      });
    }

    await context.reply({
      content: `⏳ Đang thiết lập phòng Tài Xỉu tại kênh <#${targetChannel.id}>...`,
      ephemeral: true
    }).catch(() => {});

    try {
      let state = await TaixiuState.findOne({ channelId: targetChannel.id });
      if (!state) {
        state = new TaixiuState({
          channelId: targetChannel.id,
          round: 1,
          status: "betting",
          countdown: 60
        });
      } else {
        // Reset state
        state.status = "betting";
        state.countdown = 60;
        state.taiPool = 0;
        state.xiuPool = 0;
        state.playersTai = new Map();
        state.playersXiu = new Map();
      }

      // Initial clean-up of messageId to let the engine send a fresh post
      state.messageId = null;
      await state.save();

      // Start loop
      startTaixiuLoop(client, targetChannel.id);

      if (isSlash) {
        await context.followUp({
          content: `✅ Đã khởi tạo thành công phòng cược Tài Xỉu 24/7 tại kênh <#${targetChannel.id}>!`,
          ephemeral: true
        }).catch(() => {});
      } else {
        await context.channel.send(`✅ Đã khởi tạo thành công phòng cược Tài Xỉu 24/7 tại kênh <#${targetChannel.id}>!`);
      }

    } catch (err) {
      console.error("Lỗi khi thiết lập kênh Tài Xỉu:", err);
      if (isSlash) {
        await context.followUp({
          content: "❌ Đã có lỗi xảy ra trong quá trình thiết lập. Vui lòng kiểm tra log.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
};
