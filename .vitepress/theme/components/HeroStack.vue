<script setup lang="ts">
import {
  siInertia,
  siLaravel,
  siPhp,
  siShadcnui,
  siTailwindcss,
  siTypescript,
  siVite,
  type SimpleIcon,
} from 'simple-icons';

const stack: { icon: SimpleIcon; name: string }[] = [
  { icon: siLaravel, name: 'Laravel' },
  { icon: siPhp, name: 'PHP' },
  { icon: siInertia, name: 'Inertia' },
  { icon: siTypescript, name: 'TypeScript' },
  { icon: siTailwindcss, name: 'Tailwind CSS' },
  { icon: siVite, name: 'Vite' },
  { icon: siShadcnui, name: 'shadcn/ui' },
];

const color = (icon: SimpleIcon): string => (icon.hex === '000000' ? 'var(--vp-c-text-1)' : `#${icon.hex}`);
</script>

<template>
  <div class="hero-stack" aria-label="Built on the current Laravel stack">
    <div class="hero-stack-track">
      <ul v-for="copy in 4" :key="copy" class="hero-stack-copy" :aria-hidden="copy > 1 ? 'true' : undefined">
        <li v-for="item in stack" :key="item.name" class="hero-stack-cell" :style="{ '--brand': color(item.icon) }">
          <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
            <path :d="item.icon.path" />
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
