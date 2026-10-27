<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import SlIcon, { type IconName } from './SlIcon.vue';

const rows: { eyebrow: string; title: string; text: string; points: string[]; docs: string; image: string }[] = [
  {
    eyebrow: 'Multi-tenancy',
    title: 'A separate database for every tenant',
    text: 'Create a tenant and the kit provisions its database, runs tenant migrations, seeds roles, permissions and menus, then creates the primary administrator.',
    points: [
      'Subdomain identification on <sub>.APP_DOMAIN',
      'Workspace status: Active, Trial, Pending Invitation, Suspended',
      'Signed invitation link for the tenant admin, with resend',
      'Admin password reset by email link or set manually',
      'Tenant list with search, status filter and stats',
      'Tenant profile: industry, team size, work week, registration and tax numbers',
    ],
    docs: '/docs/core/multi-tenancy.html',
    image: 'tenancy',
  },
  {
    eyebrow: 'Domains',
    title: 'Brand and configure every domain',
    text: 'Each tenant can have primary and secondary domains. Every domain gets its own app name, default language and sign-in features.',
    points: [
      'Add domains, set the primary, protect it from deletion',
      'App name shown in the sidebar, auth pages and emails',
      'Default language per domain, users can still choose their own',
      'Per-domain registration, password reset, 2FA and passkeys',
      'Domains page with search and primary / secondary filters',
      'Language shown for every domain in the domains table',
      'All domains of a tenant share the same tenant database',
    ],
    docs: '/docs/core/domains.html',
    image: 'domains',
  },
  {
    eyebrow: 'Users, roles & permissions',
    title: "Access control that's ready on day one",
    text: 'Spatie roles and permissions for both the central app and every tenant. System roles receive their default permissions automatically.',
    points: [
      'Users list with search, stats and pagination',
      'Role select on create and edit. System roles get their default permissions, custom roles start with none',
      'Assign individual permissions per user, grouped by module',
      'Queued invitation emails with a signed 7-day link and an “Invitation pending” badge',
      'Protected system roles plus your own custom roles',
      'Central and tenant permissions in config/permissions/*.php and config/permissions/tenant/*.php',
      'Super admin passes every permission check',
      'Permission-aware menus and buttons in the frontend',
    ],
    docs: '/docs/core/users-roles-permissions.html',
    image: 'users',
  },
  {
    eyebrow: 'Notifications',
    title: 'Keep every user in the loop',
    text: 'In-app notifications are stored in the database of the central app and every tenant, and show up in the header bell on every page.',
    points: [
      'Header bell with an unread badge and the latest notifications',
      'Notifications page with All and Unread filters, delete and clear all',
      'Super admins are notified when an invited user joins',
      'Send your own with one NotificationService call',
      'Titles and messages translated into each user’s language',
      'Language switcher and profile menu right next to the bell',
    ],
    docs: '/docs/core/notifications.html',
    image: 'notifications',
  },
  {
    eyebrow: 'Maintenance & suspension',
    title: 'Take workspaces offline safely',
    text: 'Switch every tenant workspace into maintenance from Setup → Tenant Settings while the central app stays online.',
    points: [
      'Custom message on an animated 503 page',
      'Secret bypass link that unlocks a workspace for 12 hours',
      'Allowed IP addresses and CIDR ranges skip the maintenance page',
      'Tenant login stays reachable so admins can sign in and bypass',
      'Suspend a single workspace with its own message',
      'Suspended workspaces show a full-page notice with a default message',
      'The central app stays online the whole time',
    ],
    docs: '/docs/core/maintenance-and-suspension.html',
    image: 'maintenance',
  },
  {
    eyebrow: 'Authentication',
    title: 'Secure sign-in, ready to use',
    text: 'Laravel Fortify handles every auth flow for the central app and each tenant, and passkeys are already built in.',
    points: [
      'Login, registration and password reset',
      'Email verification and password confirmation',
      'Two-factor authentication with recovery codes',
      'Passwordless sign-in with passkeys',
      'Turn each auth feature on or off per domain',
      'Profile, password and account deletion settings',
      'Separate central and tenant guards and databases',
    ],
    docs: '/docs/core/authentication.html',
    image: 'auth',
  },
  {
    eyebrow: 'Localization',
    title: '17 languages, translated end to end',
    text: 'Every screen, menu, email and validation message is translated, and the translations reach the frontend automatically.',
    points: [
      'English, Hindi, Spanish, French, German, Japanese and 11 more',
      'One translation file per feature in lang/<locale>/modules',
      'Every user picks their own language from the header or their profile',
      'Default language per domain, with English as the app default',
      'Translated validation messages in every Data class',
      'Same __() helper in Vue, React and Svelte',
    ],
    docs: '/docs/core/localization.html',
    image: 'localization',
  },
  {
    eyebrow: 'Layout settings',
    title: 'System defaults, personal overrides',
    text: 'Set the default look for everyone from Setup → Layout Settings. Every user can then pick their own workspace layout under Settings → Layout.',
    points: [
      'Default authentication layout: card, simple or split screen',
      'Default application layout: sidebar or top nav (header)',
      'Default sidebar variant: inset, sidebar or floating',
      'Default collapsible mode: icon rail, offcanvas or none',
      'Personal workspace layout for every user, saved in the database',
      'Light, dark and system appearance',
    ],
    docs: '/docs/core/navigation-and-layouts.html',
    image: 'layouts',
  },
  {
    eyebrow: 'Menus & navigation',
    title: 'Database-driven menus',
    text: 'Menus are stored in the database, so you can reorder and reshape the navigation without touching any code.',
    points: [
      'Drag & drop menu builder with Reset Defaults',
      'Menus hide automatically when the user lacks the permission',
      'Setup opens as a dropdown on hover in the top nav layout',
      'Menu titles are translated into the user’s language',
      'Separate menus for the central app and every tenant',
    ],
    docs: '/docs/core/navigation-and-layouts.html',
    image: 'menus',
  },
];

