<script setup lang="ts">
const links = [
  { text: 'Home', href: '/', note: 'Laravel SaaS starter kits for Vue, React and Svelte' },
  { text: 'Documentation', href: '/docs.html', note: 'Installation, architecture and every feature' },
  { text: 'Vue starter kit', href: '/kits/vue.html', note: 'Laravel + Inertia + Vue 3.5' },
  { text: 'React starter kit', href: '/kits/react.html', note: 'Laravel + Inertia + React 19' },
  { text: 'Svelte starter kit', href: '/kits/svelte.html', note: 'Laravel + Inertia + Svelte 5' },
  { text: 'Pricing', href: '/pricing.html', note: 'One-time payment, lifetime access' },
];
</script>

<template>
  <div class="not-found">
    <p class="code">404</p>
    <h1 class="title">Page not found</h1>
    <p class="text">The page you were looking for doesn't exist or has moved. These pages might help:</p>
    <ul class="links">
      <li v-for="link in links" :key="link.href">
        <a :href="link.href">{{ link.text }}</a>
        <span>{{ link.note }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.not-found {
  max-width: 560px;
  margin: 0 auto;
  padding: 96px 24px 64px;
  text-align: center;
}

.code {
  margin: 0;
  font-size: 64px;
  font-weight: 700;
  line-height: 1;
  color: var(--vp-c-brand-1);
}

.title {
  margin: 16px 0 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.text {
  margin: 12px 0 28px;
  color: var(--vp-c-text-2);
}

.links {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  text-align: left;
}

.links li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 16px;
  padding: 12px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
}

.links a {
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.links span {
  font-size: 14px;
  color: var(--vp-c-text-2);
}
</style>
