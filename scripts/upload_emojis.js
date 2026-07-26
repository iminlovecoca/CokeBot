require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const guildId = process.argv[2];

if (!guildId) {
  console.log("❌ Vui lòng truyền ID server (Guild ID).");
  console.log("Ví dụ: node scripts/upload_emojis.js 123456789012345678");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`🤖 Bot đã đăng nhập với tên ${client.user.tag}`);

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    console.log(`❌ Bot không tìm thấy server với ID: ${guildId}`);
    process.exit(1);
  }

  const dir = path.join(__dirname, '..', 'assets', 'cards_flip');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.gif'));

  console.log(`🚀 Đang upload ${files.length} emoji GIF lật bài lên server "${guild.name}"...`);

  const emojiMap = {};

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = path.basename(file, '.gif');
    const filePath = path.join(dir, file);

    try {
      // Check if emoji already exists on guild
      let existing = guild.emojis.cache.find(e => e.name === name);
      if (existing) {
        await existing.delete().catch(() => {});
        console.log(`[${i + 1}/${files.length}] 🔄 Đã xóa emoji cũ: ${name}`);
      }

      const created = await guild.emojis.create({ attachment: filePath, name: name });
      console.log(`[${i + 1}/${files.length}] ✅ Đã tải lên emoji mới: ${name} -> <a:${created.name}:${created.id}>`);
      emojiMap[name] = `<a:${created.name}:${created.id}>`;
    } catch (err) {
      console.error(`[${i + 1}/${files.length}] ❌ Lỗi upload emoji ${name}:`, err.message);
    }
  }

  console.log("\n🎉 Đã upload hoàn tất toàn bộ emoji!");
  console.log("\n📋 Mã Emoji để dán vào file data/config.js (emoji: { ... }):");
  console.log(JSON.stringify(emojiMap, null, 2));

  client.destroy();
});

client.login(process.env.TOKEN);
