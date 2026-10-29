<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import AiTerminal from './AiTerminal.vue';
import SlIcon, { type IconName } from './SlIcon.vue';

type Point = { title: string; text: string };

type Showcase = {
  id: string;
  icon: IconName;
  eyebrow: string;
  title: string;
  text: string;
  points: Point[];
  docs: string;
  url: string;
  video?: string;
};

const overview: { icon: IconName; title: string; text: string }[] = [
  { icon: 'database', title: 'Multi-tenancy', text: 'A separate database for every workspace, created on the fly.' },
  { icon: 'globe', title: 'Custom domains', text: 'Primary and secondary domains, each with its own branding.' },
  { icon: 'lock', title: 'Authentication', text: 'Login, registration, password reset and email verification.' },
  { icon: 'key', title: 'Two-factor & passkeys', text: 'Authenticator codes, recovery codes and passwordless sign-in.' },
  { icon: 'user-check', title: 'Users & invitations', text: 'Invite people by email with a link that works for 7 days.' },
  { icon: 'shield', title: 'Roles & permissions', text: 'System and custom roles, plus permissions per user.' },
  { icon: 'languages', title: '17 languages', text: 'Every screen, email and message translated end to end.' },
  { icon: 'bell', title: 'Notifications', text: 'A header bell with unread badge and a full inbox page.' },
  { icon: 'panel', title: 'Layouts', text: 'Sidebar or top nav, three sidebar variants, per-user choice.' },
  { icon: 'grip', title: 'Menu builder', text: 'Database menus you reorder with drag and drop.' },
  { icon: 'construction', title: 'Maintenance mode', text: 'Take every workspace offline with a bypass link.' },
  { icon: 'alert', title: 'Workspace suspension', text: 'Suspend one tenant with its own full-page message.' },
  { icon: 'settings', title: 'Account settings', text: 'Profile, password, two-factor, passkeys and account deletion.' },
  { icon: 'moon', title: 'Light & dark', text: 'Light, dark and system appearance, remembered per browser.' },
  { icon: 'bot', title: 'AI-ready', text: 'Your AI coding assistant already knows how the project is built.' },
  { icon: 'code', title: 'Typed end to end', text: 'Your editor knows every route and field, so mistakes show up early.' },
  { icon: 'flask', title: 'Tested & linted', text: 'Tests and code-style checks run on every push.' },
  { icon: 'shield', title: 'Error pages', text: 'Designed 403, 404, 500 and 503 pages that match the app.' },
  { icon: 'layout-grid', title: 'Landing page', text: 'A marketing home page on the central domain.' },
  { icon: 'building', title: 'Tenant workspaces', text: 'Each customer gets users, roles and settings of their own.' },
];

