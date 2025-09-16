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
	['lure-ocean', {
		name: 'Bả Đại Dương',
		description: 'Thu hút cokemon hệ Water trong 30 phút.',
		price: 300,
		item_type: 'lure',
		boosts_type: ['Water'],
		emoji: '🌊'
	}],
	['lure-cavern', {
		name: 'Bả Hang Động',
		description: 'Thu hút cokemon hệ Rock và Ground trong 30 phút.',
		price: 400,
		item_type: 'lure',
		boosts_type: ['Rock', 'Ground'],
		emoji: '⛰️'
	}],
	['lure-power', {
		name: 'Bả Năng Lượng',
		description: 'Thu hút cokemon hệ Electric và Psychic trong 30 phút.',
		price: 400,
		item_type: 'lure',
		boosts_type: ['Electric', 'Psychic'],
		emoji: '⚡️'
	}],
	['lure-forest', {
		name: 'Bả Rừng Rậm',
		description: 'Thu hút cokemon hệ Grass, Bug and Flying trong 30 phút.',
		price: 500,
		item_type: 'lure',
		boosts_type: ['Grass', 'Bug', 'Flying'],
		emoji: '🌳'
	}],
	['lure-warlord', {
		name: 'Bả Chiến Tướng',
		description: 'Thu hút cokemon hệ Fighting, Dragon, và Steel trong 30 phút.',
		price: 550,
		item_type: 'lure',
		boosts_type: ['Fighting', 'Dragon', 'Steel'],
		emoji: '⚔️ '
	}]
])

module.exports = items