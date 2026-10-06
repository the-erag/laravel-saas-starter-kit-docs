<script setup lang="ts">
import { computed } from 'vue';
import { data as posts } from '../../../blog/posts.data';
import { blogAuthor, blogCategories } from '../../site';

const props = defineProps<{ author: string }>();

const profile = computed(() => blogAuthor(props.author));
const articles = computed(() => posts.filter((post) => post.author === props.author));

const profileLabel = (url: string): string => {
  const host = new URL(url).hostname.replace(/^www\./, '');
  const labels: Record<string, string> = { 'github.com': 'GitHub', 'linkedin.com': 'LinkedIn', 'x.com': 'X' };

  return labels[host] ?? host;
};

const categoryLabel = (key: string): string | undefined => blogCategories.find((category) => category.key === key)?.label;

const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
</script>

<template>
  <div class="author-posts">
    <p v-if="profile.sameAs.length" class="author-profiles">
      <span>Elsewhere:</span>
      <a v-for="url in profile.sameAs" :key="url" :href="url" target="_blank" rel="noopener me">{{ profileLabel(url) }}</a>
    </p>

    <h2 id="articles">Articles by {{ profile.name }}</h2>
    <p class="author-count">{{ articles.length }} articles on the SaaS Laravel blog, newest first.</p>

    <ul class="author-list">
      <li v-for="post in articles" :key="post.url">
        <p class="author-meta">
          <span v-if="categoryLabel(post.category)">{{ categoryLabel(post.category) }}</span>
          <span v-if="categoryLabel(post.category)" aria-hidden="true">·</span>
          <time :datetime="post.date">{{ formatDate(post.date) }}</time>
        </p>
        <a class="author-title" :href="post.url">{{ post.title }}</a>
        <p class="author-description">{{ post.description }}</p>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.author-profiles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.author-profiles a {
  font-weight: 500;
}

.author-count {
  margin-top: 4px !important;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.author-list {
  display: grid;
  gap: 12px;
  margin: 20px 0 0 !important;
  padding: 0 !important;
  list-style: none;
}

.author-list li {
  margin: 0 !important;
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
}

.author-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 4px !important;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-3);
}

.author-title {
  font-weight: 600;
  color: var(--vp-c-text-1) !important;
  text-decoration: none !important;
}

.author-title:hover {
  color: var(--vp-c-brand-1) !important;
}

.author-description {
  margin: 4px 0 0 !important;
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}
</style>
