<script setup>
import { ref, computed } from 'vue'
import { iconUrl } from '../api'
import { cap, badge } from '../tree'
import { MAX_LEVEL, xpBetween } from '../xp'

const props = defineProps({
  codex: { type: Object, required: true },
  nameOf: { type: Function, required: true }
})
defineEmits(['open'])

const SKILL_ORDER = ['smithing', 'smelting', 'crafting', 'fletching', 'chiseling', 'alchemy', 'cooking', 'milling']
const MAX_FROM = MAX_LEVEL - 1

const skill = ref(null)
const from = ref(1)
const to = ref(10)

const skills = computed(() => {
  const rank = (s) => {
    const i = SKILL_ORDER.indexOf(s)
    return i === -1 ? SKILL_ORDER.length : i
  }
  return [...new Set(props.codex.recipes.map((r) => r.skill))].sort(
      (a, b) => rank(a) - rank(b) || a.localeCompare(b)
  )
})

const currentSkill = computed(() => skill.value ?? skills.value[0] ?? null)

const parse = (v) => {
  if (v === '' || v == null) return null
  const n = Math.floor(Number(v))
  return Number.isNaN(n) ? null : n
}

const fromNum = computed(() => parse(from.value))
const toNum = computed(() => parse(to.value))
const fromOk = computed(() => fromNum.value !== null && fromNum.value >= 1 && fromNum.value <= MAX_FROM)
const toOk = computed(() => toNum.value !== null && toNum.value >= 2 && toNum.value <= MAX_LEVEL)
const valid = computed(() => fromOk.value && toOk.value && toNum.value > fromNum.value)

const problem = computed(() => {
  if (!fromOk.value) return `Enter a starting level from 1 to ${MAX_FROM}.`
  if (!toOk.value) return `Enter a target level from 2 to ${MAX_LEVEL}.`
  if (toNum.value <= fromNum.value) return 'The target level must be higher than your starting level.'
  return ''
})

const xpNum = computed(() => (valid.value ? xpBetween(fromNum.value, toNum.value) : 0))

function limit(e, max) {
  const raw = e.target.value
  if (raw === '') return ''
  const n = Math.min(max, Math.max(0, Math.floor(Number(raw)) || 0))
  e.target.value = String(n)
  return n
}

function blockKeys(e) {
  if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault()
}

function normalize() {
  const f = Math.min(MAX_FROM, Math.max(1, fromNum.value ?? 1))
  const t = Math.min(MAX_LEVEL, Math.max(f + 1, toNum.value ?? f + 1))
  from.value = f
  to.value = t
}

const options = computed(() => {
  if (!valid.value) return []
  return props.codex.recipes
      .filter((r) => r.skill === currentSkill.value && (r.level ?? 0) <= fromNum.value && (r.xp ?? 0) > 0)
      .map((r) => {
        const main = r.outputs[0]
        const crafts = Math.ceil(xpNum.value / r.xp)
        return {
          id: r.id,
          key: main.key,
          level: r.level ?? 0,
          xp: r.xp,
          crafts,
          outQty: main.qty,
          makes: crafts * main.qty
        }
      })
      .sort((a, b) => b.xp - a.xp || a.level - b.level)
})

function tip(o) {
  const crafts = o.outQty > 1 ? ` (${o.crafts.toLocaleString()} crafts of ${o.outQty})` : ''
  return `${props.nameOf(o.key)}: make ${o.makes.toLocaleString()}${crafts} · Lv ${o.level} · ${o.xp.toLocaleString()} xp per craft. Click for the full recipe.`
}

function hide(e) {
  e.target.style.visibility = 'hidden'
}
</script>

<template>
  <section class="forge">
    <header class="forge-head">
      <h1>Level Planner</h1>
      <p>Choose a skill and a level range. See what you can craft and how many it takes.</p>
    </header>

    <div class="cat-tabs" role="tablist" aria-label="Skill">
      <button
          v-for="s in skills"
          :key="s"
          type="button"
          role="tab"
          class="cat"
          :class="{ on: s === currentSkill }"
          :aria-selected="s === currentSkill"
          @click="skill = s"
      >
        {{ cap(s) }}
      </button>
    </div>

    <div class="planner-controls">
      <div class="field">
        <label for="plan-from">From level <small>1–{{ MAX_FROM }}</small></label>
        <input
            id="plan-from"
            class="num-input"
            type="number"
            inputmode="numeric"
            min="1"
            :max="MAX_FROM"
            :value="from"
            :aria-invalid="!fromOk"
            @keydown="blockKeys"
            @input="from = limit($event, MAX_FROM)"
            @blur="normalize"
        />
      </div>
      <span class="range-to" aria-hidden="true">to</span>
      <div class="field">
        <label for="plan-to">To level <small>2–{{ MAX_LEVEL }}</small></label>
        <input
            id="plan-to"
            class="num-input"
            type="number"
            inputmode="numeric"
            min="2"
            :max="MAX_LEVEL"
            :value="to"
            :aria-invalid="!toOk || (fromOk && toNum <= fromNum)"
            @keydown="blockKeys"
            @input="to = limit($event, MAX_LEVEL)"
            @blur="normalize"
        />
      </div>
      <div v-if="valid" class="xp-need">
        <span>XP needed</span>
        <b>{{ xpNum.toLocaleString() }}</b>
      </div>
    </div>

    <p v-if="!skills.length" class="note">No recipes loaded yet.</p>
    <p v-else-if="!valid" class="note bad" role="status">{{ problem }}</p>
    <template v-else>
      <p class="note">
        {{ options.length }} {{ cap(currentSkill) }} {{ options.length === 1 ? 'recipe' : 'recipes' }} you can make at
        level {{ fromNum }}. Any one of them gets you to level {{ toNum }}:
      </p>
      <p v-if="!options.length" class="empty">Nothing gives {{ cap(currentSkill) }} XP at level {{ fromNum }}.</p>

      <ul class="plan-grid">
        <li v-for="o in options" :key="o.id">
          <button type="button" class="plan-box" :title="tip(o)" @click="$emit('open', { key: o.key, qty: o.makes, recipe: o.id })">
            <span class="slot">
              <img :src="iconUrl(o.key)" alt="" width="48" height="48" @error="hide" />
            </span>
            <b class="plan-x">×{{ badge(o.makes) }}</b>
            <span class="plan-name">{{ nameOf(o.key) }}</span>
            <span v-if="o.outQty > 1" class="sub">{{ badge(o.crafts) }} crafts of {{ o.outQty }}</span>
          </button>
        </li>
      </ul>
    </template>
  </section>
</template>