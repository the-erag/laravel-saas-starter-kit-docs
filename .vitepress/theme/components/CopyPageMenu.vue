<script setup lang="ts">
import { siClaude } from 'simple-icons';
import { useData, withBase } from 'vitepress';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { site } from '../../site';

const { page } = useData();
const root = ref<HTMLElement | null>(null);
const open = ref(false);
const copied = ref(false);

const markdownPath = computed(() => `/${page.value.relativePath}`);
const prompt = computed(() => `Read ${site.url}${markdownPath.value} so I can ask questions about it.`);
const chatgptUrl = computed(() => `https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt.value)}`);
const claudeUrl = computed(() => `https://claude.ai/new?q=${encodeURIComponent(prompt.value)}`);

const copy = async (): Promise<void> => {
  const response = await fetch(withBase(markdownPath.value));
  await navigator.clipboard.writeText(await response.text());
  open.value = false;
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
};

const closeOutside = (event: MouseEvent): void => {
  if (!root.value?.contains(event.target as Node)) {
    open.value = false;
  }
};

const closeOnEscape = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    open.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', closeOutside);
  document.addEventListener('keydown', closeOnEscape);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closeOutside);
  document.removeEventListener('keydown', closeOnEscape);
});
</script>

<template>
  <div ref="root" class="copy-page">
    <div class="copy-page-group">
      <button type="button" class="copy-page-main" @click="copy">
        <svg v-if="!copied" class="copy-page-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="14" height="14" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
        <svg v-else class="copy-page-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        {{ copied ? 'Copied' : 'Copy page' }}
      </button>
      <button
        type="button"
        class="copy-page-toggle"
        :aria-expanded="open"
        aria-haspopup="menu"
        aria-label="More ways to use this page"
        @click="open = !open"
      >
        <svg class="copy-page-icon copy-page-chevron" :class="{ 'is-open': open }" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </div>

    <div v-if="open" class="copy-page-menu" role="menu">
      <button type="button" class="copy-page-item" role="menuitem" @click="copy">
        <span class="copy-page-item-icon"><svg class="copy-page-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="14" height="14" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg></span>
        <span class="copy-page-item-text"><strong>Copy page</strong><small>Copy page as Markdown for LLMs</small></span>
      </button>
      <a class="copy-page-item" role="menuitem" :href="withBase(markdownPath)" target="_blank" rel="noopener">
        <span class="copy-page-item-icon"><svg class="copy-page-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M6 15V9l2.5 3L11 9v6M17 9v6M14.5 12.5 17 15l2.5-2.5" /></svg></span>
        <span class="copy-page-item-text"><strong>View as Markdown <span class="copy-page-arrow">↗</span></strong><small>View this page as plain text</small></span>
      </a>
      <a class="copy-page-item" role="menuitem" :href="chatgptUrl" target="_blank" rel="noopener">
        <span class="copy-page-item-icon"><svg class="copy-page-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 20.5 7.25v9.5L12 21.5l-8.5-4.75v-9.5z" /><path d="M12 8.5 15.25 10.25v3.5L12 15.5l-3.25-1.75v-3.5z" /></svg></span>
        <span class="copy-page-item-text"><strong>Open in ChatGPT <span class="copy-page-arrow">↗</span></strong><small>Ask questions about this page</small></span>
      </a>
      <a class="copy-page-item" role="menuitem" :href="claudeUrl" target="_blank" rel="noopener">
        <span class="copy-page-item-icon"><svg class="copy-page-icon copy-page-icon--fill" viewBox="0 0 24 24" aria-hidden="true"><path :d="siClaude.path" /></svg></span>
        <span class="copy-page-item-text"><strong>Open in Claude <span class="copy-page-arrow">↗</span></strong><small>Ask questions about this page</small></span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.copy-page {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

@media (min-width: 640px) {
  .copy-page {
    height: 0;
    margin-bottom: 0;
  }

  .copy-page-group {
    position: absolute;
    top: 2px;
    right: 0;
  }

  .copy-page-menu {
    top: 48px;
  }
}

.copy-page-group {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
}

.copy-page-main,
.copy-page-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  transition: background-color 0.2s;
}

.copy-page-toggle {
  padding: 6px 9px;
  border-left: 1px solid var(--vp-c-divider);
}

.copy-page-main:hover,
.copy-page-toggle:hover {
  background: var(--vp-c-default-soft);
}

.copy-page-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.copy-page-icon--fill {
  fill: currentColor;
  stroke: none;
}

.copy-page-chevron {
  transition: transform 0.2s;
}

.copy-page-chevron.is-open {
  transform: rotate(180deg);
}

.copy-page-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 30;
  display: grid;
  gap: 2px;
  width: 300px;
  padding: 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-3);
}

.copy-page-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 10px;
  text-align: left;
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: background-color 0.2s;
}

.copy-page-item:hover {
  background: var(--vp-c-default-soft);
}

.copy-page-item-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
  color: var(--vp-c-text-2);
}

.copy-page-item-text {
  display: grid;
  gap: 2px;
  line-height: 1.3;
}

.copy-page-item-text strong {
  font-size: 14px;
  font-weight: 600;
}

.copy-page-item-text small {
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}

.copy-page-arrow {
  font-weight: 400;
  color: var(--vp-c-text-3);
}
</style>
