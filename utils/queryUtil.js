const buildCokemonQuery = args => {
    const cokemonQueryParts = []
    const speciesQueryParts = []

    const filters = {
        'type': { target: speciesQueryParts, field: 'type', type: 'string' },
        'tier': { target: speciesQueryParts, field: 'tier', type: 'string' },
        'name': { target: speciesQueryParts, field: 'name', type: 'string' },
        'nickname': { target: cokemonQueryParts, field: 'nickname', type: 'string' },
        'nature': { target: cokemonQueryParts, field: 'nature', type: 'string' },
        'gender': { target: cokemonQueryParts, field: 'gender', type: 'string' },
        'lvl': { target: cokemonQueryParts, field: 'level', type: 'numeric' },
        'iv': { target: cokemonQueryParts, field: 'iv_percent', type: 'numeric' },
        'hpiv': { target: cokemonQueryParts, field: 'ivs.hp', type: 'numeric' },
        'atkiv': { target: cokemonQueryParts, field: 'ivs.atk', type: 'numeric' },
        'defiv': { target: cokemonQueryParts, field: 'ivs.def', type: 'numeric' },
        'spatkiv': { target: cokemonQueryParts, field: 'ivs.spatk', type: 'numeric' },
        'spdefiv': { target: cokemonQueryParts, field: 'ivs.spdef', type: 'numeric' },
        'spdiv': { target: cokemonQueryParts, field: 'ivs.spd', type: 'numeric' },
        'hp': { target: speciesQueryParts, field: 'base_stats.hp', type: 'numeric' },
        'atk': { target: speciesQueryParts, field: 'base_stats.atk', type: 'numeric' },
        'def': { target: speciesQueryParts, field: 'base_stats.def', type: 'numeric' },
        'spatk': { target: speciesQueryParts, field: 'base_stats.spatk', type: 'numeric' },
        'spdef': { target: speciesQueryParts, field: 'base_stats.spdef', type: 'numeric' },
        'spd': { target: speciesQueryParts, field: 'base_stats.spd', type: 'numeric' },
    }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i].toLowerCase()
        if (!arg.startsWith('--')) continue

        let flag = arg.substring(2)
        if (flag === 'shiny') {
            cokemonQueryParts.push({ is_shiny: true })
            continue
        }
        if (flag === 'noshiny') {
            cokemonQueryParts.push({ is_shiny: false })
            continue
        }
        if (flag === 'fav' || flag === 'favorite') {
            cokemonQueryParts.push({ is_favorite: true })
            continue
        }
        if (flag === 'nofav' || flag === 'nofavorite') {
            cokemonQueryParts.push({ is_favorite: false })
            continue
        }

        // Handle flags with values
        let operator = flag.slice(-1)
        let mongoOp = '$eq'

        if (['+', '-', '='].includes(operator)) {
            flag = flag.slice(0, -1)
            if (operator === '+') mongoOp = '$gte'
            if (operator === '-') mongoOp = '$lte'
        }

        const filterConfig = filters[flag]
        if (!filterConfig) continue

        let valueParts = [];
        while (i + 1 < args.length && !args[i + 1].startsWith('--')) {
            valueParts.push(args[++i])
        }
        if (valueParts.length === 0) continue

        const { target, field, type } = filterConfig
        if (type === 'string') {
            const orClauses = valueParts.map(group => {
                const andValues = group.split(',').map(t => new RegExp(`^${t.trim()}$`, 'i'))

                if (andValues.length > 1) {
                    return { [field]: { $all: andValues } }
                } else {
                    return { [field]: andValues[0] }
                }
            })

            if (orClauses.length > 1) {
                target.push({ $or: orClauses })
            } else {
                target.push(orClauses[0]);
            }
        } else if (type === 'numeric') {
            const numValue = parseFloat(valueParts[0]) // Numeric filters only take the first value
            if (!isNaN(numValue)) {
                target.push({ [field]: { [mongoOp]: numValue } })
            }
        }
    }

    const finalCokemonQuery = cokemonQueryParts.length > 0 ? { $and: cokemonQueryParts } : {}
    const finalSpeciesQuery = speciesQueryParts.length > 0 ? { $and: speciesQueryParts } : {}
    return { cokemonQuery: finalCokemonQuery, speciesQuery: finalSpeciesQuery }
}

const buildItemQuery = args => {

}

module.exports = { buildCokemonQuery, buildItemQuery }