const extras: { icon: IconName; title: string; text: string }[] = [
  { icon: 'shield', title: 'Friendly error pages', text: 'Designed 403, 404, 500 and 503 pages that match the rest of the app.' },
  { icon: 'code', title: 'Typed end to end', text: 'Wayfinder route helpers and TypeScript types generated from Data classes.' },
  { icon: 'globe', title: 'Landing page', text: 'A marketing home page on the central domain, ready to customise.' },
  { icon: 'bot', title: 'AI-ready', text: 'Laravel Boost guidelines and skills so AI agents follow the kit conventions.' },
]

const marqueeItems = rows.map((row) => row.eyebrow);

const section = ref<HTMLElement | null>(null);
const giant = ref<HTMLElement | null>(null);
const stage = ref<HTMLElement | null>(null);
const animated = ref(false);
const active = ref(0);

const pad = (value: number): string => String(value).padStart(2, '0');

const isDesktop = (): boolean => window.matchMedia('(min-width: 961px)').matches;

const goTo = (index: number): void => {
  if (!stage.value || !isDesktop()) {
    return;
  }

  const top = stage.value.getBoundingClientRect().top + window.scrollY;
  const step = (stage.value.offsetHeight - window.innerHeight) / rows.length;

  window.scrollTo({ top: top + step * index + step * 0.5, behavior: 'smooth' });
};

let cleanup: (() => void) | null = null;

