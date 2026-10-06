<script setup lang="ts">
// Icons are symbols in public/sprite.svg (one cached file), so each icon is a short <use> instead of
// repeating its SVG paths in the page HTML. To add an icon, add a <symbol id="i-<name>"> there and the name here.
export type IconName =
  | 'check'
  | 'arrow-right'
  | 'layers'
  | 'shield'
  | 'globe'
  | 'users'
  | 'database'
  | 'languages'
  | 'code'
  | 'zap'
  | 'refresh'
  | 'flask'
  | 'bot'
  | 'lock'
  | 'layout'
  | 'terminal'
  | 'wrench'
  | 'git'
  | 'key'
  | 'package'
  | 'search'
  | 'chevron-down'
  | 'server'
  | 'heart'
  | 'infinity'
  | 'calendar'
  | 'github'
  | 'linkedin'
  | 'x'
  | 'mail'
  | 'layout-grid'
  | 'building'
  | 'settings'
  | 'credit-card'
  | 'plug'
  | 'sun';

withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 20 });
</script>

<template>
  <svg
    class="sl-icon"
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <use :href="`/sprite.svg#i-${name}`" />
  </svg>
</template>

<style scoped>
.sl-icon {
  flex-shrink: 0;
}
</style>
