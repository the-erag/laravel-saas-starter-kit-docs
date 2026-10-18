<script setup lang="ts">
import { computed, ref } from 'vue';
import { frameworkKeys, kits, site, type FrameworkKey } from '../../site';
import FrameworkLogo from './FrameworkLogo.vue';
import SectionHeading from './SectionHeading.vue';

type ScreenKey =
  | 'tenants'
  | 'tenant-show'
  | 'tenant-create'
  | 'domains'
  | 'users'
  | 'roles'
  | 'menus'
  | 'setup-layout'
  | 'tenant-settings'
  | 'profile'
  | 'security'
  | 'auth-card'
  | 'notifications'
  | 'auth-simple'
  | 'auth-split'
  | 'app-sidebar'
  | 'app-floating'
  | 'app-header';

type Screen = { key: ScreenKey; label: string; path: string; caption: string };

const screens: Screen[] = [
  { key: 'tenants', label: 'Tenants', path: 'tenants', caption: 'Every tenant workspace with status filters, search, stats and quick actions.' },
  { key: 'tenant-show', label: 'Tenant details', path: 'tenants/1', caption: 'Organization profile, primary administrator, domains, password reset and workspace status in one place.' },
  { key: 'tenant-create', label: 'Add tenant', path: 'tenants/create', caption: 'Provision a tenant with its own database, subdomain and primary administrator, with or without an invitation.' },
  { key: 'domains', label: 'Domains', path: 'tenants/domains', caption: 'Primary and secondary domains with their app name, language and sign-in features.' },
  { key: 'users', label: 'Users', path: 'users', caption: 'Users with roles, invitations, verification status and per-user permission assignment.' },
  { key: 'roles', label: 'Roles', path: 'roles', caption: 'Protected system roles plus your own custom roles, scoped for the central app and every tenant.' },
  { key: 'menus', label: 'Menus', path: 'setup/menus', caption: 'Database-driven navigation with drag-and-drop ordering and permission checks.' },
  { key: 'setup-layout', label: 'Layout', path: 'setup/layout', caption: 'Default sign-in and app layouts for everyone, which each user can override.' },
  { key: 'tenant-settings', label: 'Maintenance', path: 'setup/tenant-settings', caption: 'Put every tenant workspace into maintenance with a bypass link and an IP allow list.' },
  { key: 'profile', label: 'Profile', path: 'settings/profile', caption: 'Profile, language, password, two-factor, passkeys and appearance settings for every user.' },
  { key: 'security', label: 'Security', path: 'settings/security', caption: 'Password update, two-factor authentication with recovery codes and passkeys for passwordless sign-in.' },
  { key: 'notifications', label: 'Notifications', path: 'notifications', caption: 'In-app notifications with a header bell and unread badge, plus a Notifications page with All and Unread filters, mark as read, delete and clear all.' },
];

const layouts: Screen[] = [
  { key: 'auth-card', label: 'Auth: Card', path: 'login', caption: 'Card sign-in layout with passkeys, two-factor codes and per-domain feature toggles.' },
  { key: 'auth-simple', label: 'Auth: Simple', path: 'login', caption: 'Simple sign-in layout: a clean, single-column form.' },
  { key: 'auth-split', label: 'Auth: Split', path: 'login', caption: 'Split sign-in layout: a branded panel next to the form.' },
  { key: 'app-sidebar', label: 'App: Sidebar', path: 'users', caption: 'Inset sidebar app layout with collapsible icon rail and expandable groups.' },
  { key: 'app-floating', label: 'App: Floating', path: 'users', caption: 'Floating sidebar variant with a detached, rounded navigation panel.' },
  { key: 'app-header', label: 'App: Header', path: 'users', caption: 'Top navigation (header) layout with dropdown menus instead of a sidebar.' },
];

const groups: { key: 'screens' | 'layouts'; label: string; items: Screen[] }[] = [
  { key: 'screens', label: 'Screens', items: screens },
  { key: 'layouts', label: 'Layouts', items: layouts },
];

const framework = ref<FrameworkKey>('vue');
const screen = ref<ScreenKey>('tenants');

const active = computed(() => [...screens, ...layouts].find((item) => item.key === screen.value) ?? screens[0]);
const image = (theme: 'light' | 'dark') => `/screenshots/${framework.value}-${screen.value}-${theme}.webp`;
const alt = computed(() => `${kits[framework.value].title}: ${active.value.label} screen`);
</script>