const showcases: Showcase[] = [
  {
    id: 'auth',
    icon: 'lock',
    eyebrow: 'Authentication',
    title: 'Secure sign-in for every workspace',
    text: 'Login, sign-up, password reset, two-factor codes and passkeys work for you and for every customer workspace, built on Laravel Fortify.',
    points: [
      { title: 'Every sign-in screen', text: 'Login, sign-up, forgot password, email verification and password confirmation.' },
      { title: 'Two-factor login', text: 'Codes from an authenticator app, plus backup codes in case a phone is lost.' },
      { title: 'Passkeys', text: 'Passwordless sign-in with Face ID, Touch ID or a security key.' },
      { title: 'On or off per domain', text: 'Choose which sign-in options each domain offers.' },
      { title: 'Three sign-in layouts', text: 'Card, simple or split screen, chosen in Layout Settings.' },
      { title: 'Separate logins', text: 'Your admin accounts and your customers’ accounts are kept completely apart.' },
    ],
    docs: '/docs/core/authentication.html',
    url: 'saas.com/login',
    video: 'auth',
  },
  {
    id: 'tenancy',
    icon: 'database',
    eyebrow: 'Multi-tenancy',
    title: 'Create a tenant, open its own workspace',
    text: 'Fill in one form and the kit sets everything up: a fresh database for the customer, default roles and menus, and an invite for their admin. The workspace is live on its own subdomain right away.',
    points: [
      { title: 'Own database', text: 'Each customer’s data lives in its own database, ready the moment it is created.' },
      { title: 'Own address', text: 'Each workspace opens on its own subdomain, like abc.saas.com.' },
      { title: 'Admin invite', text: 'The customer’s admin gets an invite link, and you can resend it any time.' },
      { title: 'Status at a glance', text: 'See which workspaces are active, on trial, waiting for an invite or suspended.' },
      { title: 'Company details', text: 'Keep industry, team size, working days and tax numbers in one place.' },
      { title: 'Help locked-out admins', text: 'Send a reset email or set a new password yourself.' },
    ],
    docs: '/docs/core/multi-tenancy.html',
    url: 'saas.com/tenants',
    video: 'tenancy',
  },
  {
    id: 'workspace',
    icon: 'building',
    eyebrow: 'Tenant workspace',
    title: 'Every customer gets their own app',
    text: 'The tenant admin accepts the invitation on their own subdomain, sets a password and lands in a workspace with its own users, roles, menus, settings and database.',
    points: [
      { title: 'Invitation on the tenant domain', text: 'The admin sets a password at abc.saas.com and the workspace becomes Active.' },
      { title: 'Own users & roles', text: 'Tenants invite their team and manage roles without touching other workspaces.' },
      { title: 'Own branding', text: 'The workspace name shows in the sidebar, sign-in pages and emails.' },
      { title: 'Private data', text: 'A workspace only ever sees its own data, never another customer’s.' },
      { title: 'Same features inside', text: 'Notifications, 17 languages, layouts and menus work in every workspace.' },
      { title: 'Own login page', text: 'Customers sign in at their own address with their own accounts.' },
    ],
    docs: '/docs/core/multi-tenancy.html',
    url: 'northwind-labs.saas.com/invitation/accept',
    video: 'workspace',
  },
  {
    id: 'domains',
    icon: 'globe',
    eyebrow: 'Domains',
    title: 'Brand every domain on its own',
    text: 'Each tenant can have primary and secondary domains. Every domain gets its own app name, default language and sign-in features.',
    points: [
      { title: 'Primary & secondary', text: 'Give a tenant abc.saas.com and portal.saas.com, and choose the primary one.' },
      { title: 'App name per domain', text: 'Shown in the sidebar, on sign-in pages and in emails.' },
      { title: 'Default language', text: 'Guests see the domain language first, users can still pick their own.' },
      { title: 'Sign-in options per domain', text: 'Turn sign-up, password reset, two-factor and passkeys on or off.' },
      { title: 'Domains overview', text: 'Search every domain and filter by primary or secondary.' },
      { title: 'Same workspace everywhere', text: 'Every domain of a customer opens the same workspace and data.' },
    ],
    docs: '/docs/core/domains.html',
    url: 'saas.com/tenants/9',
    video: 'domains',
  },
  {
    id: 'users',
    icon: 'shield',
    eyebrow: 'Users, roles & permissions',
    title: "Access control that's ready on day one",
    text: 'Invite people, give them a role and decide exactly what each person can do, in your admin panel and in every customer workspace.',
    points: [
      { title: 'Email invitations', text: 'Invites go out by email with a link that works for 7 days. Pending invites are clearly marked.' },
      { title: 'Ready-made and custom roles', text: 'Start with sensible default roles and add your own whenever you need.' },
      { title: 'Extra access per person', text: 'Give one person more access without creating a new role.' },
      { title: 'Easy to extend', text: 'Add a new permission in one file and it shows up everywhere.' },
      { title: 'Clean screens', text: 'People only see the menus and buttons they are allowed to use.' },
      { title: 'Super admin', text: 'Your top account can always do everything.' },
    ],
    docs: '/docs/core/users-roles-permissions.html',
    url: 'saas.com/users',
    video: 'users',
  },
  {
    id: 'localization',
    icon: 'languages',
    eyebrow: 'Localization',
    title: '17 languages, switched in one click',
    text: 'Every screen, menu, email and error message is translated. Users switch language in one click and the whole app follows.',
    points: [
      { title: '17 languages included', text: 'English, Hindi, Spanish, French, German, Japanese and 11 more.' },
      { title: 'Per-user language', text: 'Picked from the header or the profile and saved to the account.' },
      { title: 'Per-domain default', text: 'Each domain decides the language guests see first.' },
      { title: 'Translated everywhere', text: 'Menus, emails, validation messages and notifications.' },
      { title: 'Easy to edit', text: 'Each feature keeps its words in one simple file per language.' },
      { title: 'Works in every kit', text: 'Vue, React and Svelte all read the same translation files.' },
    ],
    docs: '/docs/core/localization.html',
    url: 'saas.com/tenants',
    video: 'localization',
  },
  {
    id: 'notifications',
    icon: 'bell',
    eyebrow: 'Notifications',
    title: 'Keep every user in the loop',
    text: 'Let people know when something happens. New notifications show up in the bell at the top of every page.',
    points: [
      { title: 'Header bell', text: 'An unread badge and the latest notifications on every page.' },
      { title: 'Notifications page', text: 'All and Unread filters, mark as read, delete and clear all.' },
      { title: 'Easy to send', text: 'Notify anyone from your own code with a single line.' },
      { title: 'Translated', text: 'Titles and messages appear in each user’s language.' },
      { title: 'Built-in events', text: 'Super admins are notified when an invited user joins.' },
      { title: 'Works everywhere', text: 'In your admin panel and in every customer workspace.' },
    ],
    docs: '/docs/core/notifications.html',
    url: 'saas.com/tenants',
    video: 'notifications',
  },
  {
    id: 'layouts',
    icon: 'panel',
    eyebrow: 'Layouts',
    title: 'Sidebar, top nav or floating: your call',
    text: 'Set the default look for everyone in Setup → Layout Settings. Every user can then save their own workspace layout under Settings → Layout.',
    points: [
      { title: 'Two app layouts', text: 'A sidebar layout or a top navigation header.' },
      { title: 'Sidebar variants', text: 'Inset, edge-to-edge sidebar or a floating island.' },
      { title: 'Collapsible sidebar', text: 'Shrink it to icons, slide it away or keep it open.' },
      { title: 'System defaults', text: 'Admins choose the default app and sign-in layouts.' },
      { title: 'Personal choice', text: 'Each user picks the layout they like, and it is remembered.' },
      { title: 'Light & dark', text: 'Light, dark and system appearance.' },
    ],
    docs: '/docs/core/navigation-and-layouts.html',
    url: 'saas.com/settings/layout',
    video: 'layouts',
  },
  {
    id: 'menus',
    icon: 'grip',
    eyebrow: 'Menus & navigation',
    title: 'Reorder navigation with drag and drop',
    text: 'Menus are stored in the database, so you can reorder and reshape the navigation without touching any code.',
    points: [
      { title: 'Drag & drop', text: 'Changes save on their own, and one click brings back the original order.' },
      { title: 'No code needed', text: 'Menus are saved in the database, so you change them right from the screen.' },
      { title: 'Shows only what fits', text: 'People never see menu items they are not allowed to open.' },
      { title: 'Translated titles', text: 'Menu titles follow the user’s language.' },
      { title: 'Central and tenant menus', text: 'Separate navigation for the central app and every workspace.' },
      { title: 'Works with every layout', text: 'In the top-nav layout, menus open as tidy dropdowns.' },
    ],
    docs: '/docs/core/navigation-and-layouts.html',
    url: 'saas.com/setup/menus',
    video: 'menus',
  },
  {
    id: 'maintenance',
    icon: 'construction',
    eyebrow: 'Maintenance & suspension',
    title: 'Take workspaces offline safely',
    text: 'Switch every tenant workspace into maintenance from Setup → Tenant Settings while the central app stays online.',
    points: [
      { title: 'One switch', text: 'Every workspace goes into maintenance, the central app stays up.' },
      { title: 'Custom message', text: 'Shown on an illustrated 503 page.' },
      { title: 'Secret link', text: 'Share a link that lets you in for 12 hours to test things.' },
      { title: 'Let your team in', text: 'Visitors from your office IP addresses skip the maintenance page.' },
      { title: 'Admins can still sign in', text: 'Tenant login stays reachable during maintenance.' },
      { title: 'Suspend one workspace', text: 'With its own message on a full-page notice.' },
    ],
    docs: '/docs/core/maintenance-and-suspension.html',
    url: 'saas.com/setup/tenant-settings',
    video: 'maintenance',
  },
  {
    id: 'ai',
    icon: 'bot',
    eyebrow: 'AI-ready',
    title: 'Build anything with AI, the right way',
    text: 'Every kit ships with tuned AI guidelines, so your coding agent knows the directory structure, the module pattern and the conventions before it writes a line. Describe a feature in plain English and it lands in the right folders, translated, permission-aware and tested like the rest of the kit.',
    points: [
      { title: 'Follows the directory structure', text: 'New code goes into the existing folders and module layout, never a new base folder.' },
      { title: 'Follows your conventions', text: 'It looks at nearby files and reuses the components, names and patterns already there.' },
      { title: 'Project rules first', text: 'AGENTS.md and CLAUDE.md are read before any file is touched.' },
      { title: 'Skills for every package', text: 'Tenancy, Fortify, Inertia, Wayfinder, laravel-data, Pest and Tailwind.' },
      { title: 'Laravel Boost', text: 'The assistant can look at your database, logs and the Laravel docs while it works.' },
      { title: 'Works with your agent', text: 'Claude Code, Codex, Junie and Antigravity, set up in Vue, React and Svelte.' },
    ],
    docs: '/docs.html',
    url: '',
  },
];

