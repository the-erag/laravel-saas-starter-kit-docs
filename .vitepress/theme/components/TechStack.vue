<script setup lang="ts">
import {
  siInertia,
  siLaravel,
  siPhp,
  siReact,
  siShadcnui,
  siSvelte,
  siTailwindcss,
  siTypescript,
  siVite,
  siVuedotjs,
  type SimpleIcon,
} from 'simple-icons';

const logos: { icon: SimpleIcon; name: string; version?: string }[] = [
  { icon: siLaravel, name: 'Laravel', version: '13' },
  { icon: siPhp, name: 'PHP', version: '8.4+' },
  { icon: siInertia, name: 'Inertia', version: 'v3' },
  { icon: siVuedotjs, name: 'Vue', version: '3.5' },
  { icon: siReact, name: 'React', version: '19' },
  { icon: siSvelte, name: 'Svelte', version: '5' },
  { icon: siTypescript, name: 'TypeScript' },
  { icon: siTailwindcss, name: 'Tailwind CSS', version: 'v4' },
  { icon: siVite, name: 'Vite', version: '8' },
  { icon: siShadcnui, name: 'shadcn/ui' },
];

const brand = (icon: SimpleIcon): string => (icon.hex === '000000' ? 'var(--vp-c-text-1)' : `#${icon.hex}`);
</script>

<template>
  <section class="stack" aria-labelledby="tech-stack-title">
    <div class="sl-container">
      <p id="tech-stack-title" class="stack-title">Built on the current Laravel stack</p>

      <div class="marquee">
        <ul class="marquee-track">
          <li
            v-for="(logo, index) in [...logos, ...logos]"
            :key="`${logo.name}-${index}`"
            class="logo"
            :style="{ '--brand': brand(logo.icon) }"
            :aria-hidden="index >= logos.length ? 'true' : undefined"
          >
            <svg class="logo-icon" role="img" viewBox="0 0 24 24" aria-hidden="true">
              <path :d="logo.icon.path" />
            </svg>
            <span class="logo-name">{{ logo.name }}</span>
            <span v-if="logo.version" class="logo-version">{{ logo.version }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stack {
  padding: 40px 0 44px;
  border-top: 1px solid var(--sl-border);
  border-bottom: 1px solid var(--sl-border);
  background: var(--sl-surface-muted);
}

.stack-title {
  margin-bottom: 28px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.marquee {
  overflow: hidden;
  mask-image: linear-gradient(to right, transparent, #000 12%, #000 88%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, #000 12%, #000 88%, transparent);
}

.marquee-track {
  display: flex;
  gap: 56px;
  width: max-content;
  margin: 0;
  padding: 0 28px;
  list-style: none;
  animation: stack-scroll 45s linear infinite;
}

.marquee:hover .marquee-track {
  animation-play-state: paused;
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--vp-c-text-3);
  white-space: nowrap;
  transition: color 0.25s;
}

.logo:hover {
  color: var(--vp-c-text-1);
}

.logo-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  fill: currentColor;
  transition: fill 0.25s;
}

.logo:hover .logo-icon {
  fill: var(--brand);
}

.logo-name {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.logo-version {
  font-size: 15px;
  font-weight: 500;
  opacity: 0.7;
}

@keyframes stack-scroll {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .marquee {
    overflow-x: auto;
  }

  .marquee-track {
    animation: none;
  }
}
</style>
