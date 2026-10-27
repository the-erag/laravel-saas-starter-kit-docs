<script setup lang="ts">
import { siInertia } from 'simple-icons';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { frameworkKeys, kits } from '../../site';
import FrameworkLogo from './FrameworkLogo.vue';
import SectionHeading from './SectionHeading.vue';
import SlIcon, { type IconName } from './SlIcon.vue';

const modules: { name: string; icon: IconName }[] = [
  { name: 'Auth', icon: 'lock' },
  { name: 'Dashboard', icon: 'layout-grid' },
  { name: 'Menu', icon: 'layout' },
  { name: 'RolePermission', icon: 'shield' },
  { name: 'Settings', icon: 'settings' },
  { name: 'Tenant', icon: 'building' },
  { name: 'User', icon: 'users' },
];
const sharedProps = ['auth', 'locale', 'languages', 'menus', 'layout', 'flash'];

const TOP_HEIGHT = 48;
const SPLIT_HEIGHT = 56;
const CYCLE = 3600;
const DASH = 22;

const diagram = ref<HTMLElement | null>(null);
const split = ref<HTMLElement | null>(null);
const width = ref(0);
const targets = ref<number[]>([]);
const topPhase = ref(-1);
const stemPhase = ref(-1);
const splitPhase = ref(-1);

const dashOffset = (length: number, phase: number): number => {
  if (phase < 0) {
    return DASH;
  }

  if (phase > 1) {
    return -length - DASH;
  }

  return DASH - phase * (length + DASH);
};

const center = computed(() => width.value / 2);

const junction = SPLIT_HEIGHT / 2;

const stem = computed(() => ({ d: `M ${center.value} 0 V ${junction}`, length: junction }));

const branches = computed(() =>
  frameworkKeys.map((key, index) => {
    const x = targets.value[index] ?? center.value;
    const d = Math.abs(x - center.value) < 1 ? `M ${center.value} ${junction} V ${SPLIT_HEIGHT}` : `M ${center.value} ${junction} H ${x} V ${SPLIT_HEIGHT}`;
    const length = Math.abs(x - center.value) + (SPLIT_HEIGHT - junction);

    return { key, d, length };
  }),
);

let frame = 0;
let start = 0;
let visible = true;
let resizeObserver: ResizeObserver | null = null;
let intersectionObserver: IntersectionObserver | null = null;

const measure = (): void => {
  if (!split.value || !diagram.value) {
    return;
  }

  const box = split.value.getBoundingClientRect();
  width.value = box.width;
  targets.value = Array.from(diagram.value.querySelectorAll<HTMLElement>('.tier--front')).map((card) => {
    const rect = card.getBoundingClientRect();

    return rect.left + rect.width / 2 - box.left;
  });
};

const tick = (now: number): void => {
  const progress = ((now - start) % CYCLE) / CYCLE;
  const clamp = (value: number): number => Math.min(Math.max(value, 0), 1);
  const topProgress = clamp(progress / 0.36);
  const ease = (value: number): number => (value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2);

  topPhase.value = progress <= 0.38 ? ease(topProgress) : 2;
  stemPhase.value = progress < 0.4 ? -1 : progress <= 0.54 ? clamp((progress - 0.4) / 0.12) : 2;
  splitPhase.value = progress < 0.52 ? -1 : progress <= 0.94 ? ease(clamp((progress - 0.52) / 0.4)) : 2;

  frame = visible ? requestAnimationFrame(tick) : 0;
};

onMounted(() => {
  measure();

  resizeObserver = new ResizeObserver(measure);

  if (diagram.value) {
    resizeObserver.observe(diagram.value);
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    topPhase.value = 2;
    stemPhase.value = 2;
    splitPhase.value = 2;

    return;
  }

  intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;

    if (visible && !frame) {
      frame = requestAnimationFrame(tick);
    }
  });

  if (diagram.value) {
    intersectionObserver.observe(diagram.value);
  }

  start = performance.now();
  frame = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();
});
</script>

