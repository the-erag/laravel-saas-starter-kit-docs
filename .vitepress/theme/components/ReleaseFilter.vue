<script setup lang="ts">
import { releaseFilter, type ReleaseKit } from './releaseFilter';

const options: { value: 'all' | ReleaseKit; label: string }[] = [
  { value: 'all', label: 'All kits' },
  { value: 'vue', label: 'Vue' },
  { value: 'react', label: 'React' },
  { value: 'svelte', label: 'Svelte' },
];
</script>

<template>
  <div class="release-filter" role="group" aria-label="Show releases for">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="release-filter-button"
      :class="{ active: releaseFilter === option.value }"
      :aria-pressed="releaseFilter === option.value"
      @click="releaseFilter = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.release-filter {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 8px 0 4px;
  padding: 4px;
  border: 1px solid var(--sl-border);
  border-radius: 999px;
  background: var(--sl-surface-muted);
}

.release-filter-button {
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  transition:
    color 0.2s,
    background-color 0.2s;
}

.release-filter-button:hover {
  color: var(--vp-c-text-1);
}

.release-filter-button.active {
  background: var(--sl-surface);
  box-shadow: var(--sl-shadow-sm);
  color: var(--vp-c-brand-1);
}
</style>
