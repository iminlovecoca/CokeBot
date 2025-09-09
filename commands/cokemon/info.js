const { EmbedBuilder } = require('discord.js')
const Cokemon = require('../../models/cokemon/Cokemon')
const { calculateIVPercentage, calculateStat } = require('../../utils/cokemonUtil')

const typeColors = {
    'Fire': '#FF4500', 'Water': '#1E90FF', 'Grass': '#32CD32',
    'Electric': '#FFD700', 'Flying': '#A890F0', 'Rock': '#B8A038',
    'Ground': '#E0C068', 'Bug': '#A8B820', 'Fighting': '#C03028',
    'Psychic': '#F85888', 'Dragon': '#7038F8', 'Steel': '#B8B8D0'
}

const generateInfoEmbed = (cokemon) => {
    const species = cokemon.species_id
    const ivPercent = calculateIVPercentage(cokemon.ivs)
    const imageFile = cokemon.is_shiny ? species.shiny_image_file : species.image_file

    const hp = calculateStat(species.base_stats.hp, cokemon.ivs.hp, cokemon.level)
    const atk = calculateStat(species.base_stats.atk, cokemon.ivs.atk, cokemon.level)
    const def = calculateStat(species.base_stats.def, cokemon.ivs.def, cokemon.level)
    const spd = calculateStat(species.base_stats.spd, cokemon.ivs.spd, cokemon.level)

    const genderSymbol = cokemon.gender === 'Male' ? '♂️' : cokemon.gender === 'Female' ? '♀️' : 'unk'
    const embed = new EmbedBuilder()
        .setColor(typeColors[species.type[0]] || '#FFFFFF')
        .setTitle(`${cokemon.nickname || species.name} ${cokemon.is_shiny ? '✨' : ''}`)
        .setImage(`attachment://${imageFile}`)
        .addFields(
            { name: 'Thông tin', value: `**Loài:** ${species.name}\n**Level:** ${cokemon.level}\n**Giới tính:** ${genderSymbol}`, inline: true },
            { name: 'Hệ', value: species.type.join(', '), inline: true },
            { name: '\u200B', value: '\u200B' },
            { name: 'Chỉ số cơ ', value: `**HP:** ${hp}\n**Atk:** ${atk}\n**Def:** ${def}\n**Spd:** ${spd}`, inline: true },
            { name: 'IVs', value: `**HP:** ${cokemon.ivs.hp}\n**Atk:** ${cokemon.ivs.atk}\n**Def:** ${cokemon.ivs.def}\n**Spd:** ${cokemon.ivs.spd}\n**Tổng:** ${ivPercent}%`, inline: true },
        )
        .setFooter({ text: `ID: ${cokemon.uid} | Bắt lúc: ${cokemon.createdAt.toLocaleString('vi-VN')} ngày ${cokemon.createdAt.toLocaleDateString('vi-VN')}` })
    return embed
}


module.exports = {
    name: 'info',
    description: 'Xem thông tin chi tiết của một cokemon bạn sở hữu.',
    async execute(message, args) {
        const cokemonUid = parseInt(args[0])
        if (isNaN(cokemonUid)) {
            return message.reply("Bạn cần cung cấp ID của cokemon bạn muốn xem. Ví dụ: `!info 3`")
        }

        const cokemon = await Cokemon.findOne({
            owner_id: message.author.id, 
            uid: cokemonUid 
        }).populate('species_id')

        if (!cokemon) {
            return message.reply(`Không tìm thấy cokemon với ID \`${cokemonUid}\` trong bộ sưu tập của bạn.`)
        }

        const infoEmbed = generateInfoEmbed(cokemon)
        const imagePath = `./assets/images/${cokemon.is_shiny ? cokemon.species_id.shiny_image_file : cokemon.species_id.image_file}`

        await message.reply({
            embeds: [infoEmbed],
            files: [imagePath]
        })
    }
}
