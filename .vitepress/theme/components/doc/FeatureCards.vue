<!--
  A grid of small cards: title + one line, optionally linking to a page.
  `backticks` in the text become inline code.
-->
<script setup lang="ts">
import { docHref, inlineCode, isExternal } from './format';

withDefaults(defineProps<{ items: { title: string; text: string; link?: string }[]; cols?: 2 | 3 }>(), { cols: 2 });
</script>

<template>
  <ul class="feature-cards" :class="`feature-cards--${cols}`">
    <li v-for="item in items" :key="item.title" class="feature-card-item">
      <component
        :is="item.link ? 'a' : 'div'"
        class="feature-card"
        :href="item.link ? docHref(item.link) : undefined"
        :target="item.link && isExternal(item.link) ? '_blank' : undefined"
        :rel="item.link && isExternal(item.link) ? 'noreferrer' : undefined"
      >
        <span class="feature-card-title">{{ item.title }}</span>
        <span class="feature-card-text" v-html="inlineCode(item.text)" />
      </component>
    </li>
  </ul>
</template>

<style>
.vp-doc .feature-cards {
  display: grid;
  gap: 12px;
  margin: 20px 0 24px;
  padding: 0;
  list-style: none;
}

.vp-doc .feature-cards--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.vp-doc .feature-cards--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.vp-doc .feature-card-item {
  display: flex;
  margin: 0;
}

.vp-doc .feature-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: border-color 0.2s, background-color 0.2s;
}

.vp-doc a.feature-card:hover {
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg);
}

.vp-doc a.feature-card:hover .feature-card-title {
  color: var(--vp-c-brand-1);
}

.feature-card-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  transition: color 0.2s;
}

.feature-card-text {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}

.vp-doc .feature-card code {
  font-size: 12px;
}

@media (max-width: 860px) {
  .vp-doc .feature-cards--3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .vp-doc .feature-cards--2,
  .vp-doc .feature-cards--3 {
    grid-template-columns: 1fr;
  }
}

.vp-doc a.feature-card:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
</style>
