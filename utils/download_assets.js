const https = require('https')
const fs = require('fs')
const path = require('path')

const GEN_1_COUNT = 151
const NORMAL_URL = 'https://cdn.poketwo.net/images/'
const SHINY_URL = 'https://cdn.poketwo.net/shiny/'
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'images')

const downloadImage = (url, filepath) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                const fileStream = fs.createWriteStream(filepath)
                res.pipe(fileStream)
                fileStream.on('finish', () => {
                    fileStream.close()
                    console.log(`Downloaded: ${filepath}`)
                    resolve()
                })
            } else {
                console.warn(`Could not download ${url}. Status: ${res.statusCode}`)
                resolve()
            }
        }).on('error', (err) => {
            console.error(`Error downloading ${url}:`, err.message)
            reject(err)
        })
    })
}

const startDownload = async () => {
    console.log('Starting asset download...')
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    }

    for (let id = 1; id <= GEN_1_COUNT; id++) {
        const normalUrl = `${NORMAL_URL}${id}.png`
        const normalFilepath = path.join(OUTPUT_DIR, `${id}.png`)
        await downloadImage(normalUrl, normalFilepath)

        const shinyUrl = `${SHINY_URL}${id}.png`
        const shinyFilepath = path.join(OUTPUT_DIR, `${id}-shiny.png`)
        await downloadImage(shinyUrl, shinyFilepath)
    }

    console.log('✅ All downloads complete!')
}

startDownload()
