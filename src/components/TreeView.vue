<script setup>
import { ref, reactive, computed, nextTick } from 'vue'
import SearchBox from './SearchBox.vue'
import TreeNode from './TreeNode.vue'
import { iconUrl } from '../api'
import { indexByOutput, buildTree, summarize, oddsText, cap, badge } from '../tree'
import { categoryOf, sortCategories } from '../categories'

const props = defineProps({
  codex: { type: Object, required: true },
  nameOf: { type: Function, required: true },
  loading: Boolean,
  error: String
})

const query = ref('')
const target = ref(null)
const qty = ref(1)
const choices = reactive({})
const activeTab = ref(null)
const resultsEl = ref(null)

const items = computed(() =>
    Object.entries(props.codex.nameToKey).map(([lower, key]) => ({
      name: props.codex.keyToName[key] ?? lower,
      key
    }))
)

const byOutput = computed(() => indexByOutput(props.codex.recipes))

const craftables = computed(() =>
    Object.entries(byOutput.value).map(([key, recipes]) => {
      const first = recipes[0]
      return {
        key,
        name: props.nameOf(key),
        skill: first.skill,
        level: Math.min(...recipes.map((r) => r.level ?? 0)),
        category: categoryOf(props.codex.itemInfo[key], first.skill)
      }
    })
)

const tabs = computed(() => {
  const counts = {}
  for (const c of craftables.value) counts[c.category] = (counts[c.category] ?? 0) + 1
  return sortCategories(Object.keys(counts)).map((label) => ({ label, count: counts[label] }))
})

const currentTab = computed(() => activeTab.value ?? tabs.value[0]?.label ?? null)

const browseList = computed(() =>
    craftables.value
        .filter((c) => c.category === currentTab.value)
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
)

const amount = computed(() => Math.max(1, Math.min(10000000, Math.floor(Number(qty.value)) || 1)))
const ctx = computed(() => ({ byOutput: byOutput.value, choices }))
const tree = computed(() => (target.value ? buildTree(target.value, amount.value, ctx.value) : null))
const summary = computed(() => (target.value ? summarize(target.value, amount.value, ctx.value) : null))

function bump(delta) {
  qty.value = Math.max(1, Math.min(10000000, amount.value + delta))
}

