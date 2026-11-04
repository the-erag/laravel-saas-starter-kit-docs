<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { kits, type FrameworkKey } from '../../site';
import FrameworkLogo from './FrameworkLogo.vue';

// color: the kit's brand color, used for the glow and the active tab.
const screens: { kit: FrameworkKey; label: string; image: string; path: string; screen: string; color: string }[] = [
  { kit: 'vue', label: 'Vue', image: 'vue-tenant-show', path: 'tenants/1', screen: 'Tenant details', color: '#42b883' },
  { kit: 'react', label: 'React', image: 'react-bell', path: 'dashboard', screen: 'Notifications', color: '#58c4dc' },
  { kit: 'svelte', label: 'Svelte', image: 'svelte-menus', path: 'setup/menus', screen: 'Menu builder', color: '#ff3e00' },
  { kit: 'livewire', label: 'Livewire', image: 'livewire-users', path: 'users', screen: 'Users', color: '#fb70a9' },
];

const ROTATE_MS = 4500;

const active = ref(0);
const paused = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;

const select = (index: number) => {
  active.value = index;
  restart();
};

const restart = () => {
  clearInterval(timer);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  timer = setInterval(() => {
    if (!paused.value) active.value = (active.value + 1) % screens.length;
  }, ROTATE_MS);
};

onMounted(restart);
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <div
    class="showcase"
    :style="{ '--kit': screens[active].color }"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
  >
    <div class="window" :class="{ 'window--paused': paused }" :style="{ '--rotate': `${ROTATE_MS}ms` }">
      <div class="window-tabs" role="tablist" aria-label="Starter kit previews">
        <span class="window-dots" aria-hidden="true"><i /><i /><i /></span>
        <button
          v-for="(item, index) in screens"
          :key="item.kit"
          type="button"
          role="tab"
          class="window-tab"
          :class="{ 'is-active': index === active }"
          :aria-selected="index === active"
          @click="select(index)"
        >
          <FrameworkLogo :name="item.kit" :size="15" />
          <span>{{ item.label }}</span>
          <i v-if="index === active" :key="active" class="window-tab-progress" aria-hidden="true" />
        </button>
      </div>

      <div class="window-address">
        <span class="window-lock" aria-hidden="true" />
        <span class="window-url">
          <Transition name="url" mode="out-in">
            <span :key="active">saas.test/{{ screens[active].path }}</span>
          </Transition>
        </span>
      </div>

      <div class="window-body">
        <figure
          v-for="(item, index) in screens"
          :key="item.image"
          class="window-screen"
          :class="{ 'is-active': index === active }"
          :aria-hidden="index !== active"
        >
          <img
            class="window-img window-img--light"
            :src="`/screenshots/${item.image}-light.webp`"
            :alt="`${kits[item.kit].title}: ${item.screen} screen`"
            width="2880"
            height="1800"
            :fetchpriority="index === 0 ? 'high' : 'auto'"
            :loading="index === 0 ? 'eager' : 'lazy'"
            decoding="async"
          />
          <img
            class="window-img window-img--dark"
            :src="`/screenshots/${item.image}-dark.webp`"
            :alt="`${kits[item.kit].title}: ${item.screen} screen`"
            width="2880"
            height="1800"
            loading="lazy"
            decoding="async"
          />
        </figure>
      </div>
    </div>
  </div>
</template>

<style scoped>
.showcase {
  position: relative;
}

/* Glow behind the window, tinted with the active kit's color. */
.showcase::before {
  content: '';
  position: absolute;
  inset: 6% 4% -2%;
  border-radius: 48px;
  background: radial-gradient(60% 60% at 70% 30%, var(--kit), transparent 70%),
    radial-gradient(60% 60% at 25% 80%, #6366f1, transparent 70%);
  filter: blur(60px);
  opacity: 0.35;
  transition: background 0.8s;
  pointer-events: none;
}

.window {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--sl-border-strong);
  border-radius: 18px;
  background: var(--sl-surface);
  box-shadow: var(--sl-shadow-lg), 0 0 0 6px rgba(99, 102, 241, 0.06);
}

.window-tabs {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 6px 10px 0;
  background: var(--vp-c-bg-soft);
}

.window-dots {
  display: inline-flex;
  align-self: center;
  gap: 6px;
  margin-right: 10px;
  padding-bottom: 5px;
}

.window-dots i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--sl-border-strong);
}

.window-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 6px 14px 7px;
  border: 1px solid transparent;
  border-bottom: 0;
  border-radius: 12px 12px 0 0;
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition:
    color 0.2s,
    background-color 0.2s;
}

.window-tab:hover {
  color: var(--vp-c-text-1);
}

.window-tab:not(.is-active) :deep(svg) {
  filter: grayscale(1);
  opacity: 0.6;
  transition: filter 0.2s, opacity 0.2s;
}

.window-tab:hover :deep(svg) {
  filter: none;
  opacity: 1;
}

.window-tab.is-active {
  border-color: var(--sl-border);
  background: var(--sl-surface);
  color: var(--vp-c-text-1);
}

/* Shows how long until the next kit. */
.window-tab-progress {
  position: absolute;
  top: -1px;
  left: 10px;
  right: 10px;
  height: 2px;
  border-radius: 2px;
  background: var(--kit);
  transform-origin: left;
  animation: tab-progress var(--rotate) linear;
}

.window--paused .window-tab-progress {
  animation-play-state: paused;
}

@keyframes tab-progress {
  from {
    transform: scaleX(0);
  }

  to {
    transform: scaleX(1);
  }
}

.window-address {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 5px 12px;
  border-top: 1px solid var(--sl-border);
  border-bottom: 1px solid var(--sl-border);
  background: var(--sl-surface);
}

.window-lock {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--sl-success);
  box-shadow: 0 0 0 3px var(--sl-success-soft);
}

.window-url {
  flex: 1;
  overflow: hidden;
  padding: 2px 12px;
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 18px;
  color: var(--vp-c-text-2);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.url-enter-active,
.url-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}

.url-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.url-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Screenshots are 16:10; they stack and cross-fade inside this box. */
.window-body {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
}

.window-screen {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  transform: translateY(10px) scale(0.99);
  transition:
    opacity 0.5s ease,
    transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.window-screen.is-active {
  opacity: 1;
  transform: none;
}

.window-img {
  display: block;
  width: 100%;
  height: auto;
}

.window-img--dark {
  display: none;
}

@media (max-width: 560px) {
  .window-dots {
    display: none;
  }

  .window-tabs {
    padding: 8px 8px 0;
    gap: 2px;
  }

  .window-tab {
    flex: 1;
    justify-content: center;
    padding: 8px 6px 9px;
    font-size: 12px;
  }

  .window-tab:not(.is-active) span {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .window-screen,
  .url-enter-active,
  .url-leave-active {
    transition: none;
  }

  .window-tab-progress {
    display: none;
  }
}
</style>

<style>
.dark .showcase .window-img--light {
  display: none;
}

.dark .showcase .window-img--dark {
  display: block;
}
</style>
