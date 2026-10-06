<script setup lang="ts">
import { useData } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { computed } from 'vue';
import BlogRelated from './components/BlogRelated.vue';
import NotFound from './components/NotFound.vue';
import SiteFooter from './components/SiteFooter.vue';

const { frontmatter, page } = useData();
const isMarketingPage = computed(() => frontmatter.value.layout === 'page');
const isBlogPost = computed(() => page.value.relativePath.startsWith('blog/'));
</script>

<template>
  <DefaultTheme.Layout :class="{ 'is-marketing': isMarketingPage }">
    <template #doc-after>
      <BlogRelated v-if="isBlogPost" />
    </template>
    <template #not-found>
      <NotFound />
    </template>
    <template #layout-bottom>
      <SiteFooter v-if="isMarketingPage" />
    </template>
  </DefaultTheme.Layout>
</template>