const scenes = showcases.filter((item) => item.video);
const ai = showcases.find((item) => !item.video)!;

const root = ref<HTMLElement | null>(null);
const stage = ref<HTMLElement | null>(null);
const giant = ref<HTMLElement | null>(null);
const reduced = ref(false);
const desktop = ref(true);
const active = ref(0);
const inView = new Set<HTMLVideoElement>();
let observer: IntersectionObserver | null = null;
let videoObserver: IntersectionObserver | null = null;
let media: MediaQueryList | null = null;
let frameId = 0;

const pad = (value: number) => String(value).padStart(2, '0');

const syncVideos = () => {
  root.value?.querySelectorAll<HTMLVideoElement>('video[data-index]').forEach((video) => {
    const play = inView.has(video) && !reduced.value && (!desktop.value || Number(video.dataset.index) === active.value);
    if (play) {
      video.play().catch(() => {});
    } else if (!video.paused) {
      video.pause();
    }
  });
};

const track = () => {
  frameId = 0;
  if (giant.value) {
    const box = giant.value.getBoundingClientRect();
    const shift = Math.min(Math.max((window.innerHeight - box.top) / (window.innerHeight + box.height), 0), 1);
    giant.value.style.setProperty('--shift', shift.toFixed(4));
  }
  if (!stage.value || !desktop.value) {
    return;
  }
  const rect = stage.value.getBoundingClientRect();
  const progress = Math.min(Math.max(-rect.top / (rect.height - window.innerHeight), 0), 0.9999);
  const next = Math.floor(progress * scenes.length);
  if (next !== active.value) {
    active.value = next;
    syncVideos();
  }
};

