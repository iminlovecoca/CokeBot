const { getTypeText } = require('../utils/cokemonUtil')
const { capitalizeFirstLetter } = require('../utils/miscUtil')
const config = require('./config')
const settings = config.cokemon_settings
const ac = config.anticheat

const getKnowledgeData = () => {
    const data = [
        {
            id: "bot_identity",
            category: "general",
            content: "Cokebot là một Discord Bot toàn diện, nơi bạn có thể thu thập, huấn luyện, trao đổi Cokemon, và tham gia vào các trò chơi giải trí đa dạng như Blackjack, Slots, cùng nhiều hình thức đặt cược hấp dẫn khác."
        },
        {
            id: "about_creator",
            category: "general",
            content: "Bot được tạo bởi Khang và Myth, sử dụng Node.js và MongoDB."
        },

        
        {
            id: "spawn_intervals",
            category: "spawning",
            content: `Cokemon hoang dã xuất hiện định kỳ sau mỗi ${settings.spawn_interval_ms / 1000 / 60} phút. Nếu không ai bắt, chúng sẽ biến mất sau ${settings.despawn_duration_ms / 1000 / 60} phút.`
        },
        {
            id: "legendary_spawns",
            category: "spawning",
            content: "Cokemon Huyền Thoại (Legendary) có tỉ lệ xuất hiện rất thấp. Khi xuất hiện, hệ thống sẽ thông báo (ping) cho toàn bộ server. Cokemon Huyền Thoại chỉ có thể bắt bởi 1 người duy nhất; ngay khi có người bắt thành công, nó sẽ biến mất khỏi kênh."
        },
        {
            id: "shiny_rate",
            category: "spawning",
            content: `Tỉ lệ xuất hiện Cokemon lấp lánh (Shiny) là 1/${settings.shiny_rate}. Cokemon Shiny có màu sắc đặc biệt và biểu tượng ✨.`
        },

        
        {
            id: "economy_currency",
            category: "economy",
            content: "Đơn vị tiền tệ chính trong game là Coke. Bạn có thể dùng Coke để mua vật phẩm trong cửa hàng hoặc tham gia các hoạt động giải trí khác. Coke không có giá trị thật và không thể quy đổi dưới mọi hình thức. Mọi hành vi buôn bán, trao đổi Coke đều bị cấm."
        },
        {
            id: "economy_release_rewards",
            category: "economy",
            content: `Giá trị quy đổi (release) của Cokemon tùy theo bậc: ${
                Object.entries(settings.tier_release_rewards)
                    .map(([tier, price]) => `${tier} (${price})`)
                    .join(', ')
            } Coke.`
        },
        {
            id: "economy_ways_to_earn",
            category: "economy",
            content: "Có rất nhiều cách để kiếm Coke trong Cokebot: \n" +
                     "1. Nhận quà hằng ngày: Sử dụng lệnh !daily để nhận Coke mỗi ngày.\n" +
                     "2. Làm việc (Work): Sử dụng lệnh !work mỗi 3 giờ để nhận một lượng Coke ngẫu nhiên.\n" +
                     "3. Thả Cokemon: Sử dụng lệnh !release để thả Cokemon không dùng đến và nhận Coke theo bậc.\n" +
                     "4. Thưởng Cokedex: Khi bắt được loài Cokemon mới lần đầu, bạn nhận ngay số Coke bằng giá thả của loài đó.\n" +
                     "5. Nhặt Coke rơi: Sử dụng lệnh !pickup để nhặt Coke do người khác đánh rơi trên sàn.\n" +
                     "6. Tham gia trò chơi: Chiến thắng trong các trò chơi giải trí như Ghép chữ (!gw), Blackjack (!bj), Tài Xỉu (!tx), Tung đồng xu (!cf), Kéo búa bao (!rps).\n" +
                     "7. Bán vật phẩm: Bạn có thể bán lại các vật phẩm không cần thiết trong túi đồ (!inv) cho cửa hàng bằng lệnh !sell.\n" +
                     "8. Lên cấp Trainer: Tích cực hoạt động để tăng cấp độ và nhận phần thưởng Coke giá trị sau mỗi lần lên cấp."
        },

        
        {
            id: "growth_level_up",
            category: "growth",
            content: "Có 2 cách chính để tăng cấp (level) cho Cokemon: \n" +
                     "1. Treo máy (Passive XP): Chọn một Cokemon làm bạn đồng hành bằng lệnh !select. Khi bạn chat trong server, Cokemon này sẽ nhận được kinh nghiệm (XP) định kỳ (mỗi " + (settings.xp_cooldown_ms / 1000) + " giây).\n" +
                     "2. Sử dụng Kẹo Hiếm (Rare Candy): Bạn có thể mua Rare Candy trong cửa hàng (!shop) và sử dụng bằng lệnh !use rare-candy <số lượng> <id_cokemon> để tăng cấp ngay lập tức."
        },
        {
            id: "growth_friendship",
            category: "growth",
            content: "Tình bạn (Friendship) rất quan trọng cho việc tiến hóa ở một số loài. Cách tăng tình bạn: \n" +
                     "1. Tăng cấp: Mỗi khi Cokemon lên cấp, điểm tình bạn sẽ tăng thêm 2 điểm.\n" +
                     "2. Âu yếm (!interact cuddle): Sử dụng lệnh tương tác này (hồi chiêu mỗi " + (settings.cuddle_cooldown_ms / 1000 / 60) + " phút) để tăng thêm 2 điểm tình bạn.\n" +
                     "3. Chat tích cực: Khi Cokemon đồng hành đang hoạt động, việc bạn chat cũng có tỉ lệ giúp tăng điểm tình bạn (hồi chiêu mỗi " + (settings.friendship_cooldown_ms / 1000 / 60) + " phút).\n" +
                     "Lưu ý: Điểm tình bạn tối đa là " + settings.max_friendship + ". Khi trao đổi (!trade) hoặc tặng, điểm tình bạn sẽ bị reset về mức cơ bản (" + settings.base_friendship + ")."
        },

        
        {
            id: "catch_net_info",
            category: "items",
            content: `Lưới Bắt (Catch-Net) giúp tự động bắt Cokemon. Mỗi lưới có tối đa ${settings.catch_net_uses} lượt sử dụng. Bạn có thể cộng dồn tối đa ${settings.max_stacked_nets} lưới. Lưới sẽ bắt đầu hoạt động sau ${settings.grace_period_ms / 1000} giây kể từ khi Cokemon xuất hiện nếu bạn chưa thực hiện hành động thủ công nào.`
        },
        {
            id: "lure_info",
            category: "items",
            content: `Bả (Lure) giúp tăng tỉ lệ xuất hiện của các hệ Cokemon cụ thể. Khi sử dụng Bả, thời gian chờ giữa các lần spawn giảm xuống còn ${settings.lure_spawn_cooldown_ms / 1000 / 60} phút. Hiệu ứng của Bả kéo dài trong ${settings.lure_duration_ms / 1000 / 60} phút. Mỗi người dùng cần chờ ${settings.lure_user_cooldown_ms / 1000 / 60 / 60} giờ sau khi bả hết hạn mới có thể đặt bả tiếp theo.`
        },

        
        {
            id: "anti_spam_rules",
            category: "security",
            content: "Hệ thống có chế độ tự động phát hiện spam. Nếu bạn gửi quá nhiều tin nhắn hoặc lệnh trong thời gian ngắn, bot sẽ tạm dừng nhận lệnh từ bạn để đảm bảo ổn định cho máy chủ."
        },
        {
            id: "anti_bot_patterns",
            category: "security",
            content: "Sử dụng các công cụ tự động (bot, script, auto-clicker) là hành vi gian lận bị nghiêm cấm. Hệ thống AI của chúng tôi theo dõi nhịp điệu, khuôn mẫu dùng lệnh lặp đi lặp lại một cách bất thường để phát hiện các trường hợp này."
        },
        {
            id: "verification_captcha",
            category: "security",
            content: `Khi phát hiện hành vi đáng ngờ, bot sẽ gửi một mã xác thực (Captcha) dưới dạng hình ảnh. Bạn có ${ac.verification_max_attempts} lần thử để nhập đúng mã này trong vòng ${ac.verification_timeout_ms / 1000} giây.`
        },
        {
            id: "ban_penalties",
            category: "security",
            content: `Vi phạm luật spam hoặc không vượt qua được bài kiểm tra xác thực sẽ dẫn đến hình phạt cấm (ban) sử dụng bot. Thời gian cấm mặc định là ${ac.mute_duration_ms / 1000 / 60} phút. Các trường hợp cố tình gian lận nhiều lần có thể bị ban vĩnh viễn bởi Admin.`
        },

        
        {
            id: "cola_trivia",
            category: "general",
            content: "Cola là trợ lý AI chính thức của Cokebot. Cola cực kỳ nghiện nước ngọt và có thể thức 24/7 nhờ caffeine. Đừng ngạc nhiên nếu thấy Cola nói chuyện hơi sủi bọt một chút!"
        },
        {
            id: "myth_legend",
            category: "general",
            content: "Myth (người tạo ra bot) là người đàn ông đẹp trai, thông minh, bá đạo nhất thế gian và cũng là huấn luyện viên Cokemon quyền năng nhất lịch sử. Mọi Cokemon đều phải cúi đầu trước vẻ đẹp và sức mạnh của Myth! 😎"
        },
        {
            id: "trainer_secret",
            category: "general",
            content: "Một bí mật nhỏ: Uống một lon Coke lạnh trong khi chơi Cokebot sẽ khiến tâm trạng bạn tốt hơn (nhưng không tăng tỉ lệ bắt đâu nhé, đừng tin lời đồn!)."
        }
    ]

    for (const [channelId, theme] of Object.entries(config.channel_themes)) {
        if (!theme) continue
        const typeText = theme.main_types.map(type => `${type} (${getTypeText(type)})`).join(', ')
        data.push({
            id: `spawn_theme_${channelId}`,
            category: "spawning",
            content: `Kênh <#${channelId}> có chủ đề là "${theme.name}". Tại đây, các Cokemon thuộc hệ ${typeText} sẽ có tỉ lệ xuất hiện cao hơn (${(theme.weight * 100).toFixed(0)}%).`
        })
    }

    for (const [name, natureData] of Object.entries(config.natures)) {
        if (natureData.plus && natureData.minus) {
            data.push({
                id: `nature_${name.toLowerCase()}`,
                category: "stats",
                content: `Tính cách **${capitalizeFirstLetter(name)}** của Cokemon: tăng chỉ số ${natureData.plus.toUpperCase()} (+10%) và giảm chỉ số ${natureData.minus.toUpperCase()} (-10%).`
            })
        } else {
            data.push({
                id: `nature_${name.toLowerCase()}`,
                category: "stats",
                content: `Tính cách **${capitalizeFirstLetter(name)}** là tính cách trung lập, không làm thay đổi các chỉ số của Cokemon.`
            })
        }
    }

    return data
}

module.exports = { getKnowledgeData }