async function pick(key) {
  Object.keys(choices).forEach((k) => delete choices[k])
  target.value = key
  query.value = props.nameOf(key)
  await nextTick()
  resultsEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function openItem(key, count, recipeId) {
  qty.value = Math.max(1, Math.min(10000000, Math.floor(Number(count)) || 1))
  await pick(key)
  const index = (byOutput.value[key] ?? []).findIndex((r) => r.id === recipeId)
  if (index > 0) choices[key] = index
}

defineExpose({ openItem })

function choose({ key, index }) {
  choices[key] = index
}

function sourcesFor(raw) {
  const keys = [raw.key, ...(raw.alts ?? [])]
  return keys
      .flatMap((k) => props.codex.dropIndex[k] ?? [])
      .sort((a, b) => (b.chance ?? 0) - (a.chance ?? 0))
      .slice(0, 3)
}

function hide(e) {
  e.target.style.visibility = 'hidden'
}
</script>

<template>
  <section class="forge">
    <header class="forge-head">
      <h1>Recipe Planner</h1>
      <p>Choose an item and how many you want. See every step down to the raw materials.</p>
    </header>

    <div class="forge-controls">
      <div class="grow">
        <SearchBox v-model="query" :items="items" :disabled="loading || !!error" @pick="pick" />
      </div>
      <div class="qty-box">
        <label for="qty">Quantity</label>
        <div class="stepper">
          <button
              type="button"
              aria-label="Decrease quantity"
              title="Shift-click for 10"
              :disabled="amount <= 1"
              @click="bump(-($event.shiftKey ? 10 : 1))"
          >−</button>
          <input
              id="qty"
              v-model.number="qty"
              type="number"
              min="1"
              max="10000000"
              inputmode="numeric"
              @blur="qty = amount"
          />
          <button
              type="button"
              aria-label="Increase quantity"
              title="Shift-click for 10"
              :disabled="amount >= 10000000"
              @click="bump($event.shiftKey ? 10 : 1)"
          >+</button>
        </div>
      </div>
    </div>

    <p v-if="loading" class="note">Stoking the furnace…</p>
    <p v-else-if="error" class="note bad">
      Could not reach the Kaetram API ({{ error }}). Start the app with <code>npm run dev</code>.
    </p>
    <p v-if="codex.failed.length" class="note bad">
      Could not load: {{ codex.failed.join(', ') }}. Check the browser console for details.
    </p>

    <div v-if="tabs.length" class="browse">
      <div class="cat-tabs" role="tablist" aria-label="Item types">
        <button
            v-for="t in tabs"
            :key="t.label"
            type="button"
            role="tab"
            class="cat"
            :class="{ on: t.label === currentTab }"
            :aria-selected="t.label === currentTab"
            @click="activeTab = t.label"
        >
          {{ t.label }} <span class="cat-count">{{ t.count }}</span>
        </button>
      </div>

      <div class="browse-grid" role="tabpanel">
        <button
            v-for="c in browseList"
            :key="c.key"
            type="button"
            class="browse-item"
            :class="{ on: c.key === target }"
            @click="pick(c.key)"
        >
          <span class="slot small">
            <img :src="iconUrl(c.key)" alt="" width="40" height="40" @error="hide" />
          </span>
          <span class="info">
            <span class="name">{{ c.name }}</span>
            <span class="sub">{{ cap(c.skill) }} · Lv {{ c.level }}</span>
          </span>
        </button>
      </div>
    </div>

    <p v-else-if="!loading && !error" class="note">No craftable items loaded.</p>

    <template v-if="target && summary && tree">
      <div ref="resultsEl" class="target">
        <div class="slot big" :class="{ raw: tree.raw }">
          <img :src="iconUrl(target)" alt="" width="64" height="64" @error="hide" />
          <span class="slot-qty" :title="amount.toLocaleString()">{{ badge(amount) }}</span>
        </div>
        <div class="target-info">
          <h2>{{ nameOf(target) }}</h2>
          <p v-if="tree.raw" class="sub ember">This can't be crafted. It's a raw material.</p>
          <template v-else>
            <p class="reqs">
              <span v-for="[skill, lvl] in summary.levels" :key="skill" class="req">
                {{ cap(skill) }} <b>{{ lvl }}</b>
              </span>
            </p>
            <p class="sub">{{ summary.steps.length }} crafting steps · {{ summary.totalXp.toLocaleString() }} total xp</p>
          </template>
        </div>
      </div>

      <div class="panel">
        <h3>Materials needed</h3>
        <div class="mats">
          <div v-for="m in summary.raw" :key="m.key" class="mat">
            <div class="slot raw">
              <img :src="iconUrl(m.alts?.[0] ?? m.key)" alt="" width="48" height="48" @error="hide" />
              <span class="slot-qty" :title="m.qty.toLocaleString()">{{ badge(m.qty) }}</span>
            </div>
            <div class="info">
              <span class="name">{{ nameOf(m.key) }}</span>
              <span v-if="m.alts?.length" class="sub">any of: {{ m.alts.map(nameOf).join(', ') }}</span>
              <span v-if="sourcesFor(m).length" class="sub">
                Dropped by
                <template v-for="(s, i) in sourcesFor(m)" :key="s.mobKey">
                  <template v-if="i">, </template>{{ s.name }} ({{ oddsText(s.chance) }})
                </template>
              </span>
              <span v-else class="sub dim">No mob drops it</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!tree.raw" class="panel">
        <h3>Recipe tree</h3>
        <p class="hint">Quantities are rounded up for each branch. Totals above are exact. Items with more than one recipe have a selector.</p>
        <ul class="ttree">
          <TreeNode :node="tree" :name-of="nameOf" @choose="choose" />
        </ul>
      </div>

      <div v-if="summary.steps.length" class="panel">
        <h3>Crafting order</h3>
        <ol class="steps">
          <li v-for="s in summary.steps" :key="s.key">
            <img :src="iconUrl(s.key)" alt="" width="32" height="32" @error="hide" />
            <span>
              <b>{{ nameOf(s.key) }}</b>
              <span class="sub">
                {{ cap(s.recipe.skill) }}<template v-if="s.recipe.level != null"> Lv {{ s.recipe.level }}</template>
                · {{ s.crafts }} {{ s.crafts === 1 ? 'craft' : 'crafts' }}, makes {{ s.produces.toLocaleString() }}
              </span>
            </span>
          </li>
        </ol>
      </div>
    </template>
  </section>
</template>