const onScroll = () => {
  if (!frameId) {
    frameId = requestAnimationFrame(track);
  }
};

const onMedia = () => {
  desktop.value = media?.matches ?? true;
  track();
  syncVideos();
};

const goTo = (index: number) => {
  if (!stage.value) {
    return;
  }
  const rect = stage.value.getBoundingClientRect();
  const step = (rect.height - window.innerHeight) / scenes.length;
  window.scrollTo({ top: rect.top + window.scrollY + step * index + step * 0.5, behavior: reduced.value ? 'auto' : 'smooth' });
};

onMounted(() => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  media = window.matchMedia('(min-width: 961px)');
  desktop.value = media.matches;
  media.addEventListener('change', onMedia);

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer?.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  root.value?.querySelectorAll('[data-reveal]').forEach((el) => observer?.observe(el));

  videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          inView.add(video);
        } else {
          inView.delete(video);
        }
      });
      syncVideos();
    },
    { threshold: 0.35 },
  );
  root.value?.querySelectorAll('video').forEach((video) => videoObserver?.observe(video));

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  track();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  videoObserver?.disconnect();
  media?.removeEventListener('change', onMedia);
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', onScroll);
  cancelAnimationFrame(frameId);
});
</script>

<template>
  <section ref="root" class="sl-section tour" aria-labelledby="showcase-title">
    <div class="sl-container tour-inner">
      <div class="showcase-heading" data-reveal>
        <p class="sl-eyebrow">Everything included</p>
        <h2 id="showcase-title" class="sl-h2">Every feature a SaaS needs, already built</h2>
        <p class="sl-lead">
          Twenty features that usually take months, wired together and working from the first install.
        </p>
      </div>

      <div class="overview" data-reveal>
        <div v-for="item in overview" :key="item.title" class="overview-cell">
          <span class="overview-icon"><SlIcon :name="item.icon" :size="18" /></span>
          <span class="overview-title">{{ item.title }}</span>
          <span class="overview-text">{{ item.text }}</span>
        </div>
      </div>

      <article :id="`feature-${ai.id}`" class="feature feature--ai" data-reveal>
        <div class="feature-copy">
          <p class="feature-eyebrow">
            <span class="feature-eyebrow-icon"><SlIcon :name="ai.icon" :size="15" /></span>{{ ai.eyebrow }}
          </p>
          <h3 class="feature-title">{{ ai.title }}</h3>
          <p class="feature-text">{{ ai.text }}</p>
          <ul class="feature-points">
            <li v-for="point in ai.points" :key="point.title">
              <span class="feature-check"><SlIcon name="check" :size="11" /></span>
              <span>
                <strong>{{ point.title }}</strong>
                <span>{{ point.text }}</span>
              </span>
            </li>
          </ul>
          <a class="sl-link feature-link" :href="ai.docs">Read the documentation →</a>
        </div>

        <figure class="feature-media">
          <AiTerminal />
        </figure>
      </article>

      <div ref="giant" class="tour-giant" aria-hidden="true">In action</div>

      <div class="showcase-intro" data-reveal>
        <h2 class="sl-h2">Real screens, not mockups</h2>
        <p class="sl-lead">Every clip below is the starter kit itself, running locally. The Vue, React and Svelte kits look and work the same.</p>
      </div>

      <div ref="stage" class="tour-stage" :style="{ '--count': scenes.length }">
        <div class="tour-stage-sticky">
          <div class="tour-stage-progress">
            <span class="tour-stage-count"><b>{{ pad(active + 1) }}</b> / {{ pad(scenes.length) }}</span>
            <span class="tour-stage-name">{{ scenes[active].eyebrow }}</span>
            <div class="tour-stage-steps">
              <button
                v-for="(item, index) in scenes"
                :key="item.id"
                type="button"
                :class="{ 'is-active': index === active, 'is-done': index < active }"
                :aria-label="item.eyebrow"
                :title="item.eyebrow"
                @click="goTo(index)"
              />
            </div>
          </div>

          <div class="tour-stage-rows">
          <article
            v-for="(item, index) in scenes"
            :id="`feature-${item.id}`"
            :key="item.id"
            class="feature"
            :class="{ 'feature--reverse': index % 2 === 1, 'is-active': index === active, 'is-before': index < active }"
          >
            <div class="feature-copy">
              <p class="feature-eyebrow">
                <span class="feature-eyebrow-icon"><SlIcon :name="item.icon" :size="15" /></span>{{ item.eyebrow }}
              </p>
              <h3 class="feature-title">{{ item.title }}</h3>
              <p class="feature-text">{{ item.text }}</p>
              <ul class="feature-points">
                <li v-for="(point, pointIndex) in item.points" :key="point.title" :style="{ '--n': pointIndex }">
                  <span class="feature-check"><SlIcon name="check" :size="11" /></span>
                  <span>
                    <strong>{{ point.title }}</strong>
                    <span>{{ point.text }}</span>
                  </span>
                </li>
              </ul>
              <a class="sl-link feature-link" :href="item.docs">Read the {{ item.eyebrow.toLowerCase() }} docs →</a>
            </div>

            <figure class="feature-media">
              <div class="window">
                <div class="window-bar">
                  <span class="window-dots" aria-hidden="true"><i /><i /><i /></span>
                  <span class="window-url"><SlIcon name="lock" :size="11" />{{ item.url }}</span>
                </div>
                <div class="window-screen">
                  <video
                    :data-index="index"
                    :src="`/videos/${item.video}.mp4`"
                    :poster="`/videos/${item.video}.webp`"
                    muted
                    loop
                    playsinline
                    preload="none"
                    :controls="reduced"
                    width="1600"
                    height="1000"
                    :aria-label="`${item.eyebrow} recorded in the starter kit`"
                  />
                </div>
              </div>

            </figure>
          </article>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tour {
  position: relative;
  padding-bottom: 0;
  overflow-x: clip;
  border-top: 1px solid var(--sl-border);
}

