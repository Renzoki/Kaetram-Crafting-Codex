<script setup>
import { ref, onMounted, nextTick, watchEffect } from 'vue'
import { loadCodex, groupLabel } from './api'
import TreeView from './components/TreeView.vue'
import LevelPlanner from './components/LevelPlanner.vue'

const loading = ref(true)
const error = ref('')
const codex = ref({
  nameToKey: {},
  keyToName: {},
  skills: [],
  failed: [],
  recipes: [],
  dropIndex: {},
  itemInfo: {}
})
const view = ref('forge')
const forge = ref(null)

watchEffect(() => {
  document.documentElement.dataset.view = view.value
})

onMounted(async () => {
  try {
    codex.value = await loadCodex()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

const nameOf = (key) =>
    key.startsWith('#') ? groupLabel(key) : codex.value.keyToName[key] ?? key

async function openInForge({ key, qty, recipe }) {
  view.value = 'forge'
  await nextTick()
  forge.value?.openItem(key, qty, recipe)
}
</script>

<template>
  <main class="wrap">
    <nav class="nav" aria-label="Views">
      <button type="button" :class="{ on: view === 'forge' }" :aria-current="view === 'forge' ? 'page' : undefined" @click="view = 'forge'">
        Recipe Planner
      </button>
      <button type="button" :class="{ on: view === 'planner' }" :aria-current="view === 'planner' ? 'page' : undefined" @click="view = 'planner'">
        Level Planner
      </button>
    </nav>

    <TreeView
        v-show="view === 'forge'"
        ref="forge"
        :codex="codex"
        :name-of="nameOf"
        :loading="loading"
        :error="error"
    />
    <LevelPlanner v-show="view === 'planner'" :codex="codex" :name-of="nameOf" @open="openInForge" />
  </main>
</template>