onMounted(() => {
  const root = section.value;

  if (!root) {
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  animated.value = !reducedMotion;

  let pending = reducedMotion ? [] : Array.from(root.querySelectorAll<HTMLElement>('[data-feature-reveal]'));

  const reveal = (): void => {
    const limit = window.innerHeight * 0.88;

    pending = pending.filter((element) => {
      if (element.getBoundingClientRect().top < limit) {
        element.classList.add('is-in');

        return false;
      }

      return true;
    });
  };

  const track = (): void => {
    if (!stage.value || !isDesktop()) {
      return;
    }

    const rect = stage.value.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(Math.max(-rect.top / scrollable, 0), 0.9999) : 0;
    active.value = Math.floor(progress * rows.length);
  };

  let frame = 0;

  const update = (): void => {
    frame = 0;
    reveal();
    track();

    if (!giant.value || reducedMotion) {
      return;
    }

    const rect = root.getBoundingClientRect();
    const progress = Math.min(Math.max((window.innerHeight - rect.top) / (window.innerHeight * 1.2), 0), 1);
    giant.value.style.transform = `translate(-50%, ${(1 - progress) * 12}vh) scale(${0.82 + progress * 0.18})`;
    giant.value.style.opacity = String(progress);
  };

  const onScroll = (): void => {
    track();

    if (!frame) {
      frame = requestAnimationFrame(update);
    }
  };

  const magnets = reducedMotion ? [] : Array.from(root.querySelectorAll<HTMLElement>('[data-magnetic]'));
  const handlers = magnets.map((element) => {
    const move = (event: PointerEvent): void => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      element.style.transition = 'transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1)';
      element.style.transform = `translate(${x * 0.3}px, ${y * 0.4}px) scale(1.05)`;
    };
    const leave = (): void => {
      element.style.transition = 'transform 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)';
      element.style.transform = '';
    };

    element.addEventListener('pointermove', move);
    element.addEventListener('pointerleave', leave);

    return { element, move, leave };
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();

  cleanup = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    handlers.forEach(({ element, move, leave }) => {
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', leave);
    });
  };
});

onBeforeUnmount(() => cleanup?.());
</script>

<template>
  <section ref="section" class="sl-section features" :class="{ 'features--animated': animated }" aria-labelledby="features-title">
    <div class="features-aurora" aria-hidden="true" />
    <div class="features-grid" aria-hidden="true" />
    <div ref="giant" class="features-giant" aria-hidden="true">FEATURES</div>

    <div class="features-marquee" aria-hidden="true">
      <div class="features-marquee-track">
        <div v-for="copy in 2" :key="copy" class="features-marquee-group">
          <template v-for="(item, index) in marqueeItems" :key="`${copy}-${item}`">
            <span>{{ item }}</span>
            <span class="features-marquee-star" :class="{ 'features-marquee-star--alt': index % 2 === 1 }">✦</span>
          </template>
        </div>
      </div>
    </div>

    <div class="sl-container features-inner">
      <div class="features-heading" data-feature-reveal>
        <p class="sl-eyebrow">Features</p>
        <h2 id="features-title" class="features-title">Everything a multi-tenant SaaS needs</h2>
        <p class="sl-lead">Real screens from the kits. Every feature ships in the Vue, React and Svelte frontends.</p>
      </div>

      <div ref="stage" class="feature-stage" :style="{ '--feature-count': rows.length }">
        <div class="feature-stage-sticky">
          <nav class="feature-stage-nav" aria-label="Features">
            <div class="feature-stage-counter">
              <span class="feature-stage-counter-current">{{ pad(active + 1) }}</span>
              <span>/ {{ pad(rows.length) }}</span>
            </div>
            <button
              v-for="(row, index) in rows"
              :key="`nav-${row.title}`"
              type="button"
              class="feature-stage-nav-item"
              :class="{ 'is-active': index === active, 'is-done': index < active }"
              :aria-current="index === active ? 'step' : undefined"
              @click="goTo(index)"
            >
              <span class="feature-stage-nav-index">{{ pad(index + 1) }}</span>
              <span class="feature-stage-nav-label">{{ row.eyebrow }}</span>
            </button>
          </nav>

          <div class="rows">
            <article
              v-for="(row, index) in rows"
              :key="row.title"
              class="row"
              :class="{ 'is-active': index === active, 'is-before': index < active }"
            >
              <div class="row-copy">
                <span class="row-badge">{{ row.eyebrow }}</span>
                <h3 class="row-title">{{ row.title }}</h3>
                <p class="sl-text row-text">{{ row.text }}</p>
                <ul class="sl-checklist row-points">
                  <li v-for="point in row.points.slice(0, 5)" :key="point">
                    <span class="row-check"><SlIcon name="check" :size="13" /></span>{{ point }}
                  </li>
                </ul>
                <a class="glass-pill row-link" :href="row.docs" data-magnetic>
                  Read the {{ row.eyebrow }} docs <span class="vpi-arrow-right" />
                </a>
              </div>
              <div class="row-visual">
                <figure class="row-shot">
                  <img
                    class="row-img row-img--light"
                    :src="`/screenshots/features/${row.image}-light.webp`"
                    :alt="`${row.title}: screenshot from the Vue kit`"
                    loading="lazy"
                    decoding="async"
                  />
                  <img
                    class="row-img row-img--dark"
                    :src="`/screenshots/features/${row.image}-dark.webp`"
                    :alt="`${row.title}: screenshot from the Vue kit`"
                    loading="lazy"
                    decoding="async"
                  />
                </figure>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div class="extras">
        <div v-for="extra in extras" :key="extra.title" class="extra glass-card" data-feature-reveal>
          <span class="extra-icon"><SlIcon :name="extra.icon" :size="18" /></span>
          <div>
            <h3 class="sl-h3 extra-title">{{ extra.title }}</h3>
            <p class="sl-text extra-text">{{ extra.text }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features {
  --glass-1: color-mix(in srgb, var(--vp-c-text-1) 4%, transparent);
  --glass-2: color-mix(in srgb, var(--vp-c-text-1) 1%, transparent);
  --glass-border: color-mix(in srgb, var(--vp-c-text-1) 9%, transparent);
  --glass-highlight: color-mix(in srgb, #fff 55%, transparent);

  position: relative;
  overflow: clip;
  padding-top: 200px;
  padding-bottom: 56px;
  isolation: isolate;
}

.dark .features {
  --glass-highlight: color-mix(in srgb, #fff 10%, transparent);
}

.features-aurora {
  position: absolute;
  top: 380px;
  left: 50%;
  z-index: -1;
  width: 80vw;
  height: 60vh;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.16) 0%, rgba(139, 92, 246, 0.12) 40%, transparent 70%);
  filter: blur(80px);
  transform: translate(-50%, -50%);
  animation: features-breathe 8s ease-in-out infinite alternate;
  pointer-events: none;
}

@keyframes features-breathe {
  from {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.6;
  }

  to {
    transform: translate(-50%, -50%) scale(1.12);
    opacity: 1;
  }
}

.features-grid {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-size: 60px 60px;
  background-image: linear-gradient(to right, color-mix(in srgb, var(--vp-c-text-1) 4%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in srgb, var(--vp-c-text-1) 4%, transparent) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, #000 12%, #000 80%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 12%, #000 80%, transparent);
  pointer-events: none;
}

.features-giant {
  position: absolute;
  top: 150px;
  left: 50%;
  z-index: -1;
  font-size: 20vw;
  font-weight: 900;
  line-height: 0.8;
  letter-spacing: -0.05em;
  white-space: nowrap;
  color: transparent;
  -webkit-text-stroke: 1px color-mix(in srgb, var(--vp-c-text-1) 7%, transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--vp-c-text-1) 9%, transparent) 0%, transparent 65%);
  -webkit-background-clip: text;
  background-clip: text;
  transform: translateX(-50%);
  user-select: none;
  pointer-events: none;
}

.features-marquee {
  position: absolute;
  top: 56px;
  left: -5%;
  z-index: 1;
  width: 110%;
  overflow: hidden;
  padding: 14px 0;
  border-top: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--vp-c-bg) 65%, transparent);
  box-shadow: 0 20px 40px -24px rgba(49, 46, 129, 0.35);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transform: rotate(-2deg);
}