.tour-inner {
  max-width: 1320px;
}

.showcase-heading,
.showcase-intro {
  max-width: 720px;
  margin: 0 auto 48px;
  text-align: center;
}

.tour-giant {
  margin: 24px 0 0;
  font-size: clamp(96px, 17vw, 260px);
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: -0.04em;
  text-align: center;
  text-transform: uppercase;
  white-space: nowrap;
  color: transparent;
  -webkit-text-stroke: 1.5px var(--sl-border-strong);
  opacity: 0.6;
  transform: translateX(calc(12% - var(--shift, 0) * 24%));
  pointer-events: none;
  user-select: none;
}

.showcase-intro {
  margin: 16px auto 0;
}

.tour-stage {
  position: relative;
  height: calc(var(--count) * 75vh + 100vh);
}

.tour-stage-sticky {
  position: sticky;
  top: var(--vp-nav-height, 64px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 32px;
  height: calc(100vh - var(--vp-nav-height, 64px));
}

.tour-stage-progress {
  display: flex;
  align-items: center;
  gap: 18px;
}

.tour-stage-count {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.tour-stage-count b {
  font-size: 15px;
  color: var(--vp-c-brand-1);
}

.tour-stage-name {
  min-width: 190px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-1);
}

.tour-stage-steps {
  display: flex;
  flex: 1;
  gap: 6px;
}

.tour-stage-steps button {
  flex: 1;
  height: 18px;
  padding: 0;
  cursor: pointer;
}

.tour-stage-steps button::before {
  content: '';
  display: block;
  height: 4px;
  border-radius: 999px;
  background: var(--sl-border);
  transition: background-color 0.3s, transform 0.3s;
}

.tour-stage-steps button:hover::before {
  transform: scaleY(1.5);
}

.tour-stage-steps button.is-done::before {
  background: var(--sl-border-strong);
}

.tour-stage-steps button.is-active::before {
  background: var(--sl-gradient);
}

.tour-stage-rows {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

.tour-stage .feature {
  grid-area: 1 / 1;
  padding: 0;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.45s ease, visibility 0s linear 0.45s;
}

.tour-stage .feature + .feature {
  border-top: 0;
}

.feature--ai {
  margin-top: 40px;
  padding-bottom: 16px;
}

.tour-stage .feature.is-active {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity 0.45s ease, visibility 0s;
}

.tour-stage .feature.is-active .feature-copy > * {
  animation: copy-in 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.tour-stage .feature.is-active .feature-copy > :nth-child(2) {
  animation-delay: 0.07s;
}

.tour-stage .feature.is-active .feature-copy > :nth-child(3) {
  animation-delay: 0.14s;
}

.tour-stage .feature.is-active .feature-copy > :nth-child(4) {
  animation: none;
}

.tour-stage .feature.is-active .feature-copy > :nth-child(5) {
  animation-delay: 0.55s;
}

.tour-stage .feature.is-active .feature-points li {
  animation: copy-in 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  animation-delay: calc(0.2s + var(--n) * 60ms);
}

.tour-stage .feature.is-active .feature-media {
  --dir: 1;
  animation: media-in 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.tour-stage .feature--reverse.is-active .feature-media {
  --dir: -1;
}

@keyframes copy-in {
  from {
    opacity: 0;
    transform: translateY(26px);
    filter: blur(6px);
  }
}

@keyframes media-in {
  from {
    opacity: 0;
    transform: perspective(1400px) translateX(calc(var(--dir) * 70px)) rotateY(calc(var(--dir) * -12deg)) scale(0.94);
    filter: blur(8px);
  }
}

@media (min-width: 961px) and (max-height: 860px) {
  .tour-stage-sticky {
    gap: 20px;
  }

  .tour-stage .feature-title {
    font-size: 26px;
  }

  .tour-stage .feature-text {
    font-size: 15px;
  }

  .tour-stage .feature-points {
    gap: 12px 22px;
    margin-top: 20px;
  }

  .tour-stage .feature-link {
    margin-top: 18px;
  }
}

[data-reveal] {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s ease, transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1);
}

[data-reveal].is-visible {
  opacity: 1;
  transform: none;
}

.overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--sl-border);
  border-left: 1px solid var(--sl-border);
  border-radius: var(--sl-radius);
  overflow: hidden;
  background: var(--sl-surface);
}

.overview-cell {
  position: relative;
  display: grid;
  align-content: start;
  gap: 6px;
  padding: 24px 22px 26px;
  border-right: 1px solid var(--sl-border);
  border-bottom: 1px solid var(--sl-border);
  transition: background-color 0.25s;
}

.overview-cell:hover {
  background: var(--sl-surface-muted);
}

.overview-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  margin-bottom: 8px;
  border-radius: 10px;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.overview-cell:hover .overview-icon {
  transform: translateY(-2px) scale(1.06);
}

.overview-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.overview-text {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}


.feature {
  display: grid;
  grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr);
  align-items: center;
  gap: 56px;
  padding: 72px 0;
  scroll-margin-top: calc(var(--vp-nav-height, 64px) + 24px);
}

