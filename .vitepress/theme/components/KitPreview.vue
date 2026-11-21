<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { data as shots } from '../../data/screenshots.data';
import { frameworkKeys, kits, site, type FrameworkKey } from '../../site';
import FrameworkLogo from './FrameworkLogo.vue';
import SectionHeading from './SectionHeading.vue';

type Side = 'central' | 'tenant';

// `key` is the screenshot name: /screenshots/<kit>-<key>-<light|dark>.webp. Tenant workspace shots use a
// `workspace-` prefix. A tab only shows when that kit has both the light and the dark screenshot.
type Screen = { key: string; label: string; path: string; caption: string };

const centralScreens: Screen[] = [
  { key: 'tenants', label: 'Tenants', path: 'tenants', caption: 'Every tenant workspace with status filters, search, stats and quick actions.' },
  { key: 'tenant-show', label: 'Tenant details', path: 'tenants/1', caption: 'Organization profile, primary administrator, domains, password reset and workspace status in one place.' },
  { key: 'tenant-create', label: 'Add tenant', path: 'tenants/create', caption: 'Provision a tenant with its own database, subdomain and primary administrator, with or without an invitation.' },
  { key: 'domains', label: 'Domains', path: 'tenants/domains', caption: 'Primary and secondary domains with their app name, language and sign-in features.' },
  { key: 'users', label: 'Users', path: 'users', caption: 'Users with roles, invitations, verification status and per-user permission assignment.' },
  { key: 'roles', label: 'Roles', path: 'roles', caption: 'Protected system roles plus your own custom roles, scoped for the central app and every tenant.' },
  { key: 'menus', label: 'Menus', path: 'setup/menus', caption: 'Database-driven navigation with drag-and-drop ordering and permission checks.' },
  { key: 'setup-layout', label: 'Layout', path: 'setup/layout', caption: 'Default sign-in and app layouts for everyone, which each user can override.' },
  { key: 'tenant-settings', label: 'Maintenance', path: 'setup/tenant-settings', caption: 'Put every tenant workspace into maintenance with a bypass link and an IP allow list.' },
];

const centralLayouts: Screen[] = [
  { key: 'auth-card', label: 'Auth: Card', path: 'login', caption: 'Card sign-in layout with passkeys, two-factor codes and per-domain feature toggles.' },
  { key: 'auth-simple', label: 'Auth: Simple', path: 'login', caption: 'Simple sign-in layout: a clean, single-column form.' },
  { key: 'auth-split', label: 'Auth: Split', path: 'login', caption: 'Split sign-in layout: a branded panel next to the form.' },
  { key: 'app-sidebar', label: 'App: Sidebar', path: 'users', caption: 'Inset sidebar app layout with collapsible icon rail and expandable groups.' },
  { key: 'app-floating', label: 'App: Floating', path: 'users', caption: 'Floating sidebar variant with a detached, rounded navigation panel.' },
  { key: 'app-header', label: 'App: Header', path: 'users', caption: 'Top navigation (header) layout with dropdown menus instead of a sidebar.' },
];

const tenantScreens: Screen[] = [
  { key: 'workspace-dashboard', label: 'Dashboard', path: 'dashboard', caption: 'The customer’s own dashboard on their own subdomain.' },
  { key: 'workspace-users', label: 'Users', path: 'users', caption: 'The customer’s team: invite people, give them roles and see who has verified.' },
  { key: 'workspace-roles', label: 'Roles', path: 'roles', caption: 'Roles and permissions that only apply inside this workspace.' },
  { key: 'workspace-menus', label: 'Menus', path: 'setup/menus', caption: 'The workspace’s own navigation, reordered with drag and drop.' },
  { key: 'workspace-setup-layout', label: 'Layout', path: 'setup/layout', caption: 'The workspace’s default sign-in and app layouts, which each person can change for themselves.' },
  { key: 'workspace-profile', label: 'Profile', path: 'settings/profile', caption: 'Name, email and language for each person in the workspace.' },
  { key: 'workspace-security', label: 'Security', path: 'settings/security', caption: 'Password, two-factor codes and passkeys for each person in the workspace.' },
  { key: 'workspace-notifications', label: 'Notifications', path: 'notifications', caption: 'The workspace’s notifications, with a header bell and an unread badge.' },
  { key: 'workspace-invitation', label: 'Invitation', path: 'invitation/accept', caption: 'Where the customer’s admin opens the invitation link and sets a password.' },
];

// Tenant app layouts were captured on the Roles page.
const tenantLayouts: Screen[] = centralLayouts.map((item) => ({
  ...item,
  key: `workspace-${item.key}`,
  path: item.path === 'users' ? 'roles' : item.path,
}));

const sides: { key: Side; label: string; screens: Screen[]; layouts: Screen[]; host: string }[] = [
  { key: 'central', label: 'Central admin', screens: centralScreens, layouts: centralLayouts, host: 'saas.test' },
  { key: 'tenant', label: 'Tenant workspace', screens: tenantScreens, layouts: tenantLayouts, host: 'acme.saas.test' },
];

const existing = new Set(shots.files);
const sized = new Set(shots.sized);
const hasShot = (kit: FrameworkKey, key: string) => existing.has(`${kit}-${key}-light`) && existing.has(`${kit}-${key}-dark`);

// The switch only shows once the tenant side has at least one real screenshot for some kit.
const tenantReady = [...tenantScreens, ...tenantLayouts].some((item) => frameworkKeys.some((kit) => hasShot(kit, item.key)));

const side = ref<Side>('central');
const framework = ref<FrameworkKey>('vue');
const screen = ref('tenants');

