const items = new Map([
	['catch-net', {
		name: 'Lưới Bắt Tự Động',
		description: 'Tự động thử bắt 20 cokemon xuất hiện kế tiếp',
		price: 500,
		item_type: 'tool',
		emoji: '🕸️'
	}],
	['lure-standard', {
		name: 'Bả Cơ Bản',
		description: 'Tăng tỉ lệ xuất hiện cokemon trong 30 phút.',
		price: 200,
		item_type: 'lure',
		emoji: '✨'
	}],
	['lure-volcano', {
		name: 'Bả Núi Lửa',
		description: 'Thu hút cokemon hệ Fire trong 30 phút.',
		price: 300,
		item_type: 'lure',
		boosts_type: ['Fire'],
		emoji: '🔥'
	}],
	['lure-frozen', {
		name: 'Bả Băng Giá',
		description: 'Thu hút cokemon hệ Water và Ice trong 30 phút.',
		price: 400,
		item_type: 'lure',
		boosts_type: ['Water', 'Ice'],
		emoji: '🧊'
	}],
	['lure-cavern', {
		name: 'Bả Hang Động',
		description: 'Thu hút cokemon hệ Rock, Ground và Dragon trong 30 phút.',
		price: 550,
		item_type: 'lure',
		boosts_type: ['Rock', 'Ground', 'Dragon'],
		emoji: '⛰️'
	}],
	['lure-power', {
		name: 'Bả Năng Lượng',
		description: 'Thu hút cokemon hệ Electric, Psychic và Fairy trong 30 phút.',
		price: 500,
		item_type: 'lure',
		boosts_type: ['Electric', 'Psychic', 'Fairy'],
		emoji: '⚡️'
	}],
	['lure-forest', {
		name: 'Bả Rừng Rậm',
		description: 'Thu hút cokemon hệ Grass, Bug, Flying và Poison trong 30 phút.',
		price: 500,
		item_type: 'lure',
		boosts_type: ['Grass', 'Bug', 'Flying', 'Poison'],
		emoji: '🌳'
	}],
	['lure-warlord', {
		name: 'Bả Chiến Tướng',
		description: 'Thu hút cokemon hệ Fighting, Steel và Normal trong 30 phút.',
		price: 500,
		item_type: 'lure',
		boosts_type: ['Fighting', 'Steel', 'Nornal'],
		emoji: '⚔️ '
	}],
	['lure-eerie', {
		name: 'Bả Ma Quái',
		description: 'Thu hút cokemon hệ Dark và Ghost trong 30 phút.',
		price: 450,
		item_type: 'lure',
		boosts_type: ['Dark', 'Ghost'],
		emoji: '👻'
	}],
])

module.exports = items