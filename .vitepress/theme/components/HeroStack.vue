<script setup lang="ts">
import { onMounted, ref } from 'vue';

// The logos are symbols in public/sprite.svg (st-<id>), so the HTML holds each one only as a short <use>.
// The colours are the brand colours from Simple Icons and each project's own site; black logos follow the text colour.
const stack: { id: string; name: string; hex: string }[] = [
  { id: 'laravel', name: 'Laravel', hex: 'FF2D20' },
  { id: 'php', name: 'PHP', hex: '777BB4' },
  { id: 'mysql', name: 'MySQL', hex: '4479A1' },
  { id: 'spatie', name: 'Spatie', hex: '197593' },
  { id: 'inertia', name: 'Inertia', hex: '9553E9' },
  { id: 'vue', name: 'Vue', hex: '4FC08D' },
  { id: 'react', name: 'React', hex: '61DAFB' },
  { id: 'svelte', name: 'Svelte', hex: 'FF3E00' },
  { id: 'livewire', name: 'Livewire', hex: 'FF4D92' },
  { id: 'alpine', name: 'Alpine.js', hex: '8BC0D0' },
  { id: 'tailwind', name: 'Tailwind CSS', hex: '06B6D4' },
  { id: 'shadcn', name: 'shadcn/ui', hex: '000000' },
  { id: 'flux', name: 'Flux UI', hex: '000000' },
  { id: 'lucide', name: 'Lucide', hex: 'F56565' },
  { id: 'iconify', name: 'Iconify', hex: '026C9C' },
  { id: 'typescript', name: 'TypeScript', hex: '3178C6' },
  { id: 'vite', name: 'Vite', hex: '9135FF' },
  { id: 'pest', name: 'Pest', hex: 'F43F5E' },
  { id: 'eslint', name: 'ESLint', hex: '4B32C3' },
  { id: 'prettier', name: 'Prettier', hex: 'F7B93E' },
];

const color = (hex: string): string => (hex === '000000' ? 'var(--vp-c-text-1)' : `#${hex}`);

// The server renders the list once; the browser adds the copies the endless loop needs and then starts it.
const copies = ref(1);

onMounted(() => {
  copies.value = 4;
});
</script>

<template>
  <div class="hero-stack" aria-label="Built on the current Laravel stack">
    <div class="hero-stack-track" :class="{ 'is-ready': copies > 1 }">
      <ul v-for="copy in copies" :key="copy" class="hero-stack-copy" :aria-hidden="copy > 1 ? 'true' : undefined">
        <li v-for="item in stack" :key="item.id" class="hero-stack-cell" :style="{ '--brand': color(item.hex) }">
          <svg role="img" aria-hidden="true">
            <use :href="`/sprite.svg#st-${item.id}`" />
          </svg>
          <span>{{ item.name }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.hero-stack {
  flex: 1;
  align-self: stretch;
  min-width: 0;
  overflow: hidden;
}

.hero-stack-track {
  display: flex;
  height: 100%;
  width: max-content;
}

.hero-stack-track.is-ready {
  animation: hero-stack-scroll 50s linear infinite;
}

.hero-stack:hover .hero-stack-track {
  animation-play-state: paused;
}

.hero-stack-copy {
  display: flex;
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.hero-stack-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 40px;
  border-left: 1px solid var(--sl-border);
  color: var(--vp-c-text-1);
  opacity: 0.7;
  white-space: nowrap;
  transition: opacity 0.25s, background-color 0.25s;
}

.hero-stack-cell:hover {
  opacity: 1;
  background: var(--sl-surface-muted);
}

.hero-stack-cell svg {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  fill: currentColor;
  transition: fill 0.25s;
}

.hero-stack-cell:hover svg {
  fill: var(--brand);
}

.hero-stack-cell span {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

@keyframes hero-stack-scroll {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-25%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-stack-track {
    animation: none;
  }
}
</style>
