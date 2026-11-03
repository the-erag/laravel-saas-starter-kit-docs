<script setup lang="ts">
import {
  siAlpinedotjs,
  siEslint,
  siIconify,
  siInertia,
  siLaravel,
  siLucide,
  siMysql,
  siPhp,
  siPrettier,
  siReact,
  siShadcnui,
  siSvelte,
  siTailwindcss,
  siTypescript,
  siVite,
  siVuedotjs,
  type SimpleIcon,
} from 'simple-icons';

// Livewire's current logo from livewire.laravel.com; Simple Icons still has the old one. The eye is cut out with evenodd.
const livewire = {
  hex: 'FF4D92',
  path: 'M22.2523 17.7161C21.8175 18.3734 21.4881 19.1829 20.6045 19.1829C19.1171 19.1829 19.0366 16.8893 17.548 16.8893C16.06 16.8893 16.1406 19.1829 14.6533 19.1829C13.1659 19.1829 13.0854 16.8893 11.5968 16.8893C10.1088 16.8893 10.1894 19.1829 8.70144 19.1829C7.21412 19.1829 7.13355 16.8893 5.64495 16.8893C4.15636 16.8893 4.2382 19.1829 2.74961 19.1829C2.28218 19.1829 1.95352 18.9566 1.67664 18.6458C0.571966 16.7147 -0.00618176 14.5274 5.19619e-05 12.3027C5.19619e-05 5.50742 5.24851 0 11.7228 0C18.1983 0 23.4461 5.50806 23.4461 12.3027C23.4461 14.2446 23.0164 16.0817 22.2523 17.7161ZM10.7651 14.3162C14.5028 14.3162 16.0762 12.0943 16.0762 8.93868C16.0762 5.78189 13.6991 2.87745 10.7651 2.87745C7.83224 2.87745 5.45455 5.78249 5.45455 8.93808C5.45455 12.0943 7.02737 14.3162 10.7651 14.3162ZM9.53721 9.83766C10.7368 9.83766 11.7094 8.76341 11.7094 7.43979C11.7094 6.11553 10.7374 5.04192 9.53721 5.04192C8.33763 5.04192 7.36506 6.11553 7.36506 7.43979C7.36506 8.76341 8.337 9.83766 9.53721 9.83766ZM9.17652 7.99291C9.77567 7.99291 10.2623 7.49735 10.2623 6.88669C10.2623 6.27476 9.77631 5.77984 9.17589 5.77984C8.5761 5.77984 8.08949 6.27476 8.08949 6.88605C8.08949 7.49735 8.57546 7.99291 9.17652 7.99291Z',
} as SimpleIcon;

// Spatie's square "S" mark from spatie.be (laravel-permission); it isn't in Simple Icons.
const spatie = {
  hex: '197593',
  path: 'M1.52 0.04c-0.662 0.144-1.22 0.64-1.424 1.268-0.1 0.312-0.094-0.354-0.09 10.742 0.002 5.686 0.012 10.37 0.022 10.408 0.126 0.528 0.426 0.968 0.846 1.236 0.194 0.124 0.386 0.202 0.676 0.28 0.034 0.008 4.708 0.018 10.39 0.02 11.116 0.004 10.434 0.01 10.758-0.094 0.262-0.084 0.564-0.276 0.768-0.49 0.212-0.22 0.388-0.528 0.478-0.84l0.046-0.16 0.004-10.37c0.004-6.396-0.002-10.396-0.014-10.44-0.01-0.038-0.032-0.128-0.05-0.2-0.068-0.262-0.24-0.57-0.442-0.782-0.286-0.304-0.524-0.446-0.968-0.574-0.1-0.03-1.036-0.032-10.47-0.036-9.994-0.004-10.366-0.004-10.53 0.032zm11.346 5.988c0.03 0.004 0.12 0.014 0.2 0.022 0.08 0.006 0.158 0.016 0.174 0.02 0.016 0.004 0.07 0.014 0.12 0.02 0.362 0.052 1.016 0.224 1.29 0.34 0.034 0.014 0.132 0.056 0.22 0.092 0.242 0.102 0.618 0.298 0.842 0.44 0.232 0.148 0.628 0.438 0.628 0.46 0 0.008-0.07 0.118-0.156 0.242-0.086 0.124-0.2 0.294-0.254 0.376-0.056 0.082-0.104 0.154-0.11 0.16-0.006 0.006-0.09 0.126-0.186 0.27-0.414 0.614-0.772 1.136-0.788 1.152-0.008 0.008-0.076-0.028-0.148-0.08-0.46-0.338-1.01-0.624-1.5-0.778-0.164-0.052-0.22-0.068-0.308-0.086-0.01-0.002-0.056-0.012-0.1-0.024-0.182-0.042-0.454-0.07-0.68-0.068-0.426 0.002-0.726 0.112-0.92 0.338-0.11 0.13-0.148 0.254-0.142 0.466 0.008 0.28 0.092 0.428 0.358 0.628 0.16 0.118 0.614 0.346 0.984 0.492 0.132 0.052 0.28 0.11 0.33 0.13 0.1 0.04 0.302 0.108 0.324 0.11 0.006-0 0.02 0.006 0.028 0.014 0.008 0.01 0.028 0.016 0.042 0.016 0.036-0 0.576 0.2 0.826 0.304 0.314 0.132 0.656 0.304 0.89 0.444 0.122 0.074 0.238 0.144 0.26 0.158 0.022 0.014 0.044 0.028 0.05 0.034 0.006 0.006 0.078 0.06 0.16 0.122 0.59 0.44 0.986 1.05 1.128 1.738 0.05 0.244 0.062 0.392 0.06 0.76 0 0.35-0.01 0.474-0.058 0.74-0.06 0.34-0.236 0.814-0.394 1.07-0.108 0.172-0.204 0.316-0.248 0.37-0.386 0.46-0.716 0.724-1.228 0.98-0.24 0.122-0.696 0.29-0.89 0.328-0.022 0.006-0.098 0.022-0.17 0.04-0.072 0.016-0.166 0.034-0.21 0.042-0.046 0.006-0.1 0.014-0.122 0.018-0.022 0.004-0.094 0.014-0.158 0.022-0.066 0.008-0.146 0.018-0.18 0.024-0.1 0.018-1.012 0.02-1.172 0.004-0.082-0.01-0.21-0.022-0.284-0.028-0.074-0.008-0.15-0.016-0.17-0.02-0.018-0.002-0.106-0.016-0.194-0.03-0.132-0.02-0.294-0.05-0.47-0.09-0.46-0.102-0.87-0.234-1.216-0.392-0.07-0.032-0.132-0.058-0.138-0.058-0.026-0-0.508-0.254-0.706-0.37-0.238-0.142-0.604-0.4-0.826-0.584l-0.152-0.124 0.188-0.256c0.104-0.14 0.196-0.266 0.206-0.276 0.022-0.03 0.268-0.362 0.314-0.43 0.284-0.402 0.884-1.2 0.902-1.2 0.014-0 0.032 0.01 0.038 0.02 0.026 0.042 0.478 0.368 0.706 0.508 0.684 0.424 1.276 0.648 1.964 0.742 0.284 0.038 0.772 0.024 0.962-0.028 0.32-0.088 0.55-0.256 0.656-0.48 0.046-0.098 0.052-0.136 0.052-0.322-0.002-0.252-0.038-0.348-0.196-0.502-0.262-0.258-0.666-0.448-1.804-0.85-1.944-0.684-2.868-1.368-3.258-2.412-0.05-0.13-0.13-0.428-0.144-0.532-0.03-0.234-0.038-0.354-0.036-0.634 0-0.378 0.028-0.686 0.076-0.846 0.006-0.02 0.014-0.056 0.02-0.084 0.004-0.028 0.032-0.126 0.062-0.218 0.314-0.982 1.022-1.72 2.048-2.134 0.406-0.166 0.93-0.284 1.396-0.32 0.096-0.006 0.178-0.016 0.182-0.018 0.01-0.008 0.968 0.008 1.03 0.018z',
} as SimpleIcon;

