<script setup>
import { ref, onMounted } from 'vue'
import { loadCodex, groupLabel } from './api'
import TreeView from './components/TreeView.vue'

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
</script>

<template>
  <main class="wrap">
    <TreeView :codex="codex" :name-of="nameOf" :loading="loading" :error="error" />
  </main>
</template>