<template>
  <section id="preview" class="sl-section kit-preview">
    <div class="sl-container">
      <SectionHeading
        eyebrow="Live preview"
        title="See every kit in action"
        lead="Real screenshots from the Vue, React and Svelte kits. The same Laravel backend and the same screens, built with the frontend you prefer."
      />

      <div v-if="site.demoVideoUrl" class="video">
        <a class="sl-btn sl-btn--primary sl-btn--lg" :href="site.demoVideoUrl" target="_blank" rel="noopener">
          <span class="video-play" aria-hidden="true" />
          Watch the full walkthrough
        </a>
        <span class="video-note">Code tour and the complete admin panel, step by step</span>
      </div>

      <div class="controls">
        <div class="frameworks" role="tablist" aria-label="Starter kit">
          <button
            v-for="key in frameworkKeys"
            :key="key"
            type="button"
            role="tab"
            :aria-selected="framework === key"
            :class="{ active: framework === key }"
            @click="framework = key"
          >
            <FrameworkLogo :name="key" :size="16" />
            {{ kits[key].title.replace(' Starter Kit', '') }}
          </button>
        </div>
        <div v-for="group in groups" :key="group.key" class="screen-group">
          <span class="screen-group-label">{{ group.label }}</span>
          <div class="screens" role="tablist" :aria-label="group.label">
            <button
              v-for="item in group.items"
              :key="item.key"
              type="button"
              role="tab"
              :aria-selected="screen === item.key"
              :class="{ active: screen === item.key }"
              @click="screen = item.key"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
      </div>

      <figure class="frame">
        <div class="frame-bar" aria-hidden="true">
          <i /><i /><i />
          <span>{{ framework }}.test/{{ active.path }}</span>
        </div>
        <div class="frame-screen">
          <img
            :key="image('light')"
            class="shot shot--light"
            :src="image('light')"
            :alt="alt"
            width="2880"
            height="1800"
            loading="lazy"
            decoding="async"
          />
          <img
            :key="image('dark')"
            class="shot shot--dark"
            :src="image('dark')"
            :alt="alt"
            width="2880"
            height="1800"
            loading="lazy"
            decoding="async"
          />
        </div>
        <figcaption>{{ active.caption }}</figcaption>
      </figure>
    </div>
  </section>
</template>

<style scoped>
.video {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px 16px;
  margin: -8px 0 32px;
}

.video-play {
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-left: 10px solid currentColor;
}

.video-note {
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.screens {
  justify-content: center;
}

.screen-group {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;
}

.screen-group-label {
  flex-shrink: 0;
  width: 64px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  text-align: right;
}

.frameworks,
.screens {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--sl-border);
  border-radius: 12px;
  background: var(--sl-surface);
}

.frameworks button,
.screens button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 11px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  transition: background-color 0.2s, color 0.2s;
}

.frameworks button:focus-visible,
.screens button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: -2px;
}

.frameworks button:focus:not(:focus-visible),
.screens button:focus:not(:focus-visible) {
  outline: none;
}

.frameworks button:hover,
.screens button:hover {
  color: var(--vp-c-text-1);
}

.frameworks button.active,
.screens button.active {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  box-shadow: var(--sl-shadow-sm);
}

.frame {
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--sl-border);
  border-radius: var(--sl-radius);
  background: var(--sl-surface);
  box-shadow: var(--sl-shadow-lg);
}

.frame-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--sl-border);
  background: var(--vp-c-bg-soft);
}

.frame-bar i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--sl-border-strong);
}

.frame-bar span {
  margin-left: 10px;
  padding: 3px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.frame-screen {
  aspect-ratio: 16 / 10;
  background: var(--vp-c-bg);
}

.shot {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top left;
}

figcaption {
  padding: 14px 18px;
  border-top: 1px solid var(--sl-border);
  font-size: 14px;
  color: var(--vp-c-text-2);
}

@media (max-width: 720px) {
  .controls {
    align-items: stretch;
  }

  .frameworks {
    justify-content: center;
  }

  .screen-group {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .screen-group-label {
    width: auto;
    text-align: left;
  }

  .screens {
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .screens button {
    flex-shrink: 0;
  }
}
</style>

<style>
.kit-preview .shot--dark,
.dark .kit-preview .shot--light {
  display: none;
}

.dark .kit-preview .shot--dark {
  display: block;
}
</style>
