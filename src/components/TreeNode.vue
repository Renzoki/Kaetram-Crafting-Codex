<script setup>
import { iconUrl } from '../api'
import { cap } from '../tree'

defineProps({
  node: { type: Object, required: true },
  nameOf: { type: Function, required: true }
})
defineEmits(['choose'])

function hide(e) {
  e.target.style.visibility = 'hidden'
}
</script>

<template>
  <li class="tnode">
    <div class="row">
      <div class="slot" :class="{ raw: node.raw }">
        <img :src="iconUrl(node.alts?.[0] ?? node.key)" alt="" width="48" height="48" @error="hide" />
        <span class="slot-qty">{{ node.qty }}</span>
      </div>

      <div class="info">
        <span class="name">{{ nameOf(node.key) }}</span>
        <span v-if="node.recipe" class="sub">
          {{ cap(node.recipe.skill) }}<template v-if="node.recipe.level != null"> · Lv {{ node.recipe.level }}</template>
          · {{ node.crafts }} {{ node.crafts === 1 ? 'craft' : 'crafts' }}
          <template v-if="node.outQty > 1">of {{ node.outQty }}</template>
        </span>
        <span v-else-if="node.cycle" class="sub warn">loops back on itself</span>
        <span v-else class="sub ember">raw material</span>

        <select
          v-if="node.options.length > 1"
          class="alt"
          aria-label="Choose recipe"
          :value="node.choice"
          @change="$emit('choose', { key: node.key, index: +$event.target.value })"
        >
          <option v-for="(o, i) in node.options" :key="o.id" :value="i">
            {{ cap(o.skill) }}<template v-if="o.level != null"> · Lv {{ o.level }}</template>
          </option>
        </select>
      </div>
    </div>

    <ul v-if="node.children.length" class="tchildren">
      <TreeNode
        v-for="(c, i) in node.children"
        :key="c.key + i"
        :node="c"
        :name-of="nameOf"
        @choose="$emit('choose', $event)"
      />
    </ul>
  </li>
</template>
