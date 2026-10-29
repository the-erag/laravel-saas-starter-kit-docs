<script setup lang="ts">
import FrameworkLogo from './FrameworkLogo.vue';
import SlIcon, { type IconName } from './SlIcon.vue';

const kits: { kit: 'vue' | 'react' | 'svelte'; name: string }[] = [
  { kit: 'vue', name: 'laravel/vue-starter-kit' },
  { kit: 'react', name: 'laravel/react-starter-kit' },
  { kit: 'svelte', name: 'laravel/svelte-starter-kit' },
];

const promises: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'refresh',
    title: 'Always in sync',
    text: 'New features in Laravel’s official kits come to yours too.',
  },
  {
    icon: 'layers',
    title: 'Same structure you know',
    text: 'Same folders and conventions as the official kits.',
  },
  {
    icon: 'code',
    title: 'Clean, readable code',
    text: 'High-quality code with no duplication, easy to change.',
  },
  {
    icon: 'lock',
    title: 'One sign-in for everything',
    text: 'Stay signed in to your SaaS and a tenant in one browser.',
  },
  {
    icon: 'wrench',
    title: 'Customise anything',
    text: 'Every file is yours. Change any page, rule or flow.',
  },
];
</script>

<template>
  <section class="sl-section sync" aria-labelledby="sync-title">
    <div class="sl-container">
      <div class="sync-head">
        <div class="sync-copy">
          <p class="sl-eyebrow">Built on Laravel’s official starter kits</p>
          <h2 id="sync-title" class="sl-h2">
            The official Laravel kit, <span class="sl-gradient-text">with your SaaS already built in</span>
          </h2>
          <p class="sl-lead">
            Same folders, same conventions, same code you know from Laravel’s <strong>Vue, React and Svelte</strong>
            starter kits. When Laravel improves its kits, <strong>your kit gets those updates too</strong>.
          </p>
          <ul class="sync-checks">
            <li><SlIcon name="check" :size="14" />Nothing new to learn</li>
            <li><SlIcon name="check" :size="14" />Stays in sync with Laravel</li>
            <li><SlIcon name="check" :size="14" />Every file is yours</li>
          </ul>
        </div>

        <div class="sync-flow" aria-hidden="true">
          <div class="sync-official">
            <span class="sync-label"><FrameworkLogo name="laravel" :size="14" />Official starter kits</span>
            <span v-for="item in kits" :key="item.kit" class="sync-kit">
              <FrameworkLogo :name="item.kit" :size="14" />{{ item.name }}
            </span>
          </div>
          <span class="sync-arrow"><SlIcon name="refresh" :size="16" />in sync</span>
          <div class="sync-ours">
            <span class="sync-ours-icon"><SlIcon name="layers" :size="18" /></span>
            <strong>SaaS Laravel</strong>
            <span>+ tenants, users, roles, menus and more</span>
          </div>
        </div>
      </div>

      <div class="sync-grid">
        <div v-for="item in promises" :key="item.title" class="sync-card">
          <span class="sync-icon"><SlIcon :name="item.icon" :size="17" /></span>
          <p class="sync-title">{{ item.title }}</p>
          <p class="sync-text">{{ item.text }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sync {
  border-top: 1px solid var(--sl-border);
}

.sync-head {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  align-items: center;
  gap: 56px;
  margin-bottom: 48px;
}

.sync-copy .sl-lead {
  margin-top: 16px;
}

.sync-copy .sl-lead strong {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.sync-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 22px;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}

.sync-checks li {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14.5px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.sync-checks :deep(.sl-icon) {
  padding: 3px;
  border-radius: 50%;
  color: #fff;
  background: var(--sl-gradient);
  box-sizing: content-box;
}

.sync-flow {
  display: grid;
  justify-items: center;
  gap: 12px;
}

.sync-official {
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 18px;
  border: 1px solid var(--sl-border);
  border-radius: var(--sl-radius);
  background: var(--sl-surface);
  box-shadow: var(--sl-shadow-sm);
}

.sync-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.sync-kit {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-1);
  background: var(--sl-surface-muted);
}

.sync-arrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid var(--sl-border-strong);
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.sync-arrow :deep(.sl-icon) {
  animation: sync-spin 6s linear infinite;
}

.sync-ours {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  column-gap: 12px;
  width: 100%;
  padding: 16px 18px;
  border-radius: var(--sl-radius);
  color: #fff;
  background: var(--sl-gradient);
  box-shadow: 0 16px 32px -16px rgba(99, 102, 241, 0.7);
}

.sync-ours-icon {
  display: grid;
  grid-row: span 2;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.18);
}

.sync-ours strong {
  font-size: 16px;
}

.sync-ours span:last-child {
  font-size: 13px;
  opacity: 0.85;
}

.sync-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  border-top: 1px solid var(--sl-border);
  border-left: 1px solid var(--sl-border);
  border-radius: var(--sl-radius);
  overflow: hidden;
  background: var(--sl-surface);
}

.sync-card {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 22px 20px 24px;
  border-right: 1px solid var(--sl-border);
  border-bottom: 1px solid var(--sl-border);
}

.sync-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  margin-bottom: 6px;
  border-radius: 10px;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.sync-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.sync-text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}

@keyframes sync-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1100px) {
  .sync-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .sync-head {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}

@media (max-width: 640px) {
  .sync-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sync-arrow :deep(.sl-icon) {
    animation: none;
  }
}
</style>
