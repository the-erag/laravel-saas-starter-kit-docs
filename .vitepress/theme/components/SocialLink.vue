<script lang="ts" setup>
// Replaces VitePress's VPSocialLink (see the alias in config.mts). Same markup and behaviour, plus a
// visually hidden text label, so crawlers do not report the icon links as "links with no anchor text".
import type { DefaultTheme } from 'vitepress/theme';
import { computed, nextTick, onMounted, ref, useSSRContext } from 'vue';

const props = defineProps<{
  icon: DefaultTheme.SocialLinkIcon;
  link: string;
  ariaLabel?: string;
}>();

const el = ref<HTMLAnchorElement>();

const label = computed(() => props.ariaLabel ?? (typeof props.icon === 'string' ? props.icon : ''));

onMounted(async () => {
  await nextTick();
  const span = el.value?.children[0];
  if (
    span instanceof HTMLElement &&
    span.className.startsWith('vpi-social-') &&
    (getComputedStyle(span).maskImage || getComputedStyle(span).webkitMaskImage) === 'none'
  ) {
    span.style.setProperty('--icon', `url('https://api.iconify.design/simple-icons/${props.icon}.svg')`);
  }
});

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const html = computed(() => {
  const icon = typeof props.icon === 'object' ? props.icon.svg : `<span class="vpi-social-${props.icon}"></span>`;

  return `${icon}<span class="sl-sr-only">${escapeHtml(label.value)}</span>`;
});

if (import.meta.env.SSR) {
  typeof props.icon === 'string' && useSSRContext<{ vpSocialIcons: Set<string> }>()?.vpSocialIcons.add(props.icon);
}
</script>

<template>
  <a ref="el" class="VPSocialLink no-icon" :href="link" :aria-label="label" target="_blank" rel="noopener" v-html="html"></a>
</template>

<style scoped>
.VPSocialLink {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 36px;
  height: 36px;
  color: var(--vp-c-text-2);
  transition: color 0.5s;
}

.VPSocialLink:hover {
  color: var(--vp-c-text-1);
  transition: color 0.25s;
}

.VPSocialLink > :deep(svg),
.VPSocialLink > :deep([class^='vpi-social-']) {
  width: 20px;
  height: 20px;
  fill: currentColor;
}
</style>