<template>
  <section id="starter-kits" class="sl-section sl-section--muted">
    <div class="sl-container">
      <SectionHeading
        eyebrow="Architecture"
        title="Three frameworks. One backend."
        lead="The Laravel code is identical in every kit. Only resources/js changes, so you learn the backend once and can switch frontends whenever you like."
      />
      <div ref="diagram" class="diagram">
        <div class="tier tier--backend">
          <div class="tier-head">
            <span class="tier-logo"><FrameworkLogo name="laravel" :size="24" /></span>
            <div class="tier-heading">
              <strong>Laravel 13 backend</strong>
              <span>Identical in all three kits</span>
            </div>
            <span class="tier-badge">Same code</span>
          </div>
          <div class="tier-modules">
            <div class="tier-label"><SlIcon name="layers" :size="13" />Modules/</div>
            <div class="chips">
              <span v-for="module in modules" :key="module.name" class="chip chip--module"><SlIcon :name="module.icon" :size="13" />{{ module.name }}</span>
            </div>
          </div>
        </div>

        <div class="flow" aria-hidden="true">
          <svg class="flow-svg flow-svg--top" :viewBox="`0 0 12 ${TOP_HEIGHT}`" width="12" :height="TOP_HEIGHT">
            <path class="flow-path" :d="`M 6 0 V ${TOP_HEIGHT}`" />
            <path
              class="flow-dash"
              :d="`M 6 0 V ${TOP_HEIGHT}`"
              :stroke-dasharray="`${DASH} ${TOP_HEIGHT + DASH * 2}`"
              :stroke-dashoffset="dashOffset(TOP_HEIGHT, topPhase)"
            />
          </svg>
        </div>

        <div class="tier tier--bridge">
          <span class="bridge-shine" aria-hidden="true" />
          <div class="bridge-title">
            <svg viewBox="0 0 24 24" class="bridge-logo" aria-hidden="true"><path :d="siInertia.path" /></svg>
            <strong>Inertia v3</strong>
          </div>
          <span class="bridge-text">Server-side routing and shared props on every page</span>
          <div class="chips chips--center">
            <code v-for="prop in sharedProps" :key="prop">{{ prop }}</code>
          </div>
        </div>

        <div ref="split" class="flow flow--split" aria-hidden="true">
          <svg v-if="width" class="flow-svg" :viewBox="`0 0 ${width} ${SPLIT_HEIGHT}`" :width="width" :height="SPLIT_HEIGHT">
            <path class="flow-path" :d="stem.d" />
            <path
              class="flow-dash"
              :d="stem.d"
              :stroke-dasharray="`${DASH} ${stem.length + DASH * 2}`"
              :stroke-dashoffset="dashOffset(stem.length, stemPhase)"
            />
            <path v-for="branch in branches" :key="`line-${branch.key}`" class="flow-path" :class="`flow-path--${branch.key}`" :d="branch.d" />
            <path
              v-for="branch in branches"
              :key="`dash-${branch.key}`"
              class="flow-dash"
              :class="`flow-dash--${branch.key}`"
              :d="branch.d"
              :stroke-dasharray="`${DASH} ${branch.length + DASH * 2}`"
              :stroke-dashoffset="dashOffset(branch.length, splitPhase)"
            />
          </svg>
        </div>

        <div class="frontends">
          <a v-for="key in frameworkKeys" :key="key" :href="`/kits/${key}.html`" class="tier tier--front" :class="`tier--${key}`">
            <span class="front-logo"><FrameworkLogo :name="key" :size="26" /></span>
            <strong>{{ kits[key].name }}</strong>
            <span class="front-ui">{{ kits[key].stack[2].value }}</span>
            <code class="front-path">resources/js</code>
            <span class="front-link">View kit <span class="vpi-arrow-right" /></span>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.diagram {
  max-width: 900px;
  margin: 0 auto;
}

.tier {
  position: relative;
  border: 1px solid var(--sl-border);
  border-radius: var(--sl-radius);
  background: var(--sl-surface);
  box-shadow: var(--sl-shadow);
}

.tier--backend {
  overflow: hidden;
  padding: 24px 26px 26px;
}

.tier--backend::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 140px;
  background: radial-gradient(60% 100% at 0% 0%, rgba(255, 45, 32, 0.09), transparent 70%);
  pointer-events: none;
}

.tier-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
}

.tier-logo {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 1px solid rgba(255, 45, 32, 0.2);
  border-radius: 12px;
  background: rgba(255, 45, 32, 0.08);
}

.tier-heading {
  flex: 1;
  min-width: 0;
}

