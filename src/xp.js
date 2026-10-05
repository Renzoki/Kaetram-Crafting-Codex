export const MAX_LEVEL = 120

export const xpForStep = (level) => Math.floor(0.25 * Math.floor(level + 300 * 2 ** (level / 7)))

export function xpBetween(from, to) {
    let total = 0
    for (let level = from; level < to; level++) total += xpForStep(level)
    return total
}