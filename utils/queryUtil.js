const buildCokemonQuery = args => {
    const query = {}
    const speciesQuery = {}
    const stringFilters = {
        'type': { query: speciesQuery, field: 'type', storage: [], aliases: ['t'] },
        'tier': { query: speciesQuery, field: 'tier', storage: [], aliases: ['ti'] },
        'name': { query: speciesQuery, field: 'name', storage: [], aliases: ['n'] },
        'nickname': { query: speciesQuery, field: 'nickname', storage: [], aliases: ['nn'] },
        'nature': { query: query, field: 'nature', storage: [], aliases: ['na'] },
        'gender': { query: query, field: 'gender', storage: [], aliases: ['g'] },
    }
    const numericFilters = {
        'iv': { query: query, field: 'iv_percent', aliases: [] },
        'lvl': { query: query, field: 'level', aliases: ['l'] },
        'hpiv': { query: query, field: 'ivs.hp', aliases: ['hi'] },
        'atkiv': { query: query, field: 'ivs.atk', aliases: ['ai'] },
        'defiv': { query: query, field: 'ivs.def', aliases: ['di'] },
        'spdiv': { query: query, field: 'ivs.spd', aliases: ['si'] },
        'hp': { query: speciesQuery, field: 'base_stats.hp', aliases: [] },
        'atk': { query: speciesQuery, field: 'base_stats.atk', aliases: [] },
        'def': { query: speciesQuery, field: 'base_stats.def', aliases: [] },
        'spd': { query: speciesQuery, field: 'base_stats.spd', aliases: [] },
    }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i].toLowerCase()
        if (arg.startsWith('--')) {
            let flag = arg.substring(2)

            if (flag.startsWith('no')) {
                const positiveFlag = flag.substring(2) // e.g., 'shiny' from 'noshiny'
                if (positiveFlag === 'shiny') {
                    query.is_shiny = false
                }
                if (positiveFlag === 'favorite' || positiveFlag === 'fav') {
                    query.is_favorite = false
                }
                continue
            }

            if (flag === 'shiny') {
                query.is_shiny = true
                continue
            } else if (flag === 'favorite' || flag === 'fav') {
                query.is_favorite = true
                continue
            } else {
                // Handle string flags: type, tier, etc
                let stringHandled = false
                for (const key in stringFilters) {
                    if (flag === key || stringFilters[key].aliases.includes(flag)) {
                        if (args[i + 1]) {
                            stringFilters[key].storage.push(new RegExp(`^${args[i + 1]}$`, 'i'))
                            i++
                            stringHandled = true
                        }
                        break
                    }
                }
                if (stringHandled) continue

                // Handle numeric flags: iv, lvl, stats, etc
                let operator = flag.slice(-1) // Gets '+', '-', or the last letter
                let mongoOp

                if (['+', '-', '='].includes(operator)) {
                    flag = flag.slice(0, -1) // Remove operator from flag
                } else {
                    operator = '=' // Default to equals if no operator is present
                }

                let numericHandled = false
                for (const key in numericFilters) {
                    if (flag === key || numericFilters[key].aliases.includes(flag)) {
                        const dbField = numericFilters[key].field
                        const queryTarget = numericFilters[key].query
                        const value = parseFloat(args[i + 1])

                        if (!isNaN(value)) {
                            const mongoOp = operator === '+' ? '$gte' : operator === '-' ? '$lte' : '$eq';
                            if (!queryTarget[dbField]) {
                                queryTarget[dbField] = {}
                            }
                            queryTarget[dbField][mongoOp] = value
                            i++
                            numericHandled = true
                        }
                        break
                    }
                }
                if (numericHandled) continue
            }
        }
    }

    for (const key in stringFilters) {
        const filter = stringFilters[key]
        if (filter.storage.length > 0) {
            filter.query[filter.field] = { $in: filter.storage }
        }
    }
    return { cokemonQuery: query, speciesQuery: speciesQuery }
}

const buildItemQuery = args => {

}

module.exports = { buildCokemonQuery, buildItemQuery }