.feature + .feature {
  border-top: 1px dashed var(--sl-border);
}

.feature--reverse {
  grid-template-columns: minmax(0, 1.22fr) minmax(0, 0.78fr);
}

.feature--reverse .feature-media {
  order: -1;
}

.feature-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}

.feature-eyebrow-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: #fff;
  background: var(--sl-gradient);
  box-shadow: 0 6px 16px -6px rgba(99, 102, 241, 0.6);
}

.feature-title {
  margin: 0;
  font-size: clamp(26px, 2.6vw, 34px);
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
}

.feature-text {
  margin: 14px 0 0;
  font-size: 16px;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}

.feature-points {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 24px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
}

.feature-points li {
  display: flex;
  gap: 10px;
  margin: 0;
}

.feature-points li > span:last-child {
  display: grid;
  align-content: start;
  gap: 2px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.feature-points strong {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.feature-check {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  border-radius: 50%;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.feature-link {
  display: inline-block;
  margin-top: 28px;
  font-size: 14.5px;
}

.feature-media {
  position: relative;
  margin: 0;
}

.feature-media::before {
  content: '';
  position: absolute;
  inset: 8% -6% -10%;
  z-index: -1;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(99, 102, 241, 0.22), transparent);
  filter: blur(20px);
  pointer-events: none;
}

.window {
  overflow: hidden;
  border: 1px solid var(--sl-border);
  border-radius: 14px;
  background: var(--sl-surface);
  box-shadow: var(--sl-shadow-lg);
  transition: transform 0.5s cubic-bezier(0.2, 0.7, 0.2, 1), box-shadow 0.5s;
}

.feature:hover .window {
  transform: translateY(-4px);
}

.window-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--sl-border);
  background: var(--sl-surface-muted);
}

