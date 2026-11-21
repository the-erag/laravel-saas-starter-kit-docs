<!-- A calm note near the top of a page: the one idea to keep in mind, or what you'll have at the end. -->
<script setup lang="ts">
withDefaults(defineProps<{ title?: string }>(), { title: 'Key idea' });
</script>

<template>
  <aside class="key-idea" role="note" :aria-label="title">
    <p class="key-idea-title">{{ title }}</p>
    <div class="key-idea-body"><slot /></div>
  </aside>
</template>

<style>
.key-idea {
  margin: 20px 0 24px;
  padding: 14px 18px;
  border: 1px solid var(--vp-c-divider);
  border-left: 3px solid var(--vp-c-text-3);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.vp-doc .key-idea-title {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
}

.key-idea-body {
  font-size: 15px;
  line-height: 1.65;
  color: var(--vp-c-text-1);
}

.vp-doc .key-idea-body > :first-child {
  margin-top: 0;
}

.vp-doc .key-idea-body > :last-child {
  margin-bottom: 0;
}

.vp-doc .key-idea-body ul {
  margin: 6px 0 0;
}
</style>
