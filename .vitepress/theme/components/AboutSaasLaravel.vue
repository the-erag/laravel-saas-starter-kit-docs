<script setup lang="ts">
import SectionHeading from './SectionHeading.vue';
import SlIcon, { type IconName } from './SlIcon.vue';

const facts: { icon: IconName; title: string; text: string }[] = [
  { icon: 'layers', title: '4 frontends', text: 'Vue, React, Svelte or Livewire.' },
  { icon: 'layout-grid', title: '25+ screens', text: 'Finished and ready to use.' },
  { icon: 'languages', title: '17 languages', text: 'Translations included.' },
  { icon: 'database', title: 'Central + tenant databases', text: 'A central one for tenants and your admin users, plus one per customer.' },
];

const links = [
  { text: 'Laravel Vue SaaS starter kit', href: '/kits/vue.html' },
  { text: 'Laravel React SaaS starter kit', href: '/kits/react.html' },
  { text: 'Laravel Svelte SaaS starter kit', href: '/kits/svelte.html' },
  { text: 'Laravel Livewire SaaS starter kit', href: '/kits/livewire.html' },
  { text: 'Laravel multi-tenancy docs', href: '/docs/core/multi-tenancy.html' },
  { text: 'How to build a SaaS with Laravel', href: '/blog/multi-tenant-saas-laravel-database-per-tenant.html' },
  { text: 'Starter kit pricing', href: '/pricing.html' },
  { text: 'Documentation', href: '/docs.html' },
  { text: 'Laravel SaaS blog', href: '/blog.html' },
];
</script>

<template>
  <section class="sl-section" aria-labelledby="about-saas-laravel">
    <div class="sl-container about">
      <div class="about-text">
        <SectionHeading eyebrow="What is SaaS Laravel?" title="A Laravel SaaS starter kit for Vue, React, Svelte and Livewire" :center="false">
          <span id="about-saas-laravel">A Laravel SaaS starter kit for Vue, React, Svelte and Livewire</span>
        </SectionHeading>
        <p class="sl-text">
          SaaS Laravel is a Laravel 13 starter kit for building a
          <a class="sl-link" href="/blog/multi-tenant-saas-laravel-database-per-tenant.html">multi-tenant SaaS</a>, where every
          customer gets their own database. It's for developers and small teams who are tired of rebuilding the same
          foundation for every new project and would rather start on their own product. It's built and maintained by
          <a class="sl-link" href="/about.html">ERAG</a>.
        </p>
        <ul class="about-facts">
          <li v-for="fact in facts" :key="fact.title" class="about-fact">
            <span class="about-fact-icon"><SlIcon :name="fact.icon" :size="17" /></span>
            <span class="about-fact-title">{{ fact.title }}</span>
            <span class="about-fact-text">{{ fact.text }}</span>
          </li>
        </ul>
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

.about-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}

.about-fact {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-content: start;
  gap: 2px 12px;
  padding: 16px;
  border: 1px solid var(--sl-border);
  border-radius: var(--sl-radius);
  background: var(--sl-surface);
}

.about-fact-icon {
  display: grid;
  place-items: center;
  grid-row: span 2;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.about-fact-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.about-fact-text {
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

@media (max-width: 560px) {
  .about-fact {
    grid-template-columns: minmax(0, 1fr);
    padding: 14px;
  }

  .about-fact-icon {
    grid-row: auto;
    margin-bottom: 6px;
  }
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