// Flux UI's logo mark from fluxui.dev (five rounded bars); it isn't in Simple Icons.
const fluxUi = {
  hex: '000000',
  path: 'M2.1 10.35a1.1 1.1 0 0 1 2.2 0v5.5a1.1 1.1 0 0 1 -2.2 0zM6.5 5.95a1.1 1.1 0 0 1 2.2 0v7.7a1.1 1.1 0 0 1 -2.2 0zM10.9 10.35a1.1 1.1 0 0 1 2.2 0v5.5a1.1 1.1 0 0 1 -2.2 0zM15.3 5.95a1.1 1.1 0 0 1 2.2 0v12.1a1.1 1.1 0 0 1 -2.2 0zM19.7 10.35a1.1 1.1 0 0 1 2.2 0v5.5a1.1 1.1 0 0 1 -2.2 0z',
} as SimpleIcon;

// Pest's "P" mark from pestphp.com; it isn't in Simple Icons.
const pest = {
  hex: 'F43F5E',
  path: 'M3.684 7.111 5.101 1H24l-3.259 14.056H8.142L6.3 23H0L3.259 8.945h12.599l.425-1.833z',
} as SimpleIcon;

const stack: { icon: SimpleIcon; name: string; viewBox?: string; fillRule?: 'evenodd' }[] = [
  { icon: siLaravel, name: 'Laravel' },
  { icon: siPhp, name: 'PHP' },
  { icon: siMysql, name: 'MySQL' },
  { icon: spatie, name: 'Spatie' },
  { icon: siInertia, name: 'Inertia' },
  { icon: siVuedotjs, name: 'Vue' },
  { icon: siReact, name: 'React' },
  { icon: siSvelte, name: 'Svelte' },
  { icon: livewire, name: 'Livewire', viewBox: '0 -2.1316 23.4461 23.4461', fillRule: 'evenodd' },
  { icon: siAlpinedotjs, name: 'Alpine.js' },
  { icon: siTailwindcss, name: 'Tailwind CSS' },
  { icon: siShadcnui, name: 'shadcn/ui' },
  { icon: fluxUi, name: 'Flux UI' },
  { icon: siLucide, name: 'Lucide' },
  { icon: siIconify, name: 'Iconify' },
  { icon: siTypescript, name: 'TypeScript' },
  { icon: siVite, name: 'Vite' },
  { icon: pest, name: 'Pest' },
  { icon: siEslint, name: 'ESLint' },
  { icon: siPrettier, name: 'Prettier' },
];

const color = (icon: SimpleIcon): string => (icon.hex === '000000' ? 'var(--vp-c-text-1)' : `#${icon.hex}`);
</script>

<template>
  <div class="hero-stack" aria-label="Built on the current Laravel stack">
    <div class="hero-stack-track">
      <ul v-for="copy in 4" :key="copy" class="hero-stack-copy" :aria-hidden="copy > 1 ? 'true' : undefined">
        <li v-for="item in stack" :key="item.name" class="hero-stack-cell" :style="{ '--brand': color(item.icon) }">
          <svg :viewBox="item.viewBox ?? '0 0 24 24'" role="img" aria-hidden="true">
            <path :d="item.icon.path" :fill-rule="item.fillRule" />
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
