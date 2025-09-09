const mongoose = require('mongoose')
require('dotenv').config()
const Species = require('./models/cokemon/Species')

const speciesData = [
    {
        dex_id: 1,
        name: 'Bulbasaur',
        type: ['Grass'],
        tier: 'Common',
        base_stats: { hp: 45, atk: 49, def: 49, spd: 45 },
        catch_rate: 0.75,
        flee_rate: 0.10,
        image_file: 'bulbasaur.jpg',
        shiny_image_file: 'bulbasaur-shiny.png',
        emoji: '<:bulbasaur:1414947832078667837>',
        shiny_emoji: '<:bulbasaurshiny:1414947864672604272>',
        available_genders: ['Male', 'Female']
    },
    {
        dex_id: 2,
        name: 'Ivysaur',
        type: ['Grass'],
        tier: 'Rare',
        base_stats: { hp: 60, atk: 62, def: 63, spd: 60 },
        catch_rate: 0.45,
        flee_rate: 0.10,
        image_file: 'ivysaur.jpg',
        shiny_image_file: 'ivysaur-shiny.png',
        emoji: '<:ivysaur:1414947903545409616>',
        shiny_emoji: '<:ivysaurshiny:1414947922763583599>',
        available_genders: ['Male', 'Female']
    },
    {
        dex_id: 3,
        name: 'Venusaur',
        type: ['Grass'],
        tier: 'Epic',
        base_stats: { hp: 80, atk: 82, def: 83, spd: 80 },
        catch_rate: 0.15,
        flee_rate: 0.10,
        image_file: 'venusaur.jpg',
        shiny_image_file: 'venusaur-shiny.png',
        emoji: '<:venusaur:1414947969693777980>',
        shiny_emoji: '<:venusaurshiny:1414947979869294635>',
        available_genders: ['Male', 'Female']
    },
    {
        dex_id: 4,
        name: 'Charmander',
        type: ['Fire'],
        tier: 'Common',
        base_stats: { hp: 39, atk: 52, def: 43, spd: 65 },
        catch_rate: 0.75,
        flee_rate: 0.10,
        image_file: 'charmander.jpg',
        shiny_image_file: 'charmander-shiny.png',
        emoji: '<:charmander:1414948033673695372>',
        shiny_emoji: '<:charmandershiny:1414948044729880648>',
        available_genders: ['Male', 'Female']
    },
    {
        dex_id: 5,
        name: 'Charmeleon',
        type: ['Fire'],
        tier: 'Rare',
        base_stats: { hp: 58, atk: 64, def: 58, spd: 80 },
        catch_rate: 0.45,
        flee_rate: 0.10,
        image_file: 'charmeleon.jpg',
        shiny_image_file: 'charmeleon-shiny.png',
        emoji: '<:charmeleon:1414948090707705948>',
        shiny_emoji: '<:charmeleonshiny:1414948100732223560>',
        available_genders: ['Male', 'Female']
    },
    {
        dex_id: 6,
        name: 'Charizard',
        type: ['Fire', 'Flying'],
        tier: 'Epic',
        base_stats: { hp: 78, atk: 84, def: 78, spd: 100 },
        catch_rate: 0.15,
        flee_rate: 0.10,
        image_file: 'charizard.jpg',
        shiny_image_file: 'charizard-shiny.png',
        emoji: '<:charizard:1414948500013056011>',
        shiny_emoji: '<:charizardshiny:1414948506317361233>',
        available_genders: ['Male', 'Female']
    },
    {
        dex_id: 7,
        name: 'Squirtle',
        type: ['Water'],
        tier: 'Common',
        base_stats: { hp: 44, atk: 48, def: 65, spd: 43 },
        catch_rate: 0.75,
        flee_rate: 0.10,
        image_file: 'squirtle.jpg',
        shiny_image_file: 'squirtle-shiny.png',
        emoji: '<:squirtle:1414948555767943410>',
        shiny_emoji: '<:squirtleshiny:1414948567436492882>',
        available_genders: ['Male', 'Female']
    },
    {
        dex_id: 8,
        name: 'Wartortle',
        type: ['Water'],
        tier: 'Rare',
        base_stats: { hp: 59, atk: 63, def: 80, spd: 58 },
        catch_rate: 0.45,
        flee_rate: 0.10,
        image_file: 'wartortle.jpg',
        shiny_image_file: 'wartortle-shiny.png',
        emoji: '<:wartortle:1414948609891500145>',
        shiny_emoji: '<:wartortleshiny:1414948614882721885>',
        available_genders: ['Male', 'Female']
    },
    {
        dex_id: 9,
        name: 'Blastoise',
        type: ['Water'],
        tier: 'Epic',
        base_stats: { hp: 79, atk: 83, def: 100, spd: 78 },
        catch_rate: 0.15,
        flee_rate: 0.10,
        image_file: 'blastoise.jpg',
        shiny_image_file: 'blastoise-shiny.png',
        emoji: '<:blastoise:1414948630753710141>',
        shiny_emoji: '<:blastoiseshiny:1414948637515059270>',
        available_genders: ['Male', 'Female']
    },
]

const evolutionChains = {
    'Bulbasaur': { evolves_to: 'Ivysaur', at_level: 16 },
    'Ivysaur': { evolves_to: 'Venusaur', at_level: 32 },
    'Charmander': { evolves_to: 'Charmeleon', at_level: 16 },
    'Charmeleon': { evolves_to: 'Charizard', at_level: 36 },
    'Squirtle': { evolves_to: 'Wartortle', at_level: 16 },
    'Wartortle': { evolves_to: 'Blastoise', at_level: 36 },
}

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL)
        console.log('✅ Database connected successfully for seeding.')

        console.log('Upserting species data...')
        for (const species of speciesData) {
            await Species.findOneAndUpdate(
                { name: species.name },
                species,
                { upsert: true }
            )
        }
        console.log('✅ Species data has been successfully synced.')

        console.log('Linking evolutions...')
        const speciesMap = new Map()
        const allSpecies = await Species.find({})
        allSpecies.forEach(s => speciesMap.set(s.name, s._id))

        for (const [from, evolution] of Object.entries(evolutionChains)) {
            const fromId = speciesMap.get(from)
            const toId = speciesMap.get(evolution.evolves_to)

            if (fromId && toId) {
                await Species.findByIdAndUpdate(fromId, {
                    $set: { evolution: [{ species_id: toId, method: 'level', level: evolution.at_level }] }
                })
                await Species.findByIdAndUpdate(toId, {
                    $set: { preevolution_species_id: fromId }
                })
            }
        }
        console.log('✅ Database has been successfully seeded and evolutions linked!')
    } catch (error) {
        console.error('❌ Error seeding the database:', error)
    } finally {
        await mongoose.disconnect()
        console.log('✅ Database disconnected.')
    }
}

seedDatabase()