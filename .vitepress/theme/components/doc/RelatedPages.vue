<!-- "Related pages" at the bottom of a docs page: 2–3 links with a short reason each. `backticks` in desc become inline code. -->
<script setup lang="ts">
import { docHref, inlineCode } from './format';

defineProps<{ links: { text: string; link: string; desc?: string }[] }>();
</script>

<template>
  <nav class="related" aria-labelledby="related-pages-title">
    <h2 id="related-pages-title" class="related-title">Related pages</h2>
    <ul class="related-list">
      <li v-for="item in links" :key="item.link">
        <a class="related-link" :href="docHref(item.link)">
          <span class="related-text">{{ item.text }}</span>
          <span v-if="item.desc" class="related-desc" v-html="inlineCode(item.desc)" />
        </a>
      </li>
    </ul>
  </nav>
</template>

<style>
.related {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--vp-c-divider);
}

.vp-doc .related-title {
  margin: 0 0 12px;
  padding: 0;
  border: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  line-height: 1.4;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
}

.vp-doc .related-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.vp-doc .related-list li {
  display: flex;
  margin: 0;
}

.vp-doc .related-link {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: border-color 0.2s;
}

.vp-doc .related-link:hover {
  border-color: var(--vp-c-text-3);
}

.related-text {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.related-desc {
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.vp-doc .related-link:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
</style>
