const Item = require('../models/cokemon/Item')

const itemsData = [
	
	{
		item_id: 'catch-net',
		name: 'Lưới Bắt Tự Động',
		description: 'Tự động thử bắt 20 cokemon xuất hiện kế tiếp.',
		item_type: 'tool',
		price: 500,
		emoji: '🕸️',
		effects: {}
	},

	
	{
		item_id: 'lure-standard',
		name: 'Bả Cơ Bản',
		description: 'Tăng tỉ lệ xuất hiện cokemon trong 30 phút.',
		item_type: 'lure',
		price: 200,
		emoji: '✨',
		effects: {}
	},
	{
		item_id: 'lure-volcano',
		name: 'Bả Núi Lửa',
		description: 'Thu hút cokemon hệ Fire trong 30 phút.',
		item_type: 'lure',
		price: 300,
		emoji: '🌋',
		effects: { 'boosts_type': ['Fire'] }
	},
	{
		item_id: 'lure-frozen',
		name: 'Bả Băng Giá',
		description: 'Thu hút cokemon hệ Water và Ice trong 30 phút.',
		item_type: 'lure',
		price: 400,
		emoji: '🧊',
		effects: { 'boosts_type': ['Water', 'Ice'] }
	},
	{
		item_id: 'lure-cavern',
		name: 'Bả Hang Động',
		description: 'Thu hút cokemon hệ Rock, Ground và Dragon trong 30 phút.',
		item_type: 'lure',
		price: 550,
		emoji: '⛰️',
		effects: { 'boosts_type': ['Rock', 'Ground', 'Dragon'] }
	},
	{
		item_id: 'lure-power',
		name: 'Bả Năng Lượng',
		description: 'Thu hút cokemon hệ Electric, Psychic và Fairy trong 30 phút.',
		item_type: 'lure',
		price: 500,
		emoji: '⚡️',
		effects: { 'boosts_type': ['Electric', 'Psychic', 'Fairy'] }
	},
	{
		item_id: 'lure-forest',
		name: 'Bả Rừng Rậm',
		description: 'Thu hút cokemon hệ Grass, Bug, Flying và Poison trong 30 phút.',
		item_type: 'lure',
		price: 500,
		emoji: '🌳',
		effects: { 'boosts_type': ['Grass', 'Bug', 'Flying', 'Poison'] }
	},
	{
		item_id: 'lure-warlord',
		name: 'Bả Chiến Tướng',
		description: 'Thu hút cokemon hệ Fighting, Steel và Normal trong 30 phút.',
		item_type: 'lure',
		price: 500,
		emoji: '⚔️',
		effects: { 'boosts_type': ['Fighting', 'Steel', 'Nornal'] }
	},
	{
		item_id: 'lure-eerie',
		name: 'Bả Ma Quái',
		description: 'Thu hút cokemon hệ Dark và Ghost trong 30 phút.',
		item_type: 'lure',
		price: 450,
		emoji: '👻',
		effects: { 'boosts_type': ['Dark', 'Ghost'] }
	},

	
	{
		item_id: 'thunder-stone',
		name: 'Lôi Thạch',
		description: 'Một viên đá kỳ lạ với hoa văn tia sét đặc trưng. Nó có thể khiến một số loài Cokemon nhất định tiến hóa.',
		item_type: 'evolution_stone',
		price: 5000,
		emoji: '<:thunder_stone:1419643353099927553>',
		effects: {}
	},
	{
		item_id: 'moon-stone',
		name: 'Nguyệt Thạch',
		description: 'Một viên đá kỳ lạ, đen như màn đêm. Nó có thể khiến một số loài Cokemon tiến hóa.',
		item_type: 'evolution_stone',
		price: 5000,
		emoji: '<:moon_stone:1419643279070335088>',
		effects: {}
	},
	{
		item_id: 'fire-stone',
		name: 'Hỏa Thạch',
		description: 'Một viên đá kỳ lạ có chứa năng lượng lửa. Nó có thể khiến một số loài Cokemon tiến hóa.',
		item_type: 'evolution_stone',
		price: 5000,
		emoji: '<:fire_stone:1419643296384553082>',
		effects: {}
	},
	{
		item_id: 'leaf-stone',
		name: 'Diệp Thạch',
		description: 'Một viên đá kỳ lạ có khắc hình chiếc lá. Nó có thể khiến một số loài Cokemon tiến hóa.',
		item_type: 'evolution_stone',
		price: 5000,
		emoji: '<:leaf_stone:1419643372070633525>',
		effects: {}
	},
	{
		item_id: 'water-stone',
		name: 'Thuỷ Thạch',
		description: 'Một viên đá kỳ lạ có màu xanh như đại dương. Nó có thể khiến một số loài Cokemon tiến hóa.',
		item_type: 'evolution_stone',
		price: 5000,
		emoji: '<:water_stone:1419643326461775962>',
		effects: {}
	},
	{
		item_id: 'sun-stone',
		name: 'Nhật Thạch',
		description: 'Một viên đá kỳ lạ có màu đỏ rực như mặt trời. Nó có thể khiến một số loài cokemon tiến hóa.',
		item_type: 'evolution_stone',
		price: 5000,
		emoji: '<:sun_stone:1419643257041981481>',
		effects: {}
	},
	{
		item_id: 'dusk-stone',
		name: 'Hoàng Hôn Thạch',
		description: 'Một viên đá kỳ lạ tối như màn đêm. Nó có thể khiến một số loài Cokemon tiến hóa.',
		item_type: 'evolution_stone',
		price: 5000,
		emoji: '<:dusk_stone:1419643383567224931>',
		effects: {}
	},
	{
		item_id: 'dawn-stone',
		name: 'Bình Minh Thạch',
		description: 'Một viên đá kỳ lạ lấp lánh như một con mắt xinh đẹp. Nó có thể khiến một số loài Cokemon tiến hóa.',
		item_type: 'evolution_stone',
		price: 5000,
		emoji: '<:dawn_stone:1419643394162032641>',
		effects: {}
	},
	{
		item_id: 'shiny-stone',
		name: 'Minh Thạch',
		description: 'Một viên đá kỳ lạ lấp lánh rực rỡ. Nó có thể khiến một số loài Cokemon tiến hóa.',
		item_type: 'evolution_stone',
		price: 5500,
		emoji: '<:shiny_stone:1419643403733565635>',
		effects: {}
	},
	{
		item_id: 'ice-stone',
		name: 'Băng Thạch',
		description: 'Một viên đá kỳ lạ lạnh như một khối băng vĩnh cửu. Nó có thể khiến một số loài Cokemon tiến hóa.',
		item_type: 'evolution_stone',
		price: 5500,
		emoji: '<:ice_stone:1435842094089507007>',
		effects: {}
	},
	{
		item_id: 'prism-scale',
		name: 'Vảy Cầu Vồng',
		description: 'Một vảy có vầng sáng như cầu vồng. Nó là món đồ yêu thích của một loài Cokemon.',
		item_type: 'evolution_stone',
		price: 5500,
		emoji: '<:prism_scale:1419643438676312175>',
		effects: {}
	},

	
	{
		item_id: 'kings-rock',
		name: 'Vương Thạch',
		description: 'Một vật phẩm được giữ bởi Cokemon. Nó có thể khiến đối thủ nao núng khi bị tấn công',
		item_type: 'hold_item',
		price: 7000,
		emoji: '<:kings_rock:1435842099068141648>',
		effects: {}
	},
	{
		item_id: 'metal-coat',
		name: 'Vỏ Kim Loại',
		description: 'Một vật phẩm được giữ bởi Cokemon. Nó mang một lớp phủ kim loại đặc biệt giúp tăng sức mạnh cho đòn đánh hệ Thép.',
		price: 7000,
		item_type: 'hold_item',
		emoji: '<:metal_coat:1435842106038943845>',
		effects: {}
	},
	{
		item_id: 'protector',
		name: 'Giáp Bảo Hộ',
		description: 'Một bộ giáp bảo hộ cực kỳ cứng. Nó là món đồ yêu thích của một loài Cokemon.',
		price: 7000,
		item_type: 'hold_item',
		emoji: '<:protector:1435842111965761706>',
		effects: {}
	},
	{
		item_id: 'dragon-scale',
		name: 'Vảy Rồng',
		description: 'Một chiếc vảy rất cứng và chắc.',
		item_type: 'hold_item',
		price: 7000,
		emoji: '<:dragon_scale:1435842107863466041>',
		effects: {}
	},
	{
		item_id: 'electirizer',
		name: 'Máy Nạp Điện',
		description: 'Một chiếc hộp chứa đầy điện năng. Nó là món đồ yêu thích của một loài Cokemon.',
		item_type: 'hold_item',
		price: 7000,
		emoji: '<:electirizer:1435842114188611807>',
		effects: {}
	},
	{
		item_id: 'magmarizer',
		name: 'Buồng Magma',
		description: 'Một chiếc hộp chứa đầy năng lượng magma. Nó là món đồ yêu thích của một loài Cokemon.',
		item_type: 'hold_item',
		price: 7000,
		emoji: '<:magmarizer:1435842116390621194>',
		effects: {}
	},
	{
		item_id: 'upgrade',
		name: 'Máy Nâng Cấp',
		description: 'Một thiết bị trong suốt chứa rất nhiều dữ liệu. Nó được tạo ra bởi Silph Co.',
		item_type: 'hold_item',
		price: 10000,
		emoji: '<:upgrade:1435842109868347524>',
		effects: {}
	},
	{
		item_id: 'dubious-disc',
		name: 'Đĩa Dữ Liệu Lạ',
		description: 'Một chiếc đĩa trong suốt chứa những dữ liệu cực kỳ đáng ngờ. Không ai biết ai đã tạo ra nó.',
		item_type: 'hold_item',
		price: 10000,
		emoji: '<:dubious_disc:1435842119255195778>',
		effects: {}
	},
	{
		item_id: 'reaper-cloth',
		name: 'Tấm Vải Thần Chết',
		description: 'Một tấm vải thấm đẫm năng lượng tâm linh. Nó là món đồ yêu thích của một loài Cokemon.',
		item_type: 'hold_item',
		price: 7000,
		emoji: '<:reaper_cloth:1435842122094743672>',
		effects: {}
	},
	{
		item_id: 'deep-sea-tooth',
		name: 'Răng Biển Sâu',
		description: 'Một chiếc răng nanh dài và sắc nhọn. Khi được một Clamperl giữ, nó sẽ tăng Tấn công đặc biệt.',
		item_type: 'hold_item',
		price: 5000,
		emoji: '<:deep_sea_tooth:1435842101341458553>',
		effects: {}
	},
	{
		item_id: 'deep-sea-scale',
		name: 'Vảy Biển Sâu',
		description: 'Một chiếc vảy đẹp và có màu hồng. Khi được một Clamperl giữ, nó sẽ tăng Phòng thủ đặc biệt.',
		item_type: 'hold_item',
		price: 5000,
		emoji: '<:deep_sea_scale:1435842104063692991>',
		effects: {}
	},
	{
		item_id: 'oval-stone',
		name: 'Đá Bầu Dục',
		description: 'Một viên đá có hình dạng như quả trứng. Nó là món đồ yêu thích của một loài Cokemon.',
		item_type: 'hold_item',
		price: 5000,
		emoji: '<:oval_stone:1435842096086122627>',
		effects: {}
	},
	{
		item_id: 'razor-fang',
		name: 'Nanh Sắc',
		description: 'Một chiếc nanh sắc nhọn và dài. Nó có thể khiến một số loài cokemon nhất định tiến hóa.',
		item_type: 'hold_item',
		price: 7000,
		emoji: '<:razor_fang:1419643413778792619>',
		effects: {}
	},
	{
		item_id: 'razor-claw',
		name: 'Vuốt Sắc',
		description: 'Một móng vuốt sắc và nhọn. Nó có thể khiến một số loài cokemon nhất định tiến hóa.',
		item_type: 'hold_item',
		price: 7000,
		emoji: '<:razor_claw:1419643423773819002>',
		effects: {}
	},

	
	{
		item_id: 'rare-candy',
		name: 'Kẹo Hiếm',
		description: 'Một viên kẹo chứa đầy năng lượng. Khi ăn, nó sẽ ngay lập tức tăng cấp độ của Cokemon thêm một.',
		item_type: 'consumable',
		emoji: '<:rare_candy:1435842420708216864>',
		price: 20000,
		effects: {}
	},
]

const seedItems = async () => {
	try {
		console.log('Preparing to seed items...')
		const operations = itemsData.map(item => ({
			updateOne: {
				filter: { item_id: item.item_id },
				update: { $set: item },
				upsert: true
			}
		}))
		const result = await Item.bulkWrite(operations)
		console.log('✅ Items seeded successfully!')
		console.log(`   - Matched: ${result.matchedCount}`)
		console.log(`   - Modified: ${result.modifiedCount}`)
		console.log(`   - Upserted: ${result.upsertedCount}`)
	} catch (error) {
		console.error('❌ Error seeding items:', error)
	}
}

module.exports = seedItems
