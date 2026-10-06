<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { data as posts } from '../../../blog/posts.data';

const { page } = useData();

const current = computed(() => posts.find((post) => post.url === `/${page.value.relativePath.replace(/\.md$/, '.html')}`));

// Up to three other posts: same topic first, then posts that share a tag, then the newest ones.
const related = computed(() => {
  const post = current.value;
  if (!post) return [];

  const others = posts.filter((item) => item.url !== post.url);
  const score = (item: (typeof posts)[number]) =>
    (item.category === post.category ? 10 : 0) + item.tags.filter((tag) => post.tags.includes(tag)).length;

  return [...others].sort((a, b) => score(b) - score(a) || b.date.localeCompare(a.date)).slice(0, 3);
});
</script>

<template>
  <aside v-if="current" class="blog-related" aria-labelledby="related-articles">
    <h2 id="related-articles" class="blog-related-title">Related articles</h2>
    <ul class="blog-related-list">
      <li v-for="post in related" :key="post.url">
        <a :href="post.url">{{ post.title }}</a>
        <p>{{ post.description }}</p>
      </li>
    </ul>
    <p class="blog-related-kits">
      Building this yourself? See the
      <a href="/kits/vue.html">Laravel Vue SaaS starter kit</a>,
      <a href="/kits/react.html">React starter kit</a> or
      <a href="/kits/svelte.html">Svelte starter kit</a>, compare
      <a href="/pricing.html">starter kit pricing</a>, or read the
      <a href="/docs.html">documentation</a>.
    </p>
  </aside>
</template>

<style scoped>
.blog-related {
  margin-top: 48px;
  padding-top: 28px;
  border-top: 1px solid var(--vp-c-divider);
}

.blog-related-title {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.blog-related-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.blog-related-list li {
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
}

.blog-related-list a {
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.blog-related-list a:hover {
  color: var(--vp-c-brand-1);
}

.blog-related-list p {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.blog-related-kits {
  margin: 20px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.blog-related-kits a {
  font-weight: 500;
  color: var(--vp-c-brand-1);
}
</style>