.window-dots {
  display: inline-flex;
  gap: 6px;
}

.window-dots i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff5f57;
}

.window-dots i:nth-child(2) {
  background: #febc2e;
}

.window-dots i:nth-child(3) {
  background: #28c840;
}

.window-url {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  padding: 4px 12px;
  border: 1px solid var(--sl-border);
  border-radius: 8px;
  overflow: hidden;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  text-overflow: ellipsis;
  background: var(--sl-surface);
}


.window-screen {
  position: relative;
}

.window-screen video {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 10;
  background: #fff;
}




@media (max-width: 1100px) {
  .overview {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .feature {
    gap: 40px;
  }
}

@media (max-width: 960px) {
  .tour-stage {
    height: auto;
  }

  .tour-stage-sticky {
    position: static;
    display: block;
    height: auto;
  }

  .tour-stage-progress {
    display: none;
  }

  .tour-stage .feature {
    grid-area: auto;
    padding: 56px 0;
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .tour-stage .feature + .feature {
    border-top: 1px dashed var(--sl-border);
  }

  .tour-stage .feature.is-active .feature-copy > *,
  .tour-stage .feature.is-active .feature-points li,
  .tour-stage .feature.is-active .feature-media {
    animation: none;
  }

  .feature {
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 56px 0;
  }

  .feature--reverse {
    grid-template-columns: 1fr;
  }

  .feature--reverse .feature-media {
    order: 0;
  }

  .tour-giant {
    margin-top: 16px;
  }
}

@media (max-width: 760px) {
  .overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .overview {
    grid-template-columns: 1fr;
  }

  .overview-cell {
    padding: 20px;
  }

  .feature-points {
    grid-template-columns: 1fr;
  }

}

@media (prefers-reduced-motion: reduce) {
  .tour-stage .feature.is-active .feature-copy > *,
  .tour-stage .feature.is-active .feature-points li,
  .tour-stage .feature.is-active .feature-media {
    animation: none;
  }

  [data-reveal] {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>
