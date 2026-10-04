export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

export function indexByOutput(recipes) {
  const map = {}
  for (const r of recipes) {
    const main = r.outputs[0]
    if (!main) continue
    ;(map[main.key] ??= []).push(r)
  }
  return map
}

const mainQty = (r) => r.outputs[0]?.qty || 1

function pickRecipe(key, byOutput, choices) {
  if (key.startsWith('#')) return null
  const options = byOutput[key]
  if (!options?.length) return null
  return options[choices[key] ?? 0] ?? options[0]
}

export function buildTree(key, qty, ctx, path = new Set(), alts) {
  const options = ctx.byOutput[key] ?? []
  const cycle = path.has(key)
  const recipe = cycle ? null : pickRecipe(key, ctx.byOutput, ctx.choices)
  const node = {
    key, qty, alts, options, recipe, cycle,
    choice: ctx.choices[key] ?? 0,
    raw: !recipe, crafts: 0, outQty: 0, children: []
  }
  if (!recipe) return node

  node.outQty = mainQty(recipe)
  node.crafts = Math.ceil(qty / node.outQty)
  path.add(key)
  node.children = recipe.inputs.map((i) =>
    buildTree(i.key, node.crafts * i.qty, ctx, path, i.alts)
  )
  path.delete(key)
  return node
}

export function summarize(rootKey, qty, ctx) {
  const order = []
  const seen = new Set()
  const visit = (key, path) => {
    if (seen.has(key)) return
    seen.add(key)
    const r = pickRecipe(key, ctx.byOutput, ctx.choices)
    if (!r) return
    path.add(key)
    for (const i of r.inputs) if (!path.has(i.key)) visit(i.key, path)
    path.delete(key)
    order.push(key)
  }
  visit(rootKey, new Set())

  const demand = { [rootKey]: qty }
  const crafts = {}
  const altsOf = {}
  for (const key of [...order].reverse()) {
    const r = pickRecipe(key, ctx.byOutput, ctx.choices)
    const c = Math.ceil((demand[key] ?? 0) / mainQty(r))
    crafts[key] = c
    for (const i of r.inputs) {
      demand[i.key] = (demand[i.key] ?? 0) + c * i.qty
      if (i.alts) altsOf[i.key] = i.alts
    }
  }

  const steps = order.map((key) => {
    const recipe = pickRecipe(key, ctx.byOutput, ctx.choices)
    return { key, recipe, crafts: crafts[key], produces: crafts[key] * mainQty(recipe) }
  })

  const raw = Object.entries(demand)
    .filter(([k]) => !(k in crafts))
    .map(([key, q]) => ({ key, qty: q, alts: altsOf[key] }))
    .sort((a, b) => b.qty - a.qty)

  const levels = {}
  const xp = {}
  for (const s of steps) {
    const sk = s.recipe.skill
    if (s.recipe.level != null) levels[sk] = Math.max(levels[sk] ?? 0, s.recipe.level)
    xp[sk] = (xp[sk] ?? 0) + (s.recipe.xp ?? 0) * s.crafts
  }

  return {
    steps,
    raw,
    levels: Object.entries(levels).sort((a, b) => b[1] - a[1]),
    xp: Object.entries(xp),
    totalXp: Object.values(xp).reduce((a, b) => a + b, 0)
  }
}

export function oddsText(chance) {
  if (chance == null) return ''
  if (chance >= 100000) return 'always'
  const pct = chance / 1000
  return (pct >= 1 ? +pct.toFixed(1) : +pct.toFixed(3)) + '%'
}
