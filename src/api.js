const API = '/api/v1'

export const iconUrl = (key) => `${API}/items/${encodeURIComponent(key)}/icon`

const GROUP_OVERRIDES = {}

export const groupLabel = (key) => {
  const t = key.replace(/^#/, '').replace(/_/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function expandGroup(key, keyToName) {
  if (GROUP_OVERRIDES[key]) return GROUP_OVERRIDES[key]
  const guesses = key
    .slice(1)
    .split('_or_')
    .flatMap((p) => [p, p.replace(/_/g, '')])
    .filter((k) => keyToName[k])
  return [...new Set(guesses)]
}

async function getJSON(path) {
  const res = await fetch(API + path)
  if (!res.ok) throw new Error(`${path} returned ${res.status}`)
  return res.json()
}

const entriesOf = (data, field) => Object.entries(data?.[field] ?? data ?? {})
const toRef = (i) => ({ key: i.key.toLowerCase(), qty: i.count ?? 1 })

function normalizeRecipes(skill, data) {
  return entriesOf(data, 'recipes')
    .filter(([, r]) => r && typeof r === 'object')
    .map(([key, r]) => ({
      id: `${skill}:${key}`,
      skill,
      category: r.category,
      level: r.level,
      xp: r.experience,
      inputs: (r.requirements ?? []).map(toRef),
      outputs: [
        { key: key.toLowerCase(), qty: r.result?.count ?? 1 },
        ...(r.result?.items ?? []).map(toRef)
      ]
    }))
}

const FALLBACK_SKILLS = [
  'smithing', 'chiseling', 'fletching', 'crafting',
  'alchemy', 'cooking', 'milling', 'smelting'
]

function normalizeItems(data) {
  const info = {}
  for (const [key, d] of entriesOf(data, 'items')) {
    if (!d || typeof d !== 'object') continue
    info[key.toLowerCase()] = {
      weaponType: d.weaponType,
      equipmentType: d.equipmentType,
      melee: !!d.attackStats
    }
  }
  return info
}

function buildDropIndex(data) {
  const dropIndex = {}
  for (const [mobKey, m] of entriesOf(data, 'mobs')) {
    if (!m || typeof m !== 'object') continue
    for (const d of m.drops ?? []) {
      if (!d || typeof d.key !== 'string') continue
      ;(dropIndex[d.key.toLowerCase()] ??= []).push({
        mobKey,
        name: m.name ?? mobKey,
        chance: d.chance
      })
    }
  }
  return dropIndex
}

export async function loadCodex() {
  const names = await getJSON('/items/names')
  const nameToKey = {}
  const keyToName = {}
  for (const [name, key] of Object.entries(names)) {
    nameToKey[name.toLowerCase()] = key.toLowerCase()
    keyToName[key.toLowerCase()] = name
  }

  let skillList = FALLBACK_SKILLS
  try {
    const data = await getJSON('/crafting')
    const list = Array.isArray(data) ? data : data.skills ?? Object.keys(data)
    if (list.length) skillList = list.map((s) => s.key ?? s)
  } catch (e) {
    console.warn('Could not load /crafting, using fallback skill list', e)
  }

  const [skillResults, mobResult, itemResult] = await Promise.all([
    Promise.allSettled(
      skillList.map(async (s) => ({ skill: s, recipes: normalizeRecipes(s, await getJSON(`/crafting/${s}`)) }))
    ),
    Promise.allSettled([getJSON('/mobs')]).then((r) => r[0]),
    Promise.allSettled([getJSON('/items')]).then((r) => r[0])
  ])

  const skills = []
  const failed = []
  const recipes = []
  skillResults.forEach((res, i) => {
    if (res.status === 'fulfilled') {
      skills.push(`${res.value.skill} (${res.value.recipes.length})`)
      recipes.push(...res.value.recipes)
    } else {
      failed.push(skillList[i])
      console.warn(`Skill "${skillList[i]}" failed to load`, res.reason)
    }
  })

  for (const r of recipes) {
    for (const inp of r.inputs) {
      if (inp.key.startsWith('#')) inp.alts = expandGroup(inp.key, keyToName)
    }
  }

  let dropIndex = {}
  if (mobResult.status === 'fulfilled') dropIndex = buildDropIndex(mobResult.value)
  else {
    failed.push('mobs')
    console.warn('Mobs failed to load', mobResult.reason)
  }

  let itemInfo = {}
  if (itemResult.status === 'fulfilled') itemInfo = normalizeItems(itemResult.value)
  else {
    failed.push('item types')
    console.warn('Items failed to load', itemResult.reason)
  }

  return { nameToKey, keyToName, skills, failed, recipes, dropIndex, itemInfo }
}