const current = computed(() => sides.find((item) => item.key === side.value)!);

const groups = computed(() =>
  [
    { key: 'screens', label: 'Screens', items: current.value.screens },
    { key: 'layouts', label: 'Layouts', items: current.value.layouts },
  ]
    .map((group) => ({ ...group, items: group.items.filter((item) => hasShot(framework.value, item.key)) }))
    .filter((group) => group.items.length),
);

const visible = computed(() => groups.value.flatMap((group) => group.items));

// Switching side or kit keeps the screen when it exists there, otherwise it falls back to the first one.
watch([side, framework], () => {
  if (!visible.value.some((item) => item.key === screen.value)) {
    screen.value = visible.value[0]?.key ?? '';
  }
});

const active = computed(() => visible.value.find((item) => item.key === screen.value) ?? visible.value[0]);
const base = (theme: 'light' | 'dark') => `${framework.value}-${active.value.key}-${theme}`;
const image = (theme: 'light' | 'dark') => `/screenshots/${base(theme)}`;
// Phones get the 800px screenshot, most desktops the 1440px one; the 2880px original is for dense screens.
const src = (theme: 'light' | 'dark') => (sized.has(base(theme)) ? `${image(theme)}-1440.webp` : `${image(theme)}.webp`);
const srcset = (theme: 'light' | 'dark') =>
  sized.has(base(theme)) ? `${image(theme)}-800.webp 800w, ${image(theme)}-1440.webp 1440w, ${image(theme)}.webp 2880w` : undefined;
const sizes = '(max-width: 1200px) calc(100vw - 48px), 1152px';
const alt = computed(() => `${kits[framework.value].title}, ${current.value.label.toLowerCase()}: ${active.value.label} screen`);
</script>

<template>
  <section id="preview" class="sl-section kit-preview">
    <div class="sl-container">
      <SectionHeading
        eyebrow="Live preview"
        title="See every kit in action"
        lead="Real screenshots from the Vue, React, Svelte and Livewire kits. The same SaaS features and the same screens, built with the frontend you prefer."
      />

      <div v-if="site.demoVideoUrl" class="video">
        <a class="sl-btn sl-btn--primary sl-btn--lg" :href="site.demoVideoUrl" target="_blank" rel="noopener">
          <span class="video-play" aria-hidden="true" />
          Watch the full walkthrough
        </a>
        <span class="video-note">Code tour and the complete admin panel, step by step</span>
      </div>

      <div class="controls">
        <template v-if="tenantReady">
          <div class="frameworks sides" role="tablist" aria-label="Area of the app">
            <button
              v-for="item in sides"
              :key="item.key"
              type="button"
              role="tab"
              :aria-selected="side === item.key"
              :class="{ active: side === item.key }"
              @click="side = item.key"
            >
              {{ item.label }}
            </button>
          </div>
          <p class="sides-note">You run everything from the central admin. Each customer gets their own workspace on their own subdomain.</p>
        </template>
        <div class="frameworks kits" role="tablist" aria-label="Starter kit">
          <button
            v-for="key in frameworkKeys"
            :key="key"
            type="button"
            role="tab"
            :aria-selected="framework === key"
            :class="{ active: framework === key }"
            @click="framework = key"
          >
            <FrameworkLogo :name="key" :size="14" />
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

      <p v-if="!active" class="preview-empty">
        There are no {{ current.label.toLowerCase() }} screenshots for the {{ kits[framework].title.replace(' Starter Kit', '') }} kit yet.
      </p>
      <figure v-else class="frame">
        <div class="frame-bar" aria-hidden="true">
          <i /><i /><i />
          <span>{{ current.host }}/{{ active.path }}</span>
        </div>
        <div class="frame-screen">
          <img
            :key="base('light')"
            class="shot shot--light"
            :src="src('light')"
            :srcset="srcset('light')"
            :sizes="sizes"
            :alt="alt"
            width="2880"
            height="1800"
            loading="lazy"
            decoding="async"
          />
          <img
            :key="base('dark')"
            class="shot shot--dark"
            :src="src('dark')"
            :srcset="srcset('dark')"
            :sizes="sizes"
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
.kit-preview {
  padding-top: 32px;
}

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

.preview-empty {
  max-width: 520px;
  margin: 24px auto 0;
  padding: 20px;
  border: 1px dashed var(--sl-border-strong);
  border-radius: var(--sl-radius);
  font-size: 14px;
  text-align: center;
  color: var(--vp-c-text-2);
}

.sides-note {
  max-width: 520px;
  margin: -4px 0 4px;
  font-size: 13.5px;
  line-height: 1.5;
  text-align: center;
  color: var(--vp-c-text-2);
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

/* The kit picker: a compact row of small logo + name chips. */
.controls .kits {
  flex-wrap: nowrap;
  max-width: 100%;
  margin: -6px 0;
  padding: 3px;
  border-radius: 10px;
  overflow-x: auto;
  scrollbar-width: none;
}

.controls .kits button {
  flex-shrink: 0;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 7px;
  font-size: 13px;
  opacity: 0.65;
  transition: opacity 0.2s, background-color 0.2s, color 0.2s, box-shadow 0.2s;
}

.controls .kits button:hover,
.controls .kits button:focus-visible {
  opacity: 1;
}

.controls .kits button.active {
  opacity: 1;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-text-1);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--vp-c-brand-1) 35%, transparent);
}

@media (max-width: 480px) {
  .controls .kits {
    gap: 2px;
  }

  .controls .kits button {
    gap: 5px;
    padding: 4px 7px;
    font-size: 12.5px;
  }
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
