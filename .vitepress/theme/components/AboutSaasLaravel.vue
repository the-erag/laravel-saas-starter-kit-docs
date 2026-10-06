<script setup lang="ts">
import SectionHeading from './SectionHeading.vue';
import SlIcon from './SlIcon.vue';

const links = [
  { text: 'Laravel Vue SaaS starter kit', href: '/kits/vue.html' },
  { text: 'Laravel React SaaS starter kit', href: '/kits/react.html' },
  { text: 'Laravel Svelte SaaS starter kit', href: '/kits/svelte.html' },
  { text: 'Starter kit pricing', href: '/pricing.html' },
  { text: 'Documentation', href: '/docs.html' },
  { text: 'Laravel SaaS blog', href: '/blog.html' },
];
</script>

<template>
  <section class="sl-section" aria-labelledby="about-saas-laravel">
    <div class="sl-container about">
      <div class="about-text">
        <SectionHeading eyebrow="What is SaaS Laravel?" title="A Laravel SaaS starter kit for Vue, React and Svelte" :center="false">
          <span id="about-saas-laravel">A Laravel SaaS starter kit for Vue, React and Svelte</span>
        </SectionHeading>
        <p class="sl-text">
          SaaS Laravel is a set of Laravel SaaS starter kits for developers and small teams who want to launch a multi-tenant
          product without rebuilding the same foundation every time. Every kit runs on Laravel 13 and Inertia v3, and you pick
          the frontend: Vue 3.5, React 19 or Svelte 5, each with TypeScript and Tailwind CSS v4.
        </p>
        <p class="sl-text">
          The backend is the same in all three kits. Each customer gets its own database and subdomain, sign-in runs on Laravel
          Fortify with two-factor authentication and passkeys, roles and permissions use spatie/laravel-permission, and the
          interface comes in 17 languages.
        </p>
        <p class="sl-text">
          You pay once through GitHub Sponsors and keep lifetime access to the kit repository, including the updates we push
          every week. SaaS Laravel is built and maintained by <a class="sl-link" href="/about.html">ERAG</a>.
        </p>
      </div>
      <nav class="about-links" aria-label="Start here">
        <p class="about-links-title">Start here</p>
        <ul>
          <li v-for="link in links" :key="link.href">
            <a :href="link.href">
              <span>{{ link.text }}</span>
              <SlIcon name="arrow-right" :size="16" />
            </a>
          </li>
        </ul>
      </nav>
    </div>
  </section>
</template>

<style scoped>
.about {
  display: grid;
  gap: 32px;
  align-items: start;
}

@media (min-width: 960px) {
  .about {
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 64px;
  }
}

.about-text .sl-text + .sl-text {
  margin-top: 14px;
}

.about-links {
  padding: 20px;
  border: 1px solid var(--sl-border);
  border-radius: var(--sl-radius);
  background: var(--sl-surface);
}

.about-links-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.about-links ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.about-links a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--sl-border);
  font-size: 15px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: color 0.2s;
}

.about-links li:first-child a {
  border-top: 0;
}

.about-links a:hover {
  color: var(--vp-c-brand-1);
}
</style>
