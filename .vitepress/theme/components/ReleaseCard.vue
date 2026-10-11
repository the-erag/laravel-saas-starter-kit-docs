<script setup lang="ts">
import { computed } from 'vue';
import FrameworkLogo from './FrameworkLogo.vue';
import { releaseFilter, type ReleaseKit } from './releaseFilter';

const props = defineProps<{ kit: ReleaseKit; version: string; date?: string }>();

const kitNames: Record<ReleaseKit, string> = { vue: 'Vue', react: 'React', svelte: 'Svelte' };

const anchor = computed(() => `${props.kit}-${props.version.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
const isoDate = computed(() => (props.date ? new Date(`${props.date} UTC`).toISOString().slice(0, 10) : undefined));
const visible = computed(() => releaseFilter.value === 'all' || releaseFilter.value === props.kit);
</script>

<template>
  <article v-show="visible" class="release-card">
    <span class="release-kit">
      <span class="release-kit-logo"><FrameworkLogo :name="kit" :size="12" /></span>
      {{ kitNames[kit] }} Starter Kit
    </span>
    <h2 :id="anchor" class="release-version">
      <span class="sl-sr-only">{{ `${kitNames[kit]} ` }}</span>{{ version }}
      <a class="header-anchor" :href="`#${anchor}`" :aria-label="`Permalink to ${kitNames[kit]} ${version}`">&#8203;</a>
    </h2>
    <time v-if="date" class="release-date" :datetime="isoDate">{{ date }}</time>
    <p v-else class="release-date">Not released yet</p>
    <div class="release-notes">
      <slot />
    </div>
  </article>
</template>

<style scoped>
.release-card {
  margin: 20px 0;
  padding: 24px 28px;
  border: 1px solid var(--sl-border);
  border-radius: var(--sl-radius);
  background: var(--sl-surface);
  box-shadow: var(--sl-shadow-sm);
}

.release-kit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 12px 3px 4px;
  border-radius: 999px;
  background: var(--sl-gradient);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  color: #fff;
}

.release-kit-logo {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
}

.vp-doc h2.release-version {
  margin: 12px 0 0;
  padding: 0;
  border-top: 0;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.release-date {
  display: block;
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.release-notes {
  margin-top: 16px;
}

.release-notes :deep(> :first-child) {
  margin-top: 0;
}

.release-notes :deep(> :last-child) {
  margin-bottom: 0;
}

@media (max-width: 639px) {
  .release-card {
    padding: 20px;
  }

  .vp-doc h2.release-version {
    font-size: 24px;
  }
}
</style>
