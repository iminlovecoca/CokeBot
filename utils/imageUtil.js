const { createCanvas, loadImage } = require('canvas')
const path = require('path')
const fs = require('fs')
const TEMP_DIR = path.join(__dirname, '../temp')


const compositeImages = async (backgroundPath, cokemonPath) => {
    try {
        const background = await loadImage(backgroundPath)
        const cokemon = await loadImage(cokemonPath)

        const canvas = createCanvas(background.width, background.height)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height)
        const x = (canvas.width - cokemon.width) / 2
        const y = (canvas.height - cokemon.height) / 2
        ctx.drawImage(cokemon, x, y, cokemon.width, cokemon.height)
        
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true })
        }
        const outputFilename = `spawn-${Date.now()}.png`
        const outputPath = path.join(TEMP_DIR, outputFilename)

        const buffer = canvas.toBuffer('image/png')
        fs.writeFileSync(outputPath, buffer)
        return outputPath
    } catch (error) {
        console.error('Error compositing images:', error)
        return null
    }
}

module.exports = { compositeImages }