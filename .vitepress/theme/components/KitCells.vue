<script setup lang="ts">
import { formatPrice, kits, plans, type FrameworkKey, type PlanKey } from '../../site';
import FrameworkLogo from './FrameworkLogo.vue';
import SlIcon from './SlIcon.vue';

const cells: { plan: PlanKey; title: string; stack: string; href: string; color: string; frameworks: FrameworkKey[] }[] = [
  {
    plan: 'vue',
    title: kits.vue.title,
    stack: 'Vue 3.5, TypeScript, Inertia 3, shadcn-vue',
    href: '/kits/vue.html',
    color: 'var(--sl-vue)',
    frameworks: ['vue'],
  },
  {
    plan: 'react',
    title: kits.react.title,
    stack: 'React 19, TypeScript, Inertia 3, shadcn/ui',
    href: '/kits/react.html',
    color: 'var(--sl-react)',
    frameworks: ['react'],
  },
  {
    plan: 'svelte',
    title: kits.svelte.title,
    stack: 'Svelte 5, TypeScript, Inertia 3, shadcn-svelte',
    href: '/kits/svelte.html',
    color: 'var(--sl-svelte)',
    frameworks: ['svelte'],
  },
  {
    plan: 'all-kits',
    title: plans['all-kits'].name,
    stack: 'Vue, React and Svelte together, one payment',
    href: plans['all-kits'].href,
    color: 'var(--vp-c-brand-1)',
    frameworks: [],
  },
];
</script>

<template>
  <div class="kit-cells">
    <a v-for="cell in cells" :key="cell.plan" class="kit-cell" :href="cell.href" :style="{ '--kit-color': cell.color }">
      <span class="kit-cube" aria-hidden="true">
        <svg class="kit-cube-frame" viewBox="0 0 48 48" fill="none">
          <path class="kit-cube-top" d="M6 15 L15 6 L42 6 L33 15 Z" />
          <path class="kit-cube-side" d="M33 15 L42 6 L42 33 L33 42 Z" />
          <rect class="kit-cube-front" x="6" y="15" width="27" height="27" rx="1.5" />
        </svg>
        <span class="kit-cube-logo">
          <FrameworkLogo v-if="cell.frameworks.length" :name="cell.frameworks[0]" :size="16" />
          <SlIcon v-else name="layers" :size="15" />
        </span>
      </span>
      <span class="kit-copy">
        <span class="kit-title">{{ cell.title }}</span>
        <span class="kit-stack">{{ cell.stack }}</span>
      </span>
      <span class="kit-price">{{ formatPrice(plans[cell.plan].price) }}</span>
      <span class="vpi-arrow-right kit-arrow" aria-hidden="true" />
    </a>
  </div>
</template>

<style scoped>
.kit-cells {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--sl-border);
  border-left: 1px solid var(--sl-border);
}

.kit-cell {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 26px 28px;
  border-right: 1px solid var(--sl-border);
  border-bottom: 1px solid var(--sl-border);
  color: inherit;
  text-decoration: none;
  transition: background-color 0.25s;
}

.kit-cell:hover {
  background: var(--sl-surface);
}

.kit-cube {
  position: relative;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.kit-cell:hover .kit-cube {
  transform: translateY(-3px) rotate(-2deg);
}

.kit-cube-frame {
  position: absolute;
  inset: 0;
  width: 48px;
  height: 48px;
  stroke: var(--kit-color);
  stroke-width: 1.2;
  stroke-linejoin: round;
}

.kit-cube-top {
  fill: color-mix(in srgb, var(--kit-color) 28%, transparent);
}

.kit-cube-side {
  fill: color-mix(in srgb, var(--kit-color) 40%, transparent);
}

.kit-cube-front {
  fill: color-mix(in srgb, var(--kit-color) 12%, var(--sl-surface));
}

.kit-cube-logo {
  position: absolute;
  top: 15px;
  left: 6px;
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  color: var(--kit-color);
}

.kit-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.kit-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.kit-stack {
  overflow: hidden;
  font-size: 13px;
  color: var(--vp-c-text-2);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kit-price {
  flex-shrink: 0;
  padding: 3px 10px;
  border: 1px solid var(--sl-border);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  background: var(--sl-surface);
}

.kit-arrow {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  color: var(--vp-c-text-3);
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity 0.25s, transform 0.25s;
}

.kit-cell:hover .kit-arrow {
  opacity: 1;
  transform: none;
}

@media (max-width: 760px) {
  .kit-cells {
    grid-template-columns: 1fr;
  }

  .kit-cell {
    padding: 20px;
  }

  .kit-arrow {
    display: none;
  }
}
</style>
