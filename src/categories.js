import { cap } from './tree'

const WEAPON = {
  sword: 'Swords',
  bigsword: 'Greatswords',
  axe: 'Axes',
  spear: 'Spears',
  scythe: 'Scythes',
  pickaxe: 'Pickaxes',
  blunt: 'Maces',
  bow: 'Bows',
  staff: 'Staves',
  shield: 'Shields'
}

const EQUIP = {
  0: 'Helmets',
  1: 'Necklaces',
  2: 'Ammo',
  3: 'Chestplates',
  6: 'Rings',
  9: 'Leggings',
  10: 'Quivers & capes',
  11: 'Boots',
  12: 'Wings & capes',
  13: 'Hats',
  14: 'Shields'
}

const SKILL_FALLBACK = {
  smelting: 'Bars & blocks',
  smithing: 'Parts & figurines',
  cooking: 'Food',
  alchemy: 'Potions'
}

export const CATEGORY_ORDER = [
  'Swords', 'Daggers', 'Greatswords', 'Axes', 'Spears', 'Scythes', 'Pickaxes', 'Maces',
  'Bows', 'Staves', 'Shields', 'Off-hand', 'Helmets', 'Chestplates', 'Leggings', 'Boots',
  'Necklaces', 'Rings', 'Quivers & capes', 'Ammo', 'Bars & blocks', 'Parts & figurines',
  'Food', 'Potions'
]

export function categoryOf(info, skill) {
  if (info?.weaponType) return WEAPON[info.weaponType] ?? cap(info.weaponType)
  if (info?.equipmentType === 5) return info.melee ? 'Daggers' : 'Off-hand'
  if (info?.equipmentType != null) return EQUIP[info.equipmentType] ?? 'Other gear'
  return SKILL_FALLBACK[skill] ?? cap(skill)
}

export function sortCategories(labels) {
  const rank = (l) => {
    const i = CATEGORY_ORDER.indexOf(l)
    return i === -1 ? CATEGORY_ORDER.length : i
  }
  return [...labels].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}
