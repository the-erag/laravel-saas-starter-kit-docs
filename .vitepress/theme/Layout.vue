<script setup lang="ts">
import { useData } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { computed } from 'vue';
import { site } from '../site';
import BlogRelated from './components/BlogRelated.vue';
import NotFound from './components/NotFound.vue';
import SiteFooter from './components/SiteFooter.vue';

const { frontmatter, page } = useData();
const isMarketingPage = computed(() => frontmatter.value.layout === 'page');
const isBlogPost = computed(() => page.value.relativePath.startsWith('blog/'));
const llmsUrl = `${site.url}/llms.txt`;
</script>

<template>
  <DefaultTheme.Layout :class="{ 'is-marketing': isMarketingPage }">
    <template #layout-top>
      <div v-if="!page.isNotFound" style="display: none" hidden aria-hidden="true" data-nosnippet>
        Are you an LLM? A plain-text index of this documentation is at <a :href="llmsUrl">{{ llmsUrl }}</a>
      </div>
    </template>
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