.features-marquee-track {
  display: flex;
  width: max-content;
  animation: features-marquee 40s linear infinite;
}

.features-marquee-group {
  display: flex;
  align-items: center;
  gap: 40px;
  padding-right: 40px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--vp-c-text-2);
}

.features-marquee-star {
  color: color-mix(in srgb, var(--vp-c-brand-1) 70%, transparent);
}

.features-marquee-star--alt {
  color: color-mix(in srgb, #8b5cf6 70%, transparent);
}

@keyframes features-marquee {
  to {
    transform: translateX(-50%);
  }
}

.features-inner {
  position: relative;
  max-width: 1360px;
}

.features-heading {
  max-width: 760px;
  margin: 0 auto 96px;
  text-align: center;
}

.features-title {
  margin: 12px 0 0;
  border: 0;
  padding: 0;
  font-size: clamp(36px, 5.5vw, 64px);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.04em;
  background: linear-gradient(180deg, var(--vp-c-text-1) 0%, color-mix(in srgb, var(--vp-c-text-1) 45%, transparent) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 22px color-mix(in srgb, var(--vp-c-text-1) 12%, transparent));
}

.features-heading .sl-lead {
  margin-top: 18px;
}

.glass-pill,
.glass-card,
.row-visual {
  border: 1px solid var(--glass-border);
  background: linear-gradient(145deg, var(--glass-1) 0%, var(--glass-2) 100%);
  box-shadow: 0 10px 30px -12px rgba(15, 23, 42, 0.18), inset 0 1px 1px var(--glass-highlight);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.feature-stage {
  position: relative;
  height: calc(var(--feature-count) * 70vh + 100vh);
}

.feature-stage-sticky {
  position: sticky;
  top: var(--vp-nav-height, 64px);
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr);
  align-items: center;
  gap: 36px;
  height: calc(100vh - var(--vp-nav-height, 64px));
}

.feature-stage-nav {
  display: grid;
  gap: 2px;
  padding-left: 14px;
  border-left: 1px solid var(--glass-border);
}

.feature-stage-counter {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 0 0 14px 12px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.feature-stage-counter-current {
  font-size: 28px;
  font-weight: 800;
  color: var(--vp-c-brand-1);
}

.feature-stage-nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 500;
  text-align: left;
  color: var(--vp-c-text-3);
  transition: color 0.3s, background-color 0.3s;
}

.feature-stage-nav-item::before {
  content: '';
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: -15px;
  width: 2px;
  border-radius: 2px;
  background: var(--vp-c-brand-1);
  opacity: 0;
  transform: scaleY(0.3);
  transition: opacity 0.3s, transform 0.3s;
}

.feature-stage-nav-item:hover {
  color: var(--vp-c-text-1);
}

.feature-stage-nav-item.is-done {
  color: var(--vp-c-text-2);
}

.feature-stage-nav-item.is-active {
  background: var(--vp-c-brand-soft);
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.feature-stage-nav-item.is-active::before {
  opacity: 1;
  transform: none;
}

.feature-stage-nav-index {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  opacity: 0.7;
}

.rows {
  display: grid;
}

.row {
  display: grid;
  grid-area: 1 / 1;
  grid-template-columns: minmax(0, 0.68fr) minmax(0, 1.32fr);
  align-items: center;
  gap: 44px;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.55s ease, visibility 0s linear 0.55s;
}

.row.is-active {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity 0.55s ease, visibility 0s;
}

.row-copy,
.row-visual {
  transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), filter 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.row:not(.is-active) .row-copy {
  filter: blur(6px);
  transform: translateY(48px);
}

.row:not(.is-active) .row-visual {
  filter: blur(6px);
  transform: translateY(48px) scale(0.94);
}

.row.is-before .row-copy {
  transform: translateY(-48px);
}

.row.is-before .row-visual {
  transform: translateY(-48px) scale(0.94);
}

.row.is-active .row-visual {
  transition-delay: 0.08s;
}

.row-badge {
  display: inline-flex;
  padding: 5px 12px;
  border: 1px solid var(--sl-border-strong);
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}

.row-title {
  margin-top: 16px;
  font-size: clamp(22px, 2.2vw, 28px);
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--vp-c-text-1);
}

.row-text {
  margin-top: 12px;
  font-size: 15px;
  line-height: 1.6;
}

.row-points {
  margin: 20px 0 24px;
  font-size: 14px;
}

.row-points li {
  line-height: 1.5;
}

.row-check {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  border-radius: 50%;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.row-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  text-decoration: none;
  will-change: transform;
}

.row-link:hover {
  border-color: var(--sl-border-strong);
  color: var(--vp-c-brand-1);
}

.row-link .vpi-arrow-right {
  width: 15px;
  height: 15px;
}

.row-visual {
  position: relative;
  padding: 14px;
  border-radius: 24px;
}

.row-visual::before {
  content: '';
  position: absolute;
  inset: 12% 8%;
  z-index: -1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.28), transparent 70%);
  filter: blur(40px);
}

