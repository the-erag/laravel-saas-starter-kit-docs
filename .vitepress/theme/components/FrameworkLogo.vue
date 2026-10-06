<script setup lang="ts">
// The logos are symbols in public/sprite.svg (one cached file) instead of inline SVG in every page.
const props = withDefaults(defineProps<{ name: 'vue' | 'react' | 'svelte' | 'laravel'; size?: number; color?: string }>(), {
  size: 32,
  color: '#ff2d20',
});

const labels = { vue: 'Vue', react: 'React', svelte: 'Svelte', laravel: 'Laravel' };
</script>

<template>
  <svg
    class="fw-logo"
    :class="`fw-${props.name}`"
    :width="size"
    :height="size"
    role="img"
    :aria-label="labels[props.name]"
    :style="props.name === 'laravel' ? { '--fw-laravel': color } : undefined"
  >
    <use :href="`/sprite.svg#fw-${props.name}`" width="100%" height="100%" />
  </svg>
</template>

<style scoped>
.fw-logo {
  display: block;
  flex-shrink: 0;
}

.dark .fw-vue {
  --fw-vue-inner: #cbd5e1;
}

.fw-react {
  color: #087ea4;
}

.dark .fw-react {
  color: #58c4dc;
}
</style>
