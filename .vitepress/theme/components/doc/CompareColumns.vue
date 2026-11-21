<!--
  Two (or three) side-by-side columns, for example central app vs tenant workspace.
  Items are short strings; `backticks` become inline code. Columns stack on narrow screens.
-->
<script setup lang="ts">
import { inlineCode } from './format';

defineProps<{ columns: { title: string; subtitle?: string; items: string[] }[] }>();
</script>

<template>
  <div class="compare" :style="{ '--compare-cols': columns.length }">
    <section v-for="column in columns" :key="column.title" class="compare-col">
      <p class="compare-title">{{ column.title }}</p>
      <p v-if="column.subtitle" class="compare-subtitle" v-html="inlineCode(column.subtitle)" />
      <ul class="compare-list">
        <li v-for="item in column.items" :key="item" v-html="inlineCode(item)" />
      </ul>
    </section>
  </div>
</template>

<style>
.compare {
  display: grid;
  grid-template-columns: repeat(var(--compare-cols, 2), minmax(0, 1fr));
  gap: 12px;
  margin: 20px 0 24px;
}

.compare-col {
  padding: 16px 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.vp-doc .compare-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.vp-doc .compare-subtitle {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.vp-doc .compare-list {
  margin: 10px 0 0;
  padding-left: 18px;
}

.vp-doc .compare-list li {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 1.55;
}

.vp-doc .compare code {
  font-size: 12.5px;
}

@media (max-width: 640px) {
  .compare {
    grid-template-columns: 1fr;
  }
}
</style>