.row-shot {
  margin: 0;
  overflow: hidden;
  max-height: calc(100vh - var(--vp-nav-height, 64px) - 100px);
  border: 1px solid var(--sl-border);
  border-radius: 16px;
  background: var(--vp-c-bg);
  box-shadow: var(--sl-shadow-lg);
  transform: perspective(1600px) rotateY(-4deg) rotateX(2deg);
  transition: transform 0.5s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.row:hover .row-shot {
  transform: none;
}

.row-img {
  display: block;
  width: 100%;
  height: auto;
}

.row-img--dark {
  display: none;
}

.extras {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 0;
}

.extra {
  display: flex;
  gap: 14px;
  padding: 20px;
  border-radius: 20px;
  transition: transform 0.3s, border-color 0.3s;
}

.extra:hover {
  border-color: var(--sl-border-strong);
  transform: translateY(-3px);
}

.extra-icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--sl-gradient);
  color: #fff;
}

.extra-title {
  font-size: 15px;
}

.extra-text {
  margin-top: 4px;
  font-size: 14px;
}

.features--animated [data-feature-reveal] {
  opacity: 0;
  filter: blur(8px);
  transform: translateY(48px);
  transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1), filter 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}

.features--animated [data-feature-reveal].is-in {
  opacity: 1;
  filter: none;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .features-aurora,
  .features-marquee-track {
    animation: none;
  }
}

@media (max-width: 960px) {
  .features {
    padding-top: 160px;
  }

  .feature-stage {
    height: auto;
  }

  .feature-stage-sticky {
    position: static;
    display: block;
    height: auto;
  }

  .feature-stage-nav {
    display: none;
  }

  .rows {
    gap: 80px;
  }

  .row {
    grid-area: auto;
    grid-template-columns: 1fr;
    gap: 32px;
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .row:not(.is-active) .row-copy,
  .row:not(.is-active) .row-visual,
  .row.is-before .row-copy,
  .row.is-before .row-visual {
    filter: none;
    transform: none;
  }

  .row-shot {
    max-height: 560px;
  }

  .extras {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 56px;
  }
}

@media (max-width: 560px) {
  .features-heading {
    margin-bottom: 64px;
  }

  .row-visual {
    padding: 12px;
    border-radius: 20px;
  }

  .extras {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
.dark .row-shot .row-img--light {
  display: none;
}

.dark .row-shot .row-img--dark {
  display: block;
}
</style>
