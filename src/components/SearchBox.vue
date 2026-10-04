<script setup>
import { ref, computed } from 'vue'
import { iconUrl } from '../api'

const props = defineProps({
  modelValue: String,
  items: { type: Array, required: true },
  disabled: Boolean
})
const emit = defineEmits(['update:modelValue', 'pick'])

const open = ref(false)
const active = ref(0)

const matches = computed(() => {
  const q = (props.modelValue || '').trim().toLowerCase()
  if (!q) return []
  return props.items
    .filter((i) => i.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const as = a.name.toLowerCase().startsWith(q) ? 0 : 1
      const bs = b.name.toLowerCase().startsWith(q) ? 0 : 1
      return as - bs || a.name.localeCompare(b.name)
    })
    .slice(0, 8)
})

function onInput(e) {
  emit('update:modelValue', e.target.value)
  open.value = true
  active.value = 0
}

function choose(item) {
  open.value = false
  emit('update:modelValue', item.name)
  emit('pick', item.key)
}

function onKey(e) {
  if (!matches.value.length) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    active.value = (active.value + 1) % matches.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = (active.value - 1 + matches.value.length) % matches.value.length
  } else if (e.key === 'Enter') {
    choose(matches.value[active.value])
  } else if (e.key === 'Escape') {
    open.value = false
  }
}
</script>

<template>
  <div class="search">
    <input
      :value="modelValue"
      :disabled="disabled"
      type="text"
      placeholder="Search for an item…"
      autocomplete="off"
      spellcheck="false"
      aria-label="Item name"
      @input="onInput"
      @keydown="onKey"
      @focus="open = true"
      @blur="open = false"
    />
    <ul v-if="open && matches.length" class="suggest">
      <li
        v-for="(m, i) in matches"
        :key="m.key"
        :class="{ on: i === active }"
        @mousedown.prevent="choose(m)"
        @mousemove="active = i"
      >
        <img :src="iconUrl(m.key)" alt="" width="32" height="32" />
        {{ m.name }}
      </li>
    </ul>
  </div>
</template>
