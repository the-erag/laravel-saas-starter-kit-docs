<!--
  A real screenshot from /public/screenshots, in light and dark, lazy-loaded.
  `name` is the file name without the theme and size, for example "vue-notifications".
  Only the image for the current theme is shown, and hidden lazy images aren't downloaded.
-->
<script setup lang="ts">
defineProps<{ name: string; alt: string; caption?: string }>();

const srcset = (name: string, theme: string) =>
  `/screenshots/${name}-${theme}-800.webp 800w, /screenshots/${name}-${theme}-1440.webp 1440w`;
</script>

<template>
  <figure class="doc-shot">
    <div class="doc-shot-frame">
      <img
        v-for="theme in ['light', 'dark']"
        :key="theme"
        :class="`doc-shot-img doc-shot-${theme}`"
        :src="`/screenshots/${name}-${theme}-1440.webp`"
        :srcset="srcset(name, theme)"
        sizes="(max-width: 768px) calc(100vw - 48px), 688px"
        width="1440"
        height="900"
        loading="lazy"
        decoding="async"
        :alt="alt"
      />
    </div>
    <figcaption v-if="caption" class="doc-shot-caption">{{ caption }}</figcaption>
  </figure>
</template>

<style>
.doc-shot {
  margin: 20px 0 28px;
}

.doc-shot-frame {
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.doc-shot-img {
  display: block;
  width: 100%;
  height: auto;
}

html:not(.dark) .doc-shot-dark,
html.dark .doc-shot-light {
  display: none;
}

.doc-shot-caption {
  margin-top: 8px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  text-align: center;
}
</style>
