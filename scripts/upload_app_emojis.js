require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`🤖 Bot đã đăng nhập thành công với tên: ${client.user.tag}`);

  try {
    const dir = path.join(__dirname, '..', 'assets', 'cards_flip');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.gif'));

    console.log(`🚀 Đang tải danh sách Application Emojis (Emoji của Bot)...`);
    const appEmojis = await client.application.emojis.fetch();
    console.log(`📦 Đã tìm thấy ${appEmojis.size} Application Emojis hiện có của Bot.`);

    console.log(`🔄 Đang tự động cập nhật ${files.length} file GIF lật bài siêu nhẹ lên Bot...`);

    const emojiMap = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = path.basename(file, '.gif');
      const filePath = path.join(dir, file);

      // Check if emoji already exists in Application Emojis
      const existing = appEmojis.find(e => e.name === name);
      if (existing) {
        await existing.delete().catch((e) => console.error(`Lỗi xóa ${name}:`, e.message));
        console.log(`[${i + 1}/${files.length}] 🔄 Đã xóa Emoji Bot cũ: ${name}`);
      }

      const created = await client.application.emojis.create({ attachment: filePath, name: name });
      console.log(`[${i + 1}/${files.length}] ✅ Đã tạo Emoji Bot mới: ${name} -> <a:${created.name}:${created.id}>`);

      const keyLower = name;
      const keyUpper = name.charAt(0).toUpperCase() + name.slice(1);
      const tag = `<a:${created.name}:${created.id}>`;
      emojiMap[keyLower] = tag;
      emojiMap[keyUpper] = tag;
    }

    console.log("\n🎉 Đã cập nhật xong 100% Application Emojis cho Bot!");

    // Automatically update data/config.js
    const configPath = path.join(__dirname, '..', 'data', 'config.js');
    let configFile = fs.readFileSync(configPath, 'utf8');

    let updatedCount = 0;
    for (const [k, v] of Object.entries(emojiMap)) {
      const regex = new RegExp(`("${k}":\\s*")<a:[^:]+:\\d+>("|')`, 'g');
      if (regex.test(configFile)) {
        configFile = configFile.replace(regex, `$1${v}$2`);
        updatedCount++;
      }
    }

    fs.writeFileSync(configPath, configFile, 'utf8');
    console.log(`✅ Đã tự động cập nhật ${updatedCount} mã Emoji mới trực tiếp vào data/config.js!`);

  } catch (err) {
    console.error("❌ Có lỗi xảy ra khi cập nhật Application Emojis:", err);
  } finally {
    client.destroy();
  }
});

client.login(process.env.TOKEN);
