const items = new Map([
	['catch-net', {
		name: 'Lưới Bắt Tự Động',
		description: 'Tự động thử bắt 20 cokemon xuất hiện kế tiếp',
		price: 250,
		item_type: 'tool',
		emoji: '🕸️'
	}],
	['lure-standard', {
		name: 'Lure Cơ Bản',
		description: 'Tăng tỉ lệ xuất hiện cokemon trong 30 phút.',
		price: 100,
		item_type: 'lure',
		emoji: '✨'
	}],
	['lure-flame', {
		name: 'Lure Lửa',
		description: 'Thu hút cokemon hệ Fire trong 30 phút.',
		price: 150,
		item_type: 'lure',
		boosts_type: ['Fire'],
		emoji: '🔥'
	}],
	['lure-ocean', {
		name: 'Lure Đại Dương',
		description: 'Thu hút cokemon hệ Water trong 30 phút.',
		price: 150,
		item_type: 'lure',
		boosts_type: ['Water'],
		emoji: '🌊'
	}],
	['lure-cavern', {
		name: 'Lure Hang Động',
		description: 'Thu hút cokemon hệ Rock và Ground trong 30 phút.',
		price: 200,
		item_type: 'lure',
		boosts_type: ['Rock', 'Ground'],
		emoji: '⛰️'
	}],
	['lure-power', {
		name: 'Lure Năng Lượng',
		description: 'Thu hút cokemon hệ Electric và Psychic trong 30 phút.',
		price: 200,
		item_type: 'lure',
		boosts_type: ['Electric', 'Psychic'],
		emoji: '⚡️'
	}],
	['lure-forest', {
		name: 'Lure Rừng Rậm',
		description: 'Thu hút cokemon hệ Grass, Bug and Flying trong 30 phút.',
		price: 250,
		item_type: 'lure',
		boosts_type: ['Grass', 'Bug', 'Flying'],
		emoji: '🌳'
	}],
	['lure-warlord', {
		name: 'Lure Chiến Tướng',
		description: 'Thu hút cokemon hệ Fighting, Dragon, và Steel trong 30 phút.',
		price: 275,
		item_type: 'lure',
		boosts_type: ['Fighting', 'Dragon', 'Steel'],
		emoji: '⚔️ '
	}]
])

module.exports = items