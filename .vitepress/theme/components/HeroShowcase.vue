<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { kits, type FrameworkKey } from '../../site';
import FrameworkLogo from './FrameworkLogo.vue';

const layers: { kit: FrameworkKey; image: string; path: string; screen: string }[] = [
  { kit: 'vue', image: 'vue-tenant-show', path: 'tenants/1', screen: 'Tenant details' },
  { kit: 'react', image: 'react-bell', path: 'dashboard', screen: 'Notifications' },
  { kit: 'svelte', image: 'svelte-menus', path: 'setup/menus', screen: 'Menu builder' },
];

const active = ref(0);
const paused = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;

const position = (index: number) => {
  const offset = (index - active.value + layers.length) % layers.length;

  return offset === 0 ? 'front' : offset === 1 ? 'middle' : 'back';
};

const select = (index: number) => {
  active.value = index;
};

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  timer = setInterval(() => {
    if (!paused.value) {
      active.value = (active.value + 1) % layers.length;
    }
  }, 4500);
});

onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <div class="showcase" @mouseenter="paused = true" @mouseleave="paused = false">
    <div class="stage">
      <figure
        v-for="(layer, index) in layers"
        :key="layer.image"
        class="layer"
        :class="`layer--${position(index)}`"
        @click="select(index)"
      >
        <div class="layer-bar">
          <span class="layer-dots" aria-hidden="true"><i /><i /><i /></span>
          <span class="layer-kit">
            <FrameworkLogo :name="layer.kit" :size="14" />
            {{ kits[layer.kit].title }}
          </span>
          <span class="layer-url">{{ layer.kit }}.test/{{ layer.path }}</span>
        </div>
        <img
          class="layer-img layer-img--light"
          :src="`/screenshots/${layer.image}-light.webp`"
          :alt="`${kits[layer.kit].title}: ${layer.screen} screen`"
          width="2880"
          height="1800"
          :fetchpriority="index === 0 ? 'high' : 'auto'"
          :loading="index === 0 ? 'eager' : 'lazy'"
          decoding="async"
        />
        <img
          class="layer-img layer-img--dark"
          :src="`/screenshots/${layer.image}-dark.webp`"
          :alt="`${kits[layer.kit].title}: ${layer.screen} screen`"
          width="2880"
          height="1800"
          loading="lazy"
          decoding="async"
        />
      </figure>
    </div>

  </div>
</template>

<style scoped>
.showcase {
  position: relative;
  perspective: 2200px;
}

.stage {
  position: relative;
  height: 560px;
  transform-style: preserve-3d;
}

.layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 640px;
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--sl-border-strong);
  border-radius: 14px;
  background: var(--sl-surface);
  cursor: pointer;
  box-shadow: 0 30px 60px -24px rgba(15, 23, 42, 0.4), 0 12px 24px -12px rgba(15, 23, 42, 0.25);
  transform-origin: top left;
  transition:
    transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1),
    opacity 0.7s,
    filter 0.7s;
}

.layer--front {
  z-index: 3;
  transform: translate3d(0, 96px, 0) rotateX(6deg) rotateY(-10deg) rotateZ(2deg);
}

.layer--middle {
  z-index: 2;
  opacity: 0.92;
  filter: saturate(0.9);
  transform: translate3d(70px, 44px, -60px) rotateX(6deg) rotateY(-10deg) rotateZ(2deg);
}

.layer--back {
  z-index: 1;
  opacity: 0.8;
  filter: saturate(0.8);
  transform: translate3d(140px, -8px, -120px) rotateX(6deg) rotateY(-10deg) rotateZ(2deg);
}

.layer-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--sl-border);
  background: var(--vp-c-bg-soft);
  font-size: 12px;
}

.layer-dots {
  display: inline-flex;
  gap: 5px;
}

.layer-dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--sl-border-strong);
}

.layer-kit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px 2px 6px;
  border: 1px solid var(--sl-border);
  border-radius: 999px;
  background: var(--sl-surface);
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
}

.layer-url {
  overflow: hidden;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-img {
  display: block;
  width: 100%;
  height: auto;
}

.layer-img--dark {
  display: none;
}

@media (max-width: 960px) {
  .stage {
    height: 580px;
  }
}

@media (max-width: 560px) {
  .stage {
    height: 380px;
  }

  .layer {
    width: 100%;
  }

  .layer--front {
    transform: translate3d(0, 70px, 0) rotateX(4deg) rotateY(-6deg) rotateZ(1deg);
  }

  .layer--middle {
    transform: translate3d(18px, 36px, -40px) rotateX(4deg) rotateY(-6deg) rotateZ(1deg);
  }

  .layer--back {
    transform: translate3d(36px, 2px, -80px) rotateX(4deg) rotateY(-6deg) rotateZ(1deg);
  }

  .layer-url {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .layer {
    transition: none;
  }
}
</style>

<style>
.dark .showcase .layer-img--light {
  display: none;
}

.dark .showcase .layer-img--dark {
  display: block;
}
</style>