.tier-heading strong {
  display: block;
  font-size: 17px;
  color: var(--vp-c-text-1);
}

.tier-heading span {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.tier-badge {
  flex-shrink: 0;
  padding: 4px 10px;
  border: 1px solid var(--sl-border);
  border-radius: 999px;
  background: var(--sl-surface-muted);
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.tier-modules {
  position: relative;
}

.tier-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chips--center {
  justify-content: center;
}

.chip--module {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border: 1px solid var(--sl-border-strong);
  border-radius: 8px;
  font-weight: 500;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

.flow {
  position: relative;
  display: flex;
  justify-content: center;
  height: 48px;
}

.flow--split {
  display: block;
  height: 56px;
}

.flow-svg {
  display: block;
  overflow: visible;
}

.flow-path {
  fill: none;
  stroke: var(--sl-border-strong);
  stroke-width: 2;
}

.flow-dash {
  fill: none;
  stroke: var(--vp-c-brand-1);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 3px var(--vp-c-brand-1));
}

.flow-path--vue {
  stroke: color-mix(in srgb, var(--sl-vue) 55%, transparent);
}

.flow-path--react {
  stroke: color-mix(in srgb, var(--sl-react) 55%, transparent);
}

.flow-path--svelte {
  stroke: color-mix(in srgb, var(--sl-svelte) 55%, transparent);
}

.flow-dash--vue {
  stroke: var(--sl-vue);
  filter: drop-shadow(0 0 3px var(--sl-vue));
}

.flow-dash--react {
  stroke: var(--sl-react);
  filter: drop-shadow(0 0 3px var(--sl-react));
}

.flow-dash--svelte {
  stroke: var(--sl-svelte);
  filter: drop-shadow(0 0 3px var(--sl-svelte));
}

.tier--bridge {
  display: flex;
  overflow: hidden;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 22px 20px;
  text-align: center;
  background: var(--sl-gradient);
  border: 0;
  color: #fff;
  box-shadow: 0 18px 44px -16px rgba(99, 102, 241, 0.75);
}

.bridge-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.18) 50%, transparent 70%);
  transform: translateX(-100%);
  animation: bridge-shine 5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes bridge-shine {
  0%,
  55% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(100%);
  }
}

.bridge-title {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
}

.bridge-logo {
  width: 22px;
  height: 22px;
  fill: #fff;
}

.bridge-title strong {
  font-size: 19px;
}

.bridge-text {
  position: relative;
  font-size: 13px;
  opacity: 0.88;
}

.tier--bridge .chips {
  position: relative;
}

.tier--bridge code {
  padding: 4px 9px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.14);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: #fff;
}

.frontends {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.tier--front {
  display: flex;
  overflow: hidden;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 26px 16px 22px;
  text-align: center;
  text-decoration: none;
  transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
}

.tier--front::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: var(--front-color);
}

.tier--front:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--front-color) 45%, transparent);
  box-shadow: 0 20px 40px -20px color-mix(in srgb, var(--front-color) 70%, transparent);
}

.tier--vue {
  --front-color: var(--sl-vue);
}

.tier--react {
  --front-color: var(--sl-react);
}

.tier--svelte {
  --front-color: var(--sl-svelte);
}

.front-logo {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin-bottom: 6px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--front-color) 12%, transparent);
  transition: transform 0.25s;
}

.tier--front:hover .front-logo {
  transform: scale(1.08);
}

.tier--front strong {
  font-size: 16px;
  color: var(--vp-c-text-1);
}

.front-ui {
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}

.front-path {
  margin-top: 6px;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--sl-surface-muted);
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  color: var(--vp-c-text-3);
}

.front-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--front-color);
  transition: gap 0.25s;
}

.front-link .vpi-arrow-right {
  width: 14px;
  height: 14px;
}

.tier--front:hover .front-link {
  gap: 8px;
}

@media (prefers-reduced-motion: reduce) {
  .bridge-shine {
    display: none;
  }
}

@media (max-width: 760px) {
  .tier-badge {
    display: none;
  }
}

@media (max-width: 640px) {
  .frontends {
    gap: 8px;
  }

  .tier--front {
    padding: 18px 8px 14px;
  }

  .front-ui,
  .front-path,
  .front-link {
    display: none;
  }
}
</style>
