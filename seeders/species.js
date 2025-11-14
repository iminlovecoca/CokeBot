const mongoose = require('mongoose')
const Species = require('../models/cokemon/Species')
const Ability = require('../models/cokemon/Ability')

const speciesData = [
	{
		dex_id: 1,
		name: 'Bulbasaur',
		description: 'A strange seed was planted on its back at birth. The plant sprouts and grows with this Cokemon.',
		type: ['Grass', 'Poison'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 6.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 49, def: 49, spatk: 65, spdef: 65, spd: 45 },
		available_abilities: [
			{ name: 'Overgrow', is_hidden: false },
			{ name: 'Chlorophyll', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '1.png',
		shiny_image_file: '1-shiny.png',
		emoji: '<:1_:1417087748514381865>',
		shiny_emoji: '',
		evolution: [{ to: 'Ivysaur', conditions: [{ type: 'level_up', value: 16 }] }]
	},
	{
		dex_id: 2,
		name: 'Ivysaur',
		description: 'When the bulb on its back grows large, it appears to lose the ability to stand on its hind legs.',
		type: ['Grass', 'Poison'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 13.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 62, def: 63, spatk: 80, spdef: 80, spd: 60 },
		available_abilities: [
			{ name: 'Overgrow', is_hidden: false },
			{ name: 'Chlorophyll', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '2.png',
		shiny_image_file: '2-shiny.png',
		emoji: '<:2_:1417087757674872923>',
		shiny_emoji: '',
		evolution: [{ to: 'Venusaur', conditions: [{ type: 'level_up', value: 32 }] }]
	},
	{
		dex_id: 3,
		name: 'Venusaur',
		description: 'The plant blooms when it is absorbing solar energy. It stays on the move to seek sunlight.',
		type: ['Grass', 'Poison'],
		tier: 'Epic',
		appearance: { height: 2.0, weight: 100.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 82, def: 83, spatk: 100, spdef: 100, spd: 80 },
		available_abilities: [
			{ name: 'Overgrow', is_hidden: false },
			{ name: 'Chlorophyll', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '3.png',
		shiny_image_file: '3-shiny.png',
		emoji: '<:3_:1417087766797221950>',
		shiny_emoji: ''
	},
	{
		dex_id: 4,
		name: 'Charmander',
		description: 'The flame that burns at the tip of its tail is an indication of its emotions.',
		type: ['Fire'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 8.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 39, atk: 52, def: 43, spatk: 60, spdef: 50, spd: 65 },
		available_abilities: [
			{ name: 'Blaze', is_hidden: false },
			{ name: 'Solar Power', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '4.png',
		shiny_image_file: '4-shiny.png',
		emoji: '<:4_:1417087778365378632>',
		shiny_emoji: '',
		evolution: [{ to: 'Charmeleon', conditions: [{ type: 'level_up', value: 16 }] }]
	},
	{
		dex_id: 5,
		name: 'Charmeleon',
		description: 'It has a barbaric nature. In battle, it whips its fiery tail around and slashes away with sharp claws.',
		type: ['Fire'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 19.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 58, atk: 64, def: 58, spatk: 80, spdef: 65, spd: 80 },
		available_abilities: [
			{ name: 'Blaze', is_hidden: false },
			{ name: 'Solar Power', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '5.png',
		shiny_image_file: '5-shiny.png',
		emoji: '<:5_:1417087795628867604>',
		shiny_emoji: '',
		evolution: [{ to: 'Charizard', conditions: [{ type: 'level_up', value: 36 }] }]
	},
	{
		dex_id: 6,
		name: 'Charizard',
		description: 'It spits fire that is hot enough to melt boulders. It may cause forest fires by blowing flames.',
		type: ['Fire', 'Flying'],
		tier: 'Epic',
		appearance: { height: 1.7, weight: 90.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 78, atk: 84, def: 78, spatk: 109, spdef: 85, spd: 100 },
		available_abilities: [
			{ name: 'Blaze', is_hidden: false },
			{ name: 'Solar Power', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '6.png',
		shiny_image_file: '6-shiny.png',
		emoji: '<:6_:1417087806265622558>',
		shiny_emoji: ''
	},
	{
		dex_id: 7,
		name: 'Squirtle',
		description: 'When it retracts its long neck into its shell, it squirts out water with vigorous force.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 9.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 44, atk: 48, def: 65, spatk: 50, spdef: 64, spd: 43 },
		available_abilities: [
			{ name: 'Torrent', is_hidden: false },
			{ name: 'Rain Dish', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '7.png',
		shiny_image_file: '7-shiny.png',
		emoji: '<:7_:1417087815606599760>',
		shiny_emoji: '',
		evolution: [{ to: 'Wartortle', conditions: [{ type: 'level_up', value: 16 }] }]
	},
	{
		dex_id: 8,
		name: 'Wartortle',
		description: 'It is recognized as a symbol of longevity. If its shell has algae on it, that Wartortle is very old.',
		type: ['Water'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 22.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 59, atk: 63, def: 80, spatk: 65, spdef: 80, spd: 58 },
		available_abilities: [
			{ name: 'Torrent', is_hidden: false },
			{ name: 'Rain Dish', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '8.png',
		shiny_image_file: '8-shiny.png',
		emoji: '<:8_:1417087828441042995>',
		shiny_emoji: '',
		evolution: [{ to: 'Blastoise', conditions: [{ type: 'level_up', value: 36 }] }]
	},
	{
		dex_id: 9,
		name: 'Blastoise',
		description: 'It crushes its foe under its heavy body to cause fainting. In a pinch, it will withdraw inside its shell.',
		type: ['Water'],
		tier: 'Epic',
		appearance: { height: 1.6, weight: 85.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 79, atk: 83, def: 100, spatk: 85, spdef: 105, spd: 78 },
		available_abilities: [
			{ name: 'Torrent', is_hidden: false },
			{ name: 'Rain Dish', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '9.png',
		shiny_image_file: '9-shiny.png',
		emoji: '<:9_:1417087840650526801>',
		shiny_emoji: ''
	},
	{
		dex_id: 10,
		name: 'Caterpie',
		description: 'For protection, it releases a horrible stench from the antenna on its head to drive away enemies.',
		type: ['Bug'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 2.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 30, def: 35, spatk: 20, spdef: 20, spd: 45 },
		available_abilities: [
			{ name: 'Shield Dust', is_hidden: false },
			{ name: 'Run Away', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '10.png',
		shiny_image_file: '10-shiny.png',
		emoji: '<:10:1417087850335305789>',
		shiny_emoji: '',
		evolution: [{ to: 'Metapod', conditions: [{ type: 'level_up', value: 7 }] }]
	},
	{
		dex_id: 11,
		name: 'Metapod',
		description: 'A steel-hard shell protects its tender body. It quietly endures hardships while awaiting evolution.',
		type: ['Bug'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 9.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 20, def: 55, spatk: 25, spdef: 25, spd: 30 },
		available_abilities: [
			{ name: 'Shed Skin', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '11.png',
		shiny_image_file: '11-shiny.png',
		emoji: '<:11:1417087860967739402>',
		shiny_emoji: '',
		evolution: [{ to: 'Butterfree', conditions: [{ type: 'level_up', value: 10 }] }]
	},
	{
		dex_id: 12,
		name: 'Butterfree',
		description: 'It loves the honey of flowers and can locate flower patches that have even tiny amounts of pollen.',
		type: ['Bug', 'Flying'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 32.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 45, def: 50, spatk: 90, spdef: 80, spd: 70 },
		available_abilities: [
			{ name: 'Compound Eyes', is_hidden: false },
			{ name: 'Tinted Lens', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '12.png',
		shiny_image_file: '12-shiny.png',
		emoji: '<:12:1417087879976587274>',
		shiny_emoji: ''
	},
	{
		dex_id: 13,
		name: 'Weedle',
		description: 'It eats its weight in leaves every day. It wards off attackers with the needle on its head.',
		type: ['Bug', 'Poison'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 3.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 35, def: 30, spatk: 20, spdef: 20, spd: 50 },
		available_abilities: [
			{ name: 'Shield Dust', is_hidden: false },
			{ name: 'Run Away', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '13.png',
		shiny_image_file: '13-shiny.png',
		emoji: '<:13:1417087892463026186>',
		shiny_emoji: '',
		evolution: [{ to: 'Kakuna', conditions: [{ type: 'level_up', value: 7 }] }]
	},
	{
		dex_id: 14,
		name: 'Kakuna',
		description: 'While awaiting evolution, it hides from predators under leaves and in nooks of trees.',
		type: ['Bug', 'Poison'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 10.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 25, def: 50, spatk: 25, spdef: 25, spd: 35 },
		available_abilities: [
			{ name: 'Shed Skin', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '14.png',
		shiny_image_file: '14-shiny.png',
		emoji: '<:14:1417087903502307469>',
		shiny_emoji: '',
		evolution: [{ to: 'Beedrill', conditions: [{ type: 'level_up', value: 10 }] }]
	},
	{
		dex_id: 15,
		name: 'Beedrill',
		description: 'It has three poisonous stingers on its forelegs and its tail. They are used to jab its enemy repeatedly.',
		type: ['Bug', 'Poison'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 29.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 90, def: 40, spatk: 45, spdef: 80, spd: 75 },
		available_abilities: [
			{ name: 'Swarm', is_hidden: false },
			{ name: 'Sniper', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '15.png',
		shiny_image_file: '15-shiny.png',
		emoji: '<:15:1417087913224835102>',
		shiny_emoji: ''
	},
	{
		dex_id: 16,
		name: 'Pidgey',
		description: 'It is docile and prefers to avoid conflict. If disturbed, however, it can ferociously strike back.',
		type: ['Flying', 'Normal'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 1.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 45, def: 40, spatk: 35, spdef: 35, spd: 56 },
		available_abilities: [
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Tangled Feet', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '16.png',
		shiny_image_file: '16-shiny.png',
		emoji: '<:16:1417087922674466968>',
		shiny_emoji: '',
		evolution: [{ to: 'Pidgeotto', conditions: [{ type: 'level_up', value: 18 }] }]
	},
	{
		dex_id: 17,
		name: 'Pidgeotto',
		description: 'It has outstanding vision. It can spot a Magikarp splashing from a height of 3,300 feet.',
		type: ['Flying', 'Normal'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 30.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 63, atk: 60, def: 55, spatk: 50, spdef: 50, spd: 71 },
		available_abilities: [
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Tangled Feet', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '17.png',
		shiny_image_file: '17-shiny.png',
		emoji: '<:17:1417087932396736614>',
		shiny_emoji: '',
		evolution: [{ to: 'Pidgeot', conditions: [{ type: 'level_up', value: 36 }] }]
	},
	{
		dex_id: 18,
		name: 'Pidgeot',
		description: 'This Cokemon has a dazzling plumage of beautifully glossy feathers. Many Trainers are captivated by its striking beauty.',
		type: ['Flying', 'Normal'],
		tier: 'Epic',
		appearance: { height: 1.5, weight: 39.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 83, atk: 80, def: 75, spatk: 70, spdef: 70, spd: 101 },
		available_abilities: [
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Tangled Feet', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '18.png',
		shiny_image_file: '18-shiny.png',
		emoji: '<:18:1417087945500000257>',
		shiny_emoji: ''
	},
	{
		dex_id: 19,
		name: 'Rattata',
		description: 'It eats anything. Wherever food is available, it will settle down and produce offspring continuously.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 3.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 30, atk: 56, def: 35, spatk: 25, spdef: 35, spd: 72 },
		available_abilities: [
			{ name: 'Run Away', is_hidden: false },
			{ name: 'Guts', is_hidden: false },
			{ name: 'Hustle', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.2,
		image_file: '19.png',
		shiny_image_file: '19-shiny.png',
		emoji: '<:19:1417087954303586314>',
		shiny_emoji: '',
		evolution: [{ to: 'Raticate', conditions: [{ type: 'level_up', value: 20 }] }]
	},
	{
		dex_id: 20,
		name: 'Raticate',
		description: 'Its hind feet are webbed. They act as flippers, so it can swim in rivers and hunt for prey.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 0.7, weight: 18.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 81, def: 60, spatk: 50, spdef: 70, spd: 97 },
		available_abilities: [
			{ name: 'Run Away', is_hidden: false },
			{ name: 'Guts', is_hidden: false },
			{ name: 'Hustle', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '20.png',
		shiny_image_file: '20-shiny.png',
		emoji: '<:20:1417087981465899130>',
		shiny_emoji: ''
	},
	{
		dex_id: 21,
		name: 'Spearow',
		description: 'It flaps its small wings busily to fly. Using its beak, it searches in grass for prey.',
		type: ['Flying', 'Normal'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 2.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 60, def: 30, spatk: 31, spdef: 31, spd: 70 },
		available_abilities: [
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Sniper', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '21.png',
		shiny_image_file: '21-shiny.png',
		emoji: '<:21:1417087990077067316>',
		shiny_emoji: '',
		evolution: [{ to: 'Fearow', conditions: [{ type: 'level_up', value: 20 }] }]
	},
	{
		dex_id: 22,
		name: 'Fearow',
		description: 'A Cokemon that dates back to distant antiquity. If it senses danger, it flies high and away, instantly.',
		type: ['Flying', 'Normal'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 38.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 90, def: 65, spatk: 61, spdef: 61, spd: 100 },
		available_abilities: [
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Sniper', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '22.png',
		shiny_image_file: '22-shiny.png',
		emoji: '<:22:1417087998411145308>',
		shiny_emoji: ''
	},
	{
		dex_id: 23,
		name: 'Ekans',
		description: 'The older it gets, the longer it grows. At night, it wraps its long body around tree branches to rest.',
		type: ['Poison'],
		tier: 'Common',
		appearance: { height: 2.0, weight: 6.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 35, atk: 60, def: 44, spatk: 40, spdef: 54, spd: 55 },
		available_abilities: [
			{ name: 'Intimidate', is_hidden: false },
			{ name: 'Shed Skin', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '23.png',
		shiny_image_file: '23-shiny.png',
		emoji: '<:23:1417088006699094027>',
		shiny_emoji: '',
		evolution: [{ to: 'Arbok', conditions: [{ type: 'level_up', value: 22 }] }]
	},
	{
		dex_id: 24,
		name: 'Arbok',
		description: 'The frightening patterns on its belly have been studied. Six variations have been confirmed.',
		type: ['Poison'],
		tier: 'Rare',
		appearance: { height: 3.5, weight: 65.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 95, def: 69, spatk: 65, spdef: 79, spd: 80 },
		available_abilities: [
			{ name: 'Intimidate', is_hidden: false },
			{ name: 'Shed Skin', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '24.png',
		shiny_image_file: '24-shiny.png',
		emoji: '<:24:1417088016186474536>',
		shiny_emoji: ''
	},
	{
		dex_id: 25,
		name: 'Pikachu',
		description: 'It has small electric sacs on both its cheeks. If threatened, it looses electric charges from the sacs.',
		type: ['Electric'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 6.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 35, atk: 55, def: 40, spatk: 50, spdef: 50, spd: 90 },
		available_abilities: [
			{ name: 'Static', is_hidden: false },
			{ name: 'Lightning Rod', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '25.png',
		shiny_image_file: '25-shiny.png',
		emoji: '<:25:1417088023413260308>',
		shiny_emoji: '',
		evolution: [{ to: 'Raichu', conditions: [{ type: 'item', value: 'thunder-stone' }] }]
	},
	{
		dex_id: 26,
		name: 'Raichu',
		description: 'Its long tail serves as a ground to protect itself from its own high-voltage power.',
		type: ['Electric'],
		tier: 'Rare',
		appearance: { height: 0.8, weight: 30.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 90, def: 55, spatk: 90, spdef: 80, spd: 110 },
		available_abilities: [
			{ name: 'Static', is_hidden: false },
			{ name: 'Lightning Rod', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '26.png',
		shiny_image_file: '26-shiny.png',
		emoji: '<:26:1417088032447660082>',
		shiny_emoji: ''
	},
	{
		dex_id: 27,
		name: 'Sandshrew',
		description: 'It burrows and lives underground. If threatened, it curls itself up into a ball for protection.',
		type: ['Ground'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 12.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 75, def: 85, spatk: 20, spdef: 30, spd: 40 },
		available_abilities: [
			{ name: 'Sand Veil', is_hidden: false },
			{ name: 'Sand Rush', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '27.png',
		shiny_image_file: '27-shiny.png',
		emoji: '<:27:1417088039834095776>',
		shiny_emoji: '',
		evolution: [{ to: 'Sandslash', conditions: [{ type: 'level_up', value: 22 }] }]
	},
	{
		dex_id: 28,
		name: 'Sandslash',
		description: 'It is skilled at slashing enemies with its claws. If broken, they grow back in a day.',
		type: ['Ground'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 29.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 100, def: 110, spatk: 45, spdef: 55, spd: 65 },
		available_abilities: [
			{ name: 'Sand Veil', is_hidden: false },
			{ name: 'Sand Rush', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '28.png',
		shiny_image_file: '28-shiny.png',
		emoji: '<:28:1417088052156825632>',
		shiny_emoji: ''
	},
	{
		dex_id: 29,
		name: 'Nidoran♀',
		description: 'Though small, its venomous barbs render this Cokemon dangerous. The female has smaller horns.',
		type: ['Poison'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 7.0 },
		available_genders: ['Female'],
		base_stats: { hp: 55, atk: 47, def: 52, spatk: 40, spdef: 40, spd: 41 },
		available_abilities: [
			{ name: 'Poison Point', is_hidden: false },
			{ name: 'Rivalry', is_hidden: false },
			{ name: 'Hustle', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '29.png',
		shiny_image_file: '29-shiny.png',
		emoji: '<:29:1417088091143016479>',
		shiny_emoji: '',
		evolution: [{ to: 'Nidorina', conditions: [{ type: 'level_up', value: 16 }] }]
	},
	{
		dex_id: 30,
		name: 'Nidorina',
		description: 'When it is with its friends or family, its barbs are tucked away to prevent injury.',
		type: ['Poison'],
		tier: 'Rare',
		appearance: { height: 0.8, weight: 20.0 },
		available_genders: ['Female'],
		base_stats: { hp: 70, atk: 62, def: 67, spatk: 55, spdef: 55, spd: 56 },
		available_abilities: [
			{ name: 'Poison Point', is_hidden: false },
			{ name: 'Rivalry', is_hidden: false },
			{ name: 'Hustle', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '30.png',
		shiny_image_file: '30-shiny.png',
		emoji: '<:30:1417088103243579392>',
		shiny_emoji: '',
		evolution: [{ to: 'Nidoqueen', conditions: [{ type: 'item', value: 'moon-stone' }] }]
	},
	{
		dex_id: 31,
		name: 'Nidoqueen',
		description: 'Its entire body is armored with hard scales. It will protect the young in its burrow with its life.',
		type: ['Ground', 'Poison'],
		tier: 'Epic',
		appearance: { height: 1.3, weight: 60.0 },
		available_genders: ['Female'],
		base_stats: { hp: 90, atk: 92, def: 87, spatk: 75, spdef: 85, spd: 76 },
		available_abilities: [
			{ name: 'Poison Point', is_hidden: false },
			{ name: 'Rivalry', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '31.png',
		shiny_image_file: '31-shiny.png',
		emoji: '<:31:1417088113251057674>',
		shiny_emoji: ''
	},
	{
		dex_id: 32,
		name: 'Nidoran♂',
		description: 'It stiffens its ears to sense danger. The larger its horns, the more powerful its venom.',
		type: ['Poison'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 9.0 },
		available_genders: ['Male'],
		base_stats: { hp: 46, atk: 57, def: 40, spatk: 40, spdef: 40, spd: 50 },
		available_abilities: [
			{ name: 'Poison Point', is_hidden: false },
			{ name: 'Rivalry', is_hidden: false },
			{ name: 'Hustle', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '32.png',
		shiny_image_file: '32-shiny.png',
		emoji: '<:32:1417088124814753792>',
		shiny_emoji: '',
		evolution: [{ to: 'Nidorino', conditions: [{ type: 'level_up', value: 16 }] }]
	},
	{
		dex_id: 33,
		name: 'Nidorino',
		description: 'It has a violent disposition and stabs foes with its horn, which oozes venom upon impact.',
		type: ['Poison'],
		tier: 'Rare',
		appearance: { height: 0.9, weight: 19.5 },
		available_genders: ['Male'],
		base_stats: { hp: 61, atk: 72, def: 57, spatk: 55, spdef: 55, spd: 65 },
		available_abilities: [
			{ name: 'Poison Point', is_hidden: false },
			{ name: 'Rivalry', is_hidden: false },
			{ name: 'Hustle', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '33.png',
		shiny_image_file: '33-shiny.png',
		emoji: '<:33:1417088131567587341>',
		shiny_emoji: '',
		evolution: [{ to: 'Nidoking', conditions: [{ type: 'item', value: 'moon-stone' }] }]
	},
	{
		dex_id: 34,
		name: 'Nidoking',
		description: 'One swing of its mighty tail can snap a telephone pole as if it were a matchstick.',
		type: ['Ground', 'Poison'],
		tier: 'Epic',
		appearance: { height: 1.4, weight: 62.0 },
		available_genders: ['Male'],
		base_stats: { hp: 81, atk: 102, def: 77, spatk: 85, spdef: 75, spd: 85 },
		available_abilities: [
			{ name: 'Poison Point', is_hidden: false },
			{ name: 'Rivalry', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '34.png',
		shiny_image_file: '34-shiny.png',
		emoji: '<:34:1417088144267935825>',
		shiny_emoji: ''
	},
	{
		dex_id: 35,
		name: 'Clefairy',
		description: 'The moonlight that it stores in the wings on its back apparently gives it the ability to float in midair.',
		type: ['Fairy'],
		tier: 'Rare',
		appearance: { height: 0.6, weight: 7.5 },
		available_genders: ['Female'],
		base_stats: { hp: 70, atk: 45, def: 48, spatk: 60, spdef: 65, spd: 35 },
		available_abilities: [
			{ name: 'Cute Charm', is_hidden: false },
			{ name: 'Magic Guard', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '35.png',
		shiny_image_file: '35-shiny.png',
		emoji: '<:35:1417088156158660640>',
		shiny_emoji: '',
		evolution: [{ to: 'Clefable', conditions: [{ type: 'item', value: 'moon-stone' }] }]
	},
	{
		dex_id: 36,
		name: 'Clefable',
		description: 'A timid fairy Cokemon that is rarely seen. It will run and hide the moment it senses people.',
		type: ['Fairy'],
		tier: 'Epic',
		appearance: { height: 1.3, weight: 40.0 },
		available_genders: ['Female'],
		base_stats: { hp: 95, atk: 70, def: 73, spatk: 95, spdef: 90, spd: 60 },
		available_abilities: [
			{ name: 'Cute Charm', is_hidden: false },
			{ name: 'Magic Guard', is_hidden: false },
			{ name: 'Unaware', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '36.png',
		shiny_image_file: '36-shiny.png',
		emoji: '<:36:1417088182159151115>',
		shiny_emoji: ''
	},
	{
		dex_id: 37,
		name: 'Vulpix',
		description: 'While young, it has six magnificent tails. When it grows, several new tails are sprouted.',
		type: ['Fire'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 9.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 38, atk: 41, def: 40, spatk: 50, spdef: 65, spd: 65 },
		available_abilities: [
			{ name: 'Flash Fire', is_hidden: false },
			{ name: 'Drought', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '37.png',
		shiny_image_file: '37-shiny.png',
		emoji: '<:37:1417088203445239869>',
		shiny_emoji: '',
		evolution: [{ to: 'Ninetales', conditions: [{ type: 'item', value: 'fire-stone' }] }]
	},
	{
		dex_id: 38,
		name: 'Ninetales',
		description: 'It is said to live 1,000 years, and each of its tails is loaded with supernatural powers.',
		type: ['Fire'],
		tier: 'Epic',
		appearance: { height: 1.1, weight: 19.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 73, atk: 76, def: 75, spatk: 81, spdef: 100, spd: 100 },
		available_abilities: [
			{ name: 'Flash Fire', is_hidden: false },
			{ name: 'Drought', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '38.png',
		shiny_image_file: '38-shiny.png',
		emoji: '<:38:1417088213574746243>',
		shiny_emoji: ''
	},
	{
		dex_id: 39,
		name: 'Jigglypuff',
		description: 'When its huge eyes waver, it sings a mysteriously soothing melody that lulls its enemies to sleep.',
		type: ['Normal', 'Fairy'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 5.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 115, atk: 45, def: 20, spatk: 45, spdef: 25, spd: 20 },
		available_abilities: [
			{ name: 'Cute Charm', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '39.png',
		shiny_image_file: '39-shiny.png',
		emoji: '<:39:1417088221858365460>',
		shiny_emoji: '',
		evolution: [{ to: 'Wigglytuff', conditions: [{ type: 'item', value: 'moon-stone' }] }]
	},
	{
		dex_id: 40,
		name: 'Wigglytuff',
		description: 'Its body is very flexible. By inhaling deeply, it can inflate itself seemingly without end.',
		type: ['Normal', 'Fairy'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 12.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 140, atk: 70, def: 45, spatk: 85, spdef: 50, spd: 45 },
		available_abilities: [
			{ name: 'Cute Charm', is_hidden: false },
			{ name: 'Frisk', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '40.png',
		shiny_image_file: '40-shiny.png',
		emoji: '<:40:1417088227483062363>',
		shiny_emoji: ''
	},
	{
		dex_id: 41,
		name: 'Zubat',
		description: 'It does not need eyes, because it emits ultrasonic waves to check its surroundings while it flies.',
		type: ['Poison', 'Flying'],
		tier: 'Common',
		appearance: { height: 0.8, weight: 7.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 45, def: 35, spatk: 30, spdef: 40, spd: 55 },
		available_abilities: [
			{ name: 'Inner Focus', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.2,
		image_file: '41.png',
		shiny_image_file: '41-shiny.png',
		emoji: '<:41:1417088233980039219>',
		shiny_emoji: '',
		evolution: [{ to: 'Golbat', conditions: [{ type: 'level_up', value: 22 }] }]
	},
	{
		dex_id: 42,
		name: 'Golbat',
		description: 'It can drink more than 10 ounces of blood at once. If it has too much, it gets heavy and flies clumsily.',
		type: ['Poison', 'Flying'],
		tier: 'Rare',
		appearance: { height: 1.6, weight: 55.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 80, def: 70, spatk: 65, spdef: 75, spd: 90 },
		available_abilities: [
			{ name: 'Inner Focus', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '42.png',
		shiny_image_file: '42-shiny.png',
		emoji: '<:42:1417088252673790014>',
		shiny_emoji: '',
		evolution: [{ to: 'Crobat', conditions: [{ type: 'friendship', value: 220 }] }]
	},
	{
		dex_id: 43,
		name: 'Oddish',
		description: 'During the day, it keeps its face buried in the ground. At night, it wanders around sowing its seeds.',
		type: ['Grass', 'Poison'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 5.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 50, def: 55, spatk: 75, spdef: 65, spd: 30 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Run Away', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '43.png',
		shiny_image_file: '43-shiny.png',
		emoji: '<:43:1417088260882174032>',
		shiny_emoji: '',
		evolution: [{ to: 'Gloom', conditions: [{ type: 'level_up', value: 21 }] }]
	},
	{
		dex_id: 44,
		name: 'Gloom',
		description: 'The fluid that oozes from its mouth isn\'t drool. It is a nectar that is used to attract prey.',
		type: ['Grass', 'Poison'],
		tier: 'Rare',
		appearance: { height: 0.8, weight: 8.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 65, def: 70, spatk: 85, spdef: 75, spd: 40 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Stench', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '44.png',
		shiny_image_file: '44-shiny.png',
		emoji: '<:44:1417088272936599623>',
		shiny_emoji: '',
		evolution: [
			{ to: 'Vileplume', conditions: [{ type: 'item', value: 'leaf-stone' }] },
			{ to: 'Bellossom', conditions: [{ type: 'item', value: 'sun-stone' }] }
		]
	},
	{
		dex_id: 45,
		name: 'Vileplume',
		description: 'The larger its petals, the more toxic pollen it contains. Its big head is heavy and hard to hold up.',
		type: ['Grass', 'Poison'],
		tier: 'Epic',
		appearance: { height: 1.2, weight: 18.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 80, def: 85, spatk: 110, spdef: 90, spd: 50 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Effect Spore', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '45.png',
		shiny_image_file: '45-shiny.png',
		emoji: '<:45:1417088286945448007>',
		shiny_emoji: ''
	},
	{
		dex_id: 46,
		name: 'Paras',
		description: 'Burrows under the ground to gnaw on tree roots. The mushrooms on its back absorb most of the nutrition.',
		type: ['Bug', 'Grass'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 5.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 35, atk: 70, def: 55, spatk: 45, spdef: 55, spd: 25 },
		available_abilities: [
			{ name: 'Effect Spore', is_hidden: false },
			{ name: 'Dry Skin', is_hidden: false },
			{ name: 'Damp', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '46.png',
		shiny_image_file: '46-shiny.png',
		emoji: '<:46:1417088296743604306>',
		shiny_emoji: '',
		evolution: [{ to: 'Parasect', conditions: [{ type: 'level_up', value: 24 }] }]
	},
	{
		dex_id: 47,
		name: 'Parasect',
		description: 'A host-parasite pair in which the parasite mushroom has taken over the host bug. The mushroom appears to do all the thinking.',
		type: ['Bug', 'Grass'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 29.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 95, def: 80, spatk: 60, spdef: 80, spd: 30 },
		available_abilities: [
			{ name: 'Effect Spore', is_hidden: false },
			{ name: 'Dry Skin', is_hidden: false },
			{ name: 'Damp', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '47.png',
		shiny_image_file: '47-shiny.png',
		emoji: '<:47:1417088308693176320>',
		shiny_emoji: ''
	},
	{
		dex_id: 48,
		name: 'Venonat',
		description: 'Its large eyes act as radar. In a dark place, they are said to be able to see things that are otherwise invisible.',
		type: ['Bug', 'Poison'],
		tier: 'Common',
		appearance: { height: 1.0, weight: 30.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 55, def: 50, spatk: 40, spdef: 55, spd: 45 },
		available_abilities: [
			{ name: 'Compound Eyes', is_hidden: false },
			{ name: 'Tinted Lens', is_hidden: false },
			{ name: 'Run Away', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '48.png',
		shiny_image_file: '48-shiny.png',
		emoji: '<:48:1417088315689009162>',
		shiny_emoji: '',
		evolution: [{ to: 'Venomoth', conditions: [{ type: 'level_up', value: 31 }] }]
	},
	{
		dex_id: 49,
		name: 'Venomoth',
		description: 'The dust-like scales covering its wings are color-coded to indicate the kinds of poison it has.',
		type: ['Bug', 'Poison'],
		tier: 'Rare',
		appearance: { height: 1.5, weight: 12.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 65, def: 60, spatk: 90, spdef: 75, spd: 90 },
		available_abilities: [
			{ name: 'Shield Dust', is_hidden: false },
			{ name: 'Tinted Lens', is_hidden: false },
			{ name: 'Wonder Skin', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '49.png',
		shiny_image_file: '49-shiny.png',
		emoji: '<:49:1417088326850183260>',
		shiny_emoji: ''
	},
	{
		dex_id: 50,
		name: 'Diglett',
		description: 'It lives about one yard underground where it feeds on plant roots. It sometimes appears above ground.',
		type: ['Ground'],
		tier: 'Common',
		appearance: { height: 0.2, weight: 0.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 10, atk: 55, def: 25, spatk: 35, spdef: 45, spd: 95 },
		available_abilities: [
			{ name: 'Sand Veil', is_hidden: false },
			{ name: 'Arena Trap', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.2,
		image_file: '50.png',
		shiny_image_file: '50-shiny.png',
		emoji: '<:50:1417088334852919369>',
		shiny_emoji: '',
		evolution: [{ to: 'Dugtrio', conditions: [{ type: 'level_up', value: 26 }] }]
	},
	{
		dex_id: 51,
		name: 'Dugtrio',
		description: 'A team of Diglett triplets. It triggers huge earthquakes by burrowing 60 miles underground.',
		type: ['Ground'],
		tier: 'Rare',
		appearance: { height: 0.7, weight: 33.3 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 35, atk: 100, def: 50, spatk: 50, spdef: 70, spd: 120 },
		available_abilities: [
			{ name: 'Sand Veil', is_hidden: false },
			{ name: 'Arena Trap', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '51.png',
		shiny_image_file: '51-shiny.png',
		emoji: '<:51:1417088348518092831>',
		shiny_emoji: ''
	},
	{
		dex_id: 52,
		name: 'Meowth',
		description: 'It loves to collect shiny things. If it’s in a good mood, it might even let its Trainer have a look at its hoard.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 4.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 45, def: 35, spatk: 40, spdef: 40, spd: 90 },
		available_abilities: [
			{ name: 'Pickup', is_hidden: false },
			{ name: 'Technician', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '52.png',
		shiny_image_file: '52-shiny.png',
		emoji: '<:52:1417088356617158677>',
		shiny_emoji: '',
		evolution: [{ to: 'Persian', conditions: [{ type: 'level_up', value: 28 }] }]
	},
	{
		dex_id: 53,
		name: 'Persian',
		description: 'Although its fur has many admirers, it is tough to raise as a pet because of its fickle and vicious nature.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 32.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 70, def: 60, spatk: 65, spdef: 65, spd: 115 },
		available_abilities: [
			{ name: 'Limber', is_hidden: false },
			{ name: 'Technician', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '53.png',
		shiny_image_file: '53-shiny.png',
		emoji: '<:53:1417088365295177788>',
		shiny_emoji: ''
	},
	{
		dex_id: 54,
		name: 'Psyduck',
		description: 'It has a mysterious power. When its headache grows intense, it starts using psychic powers.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.8, weight: 19.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 52, def: 48, spatk: 65, spdef: 50, spd: 55 },
		available_abilities: [
			{ name: 'Damp', is_hidden: false },
			{ name: 'Cloud Nine', is_hidden: false },
			{ name: 'Swift Swim', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '54.png',
		shiny_image_file: '54-shiny.png',
		emoji: '<:54:1417088426527952987>',
		shiny_emoji: '',
		evolution: [{ to: 'Golduck', conditions: [{ type: 'level_up', value: 33 }] }]
	},
	{
		dex_id: 55,
		name: 'Golduck',
		description: 'The webbed flippers on its forelegs and hind legs and the streamlined body of Golduck give it frightening speed.',
		type: ['Water'],
		tier: 'Rare',
		appearance: { height: 1.7, weight: 76.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 82, def: 78, spatk: 95, spdef: 80, spd: 85 },
		available_abilities: [
			{ name: 'Damp', is_hidden: false },
			{ name: 'Cloud Nine', is_hidden: false },
			{ name: 'Swift Swim', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '55.png',
		shiny_image_file: '55-shiny.png',
		emoji: '<:55:1417088439085563965>',
		shiny_emoji: ''
	},
	{
		dex_id: 56,
		name: 'Mankey',
		description: 'It is extremely quick to anger. It could be docile one moment then thrashing away in a rage the next.',
		type: ['Fighting'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 28.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 80, def: 35, spatk: 35, spdef: 45, spd: 70 },
		available_abilities: [
			{ name: 'Vital Spirit', is_hidden: false },
			{ name: 'Anger Point', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '56.png',
		shiny_image_file: '56-shiny.png',
		emoji: '<:56:1417088454084399124>',
		shiny_emoji: '',
		evolution: [{ to: 'Primeape', conditions: [{ type: 'level_up', value: 28 }] }]
	},
	{
		dex_id: 57,
		name: 'Primeape',
		description: 'It has become so angry that it will chase anything without any reason. It will not stop chasing even if it loses sight of its target.',
		type: ['Fighting'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 32.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 105, def: 60, spatk: 60, spdef: 70, spd: 95 },
		available_abilities: [
			{ name: 'Vital Spirit', is_hidden: false },
			{ name: 'Anger Point', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '57.png',
		shiny_image_file: '57-shiny.png',
		emoji: '<:57:1417088464746450994>',
		shiny_emoji: ''
	},
	{
		dex_id: 58,
		name: 'Growlithe',
		description: 'It has a brave and trustworthy nature. It fearlessly stands up to bigger and stronger foes.',
		type: ['Fire'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 19.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 70, def: 45, spatk: 70, spdef: 50, spd: 60 },
		available_abilities: [
			{ name: 'Intimidate', is_hidden: false },
			{ name: 'Flash Fire', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '58.png',
		shiny_image_file: '58-shiny.png',
		emoji: '<:58:1417088481368346635>',
		shiny_emoji: '',
		evolution: [{ to: 'Arcanine', conditions: [{ type: 'item', value: 'fire-stone' }] }]
	},
	{
		dex_id: 59,
		name: 'Arcanine',
		description: 'A Cokemon that has been admired since the past for its beauty. It runs agilely as if on wings.',
		type: ['Fire'],
		tier: 'Epic',
		appearance: { height: 1.9, weight: 155.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 110, def: 80, spatk: 100, spdef: 80, spd: 95 },
		available_abilities: [
			{ name: 'Intimidate', is_hidden: false },
			{ name: 'Flash Fire', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '59.png',
		shiny_image_file: '59-shiny.png',
		emoji: '<:59:1417088488649789471>',
		shiny_emoji: ''
	},
	{
		dex_id: 60,
		name: 'Poliwag',
		description: 'The direction of the spiral on its belly differs by area. It is more adept at swimming than walking.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 12.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 50, def: 40, spatk: 40, spdef: 40, spd: 90 },
		available_abilities: [
			{ name: 'Water Absorb', is_hidden: false },
			{ name: 'Damp', is_hidden: false },
			{ name: 'Swift Swim', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '60.png',
		shiny_image_file: '60-shiny.png',
		emoji: '<:60:1417088494194393118>',
		shiny_emoji: '',
		evolution: [{ to: 'Poliwhirl', conditions: [{ type: 'level_up', value: 25 }] }]
	},
	{
		dex_id: 61,
		name: 'Poliwhirl',
		description: 'The spiral on its belly is its internal organs showing through its skin. It is better at swimming than walking.',
		type: ['Water'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 20.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 65, def: 65, spatk: 50, spdef: 50, spd: 90 },
		available_abilities: [
			{ name: 'Water Absorb', is_hidden: false },
			{ name: 'Damp', is_hidden: false },
			{ name: 'Swift Swim', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '61.png',
		shiny_image_file: '61-shiny.png',
		emoji: '<:61:1417088504458117172>',
		shiny_emoji: '',
		evolution: [
			{ to: 'Poliwrath', conditions: [{ type: 'item', value: 'water-stone' }] },
			{ to: 'Politoed', conditions: [{ type: 'trade_item', value: 'kings-rock' }] }
		]
	},
	{
		dex_id: 62,
		name: 'Poliwrath',
		description: 'An expert swimmer, it is able to race through stormy seas without being buffeted by the waves.',
		type: ['Water', 'Fighting'],
		tier: 'Epic',
		appearance: { height: 1.3, weight: 54.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 95, def: 95, spatk: 70, spdef: 90, spd: 70 },
		available_abilities: [
			{ name: 'Water Absorb', is_hidden: false },
			{ name: 'Damp', is_hidden: false },
			{ name: 'Swift Swim', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '62.png',
		shiny_image_file: '62-shiny.png',
		emoji: '<:62:1417088511634575391>',
		shiny_emoji: ''
	},
	{
		dex_id: 63,
		name: 'Abra',
		description: 'It sleeps for 18 hours a day. It uses a variety of extrasensory powers even while asleep.',
		type: ['Psychic'],
		tier: 'Common',
		appearance: { height: 0.9, weight: 19.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 25, atk: 20, def: 15, spatk: 105, spdef: 55, spd: 90 },
		available_abilities: [
			{ name: 'Synchronize', is_hidden: false },
			{ name: 'Inner Focus', is_hidden: false },
			{ name: 'Magic Guard', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.9,
		image_file: '63.png',
		shiny_image_file: '63-shiny.png',
		emoji: '<:63:1417088517598613514>',
		shiny_emoji: '',
		evolution: [{ to: 'Kadabra', conditions: [{ type: 'level_up', value: 16 }] }]
	},
	{
		dex_id: 64,
		name: 'Kadabra',
		description: 'It possesses a strong psychic power. The more danger it faces, the stronger its psychic power.',
		type: ['Psychic'],
		tier: 'Rare',
		appearance: { height: 1.3, weight: 56.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 35, def: 30, spatk: 120, spdef: 70, spd: 105 },
		available_abilities: [
			{ name: 'Synchronize', is_hidden: false },
			{ name: 'Inner Focus', is_hidden: false },
			{ name: 'Magic Guard', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '64.png',
		shiny_image_file: '64-shiny.png',
		emoji: '<:64:1417088718728073297>',
		shiny_emoji: '',
		evolution: [{ to: 'Alakazam', conditions: [{ type: 'trade' }] }]
	},
	{
		dex_id: 65,
		name: 'Alakazam',
		description: 'A Cokemon that can memorize anything. It never forgets what it learns—that’s why this Cokemon is smart.',
		type: ['Psychic'],
		tier: 'Epic',
		appearance: { height: 1.5, weight: 48.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 50, def: 45, spatk: 135, spdef: 95, spd: 120 },
		available_abilities: [
			{ name: 'Synchronize', is_hidden: false },
			{ name: 'Inner Focus', is_hidden: false },
			{ name: 'Magic Guard', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '65.png',
		shiny_image_file: '65-shiny.png',
		emoji: '<:65:1417088738022129794>',
		shiny_emoji: ''
	},
	{
		dex_id: 66,
		name: 'Machop',
		description: 'It loves to build its muscles. It trains in all styles of martial arts to become even stronger.',
		type: ['Fighting'],
		tier: 'Common',
		appearance: { height: 0.8, weight: 19.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 80, def: 50, spatk: 35, spdef: 35, spd: 35 },
		available_abilities: [
			{ name: 'Guts', is_hidden: false },
			{ name: 'No Guard', is_hidden: false },
			{ name: 'Steadfast', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '66.png',
		shiny_image_file: '66-shiny.png',
		emoji: '<:66:1417088749212532868>',
		shiny_emoji: '',
		evolution: [{ to: 'Machoke', conditions: [{ type: 'level_up', value: 28 }] }]
	},
	{
		dex_id: 67,
		name: 'Machoke',
		description: 'Its muscular body is so powerful, it must wear a power-save belt to be able to regulate its motions.',
		type: ['Fighting'],
		tier: 'Rare',
		appearance: { height: 1.5, weight: 70.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 100, def: 70, spatk: 50, spdef: 60, spd: 45 },
		available_abilities: [
			{ name: 'Guts', is_hidden: false },
			{ name: 'No Guard', is_hidden: false },
			{ name: 'Steadfast', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '67.png',
		shiny_image_file: '67-shiny.png',
		emoji: '<:67:1417088757839958076>',
		shiny_emoji: '',
		evolution: [{ to: 'Machamp', conditions: [{ type: 'trade' }] }]
	},
	{
		dex_id: 68,
		name: 'Machamp',
		description: 'It can knock a train flying with a punch. It is said that it has mastered every martial art in the world.',
		type: ['Fighting'],
		tier: 'Epic',
		appearance: { height: 1.6, weight: 130.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 130, def: 80, spatk: 65, spdef: 85, spd: 55 },
		available_abilities: [
			{ name: 'Guts', is_hidden: false },
			{ name: 'No Guard', is_hidden: false },
			{ name: 'Steadfast', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '68.png',
		shiny_image_file: '68-shiny.png',
		emoji: '<:68:1417088765452746752>',
		shiny_emoji: ''
	},
	{
		dex_id: 69,
		name: 'Bellsprout',
		description: 'Even though its body is extremely skinny, it is blindingly fast when catching its prey.',
		type: ['Grass', 'Poison'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 4.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 75, def: 35, spatk: 70, spdef: 30, spd: 40 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Gluttony', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '69.png',
		shiny_image_file: '69-shiny.png',
		emoji: '<:69:1417088772259971133>',
		shiny_emoji: '',
		evolution: [{ to: 'Weepinbell', conditions: [{ type: 'level_up', value: 21 }] }]
	},
	{
		dex_id: 70,
		name: 'Weepinbell',
		description: 'When hungry, it swallows anything that moves. Its hapless prey is dissolved by strong acids.',
		type: ['Grass', 'Poison'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 6.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 90, def: 50, spatk: 85, spdef: 45, spd: 55 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Gluttony', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '70.png',
		shiny_image_file: '70-shiny.png',
		emoji: '<:70:1417088782699728988>',
		shiny_emoji: '',
		evolution: [{ to: 'Victreebel', conditions: [{ type: 'item', value: 'leaf-stone' }] }]
	},
	{
		dex_id: 71,
		name: 'Victreebel',
		description: 'Lures prey with the sweet aroma of honey. Swallowed whole, the prey is dissolved in a day, bones and all.',
		type: ['Grass', 'Poison'],
		tier: 'Epic',
		appearance: { height: 1.7, weight: 15.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 105, def: 65, spatk: 100, spdef: 70, spd: 70 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Gluttony', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '71.png',
		shiny_image_file: '71-shiny.png',
		emoji: '<:71:1417088792443097200>',
		shiny_emoji: ''
	},
	{
		dex_id: 72,
		name: 'Tentacool',
		description: 'Its body is virtually composed of water. It shoots strange beams from its crystal-like eyes.',
		type: ['Water', 'Poison'],
		tier: 'Common',
		appearance: { height: 0.9, weight: 45.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 40, def: 35, spatk: 50, spdef: 100, spd: 70 },
		available_abilities: [
			{ name: 'Clear Body', is_hidden: false },
			{ name: 'Liquid Ooze', is_hidden: false },
			{ name: 'Rain Dish', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '72.png',
		shiny_image_file: '72-shiny.png',
		emoji: '<:72:1417088799510495263>',
		shiny_emoji: '',
		evolution: [{ to: 'Tentacruel', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 73,
		name: 'Tentacruel',
		description: 'Its 80 tentacles can stretch and contract freely. They wrap around prey and weaken it with poison.',
		type: ['Water', 'Poison'],
		tier: 'Rare',
		appearance: { height: 1.6, weight: 55.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 70, def: 65, spatk: 80, spdef: 120, spd: 100 },
		available_abilities: [
			{ name: 'Clear Body', is_hidden: false },
			{ name: 'Liquid Ooze', is_hidden: false },
			{ name: 'Rain Dish', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '73.png',
		shiny_image_file: '73-shiny.png',
		emoji: '<:73:1417088808318664775>',
		shiny_emoji: ''
	},
	{
		dex_id: 74,
		name: 'Geodude',
		description: 'Commonly found near mountain trails, etc. If you step on one by accident, it gets angry.',
		type: ['Rock', 'Ground'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 20.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 80, def: 100, spatk: 30, spdef: 30, spd: 20 },
		available_abilities: [
			{ name: 'Rock Head', is_hidden: false },
			{ name: 'Sturdy', is_hidden: false },
			{ name: 'Sand Veil', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '74.png',
		shiny_image_file: '74-shiny.png',
		emoji: '<:74:1417088815251849328>',
		shiny_emoji: '',
		evolution: [{ to: 'Graveler', conditions: [{ type: 'level_up', value: 25 }] }]
	},
	{
		dex_id: 75,
		name: 'Graveler',
		description: 'A slow-moving Cokemon. It rolls down slopes to move, crushing everything in its path.',
		type: ['Rock', 'Ground'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 105.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 95, def: 115, spatk: 45, spdef: 45, spd: 35 },
		available_abilities: [
			{ name: 'Rock Head', is_hidden: false },
			{ name: 'Sturdy', is_hidden: false },
			{ name: 'Sand Veil', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '75.png',
		shiny_image_file: '75-shiny.png',
		emoji: '<:75:1417088824982503465>',
		shiny_emoji: '',
		evolution: [{ to: 'Golem', conditions: [{ type: 'trade' }] }]
	},
	{
		dex_id: 76,
		name: 'Golem',
		description: 'It is enclosed in a hard shell that is as rugged as slabs of rock. It sheds its skin once a year to grow larger.',
		type: ['Rock', 'Ground'],
		tier: 'Epic',
		appearance: { height: 1.4, weight: 300.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 120, def: 130, spatk: 55, spdef: 65, spd: 45 },
		available_abilities: [
			{ name: 'Rock Head', is_hidden: false },
			{ name: 'Sturdy', is_hidden: false },
			{ name: 'Sand Veil', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '76.png',
		shiny_image_file: '76-shiny.png',
		emoji: '<:76:1417088882587205652>',
		shiny_emoji: ''
	},
	{
		dex_id: 77,
		name: 'Ponyta',
		description: 'Its hooves are 10 times harder than diamonds. It can trample anything completely flat in little time.',
		type: ['Fire'],
		tier: 'Common',
		appearance: { height: 1.0, weight: 30.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 85, def: 55, spatk: 65, spdef: 65, spd: 90 },
		available_abilities: [
			{ name: 'Run Away', is_hidden: false },
			{ name: 'Flash Fire', is_hidden: false },
			{ name: 'Flame Body', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '77.png',
		shiny_image_file: '77-shiny.png',
		emoji: '<:77:1417088892276047954>',
		shiny_emoji: '',
		evolution: [{ to: 'Rapidash', conditions: [{ type: 'level_up', value: 40 }] }]
	},
	{
		dex_id: 78,
		name: 'Rapidash',
		description: 'Very competitive, this Cokemon will chase anything that moves fast in the hopes of racing it.',
		type: ['Fire'],
		tier: 'Rare',
		appearance: { height: 1.7, weight: 95.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 100, def: 70, spatk: 80, spdef: 80, spd: 105 },
		available_abilities: [
			{ name: 'Run Away', is_hidden: false },
			{ name: 'Flash Fire', is_hidden: false },
			{ name: 'Flame Body', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '78.png',
		shiny_image_file: '78-shiny.png',
		emoji: '<:78:1417088899020357702>',
		shiny_emoji: ''
	},
	{
		dex_id: 79,
		name: 'Slowpoke',
		description: 'It is always vacantly staring into space. If something bites its tail, it will not even notice for a whole day.',
		type: ['Water', 'Psychic'],
		tier: 'Common',
		appearance: { height: 1.2, weight: 36.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 65, def: 65, spatk: 40, spdef: 40, spd: 15 },
		available_abilities: [
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Own Tempo', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '79.png',
		shiny_image_file: '79-shiny.png',
		emoji: '<:79:1417088931853504534>',
		shiny_emoji: '',
		evolution: [
			{ to: 'Slowbro', conditions: [{ type: 'level_up', value: 37 }] },
			{ to: 'Slowking', conditions: [{ type: 'trade_item', value: 'kings-rock' }] }
		]
	},
	{
		dex_id: 80,
		name: 'Slowbro',
		description: 'The Shellder that is latched onto Slowpoke\'s tail is said to feed on the host\'s leftover scraps.',
		type: ['Water', 'Psychic'],
		tier: 'Rare',
		appearance: { height: 1.6, weight: 78.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 95, atk: 75, def: 110, spatk: 100, spdef: 80, spd: 30 },
		available_abilities: [
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Own Tempo', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '80.png',
		shiny_image_file: '80-shiny.png',
		emoji: '<:80:1417088968960380958>',
		shiny_emoji: ''
	},
	{
		dex_id: 81,
		name: 'Magnemite',
		description: 'The units at its sides are powerful magnets. They generate magnetism that draws in iron objects.',
		type: ['Electric', 'Steel'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 6.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 25, atk: 35, def: 70, spatk: 95, spdef: 55, spd: 45 },
		available_abilities: [
			{ name: 'Magnet Pull', is_hidden: false },
			{ name: 'Sturdy', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '81.png',
		shiny_image_file: '81-shiny.png',
		emoji: '<:81:1417088976073789450>',
		shiny_emoji: '',
		evolution: [{ to: 'Magneton', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 82,
		name: 'Magneton',
		description: 'It is actually three Magnemite linked by magnetism. It is said that it can discharge powerful magnetic forces.',
		type: ['Electric', 'Steel'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 60.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 50, atk: 60, def: 95, spatk: 120, spdef: 70, spd: 70 },
		available_abilities: [
			{ name: 'Magnet Pull', is_hidden: false },
			{ name: 'Sturdy', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '82.png',
		shiny_image_file: '82-shiny.png',
		emoji: '<:82:1417088983653154866>',
		shiny_emoji: '',
		evolution: [{ to: 'Magnezone', conditions: [{ type: 'location', value: 'Electric' }] }]
	},
	{
		dex_id: 83,
		name: "Farfetch'd",
		description: 'It always walks about with a plant stalk held in its wings. The stalk is used for building its nest.',
		type: ['Normal', 'Flying'],
		tier: 'Common',
		appearance: { height: 0.8, weight: 15.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 52, atk: 90, def: 55, spatk: 58, spdef: 62, spd: 60 },
		available_abilities: [
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Inner Focus', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '83.png',
		shiny_image_file: '83-shiny.png',
		emoji: '<:83:1417088993861828649>',
		shiny_emoji: ''
	},
	{
		dex_id: 84,
		name: 'Doduo',
		description: 'A two-headed Cokemon that was discovered as a sudden mutation. It runs at a pace of over 60 miles per hour.',
		type: ['Normal' ,'Flying'],
		tier: 'Common',
		appearance: { height: 1.4, weight: 39.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 35, atk: 85, def: 45, spatk: 35, spdef: 35, spd: 75 },
		available_abilities: [
			{ name: 'Run Away', is_hidden: false },
			{ name: 'Early Bird', is_hidden: false },
			{ name: 'Tangled Feet', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '84.png',
		shiny_image_file: '84-shiny.png',
		emoji: '<:84:1417089007040593972>',
		shiny_emoji: '',
		evolution: [{ to: 'Dodrio', conditions: [{ type: 'level_up', value: 31 }] }]
	},
	{
		dex_id: 85,
		name: 'Dodrio',
		description: 'One of Doduo’s two heads splits to form a unique species. It runs deftly with its three heads.',
		type: ['Normal', 'Flying'],
		tier: 'Rare',
		appearance: { height: 1.8, weight: 85.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 110, def: 70, spatk: 60, spdef: 60, spd: 110 },
		available_abilities: [
			{ name: 'Run Away', is_hidden: false },
			{ name: 'Early Bird', is_hidden: false },
			{ name: 'Tangled Feet', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '85.png',
		shiny_image_file: '85-shiny.png',
		emoji: '<:85:1417089015332474941>',
		shiny_emoji: ''
	},
	{
		dex_id: 86,
		name: 'Seel',
		description: 'The horn on its head is sharp. It is used for bashing through thick ice.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 1.1, weight: 90.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 45, def: 55, spatk: 45, spdef: 70, spd: 45 },
		available_abilities: [
			{ name: 'Thick Fat', is_hidden: false },
			{ name: 'Hydration', is_hidden: false },
			{ name: 'Ice Body', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '86.png',
		shiny_image_file: '86-shiny.png',
		emoji: '<:86:1417089026934182009>',
		shiny_emoji: '',
		evolution: [{ to: 'Dewgong', conditions: [{ type: 'level_up', value: 34 }] }]
	},
	{
		dex_id: 87,
		name: 'Dewgong',
		description: 'Its entire body is a snowy white. Unharmed by even intense cold, it swims powerfully in icy waters.',
		type: ['Water', 'Ice'],
		tier: 'Rare',
		appearance: { height: 1.7, weight: 120.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 70, def: 80, spatk: 70, spdef: 95, spd: 70 },
		available_abilities: [
			{ name: 'Thick Fat', is_hidden: false },
			{ name: 'Hydration', is_hidden: false },
			{ name: 'Ice Body', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '87.png',
		shiny_image_file: '87-shiny.png',
		emoji: '<:87:1417089041446211655>',
		shiny_emoji: ''
	},
	{
		dex_id: 88,
		name: 'Grimer',
		description: 'As it moves, it loses bits of its body from which new Grimer emerge. This worsens the stench around it.',
		type: ['Poison'],
		tier: 'Common',
		appearance: { height: 0.9, weight: 30.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 80, def: 50, spatk: 40, spdef: 50, spd: 25 },
		available_abilities: [
			{ name: 'Stench', is_hidden: false },
			{ name: 'Sticky Hold', is_hidden: false },
			{ name: 'Poison Touch', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '88.png',
		shiny_image_file: '88-shiny.png',
		emoji: '<:88:1417089048031264778>',
		shiny_emoji: '',
		evolution: [{ to: 'Muk', conditions: [{ type: 'level_up', value: 38 }] }]
	},
	{
		dex_id: 89,
		name: 'Muk',
		description: 'A toxic fluid seeps from its body. The fluid instantly kills plants and trees on contact.',
		type: ['Poison'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 30.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 105, atk: 105, def: 75, spatk: 65, spdef: 100, spd: 50 },
		available_abilities: [
			{ name: 'Stench', is_hidden: false },
			{ name: 'Sticky Hold', is_hidden: false },
			{ name: 'Poison Touch', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '89.png',
		shiny_image_file: '89-shiny.png',
		emoji: '<:89:1417089057183236116>',
		shiny_emoji: ''
	},
	{
		dex_id: 90,
		name: 'Shellder',
		description: 'Its hard shell repels any kind of attack. It is vulnerable only when its shell is open.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 4.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 30, atk: 65, def: 100, spatk: 45, spdef: 25, spd: 40 },
		available_abilities: [
			{ name: 'Shell Armor', is_hidden: false },
			{ name: 'Skill Link', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '90.png',
		shiny_image_file: '90-shiny.png',
		emoji: '<:90:1417089069808353300>',
		shiny_emoji: '',
		evolution: [{ to: 'Cloyster', conditions: [{ type: 'item', value: 'water-stone' }] }]
	},
	{
		dex_id: 91,
		name: 'Cloyster',
		description: 'Its shell is extremely hard. It cannot be shattered, even with a bomb. The shell opens only when it is attacking.',
		type: ['Water', 'Ice'],
		tier: 'Epic',
		appearance: { height: 1.5, weight: 132.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 95, def: 180, spatk: 85, spdef: 45, spd: 70 },
		available_abilities: [
			{ name: 'Shell Armor', is_hidden: false },
			{ name: 'Skill Link', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '91.png',
		shiny_image_file: '91-shiny.png',
		emoji: '<:91:1417089101643120661>',
		shiny_emoji: ''
	},
	{
		dex_id: 92,
		name: 'Gastly',
		description: 'A being that exists as a thin gas. It can topple an Indian elephant by enveloping the prey in two seconds.',
		type: ['Ghost', 'Poison'],
		tier: 'Common',
		appearance: { height: 1.3, weight: 0.1 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 30, atk: 35, def: 30, spatk: 100, spdef: 35, spd: 80 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '92.png',
		shiny_image_file: '92-shiny.png',
		emoji: '<:92:1417089152637472809>',
		shiny_emoji: '',
		evolution: [{ to: 'Haunter', conditions: [{ type: 'level_up', value: 25 }] }]
	},
	{
		dex_id: 93,
		name: 'Haunter',
		description: 'If you get the feeling of being watched in darkness, it is definitely a Haunter nearby.',
		type: ['Ghost', 'Poison'],
		tier: 'Rare',
		appearance: { height: 1.6, weight: 0.1 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 50, def: 45, spatk: 115, spdef: 55, spd: 95 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '93.png',
		shiny_image_file: '93-shiny.png',
		emoji: '<:93:1417089178302283837>',
		shiny_emoji: '',
		evolution: [{ to: 'Gengar', conditions: [{ type: 'trade' }] }]
	},
	{
		dex_id: 94,
		name: 'Gengar',
		description: 'It is said to emerge from darkness to steal the lives of those who become lost in mountains.',
		type: ['Ghost', 'Poison'],
		tier: 'Epic',
		appearance: { height: 1.5, weight: 40.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 65, def: 60, spatk: 130, spdef: 75, spd: 110 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '94.png',
		shiny_image_file: '94-shiny.png',
		emoji: '<:94:1417089205217005730>',
		shiny_emoji: ''
	},
	{
		dex_id: 95,
		name: 'Onix',
		description: 'It tunnels under the ground at 50 miles per hour. It eats large boulders and stones.',
		type: ['Rock', 'Ground'],
		tier: 'Rare',
		appearance: { height: 8.8, weight: 210.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 35, atk: 45, def: 160, spatk: 30, spdef: 45, spd: 70 },
		available_abilities: [
			{ name: 'Rock Head', is_hidden: false },
			{ name: 'Sturdy', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '95.png',
		shiny_image_file: '95-shiny.png',
		emoji: '<:95:1417089326638039121>',
		shiny_emoji: '',
		evolution: [{ to: 'Steelix', conditions: [{ type: 'trade_item', value: 'metal-coat' }] }]
	},
	{
		dex_id: 96,
		name: 'Drowzee',
		description: 'It can tell what people are dreaming by sniffing with its big nose. It loves to eat pleasant dreams.',
		type: ['Psychic'],
		tier: 'Common',
		appearance: { height: 1.0, weight: 32.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 48, def: 45, spatk: 43, spdef: 90, spd: 42 },
		available_abilities: [
			{ name: 'Insomnia', is_hidden: false },
			{ name: 'Forewarn', is_hidden: false },
			{ name: 'Inner Focus', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '96.png',
		shiny_image_file: '96-shiny.png',
		emoji: '<:96:1417089335244623993>',
		shiny_emoji: '',
		evolution: [{ to: 'Hypno', conditions: [{ type: 'level_up', value: 26 }] }]
	},
	{
		dex_id: 97,
		name: 'Hypno',
		description: 'When it locks eyes with an enemy, it will use a mix of PSI moves, such as Hypnosis and Confusion.',
		type: ['Psychic'],
		tier: 'Rare',
		appearance: { height: 1.6, weight: 75.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 85, atk: 73, def: 70, spatk: 73, spdef: 115, spd: 67 },
		available_abilities: [
			{ name: 'Insomnia', is_hidden: false },
			{ name: 'Forewarn', is_hidden: false },
			{ name: 'Inner Focus', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '97.png',
		shiny_image_file: '97-shiny.png',
		emoji: '<:97:1417089342563942491>',
		shiny_emoji: ''
	},
	{
		dex_id: 98,
		name: 'Krabby',
		description: 'Its pincers are not only powerful weapons, they are used for balance when walking sideways.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 6.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 30, atk: 105, def: 90, spatk: 25, spdef: 25, spd: 50 },
		available_abilities: [
			{ name: 'Hyper Cutter', is_hidden: false },
			{ name: 'Shell Armor', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '98.png',
		shiny_image_file: '98-shiny.png',
		emoji: '<:98:1417089354085568542>',
		shiny_emoji: '',
		evolution: [{ to: 'Kingler', conditions: [{ type: 'level_up', value: 28 }] }]
	},
	{
		dex_id: 99,
		name: 'Kingler',
		description: 'Its large pincer has 10,000-horsepower strength. However, it is so heavy, it is difficult to aim.',
		type: ['Water'],
		tier: 'Rare',
		appearance: { height: 1.3, weight: 60.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 130, def: 115, spatk: 50, spdef: 50, spd: 75 },
		available_abilities: [
			{ name: 'Hyper Cutter', is_hidden: false },
			{ name: 'Shell Armor', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '99.png',
		shiny_image_file: '99-shiny.png',
		emoji: '<:99:1417089361194778655>',
		shiny_emoji: ''
	},
	{
		dex_id: 100,
		name: 'Voltorb',
		description: 'It is said to camouflage itself as a Poké Ball. It will self-destruct with very little stimulus.',
		type: ['Electric'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 10.4 },
		available_genders: ['Genderless'],
		base_stats: { hp: 40, atk: 30, def: 50, spatk: 55, spdef: 55, spd: 100 },
		available_abilities: [
			{ name: 'Soundproof', is_hidden: false },
			{ name: 'Static', is_hidden: false },
			{ name: 'Aftermath', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '100.png',
		shiny_image_file: '100-shiny.png',
		emoji: '<:100:1417089371143802973>',
		shiny_emoji: '',
		evolution: [{ to: 'Electrode', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 101,
		name: 'Electrode',
		description: 'It stores an immense amount of electricity. It is feared for its tendency to explode with little warning.',
		type: ['Electric'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 66.6 },
		available_genders: ['Genderless'],
		base_stats: { hp: 60, atk: 50, def: 70, spatk: 80, spdef: 80, spd: 150 },
		available_abilities: [
			{ name: 'Soundproof', is_hidden: false },
			{ name: 'Static', is_hidden: false },
			{ name: 'Aftermath', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '101.png',
		shiny_image_file: '101-shiny.png',
		emoji: '<:101:1417089377368150088>',
		shiny_emoji: ''
	},
	{
		dex_id: 102,
		name: 'Exeggcute',
		description: 'Its six eggs converse using telepathy. They can quickly gather if they become separated.',
		type: ['Grass', 'Psychic'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 2.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 40, def: 80, spatk: 60, spdef: 45, spd: 40 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '102.png',
		shiny_image_file: '102-shiny.png',
		emoji: '<:102:1417089385157099580>',
		shiny_emoji: '',
		evolution: [{ to: 'Exeggutor', conditions: [{ type: 'item', value: 'leaf-stone' }] }]
	},
	{
		dex_id: 103,
		name: 'Exeggutor',
		description: 'It is called The Walking Jungle. If a head grows too big, it falls off and becomes an Exeggcute.',
		type: ['Grass', 'Psychic'],
		tier: 'Epic',
		appearance: { height: 2.0, weight: 120.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 95, atk: 95, def: 85, spatk: 125, spdef: 75, spd: 55 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '103.png',
		shiny_image_file: '103-shiny.png',
		emoji: '<:103:1417089395340607518>',
		shiny_emoji: ''
	},
	{
		dex_id: 104,
		name: 'Cubone',
		description: 'It wears the skull of its deceased mother. Its cries echo inside the skull and come out as a sad melody.',
		type: ['Ground'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 6.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 50, def: 95, spatk: 40, spdef: 50, spd: 35 },
		available_abilities: [
			{ name: 'Rock Head', is_hidden: false },
			{ name: 'Lightning Rod', is_hidden: false },
			{ name: 'Battle Armor', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '104.png',
		shiny_image_file: '104-shiny.png',
		emoji: '<:104:1417089402873843712>',
		shiny_emoji: '',
		evolution: [{ to: 'Marowak', conditions: [{ type: 'level_up', value: 28 }] }]
	},
	{
		dex_id: 105,
		name: 'Marowak',
		description: 'The bone it holds is its key weapon. It throws the bone skillfully like a boomerang to KO targets.',
		type: ['Ground'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 45.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 80, def: 110, spatk: 50, spdef: 80, spd: 45 },
		available_abilities: [
			{ name: 'Rock Head', is_hidden: false },
			{ name: 'Lightning Rod', is_hidden: false },
			{ name: 'Battle Armor', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '105.png',
		shiny_image_file: '105-shiny.png',
		emoji: '<:105:1417089413875499099>',
		shiny_emoji: ''
	},
	{
		dex_id: 106,
		name: 'Hitmonlee',
		description: 'Its legs can stretch and contract freely. Using this elasticity, it overwhelms foes with devastating kicks.',
		type: ['Fighting'],
		tier: 'Rare',
		appearance: { height: 1.5, weight: 49.8 },
		available_genders: ['Male'],
		base_stats: { hp: 50, atk: 120, def: 53, spatk: 35, spdef: 110, spd: 87 },
		available_abilities: [
			{ name: 'Limber', is_hidden: false },
			{ name: 'Reckless', is_hidden: false },
			{ name: 'Unburden', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '106.png',
		shiny_image_file: '106-shiny.png',
		emoji: '<:106:1417089421198495774>',
		shiny_emoji: ''
	},
	{
		dex_id: 107,
		name: 'Hitmonchan',
		description: 'The spirit of a pro boxer has possessed it. It has an indomitable spirit and will never give up.',
		type: ['Fighting'],
		tier: 'Rare',
		appearance: { height: 1.4, weight: 50.2 },
		available_genders: ['Male'],
		base_stats: { hp: 50, atk: 105, def: 79, spatk: 35, spdef: 110, spd: 76 },
		available_abilities: [
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Iron Fist', is_hidden: false },
			{ name: 'Inner Focus', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '107.png',
		shiny_image_file: '107-shiny.png',
		emoji: '<:107:1417089429914390569>',
		shiny_emoji: ''
	},
	{
		dex_id: 108,
		name: 'Lickitung',
		description: 'Its tongue is twice the length of its body. It is covered with a sticky saliva that adheres to anything.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 1.2, weight: 65.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 55, def: 75, spatk: 60, spdef: 75, spd: 30 },
		available_abilities: [
			{ name: 'Own Tempo', is_hidden: false },
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Cloud Nine', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '108.png',
		shiny_image_file: '108-shiny.png',
		emoji: '<:108:1417089447392055347>',
		shiny_emoji: '',
		evolution: [{ to: 'Lickilicky', conditions: [{ type: 'move_known', value: 'Rollout' }] }]
	},
	{
		dex_id: 109,
		name: 'Koffing',
		description: 'Its thin, balloon-like body is inflated with a toxic gas. It floats in midair, searching for garbage.',
		type: ['Poison'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 1.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 65, def: 95, spatk: 60, spdef: 45, spd: 35 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false },
			{ name: 'Stench', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '109.png',
		shiny_image_file: '109-shiny.png',
		emoji: '<:109:1417089457131360287>',
		shiny_emoji: '',
		evolution: [{ to: 'Weezing', conditions: [{ type: 'level_up', value: 35 }] }]
	},
	{
		dex_id: 110,
		name: 'Weezing',
		description: 'It grows by feeding on gases released by garbage. Though very rare, triplets have been found.',
		type: ['Poison'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 9.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 90, def: 120, spatk: 85, spdef: 70, spd: 60 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false },
			{ name: 'Stench', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '110.png',
		shiny_image_file: '110-shiny.png',
		emoji: '<:110:1417089464559468574>',
		shiny_emoji: ''
	},
	{
		dex_id: 111,
		name: 'Rhyhorn',
		description: 'Its body is clad in a thick hide. It is a dull-witted Cokemon that can’t remember running into things.',
		type: ['Rock', 'Ground'],
		tier: 'Common',
		appearance: { height: 1.0, weight: 115.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 85, def: 95, spatk: 30, spdef: 30, spd: 25 },
		available_abilities: [
			{ name: 'Lightning Rod', is_hidden: false },
			{ name: 'Rock Head', is_hidden: false },
			{ name: 'Reckless', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '111.png',
		shiny_image_file: '111-shiny.png',
		emoji: '<:111:1417089489930555422>',
		shiny_emoji: '',
		evolution: [{ to: 'Rhydon', conditions: [{ type: 'level_up', value: 42 }] }]
	},
	{
		dex_id: 112,
		name: 'Rhydon',
		description: 'It begins walking on its hind legs after evolution. It can punch holes through boulders with its horn.',
		type: ['Rock', 'Ground'],
		tier: 'Rare',
		appearance: { height: 1.9, weight: 120.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 105, atk: 130, def: 120, spatk: 45, spdef: 45, spd: 40 },
		available_abilities: [
			{ name: 'Lightning Rod', is_hidden: false },
			{ name: 'Rock Head', is_hidden: false },
			{ name: 'Reckless', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '112.png',
		shiny_image_file: '112-shiny.png',
		emoji: '<:112:1417089498776338442>',
		shiny_emoji: '',
		evolution: [{ to: 'Rhyperior', conditions: [{ type: 'trade_item', value: 'protector' }] }]
	},
	{
		dex_id: 113,
		name: 'Chansey',
		description: 'A kindhearted Cokemon that lays a few eggs a day. The eggs are nutritious and tasty.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 34.6 },
		available_genders: ['Female'],
		base_stats: { hp: 250, atk: 5, def: 5, spatk: 35, spdef: 105, spd: 50 },
		available_abilities: [
			{ name: 'Natural Cure', is_hidden: false },
			{ name: 'Serene Grace', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '113.png',
		shiny_image_file: '113-shiny.png',
		emoji: '<:113:1417089508872159303>',
		shiny_emoji: '',
		evolution: [{ to: 'Blissey', conditions: [{ type: 'friendship', value: 220 }] }]
	},
	{
		dex_id: 114,
		name: 'Tangela',
		description: 'Its identity is obscured by a tangle of blue vines. It gently tangles anyone that comes close.',
		type: ['Grass'],
		tier: 'Common',
		appearance: { height: 1.0, weight: 35.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 55, def: 115, spatk: 100, spdef: 40, spd: 60 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Leaf Guard', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '114.png',
		shiny_image_file: '114-shiny.png',
		emoji: '<:114:1417089515138322433>',
		shiny_emoji: '',
		evolution: [{ to: 'Tangrowth', conditions: [{ type: 'move_known', value: 'Ancient Power' }] }]
	},
	{
		dex_id: 115,
		name: 'Kangaskhan',
		description: 'It raises its young in its belly pouch. It lets the baby out to play only when it feels safe.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 2.2, weight: 80.0 },
		available_genders: ['Female'],
		base_stats: { hp: 105, atk: 95, def: 80, spatk: 40, spdef: 80, spd: 90 },
		available_abilities: [
			{ name: 'Early Bird', is_hidden: false },
			{ name: 'Scrappy', is_hidden: false },
			{ name: 'Inner Focus', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '115.png',
		shiny_image_file: '115-shiny.png',
		emoji: '<:115:1417089522428018699>',
		shiny_emoji: ''
	},
	{
		dex_id: 116,
		name: 'Horsea',
		description: 'It maintains balance using its tail, which is coiled like a spring. It can skillfully shoot ink from its mouth.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 8.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 30, atk: 40, def: 70, spatk: 70, spdef: 25, spd: 60 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Sniper', is_hidden: false },
			{ name: 'Damp', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '116.png',
		shiny_image_file: '116-shiny.png',
		emoji: '<:116:1417089529944342638>',
		shiny_emoji: '',
		evolution: [{ to: 'Seadra', conditions: [{ type: 'level_up', value: 32 }] }]
	},
	{
		dex_id: 117,
		name: 'Seadra',
		description: 'Its body is covered with thorny spikes. It can fire venomous barbs from its fins.',
		type: ['Water'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 25.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 65, def: 95, spatk: 95, spdef: 45, spd: 85 },
		available_abilities: [
			{ name: 'Poison Point', is_hidden: false },
			{ name: 'Sniper', is_hidden: false },
			{ name: 'Damp', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '117.png',
		shiny_image_file: '117-shiny.png',
		emoji: '<:117:1417089537842348085>',
		shiny_emoji: '',
		evolution: [{ to: 'Kingdra', conditions: [{ type: 'trade_item', value: 'dragon-scale' }] }]
	},
	{
		dex_id: 118,
		name: 'Goldeen',
		description: 'Its dorsal, pectoral, and tail fins wave elegantly in water. That is why it is known as the water dancer.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 15.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 67, def: 60, spatk: 35, spdef: 50, spd: 63 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Water Veil', is_hidden: false },
			{ name: 'Lightning Rod', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '118.png',
		shiny_image_file: '118-shiny.png',
		emoji: '<:118:1417089547841572954>',
		shiny_emoji: '',
		evolution: [{ to: 'Seaking', conditions: [{ type: 'level_up', value: 33 }] }]
	},
	{
		dex_id: 119,
		name: 'Seaking',
		description: 'In the autumn spawning season, they can be seen swimming powerfully up rivers and creeks.',
		type: ['Water'],
		tier: 'Rare',
		appearance: { height: 1.3, weight: 39.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 92, def: 65, spatk: 65, spdef: 80, spd: 68 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Water Veil', is_hidden: false },
			{ name: 'Lightning Rod', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '119.png',
		shiny_image_file: '119-shiny.png',
		emoji: '<:119:1417089559061069895>',
		shiny_emoji: ''
	},
	{
		dex_id: 120,
		name: 'Staryu',
		description: 'As long as its central core is intact, it can regenerate its body instantly, even if it’s torn apart.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.8, weight: 34.5 },
		available_genders: ['Genderless'],
		base_stats: { hp: 30, atk: 45, def: 55, spatk: 70, spdef: 55, spd: 85 },
		available_abilities: [
			{ name: 'Illuminate', is_hidden: false },
			{ name: 'Natural Cure', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '120.png',
		shiny_image_file: '120-shiny.png',
		emoji: '<:120:1417089566241849366>',
		shiny_emoji: '',
		evolution: [{ to: 'Starmie', conditions: [{ type: 'item', value: 'water-stone' }] }]
	},
	{
		dex_id: 121,
		name: 'Starmie',
		description: 'The core in the center of its body glows with the seven colors of the rainbow. Some people value the core as a gem.',
		type: ['Water', 'Psychic'],
		tier: 'Epic',
		appearance: { height: 1.1, weight: 80.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 60, atk: 75, def: 85, spatk: 100, spdef: 85, spd: 115 },
		available_abilities: [
			{ name: 'Illuminate', is_hidden: false },
			{ name: 'Natural Cure', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '121.png',
		shiny_image_file: '121-shiny.png',
		emoji: '<:121:1417089574022156370>',
		shiny_emoji: ''
	},
	{
		dex_id: 122,
		name: 'Mr. Mime',
		description: 'A master of pantomime, it can create invisible walls with its gestures.',
		type: ['Psychic', 'Fairy'],
		tier: 'Rare',
		appearance: { height: 1.3, weight: 54.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 45, def: 65, spatk: 100, spdef: 120, spd: 90 },
		available_abilities: [
			{ name: 'Soundproof', is_hidden: false },
			{ name: 'Filter', is_hidden: false },
			{ name: 'Technician', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '122.png',
		shiny_image_file: '122-shiny.png',
		emoji: '<:122:1417089581060325506>',
		shiny_emoji: ''
	},
	{
		dex_id: 123,
		name: 'Scyther',
		description: 'It slashes through grass with its sharp scythes, moving too fast for the human eye to track.',
		type: ['Bug', 'Flying'],
		tier: 'Rare',
		appearance: { height: 1.5, weight: 56.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 110, def: 80, spatk: 55, spdef: 80, spd: 105 },
		available_abilities: [
			{ name: 'Swarm', is_hidden: false },
			{ name: 'Technician', is_hidden: false },
			{ name: 'Steadfast', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '123.png',
		shiny_image_file: '123-shiny.png',
		emoji: '<:123:1417089588052361297>',
		shiny_emoji: '',
		evolution: [{ to: 'Scizor', conditions: [{ type: 'trade_item', value: 'metal-coat' }] }]
	},
	{
		dex_id: 124,
		name: 'Jynx',
		description: 'It seductively wiggles its hips as it walks. It can cause people to dance in unison with it.',
		type: ['Ice', 'Psychic'],
		tier: 'Rare',
		appearance: { height: 1.4, weight: 40.6 },
		available_genders: ['Female'],
		base_stats: { hp: 65, atk: 50, def: 35, spatk: 115, spdef: 95, spd: 95 },
		available_abilities: [
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Forewarn', is_hidden: false },
			{ name: 'Dry Skin', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '124.png',
		shiny_image_file: '124-shiny.png',
		emoji: '<:124:1417089607962722344>',
		shiny_emoji: ''
	},
	{
		dex_id: 125,
		name: 'Electabuzz',
		description: 'It loves to feed on strong electricity. It is found near power plants.',
		type: ['Electric'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 30.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 83, def: 57, spatk: 95, spdef: 85, spd: 105 },
		available_abilities: [
			{ name: 'Static', is_hidden: false },
			{ name: 'Vital Spirit', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '125.png',
		shiny_image_file: '125-shiny.png',
		emoji: '<:125:1417089616485552229>',
		shiny_emoji: '',
		evolution: [{ to: 'Electivire', conditions: [{ type: 'trade_item', value: 'electirizer' }] }]
	},
	{
		dex_id: 126,
		name: 'Magmar',
		description: 'Born in an active volcano. Its body is always burning, so it looks like a flickering flame.',
		type: ['Fire'],
		tier: 'Rare',
		appearance: { height: 1.3, weight: 44.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 95, def: 57, spatk: 100, spdef: 85, spd: 93 },
		available_abilities: [
			{ name: 'Flame Body', is_hidden: false },
			{ name: 'Vital Spirit', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '126.png',
		shiny_image_file: '126-shiny.png',
		emoji: '<:126:1417089623829516359>',
		shiny_emoji: '',
		evolution: [{ to: 'Magmortar', conditions: [{ type: 'trade_item', value: 'magmarizer' }] }]
	},
	{
		dex_id: 127,
		name: 'Pinsir',
		description: 'It grips prey with its pincers until the prey is torn in half. What it can’t tear, it tosses far.',
		type: ['Bug'],
		tier: 'Rare',
		appearance: { height: 1.5, weight: 55.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 125, def: 100, spatk: 55, spdef: 70, spd: 85 },
		available_abilities: [
			{ name: 'Hyper Cutter', is_hidden: false },
			{ name: 'Mold Breaker', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '127.png',
		shiny_image_file: '127-shiny.png',
		emoji: '<:127:1417089632775966800>',
		shiny_emoji: ''
	},
	{
		dex_id: 128,
		name: 'Tauros',
		description: 'Once it takes aim at its foe, it makes a headlong charge. It is famous for its violent nature.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 1.4, weight: 88.4 },
		available_genders: ['Male'],
		base_stats: { hp: 75, atk: 100, def: 95, spatk: 40, spdef: 70, spd: 110 },
		available_abilities: [
			{ name: 'Intimidate', is_hidden: false },
			{ name: 'Anger Point', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '128.png',
		shiny_image_file: '128-shiny.png',
		emoji: '<:128:1417089641961754645>',
		shiny_emoji: ''
	},
	{
		dex_id: 129,
		name: 'Magikarp',
		description: 'A Magikarp living for many years can leap a mountain using Splash. The move remains useless, though.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.9, weight: 10.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 20, atk: 10, def: 55, spatk: 15, spdef: 20, spd: 80 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.1,
		image_file: '129.png',
		shiny_image_file: '129-shiny.png',
		emoji: '<:129:1417089662534553600>',
		shiny_emoji: '',
		evolution: [{ to: 'Gyarados', conditions: [{ type: 'level_up', value: 20 }] }]
	},
	{
		dex_id: 130,
		name: 'Gyarados',
		description: 'It has an extremely aggressive nature. The Hyper Beam it fires from its mouth totally incinerates all targets.',
		type: ['Water', 'Flying'],
		tier: 'Epic',
		appearance: { height: 6.5, weight: 235.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 95, atk: 125, def: 79, spatk: 60, spdef: 100, spd: 81 },
		available_abilities: [
			{ name: 'Intimidate', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '130.png',
		shiny_image_file: '130-shiny.png',
		emoji: '<:130:1417089675796938772>',
		shiny_emoji: ''
	},
	{
		dex_id: 131,
		name: 'Lapras',
		description: 'A gentle soul that can read the minds of people. It can ferry people across the sea on its back.',
		type: ['Water', 'Ice'],
		tier: 'Epic',
		appearance: { height: 2.5, weight: 220.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 130, atk: 85, def: 80, spatk: 85, spdef: 95, spd: 60 },
		available_abilities: [
			{ name: 'Water Absorb', is_hidden: false },
			{ name: 'Shell Armor', is_hidden: false },
			{ name: 'Hydration', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '131.png',
		shiny_image_file: '131-shiny.png',
		emoji: '<:131:1417089683518914570>',
		shiny_emoji: ''
	},
	{
		dex_id: 132,
		name: 'Ditto',
		description: 'It can reconstitute its entire cellular structure to change into what it sees, but it returns to normal when it relaxes.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 0.3, weight: 4.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 48, atk: 48, def: 48, spatk: 48, spdef: 48, spd: 48 },
		available_abilities: [
			{ name: 'Limber', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '132.png',
		shiny_image_file: '132-shiny.png',
		emoji: '<:132:1417089704129593477>',
		shiny_emoji: ''
	},
	{
		dex_id: 133,
		name: 'Eevee',
		description: 'Its genetic code is irregular. It may mutate if it is exposed to radiation from element stones.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 0.3, weight: 6.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 55, def: 50, spatk: 45, spdef: 65, spd: 55 },
		available_abilities: [
			{ name: 'Run Away', is_hidden: false },
			{ name: 'Adaptability', is_hidden: false },
			{ name: 'Anticipation', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '133.png',
		shiny_image_file: '133-shiny.png',
		emoji: '<:133:1417089711838728223>',
		shiny_emoji: '',
		evolution: [
			{ to: 'Vaporeon', conditions: [{ type: 'item', value: 'water-stone' }] },
			{ to: 'Jolteon', conditions: [{ type: 'item', value: 'thunder-stone' }] },
			{ to: 'Flareon', conditions: [{ type: 'item', value: 'fire-stone' }] },
			{ to: 'Espeon', conditions: [{ type: 'friendship', value: 220 }, { type: 'time_of_day', value: 'day' }] },
			{ to: 'Umbreon', conditions: [{ type: 'friendship', value: 220 }, { type: 'time_of_day', value: 'night' }] },
			{ to: 'Leafeon', conditions: [{ type: 'item', value: 'leaf-stone' }, { type: 'location', value: 'Grass' }] },
			{ to: 'Glaceon', conditions: [{ type: 'item', value: 'ice-stone' },  { type: 'location', value: 'Ice' }] }
		]
	},
	{
		dex_id: 134,
		name: 'Vaporeon',
		description: 'Its cell structure is similar to water molecules. It will melt away and become invisible in water.',
		type: ['Water'],
		tier: 'Epic',
		appearance: { height: 1.0, weight: 29.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 130, atk: 65, def: 60, spatk: 110, spdef: 95, spd: 65 },
		available_abilities: [
			{ name: 'Water Absorb', is_hidden: false },
			{ name: 'Hydration', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '134.png',
		shiny_image_file: '134-shiny.png',
		emoji: '<:134:1417089719753379890>',
		shiny_emoji: ''
	},
	{
		dex_id: 135,
		name: 'Jolteon',
		description: 'It accumulates negative ions from the atmosphere to blast out 10,000-volt lightning bolts.',
		type: ['Electric'],
		tier: 'Epic',
		appearance: { height: 0.8, weight: 24.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 65, def: 60, spatk: 110, spdef: 95, spd: 130 },
		available_abilities: [
			{ name: 'Volt Absorb', is_hidden: false },
			{ name: 'Quick Feet', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '135.png',
		shiny_image_file: '135-shiny.png',
		emoji: '<:135:1417089727336546304>',
		shiny_emoji: ''
	},
	{
		dex_id: 136,
		name: 'Flareon',
		description: 'It has a flame sac in its body. Its body temperature can reach up to 1,650 degrees Fahrenheit.',
		type: ['Fire'],
		tier: 'Epic',
		appearance: { height: 0.9, weight: 25.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 130, def: 60, spatk: 95, spdef: 110, spd: 65 },
		available_abilities: [
			{ name: 'Flash Fire', is_hidden: false },
			{ name: 'Guts', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '136.png',
		shiny_image_file: '136-shiny.png',
		emoji: '<:136:1417089735582679051>',
		shiny_emoji: ''
	},
	{
		dex_id: 137,
		name: 'Porygon',
		description: 'A Cokemon that consists entirely of programming code. It is capable of moving freely in cyberspace.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 0.8, weight: 36.5 },
		available_genders: ['Genderless'],
		base_stats: { hp: 65, atk: 60, def: 70, spatk: 85, spdef: 75, spd: 40 },
		available_abilities: [
			{ name: 'Trace', is_hidden: false },
			{ name: 'Download', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '137.png',
		shiny_image_file: '137-shiny.png',
		emoji: '<:137:1417089743078031423>',
		shiny_emoji: '',
		evolution: [{ to: 'Porygon2', conditions: [{ type: 'trade_item', value: 'upgrade' }] }]
	},
	{
		dex_id: 138,
		name: 'Omanyte',
		description: 'An ancient Cokemon that was recovered from a fossil. It swims by twisting its 10 tentacles about.',
		type: ['Rock', 'Water'],
		tier: 'Rare',
		appearance: { height: 0.4, weight: 7.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 35, atk: 40, def: 100, spatk: 90, spdef: 55, spd: 35 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Shell Armor', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '138.png',
		shiny_image_file: '138-shiny.png',
		emoji: '<:138:1417089748853461082>',
		shiny_emoji: '',
		evolution: [{ to: 'Omastar', conditions: [{ type: 'level_up', value: 40 }] }]
	},
	{
		dex_id: 139,
		name: 'Omastar',
		description: 'Its tentacles are highly developed as if they are hands and feet. As soon as it ensnares prey, it bites.',
		type: ['Rock', 'Water'],
		tier: 'Epic',
		appearance: { height: 1.0, weight: 35.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 60, def: 125, spatk: 115, spdef: 70, spd: 55 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Shell Armor', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '139.png',
		shiny_image_file: '139-shiny.png',
		emoji: '<:139:1417089769573453906>',
		shiny_emoji: ''
	},
	{
		dex_id: 140,
		name: 'Kabuto',
		description: 'A Cokemon that was recovered from a fossil. It uses the eyes on its back while hiding on the seafloor.',
		type: ['Rock', 'Water'],
		tier: 'Rare',
		appearance: { height: 0.5, weight: 11.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 30, atk: 80, def: 90, spatk: 55, spdef: 45, spd: 55 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Battle Armor', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '140.png',
		shiny_image_file: '140-shiny.png',
		emoji: '<:140:1417089792973344799>',
		shiny_emoji: '',
		evolution: [{ to: 'Kabutops', conditions: [{ type: 'level_up', value: 40 }] }]
	},
	{
		dex_id: 141,
		name: 'Kabutops',
		description: 'Its sleek shape is perfect for swimming. It slashes prey with its scythes and drains the body fluids.',
		type: ['Rock', 'Water'],
		tier: 'Epic',
		appearance: { height: 1.3, weight: 40.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 115, def: 105, spatk: 65, spdef: 70, spd: 80 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Battle Armor', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '141.png',
		shiny_image_file: '141-shiny.png',
		emoji: '<:141:1417089824040554516>',
		shiny_emoji: ''
	},
	{
		dex_id: 142,
		name: 'Aerodactyl',
		description: 'A Cokemon that roamed the skies in the dinosaur age. Its teeth are like saw blades.',
		type: ['Rock', 'Flying'],
		tier: 'Epic',
		appearance: { height: 1.8, weight: 59.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 105, def: 65, spatk: 60, spdef: 75, spd: 130 },
		available_abilities: [
			{ name: 'Rock Head', is_hidden: false },
			{ name: 'Pressure', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '142.png',
		shiny_image_file: '142-shiny.png',
		emoji: '<:142:1417089831212679300>',
		shiny_emoji: ''
	},
	{
		dex_id: 143,
		name: 'Snorlax',
		description: 'It is not satisfied unless it eats over 880 pounds of food every day. When it is done eating, it goes promptly to sleep.',
		type: ['Normal'],
		tier: 'Epic',
		appearance: { height: 2.1, weight: 460.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 160, atk: 110, def: 65, spatk: 65, spdef: 110, spd: 30 },
		available_abilities: [
			{ name: 'Immunity', is_hidden: false },
			{ name: 'Thick Fat', is_hidden: false },
			{ name: 'Gluttony', is_hidden: true }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '143.png',
		shiny_image_file: '143-shiny.png',
		emoji: '<:143:1417089839232319539>',
		shiny_emoji: ''
	},
	{
		dex_id: 144,
		name: 'Articuno',
		description: 'A legendary bird Cokemon that is said to appear to doomed people who are lost in icy mountains.',
		type: ['Ice', 'Flying'],
		tier: 'Legendary',
		appearance: { height: 1.7, weight: 55.4 },
		available_genders: ['Genderless'],
		base_stats: { hp: 90, atk: 85, def: 100, spatk: 95, spdef: 125, spd: 85 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false },
			{ name: 'Snow Cloak', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '144.png',
		shiny_image_file: '144-shiny.png',
		emoji: '<:144:1417089846475882526>',
		shiny_emoji: ''
	},
	{
		dex_id: 145,
		name: 'Zapdos',
		description: 'A legendary Cokemon that is said to live in thunderclouds. It freely controls lightning bolts.',
		type: ['Electric', 'Flying'],
		tier: 'Legendary',
		appearance: { height: 1.6, weight: 52.6 },
		available_genders: ['Genderless'],
		base_stats: { hp: 90, atk: 90, def: 85, spatk: 125, spdef: 90, spd: 100 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false },
			{ name: 'Static', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '145.png',
		shiny_image_file: '145-shiny.png',
		emoji: '<:145:1417089855216812032>',
		shiny_emoji: ''
	},
	{
		dex_id: 146,
		name: 'Moltres',
		description: 'One of the legendary bird Cokemon. It is said that its appearance indicates the coming of spring.',
		type: ['Fire', 'Flying'],
		tier: 'Legendary',
		appearance: { height: 2.0, weight: 60.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 90, atk: 100, def: 90, spatk: 125, spdef: 85, spd: 90 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false },
			{ name: 'Flame Body', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '146.png',
		shiny_image_file: '146-shiny.png',
		emoji: '<:146:1417089865861824605>',
		shiny_emoji: ''
	},
	{
		dex_id: 147,
		name: 'Dratini',
		description: 'It is called the “Mirage Cokemon” because so few have seen it. Its shed skin has been found.',
		type: ['Dragon'],
		tier: 'Rare',
		appearance: { height: 1.8, weight: 3.3 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 41, atk: 64, def: 45, spatk: 50, spdef: 50, spd: 50 },
		available_abilities: [
			{ name: 'Shed Skin', is_hidden: false },
			{ name: 'Marvel Scale', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '147.png',
		shiny_image_file: '147-shiny.png',
		emoji: '<:147:1417089876171686010>',
		shiny_emoji: '',
		evolution: [{ to: 'Dragonair', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 148,
		name: 'Dragonair',
		description: 'A mystical Cokemon that exudes a gentle aura. It is said to have the ability to change the weather.',
		type: ['Dragon'],
		tier: 'Epic',
		appearance: { height: 4.0, weight: 16.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 61, atk: 84, def: 65, spatk: 70, spdef: 70, spd: 70 },
		available_abilities: [
			{ name: 'Shed Skin', is_hidden: false },
			{ name: 'Marvel Scale', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '148.png',
		shiny_image_file: '148-shiny.png',
		emoji: '<:148:1417089884593848350>',
		shiny_emoji: '',
		evolution: [{ to: 'Dragonite', conditions: [{ type: 'level_up', value: 55 }] }]
	},
	{
		dex_id: 149,
		name: 'Dragonite',
		description: 'An extremely rarely seen marine Cokemon. Its intelligence is said to match that of humans.',
		type: ['Dragon', 'Flying'],
		tier: 'Ancient',
		appearance: { height: 2.2, weight: 210.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 91, atk: 134, def: 95, spatk: 100, spdef: 100, spd: 80 },
		available_abilities: [
			{ name: 'Inner Focus', is_hidden: false }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '149.png',
		shiny_image_file: '149-shiny.png',
		emoji: '<:149:1417089894060134506>',
		shiny_emoji: ''
	},
	{
		dex_id: 150,
		name: 'Mewtwo',
		description: 'It was created by a scientist after years of horrific gene splicing and DNA engineering experiments.',
		type: ['Psychic'],
		tier: 'Legendary',
		appearance: { height: 2.0, weight: 122.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 106, atk: 110, def: 90, spatk: 154, spdef: 90, spd: 130 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '150.png',
		shiny_image_file: '150-shiny.png',
		emoji: '<:150:1417089903929589811>',
		shiny_emoji: ''
	},
	{
		dex_id: 151,
		name: 'Mew',
		description: 'So rare that it is still said to be a mirage by many experts. Only a few people have seen it worldwide.',
		type: ['Psychic'],
		tier: 'Mythical',
		appearance: { height: 0.4, weight: 4.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 100, atk: 100, def: 100, spatk: 100, spdef: 100, spd: 100 },
		available_abilities: [
			{ name: 'Synchronize', is_hidden: false }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '151.png',
		shiny_image_file: '151-shiny.png',
		emoji: '<:151:1417089916881469461>',
		shiny_emoji: ''
	},
	{
		dex_id: 152,
		name: 'Chikorita',
		description: 'A sweet aroma gently wafts from the leaf on its head. It is docile and loves to soak up the sun\'s rays.',
		type: ['Grass'],
		tier: 'Common',
		appearance: { height: 0.9, weight: 6.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 49, def: 65, spatk: 49, spdef: 65, spd: 45 },
		available_abilities: [
			{ name: 'Overgrow', is_hidden: false },
			{ name: 'Leaf Guard', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '152.png',
		shiny_image_file: '152-shiny.png',
		emoji: '<:152:1417691819453448332>',
		shiny_emoji: '',
		evolution: [{ to: 'Bayleef', conditions: [{ type: 'level_up', value: 16 }] }]
	},
	{
		dex_id: 153,
		name: 'Bayleef',
		description: 'The buds that ring its neck give off a spicy aroma that perks people up.',
		type: ['Grass'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 15.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 62, def: 80, spatk: 63, spdef: 80, spd: 60 },
		available_abilities: [
			{ name: 'Overgrow', is_hidden: false },
			{ name: 'Leaf Guard', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '153.png',
		shiny_image_file: '153-shiny.png',
		emoji: '<:153:1417691942904659979>',
		shiny_emoji: '',
		evolution: [{ to: 'Meganium', conditions: [{ type: 'level_up', value: 32 }] }]
	},
	{
		dex_id: 154,
		name: 'Meganium',
		description: 'The aroma that gives off from its petals contains a substance that calms aggressive feelings.',
		type: ['Grass'],
		tier: 'Epic',
		appearance: { height: 1.8, weight: 100.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 82, def: 100, spatk: 83, spdef: 100, spd: 80 },
		available_abilities: [
			{ name: 'Overgrow', is_hidden: false },
			{ name: 'Leaf Guard', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '154.png',
		shiny_image_file: '154-shiny.png',
		emoji: '<:154:1417692197368889485>',
		shiny_emoji: ''
	},
	{
		dex_id: 155,
		name: 'Cyndaquil',
		description: 'It is timid and always curls itself up in a ball. If attacked, it flares up its back for protection.',
		type: ['Fire'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 7.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 39, atk: 52, def: 43, spatk: 60, spdef: 50, spd: 65 },
		available_abilities: [
			{ name: 'Blaze', is_hidden: false },
			{ name: 'Flash Fire', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '155.png',
		shiny_image_file: '155-shiny.png',
		emoji: '<:155:1417692230701027358>',
		shiny_emoji: '',
		evolution: [{ to: 'Quilava', conditions: [{ type: 'level_up', value: 14 }] }]
	},
	{
		dex_id: 156,
		name: 'Quilava',
		description: 'It intimidates foes with the heat of its flames. The fire burns more strongly when it readies for battle.',
		type: ['Fire'],
		tier: 'Rare',
		appearance: { height: 0.9, weight: 19.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 58, atk: 64, def: 58, spatk: 80, spdef: 65, spd: 80 },
		available_abilities: [
			{ name: 'Blaze', is_hidden: false },
			{ name: 'Flash Fire', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '156.png',
		shiny_image_file: '156-shiny.png',
		emoji: '<:156:1417692264112721950>',
		shiny_emoji: '',
		evolution: [{ to: 'Typhlosion', conditions: [{ type: 'level_up', value: 36 }] }]
	},
	{
		dex_id: 157,
		name: 'Typhlosion',
		description: 'It has a secret, devastating move. It rubs its blazing fur together to cause huge explosions.',
		type: ['Fire'],
		tier: 'Epic',
		appearance: { height: 1.7, weight: 79.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 78, atk: 84, def: 78, spatk: 109, spdef: 85, spd: 100 },
		available_abilities: [
			{ name: 'Blaze', is_hidden: false },
			{ name: 'Flash Fire', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '157.png',
		shiny_image_file: '157-shiny.png',
		emoji: '<:157:1417694463299420293>',
		shiny_emoji: ''
	},
	{
		dex_id: 158,
		name: 'Totodile',
		description: 'Its well-developed jaws are powerful and capable of crushing anything. Even its Trainer must be careful.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 9.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 65, def: 64, spatk: 44, spdef: 48, spd: 43 },
		available_abilities: [
			{ name: 'Torrent', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '158.png',
		shiny_image_file: '158-shiny.png',
		emoji: '<:158:1417699812895096862>',
		shiny_emoji: '',
		evolution: [{ to: 'Croconaw', conditions: [{ type: 'level_up', value: 18 }] }]
	},
	{
		dex_id: 159,
		name: 'Croconaw',
		description: 'Once its jaws clamp down on its foe, it will absolutely not let go until the foe is torn up.',
		type: ['Water'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 25.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 80, def: 80, spatk: 59, spdef: 63, spd: 58 },
		available_abilities: [
			{ name: 'Torrent', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '159.png',
		shiny_image_file: '159-shiny.png',
		emoji: '<:159:1417699860324548628>',
		shiny_emoji: '',
		evolution: [{ to: 'Feraligatr', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 160,
		name: 'Feraligatr',
		description: 'When it bites with its powerful, well-developed jaws, it shakes its head and savagely tears its victim up.',
		type: ['Water'],
		tier: 'Epic',
		appearance: { height: 2.3, weight: 88.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 85, atk: 105, def: 100, spatk: 79, spdef: 83, spd: 78 },
		available_abilities: [
			{ name: 'Torrent', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '160.png',
		shiny_image_file: '160-shiny.png',
		emoji: '<:160:1417700310930952314>',
		shiny_emoji: ''
	},
	{
		dex_id: 161,
		name: 'Sentret',
		description: 'It stands on its tail for a better view of its surroundings. If it spots an enemy, it cries out to warn its kind.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 0.8, weight: 6.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 35, atk: 46, def: 34, spatk: 35, spdef: 45, spd: 20 },
		available_abilities: [
			{ name: 'Run Away', is_hidden: false },
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Frisk', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '161.png',
		shiny_image_file: '161-shiny.png',
		emoji: '<:161:1417699978339418233>',
		shiny_emoji: '',
		evolution: [{ to: 'Furret', conditions: [{ type: 'level_up', value: 15 }] }]
	},
	{
		dex_id: 162,
		name: 'Furret',
		description: 'The mother puts its offspring to sleep by curling up around them. It corners foes with its speed.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 1.8, weight: 32.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 85, atk: 76, def: 64, spatk: 45, spdef: 55, spd: 90 },
		available_abilities: [
			{ name: 'Run Away', is_hidden: false },
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Frisk', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '162.png',
		shiny_image_file: '162-shiny.png',
		emoji: '<:162:1417700025559027775>',
		shiny_emoji: ''
	},
	{
		dex_id: 163,
		name: 'Hoothoot',
		description: 'It has a perfect sense of time. Whatever happens, it keeps rhythm by precisely tilting its head in time.',
		type: ['Normal', 'Flying'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 21.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 30, def: 30, spatk: 36, spdef: 56, spd: 50 },
		available_abilities: [
			{ name: 'Insomnia', is_hidden: false },
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Tinted Lens', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '163.png',
		shiny_image_file: '163-shiny.png',
		emoji: '<:163:1417700078218379314>',
		shiny_emoji: '',
		evolution: [{ to: 'Noctowl', conditions: [{ type: 'level_up', value: 20 }] }]
	},
	{
		dex_id: 164,
		name: 'Noctowl',
		description: 'Its eyes are specially developed to enable it to see clearly even in murky darkness.',
		type: ['Normal', 'Flying'],
		tier: 'Rare',
		appearance: { height: 1.6, weight: 40.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 100, atk: 50, def: 50, spatk: 86, spdef: 96, spd: 70 },
		available_abilities: [
			{ name: 'Insomnia', is_hidden: false },
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Tinted Lens', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '164.png',
		shiny_image_file: '164-shiny.png',
		emoji: '<:164:1417700434549932165>',
		shiny_emoji: ''
	},
	{
		dex_id: 165,
		name: 'Ledyba',
		description: 'It is very timid. It will be afraid to move if it is alone. It clusters with others of its kind in the shade of trees.',
		type: ['Bug', 'Flying'],
		tier: 'Common',
		appearance: { height: 1.0, weight: 10.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 20, def: 30, spatk: 40, spdef: 80, spd: 55 },
		available_abilities: [
			{ name: 'Swarm', is_hidden: false },
			{ name: 'Early Bird', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '165.png',
		shiny_image_file: '165-shiny.png',
		emoji: '<:165:1417700467466702899>',
		shiny_emoji: '',
		evolution: [{ to: 'Ledian', conditions: [{ type: 'level_up', value: 18 }] }]
	},
	{
		dex_id: 166,
		name: 'Ledian',
		description: 'It uses starlight as energy. When more stars are visible, the patterns on its back grow larger.',
		type: ['Bug', 'Flying'],
		tier: 'Rare',
		appearance: { height: 1.4, weight: 35.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 35, def: 50, spatk: 55, spdef: 110, spd: 85 },
		available_abilities: [
			{ name: 'Swarm', is_hidden: false },
			{ name: 'Early Bird', is_hidden: false },
			{ name: 'Iron Fist', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '166.png',
		shiny_image_file: '166-shiny.png',
		emoji: '<:166:1417700497112174706>',
		shiny_emoji: ''
	},
	{
		dex_id: 167,
		name: 'Spinarak',
		description: 'It spins a web using fine--but durable--silk. It can distinguish its prey by the slight vibrations of the web.',
		type: ['Bug', 'Poison'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 8.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 60, def: 40, spatk: 40, spdef: 40, spd: 30 },
		available_abilities: [
			{ name: 'Swarm', is_hidden: false },
			{ name: 'Insomnia', is_hidden: false },
			{ name: 'Sniper', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '167.png',
		shiny_image_file: '167-shiny.png',
		emoji: '<:167:1417700525495029860>',
		shiny_emoji: '',
		evolution: [{ to: 'Ariados', conditions: [{ type: 'level_up', value: 22 }] }]
	},
	{
		dex_id: 168,
		name: 'Ariados',
		description: 'It attaches silk to its prey and sets it free. Later, it tracks the silk to the prey and its friends.',
		type: ['Bug', 'Poison'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 33.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 90, def: 70, spatk: 60, spdef: 70, spd: 40 },
		available_abilities: [
			{ name: 'Swarm', is_hidden: false },
			{ name: 'Insomnia', is_hidden: false },
			{ name: 'Sniper', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '168.png',
		shiny_image_file: '168-shiny.png',
		emoji: '<:168:1417700561813508177>',
		shiny_emoji: ''
	},
	{
		dex_id: 169,
		name: 'Crobat',
		description: 'The transformation of its feet into wings made it better at flying, but more clumsy at walking.',
		type: ['Poison', 'Flying'],
		tier: 'Epic',
		appearance: { height: 1.8, weight: 75.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 85, atk: 90, def: 80, spatk: 70, spdef: 80, spd: 130 },
		available_abilities: [
			{ name: 'Inner Focus', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '169.png',
		shiny_image_file: '169-shiny.png',
		emoji: '<:169:1417700591320305674>',
		shiny_emoji: ''
	},
	{
		dex_id: 170,
		name: 'Chinchou',
		description: 'It shoots positive and negative electricity from its two antennae. It flashes its lights to communicate with others.',
		type: ['Water', 'Electric'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 12.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 38, def: 38, spatk: 56, spdef: 56, spd: 67 },
		available_abilities: [
			{ name: 'Volt Absorb', is_hidden: false },
			{ name: 'Illuminate', is_hidden: false },
			{ name: 'Water Absorb', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '170.png',
		shiny_image_file: '170-shiny.png',
		emoji: '<:170:1417700619011100804>',
		shiny_emoji: '',
		evolution: [{ to: 'Lanturn', conditions: [{ type: 'level_up', value: 27 }] }]
	},
	{
		dex_id: 171,
		name: 'Lanturn',
		description: 'The light it emits is so bright that it can illuminate the sea’s surface from a depth of over three miles.',
		type: ['Water', 'Electric'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 22.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 125, atk: 58, def: 58, spatk: 76, spdef: 76, spd: 67 },
		available_abilities: [
			{ name: 'Volt Absorb', is_hidden: false },
			{ name: 'Illuminate', is_hidden: false },
			{ name: 'Water Absorb', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '171.png',
		shiny_image_file: '171-shiny.png',
		emoji: '<:171:1417700660257755267>',
		shiny_emoji: ''
	},
	{
		dex_id: 172,
		name: 'Pichu',
		description: 'It is not yet skilled at storing electricity. It may send out a jolt if amused or startled.',
		type: ['Electric'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 2.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 20, atk: 40, def: 15, spatk: 35, spdef: 35, spd: 60 },
		available_abilities: [
			{ name: 'Static', is_hidden: false },
			{ name: 'Lightning Rod', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '172.png',
		shiny_image_file: '172-shiny.png',
		emoji: '<:172:1417700690121330748>',
		shiny_emoji: '',
		evolution: [{ to: 'Pikachu', conditions: [{ type: 'friendship', value: 220 }] }]
	},
	{
		dex_id: 173,
		name: 'Cleffa',
		description: 'Because of its unusual, star-like silhouette, people believe that it came here on a meteor.',
		type: ['Fairy'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 3.0 },
		available_genders: ['Female'],
		base_stats: { hp: 50, atk: 25, def: 28, spatk: 45, spdef: 55, spd: 15 },
		available_abilities: [
			{ name: 'Cute Charm', is_hidden: false },
			{ name: 'Magic Guard', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '173.png',
		shiny_image_file: '173-shiny.png',
		emoji: '<:173:1417700717489160307>',
		shiny_emoji: '',
		evolution: [{ to: 'Clefairy', conditions: [{ type: 'friendship', value: 220 }] }]
	},
	{
		dex_id: 174,
		name: 'Igglybuff',
		description: 'It has a very soft and bouncy body. If it starts to roll, it will bounce all over and be impossible to stop.',
		type: ['Normal', 'Fairy'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 1.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 30, def: 15, spatk: 40, spdef: 20, spd: 15 },
		available_abilities: [
			{ name: 'Cute Charm', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '174.png',
		shiny_image_file: '174-shiny.png',
		emoji: '<:174:1417700744034910238>',
		shiny_emoji: '',
		evolution: [{ to: 'Jigglypuff', conditions: [{ type: 'friendship', value: 220 }] }]
	},
	{
		dex_id: 175,
		name: 'Togepi',
		description: 'A proverb claims that happiness will come to anyone who can make a sleeping Togepi stand up.',
		type: ['Fairy'],
		tier: 'Rare',
		appearance: { height: 0.3, weight: 1.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 35, atk: 20, def: 65, spatk: 40, spdef: 65, spd: 20 },
		available_abilities: [
			{ name: 'Hustle', is_hidden: false },
			{ name: 'Serene Grace', is_hidden: false },
			{ name: 'Super Luck', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '175.png',
		shiny_image_file: '175-shiny.png',
		emoji: '<:175:1417700768286507160>',
		shiny_emoji: '',
		evolution: [{ to: 'Togetic', conditions: [{ type: 'friendship', value: 220 }] }]
	},
	{
		dex_id: 176,
		name: 'Togetic',
		description: 'It is said to be a Cokemon that brings good fortune. When it spots someone who is pure of heart, it appears and shares its happiness.',
		type: ['Fairy', 'Flying'],
		tier: 'Epic',
		appearance: { height: 0.6, weight: 3.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 40, def: 85, spatk: 80, spdef: 105, spd: 40 },
		available_abilities: [
			{ name: 'Hustle', is_hidden: false },
			{ name: 'Serene Grace', is_hidden: false },
			{ name: 'Super Luck', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '176.png',
		shiny_image_file: '176-shiny.png',
		emoji: '<:176:1417700793079042208>',
		shiny_emoji: '',
		evolution: [{ to: 'Togekiss', conditions: [{ type: 'item', value: 'shiny-stone' }] }]
	},
	{
		dex_id: 177,
		name: 'Natu',
		description: 'It has a highly developed psychic ability. It can see into the future, but only the future of its own past.',
		type: ['Psychic', 'Flying'],
		tier: 'Common',
		appearance: { height: 0.2, weight: 2.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 50, def: 45, spatk: 70, spdef: 45, spd: 70 },
		available_abilities: [
			{ name: 'Synchronize', is_hidden: false },
			{ name: 'Early Bird', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '177.png',
		shiny_image_file: '177-shiny.png',
		emoji: '<:177:1417700875891376179>',
		shiny_emoji: '',
		evolution: [{ to: 'Xatu', conditions: [{ type: 'level_up', value: 25 }] }]
	},
	{
		dex_id: 178,
		name: 'Xatu',
		description: 'This mysterious Cokemon can see the past and the future. It eyes the sun’s movement all day.',
		type: ['Psychic', 'Flying'],
		tier: 'Rare',
		appearance: { height: 1.5, weight: 15.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 75, def: 70, spatk: 95, spdef: 70, spd: 95 },
		available_abilities: [
			{ name: 'Synchronize', is_hidden: false },
			{ name: 'Early Bird', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '178.png',
		shiny_image_file: '178-shiny.png',
		emoji: '<:178:1417700909084967012>',
		shiny_emoji: ''
	},
	{
		dex_id: 179,
		name: 'Mareep',
		description: 'Its fluffy coat of wool rubs together and builds a static charge. The more static it builds, the brighter the light on its tail glows.',
		type: ['Electric'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 7.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 40, def: 40, spatk: 65, spdef: 45, spd: 35 },
		available_abilities: [
			{ name: 'Static', is_hidden: false },
			{ name: 'Plus', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '179.png',
		shiny_image_file: '179-shiny.png',
		emoji: '<:179:1417700939703390289>',
		shiny_emoji: '',
		evolution: [{ to: 'Flaaffy', conditions: [{ type: 'level_up', value: 15 }] }]
	},
	{
		dex_id: 180,
		name: 'Flaaffy',
		description: 'Its fluffy fleece easily stores electricity. Its rubbery hide keeps it from being electrocuted.',
		type: ['Electric'],
		tier: 'Rare',
		appearance: { height: 0.8, weight: 13.3 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 55, def: 55, spatk: 80, spdef: 60, spd: 45 },
		available_abilities: [
			{ name: 'Static', is_hidden: false },
			{ name: 'Plus', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '180.png',
		shiny_image_file: '180-shiny.png',
		emoji: '<:180:1417700971630301294>',
		shiny_emoji: '',
		evolution: [{ to: 'Ampharos', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 181,
		name: 'Ampharos',
		description: 'The tip of its tail shines brightly. In the olden days, people sent signals using the light from this Cokemon’s tail.',
		type: ['Electric'],
		tier: 'Epic',
		appearance: { height: 1.4, weight: 61.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 75, def: 85, spatk: 115, spdef: 90, spd: 55 },
		available_abilities: [
			{ name: 'Static', is_hidden: false },
			{ name: 'Plus', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '181.png',
		shiny_image_file: '181-shiny.png',
		emoji: '<:181:1417701013648838656>',
		shiny_emoji: ''
	},
	{
		dex_id: 182,
		name: 'Bellossom',
		description: 'When the heavy rainfall season ends, it is drawn out by warm sunlight to dance in the open.',
		type: ['Grass'],
		tier: 'Epic',
		appearance: { height: 0.4, weight: 5.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 80, def: 95, spatk: 90, spdef: 100, spd: 50 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '182.png',
		shiny_image_file: '182-shiny.png',
		emoji: '<:182:1417701047442604094>',
		shiny_emoji: ''
	},
	{
		dex_id: 183,
		name: 'Marill',
		description: 'The tip of its tail is filled with oil that is lighter than water, so it acts as a float.',
		type: ['Water', 'Fairy'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 8.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 20, def: 50, spatk: 20, spdef: 50, spd: 40 },
		available_abilities: [
			{ name: 'Thick Fat', is_hidden: false },
			{ name: 'Huge Power', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '183.png',
		shiny_image_file: '183-shiny.png',
		emoji: '<:183:1417701075607097527>',
		shiny_emoji: '',
		evolution: [{ to: 'Azumarill', conditions: [{ type: 'level_up', value: 18 }] }]
	},
	{
		dex_id: 184,
		name: 'Azumarill',
		description: 'It can make balloons out of air. It makes these air balloons if it spots a drowning Cokemon.',
		type: ['Water', 'Fairy'],
		tier: 'Rare',
		appearance: { height: 0.8, weight: 28.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 100, atk: 50, def: 80, spatk: 60, spdef: 80, spd: 50 },
		available_abilities: [
			{ name: 'Thick Fat', is_hidden: false },
			{ name: 'Huge Power', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '184.png',
		shiny_image_file: '184-shiny.png',
		emoji: '<:184:1417701113708417124>',
		shiny_emoji: ''
	},
	{
		dex_id: 185,
		name: 'Sudowoodo',
		description: 'It mimics a tree to avoid being attacked by enemies. But since its forelegs stay green throughout the year, it is easily identified as a fake in the winter.',
		type: ['Rock'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 38.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 100, def: 115, spatk: 30, spdef: 65, spd: 30 },
		available_abilities: [
			{ name: 'Sturdy', is_hidden: false },
			{ name: 'Rock Head', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '185.png',
		shiny_image_file: '185-shiny.png',
		emoji: '<:185:1417701152832884776>',
		shiny_emoji: ''
	},
	{
		dex_id: 186,
		name: 'Politoed',
		description: 'Whenever three or more of these get together, they sing in a loud voice that sounds like bellowing.',
		type: ['Water'],
		tier: 'Epic',
		appearance: { height: 1.1, weight: 33.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 75, def: 75, spatk: 90, spdef: 100, spd: 70 },
		available_abilities: [
			{ name: 'Water Absorb', is_hidden: false },
			{ name: 'Damp', is_hidden: false },
			{ name: 'Drizzle', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '186.png',
		shiny_image_file: '186-shiny.png',
		emoji: '<:186:1417701182033367211>',
		shiny_emoji: ''
	},
	{
		dex_id: 187,
		name: 'Hoppip',
		description: 'Its body is so light, it must grip the ground firmly with its feet to keep from being blown away.',
		type: ['Grass', 'Flying'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 0.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 35, atk: 35, def: 40, spatk: 35, spdef: 55, spd: 50 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Leaf Guard', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '187.png',
		shiny_image_file: '187-shiny.png',
		emoji: '<:187:1417701216552615946>',
		shiny_emoji: '',
		evolution: [{ to: 'Skiploom', conditions: [{ type: 'level_up', value: 18 }] }]
	},
	{
		dex_id: 188,
		name: 'Skiploom',
		description: 'The bloom on its head opens and closes as the temperature fluctuates up and down.',
		type: ['Grass', 'Flying'],
		tier: 'Rare',
		appearance: { height: 0.6, weight: 1.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 45, def: 50, spatk: 45, spdef: 65, spd: 80 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Leaf Guard', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '188.png',
		shiny_image_file: '188-shiny.png',
		emoji: '<:188:1417701244348403732>',
		shiny_emoji: '',
		evolution: [{ to: 'Jumpluff', conditions: [{ type: 'level_up', value: 27 }] }]
	},
	{
		dex_id: 189,
		name: 'Jumpluff',
		description: 'Drifts on seasonal winds and spreads its cotton-like spores all over the world to make more of its kind.',
		type: ['Grass', 'Flying'],
		tier: 'Epic',
		appearance: { height: 0.8, weight: 3.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 55, def: 70, spatk: 55, spdef: 95, spd: 110 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Leaf Guard', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '189.png',
		shiny_image_file: '189-shiny.png',
		emoji: '<:189:1417701273930698892>',
		shiny_emoji: ''
	},
	{
		dex_id: 190,
		name: 'Aipom',
		description: 'Its tail is so powerful that it can use it to grab a tree branch and hold itself up in the air.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 0.8, weight: 11.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 70, def: 55, spatk: 40, spdef: 55, spd: 85 },
		available_abilities: [
			{ name: 'Run Away', is_hidden: false },
			{ name: 'Pickup', is_hidden: false },
			{ name: 'Skill Link', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '190.png',
		shiny_image_file: '190-shiny.png',
		emoji: '<:190:1417701304633000087>',
		shiny_emoji: '',
		evolution: [{ to: 'Ambipom', conditions: [{ type: 'move_known', value: 'Double Hit' }] }]
	},
	{
		dex_id: 191,
		name: 'Sunkern',
		description: 'It may drop out of the sky unexpectedly. If attacked by a Spearow, it will violently shake its leaves.',
		type: ['Grass'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 1.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 30, atk: 30, def: 30, spatk: 30, spdef: 30, spd: 30 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Solar Power', is_hidden: false },
			{ name: 'Early Bird', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '191.png',
		shiny_image_file: '191-shiny.png',
		emoji: '<:191:1417701342595780608>',
		shiny_emoji: '',
		evolution: [{ to: 'Sunflora', conditions: [{ type: 'item', value: 'sun-stone' }] }]
	},
	{
		dex_id: 192,
		name: 'Sunflora',
		description: 'It converts solar energy into nutrition. It moves around actively in the daytime when it is warm.',
		type: ['Grass'],
		tier: 'Rare',
		appearance: { height: 0.8, weight: 8.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 75, def: 55, spatk: 105, spdef: 85, spd: 30 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Solar Power', is_hidden: false },
			{ name: 'Early Bird', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '192.png',
		shiny_image_file: '192-shiny.png',
		emoji: '<:192:1417701367891492945>',
		shiny_emoji: ''
	},
	{
		dex_id: 193,
		name: 'Yanma',
		description: 'Its eyes can see 360 degrees without moving its head. It won’t miss prey--even those behind it.',
		type: ['Bug', 'Flying'],
		tier: 'Common',
		appearance: { height: 1.2, weight: 38.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 65, def: 45, spatk: 75, spdef: 45, spd: 95 },
		available_abilities: [
			{ name: 'Speed Boost', is_hidden: false },
			{ name: 'Compound Eyes', is_hidden: false },
			{ name: 'Frisk', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '193.png',
		shiny_image_file: '193-shiny.png',
		emoji: '<:193:1417701399252435095>',
		shiny_emoji: '',
		evolution: [{ to: 'Yanmega', conditions: [{ type: 'move_known', value: 'Ancient Power' }] }]
	},
	{
		dex_id: 194,
		name: 'Wooper',
		description: 'This Cokemon lives in cold water. It will leave the water to search for food when it gets cold outside.',
		type: ['Water', 'Ground'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 8.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 45, def: 45, spatk: 25, spdef: 25, spd: 15 },
		available_abilities: [
			{ name: 'Damp', is_hidden: false },
			{ name: 'Water Absorb', is_hidden: false },
			{ name: 'Unaware', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '194.png',
		shiny_image_file: '194-shiny.png',
		emoji: '<:194:1417701426293112912>',
		shiny_emoji: '',
		evolution: [{ to: 'Quagsire', conditions: [{ type: 'level_up', value: 20 }] }]
	},
	{
		dex_id: 195,
		name: 'Quagsire',
		description: 'A dim-witted Cokemon. It doesn’t care if it bumps its head into boats or rocks while swimming.',
		type: ['Water', 'Ground'],
		tier: 'Rare',
		appearance: { height: 1.4, weight: 75.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 95, atk: 85, def: 85, spatk: 65, spdef: 65, spd: 35 },
		available_abilities: [
			{ name: 'Damp', is_hidden: false },
			{ name: 'Water Absorb', is_hidden: false },
			{ name: 'Unaware', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '195.png',
		shiny_image_file: '195-shiny.png',
		emoji: '<:195:1417701455577743562>',
		shiny_emoji: ''
	},
	{
		dex_id: 196,
		name: 'Espeon',
		description: 'It uses the fine hair that covers its body to sense air currents and predict its foe’s actions.',
		type: ['Psychic'],
		tier: 'Epic',
		appearance: { height: 0.9, weight: 26.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 65, def: 60, spatk: 130, spdef: 95, spd: 110 },
		available_abilities: [
			{ name: 'Synchronize', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '196.png',
		shiny_image_file: '196-shiny.png',
		emoji: '<:196:1417701510695096623>',
		shiny_emoji: ''
	},
	{
		dex_id: 197,
		name: 'Umbreon',
		description: 'When agitated, this Cokemon protects itself by spraying poisonous sweat from its pores.',
		type: ['Dark'],
		tier: 'Epic',
		appearance: { height: 1.0, weight: 27.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 95, atk: 65, def: 110, spatk: 60, spdef: 130, spd: 65 },
		available_abilities: [
			{ name: 'Synchronize', is_hidden: false },
			{ name: 'Inner Focus', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '197.png',
		shiny_image_file: '197-shiny.png',
		emoji: '<:197:1417701534845767730>',
		shiny_emoji: ''
	},
	{
		dex_id: 198,
		name: 'Murkrow',
		description: 'Feared and loathed by many, it is believed to bring misfortune to all those who see it at night.',
		type: ['Dark', 'Flying'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 2.1 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 85, def: 42, spatk: 85, spdef: 42, spd: 91 },
		available_abilities: [
			{ name: 'Insomnia', is_hidden: false },
			{ name: 'Super Luck', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '198.png',
		shiny_image_file: '198-shiny.png',
		emoji: '<:198:1417701566974005331>',
		shiny_emoji: '',
		evolution: [{ to: 'Honchkrow', conditions: [{ type: 'item', value: 'dusk-stone' }] }]
	},
	{
		dex_id: 199,
		name: 'Slowking',
		description: 'It has incredible intellect and intuition. Whatever the situation, it remains calm and collected.',
		type: ['Water', 'Psychic'],
		tier: 'Epic',
		appearance: { height: 2.0, weight: 79.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 95, atk: 75, def: 80, spatk: 100, spdef: 110, spd: 30 },
		available_abilities: [
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Own Tempo', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '199.png',
		shiny_image_file: '199-shiny.png',
		emoji: '<:199:1417701601606500372>',
		shiny_emoji: ''
	},
	{
		dex_id: 200,
		name: 'Misdreavus',
		description: 'It loves to bite and yank people’s hair from behind without warning, just to see their shocked reactions.',
		type: ['Ghost'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 1.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 60, def: 60, spatk: 85, spdef: 85, spd: 85 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '200.png',
		shiny_image_file: '200-shiny.png',
		emoji: '<:200:1417701625635799182>',
		shiny_emoji: '',
		evolution: [{ to: 'Mismagius', conditions: [{ type: 'item', value: 'dusk-stone' }] }]
	},
	{
		dex_id: 201,
		name: 'Unown',
		description: 'Their shapes look like hieroglyphs on ancient tablets. It is said that the two are somehow related.',
		type: ['Psychic'],
		tier: 'Rare',
		appearance: { height: 0.5, weight: 5.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 48, atk: 72, def: 48, spatk: 72, spdef: 48, spd: 48 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '201.png',
		shiny_image_file: '201-shiny.png',
		emoji: '<:201:1417701653448232980>',
		shiny_emoji: ''
	},
	{
		dex_id: 202,
		name: 'Wobbuffet',
		description: 'To keep its pitch-black tail hidden, it lives quietly in the dark. It is never first to attack.',
		type: ['Psychic'],
		tier: 'Rare',
		appearance: { height: 1.3, weight: 28.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 190, atk: 33, def: 58, spatk: 33, spdef: 58, spd: 33 },
		available_abilities: [
			{ name: 'Shadow Tag', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '202.png',
		shiny_image_file: '202-shiny.png',
		emoji: '<:202:1417701683437371402>',
		shiny_emoji: ''
	},
	{
		dex_id: 203,
		name: 'Girafarig',
		description: 'Its tail has a small brain of its own. If you get too close, it may react to your scent and bite.',
		type: ['Normal', 'Psychic'],
		tier: 'Rare',
		appearance: { height: 1.5, weight: 41.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 80, def: 65, spatk: 90, spdef: 65, spd: 85 },
		available_abilities: [
			{ name: 'Inner Focus', is_hidden: false },
			{ name: 'Early Bird', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '203.png',
		shiny_image_file: '203-shiny.png',
		emoji: '<:203:1417701901482459196>',
		shiny_emoji: ''
	},
	{
		dex_id: 204,
		name: 'Pineco',
		description: 'It looks like a pinecone. Its shell protects it from bird Cokemon that peck it by mistake.',
		type: ['Bug'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 7.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 65, def: 90, spatk: 35, spdef: 35, spd: 15 },
		available_abilities: [
			{ name: 'Sturdy', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '204.png',
		shiny_image_file: '204-shiny.png',
		emoji: '<:204:1417701929160802484>',
		shiny_emoji: '',
		evolution: [{ to: 'Forretress', conditions: [{ type: 'level_up', value: 31 }] }]
	},
	{
		dex_id: 205,
		name: 'Forretress',
		description: 'Its entire body is shielded by a steel-hard shell. What lurks inside the shell is a total mystery.',
		type: ['Bug', 'Steel'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 125.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 90, def: 140, spatk: 60, spdef: 60, spd: 40 },
		available_abilities: [
			{ name: 'Sturdy', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '205.png',
		shiny_image_file: '205-shiny.png',
		emoji: '<:205:1417701956322857100>',
		shiny_emoji: ''
	},
	{
		dex_id: 206,
		name: 'Dunsparce',
		description: 'It creates a nest by digging through the soil with its tail. It can float just slightly using its wings.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 1.5, weight: 14.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 100, atk: 70, def: 70, spatk: 65, spdef: 65, spd: 45 },
		available_abilities: [
			{ name: 'Serene Grace', is_hidden: false },
			{ name: 'Run Away', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '206.png',
		shiny_image_file: '206-shiny.png',
		emoji: '<:206:1417701985343377529>',
		shiny_emoji: ''
	},
	{
		dex_id: 207,
		name: 'Gligar',
		description: 'It flies straight at its target’s face, then clamps down on the startled victim to inject poison.',
		type: ['Ground', 'Flying'],
		tier: 'Common',
		appearance: { height: 1.1, weight: 64.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 75, def: 105, spatk: 35, spdef: 65, spd: 85 },
		available_abilities: [
			{ name: 'Hyper Cutter', is_hidden: false },
			{ name: 'Sand Veil', is_hidden: false },
			{ name: 'Immunity', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '207.png',
		shiny_image_file: '207-shiny.png',
		emoji: '<:207:1417702013923360918>',
		shiny_emoji: '',
		evolution: [{ to: 'Gliscor', conditions: [{ type: 'held_item', value: 'razor-fang' }, { type: 'time_of_day', value: 'night' }] }]
	},
	{
		dex_id: 208,
		name: 'Steelix',
		description: 'Its body has been compressed deep under the ground. As a result, it is even harder than a diamond.',
		type: ['Steel', 'Ground'],
		tier: 'Epic',
		appearance: { height: 9.2, weight: 400.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 85, def: 200, spatk: 55, spdef: 65, spd: 30 },
		available_abilities: ['Rock Head', 'Sturdy'],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '208.png',
		shiny_image_file: '208-shiny.png',
		emoji: '<:208:1417702038703312917>',
		shiny_emoji: ''
	},
	{
		dex_id: 209,
		name: 'Snubbull',
		description: 'It has an active, playful nature. It is popular among women because of its cute appearance.',
		type: ['Fairy'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 7.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 80, def: 50, spatk: 40, spdef: 40, spd: 30 },
		available_abilities: [
			{ name: 'Intimidate', is_hidden: false },
			{ name: 'Run Away', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '209.png',
		shiny_image_file: '209-shiny.png',
		emoji: '<:209:1417702068793381005>',
		shiny_emoji: '',
		evolution: [{ to: 'Granbull', conditions: [{ type: 'level_up', value: 23 }] }]
	},
	{
		dex_id: 210,
		name: 'Granbull',
		description: 'It is actually timid and easily spooked. If attacked, it flails about to fend off its attacker.',
		type: ['Fairy'],
		tier: 'Rare',
		appearance: { height: 1.4, weight: 48.7 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 120, def: 75, spatk: 60, spdef: 60, spd: 45 },
		available_abilities: [
			{ name: 'Intimidate', is_hidden: false },
			{ name: 'Quick Feet', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '210.png',
		shiny_image_file: '210-shiny.png',
		emoji: '<:210:1417702095716487219>',
		shiny_emoji: ''
	},
	{
		dex_id: 211,
		name: 'Qwilfish',
		description: 'It shoots the poison spines on its body in all directions. Its round body makes it a poor swimmer.',
		type: ['Water', 'Poison'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 3.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 95, def: 85, spatk: 55, spdef: 55, spd: 85 },
		available_abilities: [
			{ name: 'Poison Point', is_hidden: false },
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Intimidate', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '211.png',
		shiny_image_file: '211-shiny.png',
		emoji: '<:211:1417702208312578130>',
		shiny_emoji: ''
	},
	{
		dex_id: 212,
		name: 'Scizor',
		description: 'It swings its eye-patterned pincers up to scare its foes. This makes it look like it has three heads.',
		type: ['Bug', 'Steel'],
		tier: 'Epic',
		appearance: { height: 1.8, weight: 118.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 130, def: 100, spatk: 55, spdef: 80, spd: 65 },
		available_abilities: [
			{ name: 'Swarm', is_hidden: false },
			{ name: 'Technician', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '212.png',
		shiny_image_file: '212-shiny.png',
		emoji: '<:212:1417702241447575582>',
		shiny_emoji: ''
	},
	{
		dex_id: 213,
		name: 'Shuckle',
		description: 'The berries stored in its vaselike shell decompose and become a gooey liquid.',
		type: ['Bug', 'Rock'],
		tier: 'Rare',
		appearance: { height: 0.6, weight: 20.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 20, atk: 10, def: 230, spatk: 10, spdef: 230, spd: 5 },
		available_abilities: [
			{ name: 'Sturdy', is_hidden: false },
			{ name: 'Gluttony', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '213.png',
		shiny_image_file: '213-shiny.png',
		emoji: '<:213:1417702323815190548>',
		shiny_emoji: ''
	},
	{
		dex_id: 214,
		name: 'Heracross',
		description: 'This powerful Cokemon thrusts its prized horn under its enemies’ bellies and lifts them up and throws them.',
		type: ['Bug', 'Fighting'],
		tier: 'Rare',
		appearance: { height: 1.5, weight: 54.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 125, def: 75, spatk: 40, spdef: 95, spd: 85 },
		available_abilities: [
			{ name: 'Swarm', is_hidden: false },
			{ name: 'Guts', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '214.png',
		shiny_image_file: '214-shiny.png',
		emoji: '<:214:1417702352411951225>',
		shiny_emoji: ''
	},
	{
		dex_id: 215,
		name: 'Sneasel',
		description: 'Its claws are sharp. If it is not satisfied, it will even slash its Trainer.',
		type: ['Dark', 'Ice'],
		tier: 'Common',
		appearance: { height: 0.9, weight: 28.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 95, def: 55, spatk: 35, spdef: 75, spd: 115 },
		available_abilities: [
			{ name: 'Inner Focus', is_hidden: false },
			{ name: 'Keen Eye', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '215.png',
		shiny_image_file: '215-shiny.png',
		emoji: '<:215:1417702376130744361>',
		shiny_emoji: '',
		evolution: [{ to: 'Weavile', conditions: [{ type: 'held_item', value: 'razor-claw' }, { type: 'time_of_day', value: 'night' }] }]
	},
	{
		dex_id: 216,
		name: 'Teddiursa',
		description: 'It lets honey soak into its paws so it can lick them all the time. Every set of paws tastes unique.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 8.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 80, def: 50, spatk: 50, spdef: 50, spd: 40 },
		available_abilities: [
			{ name: 'Pickup', is_hidden: false },
			{ name: 'Quick Feet', is_hidden: false },
			{ name: 'Honey Gather', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '216.png',
		shiny_image_file: '216-shiny.png',
		emoji: '<:216:1417702400201981972>',
		shiny_emoji: '',
		evolution: [{ to: 'Ursaring', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 217,
		name: 'Ursaring',
		description: 'In its territory, it leaves scratches on trees that bear delicious berries or fruits.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 1.8, weight: 125.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 130, def: 75, spatk: 75, spdef: 75, spd: 55 },
		available_abilities: [
			{ name: 'Guts', is_hidden: false },
			{ name: 'Quick Feet', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '217.png',
		shiny_image_file: '217-shiny.png',
		emoji: '<:217:1417702427003584672>',
		shiny_emoji: ''
	},
	{
		dex_id: 218,
		name: 'Slugma',
		description: 'It is a species of Cokemon that lives in volcanic areas. If its body cools, it will become brittle and crack.',
		type: ['Fire'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 35.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 40, def: 40, spatk: 70, spdef: 40, spd: 20 },
		available_abilities: [
			{ name: 'Magma Armor', is_hidden: false },
			{ name: 'Flame Body', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '218.png',
		shiny_image_file: '218-shiny.png',
		emoji: '<:218:1417702453096349716>',
		shiny_emoji: '',
		evolution: [{ to: 'Magcargo', conditions: [{ type: 'level_up', value: 38 }] }]
	},
	{
		dex_id: 219,
		name: 'Magcargo',
		description: 'Its body temperature is roughly 18,000 degrees Fahrenheit. Flames spout from gaps in its shell.',
		type: ['Fire', 'Rock'],
		tier: 'Rare',
		appearance: { height: 0.8, weight: 55.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 50, def: 120, spatk: 90, spdef: 80, spd: 30 },
		available_abilities: [
			{ name: 'Magma Armor', is_hidden: false },
			{ name: 'Flame Body', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '219.png',
		shiny_image_file: '219-shiny.png',
		emoji: '<:219:1417702474822844456>',
		shiny_emoji: ''
	},
	{
		dex_id: 220,
		name: 'Swinub',
		description: 'It rubs its snout on the ground to find and dig up food. It sometimes discovers hot springs.',
		type: ['Ice', 'Ground'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 6.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 50, def: 40, spatk: 30, spdef: 30, spd: 50 },
		available_abilities: [
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Snow Cloak', is_hidden: false },
			{ name: 'Thick Fat', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '220.png',
		shiny_image_file: '220-shiny.png',
		emoji: '<:220:1417702496801128518>',
		shiny_emoji: '',
		evolution: [{ to: 'Piloswine', conditions: [{ type: 'level_up', value: 33 }] }]
	},
	{
		dex_id: 221,
		name: 'Piloswine',
		description: 'If it charges at an enemy, the hairs on its back stand up straight. It is very sensitive to sound.',
		type: ['Ice', 'Ground'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 55.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 100, atk: 100, def: 80, spatk: 60, spdef: 60, spd: 50 },
		available_abilities: [
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Snow Cloak', is_hidden: false },
			{ name: 'Thick Fat', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '221.png',
		shiny_image_file: '221-shiny.png',
		emoji: '<:221:1417702521224302592>',
		shiny_emoji: '',
		evolution: [{ to: 'Mamoswine', conditions: [{ type: 'move_known', value: 'Ancient Power' }] }]
	},
	{
		dex_id: 222,
		name: 'Corsola',
		description: 'Many live in the clean seas of the south. They apparently can’t live in polluted waters.',
		type: ['Water', 'Rock'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 5.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 55, def: 95, spatk: 65, spdef: 95, spd: 35 },
		available_abilities: [
			{ name: 'Hustle', is_hidden: false },
			{ name: 'Natural Cure', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '222.png',
		shiny_image_file: '222-shiny.png',
		emoji: '<:222:1417702541394972755>',
		shiny_emoji: ''
	},
	{
		dex_id: 223,
		name: 'Remoraid',
		description: 'It uses its dorsal fin to swim backward. It is known to spit water to shoot down flying prey.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 12.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 35, atk: 65, def: 35, spatk: 65, spdef: 35, spd: 65 },
		available_abilities: [
			{ name: 'Hustle', is_hidden: false },
			{ name: 'Sniper', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '223.png',
		shiny_image_file: '223-shiny.png',
		emoji: '<:223:1417702569857519787>',
		shiny_emoji: '',
		evolution: [{ to: 'Octillery', conditions: [{ type: 'level_up', value: 25 }] }]
	},
	{
		dex_id: 224,
		name: 'Octillery',
		description: 'It traps enemies with its suction-cupped tentacles, then smashes them with its rock-hard head.',
		type: ['Water'],
		tier: 'Rare',
		appearance: { height: 0.9, weight: 28.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 105, def: 75, spatk: 105, spdef: 75, spd: 45 },
		available_abilities: [
			{ name: 'Suction Cups', is_hidden: false },
			{ name: 'Sniper', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '224.png',
		shiny_image_file: '224-shiny.png',
		emoji: '<:224:1417702591822958652>',
		shiny_emoji: ''
	},
	{
		dex_id: 225,
		name: 'Delibird',
		description: 'It carries food rolled up in its tail. It has the habit of sharing its food with people lost in the mountains.',
		type: ['Ice', 'Flying'],
		tier: 'Common',
		appearance: { height: 0.9, weight: 16.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 55, def: 45, spatk: 65, spdef: 45, spd: 75 },
		available_abilities: [
			{ name: 'Vital Spirit', is_hidden: false },
			{ name: 'Hustle', is_hidden: false },
			{ name: 'Insomnia', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '225.png',
		shiny_image_file: '225-shiny.png',
		emoji: '<:225:1417702621250060369>',
		shiny_emoji: ''
	},
	{
		dex_id: 226,
		name: 'Mantine',
		description: 'As it majestically swims, it doesn’t care if Remoraid attach to it for scavenging its leftovers.',
		type: ['Water', 'Flying'],
		tier: 'Rare',
		appearance: { height: 2.1, weight: 220.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 85, atk: 40, def: 70, spatk: 80, spdef: 140, spd: 70 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Water Absorb', is_hidden: false },
			{ name: 'Water Veil', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '226.png',
		shiny_image_file: '226-shiny.png',
		emoji: '<:226:1417702650937479271>',
		shiny_emoji: ''
	},
	{
		dex_id: 227,
		name: 'Skarmory',
		description: 'Its sturdy wings look heavy, but they are actually hollow and light, allowing it to fly freely in the sky.',
		type: ['Steel', 'Flying'],
		tier: 'Rare',
		appearance: { height: 1.7, weight: 50.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 80, def: 140, spatk: 40, spdef: 70, spd: 70 },
		available_abilities: [
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Sturdy', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '227.png',
		shiny_image_file: '227-shiny.png',
		emoji: '<:227:1417702683334414399>',
		shiny_emoji: ''
	},
	{
		dex_id: 228,
		name: 'Houndour',
		description: 'To corner prey, they check each other’s location using barks that only they can understand.',
		type: ['Dark', 'Fire'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 10.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 60, def: 30, spatk: 80, spdef: 50, spd: 65 },
		available_abilities: [
			{ name: 'Early Bird', is_hidden: false },
			{ name: 'Flash Fire', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '228.png',
		shiny_image_file: '228-shiny.png',
		emoji: '<:228:1417702715533820024>',
		shiny_emoji: '',
		evolution: [{ to: 'Houndoom', conditions: [{ type: 'level_up', value: 24 }] }]
	},
	{
		dex_id: 229,
		name: 'Houndoom',
		description: 'If you are burned by the flames it shoots from its mouth, the pain will never go away.',
		type: ['Dark', 'Fire'],
		tier: 'Rare',
		appearance: { height: 1.4, weight: 35.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 90, def: 50, spatk: 110, spdef: 80, spd: 95 },
		available_abilities: [
			{ name: 'Early Bird', is_hidden: false },
			{ name: 'Flash Fire', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '229.png',
		shiny_image_file: '229-shiny.png',
		emoji: '<:229:1417702739688947862>',
		shiny_emoji: ''
	},
	{
		dex_id: 230,
		name: 'Kingdra',
		description: 'It is said that it usually hides in underwater caves. It can create whirlpools by yawning.',
		type: ['Water', 'Dragon'],
		tier: 'Epic',
		appearance: { height: 1.8, weight: 152.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 95, def: 95, spatk: 95, spdef: 95, spd: 85 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Sniper', is_hidden: false },
			{ name: 'Damp', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '230.png',
		shiny_image_file: '230-shiny.png',
		emoji: '<:230:1417702765651824741>',
		shiny_emoji: ''
	},
	{
		dex_id: 231,
		name: 'Phanpy',
		description: 'It swings its broad snout to play, but it is so strong, it may send you flying.',
		type: ['Ground'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 33.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 60, def: 60, spatk: 40, spdef: 40, spd: 40 },
		available_abilities: [
			{ name: 'Pickup', is_hidden: false },
			{ name: 'Sand Veil', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '231.png',
		shiny_image_file: '231-shiny.png',
		emoji: '<:231:1417702794370089110>',
		shiny_emoji: '',
		evolution: [{ to: 'Donphan', conditions: [{ type: 'level_up', value: 25 }] }]
	},
	{
		dex_id: 232,
		name: 'Donphan',
		description: 'It has sharp, hard tusks and a rugged hide. Its Tackle is strong enough to knock down a house.',
		type: ['Ground'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 120.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 120, def: 120, spatk: 60, spdef: 60, spd: 50 },
		available_abilities: [
			{ name: 'Sturdy', is_hidden: false },
			{ name: 'Sand Veil', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '232.png',
		shiny_image_file: '232-shiny.png',
		emoji: '<:232:1417702823654588437>',
		shiny_emoji: ''
	},
	{
		dex_id: 233,
		name: 'Porygon2',
		description: 'This is a Porygon that was updated with special data. It may exhibit motions that were not programmed.',
		type: ['Normal'],
		tier: 'Epic',
		appearance: { height: 0.6, weight: 32.5 },
		available_genders: ['Genderless'],
		base_stats: { hp: 85, atk: 80, def: 90, spatk: 105, spdef: 95, spd: 60 },
		available_abilities: [
			{ name: 'Trace', is_hidden: false },
			{ name: 'Download', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '233.png',
		shiny_image_file: '233-shiny.png',
		emoji: '<:233:1417702847306403890>',
		shiny_emoji: '',
		evolution: [{ to: 'Porygon-Z', conditions: [{ type: 'trade_item', value: 'dubious-disc' }] }]
	},
	{
		dex_id: 234,
		name: 'Stantler',
		description: 'The curved antlers subtly change the flow of air to create a strange space where reality is distorted.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 1.4, weight: 71.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 73, atk: 95, def: 62, spatk: 85, spdef: 65, spd: 85 },
		available_abilities: [
			{ name: 'Intimidate', is_hidden: false },
			{ name: 'Frisk', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '234.png',
		shiny_image_file: '234-shiny.png',
		emoji: '<:234:1417702870551363715>',
		shiny_emoji: ''
	},
	{
		dex_id: 235,
		name: 'Smeargle',
		description: 'It marks its territory by using its tail like a paintbrush. There are more than 5,000 different marks.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 58.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 20, def: 35, spatk: 20, spdef: 45, spd: 75 },
		available_abilities: [
			{ name: 'Own Tempo', is_hidden: false },
			{ name: 'Technician', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '235.png',
		shiny_image_file: '235-shiny.png',
		emoji: '<:235:1417702897897963550>',
		shiny_emoji: ''
	},
	{
		dex_id: 236,
		name: 'Tyrogue',
		description: 'It is always bursting with energy. To make itself stronger, it keeps on fighting even if it loses.',
		type: ['Fighting'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 21.0 },
		available_genders: ['Male'],
		base_stats: { hp: 35, atk: 35, def: 35, spatk: 35, spdef: 35, spd: 35 },
		available_abilities: [
			{ name: 'Guts', is_hidden: false },
			{ name: 'Steadfast', is_hidden: false },
			{ name: 'Vital Spirit', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '236.png',
		shiny_image_file: '236-shiny.png',
		emoji: '<:236:1417702930752213034>',
		shiny_emoji: '',
		evolution: [
			{
				to: 'Hitmonlee',
				conditions: [
					{ type: 'level_up', value: 20 },
					{ type: 'stat_comparison', value: { stat1: 'atk', operator: '>', stat2: 'def' } }
				]
			},
			{
				to: 'Hitmonchan',
				conditions: [
					{ type: 'level_up', value: 20 },
					{ type: 'stat_comparison', value: { stat1: 'atk', operator: '<', stat2: 'def' } }
				]
			},
			{
				to: 'Hitmontop',
				conditions: [
					{ type: 'level_up', value: 20 },
					{ type: 'stat_comparison', value: { stat1: 'atk', operator: '=', stat2: 'def' } }
				]
			}
		]
	},
	{
		dex_id: 237,
		name: 'Hitmontop',
		description: 'It fights while spinning like a top. The centrifugal force boosts its destructive power by 10.',
		type: ['Fighting'],
		tier: 'Rare',
		appearance: { height: 1.4, weight: 48.0 },
		available_genders: ['Male'],
		base_stats: { hp: 50, atk: 95, def: 95, spatk: 35, spdef: 110, spd: 70 },
		available_abilities: [
			{ name: 'Intimidate', is_hidden: false },
			{ name: 'Technician', is_hidden: false },
			{ name: 'Steadfast', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '237.png',
		shiny_image_file: '237-shiny.png',
		emoji: '<:237:1417702965485244528>',
		shiny_emoji: ''
	},
	{
		dex_id: 238,
		name: 'Smoochum',
		description: 'Its lips are the most sensitive part of its body. It always uses its lips first to examine things.',
		type: ['Ice', 'Psychic'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 6.0 },
		available_genders: ['Female'],
		base_stats: { hp: 45, atk: 30, def: 15, spatk: 85, spdef: 65, spd: 65 },
		available_abilities: [
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Forewarn', is_hidden: false },
			{ name: 'Hydration', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '238.png',
		shiny_image_file: '238-shiny.png',
		emoji: '<:238:1417702997680717864>',
		shiny_emoji: '',
		evolution: [{ to: 'Jynx', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 239,
		name: 'Elekid',
		description: 'It rotates its arms to generate electricity, but it tires easily, so it charges up only a little bit.',
		type: ['Electric'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 23.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 63, def: 37, spatk: 65, spdef: 55, spd: 95 },
		available_abilities: [
			{ name: 'Static', is_hidden: false },
			{ name: 'Vital Spirit', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '239.png',
		shiny_image_file: '239-shiny.png',
		emoji: '<:239:1417703042714701854>',
		shiny_emoji: '',
		evolution: [{ to: 'Electabuzz', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 240,
		name: 'Magby',
		description: 'Its blood is like magma. If it is injured, it dips its wound into lava to heal itself.',
		type: ['Fire'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 21.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 75, def: 37, spatk: 70, spdef: 55, spd: 83 },
		available_abilities: [
			{ name: 'Flame Body', is_hidden: false },
			{ name: 'Vital Spirit', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '240.png',
		shiny_image_file: '240-shiny.png',
		emoji: '<:240:1417703084368592906>',
		shiny_emoji: '',
		evolution: [{ to: 'Magmar', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 241,
		name: 'Miltank',
		description: 'Its milk is packed with nutrition, making it the ultimate beverage for the sick or weary.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 75.5 },
		available_genders: ['Female'],
		base_stats: { hp: 95, atk: 80, def: 105, spatk: 40, spdef: 70, spd: 100 },
		available_abilities: [
			{ name: 'Thick Fat', is_hidden: false },
			{ name: 'Scrappy', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '241.png',
		shiny_image_file: '241-shiny.png',
		emoji: '<:241:1417703109861572800>',
		shiny_emoji: ''
	},
	{
		dex_id: 242,
		name: 'Blissey',
		description: 'It has a very compassionate nature. If it sees a sick Cokemon, it will nurse the Cokemon back to health.',
		type: ['Normal'],
		tier: 'Epic',
		appearance: { height: 1.5, weight: 46.8 },
		available_genders: ['Female'],
		base_stats: { hp: 255, atk: 10, def: 10, spatk: 75, spdef: 135, spd: 55 },
		available_abilities: [
			{ name: 'Natural Cure', is_hidden: false },
			{ name: 'Serene Grace', is_hidden: false }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '242.png',
		shiny_image_file: '242-shiny.png',
		emoji: '<:242:1417703142388404234>',
		shiny_emoji: ''
	},
	{
		dex_id: 243,
		name: 'Raikou',
		description: 'It is said to have fallen with lightning. It can fire lightning bolts from the rain clouds on its back.',
		type: ['Electric'],
		tier: 'Legendary',
		appearance: { height: 1.9, weight: 178.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 90, atk: 85, def: 75, spatk: 115, spdef: 100, spd: 115 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false },
			{ name: 'Inner Focus', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '243.png',
		shiny_image_file: '243-shiny.png',
		emoji: '<:243:1417703168216797328>',
		shiny_emoji: ''
	},
	{
		dex_id: 244,
		name: 'Entei',
		description: 'A Cokemon that races across the land. It is said that one is born every time a new volcano appears.',
		type: ['Fire'],
		tier: 'Legendary',
		appearance: { height: 2.1, weight: 198.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 115, atk: 115, def: 85, spatk: 90, spdef: 75, spd: 100 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false },
			{ name: 'Inner Focus', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '244.png',
		shiny_image_file: '244-shiny.png',
		emoji: '<:244:1417703191767810069>',
		shiny_emoji: ''
	},
	{
		dex_id: 245,
		name: 'Suicune',
		description: 'This Cokemon races across the land. It is said that north winds will somehow blow whenever it appears.',
		type: ['Water'],
		tier: 'Legendary',
		appearance: { height: 2.0, weight: 187.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 100, atk: 75, def: 115, spatk: 90, spdef: 115, spd: 85 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false },
			{ name: 'Inner Focus', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '245.png',
		shiny_image_file: '245-shiny.png',
		emoji: '<:245:1417703216547758161>',
		shiny_emoji: ''
	},
	{
		dex_id: 246,
		name: 'Larvitar',
		description: 'A Cokemon that eats soil. After it has eaten a large mountain, it will fall asleep so it can grow.',
		type: ['Rock', 'Ground'],
		tier: 'Rare',
		appearance: { height: 0.6, weight: 72.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 64, def: 50, spatk: 45, spdef: 50, spd: 41 },
		available_abilities: [
			{ name: 'Guts', is_hidden: false },
			{ name: 'Sand Veil', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '246.png',
		shiny_image_file: '246-shiny.png',
		emoji: '<:246:1417703244913709157>',
		shiny_emoji: '',
		evolution: [{ to: 'Pupitar', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 247,
		name: 'Pupitar',
		description: 'Its body is as hard as bedrock. By venting pressurized gas, it can launch itself like a rocket.',
		type: ['Rock', 'Ground'],
		tier: 'Epic',
		appearance: { height: 1.2, weight: 152.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 84, def: 70, spatk: 65, spdef: 70, spd: 51 },
		available_abilities: [
			{ name: 'Shed Skin', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '247.png',
		shiny_image_file: '247-shiny.png',
		emoji: '<:247:1417703275733585971>',
		shiny_emoji: '',
		evolution: [{ to: 'Tyranitar', conditions: [{ type: 'level_up', value: 55 }] }]
	},
	{
		dex_id: 248,
		name: 'Tyranitar',
		description: 'Its body can’t be harmed by any sort of attack, so it is very eager to make challenges to foes.',
		type: ['Rock', 'Dark'],
		tier: 'Ancient',
		appearance: { height: 2.0, weight: 202.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 100, atk: 134, def: 110, spatk: 95, spdef: 100, spd: 61 },
		available_abilities: [
			{ name: 'Sand Stream', is_hidden: false }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '248.png',
		shiny_image_file: '248-shiny.png',
		emoji: '<:248:1417703310206566532>',
		shiny_emoji: ''
	},
	{
		dex_id: 249,
		name: 'Lugia',
		description: 'It is said that it quietly spends its time deep at the bottom of the sea because its powers are too strong.',
		type: ['Psychic', 'Flying'],
		tier: 'Legendary',
		appearance: { height: 5.2, weight: 216.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 106, atk: 90, def: 130, spatk: 90, spdef: 154, spd: 110 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '249.png',
		shiny_image_file: '249-shiny.png',
		emoji: '<:249:1417703336597262336>',
		shiny_emoji: ''
	},
	{
		dex_id: 250,
		name: 'Ho-Oh',
		description: 'Its feathers are in seven colors. It is said that anyone seeing it is promised eternal happiness.',
		type: ['Fire', 'Flying'],
		tier: 'Legendary',
		appearance: { height: 3.8, weight: 199.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 106, atk: 130, def: 90, spatk: 110, spdef: 154, spd: 90 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '250.png',
		shiny_image_file: '250-shiny.png',
		emoji: '<:250:1417703370231123969>',
		shiny_emoji: ''
	},
	{
		dex_id: 251,
		name: 'Celebi',
		description: 'This Cokemon wanders across time. Grass and trees flourish in the forests in which it has appeared.',
		type: ['Psychic', 'Grass'],
		tier: 'Mythical',
		appearance: { height: 0.6, weight: 5.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 100, atk: 100, def: 100, spatk: 100, spdef: 100, spd: 100 },
		available_abilities: [
			{ name: 'Natural Cure', is_hidden: false }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '251.png',
		shiny_image_file: '251-shiny.png',
		emoji: '<:251:1417703402632249539>',
		shiny_emoji: ''
	},
	{
		dex_id: 252,
		name: 'Treecko',
		description: 'It has small hooks on the bottom of its feet that enable it to scale vertical walls.',
		type: ['Grass'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 5.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 45, def: 35, spatk: 65, spdef: 55, spd: 70 },
		available_abilities: [
			{ name: 'Overgrow', is_hidden: false },
			{ name: 'Unburden', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '252.png',
		shiny_image_file: '252-shiny.png',
		emoji: '<:252:1419641515831070721>',
		shiny_emoji: '',
		evolution: [{ to: 'Grovyle', conditions: [{ type: 'level_up', value: 16 }] }]
	},
	{
		dex_id: 253,
		name: 'Grovyle',
		description: 'This Cokemon adeptly flies from branch to branch in trees. In a forest, no Cokemon can ever hope to catch a fleeing Grovyle.',
		type: ['Grass'],
		tier: 'Rare',
		appearance: { height: 0.9, weight: 21.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 65, def: 45, spatk: 85, spdef: 65, spd: 95 },
		available_abilities: [
			{ name: 'Overgrow', is_hidden: false },
			{ name: 'Unburden', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '253.png',
		shiny_image_file: '253-shiny.png',
		emoji: '<:253:1419641531878473799>',
		shiny_emoji: '',
		evolution: [{ to: 'Sceptile', conditions: [{ type: 'level_up', value: 36 }] }]
	},
	{
		dex_id: 254,
		name: 'Sceptile',
		description: 'The leaves growing on Sceptile’s body are very sharp-edged. This Cokemon is very agile—it leaps all over the branches of trees and jumps on its foe from above or behind.',
		type: ['Grass'],
		tier: 'Epic',
		appearance: { height: 1.7, weight: 52.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 85, def: 65, spatk: 105, spdef: 85, spd: 120 },
		available_abilities: [
			{ name: 'Overgrow', is_hidden: false },
			{ name: 'Unburden', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '254.png',
		shiny_image_file: '254-shiny.png',
		emoji: '<:254:1419641545014902816>',
		shiny_emoji: ''
	},
	{
		dex_id: 255,
		name: 'Torchic',
		description: 'It has a flame sac inside its belly that perpetually burns. It feels warm if it is hugged.',
		type: ['Fire'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 2.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 60, def: 40, spatk: 70, spdef: 50, spd: 45 },
		available_abilities: [
			{ name: 'Blaze', is_hidden: false },
			{ name: 'Speed Boost', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '255.png',
		shiny_image_file: '255-shiny.png',
		emoji: '<:255:1419641557245493298>',
		shiny_emoji: '',
		evolution: [{ to: 'Combusken', conditions: [{ type: 'level_up', value: 16 }] }]
	},
	{
		dex_id: 256,
		name: 'Combusken',
		description: 'It boosts its concentration by letting out a piercing cry. It kicks could snap thick trees in half.',
		type: ['Fire', 'Fighting'],
		tier: 'Rare',
		appearance: { height: 0.9, weight: 19.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 85, def: 60, spatk: 85, spdef: 60, spd: 55 },
		available_abilities: [
			{ name: 'Blaze', is_hidden: false },
			{ name: 'Speed Boost', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '256.png',
		shiny_image_file: '256-shiny.png',
		emoji: '<:256:1419641569157578772>',
		shiny_emoji: '',
		evolution: [{ to: 'Blaziken', conditions: [{ type: 'level_up', value: 36 }] }]
	},
	{
		dex_id: 257,
		name: 'Blaziken',
		description: 'In battle, Blaziken blows out intense flames from its wrists and attacks foes courageously.',
		type: ['Fire', 'Fighting'],
		tier: 'Epic',
		appearance: { height: 1.9, weight: 52.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 120, def: 70, spatk: 110, spdef: 70, spd: 80 },
		available_abilities: [
			{ name: 'Blaze', is_hidden: false },
			{ name: 'Speed Boost', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '257.png',
		shiny_image_file: '257-shiny.png',
		emoji: '<:257:1419641581840891975>',
		shiny_emoji: ''
	},
	{
		dex_id: 258,
		name: 'Mudkip',
		description: 'The fin on its head is a highly sensitive radar. Using this fin to sense movements of water and air, this Cokemon can determine what is taking place around it without using its eyes.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 7.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 70, def: 50, spatk: 50, spdef: 50, spd: 40 },
		available_abilities: [
			{ name: 'Torrent', is_hidden: false },
			{ name: 'Damp', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '258.png',
		shiny_image_file: '258-shiny.png',
		emoji: '<:258:1419641592934957056>',
		shiny_emoji: '',
		evolution: [{ to: 'Marshtomp', conditions: [{ type: 'level_up', value: 16 }] }]
	},
	{
		dex_id: 259,
		name: 'Marshtomp',
		description: 'Its body is covered with a slimy film that keeps it from drying out when it’s on land.',
		type: ['Water', 'Ground'],
		tier: 'Rare',
		appearance: { height: 0.7, weight: 28.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 85, def: 70, spatk: 60, spdef: 70, spd: 50 },
		available_abilities: [
			{ name: 'Torrent', is_hidden: false },
			{ name: 'Damp', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '259.png',
		shiny_image_file: '259-shiny.png',
		emoji: '<:259:1419641604175564800>',
		shiny_emoji: '',
		evolution: [{ to: 'Swampert', conditions: [{ type: 'level_up', value: 36 }] }]
	},
	{
		dex_id: 260,
		name: 'Swampert',
		description: 'It is very strong. It has enough power to easily drag a boulder weighing more than a ton.',
		type: ['Water', 'Ground'],
		tier: 'Epic',
		appearance: { height: 1.5, weight: 81.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 100, atk: 110, def: 90, spatk: 85, spdef: 90, spd: 60 },
		available_abilities: [
			{ name: 'Torrent', is_hidden: false },
			{ name: 'Damp', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '260.png',
		shiny_image_file: '260-shiny.png',
		emoji: '<:260:1419641615718551573>',
		shiny_emoji: ''
	},
	{
		dex_id: 261,
		name: 'Poochyena',
		description: 'It has a very tenacious nature. It chases its prey until the victim becomes exhausted.',
		type: ['Dark'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 13.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 35, atk: 55, def: 35, spatk: 30, spdef: 30, spd: 35 },
		available_abilities: [
			{ name: 'Run Away', is_hidden: false },
			{ name: 'Quick Feet', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '261.png',
		shiny_image_file: '261-shiny.png',
		emoji: '<:261:1419641627353546802>',
		shiny_emoji: '',
		evolution: [{ to: 'Mightyena', conditions: [{ type: 'level_up', value: 18 }] }]
	},
	{
		dex_id: 262,
		name: 'Mightyena',
		description: 'It will always obey the commands of a skilled Trainer. Its behavior arises from its living in packs in ancient times.',
		type: ['Dark'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 37.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 90, def: 70, spatk: 60, spdef: 60, spd: 70 },
		available_abilities: [
			{ name: 'Intimidate', is_hidden: false },
			{ name: 'Quick Feet', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '262.png',
		shiny_image_file: '262-shiny.png',
		emoji: '<:262:1419641638929825803>',
		shiny_emoji: ''
	},
	{
		dex_id: 263,
		name: 'Zigzagoon',
		description: 'It walks in zigzag fashion. It is good at finding items in the grass and even in the ground.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 17.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 38, atk: 30, def: 41, spatk: 30, spdef: 41, spd: 60 },
		available_abilities: [
			{ name: 'Pickup', is_hidden: false },
			{ name: 'Gluttony', is_hidden: false },
			{ name: 'Quick Feet', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '263.png',
		shiny_image_file: '263-shiny.png',
		emoji: '<:263:1419641652397608991>',
		shiny_emoji: '',
		evolution: [{ to: 'Linoone', conditions: [{ type: 'level_up', value: 20 }] }]
	},
	{
		dex_id: 264,
		name: 'Linoone',
		description: 'It charges prey at speeds over 60 mph. However, it can only run straight, so it often fails.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 0.5, weight: 32.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 78, atk: 70, def: 61, spatk: 50, spdef: 61, spd: 100 },
		available_abilities: [
			{ name: 'Pickup', is_hidden: false },
			{ name: 'Gluttony', is_hidden: false },
			{ name: 'Quick Feet', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '264.png',
		shiny_image_file: '264-shiny.png',
		emoji: '<:264:1419641657896206516>',
		shiny_emoji: ''
	},
	{
		dex_id: 265,
		name: 'Wurmple',
		description: 'It loves to eat leaves. If it is attacked by a Starly, it will defend itself with its sharp spikes.',
		type: ['Bug'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 3.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 45, def: 35, spatk: 20, spdef: 30, spd: 20 },
		available_abilities: [
			{ name: 'Shield Dust', is_hidden: false },
			{ name: 'Run Away', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '265.png',
		shiny_image_file: '265-shiny.png',
		emoji: '<:265:1419641675566940161>',
		shiny_emoji: '',
		evolution: [
			{
				to: 'Silcoon',
				conditions: [
					{ type: 'level_up', value: 7 },
					{ type: 'personality', value: { operator: '<', check_value: 5 } }
				]
			},
			{
				to: 'Cascoon',
				conditions: [
					{ type: 'level_up', value: 7 },
					{ type: 'personality', value: { operator: '>=', check_value: 5 } }
				]
			}
		]
	},
	{
		dex_id: 266,
		name: 'Silcoon',
		description: 'It wraps silk around itself to store energy for its evolution. It drinks rainwater that collects on its silk.',
		type: ['Bug'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 10.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 35, def: 55, spatk: 25, spdef: 25, spd: 15 },
		available_abilities: [
			{ name: 'Shed Skin', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '266.png',
		shiny_image_file: '266-shiny.png',
		emoji: '<:266:1419641679022919710>',
		shiny_emoji: '',
		evolution: [{ to: 'Beautifly', conditions: [{ type: 'level_up', value: 10 }] }]
	},
	{
		dex_id: 267,
		name: 'Beautifly',
		description: 'It has an aggressive nature. It stabs prey with its long, narrow mouth to drain the prey’s fluids.',
		type: ['Bug', 'Flying'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 28.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 70, def: 50, spatk: 100, spdef: 50, spd: 65 },
		available_abilities: [
			{ name: 'Swarm', is_hidden: false },
			{ name: 'Rivalry', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '267.png',
		shiny_image_file: '267-shiny.png',
		emoji: '<:267:1419641690699988992>',
		shiny_emoji: ''
	},
	{
		dex_id: 268,
		name: 'Cascoon',
		description: 'It is hot to the touch. This is because it is storing energy for its evolution.',
		type: ['Bug'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 11.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 35, def: 55, spatk: 25, spdef: 25, spd: 15 },
		available_abilities: [
			{ name: 'Shed Skin', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '268.png',
		shiny_image_file: '268-shiny.png',
		emoji: '<:268:1419641701580013640>',
		shiny_emoji: '',
		evolution: [{ to: 'Dustox', conditions: [{ type: 'level_up', value: 10 }] }]
	},
	{
		dex_id: 269,
		name: 'Dustox',
		description: 'It is a nocturnal Cokemon that is attracted to the lights of cities. It beats its wings to scatter toxic dust.',
		type: ['Bug', 'Poison'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 31.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 50, def: 70, spatk: 50, spdef: 90, spd: 65 },
		available_abilities: [
			{ name: 'Shield Dust', is_hidden: false },
			{ name: 'Compound Eyes', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '269.png',
		shiny_image_file: '269-shiny.png',
		emoji: '<:269:1419641712602513480>',
		shiny_emoji: ''
	},
	{
		dex_id: 270,
		name: 'Lotad',
		description: 'It looks like an aquatic plant and serves as a ferry for Cokemon that can’t swim.',
		type: ['Water', 'Grass'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 2.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 30, def: 30, spatk: 40, spdef: 50, spd: 30 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Rain Dish', is_hidden: false },
			{ name: 'Own Tempo', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '270.png',
		shiny_image_file: '270-shiny.png',
		emoji: '<:270:1419641722912243742>',
		shiny_emoji: '',
		evolution: [{ to: 'Lombre', conditions: [{ type: 'level_up', value: 14 }] }]
	},
	{
		dex_id: 271,
		name: 'Lombre',
		description: 'It is a mischievous Cokemon. When it spots an angler, it will tug on the fishing line and enjoy their consternation.',
		type: ['Water', 'Grass'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 32.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 50, def: 50, spatk: 60, spdef: 70, spd: 50 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Rain Dish', is_hidden: false },
			{ name: 'Own Tempo', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '271.png',
		shiny_image_file: '271-shiny.png',
		emoji: '<:271:1419641733754519552>',
		shiny_emoji: '',
		evolution: [{ to: 'Ludicolo', conditions: [{ type: 'item', value: 'water-stone' }] }]
	},
	{
		dex_id: 272,
		name: 'Ludicolo',
		description: 'When it hears festive music, all the cells in its body become stimulated and it begins to dance.',
		type: ['Water', 'Grass'],
		tier: 'Epic',
		appearance: { height: 1.5, weight: 55.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 70, def: 70, spatk: 90, spdef: 100, spd: 70 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Rain Dish', is_hidden: false },
			{ name: 'Own Tempo', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '272.png',
		shiny_image_file: '272-shiny.png',
		emoji: '<:272:1419641743032193184>',
		shiny_emoji: ''
	},
	{
		dex_id: 273,
		name: 'Seedot',
		description: 'It hangs off branches and absorbs moisture. It is said that when it falls, it is a sign that autumn has come.',
		type: ['Grass'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 4.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 40, def: 50, spatk: 30, spdef: 30, spd: 30 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Early Bird', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '273.png',
		shiny_image_file: '273-shiny.png',
		emoji: '<:273:1419641752045879327>',
		shiny_emoji: '',
		evolution: [{ to: 'Nuzleaf', conditions: [{ type: 'level_up', value: 14 }] }]
	},
	{
		dex_id: 274,
		name: 'Nuzleaf',
		description: 'A Cokemon that lives in forests. It is skilled at climbing trees and its long nose is its weak point.',
		type: ['Grass', 'Dark'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 28.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 70, def: 40, spatk: 60, spdef: 40, spd: 60 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Early Bird', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '274.png',
		shiny_image_file: '274-shiny.png',
		emoji: '<:274:1419641763076903023>',
		shiny_emoji: '',
		evolution: [{ to: 'Shiftry', conditions: [{ type: 'item', value: 'leaf-stone' }] }]
	},
	{
		dex_id: 275,
		name: 'Shiftry',
		description: 'A Cokemon that was feared as a forest guardian. It can read the foe’s mind and take preemptive action.',
		type: ['Grass', 'Dark'],
		tier: 'Epic',
		appearance: { height: 1.3, weight: 59.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 100, def: 60, spatk: 90, spdef: 60, spd: 80 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Early Bird', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '275.png',
		shiny_image_file: '275-shiny.png',
		emoji: '<:275:1419641798694801488>',
		shiny_emoji: ''
	},
	{
		dex_id: 276,
		name: 'Taillow',
		description: 'It has a gutsy spirit that makes it bravely take on tough foes. It flies in search of warm climates.',
		type: ['Normal', 'Flying'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 2.3 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 55, def: 30, spatk: 30, spdef: 30, spd: 85 },
		available_abilities: [
			{ name: 'Guts', is_hidden: false },
			{ name: 'Scrappy', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '276.png',
		shiny_image_file: '276-shiny.png',
		emoji: '<:276:1419641808408805497>',
		shiny_emoji: '',
		evolution: [{ to: 'Swellow', conditions: [{ type: 'level_up', value: 22 }] }]
	},
	{
		dex_id: 277,
		name: 'Swellow',
		description: 'It dives at a steep angle as soon as it spots its prey. It catches its prey with its sharp claws.',
		type: ['Normal', 'Flying'],
		tier: 'Rare',
		appearance: { height: 0.7, weight: 19.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 85, def: 60, spatk: 75, spdef: 50, spd: 125 },
		available_abilities: [
			{ name: 'Guts', is_hidden: false },
			{ name: 'Scrappy', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '277.png',
		shiny_image_file: '277-shiny.png',
		emoji: '<:277:1419641825806778440>',
		shiny_emoji: ''
	},
	{
		dex_id: 278,
		name: 'Wingull',
		description: 'It makes its nest on a sheer cliff at the edge of the sea. It has a habit of carrying prey and valuables in its beak.',
		type: ['Water', 'Flying'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 9.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 30, def: 30, spatk: 55, spdef: 30, spd: 85 },
		available_abilities: [
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Hydration', is_hidden: false },
			{ name: 'Rain Dish', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '278.png',
		shiny_image_file: '278-shiny.png',
		emoji: '<:278:1419641836380618802>',
		shiny_emoji: '',
		evolution: [{ to: 'Pelipper', conditions: [{ type: 'level_up', value: 25 }] }]
	},
	{
		dex_id: 279,
		name: 'Pelipper',
		description: 'It is a flying transporter that carries small Cokemon and eggs inside its massive bill.',
		type: ['Water', 'Flying'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 28.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 50, def: 100, spatk: 95, spdef: 70, spd: 65 },
		available_abilities: [
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Drizzle', is_hidden: false },
			{ name: 'Rain Dish', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '279.png',
		shiny_image_file: '279-shiny.png',
		emoji: '<:279:1419641848301092905>',
		shiny_emoji: ''
	},
	{
		dex_id: 280,
		name: 'Ralts',
		description: 'It is highly attuned to the emotions of people and Cokemon. It hides if it senses hostility.',
		type: ['Psychic', 'Fairy'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 6.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 28, atk: 25, def: 25, spatk: 45, spdef: 35, spd: 40 },
		available_abilities: [
			{ name: 'Synchronize', is_hidden: false },
			{ name: 'Trace', is_hidden: false },
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '280.png',
		shiny_image_file: '280-shiny.png',
		emoji: '<:280:1419641867422662816>',
		shiny_emoji: '',
		evolution: [{ to: 'Kirlia', conditions: [{ type: 'level_up', value: 20 }] }]
	},
	{
		dex_id: 281,
		name: 'Kirlia',
		description: 'It is said that a Kirlia that is exposed to the positive emotions of its Trainer grows beautiful.',
		type: ['Psychic', 'Fairy'],
		tier: 'Rare',
		appearance: { height: 0.8, weight: 20.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 38, atk: 35, def: 35, spatk: 65, spdef: 55, spd: 50 },
		available_abilities: [
			{ name: 'Synchronize', is_hidden: false },
			{ name: 'Trace', is_hidden: false },
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '281.png',
		shiny_image_file: '281-shiny.png',
		emoji: '<:281:1419641874469228544>',
		shiny_emoji: '',
		evolution: [
			{ to: 'Gardevoir', conditions: [{ type: 'level_up', value: 30 }] },
			{ to: 'Gallade', conditions: [{ type: 'item', value: 'dawn-stone' }, { type: 'gender', value: 'Male' }] }
		]
	},
	{
		dex_id: 282,
		name: 'Gardevoir',
		description: 'It has the power to predict the future. Its power peaks when it is protecting its Trainer.',
		type: ['Psychic', 'Fairy'],
		tier: 'Epic',
		appearance: { height: 1.6, weight: 48.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 68, atk: 65, def: 65, spatk: 125, spdef: 115, spd: 80 },
		available_abilities: [
			{ name: 'Synchronize', is_hidden: false },
			{ name: 'Trace', is_hidden: false },
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '282.png',
		shiny_image_file: '282-shiny.png',
		emoji: '<:282:1419641887492542545>',
		shiny_emoji: ''
	},
	{
		dex_id: 283,
		name: 'Surskit',
		description: 'It appears as if it is skating on water. It draws sweet scents from the tips of its feet.',
		type: ['Bug', 'Water'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 1.7 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 30, def: 32, spatk: 50, spdef: 52, spd: 65 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Rain Dish', is_hidden: true },
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '283.png',
		shiny_image_file: '283-shiny.png',
		emoji: '<:283:1419641896384466955>',
		shiny_emoji: '',
		evolution: [{ to: 'Masquerain', conditions: [{ type: 'level_up', value: 22 }] }]
	},
	{
		dex_id: 284,
		name: 'Masquerain',
		description: 'Its antennae have eye-like patterns that unfold to intimidate enemies. It flaps its four wings to freely fly in any direction.',
		type: ['Bug', 'Flying'],
		tier: 'Rare',
		appearance: { height: 0.8, weight: 3.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 60, def: 62, spatk: 100, spdef: 82, spd: 80 },
		available_abilities: [
			{ name: 'Intimidate', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '284.png',
		shiny_image_file: '284-shiny.png',
		emoji: '<:284:1419641910129332424>',
		shiny_emoji: ''
	},
	{
		dex_id: 285,
		name: 'Shroomish',
		description: 'It prefers damp places. By day it remains still in the forest shade. It releases toxic spores from its head.',
		type: ['Grass'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 4.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 40, def: 60, spatk: 40, spdef: 60, spd: 35 },
		available_abilities: [
			{ name: 'Effect Spore', is_hidden: false },
			{ name: 'Poison Heal', is_hidden: false },
			{ name: 'Quick Feet', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '285.png',
		shiny_image_file: '285-shiny.png',
		emoji: '<:285:1419641923957821492>',
		shiny_emoji: '',
		evolution: [{ to: 'Breloom', conditions: [{ type: 'level_up', value: 23 }] }]
	},
	{
		dex_id: 286,
		name: 'Breloom',
		description: 'Its short arms stretch when it throws punches. Its technique is equal to that of pro boxers.',
		type: ['Grass', 'Fighting'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 39.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 130, def: 80, spatk: 60, spdef: 60, spd: 70 },
		available_abilities: [
			{ name: 'Effect Spore', is_hidden: false },
			{ name: 'Poison Heal', is_hidden: false },
			{ name: 'Technician', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '286.png',
		shiny_image_file: '286-shiny.png',
		emoji: '<:286:1419641936922284112>',
		shiny_emoji: ''
	},
	{
		dex_id: 287,
		name: 'Slakoth',
		description: 'It spends nearly all its time in a day sprawled out. Every time it breathes, its heart beats just once.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 0.8, weight: 24.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 60, def: 60, spatk: 35, spdef: 35, spd: 30 },
		available_abilities: [
			{ name: 'Truant', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.1,
		image_file: '287.png',
		shiny_image_file: '287-shiny.png',
		emoji: '<:287:1419641958984450058>',
		shiny_emoji: '',
		evolution: [{ to: 'Vigoroth', conditions: [{ type: 'level_up', value: 18 }] }]
	},
	{
		dex_id: 288,
		name: 'Vigoroth',
		description: 'Its heart beats at a tenfold tempo, so it cannot sit still for even a moment.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 1.4, weight: 46.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 80, def: 80, spatk: 55, spdef: 55, spd: 90 },
		available_abilities: [
			{ name: 'Vital Spirit', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '288.png',
		shiny_image_file: '288-shiny.png',
		emoji: '<:288:1419641970183241748>',
		shiny_emoji: '',
		evolution: [{ to: 'Slaking', conditions: [{ type: 'level_up', value: 36 }] }]
	},
	{
		dex_id: 289,
		name: 'Slaking',
		description: 'The world’s laziest Cokemon. It moves to another spot when there is no food left within its reach.',
		type: ['Normal'],
		tier: 'Epic',
		appearance: { height: 2.0, weight: 130.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 150, atk: 160, def: 100, spatk: 95, spdef: 65, spd: 100 },
		available_abilities: [
			{ name: 'Truant', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '289.png',
		shiny_image_file: '289-shiny.png',
		emoji: '<:289:1419641982128619671>',
		shiny_emoji: ''
	},
	{
		dex_id: 290,
		name: 'Nincada',
		description: 'It can sometimes live underground for more than 10 years. It absorbs nutrients from the roots of trees.',
		type: ['Bug', 'Ground'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 5.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 31, atk: 45, def: 90, spatk: 30, spdef: 30, spd: 40 },
		available_abilities: [
			{ name: 'Compound Eyes', is_hidden: false },
			{ name: 'Run Away', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '290.png',
		shiny_image_file: '290-shiny.png',
		emoji: '<:290:1419641993209843886>',
		shiny_emoji: '',
		evolution: [{ to: 'Ninjask', conditions: [{ type: 'level_up', value: 20 }] }]
	},
	{
		dex_id: 291,
		name: 'Ninjask',
		description: 'Because it moves so quickly, it sometimes becomes unseeable. It congregates around tree sap.',
		type: ['Bug', 'Flying'],
		tier: 'Rare',
		appearance: { height: 0.8, weight: 12.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 61, atk: 90, def: 45, spatk: 50, spdef: 50, spd: 160 },
		available_abilities: [
			{ name: 'Speed Boost', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '291.png',
		shiny_image_file: '291-shiny.png',
		emoji: '<:291:1419642006556115035>',
		shiny_emoji: ''
	},
	{
		dex_id: 292,
		name: 'Shedinja',
		description: 'A discarded bug shell that came to life. Peering into the crack on its back is said to steal one’s spirit.',
		type: ['Bug', 'Ghost'],
		tier: 'Epic',
		appearance: { height: 0.8, weight: 1.2 },
		available_genders: ['Genderless'],
		base_stats: { hp: 1, atk: 90, def: 45, spatk: 30, spdef: 30, spd: 40 },
		available_abilities: [
			{ name: 'Wonder Guard', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '292.png',
		shiny_image_file: '292-shiny.png',
		emoji: '<:292:1419642020108046336>',
		shiny_emoji: ''
	},
	{
		dex_id: 293,
		name: 'Whismur',
		description: 'Usually, its cries are like quiet murmurs. If frightened, it shrieks at the same volume as a jet plane.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 16.3 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 64, atk: 51, def: 23, spatk: 51, spdef: 23, spd: 28 },
		available_abilities: [
			{ name: 'Soundproof', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '293.png',
		shiny_image_file: '293-shiny.png',
		emoji: '<:293:1419642030237417582>',
		shiny_emoji: '',
		evolution: [{ to: 'Loudred', conditions: [{ type: 'level_up', value: 20 }] }]
	},
	{
		dex_id: 294,
		name: 'Loudred',
		description: 'The shock waves from its cries can tip over trucks. It stamps its feet to power up.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 40.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 84, atk: 71, def: 43, spatk: 71, spdef: 43, spd: 48 },
		available_abilities: [
			{ name: 'Soundproof', is_hidden: false },
			{ name: 'Scrappy', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '294.png',
		shiny_image_file: '294-shiny.png',
		emoji: '<:294:1419642049098944512>',
		shiny_emoji: '',
		evolution: [{ to: 'Exploud', conditions: [{ type: 'level_up', value: 40 }] }]
	},
	{
		dex_id: 295,
		name: 'Exploud',
		description: 'Its roar in battle shakes the ground like a big earthquake. It can be heard from 6 miles away.',
		type: ['Normal'],
		tier: 'Epic',
		appearance: { height: 1.5, weight: 84.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 104, atk: 91, def: 63, spatk: 91, spdef: 73, spd: 68 },
		available_abilities: [
			{ name: 'Soundproof', is_hidden: false },
			{ name: 'Scrappy', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '295.png',
		shiny_image_file: '295-shiny.png',
		emoji: '<:295:1419642066870341742>',
		shiny_emoji: ''
	},
	{
		dex_id: 296,
		name: 'Makuhita',
		description: 'It has a gutsy spirit--it will never give up. It grows larger and stronger with every battle.',
		type: ['Fighting'],
		tier: 'Common',
		appearance: { height: 1.0, weight: 86.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 72, atk: 60, def: 30, spatk: 20, spdef: 30, spd: 25 },
		available_abilities: [
			{ name: 'Thick Fat', is_hidden: false },
			{ name: 'Guts', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '296.png',
		shiny_image_file: '296-shiny.png',
		emoji: '<:296:1419642078186573854>',
		shiny_emoji: '',
		evolution: [{ to: 'Hariyama', conditions: [{ type: 'level_up', value: 24 }] }]
	},
	{
		dex_id: 297,
		name: 'Hariyama',
		description: 'It loves to match power with big-bodied Cokemon. It can knock a truck flying with its slapping thrusts.',
		type: ['Fighting'],
		tier: 'Rare',
		appearance: { height: 2.3, weight: 253.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 144, atk: 120, def: 60, spatk: 40, spdef: 60, spd: 50 },
		available_abilities: [
			{ name: 'Thick Fat', is_hidden: false },
			{ name: 'Guts', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '297.png',
		shiny_image_file: '297-shiny.png',
		emoji: '<:297:1419642089288761446>',
		shiny_emoji: ''
	},
	{
		dex_id: 298,
		name: 'Azurill',
		description: 'Its tail, which is packed with nutrition, is very bouncy. It is always seen with a Marill.',
		type: ['Normal', 'Fairy'],
		tier: 'Common',
		appearance: { height: 0.2, weight: 2.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 20, def: 40, spatk: 20, spdef: 40, spd: 20 },
		available_abilities: [
			{ name: 'Thick Fat', is_hidden: false },
			{ name: 'Huge Power', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '298.png',
		shiny_image_file: '298-shiny.png',
		emoji: '<:298:1419642101028884511>',
		shiny_emoji: '',
		evolution: [{ to: 'Marill', conditions: [{ type: 'friendship', value: 220 }] }]
	},
	{
		dex_id: 299,
		name: 'Nosepass',
		description: 'Its magnetic nose always points to the north. Travelers check Nosepass to get their bearings.',
		type: ['Rock'],
		tier: 'Common',
		appearance: { height: 1.0, weight: 97.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 30, atk: 45, def: 135, spatk: 45, spdef: 90, spd: 30 },
		available_abilities: [
			{ name: 'Sturdy', is_hidden: false },
			{ name: 'Magnet Pull', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '299.png',
		shiny_image_file: '299-shiny.png',
		emoji: '<:299:1419642113792016485>',
		shiny_emoji: '',
		evolution: [{ to: 'Probopass', conditions: [{ type: 'location', value: 'Steel' }] }]
	},
	{
		dex_id: 300,
		name: 'Skitty',
		description: 'It can’t stop itself from chasing moving things, and it runs in a circle, chasing its own tail.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 11.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 45, def: 45, spatk: 35, spdef: 35, spd: 50 },
		available_abilities: [
			{ name: 'Cute Charm', is_hidden: false },
			{ name: 'Normalize', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '300.png',
		shiny_image_file: '300-shiny.png',
		emoji: '<:300:1419642124579897448>',
		shiny_emoji: '',
		evolution: [{ to: 'Delcatty', conditions: [{ type: 'item', value: 'moon-stone' }] }]
	},
	{
		dex_id: 301,
		name: 'Delcatty',
		description: 'It is highly popular among female Trainers for its sublime fur. It does not keep a nest.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 32.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 65, def: 65, spatk: 55, spdef: 55, spd: 90 },
		available_abilities: [
			{ name: 'Cute Charm', is_hidden: false },
			{ name: 'Normalize', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '301.png',
		shiny_image_file: '301-shiny.png',
		emoji: '<:301:1419642140597817465>',
		shiny_emoji: ''
	},
	{
		dex_id: 302,
		name: 'Sableye',
		description: 'It hides in the darkness of caves. Its diet of gems has transformed its eyes into gemstones.',
		type: ['Dark', 'Ghost'],
		tier: 'Rare',
		appearance: { height: 0.5, weight: 11.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 75, def: 75, spatk: 65, spdef: 65, spd: 50 },
		available_abilities: [
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Stall', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '302.png',
		shiny_image_file: '302-shiny.png',
		emoji: '<:302:1419642150605426709>',
		shiny_emoji: ''
	},
	{
		dex_id: 303,
		name: 'Mawile',
		description: 'It uses its docile-looking face to lull foes into letting down their guard. When the foe least expects it, Mawile chomps it with its gaping jaws.',
		type: ['Steel', 'Fairy'],
		tier: 'Rare',
		appearance: { height: 0.6, weight: 11.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 85, def: 85, spatk: 55, spdef: 55, spd: 50 },
		available_abilities: [
			{ name: 'Hyper Cutter', is_hidden: false },
			{ name: 'Intimidate', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '303.png',
		shiny_image_file: '303-shiny.png',
		emoji: '<:303:1419642161904746577>',
		shiny_emoji: ''
	},
	{
		dex_id: 304,
		name: 'Aron',
		description: 'It eats iron ore--and sometimes railroad tracks--to build up the steel armor that protects its body.',
		type: ['Steel', 'Rock'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 60.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 70, def: 100, spatk: 40, spdef: 40, spd: 30 },
		available_abilities: [
			{ name: 'Sturdy', is_hidden: false },
			{ name: 'Rock Head', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '304.png',
		shiny_image_file: '304-shiny.png',
		emoji: '<:304:1419642174135341056>',
		shiny_emoji: '',
		evolution: [{ to: 'Lairon', conditions: [{ type: 'level_up', value: 32 }] }]
	},
	{
		dex_id: 305,
		name: 'Lairon',
		description: 'It loves iron ore. It smashes its steely body against others to fight over territory.',
		type: ['Steel', 'Rock'],
		tier: 'Rare',
		appearance: { height: 0.9, weight: 120.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 90, def: 140, spatk: 50, spdef: 50, spd: 40 },
		available_abilities: [
			{ name: 'Sturdy', is_hidden: false },
			{ name: 'Rock Head', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '305.png',
		shiny_image_file: '305-shiny.png',
		emoji: '<:305:1419642186324119637>',
		shiny_emoji: '',
		evolution: [{ to: 'Aggron', conditions: [{ type: 'level_up', value: 42 }] }]
	},
	{
		dex_id: 306,
		name: 'Aggron',
		description: 'It claims a whole mountain as its territory. It mercilessly beats up anything that violates its environment.',
		type: ['Steel', 'Rock'],
		tier: 'Epic',
		appearance: { height: 2.1, weight: 360.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 110, def: 180, spatk: 60, spdef: 60, spd: 50 },
		available_abilities: [
			{ name: 'Sturdy', is_hidden: false },
			{ name: 'Rock Head', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '306.png',
		shiny_image_file: '306-shiny.png',
		emoji: '<:306:1419642200295346308>',
		shiny_emoji: ''
	},
	{
		dex_id: 307,
		name: 'Meditite',
		description: 'It never skips its daily yoga training. It heightens its spiritual power through meditation.',
		type: ['Fighting', 'Psychic'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 11.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 30, atk: 40, def: 55, spatk: 40, spdef: 55, spd: 60 },
		available_abilities: [
			{ name: 'Pure Power', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '307.png',
		shiny_image_file: '307-shiny.png',
		emoji: '<:307:1419642211401994410>',
		shiny_emoji: '',
		evolution: [{ to: 'Medicham', conditions: [{ type: 'level_up', value: 37 }] }]
	},
	{
		dex_id: 308,
		name: 'Medicham',
		description: 'It is said that through meditation, it gained psychic power. It gains striking power from its brain.',
		type: ['Fighting', 'Psychic'],
		tier: 'Rare',
		appearance: { height: 1.3, weight: 31.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 60, def: 75, spatk: 60, spdef: 75, spd: 80 },
		available_abilities: [
			{ name: 'Pure Power', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '308.png',
		shiny_image_file: '308-shiny.png',
		emoji: '<:308:1419642222638399538>',
		shiny_emoji: ''
	},
	{
		dex_id: 309,
		name: 'Electrike',
		description: 'It stores electricity in its long fur. It stimulates its leg muscles with electric charges, enabling it to run at high speed.',
		type: ['Electric'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 15.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 45, def: 40, spatk: 65, spdef: 40, spd: 65 },
		available_abilities: [
			{ name: 'Static', is_hidden: false },
			{ name: 'Lightning Rod', is_hidden: false },
			{ name: 'Minus', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '309.png',
		shiny_image_file: '309-shiny.png',
		emoji: '<:309:1419642237272326224>',
		shiny_emoji: '',
		evolution: [{ to: 'Manectric', conditions: [{ type: 'level_up', value: 26 }] }]
	},
	{
		dex_id: 310,
		name: 'Manectric',
		description: 'It is said that lightning bolts strike those who cross its territory.',
		type: ['Electric'],
		tier: 'Rare',
		appearance: { height: 1.5, weight: 40.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 75, def: 60, spatk: 105, spdef: 60, spd: 105 },
		available_abilities: [
			{ name: 'Static', is_hidden: false },
			{ name: 'Lightning Rod', is_hidden: false },
			{ name: 'Minus', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '310.png',
		shiny_image_file: '310-shiny.png',
		emoji: '<:310:1419642244683530381>',
		shiny_emoji: ''
	},
	{
		dex_id: 311,
		name: 'Plusle',
		description: 'It cheers on its partners in battle. It sparks with short-circuiting electricity when it is cheering.',
		type: ['Electric'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 4.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 50, def: 40, spatk: 85, spdef: 75, spd: 95 },
		available_abilities: [
			{ name: 'Plus', is_hidden: false },
			{ name: 'Lightning Rod', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '311.png',
		shiny_image_file: '311-shiny.png',
		emoji: '<:311:1419642255165362227>',
		shiny_emoji: ''
	},
	{
		dex_id: 312,
		name: 'Minun',
		description: 'It cheers on its partners. If its partner is losing, its body will shower with sparks.',
		type: ['Electric'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 4.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 40, def: 50, spatk: 75, spdef: 85, spd: 95 },
		available_abilities: [
			{ name: 'Minus', is_hidden: false },
			{ name: 'Volt Absorb', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '312.png',
		shiny_image_file: '312-shiny.png',
		emoji: '<:312:1419642266150109285>',
		shiny_emoji: ''
	},
	{
		dex_id: 313,
		name: 'Volbeat',
		description: 'It lives in clean ponds. At night, its rear lights up and it draws geometric shapes in the sky.',
		type: ['Bug'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 17.7 },
		available_genders: ['Male'],
		base_stats: { hp: 65, atk: 73, def: 75, spatk: 47, spdef: 85, spd: 85 },
		available_abilities: [
			{ name: 'Illuminate', is_hidden: false },
			{ name: 'Swarm', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '313.png',
		shiny_image_file: '313-shiny.png',
		emoji: '<:313:1419642277525196800>',
		shiny_emoji: ''
	},
	{
		dex_id: 314,
		name: 'Illumise',
		description: 'It guides Volbeat to draw signs in the night sky. There are more than 200 different patterns.',
		type: ['Bug'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 17.7 },
		available_genders: ['Female'],
		base_stats: { hp: 65, atk: 47, def: 75, spatk: 73, spdef: 85, spd: 85 },
		available_abilities: [
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Tinted Lens', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '314.png',
		shiny_image_file: '314-shiny.png',
		emoji: '<:314:1419642290661621930>',
		shiny_emoji: ''
	},
	{
		dex_id: 315,
		name: 'Roselia',
		description: 'The flowers on its arms are filled with poison needles. It shoots sharp thorns as it attacks.',
		type: ['Grass', 'Poison'],
		tier: 'Rare',
		appearance: { height: 0.3, weight: 2.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 60, def: 45, spatk: 100, spdef: 80, spd: 65 },
		available_abilities: [
			{ name: 'Natural Cure', is_hidden: false },
			{ name: 'Poison Point', is_hidden: false },
			{ name: 'Leaf Guard', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '315.png',
		shiny_image_file: '315-shiny.png',
		emoji: '<:315:1419642302137106472>',
		shiny_emoji: '',
		evolution: [{ to: 'Roserade', conditions: [{ type: 'item', value: 'shiny-stone' }] }]
	},
	{
		dex_id: 316,
		name: 'Gulpin',
		description: 'It has a small heart and brain. Its stomach comprises most of its body, with enzymes to digest anything.',
		type: ['Poison'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 10.3 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 43, def: 53, spatk: 43, spdef: 53, spd: 40 },
		available_abilities: [
			{ name: 'Liquid Ooze', is_hidden: false },
			{ name: 'Sticky Hold', is_hidden: false },
			{ name: 'Gluttony', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '316.png',
		shiny_image_file: '316-shiny.png',
		emoji: '<:316:1419642316951392357>',
		shiny_emoji: '',
		evolution: [{ to: 'Swalot', conditions: [{ type: 'level_up', value: 26 }] }]
	},
	{
		dex_id: 317,
		name: 'Swalot',
		description: 'It swallows anything whole. It sweats a poisonous fluid that melts anything. Its stomach can digest almost anything.',
		type: ['Poison'],
		tier: 'Rare',
		appearance: { height: 1.7, weight: 80.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 100, atk: 73, def: 83, spatk: 73, spdef: 83, spd: 55 },
		available_abilities: [
			{ name: 'Liquid Ooze', is_hidden: false },
			{ name: 'Sticky Hold', is_hidden: false },
			{ name: 'Gluttony', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '317.png',
		shiny_image_file: '317-shiny.png',
		emoji: '<:317:1419642329391693824>',
		shiny_emoji: ''
	},
	{
		dex_id: 318,
		name: 'Carvanha',
		description: 'It lives in rivers that course through jungles. It swarms and attacks any intruder that enters its territory.',
		type: ['Water', 'Dark'],
		tier: 'Common',
		appearance: { height: 0.8, weight: 20.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 90, def: 20, spatk: 65, spdef: 20, spd: 65 },
		available_abilities: [
			{ name: 'Rough Skin', is_hidden: false },
			{ name: 'Speed Boost', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '318.png',
		shiny_image_file: '318-shiny.png',
		emoji: '<:318:1419642340930486403>',
		shiny_emoji: '',
		evolution: [{ to: 'Sharpedo', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 319,
		name: 'Sharpedo',
		description: 'Its fangs rip through sheet iron. It swims at 75 mph and is known as the bully of the sea.',
		type: ['Water', 'Dark'],
		tier: 'Rare',
		appearance: { height: 1.8, weight: 88.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 120, def: 40, spatk: 95, spdef: 40, spd: 95 },
		available_abilities: [
			{ name: 'Rough Skin', is_hidden: false },
			{ name: 'Speed Boost', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '319.png',
		shiny_image_file: '319-shiny.png',
		emoji: '<:319:1419642352997236816>',
		shiny_emoji: ''
	},
	{
		dex_id: 320,
		name: 'Wailmer',
		description: 'It spouts water from its nostrils. It loves to startle people by forcefully spouting seawater it stores in its body.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 2.0, weight: 130.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 130, atk: 70, def: 35, spatk: 70, spdef: 35, spd: 60 },
		available_abilities: [
			{ name: 'Water Veil', is_hidden: false },
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Pressure', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '320.png',
		shiny_image_file: '320-shiny.png',
		emoji: '<:320:1419642364263137380>',
		shiny_emoji: '',
		evolution: [{ to: 'Wailord', conditions: [{ type: 'level_up', value: 40 }] }]
	},
	{
		dex_id: 321,
		name: 'Wailord',
		description: 'It is the largest of all Cokemon. It can dive to a depth of almost 10,000 feet on only one breath.',
		type: ['Water'],
		tier: 'Epic',
		appearance: { height: 14.5, weight: 398.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 170, atk: 90, def: 45, spatk: 90, spdef: 45, spd: 60 },
		available_abilities: [
			{ name: 'Water Veil', is_hidden: false },
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Pressure', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '321.png',
		shiny_image_file: '321-shiny.png',
		emoji: '<:321:1419642378272247871>',
		shiny_emoji: ''
	},
	{
		dex_id: 322,
		name: 'Numel',
		description: 'Its body is a seething cauldron of boiling magma. It is stoic and never flinches, even when it is struck.',
		type: ['Fire', 'Ground'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 24.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 60, def: 40, spatk: 65, spdef: 45, spd: 35 },
		available_abilities: [
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Simple', is_hidden: false },
			{ name: 'Own Tempo', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '322.png',
		shiny_image_file: '322-shiny.png',
		emoji: '<:322:1419642393988436080>',
		shiny_emoji: '',
		evolution: [{ to: 'Camerupt', conditions: [{ type: 'level_up', value: 33 }] }]
	},
	{
		dex_id: 323,
		name: 'Camerupt',
		description: 'It has volcanoes on its back. If angered, it erupts and spews molten lava from its humps.',
		type: ['Fire', 'Ground'],
		tier: 'Rare',
		appearance: { height: 1.9, weight: 220.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 100, def: 70, spatk: 105, spdef: 75, spd: 40 },
		available_abilities: [
			{ name: 'Magma Armor', is_hidden: false },
			{ name: 'Solid Rock', is_hidden: false },
			{ name: 'Anger Point', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '323.png',
		shiny_image_file: '323-shiny.png',
		emoji: '<:323:1419642404700553319>',
		shiny_emoji: ''
	},
	{
		dex_id: 324,
		name: 'Torkoal',
		description: 'It burns coal inside its shell for energy. It blows out black soot if it is endangered.',
		type: ['Fire'],
		tier: 'Rare',
		appearance: { height: 0.5, weight: 80.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 85, def: 140, spatk: 85, spdef: 70, spd: 20 },
		available_abilities: [
			{ name: 'White Smoke', is_hidden: false },
			{ name: 'Drought', is_hidden: false },
			{ name: 'Shell Armor', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '324.png',
		shiny_image_file: '324-shiny.png',
		emoji: '<:324:1419642421633093793>',
		shiny_emoji: ''
	},
	{
		dex_id: 325,
		name: 'Spoink',
		description: 'It bounces constantly, using its tail like a spring. The shock of bouncing makes its heart pump.',
		type: ['Psychic'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 30.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 25, def: 35, spatk: 70, spdef: 80, spd: 60 },
		available_abilities: [
			{ name: 'Thick Fat', is_hidden: false },
			{ name: 'Own Tempo', is_hidden: false },
			{ name: 'Gluttony', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '325.png',
		shiny_image_file: '325-shiny.png',
		emoji: '<:325:1419642437265129613>',
		shiny_emoji: '',
		evolution: [{ to: 'Grumpig', conditions: [{ type: 'level_up', value: 32 }] }]
	},
	{
		dex_id: 326,
		name: 'Grumpig',
		description: 'It uses black pearls on its body to amplify its psychic power waves for gaining total control over its foe.',
		type: ['Psychic'],
		tier: 'Rare',
		appearance: { height: 0.9, weight: 71.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 45, def: 65, spatk: 90, spdef: 110, spd: 80 },
		available_abilities: [
			{ name: 'Thick Fat', is_hidden: false },
			{ name: 'Own Tempo', is_hidden: false },
			{ name: 'Gluttony', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '326.png',
		shiny_image_file: '326-shiny.png',
		emoji: '<:326:1419642451328766023>',
		shiny_emoji: ''
	},
	{
		dex_id: 327,
		name: 'Spinda',
		description: 'No two Spinda are said to have the same spot pattern. It moves with stumbling steps.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 1.1, weight: 5.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 60, def: 60, spatk: 60, spdef: 60, spd: 60 },
		available_abilities: [
			{ name: 'Own Tempo', is_hidden: false },
			{ name: 'Tangled Feet', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.1,
		image_file: '327.png',
		shiny_image_file: '327-shiny.png',
		emoji: '<:327:1419642463295111310>',
		shiny_emoji: ''
	},
	{
		dex_id: 328,
		name: 'Trapinch',
		description: 'It makes a conical pit in desert sand and lies in wait at the bottom for prey to come tumbling down.',
		type: ['Ground'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 15.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 100, def: 45, spatk: 45, spdef: 45, spd: 10 },
		available_abilities: [
			{ name: 'Hyper Cutter', is_hidden: false },
			{ name: 'Arena Trap', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '328.png',
		shiny_image_file: '328-shiny.png',
		emoji: '<:328:1419642473847853106>',
		shiny_emoji: '',
		evolution: [{ to: 'Vibrava', conditions: [{ type: 'level_up', value: 35 }] }]
	},
	{
		dex_id: 329,
		name: 'Vibrava',
		description: 'It generates ultrasonic waves by violently vibrating its wings. After making its prey faint, it melts them with acid.',
		type: ['Ground', 'Dragon'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 15.3 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 70, def: 50, spatk: 50, spdef: 50, spd: 70 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '329.png',
		shiny_image_file: '329-shiny.png',
		emoji: '<:329:1419642487726673951>',
		shiny_emoji: '',
		evolution: [{ to: 'Flygon', conditions: [{ type: 'level_up', value: 45 }] }]
	},
	{
		dex_id: 330,
		name: 'Flygon',
		description: 'It is nicknamed “The Desert Spirit.” Its flapping wings whip up a cloud of sand that covers it from view.',
		type: ['Ground', 'Dragon'],
		tier: 'Epic',
		appearance: { height: 2.0, weight: 82.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 100, def: 80, spatk: 80, spdef: 80, spd: 100 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '330.png',
		shiny_image_file: '330-shiny.png',
		emoji: '<:330:1419642499869184000>',
		shiny_emoji: ''
	},
	{
		dex_id: 331,
		name: 'Cacnea',
		description: 'It lives in arid locations. Its yellow flowers bloom once a year.',
		type: ['Grass'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 51.3 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 85, def: 40, spatk: 85, spdef: 40, spd: 35 },
		available_abilities: [
			{ name: 'Sand Veil', is_hidden: false },
			{ name: 'Water Absorb', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '331.png',
		shiny_image_file: '331-shiny.png',
		emoji: '<:331:1419642512196243496>',
		shiny_emoji: '',
		evolution: [{ to: 'Cacturne', conditions: [{ type: 'level_up', value: 32 }] }]
	},
	{
		dex_id: 332,
		name: 'Cacturne',
		description: 'It becomes active at night, seeking prey that is exhausted from the day’s desert heat.',
		type: ['Grass', 'Dark'],
		tier: 'Rare',
		appearance: { height: 1.3, weight: 77.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 115, def: 60, spatk: 115, spdef: 60, spd: 55 },
		available_abilities: [
			{ name: 'Sand Veil', is_hidden: false },
			{ name: 'Water Absorb', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '332.png',
		shiny_image_file: '332-shiny.png',
		emoji: '<:332:1419642522011172864>',
		shiny_emoji: ''
	},
	{
		dex_id: 333,
		name: 'Swablu',
		description: 'It has light and fluffy wings that are like cottony clouds. It is not frightened of people.',
		type: ['Normal', 'Flying'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 1.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 40, def: 60, spatk: 40, spdef: 75, spd: 50 },
		available_abilities: [
			{ name: 'Natural Cure', is_hidden: false },
			{ name: 'Cloud Nine', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '333.png',
		shiny_image_file: '333-shiny.png',
		emoji: '<:333:1419642532664447026>',
		shiny_emoji: '',
		evolution: [{ to: 'Altaria', conditions: [{ type: 'level_up', value: 35 }] }]
	},
	{
		dex_id: 334,
		name: 'Altaria',
		description: 'It hums in a beautiful soprano voice. It flies among white clouds in the blue sky.',
		type: ['Dragon', 'Flying'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 20.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 70, def: 90, spatk: 70, spdef: 105, spd: 80 },
		available_abilities: [
			{ name: 'Natural Cure', is_hidden: false },
			{ name: 'Cloud Nine', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '334.png',
		shiny_image_file: '334-shiny.png',
		emoji: '<:334:1419642544748236941>',
		shiny_emoji: ''
	},
	{
		dex_id: 335,
		name: 'Zangoose',
		description: 'Its fur has bristled up, and it is standing on its hind legs to look intimidating. It gets into fights with Seviper.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 1.3, weight: 40.3 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 73, atk: 115, def: 60, spatk: 60, spdef: 60, spd: 90 },
		available_abilities: [
			{ name: 'Immunity', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '335.png',
		shiny_image_file: '335-shiny.png',
		emoji: '<:335:1419642556760723467>',
		shiny_emoji: ''
	},
	{
		dex_id: 336,
		name: 'Seviper',
		description: 'It sharpens its swordlike tail on hard rocks. It hides in tall grass and strikes unwary prey with venomous fangs.',
		type: ['Poison'],
		tier: 'Rare',
		appearance: { height: 2.7, weight: 52.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 73, atk: 100, def: 60, spatk: 100, spdef: 60, spd: 65 },
		available_abilities: [
			{ name: 'Shed Skin', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '336.png',
		shiny_image_file: '336-shiny.png',
		emoji: '<:336:1419642570195210321>',
		shiny_emoji: ''
	},
	{
		dex_id: 337,
		name: 'Lunatone',
		description: 'It was discovered at the site of a meteor strike 40 years ago. Its eerie red eyes are enough to make anyone uneasy.',
		type: ['Rock', 'Psychic'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 168.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 90, atk: 55, def: 65, spatk: 95, spdef: 85, spd: 70 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '337.png',
		shiny_image_file: '337-shiny.png',
		emoji: '<:337:1419642582375333899>',
		shiny_emoji: ''
	},
	{
		dex_id: 338,
		name: 'Solrock',
		description: 'Solar energy is the source of its power. It is said to be able to release a powerful light in battle.',
		type: ['Rock', 'Psychic'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 154.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 90, atk: 95, def: 85, spatk: 55, spdef: 65, spd: 70 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '338.png',
		shiny_image_file: '338-shiny.png',
		emoji: '<:338:1419642593737703496>',
		shiny_emoji: ''
	},
	{
		dex_id: 339,
		name: 'Barboach',
		description: 'Its slimy body is hard to grasp. In one region, it is said to have been born from hardened mud.',
		type: ['Water', 'Ground'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 1.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 48, def: 43, spatk: 46, spdef: 41, spd: 60 },
		available_abilities: [
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Anticipation', is_hidden: false },
			{ name: 'Hydration', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '339.png',
		shiny_image_file: '339-shiny.png',
		emoji: '<:339:1419642604856807454>',
		shiny_emoji: '',
		evolution: [{ to: 'Whiscash', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 340,
		name: 'Whiscash',
		description: 'It is very territorial. It repels foes by setting off tremors that extend over a three-mile radius.',
		type: ['Water', 'Ground'],
		tier: 'Rare',
		appearance: { height: 0.9, weight: 23.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 110, atk: 78, def: 73, spatk: 76, spdef: 71, spd: 60 },
		available_abilities: [
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Anticipation', is_hidden: false },
			{ name: 'Hydration', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '340.png',
		shiny_image_file: '340-shiny.png',
		emoji: '<:340:1419642615128915968>',
		shiny_emoji: ''
	},
	{
		dex_id: 341,
		name: 'Corphish',
		description: 'It was originally a Cokemon from another region. It is a tough Cokemon that can adapt to any environment.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 11.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 43, atk: 80, def: 65, spatk: 50, spdef: 35, spd: 35 },
		available_abilities: [
			{ name: 'Hyper Cutter', is_hidden: false },
			{ name: 'Shell Armor', is_hidden: false },
			{ name: 'Adaptability', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '341.png',
		shiny_image_file: '341-shiny.png',
		emoji: '<:341:1419642635479547955>',
		shiny_emoji: '',
		evolution: [{ to: 'Crawdaunt', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 342,
		name: 'Crawdaunt',
		description: 'A brutish Cokemon that loves to battle. It will not stop beating at a foe, even if it is knocked out.',
		type: ['Water', 'Dark'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 32.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 63, atk: 120, def: 85, spatk: 90, spdef: 55, spd: 55 },
		available_abilities: [
			{ name: 'Hyper Cutter', is_hidden: false },
			{ name: 'Shell Armor', is_hidden: false },
			{ name: 'Adaptability', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '342.png',
		shiny_image_file: '342-shiny.png',
		emoji: '<:342:1419642648200740916>',
		shiny_emoji: ''
	},
	{
		dex_id: 343,
		name: 'Baltoy',
		description: 'It moves by spinning on its single foot. It is a rare Cokemon that was discovered in ancient ruins.',
		type: ['Ground', 'Psychic'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 21.5 },
		available_genders: ['Genderless'],
		base_stats: { hp: 40, atk: 40, def: 55, spatk: 40, spdef: 70, spd: 55 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '343.png',
		shiny_image_file: '343-shiny.png',
		emoji: '<:343:1419642660276142141>',
		shiny_emoji: '',
		evolution: [{ to: 'Claydol', conditions: [{ type: 'level_up', value: 36 }] }]
	},
	{
		dex_id: 344,
		name: 'Claydol',
		description: 'An ancient clay figurine that came to life as a Cokemon through exposure to a mysterious ray.',
		type: ['Ground', 'Psychic'],
		tier: 'Rare',
		appearance: { height: 1.5, weight: 108.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 60, atk: 70, def: 105, spatk: 70, spdef: 120, spd: 75 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '344.png',
		shiny_image_file: '344-shiny.png',
		emoji: '<:344:1419642670862565487>',
		shiny_emoji: ''
	},
	{
		dex_id: 345,
		name: 'Lileep',
		description: 'It lived on the seafloor 100 million years ago. It captures prey with its tentacles.',
		type: ['Rock', 'Grass'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 23.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 66, atk: 41, def: 77, spatk: 61, spdef: 87, spd: 23 },
		available_abilities: [
			{ name: 'Suction Cups', is_hidden: false },
			{ name: 'Storm Drain', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '345.png',
		shiny_image_file: '345-shiny.png',
		emoji: '<:345:1419642682384584724>',
		shiny_emoji: '',
		evolution: [{ to: 'Cradily', conditions: [{ type: 'level_up', value: 40 }] }]
	},
	{
		dex_id: 346,
		name: 'Cradily',
		description: 'It lives in the shallows of warm seas. When the tide goes out, it digs up prey from the seafloor.',
		type: ['Rock', 'Grass'],
		tier: 'Epic',
		appearance: { height: 1.5, weight: 60.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 86, atk: 81, def: 97, spatk: 81, spdef: 107, spd: 43 },
		available_abilities: [
			{ name: 'Suction Cups', is_hidden: false },
			{ name: 'Storm Drain', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '346.png',
		shiny_image_file: '346-shiny.png',
		emoji: '<:346:1419642692459298877>',
		shiny_emoji: ''
	},
	{
		dex_id: 347,
		name: 'Anorith',
		description: 'A Cokemon that was regenerated from a fossil. It lived in the sea and hunted with its two claws.',
		type: ['Rock', 'Bug'],
		tier: 'Rare',
		appearance: { height: 0.7, weight: 12.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 95, def: 50, spatk: 40, spdef: 50, spd: 75 },
		available_abilities: [
			{ name: 'Battle Armor', is_hidden: false },
			{ name: 'Swift Swim', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '347.png',
		shiny_image_file: '347-shiny.png',
		emoji: '<:347:1419642706564747334>',
		shiny_emoji: '',
		evolution: [{ to: 'Armaldo', conditions: [{ type: 'level_up', value: 40 }] }]
	},
	{
		dex_id: 348,
		name: 'Armaldo',
		description: 'It went ashore after its entire body became encased in a hard armor. It swims using its two wings.',
		type: ['Rock', 'Bug'],
		tier: 'Epic',
		appearance: { height: 1.5, weight: 68.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 125, def: 100, spatk: 70, spdef: 80, spd: 45 },
		available_abilities: [
			{ name: 'Battle Armor', is_hidden: false },
			{ name: 'Swift Swim', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '348.png',
		shiny_image_file: '348-shiny.png',
		emoji: '<:348:1419642727301382227>',
		shiny_emoji: ''
	},
	{
		dex_id: 349,
		name: 'Feebas',
		description: 'It is a shabby and ugly Cokemon. However, it is very hardy and can survive on little water.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 7.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 20, atk: 15, def: 20, spatk: 10, spdef: 55, spd: 80 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Adaptability', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.1,
		image_file: '349.png',
		shiny_image_file: '349-shiny.png',
		emoji: '<:349:1419642740861571214>',
		shiny_emoji: '',
		evolution: [{ to: 'Milotic', conditions: [{ type: 'trade_item', value: 'prism-scale' }] }]
	},
	{
		dex_id: 350,
		name: 'Milotic',
		description: 'It is said to be the most beautiful of all Cokemon. It has the power to becalm such emotions as anger and hostility to quell bitter feuding.',
		type: ['Water'],
		tier: 'Epic',
		appearance: { height: 6.2, weight: 162.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 95, atk: 60, def: 79, spatk: 100, spdef: 125, spd: 81 },
		available_abilities: [
			{ name: 'Marvel Scale', is_hidden: false },
			{ name: 'Cute Charm', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '350.png',
		shiny_image_file: '350-shiny.png',
		emoji: '<:350:1419642752639176865>',
		shiny_emoji: ''
	},
	{
		dex_id: 351,
		name: 'Castform',
		description: 'Its appearance changes with the weather. It was created by the Weather Institute.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 0.3, weight: 0.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 70, def: 70, spatk: 70, spdef: 70, spd: 70 },
		available_abilities: [
			{ name: 'Forecast', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '351.png',
		shiny_image_file: '351-shiny.png',
		emoji: '<:351:1419642765532201030>',
		shiny_emoji: ''
	},
	{
		dex_id: 352,
		name: 'Kecleon',
		description: 'It can freely change its body’s color. The zigzag pattern on its belly is the only part that remains the same.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 22.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 90, def: 70, spatk: 60, spdef: 120, spd: 40 },
		available_abilities: [
			{ name: 'Color Change', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '352.png',
		shiny_image_file: '352-shiny.png',
		emoji: '<:352:1419642777096032276>',
		shiny_emoji: ''
	},
	{
		dex_id: 353,
		name: 'Shuppet',
		description: 'It loves to feed on feelings of jealousy and vengeance. It will appear in a swarm among the roofs of houses where vengeful people live.',
		type: ['Ghost'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 2.3 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 44, atk: 75, def: 35, spatk: 63, spdef: 33, spd: 45 },
		available_abilities: [
			{ name: 'Insomnia', is_hidden: false },
			{ name: 'Frisk', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '353.png',
		shiny_image_file: '353-shiny.png',
		emoji: '<:353:1419642792866746378>',
		shiny_emoji: '',
		evolution: [{ to: 'Banette', conditions: [{ type: 'level_up', value: 37 }] }]
	},
	{
		dex_id: 354,
		name: 'Banette',
		description: 'A doll that became a Cokemon over its grudge from being junked. It seeks the child that disowned it.',
		type: ['Ghost'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 12.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 64, atk: 115, def: 65, spatk: 83, spdef: 63, spd: 65 },
		available_abilities: [
			{ name: 'Insomnia', is_hidden: false },
			{ name: 'Frisk', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '354.png',
		shiny_image_file: '354-shiny.png',
		emoji: '<:354:1419642804941885573>',
		shiny_emoji: ''
	},
	{
		dex_id: 355,
		name: 'Duskull',
		description: 'It loves the crying of children. It startles bad kids by passing through walls and making them cry.',
		type: ['Ghost'],
		tier: 'Common',
		appearance: { height: 0.8, weight: 15.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 20, atk: 40, def: 90, spatk: 30, spdef: 90, spd: 25 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false },
			{ name: 'Frisk', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '355.png',
		shiny_image_file: '355-shiny.png',
		emoji: '<:355:1419642816279351377>',
		shiny_emoji: '',
		evolution: [{ to: 'Dusclops', conditions: [{ type: 'level_up', value: 37 }] }]
	},
	{
		dex_id: 356,
		name: 'Dusclops',
		description: 'Its body is hollow. It is said that those who look into its body are sucked into the void.',
		type: ['Ghost'],
		tier: 'Rare',
		appearance: { height: 1.6, weight: 30.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 70, def: 130, spatk: 60, spdef: 130, spd: 25 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false },
			{ name: 'Frisk', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '356.png',
		shiny_image_file: '356-shiny.png',
		emoji: '<:356:1419642826131636331>',
		shiny_emoji: '',
		evolution: [{ to: 'Dusknoir', conditions: [{ type: 'trade_item', value: 'reaper-cloth' }] }]
	},
	{
		dex_id: 357,
		name: 'Tropius',
		description: 'It flies by flapping its broad leaves. The bunch of fruit that grows around its neck is deliciously sweet.',
		type: ['Grass', 'Flying'],
		tier: 'Rare',
		appearance: { height: 2.0, weight: 100.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 99, atk: 68, def: 83, spatk: 72, spdef: 87, spd: 51 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Solar Power', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '357.png',
		shiny_image_file: '357-shiny.png',
		emoji: '<:357:1419642837808447513>',
		shiny_emoji: ''
	},
	{
		dex_id: 358,
		name: 'Chimecho',
		description: 'It uses the sucker on its head to hang from a tree or from eaves. It can produce seven different tones.',
		type: ['Psychic'],
		tier: 'Rare',
		appearance: { height: 0.6, weight: 1.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 50, def: 80, spatk: 95, spdef: 90, spd: 65 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '358.png',
		shiny_image_file: '358-shiny.png',
		emoji: '<:358:1419642848508116992>',
		shiny_emoji: ''
	},
	{
		dex_id: 359,
		name: 'Absol',
		description: 'It senses coming disasters and appears before people only to warn them of impending danger.',
		type: ['Dark'],
		tier: 'Epic',
		appearance: { height: 1.2, weight: 47.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 130, def: 60, spatk: 75, spdef: 60, spd: 75 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false },
			{ name: 'Super Luck', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '359.png',
		shiny_image_file: '359-shiny.png',
		emoji: '<:359:1419642860533317764>',
		shiny_emoji: ''
	},
	{
		dex_id: 360,
		name: 'Wynaut',
		description: 'It tends to move in a pack with others. They prefer dark places and will huddle together in a cave.',
		type: ['Psychic'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 14.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 95, atk: 23, def: 48, spatk: 23, spdef: 48, spd: 23 },
		available_abilities: [
			{ name: 'Shadow Tag', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '360.png',
		shiny_image_file: '360-shiny.png',
		emoji: '<:360:1419642872680022016>',
		shiny_emoji: '',
		evolution: [{ to: 'Wobbuffet', conditions: [{ type: 'level_up', value: 15 }] }]
	},
	{
		dex_id: 361,
		name: 'Snorunt',
		description: 'It is said that a home visited by a Snorunt will prosper. It can withstand cold of -150 degrees Fahrenheit.',
		type: ['Ice'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 16.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 50, def: 50, spatk: 50, spdef: 50, spd: 50 },
		available_abilities: [
			{ name: 'Inner Focus', is_hidden: false },
			{ name: 'Ice Body', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '361.png',
		shiny_image_file: '361-shiny.png',
		emoji: '<:361:1419642887028740136>',
		shiny_emoji: '',
		evolution: [
			{ to: 'Glalie', conditions: [{ type: 'level_up', value: 42 }] },
			{ to: 'Froslass', conditions: [{ type: 'item', value: 'dawn-stone' }, { type: 'gender', value: 'Female' }] }
		]
	},
	{
		dex_id: 362,
		name: 'Glalie',
		description: 'It has a body of ice that won’t melt, even with fire. It can instantly freeze moisture in the atmosphere.',
		type: ['Ice'],
		tier: 'Rare',
		appearance: { height: 1.5, weight: 256.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 80, def: 80, spatk: 80, spdef: 80, spd: 80 },
		available_abilities: [
			{ name: 'Inner Focus', is_hidden: false },
			{ name: 'Ice Body', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '362.png',
		shiny_image_file: '362-shiny.png',
		emoji: '<:362:1419642900769144852>',
		shiny_emoji: ''
	},
	{
		dex_id: 363,
		name: 'Spheal',
		description: 'It is completely covered with plushy fur. As a result, it never feels the cold even when it is rolling about on ice floes.',
		type: ['Ice', 'Water'],
		tier: 'Common',
		appearance: { height: 0.8, weight: 39.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 40, def: 50, spatk: 55, spdef: 50, spd: 25 },
		available_abilities: [
			{ name: 'Thick Fat', is_hidden: false },
			{ name: 'Ice Body', is_hidden: false },
			{ name: 'Oblivious', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '363.png',
		shiny_image_file: '363-shiny.png',
		emoji: '<:363:1419642914543505568>',
		shiny_emoji: '',
		evolution: [{ to: 'Sealeo', conditions: [{ type: 'level_up', value: 32 }] }]
	},
	{
		dex_id: 364,
		name: 'Sealeo',
		description: 'It has a habit of spinning things it finds on the tip of its nose. It is skilled at searching for prey in the sea.',
		type: ['Ice', 'Water'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 87.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 60, def: 70, spatk: 75, spdef: 70, spd: 45 },
		available_abilities: [
			{ name: 'Thick Fat', is_hidden: false },
			{ name: 'Ice Body', is_hidden: false },
			{ name: 'Oblivious', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '364.png',
		shiny_image_file: '364-shiny.png',
		emoji: '<:364:1419642931102355578>',
		shiny_emoji: '',
		evolution: [{ to: 'Walrein', conditions: [{ type: 'level_up', value: 44 }] }]
	},
	{
		dex_id: 365,
		name: 'Walrein',
		description: 'It shatters ice with its big tusks. Its thick blubber repels not only the cold, but also enemy attacks.',
		type: ['Ice', 'Water'],
		tier: 'Epic',
		appearance: { height: 1.4, weight: 150.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 110, atk: 80, def: 90, spatk: 95, spdef: 90, spd: 65 },
		available_abilities: [
			{ name: 'Thick Fat', is_hidden: false },
			{ name: 'Ice Body', is_hidden: false },
			{ name: 'Oblivious', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '365.png',
		shiny_image_file: '365-shiny.png',
		emoji: '<:365:1419642948945055785>',
		shiny_emoji: ''
	},
	{
		dex_id: 366,
		name: 'Clamperl',
		description: 'It is protected by a sturdy shell. Once it grows, it will leave the shell and find a new home.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 52.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 35, atk: 64, def: 85, spatk: 74, spdef: 55, spd: 32 },
		available_abilities: [
			{ name: 'Shell Armor', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.1,
		image_file: '366.png',
		shiny_image_file: '366-shiny.png',
		emoji: '<:366:1419642963360878632>',
		shiny_emoji: '',
		evolution: [
			{ to: 'Huntail', conditions: [{ type: 'trade_item', value: 'deep-sea-tooth' }] },
			{ to: 'Gorebyss', conditions: [{ type: 'trade_item', value: 'deep-sea-scale' }] }
		]
	},
	{
		dex_id: 367,
		name: 'Huntail',
		description: 'It lives deep in the sea. It attracts prey with its fish-shaped tail, then swallows the prey whole with its large mouth.',
		type: ['Water'],
		tier: 'Rare',
		appearance: { height: 1.7, weight: 27.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 104, def: 105, spatk: 94, spdef: 75, spd: 52 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Water Veil', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '367.png',
		shiny_image_file: '367-shiny.png',
		emoji: '<:367:1419642982969249893>',
		shiny_emoji: ''
	},
	{
		dex_id: 368,
		name: 'Gorebyss',
		description: 'Its thin body is built to withstand high water pressure. It lives in the deep sea.',
		type: ['Water'],
		tier: 'Rare',
		appearance: { height: 1.8, weight: 22.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 84, def: 105, spatk: 114, spdef: 75, spd: 52 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Hydration', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '368.png',
		shiny_image_file: '368-shiny.png',
		emoji: '<:368:1419642997473153045>',
		shiny_emoji: ''
	},
	{
		dex_id: 369,
		name: 'Relicanth',
		description: 'A Cokemon that was discovered in a deep-sea exploration. It has not changed its form in 100 million years.',
		type: ['Water', 'Rock'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 23.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 100, atk: 90, def: 130, spatk: 45, spdef: 65, spd: 55 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Rock Head', is_hidden: false },
			{ name: 'Sturdy', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '369.png',
		shiny_image_file: '369-shiny.png',
		emoji: '<:369:1419643009544491100>',
		shiny_emoji: ''
	},
	{
		dex_id: 370,
		name: 'Luvdisc',
		description: 'It lives in warm seas. It is said that a couple finding this Cokemon will be blessed with eternal love.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 8.7 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 43, atk: 30, def: 55, spatk: 40, spdef: 65, spd: 97 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Hydration', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '370.png',
		shiny_image_file: '370-shiny.png',
		emoji: '<:370:1419643018595795034>',
		shiny_emoji: ''
	},
	{
		dex_id: 371,
		name: 'Bagon',
		description: 'Its well-developed neck muscles and iron-hard head can smash any boulder to bits.',
		type: ['Dragon'],
		tier: 'Rare',
		appearance: { height: 0.6, weight: 42.1 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 75, def: 60, spatk: 40, spdef: 30, spd: 50 },
		available_abilities: [
			{ name: 'Rock Head', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '371.png',
		shiny_image_file: '371-shiny.png',
		emoji: '<:371:1419643031568650301>',
		shiny_emoji: '',
		evolution: [{ to: 'Shelgon', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 372,
		name: 'Shelgon',
		description: 'Within its rugged shell, its cells have begun changing. The shell peels off the instant it evolves.',
		type: ['Dragon'],
		tier: 'Epic',
		appearance: { height: 1.1, weight: 110.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 95, def: 100, spatk: 60, spdef: 50, spd: 50 },
		available_abilities: [
			{ name: 'Rock Head', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '372.png',
		shiny_image_file: '372-shiny.png',
		emoji: '<:372:1419643045179031615>',
		shiny_emoji: '',
		evolution: [{ to: 'Salamence', conditions: [{ type: 'level_up', value: 50 }] }]
	},
	{
		dex_id: 373,
		name: 'Salamence',
		description: 'It becomes uncontrollable if it is enraged. It destroys everything with shredding claws and fire.',
		type: ['Dragon', 'Flying'],
		tier: 'Ancient',
		appearance: { height: 1.5, weight: 102.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 95, atk: 135, def: 80, spatk: 110, spdef: 80, spd: 100 },
		available_abilities: [
			{ name: 'Intimidate', is_hidden: false }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '373.png',
		shiny_image_file: '373-shiny.png',
		emoji: '<:373:1419643058303144051>',
		shiny_emoji: ''
	},
	{
		dex_id: 374,
		name: 'Beldum',
		description: 'It converses with others by using magnetic pulses. In a swarm, they move in perfect unison.',
		type: ['Steel', 'Psychic'],
		tier: 'Rare',
		appearance: { height: 0.6, weight: 95.2 },
		available_genders: ['Genderless'],
		base_stats: { hp: 40, atk: 55, def: 80, spatk: 35, spdef: 60, spd: 30 },
		available_abilities: [
			{ name: 'Clear Body', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '374.png',
		shiny_image_file: '374-shiny.png',
		emoji: '<:374:1419643070710022225>',
		shiny_emoji: '',
		evolution: [{ to: 'Metang', conditions: [{ type: 'level_up', value: 20 }] }]
	},
	{
		dex_id: 375,
		name: 'Metang',
		description: 'It is formed by two Beldum joining together. Its steel body won’t be scratched if it collides with a jet.',
		type: ['Steel', 'Psychic'],
		tier: 'Epic',
		appearance: { height: 1.2, weight: 202.5 },
		available_genders: ['Genderless'],
		base_stats: { hp: 60, atk: 75, def: 100, spatk: 55, spdef: 80, spd: 50 },
		available_abilities: [
			{ name: 'Clear Body', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '375.png',
		shiny_image_file: '375-shiny.png',
		emoji: '<:375:1419643081614950411>',
		shiny_emoji: '',
		evolution: [{ to: 'Metagross', conditions: [{ type: 'level_up', value: 45 }] }]
	},
	{
		dex_id: 376,
		name: 'Metagross',
		description: 'It has four brains in total. Combined, the four brains can breeze through difficult calculations faster than a supercomputer.',
		type: ['Steel', 'Psychic'],
		tier: 'Ancient',
		appearance: { height: 1.6, weight: 550.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 80, atk: 135, def: 130, spatk: 95, spdef: 90, spd: 70 },
		available_abilities: [
			{ name: 'Clear Body', is_hidden: false }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '376.png',
		shiny_image_file: '376-shiny.png',
		emoji: '<:376:1419643097259704351>',
		shiny_emoji: ''
	},
	{
		dex_id: 377,
		name: 'Regirock',
		description: 'The rocks that form its body have been found in geological strata from all over the world.',
		type: ['Rock'],
		tier: 'Legendary',
		appearance: { height: 1.7, weight: 230.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 80, atk: 100, def: 200, spatk: 50, spdef: 100, spd: 50 },
		available_abilities: [
			{ name: 'Clear Body', is_hidden: false },
			{ name: 'Sturdy', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '377.png',
		shiny_image_file: '377-shiny.png',
		emoji: '<:377:1419643107712172074>',
		shiny_emoji: ''
	},
	{
		dex_id: 378,
		name: 'Regice',
		description: 'Its body is made of ice from the ice age. It controls frigid air of -328 degrees Fahrenheit.',
		type: ['Ice'],
		tier: 'Legendary',
		appearance: { height: 1.8, weight: 175.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 80, atk: 50, def: 100, spatk: 100, spdef: 200, spd: 50 },
		available_abilities: [
			{ name: 'Clear Body', is_hidden: false },
			{ name: 'Ice Body', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '378.png',
		shiny_image_file: '378-shiny.png',
		emoji: '<:378:1419643119422668892>',
		shiny_emoji: ''
	},
	{
		dex_id: 379,
		name: 'Registeel',
		description: 'Its body is harder than any other kind of metal. It is a mystery what it eats.',
		type: ['Steel'],
		tier: 'Legendary',
		appearance: { height: 1.9, weight: 205.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 80, atk: 75, def: 150, spatk: 75, spdef: 150, spd: 50 },
		available_abilities: [
			{ name: 'Clear Body', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '379.png',
		shiny_image_file: '379-shiny.png',
		emoji: '<:379:1419643129849577502>',
		shiny_emoji: ''
	},
	{
		dex_id: 380,
		name: 'Latias',
		description: 'Its body is covered with a down that can refract light in such a way that it becomes invisible.',
		type: ['Dragon', 'Psychic'],
		tier: 'Legendary',
		appearance: { height: 1.4, weight: 40.0 },
		available_genders: ['Female'],
		base_stats: { hp: 80, atk: 80, def: 90, spatk: 110, spdef: 130, spd: 110 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '380.png',
		shiny_image_file: '380-shiny.png',
		emoji: '<:380:1419643142314918020>',
		shiny_emoji: ''
	},
	{
		dex_id: 381,
		name: 'Latios',
		description: 'A highly intelligent Cokemon. By folding back its wings in flight, it can overtake jet planes.',
		type: ['Dragon', 'Psychic'],
		tier: 'Legendary',
		appearance: { height: 2.0, weight: 60.0 },
		available_genders: ['Male'],
		base_stats: { hp: 80, atk: 90, def: 80, spatk: 130, spdef: 110, spd: 110 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '381.png',
		shiny_image_file: '381-shiny.png',
		emoji: '<:381:1419643157083193394>',
		shiny_emoji: ''
	},
	{
		dex_id: 382,
		name: 'Kyogre',
		description: 'A mythical Cokemon said to have swelled the seas with rain and tidal waves. It battled with Groudon.',
		type: ['Water'],
		tier: 'Legendary',
		appearance: { height: 4.5, weight: 352.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 100, atk: 100, def: 90, spatk: 150, spdef: 140, spd: 90 },
		available_abilities: [
			{ name: 'Drizzle', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '382.png',
		shiny_image_file: '382-shiny.png',
		emoji: '<:382:1419643169473040495>',
		shiny_emoji: ''
	},
	{
		dex_id: 383,
		name: 'Groudon',
		description: 'This legendary Cokemon is said to represent the land. It went to sleep after dueling Kyogre.',
		type: ['Ground'],
		tier: 'Legendary',
		appearance: { height: 3.5, weight: 950.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 100, atk: 150, def: 140, spatk: 100, spdef: 90, spd: 90 },
		available_abilities: [
			{ name: 'Drought', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '383.png',
		shiny_image_file: '383-shiny.png',
		emoji: '<:383:1419643184182722560>',
		shiny_emoji: ''
	},
	{
		dex_id: 384,
		name: 'Rayquaza',
		description: 'It lives in the ozone layer far above the clouds and cannot be seen from the ground.',
		type: ['Dragon', 'Flying'],
		tier: 'Legendary',
		appearance: { height: 7.0, weight: 206.5 },
		available_genders: ['Genderless'],
		base_stats: { hp: 105, atk: 150, def: 90, spatk: 150, spdef: 90, spd: 95 },
		available_abilities: [
			{ name: 'Air Lock', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '384.png',
		shiny_image_file: '384-shiny.png',
		emoji: '<:384:1419643197189263421>',
		shiny_emoji: ''
	},
	{
		dex_id: 385,
		name: 'Jirachi',
		description: 'It is said to have the ability to grant any wish for just one week every thousand years.',
		type: ['Steel', 'Psychic'],
		tier: 'Mythical',
		appearance: { height: 0.3, weight: 1.1 },
		available_genders: ['Genderless'],
		base_stats: { hp: 100, atk: 100, def: 100, spatk: 100, spdef: 100, spd: 100 },
		available_abilities: [
			{ name: 'Serene Grace', is_hidden: false }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '385.png',
		shiny_image_file: '385-shiny.png',
		emoji: '<:385:1419643212221513848>',
		shiny_emoji: ''
	},
	{
		dex_id: 386,
		name: 'Deoxys',
		description: 'An alien virus that fell to earth on a meteor underwent a DNA mutation to become this Cokemon.',
		type: ['Psychic'],
		tier: 'Mythical',
		appearance: { height: 1.7, weight: 60.8 },
		available_genders: ['Genderless'],
		base_stats: { hp: 50, atk: 150, def: 50, spatk: 150, spdef: 50, spd: 150 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '386.png',
		shiny_image_file: '386-shiny.png',
		emoji: '<:386:1419643224623939725>',
		shiny_emoji: ''
	},
	{
		dex_id: 387,
		name: 'Turtwig',
		description: 'It undertakes photosynthesis with its body, making oxygen. The leaf on its head wilts if it is thirsty.',
		type: ['Grass'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 10.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 68, def: 64, spatk: 45, spdef: 55, spd: 31 },
		available_abilities: [
			{ name: 'Overgrow', is_hidden: false },
			{ name: 'Shell Armor', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '387.png',
		shiny_image_file: '387-shiny.png',
		emoji: '<:387:1435842418443288586>',
		shiny_emoji: '',
		evolution: [{ to: 'Grotle', conditions: [{ type: 'level_up', value: 18 }] }]
	},
	{
		dex_id: 388,
		name: 'Grotle',
		description: 'It knows where pure water wells up. It carries fellow Cokemon there on its back.',
		type: ['Grass'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 97.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 89, def: 85, spatk: 55, spdef: 65, spd: 36 },
		available_abilities: [
			{ name: 'Overgrow', is_hidden: false },
			{ name: 'Shell Armor', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '388.png',
		shiny_image_file: '388-shiny.png',
		emoji: '<:388:1435842414899367976>',
		shiny_emoji: '',
		evolution: [{ to: 'Torterra', conditions: [{ type: 'level_up', value: 32 }] }]
	},
	{
		dex_id: 389,
		name: 'Torterra',
		description: 'Small Cokemon occasionally gather on its unmoving back to begin building their nests.',
		type: ['Grass', 'Ground'],
		tier: 'Epic',
		appearance: { height: 2.2, weight: 310.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 95, atk: 109, def: 105, spatk: 75, spdef: 85, spd: 56 },
		available_abilities: [
			{ name: 'Overgrow', is_hidden: false },
			{ name: 'Shell Armor', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '389.png',
		shiny_image_file: '389-shiny.png',
		emoji: '<:389:1435842412936429578>',
		shiny_emoji: ''
	},
	{
		dex_id: 390,
		name: 'Chimchar',
		description: 'Its fiery rear end is fueled by gas made in its belly. Even rain can’t extinguish the fire.',
		type: ['Fire'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 6.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 44, atk: 58, def: 44, spatk: 58, spdef: 44, spd: 61 },
		available_abilities: [
			{ name: 'Blaze', is_hidden: false },
			{ name: 'Iron Fist', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '390.png',
		shiny_image_file: '390-shiny.png',
		emoji: '<:390:1435842410621042739>',
		shiny_emoji: '',
		evolution: [{ to: 'Monferno', conditions: [{ type: 'level_up', value: 14 }] }]
	},
	{
		dex_id: 391,
		name: 'Monferno',
		description: 'It uses ceilings and walls to launch aerial attacks. Its fiery tail is but one of its weapons.',
		type: ['Fire', 'Fighting'],
		tier: 'Rare',
		appearance: { height: 0.9, weight: 22.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 64, atk: 78, def: 52, spatk: 78, spdef: 52, spd: 81 },
		available_abilities: [
			{ name: 'Blaze', is_hidden: false },
			{ name: 'Iron Fist', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '391.png',
		shiny_image_file: '391-shiny.png',
		emoji: '<:391:1435842408318373909>',
		shiny_emoji: '',
		evolution: [{ to: 'Infernape', conditions: [{ type: 'level_up', value: 36 }] }]
	},
	{
		dex_id: 392,
		name: 'Infernape',
		description: 'It uses a special kind of martial art involving all its limbs. Its fire never goes out.',
		type: ['Fire', 'Fighting'],
		tier: 'Epic',
		appearance: { height: 1.2, weight: 55.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 76, atk: 104, def: 71, spatk: 104, spdef: 71, spd: 108 },
		available_abilities: [
			{ name: 'Blaze', is_hidden: false },
			{ name: 'Iron Fist', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '392.png',
		shiny_image_file: '392-shiny.png',
		emoji: '<:392:1435842406124753036>',
		shiny_emoji: ''
	},
	{
		dex_id: 393,
		name: 'Piplup',
		description: 'A poor walker, it often falls down. However, its strong pride makes it puff up its chest without a care.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 5.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 53, atk: 51, def: 53, spatk: 61, spdef: 56, spd: 40 },
		available_abilities: [
			{ name: 'Torrent', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '393.png',
		shiny_image_file: '393-shiny.png',
		emoji: '<:393:1435842403905830932>',
		shiny_emoji: '',
		evolution: [{ to: 'Prinplup', conditions: [{ type: 'level_up', value: 16 }] }]
	},
	{
		dex_id: 394,
		name: 'Prinplup',
		description: 'It lives alone, away from others. Apparently, every one of them believes it is the most important.',
		type: ['Water'],
		tier: 'Rare',
		appearance: { height: 0.8, weight: 23.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 64, atk: 66, def: 68, spatk: 81, spdef: 76, spd: 50 },
		available_abilities: [
			{ name: 'Torrent', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '394.png',
		shiny_image_file: '394-shiny.png',
		emoji: '<:394:1435842401821265990>',
		shiny_emoji: '',
		evolution: [{ to: 'Empoleon', conditions: [{ type: 'level_up', value: 36 }] }]
	},
	{
		dex_id: 395,
		name: 'Empoleon',
		description: 'The three horns that extend from its beak attest to its power. The leader has the biggest horns.',
		type: ['Water', 'Steel'],
		tier: 'Epic',
		appearance: { height: 1.7, weight: 84.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 84, atk: 86, def: 88, spatk: 111, spdef: 101, spd: 60 },
		available_abilities: [
			{ name: 'Torrent', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '395.png',
		shiny_image_file: '395-shiny.png',
		emoji: '<:395:1435842399506137128>',
		shiny_emoji: ''
	},
	{
		dex_id: 396,
		name: 'Starly',
		description: 'They flock in great numbers. Though small, they flap their wings with great power.',
		type: ['Normal', 'Flying'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 2.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 55, def: 30, spatk: 30, spdef: 30, spd: 60 },
		available_abilities: [
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Reckless', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '396.png',
		shiny_image_file: '396-shiny.png',
		emoji: '<:396:1435842397329166447>',
		shiny_emoji: '',
		evolution: [{ to: 'Staravia', conditions: [{ type: 'level_up', value: 14 }] }]
	},
	{
		dex_id: 397,
		name: 'Staravia',
		description: 'They fly in search of bug Cokemon. They live in noisy flocks of many individuals.',
		type: ['Normal', 'Flying'],
		tier: 'Rare',
		appearance: { height: 0.6, weight: 15.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 75, def: 50, spatk: 40, spdef: 40, spd: 80 },
		available_abilities: [
			{ name: 'Intimidate', is_hidden: false },
			{ name: 'Reckless', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '397.png',
		shiny_image_file: '397-shiny.png',
		emoji: '<:397:1435842395332804658>',
		shiny_emoji: '',
		evolution: [{ to: 'Staraptor', conditions: [{ type: 'level_up', value: 34 }] }]
	},
	{
		dex_id: 398,
		name: 'Staraptor',
		description: 'It has a savage nature. It will courageously challenge foes that are much larger.',
		type: ['Normal', 'Flying'],
		tier: 'Epic',
		appearance: { height: 1.2, weight: 24.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 85, atk: 120, def: 70, spatk: 50, spdef: 60, spd: 100 },
		available_abilities: [
			{ name: 'Intimidate', is_hidden: false },
			{ name: 'Reckless', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '398.png',
		shiny_image_file: '398-shiny.png',
		emoji: '<:398:1435842393109692478>',
		shiny_emoji: ''
	},
	{
		dex_id: 399,
		name: 'Bidoof',
		description: 'With nerves of steel, nothing can perturb it. It is more agile and active than it appears.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 20.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 59, atk: 45, def: 40, spatk: 35, spdef: 40, spd: 31 },
		available_abilities: [
			{ name: 'Simple', is_hidden: false },
			{ name: 'Unaware', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '399.png',
		shiny_image_file: '399-shiny.png',
		emoji: '<:399:1435842390278672434>',
		shiny_emoji: '',
		evolution: [{ to: 'Bibarel', conditions: [{ type: 'level_up', value: 15 }] }]
	},
	{
		dex_id: 400,
		name: 'Bibarel',
		description: 'It makes its nest by damming streams with bark and mud. It is known as an industrious worker.',
		type: ['Normal', 'Water'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 31.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 79, atk: 85, def: 60, spatk: 55, spdef: 60, spd: 71 },
		available_abilities: [
			{ name: 'Simple', is_hidden: false },
			{ name: 'Unaware', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '400.png',
		shiny_image_file: '400-shiny.png',
		emoji: '<:400:1435842387745181766>',
		shiny_emoji: ''
	},
	{
		dex_id: 401,
		name: 'Kricketot',
		description: 'It chats with others using the sound of its colliding antennae. These sounds are fall hallmarks.',
		type: ['Bug'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 2.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 37, atk: 25, def: 41, spatk: 25, spdef: 41, spd: 25 },
		available_abilities: [
			{ name: 'Shed Skin', is_hidden: false },
			{ name: 'Run Away', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '401.png',
		shiny_image_file: '401-shiny.png',
		emoji: '<:401:1435842384700244008>',
		shiny_emoji: '',
		evolution: [{ to: 'Kricketune', conditions: [{ type: 'level_up', value: 10 }] }]
	},
	{
		dex_id: 402,
		name: 'Kricketune',
		description: 'It crosses its knifelike arms in front of its chest when it cries. It can compose melodies ad lib.',
		type: ['Bug'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 25.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 77, atk: 85, def: 51, spatk: 55, spdef: 51, spd: 65 },
		available_abilities: [
			{ name: 'Swarm', is_hidden: false },
			{ name: 'Technician', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '402.png',
		shiny_image_file: '402-shiny.png',
		emoji: '<:402:1435842382540312757>',
		shiny_emoji: ''
	},
	{
		dex_id: 403,
		name: 'Shinx',
		description: 'The extension and contraction of its muscles generates electricity. It glows when in trouble.',
		type: ['Electric'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 9.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 65, def: 34, spatk: 40, spdef: 34, spd: 45 },
		available_abilities: [
			{ name: 'Rivalry', is_hidden: false },
			{ name: 'Intimidate', is_hidden: false },
			{ name: 'Guts', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '403.png',
		shiny_image_file: '403-shiny.png',
		emoji: '<:403:1435842380111675433>',
		shiny_emoji: '',
		evolution: [{ to: 'Luxio', conditions: [{ type: 'level_up', value: 15 }] }]
	},
	{
		dex_id: 404,
		name: 'Luxio',
		description: 'Its claws loose electricity with enough amperage to cause fainting. They live in small groups.',
		type: ['Electric'],
		tier: 'Rare',
		appearance: { height: 0.9, weight: 30.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 85, def: 49, spatk: 60, spdef: 49, spd: 60 },
		available_abilities: [
			{ name: 'Rivalry', is_hidden: false },
			{ name: 'Intimidate', is_hidden: false },
			{ name: 'Guts', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '404.png',
		shiny_image_file: '404-shiny.png',
		emoji: '<:404:1435842377247100989>',
		shiny_emoji: '',
		evolution: [{ to: 'Luxray', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 405,
		name: 'Luxray',
		description: 'It has eyes that can see through anything. It spots and captures prey hiding behind objects.',
		type: ['Electric'],
		tier: 'Epic',
		appearance: { height: 1.4, weight: 42.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 80, atk: 120, def: 79, spatk: 95, spdef: 79, spd: 70 },
		available_abilities: [
			{ name: 'Rivalry', is_hidden: false },
			{ name: 'Intimidate', is_hidden: false },
			{ name: 'Guts', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '405.png',
		shiny_image_file: '405-shiny.png',
		emoji: '<:405:1435842374193381396>',
		shiny_emoji: ''
	},
	{
		dex_id: 406,
		name: 'Budew',
		description: 'It lives alongside clear ponds. It scatters pollen that induces harsh sneezing and runny noses.',
		type: ['Grass', 'Poison'],
		tier: 'Common',
		appearance: { height: 0.2, weight: 1.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 30, def: 35, spatk: 50, spdef: 70, spd: 55 },
		available_abilities: [
			{ name: 'Natural Cure', is_hidden: false },
			{ name: 'Poison Point', is_hidden: false },
			{ name: 'Leaf Guard', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '406.png',
		shiny_image_file: '406-shiny.png',
		emoji: '<:406:1435842371936976996>',
		shiny_emoji: '',
		evolution: [{ to: 'Roselia', conditions: [{ type: 'friendship', value: 220 }, { type: 'time_of_day', value: 'day' }] }]
	},
	{
		dex_id: 407,
		name: 'Roserade',
		description: 'It attracts prey with a sweet aroma, then downs it with thorny whips hidden in its arms.',
		type: ['Grass', 'Poison'],
		tier: 'Epic',
		appearance: { height: 0.9, weight: 14.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 70, def: 65, spatk: 125, spdef: 105, spd: 90 },
		available_abilities: [
			{ name: 'Natural Cure', is_hidden: false },
			{ name: 'Poison Point', is_hidden: false },
			{ name: 'Technician', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '407.png',
		shiny_image_file: '407-shiny.png',
		emoji: '<:407:1435842369558937610>',
		shiny_emoji: ''
	},
	{
		dex_id: 408,
		name: 'Cranidos',
		description: 'A lifelong head-butter, it had a skull as hard as iron. It was apparently a brute that charged everything in sight.',
		type: ['Rock'],
		tier: 'Rare',
		appearance: { height: 0.9, weight: 31.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 67, atk: 125, def: 40, spatk: 30, spdef: 30, spd: 58 },
		available_abilities: [
			{ name: 'Mold Breaker', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '408.png',
		shiny_image_file: '408-shiny.png',
		emoji: '<:408:1435842366723588116>',
		shiny_emoji: '',
		evolution: [{ to: 'Rampardos', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 409,
		name: 'Rampardos',
		description: 'Its powerful head butt has enough power to shatter even the most durable things upon impact.',
		type: ['Rock'],
		tier: 'Epic',
		appearance: { height: 1.6, weight: 102.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 97, atk: 165, def: 60, spatk: 65, spdef: 50, spd: 58 },
		available_abilities: [
			{ name: 'Mold Breaker', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '409.png',
		shiny_image_file: '409-shiny.png',
		emoji: '<:409:1435842364500606976>',
		shiny_emoji: ''
	},
	{
		dex_id: 410,
		name: 'Shieldon',
		description: 'A Cokemon that lived in jungles around 100 million years ago. Its facial hide is extremely hard.',
		type: ['Rock', 'Steel'],
		tier: 'Rare',
		appearance: { height: 0.5, weight: 57.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 30, atk: 42, def: 118, spatk: 42, spdef: 88, spd: 30 },
		available_abilities: [
			{ name: 'Sturdy', is_hidden: false },
			{ name: 'Soundproof', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '410.png',
		shiny_image_file: '410-shiny.png',
		emoji: '<:410:1435842362537414656>',
		shiny_emoji: '',
		evolution: [{ to: 'Bastiodon', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 411,
		name: 'Bastiodon',
		description: 'Any frontal attack is repulsed. It is a docile Cokemon that feeds on grass and berries.',
		type: ['Rock', 'Steel'],
		tier: 'Epic',
		appearance: { height: 1.3, weight: 149.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 52, def: 168, spatk: 47, spdef: 138, spd: 30 },
		available_abilities: [
			{ name: 'Sturdy', is_hidden: false },
			{ name: 'Soundproof', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '411.png',
		shiny_image_file: '411-shiny.png',
		emoji: '<:411:1435842352643047515>',
		shiny_emoji: ''
	},
	{
		dex_id: 412,
		name: 'Burmy',
		description: 'To protect itself from the cold wind, it uses leaves and branches to cloak its body.',
		type: ['Bug'],
		tier: 'Common',
		appearance: { height: 0.2, weight: 3.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 29, def: 45, spatk: 29, spdef: 45, spd: 36 },
		available_abilities: [
			{ name: 'Shed Skin', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '412.png',
		shiny_image_file: '412-shiny.png',
		emoji: '<:412:1435842350319403100>',
		shiny_emoji: '',
		evolution: [
			{ to: 'Wormadam', conditions: [{ type: 'level_up', value: 20 }, { type: 'gender', value: 'Female' }] },
			{ to: 'Mothim', conditions: [{ type: 'level_up', value: 20 }, { type: 'gender', value: 'Male' }] }
		]
	},
	{
		dex_id: 413,
		name: 'Wormadam',
		description: 'When the trees of its habitat wither, it will travel to a new forest on the wind.',
		type: ['Bug', 'Grass'],
		tier: 'Rare',
		appearance: { height: 0.5, weight: 6.5 },
		available_genders: ['Female'],
		base_stats: { hp: 60, atk: 59, def: 85, spatk: 79, spdef: 105, spd: 36 },
		available_abilities: [
			{ name: 'Anticipation', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '413.png',
		shiny_image_file: '413-shiny.png',
		emoji: '<:413:1435842348226445363>',
		shiny_emoji: ''
	},
	{
		dex_id: 414,
		name: 'Mothim',
		description: 'It loves the honey of flowers and steals it from Combee.',
		type: ['Bug', 'Flying'],
		tier: 'Rare',
		appearance: { height: 0.9, weight: 23.3 },
		available_genders: ['Male'],
		base_stats: { hp: 70, atk: 94, def: 50, spatk: 94, spdef: 50, spd: 66 },
		available_abilities: [
			{ name: 'Swarm', is_hidden: false },
			{ name: 'Tinted Lens', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '414.png',
		shiny_image_file: '414-shiny.png',
		emoji: '<:414:1435842343961104404>',
		shiny_emoji: ''
	},
	{
		dex_id: 415,
		name: 'Combee',
		description: 'A Cokemon formed by three others. It busily carries sweet floral honey to Vespiquen.',
		type: ['Bug', 'Flying'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 5.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 30, atk: 30, def: 42, spatk: 30, spdef: 42, spd: 70 },
		available_abilities: [
			{ name: 'Honey Gather', is_hidden: false },
			{ name: 'Hustle', is_hidden: true }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '415.png',
		shiny_image_file: '415-shiny.png',
		emoji: '<:415:1435842341435871284>',
		shiny_emoji: '',
		evolution: [{ to: 'Vespiquen', conditions: [{ type: 'level_up', value: 21 }, { type: 'gender', value: 'Female' }] }]
	},
	{
		dex_id: 416,
		name: 'Vespiquen',
		description: 'Its abdomen is a honeycomb for grubs. It raises its grubs on honey collected by Combee.',
		type: ['Bug', 'Flying'],
		tier: 'Epic',
		appearance: { height: 1.2, weight: 38.5 },
		available_genders: ['Female'],
		base_stats: { hp: 70, atk: 80, def: 102, spatk: 80, spdef: 102, spd: 40 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '416.png',
		shiny_image_file: '416-shiny.png',
		emoji: '<:416:1435842339460481086>',
		shiny_emoji: ''
	},
	{
		dex_id: 417,
		name: 'Pachirisu',
		description: 'It makes fur balls that crackle with static electricity. It stores them with berries in tree holes.',
		type: ['Electric'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 3.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 45, def: 70, spatk: 45, spdef: 90, spd: 95 },
		available_abilities: [
			{ name: 'Run Away', is_hidden: false },
			{ name: 'Pickup', is_hidden: false },
			{ name: 'Volt Absorb', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '417.png',
		shiny_image_file: '417-shiny.png',
		emoji: '<:417:1435842337195556999>',
		shiny_emoji: ''
	},
	{
		dex_id: 418,
		name: 'Buizel',
		description: 'It has a flotation sac that is like an inflatable collar. It floats on water with its head out.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 29.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 65, def: 35, spatk: 60, spdef: 30, spd: 85 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Water Veil', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '418.png',
		shiny_image_file: '418-shiny.png',
		emoji: '<:418:1435842334691561483>',
		shiny_emoji: '',
		evolution: [{ to: 'Floatzel', conditions: [{ type: 'level_up', value: 26 }] }]
	},
	{
		dex_id: 419,
		name: 'Floatzel',
		description: 'It is a common sight around fishing ports. It is known to rescue people and carry off prey.',
		type: ['Water'],
		tier: 'Rare',
		appearance: { height: 1.1, weight: 33.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 85, atk: 105, def: 55, spatk: 85, spdef: 50, spd: 115 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Water Veil', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '419.png',
		shiny_image_file: '419-shiny.png',
		emoji: '<:419:1435842332158202026>',
		shiny_emoji: ''
	},
	{
		dex_id: 420,
		name: 'Cherubi',
		description: 'The small ball holds the nutrients needed for evolution. It is very sweet and tasty.',
		type: ['Grass'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 3.3 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 35, def: 45, spatk: 62, spdef: 53, spd: 35 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.15,
		image_file: '420.png',
		shiny_image_file: '420-shiny.png',
		emoji: '<:420:1435842329570185228>',
		shiny_emoji: '',
		evolution: [{ to: 'Cherrim', conditions: [{ type: 'level_up', value: 25 }] }]
	},
	{
		dex_id: 421,
		name: 'Cherrim',
		description: 'If it senses strong sunlight, it opens its folded petals to absorb the sun’s rays with its whole body.',
		type: ['Grass'],
		tier: 'Rare',
		appearance: { height: 0.5, weight: 9.3 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 60, def: 70, spatk: 87, spdef: 78, spd: 85 },
		available_abilities: [
			{ name: 'Flower Gift', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '421.png',
		shiny_image_file: '421-shiny.png',
		emoji: '<:421:1435842327229763684>',
		shiny_emoji: ''
	},
	{
		dex_id: 422,
		name: 'Shellos',
		description: 'Its color and shapes differ from region to region. In the Sinnoh region, two types are confirmed.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.3, weight: 6.3 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 76, atk: 48, def: 48, spatk: 57, spdef: 62, spd: 34 },
		available_abilities: [
			{ name: 'Sticky Hold', is_hidden: false },
			{ name: 'Storm Drain', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '422.png',
		shiny_image_file: '422-shiny.png',
		emoji: '<:422:1435842324910309448>',
		shiny_emoji: '',
		evolution: [{ to: 'Gastrodon', conditions: [{ type: 'level_up', value: 30 }] }]
	},
	{
		dex_id: 423,
		name: 'Gastrodon',
		description: 'It has a pliable body without any bones. If any part of its body is torn off, it grows right back.',
		type: ['Water', 'Ground'],
		tier: 'Rare',
		appearance: { height: 0.9, weight: 29.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 111, atk: 83, def: 68, spatk: 92, spdef: 82, spd: 39 },
		available_abilities: [
			{ name: 'Sticky Hold', is_hidden: false },
			{ name: 'Storm Drain', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '423.png',
		shiny_image_file: '423-shiny.png',
		emoji: '<:423:1435842322205245581>',
		shiny_emoji: ''
	},
	{
		dex_id: 424,
		name: 'Ambipom',
		description: 'They work in large colonies and make rings by linking their tails, apparently in friendship.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 20.3 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 100, def: 66, spatk: 60, spdef: 66, spd: 115 },
		available_abilities: [
			{ name: 'Run Away', is_hidden: false },
			{ name: 'Pickup', is_hidden: false },
			{ name: 'Skill Link', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '424.png',
		shiny_image_file: '424-shiny.png',
		emoji: '<:424:1435842320019755150>',
		shiny_emoji: ''
	},
	{
		dex_id: 425,
		name: 'Drifloon',
		description: 'A Cokemon formed by the spirits of people and Cokemon. It loves damp, humid seasons.',
		type: ['Ghost', 'Flying'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 1.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 50, def: 34, spatk: 60, spdef: 44, spd: 70 },
		available_abilities: [
			{ name: 'Aftermath', is_hidden: false },
			{ name: 'Unburden', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '425.png',
		shiny_image_file: '425-shiny.png',
		emoji: '<:425:1435842317755089017>',
		shiny_emoji: '',
		evolution: [{ to: 'Drifblim', conditions: [{ type: 'level_up', value: 28 }] }]
	},
	{
		dex_id: 426,
		name: 'Drifblim',
		description: 'It’s drowsy in daytime, but flies off in the evening in big groups. No one knows where they go.',
		type: ['Ghost', 'Flying'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 15.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 150, atk: 80, def: 44, spatk: 90, spdef: 54, spd: 80 },
		available_abilities: [
			{ name: 'Aftermath', is_hidden: false },
			{ name: 'Unburden', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '426.png',
		shiny_image_file: '426-shiny.png',
		emoji: '<:426:1435842315657936926>',
		shiny_emoji: ''
	},
	{
		dex_id: 427,
		name: 'Buneary',
		description: 'Its ears are always rolled up. They can be forcefully extended to shatter even a large boulder.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 5.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 55, atk: 66, def: 44, spatk: 44, spdef: 56, spd: 85 },
		available_abilities: [
			{ name: 'Run Away', is_hidden: false },
			{ name: 'Klutz', is_hidden: false },
			{ name: 'Limber', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '427.png',
		shiny_image_file: '427-shiny.png',
		emoji: '<:427:1435842307847884860>',
		shiny_emoji: '',
		evolution: [{ to: 'Lopunny', conditions: [{ type: 'friendship', value: 220 }] }]
	},
	{
		dex_id: 428,
		name: 'Lopunny',
		description: 'An extremely cautious Cokemon. It cloaks its body with its fluffy ear fur when it senses danger.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 33.3 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 76, def: 84, spatk: 54, spdef: 96, spd: 105 },
		available_abilities: [
			{ name: 'Cute Charm', is_hidden: false },
			{ name: 'Klutz', is_hidden: false },
			{ name: 'Limber', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '428.png',
		shiny_image_file: '428-shiny.png',
		emoji: '<:428:1435842304907804702>',
		shiny_emoji: ''
	},
	{
		dex_id: 429,
		name: 'Mismagius',
		description: 'Its cries sound like incantations. Those hearing them are tormented by headaches and hallucinations.',
		type: ['Ghost'],
		tier: 'Epic',
		appearance: { height: 0.9, weight: 4.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 60, def: 60, spatk: 105, spdef: 105, spd: 105 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '429.png',
		shiny_image_file: '429-shiny.png',
		emoji: '<:429:1435842302764515428>',
		shiny_emoji: ''
	},
	{
		dex_id: 430,
		name: 'Honchkrow',
		description: 'It makes its Murkrow cronies bring it food. It idles its time away, grooming itself in its nest.',
		type: ['Dark', 'Flying'],
		tier: 'Epic',
		appearance: { height: 0.9, weight: 27.3 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 100, atk: 125, def: 52, spatk: 105, spdef: 52, spd: 71 },
		available_abilities: [
			{ name: 'Insomnia', is_hidden: false },
			{ name: 'Super Luck', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '430.png',
		shiny_image_file: '430-shiny.png',
		emoji: '<:430:1435842298742046750>',
		shiny_emoji: ''
	},
	{
		dex_id: 431,
		name: 'Glameow',
		description: 'It is a very fickle Cokemon, scratching for no reason at all. It is cute but hard to handle.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 3.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 49, atk: 55, def: 42, spatk: 42, spdef: 37, spd: 85 },
		available_abilities: [
			{ name: 'Limber', is_hidden: false },
			{ name: 'Own Tempo', is_hidden: false },
			{ name: 'Keen Eye', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '431.png',
		shiny_image_file: '431-shiny.png',
		emoji: '<:431:1435842295940386816>',
		shiny_emoji: '',
		evolution: [{ to: 'Purugly', conditions: [{ type: 'level_up', value: 38 }] }]
	},
	{
		dex_id: 432,
		name: 'Purugly',
		description: 'It is a brazen brute that barges its way into another Cokemon’s nest and claims it as its own.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 43.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 71, atk: 82, def: 64, spatk: 64, spdef: 59, spd: 112 },
		available_abilities: [
			{ name: 'Thick Fat', is_hidden: false },
			{ name: 'Own Tempo', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '432.png',
		shiny_image_file: '432-shiny.png',
		emoji: '<:432:1435842293864202300>',
		shiny_emoji: ''
	},
	{
		dex_id: 433,
		name: 'Chingling',
		description: 'It emits cries by agitating an orb at the back of its throat. It moves with flouncing hops.',
		type: ['Psychic'],
		tier: 'Common',
		appearance: { height: 0.2, weight: 0.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 30, def: 50, spatk: 65, spdef: 50, spd: 45 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '433.png',
		shiny_image_file: '433-shiny.png',
		emoji: '<:433:1435842291863654442>',
		shiny_emoji: '',
		evolution: [{ to: 'Chimecho', conditions: [{ type: 'friendship', value: 220 }, { type: 'time_of_day', value: 'night' }] }]
	},
	{
		dex_id: 434,
		name: 'Stunky',
		description: 'It protects itself by spraying a noxious fluid from its rear. The stench lingers for 24 hours.',
		type: ['Poison', 'Dark'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 19.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 63, atk: 63, def: 47, spatk: 41, spdef: 41, spd: 74 },
		available_abilities: [
			{ name: 'Stench', is_hidden: false },
			{ name: 'Aftermath', is_hidden: false },
			{ name: 'Keen Eye', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '434.png',
		shiny_image_file: '434-shiny.png',
		emoji: '<:434:1435842289460187166>',
		shiny_emoji: '',
		evolution: [{ to: 'Skuntank', conditions: [{ type: 'level_up', value: 34 }] }]
	},
	{
		dex_id: 435,
		name: 'Skuntank',
		description: 'It sprays a stinky fluid from its tail. The fluid smells worse the longer it is allowed to fester.',
		type: ['Poison', 'Dark'],
		tier: 'Rare',
		appearance: { height: 1.0, weight: 38.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 103, atk: 93, def: 67, spatk: 71, spdef: 61, spd: 84 },
		available_abilities: [
			{ name: 'Stench', is_hidden: false },
			{ name: 'Aftermath', is_hidden: false },
			{ name: 'Keen Eye', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '435.png',
		shiny_image_file: '435-shiny.png',
		emoji: '<:435:1435842285991366787>',
		shiny_emoji: ''
	},
	{
		dex_id: 436,
		name: 'Bronzor',
		description: 'Implements shaped like it were discovered in ancient tombs. It is unknown if they are related.',
		type: ['Steel', 'Psychic'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 60.5 },
		available_genders: ['Genderless'],
		base_stats: { hp: 57, atk: 24, def: 86, spatk: 24, spdef: 86, spd: 23 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false },
			{ name: 'Heatproof', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.1,
		image_file: '436.png',
		shiny_image_file: '436-shiny.png',
		emoji: '<:436:1435842283248418949>',
		shiny_emoji: '',
		evolution: [{ to: 'Bronzong', conditions: [{ type: 'level_up', value: 33 }] }]
	},
	{
		dex_id: 437,
		name: 'Bronzong',
		description: 'It brought rains by opening portals to another world. It was revered as a bringer of plentiful harvests.',
		type: ['Steel', 'Psychic'],
		tier: 'Rare',
		appearance: { height: 1.3, weight: 187.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 67, atk: 89, def: 116, spatk: 79, spdef: 116, spd: 33 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false },
			{ name: 'Heatproof', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '437.png',
		shiny_image_file: '437-shiny.png',
		emoji: '<:437:1435842278710181928>',
		shiny_emoji: ''
	},
	{
		dex_id: 438,
		name: 'Bonsly',
		description: 'It looks as if it is always crying. It is actually adjusting its body’s fluid levels by eliminating excess.',
		type: ['Rock'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 15.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 80, def: 95, spatk: 10, spdef: 45, spd: 10 },
		available_abilities: [
			{ name: 'Sturdy', is_hidden: false },
			{ name: 'Rock Head', is_hidden: false }
		],
		catch_rate: 0.5,
		flee_rate: 0.1,
		image_file: '438.png',
		shiny_image_file: '438-shiny.png',
		emoji: '<:438:1435842276277489745>',
		shiny_emoji: '',
		evolution: [{ to: 'Sudowoodo', conditions: [{ type: 'move_known', value: 'Mimic' }] }]
	},
	{
		dex_id: 439,
		name: 'Mime Jr.',
		description: 'It habitually mimics foes. Once mimicked, the foe cannot take its eyes off this Cokemon.',
		type: ['Psychic', 'Fairy'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 13.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 20, atk: 25, def: 45, spatk: 70, spdef: 90, spd: 60 },
		available_abilities: [
			{ name: 'Soundproof', is_hidden: false },
			{ name: 'Filter', is_hidden: false },
			{ name: 'Technician', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '439.png',
		shiny_image_file: '439-shiny.png',
		emoji: '<:439:1435842273622495302>',
		shiny_emoji: '',
		evolution: [{ to: 'Mr. Mime', conditions: [{ type: 'move_known', value: 'Mimic' }] }]
	},
	{
		dex_id: 440,
		name: 'Happiny',
		description: 'It loves to carry a round, white rock in its belly pouch. It may offer the rock to a good friend.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 24.4 },
		available_genders: ['Female'],
		base_stats: { hp: 100, atk: 5, def: 5, spatk: 15, spdef: 65, spd: 30 },
		available_abilities: [
			{ name: 'Natural Cure', is_hidden: false },
			{ name: 'Serene Grace', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '440.png',
		shiny_image_file: '440-shiny.png',
		emoji: '<:440:1435842271294652557>',
		shiny_emoji: '',
		evolution: [{ to: 'Chansey', conditions: [{ type: 'item', value: 'oval-stone' }, { type: 'time_of_day', value: 'day' }] }]
	},
	{
		dex_id: 441,
		name: 'Chatot',
		description: 'It can learn and speak human words. If they gather, they all learn the same words.',
		type: ['Normal', 'Flying'],
		tier: 'Common',
		appearance: { height: 0.5, weight: 1.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 76, atk: 65, def: 45, spatk: 92, spdef: 42, spd: 91 },
		available_abilities: [
			{ name: 'Keen Eye', is_hidden: false },
			{ name: 'Tangled Feet', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '441.png',
		shiny_image_file: '441-shiny.png',
		emoji: '<:441:1435842262000078951>',
		shiny_emoji: ''
	},
	{
		dex_id: 442,
		name: 'Spiritomb',
		description: 'A Cokemon that was formed by 108 spirits. It is bound to a fissure in an Odd Keystone.',
		type: ['Ghost', 'Dark'],
		tier: 'Epic',
		appearance: { height: 1.0, weight: 108.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 50, atk: 92, def: 108, spatk: 92, spdef: 108, spd: 35 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '442.png',
		shiny_image_file: '442-shiny.png',
		emoji: '<:442:1435842259873566820>',
		shiny_emoji: ''
	},
	{
		dex_id: 443,
		name: 'Gible',
		description: 'It nests in small, horizontal holes in cave walls. It pounces to catch prey that stray too close.',
		type: ['Dragon', 'Ground'],
		tier: 'Rare',
		appearance: { height: 0.7, weight: 20.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 58, atk: 70, def: 45, spatk: 40, spdef: 45, spd: 42 },
		available_abilities: [
			{ name: 'Sand Veil', is_hidden: false },
			{ name: 'Rough Skin', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '443.png',
		shiny_image_file: '443-shiny.png',
		emoji: '<:443:1435842257294196746>',
		shiny_emoji: '',
		evolution: [{ to: 'Gabite', conditions: [{ type: 'level_up', value: 24 }] }]
	},
	{
		dex_id: 444,
		name: 'Gabite',
		description: 'It is a zealous hunter of anything that moves. It treasures gems and stores them in its nest.',
		type: ['Dragon', 'Ground'],
		tier: 'Epic',
		appearance: { height: 1.4, weight: 56.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 68, atk: 90, def: 65, spatk: 50, spdef: 55, spd: 82 },
		available_abilities: [
			{ name: 'Sand Veil', is_hidden: false },
			{ name: 'Rough Skin', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '444.png',
		shiny_image_file: '444-shiny.png',
		emoji: '<:444:1435842254731481198>',
		shiny_emoji: '',
		evolution: [{ to: 'Garchomp', conditions: [{ type: 'level_up', value: 48 }] }]
	},
	{
		dex_id: 445,
		name: 'Garchomp',
		description: 'When it folds up its body and extends its wings, it looks like a jet plane. It flies at sonic speed.',
		type: ['Dragon', 'Ground'],
		tier: 'Ancient',
		appearance: { height: 1.9, weight: 95.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 108, atk: 130, def: 95, spatk: 80, spdef: 85, spd: 102 },
		available_abilities: [
			{ name: 'Sand Veil', is_hidden: false },
			{ name: 'Rough Skin', is_hidden: true }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '445.png',
		shiny_image_file: '445-shiny.png',
		emoji: '<:445:1435842252751507486>',
		shiny_emoji: ''
	},
	{
		dex_id: 446,
		name: 'Munchlax',
		description: 'It wolfs down its weight in food once a day, swallowing it whole with almost no chewing.',
		type: ['Normal'],
		tier: 'Common',
		appearance: { height: 0.6, weight: 105.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 135, atk: 85, def: 40, spatk: 40, spdef: 85, spd: 5 },
		available_abilities: [
			{ name: 'Immunity', is_hidden: false },
			{ name: 'Thick Fat', is_hidden: false },
			{ name: 'Gluttony', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '446.png',
		shiny_image_file: '446-shiny.png',
		emoji: '<:446:1435842250604150864>',
		shiny_emoji: '',
		evolution: [{ to: 'Snorlax', conditions: [{ type: 'friendship', value: 220 }] }]
	},
	{
		dex_id: 447,
		name: 'Riolu',
		description: 'The aura that emanates from its body intensifies to alert others if it is afraid or sad.',
		type: ['Fighting'],
		tier: 'Rare',
		appearance: { height: 0.7, weight: 20.2 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 70, def: 40, spatk: 35, spdef: 40, spd: 60 },
		available_abilities: [
			{ name: 'Steadfast', is_hidden: false },
			{ name: 'Inner Focus', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '447.png',
		shiny_image_file: '447-shiny.png',
		emoji: '<:447:1435842247613616189>',
		shiny_emoji: '',
		evolution: [{ to: 'Lucario', conditions: [{ type: 'friendship', value: 220 }, { type: 'time_of_day', value: 'day' }] }]
	},
	{
		dex_id: 448,
		name: 'Lucario',
		description: 'By catching the aura emanating from others, it can read their thoughts and movements.',
		type: ['Fighting', 'Steel'],
		tier: 'Epic',
		appearance: { height: 1.2, weight: 54.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 110, def: 70, spatk: 115, spdef: 70, spd: 90 },
		available_abilities: [
			{ name: 'Steadfast', is_hidden: false },
			{ name: 'Inner Focus', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '448.png',
		shiny_image_file: '448-shiny.png',
		emoji: '<:448:1435842245076189254>',
		shiny_emoji: ''
	},
	{
		dex_id: 449,
		name: 'Hippopotas',
		description: 'It lives in arid lands. It enshrouds itself in sand to protect itself from germs.',
		type: ['Ground'],
		tier: 'Common',
		appearance: { height: 0.8, weight: 49.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 68, atk: 72, def: 78, spatk: 38, spdef: 42, spd: 32 },
		available_abilities: [
			{ name: 'Sand Stream', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '449.png',
		shiny_image_file: '449-shiny.png',
		emoji: '<:449:1435842238079959121>',
		shiny_emoji: '',
		evolution: [{ to: 'Hippowdon', conditions: [{ type: 'level_up', value: 34 }] }]
	},
	{
		dex_id: 450,
		name: 'Hippowdon',
		description: 'It blasts sand from holes on its body to create a towering twister for attack.',
		type: ['Ground'],
		tier: 'Rare',
		appearance: { height: 2.0, weight: 300.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 108, atk: 112, def: 118, spatk: 68, spdef: 72, spd: 47 },
		available_abilities: [
			{ name: 'Sand Stream', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '450.png',
		shiny_image_file: '450-shiny.png',
		emoji: '<:450:1435842235873755238>',
		shiny_emoji: ''
	},
	{
		dex_id: 451,
		name: 'Skorupi',
		description: 'It grips prey with its tail claws and injects poison. It tenaciously hangs on until the poison takes.',
		type: ['Poison', 'Bug'],
		tier: 'Common',
		appearance: { height: 0.8, weight: 12.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 40, atk: 50, def: 90, spatk: 30, spdef: 55, spd: 65 },
		available_abilities: [
			{ name: 'Battle Armor', is_hidden: false },
			{ name: 'Sniper', is_hidden: false },
			{ name: 'Keen Eye', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '451.png',
		shiny_image_file: '451-shiny.png',
		emoji: '<:451:1435842233512230973>',
		shiny_emoji: '',
		evolution: [{ to: 'Drapion', conditions: [{ type: 'level_up', value: 40 }] }]
	},
	{
		dex_id: 452,
		name: 'Drapion',
		description: 'It has the power in its clawed arms to make a car grow scrap. The tip of its tail oozes poison.',
		type: ['Poison', 'Dark'],
		tier: 'Rare',
		appearance: { height: 1.3, weight: 61.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 90, def: 110, spatk: 60, spdef: 75, spd: 95 },
		available_abilities: [
			{ name: 'Battle Armor', is_hidden: false },
			{ name: 'Sniper', is_hidden: false },
			{ name: 'Keen Eye', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '452.png',
		shiny_image_file: '452-shiny.png',
		emoji: '<:452:1435842230953705543>',
		shiny_emoji: ''
	},
	{
		dex_id: 453,
		name: 'Croagunk',
		description: 'Its cheeks hold poison sacs. It tries to catch foes off guard to jab them with its poisonous fingers.',
		type: ['Poison', 'Fighting'],
		tier: 'Common',
		appearance: { height: 0.7, weight: 23.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 48, atk: 61, def: 40, spatk: 61, spdef: 40, spd: 50 },
		available_abilities: [
			{ name: 'Anticipation', is_hidden: false },
			{ name: 'Dry Skin', is_hidden: false }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '453.png',
		shiny_image_file: '453-shiny.png',
		emoji: '<:453:1435842229435629719>',
		shiny_emoji: '',
		evolution: [{ to: 'Toxicroak', conditions: [{ type: 'level_up', value: 37 }] }]
	},
	{
		dex_id: 454,
		name: 'Toxicroak',
		description: 'Its knuckle claws secrete a toxin so vile that even a scratch could prove fatal.',
		type: ['Poison', 'Fighting'],
		tier: 'Rare',
		appearance: { height: 1.3, weight: 44.4 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 83, atk: 106, def: 65, spatk: 86, spdef: 65, spd: 85 },
		available_abilities: [
			{ name: 'Anticipation', is_hidden: false },
			{ name: 'Dry Skin', is_hidden: false }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '454.png',
		shiny_image_file: '454-shiny.png',
		emoji: '<:454:1435842226503811173>',
		shiny_emoji: ''
	},
	{
		dex_id: 455,
		name: 'Carnivine',
		description: 'It attracts prey with its sweet-smelling saliva, then chomps down. It takes a whole day to eat prey.',
		type: ['Grass'],
		tier: 'Common',
		appearance: { height: 1.4, weight: 27.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 74, atk: 100, def: 72, spatk: 90, spdef: 72, spd: 46 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '455.png',
		shiny_image_file: '455-shiny.png',
		emoji: '<:455:1435842224511385641>',
		shiny_emoji: ''
	},
	{
		dex_id: 456,
		name: 'Finneon',
		description: 'The line running down its side can store sunlight. It shines vividly at night.',
		type: ['Water'],
		tier: 'Common',
		appearance: { height: 0.4, weight: 7.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 49, atk: 49, def: 56, spatk: 49, spdef: 61, spd: 66 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Storm Drain', is_hidden: false },
			{ name: 'Water Veil', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.15,
		image_file: '456.png',
		shiny_image_file: '456-shiny.png',
		emoji: '<:456:1435842221936087060>',
		shiny_emoji: '',
		evolution: [{ to: 'Lumineon', conditions: [{ type: 'level_up', value: 31 }] }]
	},
	{
		dex_id: 457,
		name: 'Lumineon',
		description: 'It lives on the deep-sea floor. It attracts prey by flashing the patterns on its four tail fins.',
		type: ['Water'],
		tier: 'Rare',
		appearance: { height: 1.2, weight: 24.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 69, atk: 69, def: 76, spatk: 69, spdef: 86, spd: 91 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Storm Drain', is_hidden: false },
			{ name: 'Water Veil', is_hidden: true }
		],
		catch_rate: 0.25,
		flee_rate: 0.1,
		image_file: '457.png',
		shiny_image_file: '457-shiny.png',
		emoji: '<:457:1435842214168363038>',
		shiny_emoji: ''
	},
	{
		dex_id: 458,
		name: 'Mantyke',
		description: 'A friendly Cokemon that senses the subtle differences in the flow of ocean currents.',
		type: ['Water', 'Flying'],
		tier: 'Common',
		appearance: { height: 1.0, weight: 65.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 20, def: 50, spatk: 60, spdef: 120, spd: 50 },
		available_abilities: [
			{ name: 'Swift Swim', is_hidden: false },
			{ name: 'Water Absorb', is_hidden: false },
			{ name: 'Water Veil', is_hidden: true }
		],
		catch_rate: 0.3,
		flee_rate: 0.1,
		image_file: '458.png',
		shiny_image_file: '458-shiny.png',
		emoji: '<:458:1435842212301639680>',
		shiny_emoji: '',
		evolution: [{ to: 'Mantine', conditions: [{ type: 'other', value: 'with Remoraid in party' }] }]
	},
	{
		dex_id: 459,
		name: 'Snover',
		description: 'It lives on snowy mountains. Having had little contact with humans, it is boldly inquisitive.',
		type: ['Grass', 'Ice'],
		tier: 'Common',
		appearance: { height: 1.0, weight: 50.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 62, def: 50, spatk: 62, spdef: 60, spd: 40 },
		available_abilities: [
			{ name: 'Snow Warning', is_hidden: false },
			{ name: 'Soundproof', is_hidden: true }
		],
		catch_rate: 0.4,
		flee_rate: 0.1,
		image_file: '459.png',
		shiny_image_file: '459-shiny.png',
		emoji: '<:459:1435842209839845386>',
		shiny_emoji: '',
		evolution: [{ to: 'Abomasnow', conditions: [{ type: 'level_up', value: 40 }] }]
	},
	{
		dex_id: 460,
		name: 'Abomasnow',
		description: 'It whips up blizzards in mountains that have a perpetual covering of snow.',
		type: ['Grass', 'Ice'],
		tier: 'Rare',
		appearance: { height: 2.2, weight: 135.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 90, atk: 92, def: 75, spatk: 92, spdef: 85, spd: 60 },
		available_abilities: [
			{ name: 'Snow Warning', is_hidden: false },
			{ name: 'Soundproof', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '460.png',
		shiny_image_file: '460-shiny.png',
		emoji: '<:460:1435842207184584786>',
		shiny_emoji: ''
	},
	{
		dex_id: 461,
		name: 'Weavile',
		description: 'They live in cold regions, forming groups of four or five that hunt prey with impressive coordination.',
		type: ['Dark', 'Ice'],
		tier: 'Epic',
		appearance: { height: 1.1, weight: 34.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 70, atk: 120, def: 65, spatk: 45, spdef: 85, spd: 125 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '461.png',
		shiny_image_file: '461-shiny.png',
		emoji: '<:461:1435842204596703344>',
		shiny_emoji: ''
	},
	{
		dex_id: 462,
		name: 'Magnezone',
		description: 'It evolved from exposure to a special magnetic field. Three units generate magnetism.',
		type: ['Electric', 'Steel'],
		tier: 'Epic',
		appearance: { height: 1.2, weight: 180.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 70, atk: 70, def: 115, spatk: 130, spdef: 90, spd: 60 },
		available_abilities: [
			{ name: 'Magnet Pull', is_hidden: false },
			{ name: 'Sturdy', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '462.png',
		shiny_image_file: '462-shiny.png',
		emoji: '<:462:1435842202369790012>',
		shiny_emoji: ''
	},
	{
		dex_id: 463,
		name: 'Lickilicky',
		description: 'It wraps things with its extensible tongue. Getting too close to it will leave you soaked with drool.',
		type: ['Normal'],
		tier: 'Rare',
		appearance: { height: 1.7, weight: 140.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 110, atk: 85, def: 95, spatk: 80, spdef: 95, spd: 50 },
		available_abilities: [
			{ name: 'Own Tempo', is_hidden: false },
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Cloud Nine', is_hidden: true }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '463.png',
		shiny_image_file: '463-shiny.png',
		emoji: '<:463:1435842200578691122>',
		shiny_emoji: ''
	},
	{
		dex_id: 464,
		name: 'Rhyperior',
		description: 'It puts rocks in holes in its palms and launches them. Its brain is small, so it may forget its own name.',
		type: ['Rock', 'Ground'],
		tier: 'Epic',
		appearance: { height: 2.4, weight: 282.8 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 115, atk: 140, def: 130, spatk: 55, spdef: 55, spd: 40 },
		available_abilities: [
			{ name: 'Lightning Rod', is_hidden: false },
			{ name: 'Solid Rock', is_hidden: false },
			{ name: 'Reckless', is_hidden: true }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '464.png',
		shiny_image_file: '464-shiny.png',
		emoji: '<:464:1435842198422949948>',
		shiny_emoji: ''
	},
	{
		dex_id: 465,
		name: 'Tangrowth',
		description: 'It ensnares prey with its vine-like arms. It is said that its arms are packed with nutrients.',
		type: ['Grass'],
		tier: 'Rare',
		appearance: { height: 2.0, weight: 128.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 100, atk: 100, def: 125, spatk: 110, spdef: 50, spd: 50 },
		available_abilities: [
			{ name: 'Chlorophyll', is_hidden: false },
			{ name: 'Leaf Guard', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '465.png',
		shiny_image_file: '465-shiny.png',
		emoji: '<:465:1435842196052906016>',
		shiny_emoji: ''
	},
	{
		dex_id: 466,
		name: 'Electivire',
		description: 'It pushes the tips of its two tails against the foe, then lets loose with over 20,000 volts of power.',
		type: ['Electric'],
		tier: 'Epic',
		appearance: { height: 1.8, weight: 138.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 123, def: 67, spatk: 95, spdef: 85, spd: 95 },
		available_abilities: [
			{ name: 'Motor Drive', is_hidden: false },
			{ name: 'Vital Spirit', is_hidden: true }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '466.png',
		shiny_image_file: '466-shiny.png',
		emoji: '<:466:1435842193519808654>',
		shiny_emoji: ''
	},
	{
		dex_id: 467,
		name: 'Magmortar',
		description: 'It blasts fireballs of over 3,600 degrees Fahrenheit from the ends of its arms.',
		type: ['Fire'],
		tier: 'Epic',
		appearance: { height: 1.6, weight: 68.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 95, def: 67, spatk: 125, spdef: 95, spd: 83 },
		available_abilities: [
			{ name: 'Flame Body', is_hidden: false },
			{ name: 'Vital Spirit', is_hidden: true }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '467.png',
		shiny_image_file: '467-shiny.png',
		emoji: '<:467:1435842191305216020>',
		shiny_emoji: ''
	},
	{
		dex_id: 468,
		name: 'Togekiss',
		description: 'It will never appear where there is strife. Its sightings have become rare recently.',
		type: ['Fairy', 'Flying'],
		tier: 'Epic',
		appearance: { height: 1.5, weight: 38.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 85, atk: 50, def: 95, spatk: 120, spdef: 115, spd: 80 },
		available_abilities: [
			{ name: 'Hustle', is_hidden: false },
			{ name: 'Serene Grace', is_hidden: false },
			{ name: 'Super Luck', is_hidden: true }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '468.png',
		shiny_image_file: '468-shiny.png',
		emoji: '<:468:1435842189564448923>',
		shiny_emoji: ''
	},
	{
		dex_id: 469,
		name: 'Yanmega',
		description: 'Its jaw power is incredible. It is adept at biting apart foes while flying by at high speed.',
		type: ['Bug', 'Flying'],
		tier: 'Epic',
		appearance: { height: 1.9, weight: 51.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 86, atk: 76, def: 86, spatk: 116, spdef: 56, spd: 95 },
		available_abilities: [
			{ name: 'Speed Boost', is_hidden: false },
			{ name: 'Tinted Lens', is_hidden: false },
			{ name: 'Frisk', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '469.png',
		shiny_image_file: '469-shiny.png',
		emoji: '<:469:1435842187203182695>',
		shiny_emoji: ''
	},
	{
		dex_id: 470,
		name: 'Leafeon',
		description: 'Just like a plant, it uses photosynthesis. As a result, it is always enveloped in clear air.',
		type: ['Grass'],
		tier: 'Epic',
		appearance: { height: 1.0, weight: 25.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 110, def: 130, spatk: 60, spdef: 65, spd: 95 },
		available_abilities: [
			{ name: 'Leaf Guard', is_hidden: false },
			{ name: 'Chlorophyll', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '470.png',
		shiny_image_file: '470-shiny.png',
		emoji: '<:470:1435842185260961943>',
		shiny_emoji: ''
	},
	{
		dex_id: 471,
		name: 'Glaceon',
		description: 'As a protective technique, it can completely freeze its fur to make its hairs stand like needles.',
		type: ['Ice'],
		tier: 'Epic',
		appearance: { height: 0.8, weight: 25.9 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 65, atk: 60, def: 110, spatk: 130, spdef: 95, spd: 65 },
		available_abilities: [
			{ name: 'Snow Cloak', is_hidden: false },
			{ name: 'Ice Body', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '471.png',
		shiny_image_file: '471-shiny.png',
		emoji: '<:471:1435842183318994997>',
		shiny_emoji: ''
	},
	{
		dex_id: 472,
		name: 'Gliscor',
		description: 'It observes its prey while hanging upside down from a tree branch. When the chance comes, it swoops!',
		type: ['Ground', 'Flying'],
		tier: 'Epic',
		appearance: { height: 2.0, weight: 42.5 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 75, atk: 95, def: 125, spatk: 45, spdef: 75, spd: 95 },
		available_abilities: [
			{ name: 'Hyper Cutter', is_hidden: false },
			{ name: 'Sand Veil', is_hidden: false },
			{ name: 'Poison Heal', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '472.png',
		shiny_image_file: '472-shiny.png',
		emoji: '<:472:1435842180928503969>',
		shiny_emoji: ''
	},
	{
		dex_id: 473,
		name: 'Mamoswine',
		description: 'A frozen Mamoswine was dug from ice dating back 10,000 years. This Cokemon has been around for a long, long, long time.',
		type: ['Ice', 'Ground'],
		tier: 'Epic',
		appearance: { height: 2.5, weight: 291.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 110, atk: 130, def: 80, spatk: 70, spdef: 60, spd: 80 },
		available_abilities: [
			{ name: 'Oblivious', is_hidden: false },
			{ name: 'Snow Cloak', is_hidden: false },
			{ name: 'Thick Fat', is_hidden: true }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '473.png',
		shiny_image_file: '473-shiny.png',
		emoji: '<:473:1435842178957053982>',
		shiny_emoji: ''
	},
	{
		dex_id: 474,
		name: 'Porygon-Z',
		description: 'Its programming was modified to enable it to travel through alien dimensions. Seems there might have been an error...',
		type: ['Normal'],
		tier: 'Epic',
		appearance: { height: 0.9, weight: 34.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 85, atk: 80, def: 70, spatk: 135, spdef: 75, spd: 90 },
		available_abilities: [
			{ name: 'Adaptability', is_hidden: false },
			{ name: 'Download', is_hidden: false }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '474.png',
		shiny_image_file: '474-shiny.png',
		emoji: '<:474:1435842176180551850>',
		shiny_emoji: ''
	},
	{
		dex_id: 475,
		name: 'Gallade',
		description: 'A master of courtesy and swordsmanship, it fights using extending swords on its elbows.',
		type: ['Psychic', 'Fighting'],
		tier: 'Epic',
		appearance: { height: 1.6, weight: 52.0 },
		available_genders: ['Male'],
		base_stats: { hp: 68, atk: 125, def: 65, spatk: 65, spdef: 115, spd: 80 },
		available_abilities: [
			{ name: 'Steadfast', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '475.png',
		shiny_image_file: '475-shiny.png',
		emoji: '<:475:1435842173554917386>',
		shiny_emoji: ''
	},
	{
		dex_id: 476,
		name: 'Probopass',
		description: 'It exudes a powerful magnetic force. It controls three small units called Mini-Noses.',
		type: ['Rock', 'Steel'],
		tier: 'Rare',
		appearance: { height: 1.4, weight: 340.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 60, atk: 55, def: 145, spatk: 75, spdef: 150, spd: 40 },
		available_abilities: [
			{ name: 'Sturdy', is_hidden: false },
			{ name: 'Magnet Pull', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '476.png',
		shiny_image_file: '476-shiny.png',
		emoji: '<:476:1435842170895466646>',
		shiny_emoji: ''
	},
	{
		dex_id: 477,
		name: 'Dusknoir',
		description: 'The antenna on its head captures radio waves from the world of spirits that command it to take people there.',
		type: ['Ghost'],
		tier: 'Epic',
		appearance: { height: 2.2, weight: 106.6 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 45, atk: 100, def: 135, spatk: 65, spdef: 135, spd: 45 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false },
			{ name: 'Frisk', is_hidden: true }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '477.png',
		shiny_image_file: '477-shiny.png',
		emoji: '<:477:1435842168572084264>',
		shiny_emoji: ''
	},
	{
		dex_id: 478,
		name: 'Froslass',
		description: 'It freezes foes with an icy breath nearly -60 degrees Fahrenheit. What seems to be its body is actually hollow.',
		type: ['Ice', 'Ghost'],
		tier: 'Epic',
		appearance: { height: 1.3, weight: 26.6 },
		available_genders: ['Female'],
		base_stats: { hp: 70, atk: 80, def: 70, spatk: 80, spdef: 70, spd: 110 },
		available_abilities: [
			{ name: 'Snow Cloak', is_hidden: false }
		],
		catch_rate: 0.15,
		flee_rate: 0.1,
		image_file: '478.png',
		shiny_image_file: '478-shiny.png',
		emoji: '<:478:1435842165736607804>',
		shiny_emoji: ''
	},
	{
		dex_id: 479,
		name: 'Rotom',
		description: 'Its body is made of plasma. It has a mischievous nature. It is known to slip into appliances and cause trouble.',
		type: ['Electric', 'Ghost'],
		tier: 'Rare',
		appearance: { height: 0.3, weight: 0.3 },
		available_genders: ['Genderless'],
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.2,
		flee_rate: 0.1,
		image_file: '479.png',
		shiny_image_file: '479-shiny.png',
		emoji: '<:479:1435842163597377546>',
		shiny_emoji: ''
	},
	{
		dex_id: 480,
		name: 'Uxie',
		description: 'Known as “The Being of Knowledge.” It is said that it can wipe out the memory of those who see its eyes.',
		type: ['Psychic'],
		tier: 'Legendary',
		appearance: { height: 0.3, weight: 0.3 },
		available_genders: ['Genderless'],
		base_stats: { hp: 75, atk: 75, def: 130, spatk: 75, spdef: 130, spd: 95 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '480.png',
		shiny_image_file: '480-shiny.png',
		emoji: '<:480:1435842160929800192>',
		shiny_emoji: ''
	},
	{
		dex_id: 481,
		name: 'Mesprit',
		description: 'Known as “The Being of Emotion.” It taught humans the nobility of sorrow, pain, and joy.',
		type: ['Psychic'],
		tier: 'Legendary',
		appearance: { height: 0.3, weight: 0.3 },
		available_genders: ['Genderless'],
		base_stats: { hp: 80, atk: 105, def: 105, spatk: 105, spdef: 105, spd: 80 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '481.png',
		shiny_image_file: '481-shiny.png',
		emoji: '<:481:1435842158472204348>',
		shiny_emoji: ''
	},
	{
		dex_id: 482,
		name: 'Azelf',
		description: 'Known as “The Being of Willpower.” It sleeps at the bottom of a lake to keep the world in balance.',
		type: ['Psychic'],
		tier: 'Legendary',
		appearance: { height: 0.3, weight: 0.3 },
		available_genders: ['Genderless'],
		base_stats: { hp: 75, atk: 125, def: 70, spatk: 125, spdef: 70, spd: 115 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '482.png',
		shiny_image_file: '482-shiny.png',
		emoji: '<:482:1435842156081319987>',
		shiny_emoji: ''
	},
	{
		dex_id: 483,
		name: 'Dialga',
		description: 'It has the power to control time. It appears in Sinnoh-region myths as an ancient deity.',
		type: ['Steel', 'Dragon'],
		tier: 'Legendary',
		appearance: { height: 5.4, weight: 683.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 100, atk: 120, def: 120, spatk: 150, spdef: 100, spd: 90 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '483.png',
		shiny_image_file: '483-shiny.png',
		emoji: '<:483:1435842153640231024>',
		shiny_emoji: ''
	},
	{
		dex_id: 484,
		name: 'Palkia',
		description: 'It has the ability to distort space. It is described as a deity in Sinnoh-region mythology.',
		type: ['Water', 'Dragon'],
		tier: 'Legendary',
		appearance: { height: 4.2, weight: 336.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 90, atk: 120, def: 100, spatk: 150, spdef: 120, spd: 100 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '484.png',
		shiny_image_file: '484-shiny.png',
		emoji: '<:484:1435842151492620318>',
		shiny_emoji: ''
	},
	{
		dex_id: 485,
		name: 'Heatran',
		description: 'It dwells in volcanic caves. It digs in with its cross-shaped feet to crawl on ceilings and walls.',
		type: ['Fire', 'Steel'],
		tier: 'Legendary',
		appearance: { height: 1.7, weight: 430.0 },
		available_genders: ['Male', 'Female'],
		base_stats: { hp: 91, atk: 90, def: 106, spatk: 130, spdef: 106, spd: 77 },
		available_abilities: [
			{ name: 'Flash Fire', is_hidden: false },
			{ name: 'Flame Body', is_hidden: true }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '485.png',
		shiny_image_file: '485-shiny.png',
		emoji: '<:485:1435842149282349137>',
		shiny_emoji: ''
	},
	{
		dex_id: 486,
		name: 'Regigigas',
		description: 'There is an enduring legend that states this Cokemon towed continents with ropes.',
		type: ['Normal'],
		tier: 'Legendary',
		appearance: { height: 3.7, weight: 420.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 110, atk: 160, def: 110, spatk: 80, spdef: 110, spd: 100 },
		available_abilities: [
			{ name: 'Slow Start', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '486.png',
		shiny_image_file: '486-shiny.png',
		emoji: '<:486:1435842147281666170>',
		shiny_emoji: ''
	},
	{
		dex_id: 487,
		name: 'Giratina',
		description: 'A Cokemon that is said to live in a world on the reverse side of ours. It appears in an ancient cemetery.',
		type: ['Ghost', 'Dragon'],
		tier: 'Legendary',
		appearance: { height: 4.5, weight: 750.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 150, atk: 100, def: 120, spatk: 100, spdef: 120, spd: 90 },
		available_abilities: [
			{ name: 'Pressure', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '487.png',
		shiny_image_file: '487-shiny.png',
		emoji: '<:487:1435842145020940358>',
		shiny_emoji: ''
	},
	{
		dex_id: 488,
		name: 'Cresselia',
		description: 'Those who sleep holding one of its feathers are assured of joyful dreams. It is said to represent the crescent moon.',
		type: ['Psychic'],
		tier: 'Legendary',
		appearance: { height: 1.5, weight: 85.6 },
		available_genders: ['Female'],
		base_stats: { hp: 120, atk: 70, def: 120, spatk: 75, spdef: 130, spd: 85 },
		available_abilities: [
			{ name: 'Levitate', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '488.png',
		shiny_image_file: '488-shiny.png',
		emoji: '<:488:1435842142512615444>',
		shiny_emoji: ''
	},
	{
		dex_id: 489,
		name: 'Phione',
		description: 'A Cokemon that lives in warm seas. It inflates the flotation sac on its head to drift and search for food.',
		type: ['Water'],
		tier: 'Mythical',
		appearance: { height: 0.4, weight: 3.1 },
		available_genders: ['Genderless'],
		base_stats: { hp: 80, atk: 80, def: 80, spatk: 80, spdef: 80, spd: 80 },
		available_abilities: [
			{ name: 'Hydration', is_hidden: false }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '489.png',
		shiny_image_file: '489-shiny.png',
		emoji: '<:489:1435842140742881390>',
		shiny_emoji: ''
	},
	{
		dex_id: 490,
		name: 'Manaphy',
		description: 'It starts its life with a wondrous power that permits it to bond with any kind of Cokemon.',
		type: ['Water'],
		tier: 'Mythical',
		appearance: { height: 0.3, weight: 1.4 },
		available_genders: ['Genderless'],
		base_stats: { hp: 100, atk: 100, def: 100, spatk: 100, spdef: 100, spd: 100 },
		available_abilities: [
			{ name: 'Hydration', is_hidden: false }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '490.png',
		shiny_image_file: '490-shiny.png',
		emoji: '<:490:1435842137962053733>',
		shiny_emoji: ''
	},
	{
		dex_id: 491,
		name: 'Darkrai',
		description: 'It can lull people to sleep and make them dream. It is active during nights of the new moon.',
		type: ['Dark'],
		tier: 'Mythical',
		appearance: { height: 1.5, weight: 50.5 },
		available_genders: ['Genderless'],
		base_stats: { hp: 70, atk: 90, def: 90, spatk: 135, spdef: 90, spd: 125 },
		available_abilities: [
			{ name: 'Bad Dreams', is_hidden: false }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '491.png',
		shiny_image_file: '491-shiny.png',
		emoji: '<:491:1435842128898166994>',
		shiny_emoji: ''
	},
	{
		dex_id: 492,
		name: 'Shaymin',
		description: 'It can dissolve toxins in the air to instantly transform ruined land into a lush field of flowers.',
		type: ['Grass'],
		tier: 'Mythical',
		appearance: { height: 0.2, weight: 2.1 },
		available_genders: ['Genderless'],
		base_stats: { hp: 100, atk: 100, def: 100, spatk: 100, spdef: 100, spd: 100 },
		available_abilities: [
			{ name: 'Natural Cure', is_hidden: false }
		],
		catch_rate: 0.1,
		flee_rate: 0.1,
		image_file: '492.png',
		shiny_image_file: '492-shiny.png',
		emoji: '<:492:1435842126599684157>',
		shiny_emoji: ''
	},
	{
		dex_id: 493,
		name: 'Arceus',
		description: 'It is told in mythology that this Cokemon was born before the universe even existed.',
		type: ['Normal'],
		tier: 'Mythical',
		appearance: { height: 3.2, weight: 320.0 },
		available_genders: ['Genderless'],
		base_stats: { hp: 120, atk: 120, def: 120, spatk: 120, spdef: 120, spd: 120 },
		available_abilities: [
			{ name: 'Multitype', is_hidden: false }
		],
		catch_rate: 0.05,
		flee_rate: 0.1,
		image_file: '493.png',
		shiny_image_file: '493-shiny.png',
		emoji: '<:493:1435842124238291045>',
		shiny_emoji: ''
	}
]

const seedSpecies = async () => {
	try {
		console.log('Preparing to seed species...')
		const allAbilities = await Ability.find({})
		const abilityMap = new Map(allAbilities.map(a => [a.name, a._id]))
		const allSpecies = await Species.find({})
		const speciesMap = new Map(allSpecies.map(s => [s.name, s._id]))

		const finalOps = speciesData.map(species => {
			const { available_abilities, evolution, ...speciesDetails } = species

			const populatedAbilities = available_abilities.map(abilityInfo => {
				const abilityId = abilityMap.get(abilityInfo.name)
				if (abilityId) {
					return {
						ability: abilityId,
						is_hidden: abilityInfo.is_hidden
					}
				}
				return null
			}).filter(a => a)

			let populatedEvolutions = []
			if (evolution && evolution.length > 0) {
				populatedEvolutions = evolution.map(evo => {
					const targetId = speciesMap.get(evo.to)
					if (targetId) {
						return {
							species_id: targetId,
							conditions: evo.conditions
						}
					}
					return null
				}).filter(e => e)
			}

			return {
				updateOne: {
					filter: { dex_id: species.dex_id },
					update: {
						$set: {
							...speciesDetails,
							available_abilities: populatedAbilities,
							evolution: populatedEvolutions
						}
					}
				}
			}
		})

		if (finalOps.length > 0) {
			const result = await Species.bulkWrite(finalOps)
			console.log('✅ Species data seeded successfully!')
			console.log(`   - Matched: ${result.matchedCount}`)
			console.log(`   - Modified: ${result.modifiedCount}`)
			console.log(`   - Upserted: ${result.upsertedCount}`)
		}
	} catch (error) {
		console.error('❌ Error seeding species:', error)
	}
}

module.exports = seedSpecies
