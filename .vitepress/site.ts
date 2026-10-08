export type FrameworkKey = 'vue' | 'react' | 'svelte';

export type PlanKey = FrameworkKey | 'all-kits';

export interface StackItem {
  label: string;
  value: string;
}

export interface Kit {
  key: FrameworkKey;
  name: string;
  title: string;
  price: number;
  repo: string;
  repoName: string;
  tagline: string;
  summary: string;
  stack: StackItem[];
  conventions: StackItem[];
  langImport: string;
  typeCheck: string;
}

export interface Plan {
  key: PlanKey;
  name: string;
  price: number;
  href: string;
  sponsorUrl: string;
  frameworks: FrameworkKey[];
  tagline: string;
  benefits: string[];
  featured: boolean;
}

const githubOwner = 'https://github.com/the-erag';

export const prices = { vue: 29, react: 30, svelte: 33, bundle: 79 } as const;

const sponsorTier = (tierId: number): string => `https://github.com/sponsors/eramitgupta/sponsorships?tier_id=${tierId}`;

export const bundleSavings = prices.vue + prices.react + prices.svelte - prices.bundle;

export const kitPriceList = `Vue $${prices.vue}, React $${prices.react} or Svelte $${prices.svelte}`;

export const site = {
  name: 'SaaS Laravel',
  url: 'https://saas-laravel.com',
  title: 'Laravel SaaS Starter Kits for Vue, React & Svelte',
  description:
    'Production-ready Laravel SaaS starter kits for Vue, React and Svelte with lifetime access and weekly updates.',
  themeColor: '#4f46e5',
  sponsorUrl: 'https://github.com/sponsors/eramitgupta',
  githubProfile: githubOwner,
  company: {
    name: 'ERAG',
    tagline: 'Engineer • Research • Advance • Grow',
    url: 'https://erag.in',
    github: githubOwner,
    email: 'erag.office@gmail.com',
  },
  social: {
    github: githubOwner,
    linkedin: 'https://www.linkedin.com/company/the-erag',
    x: 'https://x.com/the_erag',
    xHandle: '@the_erag',
  },
  docsEditPattern: `${githubOwner}/laravel-saas-starter-kit-docs/edit/main/:path`,
  /** The date the current prices took effect (the Offer's validFrom). Update it when prices change. */
  pricesValidFrom: '2026-09-27',
  /** Raw Markdown of each page in the public docs repository, for LLMs. */
  docsRawBase: 'https://raw.githubusercontent.com/the-erag/laravel-saas-starter-kit-docs/main',
  bundlePrice: prices.bundle,
  kitPriceFrom: Math.min(prices.vue, prices.react, prices.svelte),
  paymentNote: 'One-time payment · Lifetime access · Weekly updates included · No recurring subscription',
  accessNote: 'Lifetime access with weekly updates.',
  googleSiteVerification: 'U0WTb7Bs263WPTVwQx1JmXhsou5IPxtsBNVhBX2GpFQ',
};

export interface BlogAuthor {
  name: string;
  type: 'Person' | 'Organization';
  /** Author page on this site, listing the author's articles. */
  page: string;
  /** The author's own profiles elsewhere (schema.org sameAs). Only add real profiles. */
  sameAs: string[];
}

/** Blog authors, referenced by key from a post's `author` frontmatter. Each key has a page at authors/<key>.md. */
export const blogAuthors: Record<string, BlogAuthor> = {
  erag: {
    name: site.company.name,
    type: 'Organization',
    page: '/authors/erag.html',
    sameAs: [site.company.url, site.social.github, site.social.linkedin, site.social.x],
  },
  'annu-gupta': { name: 'Annu Gupta', type: 'Person', page: '/authors/annu-gupta.html', sameAs: [] },
};

export const blogAuthor = (key?: string): BlogAuthor => blogAuthors[key ?? ''] ?? blogAuthors.erag;

/** Blog topics, referenced by key from a post's `category` frontmatter. */
export const blogCategories = [
  { key: 'multi-tenancy', label: 'Multi-tenancy' },
  { key: 'security', label: 'Authentication & security' },
  { key: 'permissions', label: 'Users & permissions' },
  { key: 'architecture', label: 'Architecture & code quality' },
  { key: 'frontend', label: 'Inertia & frontends' },
  { key: 'localization', label: 'Localization' },
  { key: 'saas', label: 'SaaS & operations' },
  { key: 'tooling', label: 'AI & developer tooling' },
] as const;

/** Pillar articles shown under "Start here" on the blog index. */
export const blogStartHere = [
  '/blog/laravel-saas-starter-kit.html',
  '/blog/multi-tenant-saas-laravel-database-per-tenant.html',
  '/blog/laravel-fortify-tutorial.html',
  '/blog/laravel-roles-permissions-spatie.html',
  '/blog/modular-laravel-architecture.html',
  '/blog/vue-react-or-svelte-laravel-saas.html',
];

export const backendStack: StackItem[] = [
  { label: 'Framework', value: 'Laravel 13 on PHP 8.3+' },
  { label: 'Bridge', value: 'Inertia v3 (inertia-laravel)' },
  { label: 'Authentication', value: 'Laravel Fortify + passkeys' },
  { label: 'Multi-tenancy', value: 'stancl/tenancy, database per tenant' },
  { label: 'Authorization', value: 'spatie/laravel-permission' },
  { label: 'Validation & types', value: 'spatie/laravel-data + TypeScript transformer' },
  { label: 'Typed routes', value: 'Laravel Wayfinder' },
  { label: 'Translations', value: 'erag/laravel-lang-sync-inertia' },
  { label: 'Quality', value: 'Pest 5, Larastan, Pint, Laravel Boost' },
];

export const frontendCommon: string[] = ['TypeScript 5', 'Tailwind CSS v4', 'Vite 8', 'Wayfinder', 'Lang Sync Inertia', 'ESLint 9 + Prettier 3'];

export const kits: Record<FrameworkKey, Kit> = {
  vue: {
    key: 'vue',
    name: 'Vue',
    title: 'Vue Starter Kit',
    price: prices.vue,
    repo: `${githubOwner}/saas-laravel-starter-kit-vue`,
    repoName: 'saas-laravel-starter-kit-vue',
    tagline: 'Vue 3.5 with <script setup>, TypeScript and shadcn-vue.',
    summary:
      'Our Laravel SaaS backend with a Vue 3 frontend. Pages use <script setup> and TypeScript, the UI is built from shadcn-vue components on Reka UI, and composables handle permissions, layout and translations.',
    stack: [
      { label: 'Framework', value: 'Vue 3.5, <script setup> and TypeScript' },
      { label: 'Inertia adapter', value: '@inertiajs/vue3 v3' },
      { label: 'UI components', value: 'shadcn-vue on Reka UI' },
      { label: 'Icons', value: '@lucide/vue' },
      { label: 'Toasts', value: 'vue-sonner' },
      { label: 'Menu drag & drop', value: 'vue-draggable-plus' },
      { label: 'Type check', value: 'vue-tsc' },
    ],
    conventions: [
      { label: 'Pages', value: 'resources/js/pages/tenants/Index.vue' },
      { label: 'Components', value: 'PascalCase .vue files' },
      { label: 'Composables', value: 'resources/js/composables/useX.ts' },
    ],
    langImport: "import { vueLang } from '@erag/lang-sync-inertia/vue'\n\nconst { __ } = vueLang()\n\n__('modules.tenant.index.title')",
    typeCheck: 'vue-tsc',
  },
  react: {
    key: 'react',
    name: 'React',
    title: 'React Starter Kit',
    price: prices.react,
    repo: `${githubOwner}/saas-laravel-starter-kit-react`,
    repoName: 'saas-laravel-starter-kit-react',
    tagline: 'React 19 with TypeScript and shadcn/ui on Radix UI.',
    summary:
      'Our Laravel SaaS backend with a React 19 frontend in TypeScript. The UI is built from shadcn/ui components on Radix UI, and hooks handle permissions, layout and translations.',
    stack: [
      { label: 'Framework', value: 'React 19.2 + TypeScript' },
      { label: 'Inertia adapter', value: '@inertiajs/react v3' },
      { label: 'UI components', value: 'shadcn/ui on Radix UI' },
      { label: 'Icons', value: 'lucide-react' },
      { label: 'Toasts', value: 'sonner' },
      { label: 'Menu drag & drop', value: 'sortablejs' },
      { label: 'Type check', value: 'tsc' },
    ],
    conventions: [
      { label: 'Pages', value: 'resources/js/pages/tenants/index.tsx' },
      { label: 'Components', value: 'kebab-case .tsx files' },
      { label: 'Hooks', value: 'resources/js/hooks/use-x.ts' },
    ],
    langImport: "import { reactLang } from '@erag/lang-sync-inertia/react'\n\nconst { __ } = reactLang()\n\n__('modules.tenant.index.title')",
    typeCheck: 'tsc',
  },
  svelte: {
    key: 'svelte',
    name: 'Svelte',
    title: 'Svelte Starter Kit',
    price: prices.svelte,
    repo: `${githubOwner}/saas-laravel-starter-kit-svelte`,
    repoName: 'saas-laravel-starter-kit-svelte',
    tagline: 'Svelte 5 runes with TypeScript and shadcn-svelte.',
    summary:
      'Our Laravel SaaS backend with a Svelte 5 frontend written with runes and TypeScript. The UI is built from shadcn-svelte components on Bits UI, and shared .svelte.ts modules handle permissions, layout and translations.',
    stack: [
      { label: 'Framework', value: 'Svelte 5 (runes) + TypeScript' },
      { label: 'Inertia adapter', value: '@inertiajs/svelte v3' },
      { label: 'UI components', value: 'shadcn-svelte on Bits UI' },
      { label: 'Icons', value: 'lucide-svelte' },
      { label: 'Toasts', value: 'svelte-sonner' },
      { label: 'Menu drag & drop', value: 'sortablejs' },
      { label: 'Type check', value: 'svelte-check' },
    ],
    conventions: [
      { label: 'Pages', value: 'resources/js/pages/tenants/Index.svelte' },
      { label: 'Components', value: 'PascalCase .svelte files' },
      { label: 'Shared logic', value: 'resources/js/lib/*.ts and *.svelte.ts' },
    ],
    langImport: "import { svelteLang } from '@erag/lang-sync-inertia/svelte'\n\nconst { __ } = svelteLang()\n\n__('modules.tenant.index.title')",
    typeCheck: 'svelte-check',
  },
};

export const frameworkKeys: FrameworkKey[] = ['vue', 'react', 'svelte'];

export const plans: Record<PlanKey, Plan> = {
  vue: {
    key: 'vue',
    name: 'Vue Starter Kit',
    price: prices.vue,
    href: '/pricing/vue.html',
    sponsorUrl: sponsorTier(661330),
    frameworks: ['vue'],
    tagline: 'Laravel SaaS backend + Vue 3.5 frontend.',
    benefits: ['Vue 3.5, TypeScript & shadcn-vue', 'Multi-tenancy, auth, roles & permissions', 'Access to the Vue kit repository'],
    featured: false,
  },
  react: {
    key: 'react',
    name: 'React Starter Kit',
    price: prices.react,
    href: '/pricing/react.html',
    sponsorUrl: sponsorTier(661332),
    frameworks: ['react'],
    tagline: 'Laravel SaaS backend + React 19 frontend.',
    benefits: ['React 19, TypeScript & shadcn/ui', 'Multi-tenancy, auth, roles & permissions', 'Access to the React kit repository'],
    featured: false,
  },
  svelte: {
    key: 'svelte',
    name: 'Svelte Starter Kit',
    price: prices.svelte,
    href: '/pricing/svelte.html',
    sponsorUrl: sponsorTier(661333),
    frameworks: ['svelte'],
    tagline: 'Laravel SaaS backend + Svelte 5 frontend.',
    benefits: ['Svelte 5 runes, TypeScript & shadcn-svelte', 'Multi-tenancy, auth, roles & permissions', 'Access to the Svelte kit repository'],
    featured: false,
  },
  'all-kits': {
    key: 'all-kits',
    name: 'All Starter Kits',
    price: prices.bundle,
    href: '/pricing/all-kits.html',
    sponsorUrl: sponsorTier(661334),
    frameworks: ['vue', 'react', 'svelte'],
    tagline: 'Vue, React and Svelte together, one payment.',
    benefits: ['The Vue, React and Svelte kits', 'Access to all three kit repositories', `$${bundleSavings} less than buying them one by one`],
    featured: true,
  },
};

export const planOrder: PlanKey[] = ['vue', 'react', 'svelte', 'all-kits'];

export const requirements: StackItem[] = [
  { label: 'PHP', value: '8.3 or newer' },
  { label: 'Composer', value: 'Composer 2' },
  { label: 'Node.js', value: 'A current Node LTS with npm' },
  { label: 'Database', value: 'MySQL (needed for database-per-tenant)' },
  { label: 'Local server', value: 'Laravel Herd recommended (*.test + wildcard subdomains)' },
];

export const languages: string[] = [
  'English',
  'Hindi',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Japanese',
  'Korean',
  'Turkish',
  'Dutch',
  'Indonesian',
  'Bengali',
  'Polish',
  'Vietnamese',
  'Thai',
];

export const includedFeatures: { title: string; text: string; points: string[] }[] = [
  {
    title: 'Authentication',
    text: 'Login, registration, password reset, email verification, two-factor auth, passkeys and profile & security settings. You switch each one on or off per domain.',
    points: [
      'Login, registration and password reset',
      'Email verification and password confirmation',
      'Two-factor authentication with recovery codes',
      'Passwordless sign-in with passkeys',
      'Switch each auth feature on or off per domain',
      'Profile, password, appearance and account deletion settings',
      'The central app and tenants have their own guards and user tables',
    ],
  },
  {
    title: 'Multi-tenancy',
    text: 'Each tenant gets its own database and subdomain. You create and edit tenants from a list with stats, track workspace status and invite each tenant\'s admin.',
    points: [
      'One database per tenant with stancl/tenancy',
      'Each tenant is found by its subdomain on APP_DOMAIN',
      'Creating a tenant sets up its database, runs migrations and seeders, and adds the admin user',
      'Workspace status: Active, Trial, Pending Invitation, Suspended',
      'The tenant admin gets a signed invitation link, and you can resend it',
      'Reset the admin password with an email link, or set it yourself',
      'Tenant list with search, status filter and stats',
    ],
  },
  {
    title: 'Domains',
    text: 'Give each tenant a primary domain and as many secondary ones as you need. Every domain has its own app name, default language and sign-in options.',
    points: [
      'Add domains and pick the primary one, which can\'t be deleted',
      'App name per domain, shown in the sidebar, sign-in pages and emails',
      'Default language per domain, and users can still pick their own',
      'Switch registration, password reset, 2FA and passkeys on or off per domain',
      'Domains page with search and a primary / secondary filter',
    ],
  },
  {
    title: 'Maintenance & suspension',
    text: 'Put every tenant workspace into maintenance with your own message, a secret bypass link and allowed IPs. You can also suspend a single workspace, which blocks it.',
    points: [
      'Turn on maintenance for all tenants from Setup → Tenant Settings',
      'Your message shows on an animated 503 page',
      'A secret bypass link unlocks a workspace for 12 hours',
      'Allowed IP addresses and CIDR ranges skip the maintenance page',
      'Tenant login stays open, so admins can sign in and get past it',
      'Suspend one workspace with its own message or the default one',
      'The central app stays online throughout',
    ],
  },
  {
    title: 'Users & invitations',
    text: 'Manage users with search and stats, give them a role and extra permissions, and invite them by email with a signed link.',
    points: [
      'Users list with search, stats and pagination',
      'Pick a role when you create or edit a user',
      'System roles come with default permissions, custom roles start empty',
      'Give a single user extra permissions, grouped by module',
      'Invitation emails are queued and carry a signed link that lasts 7 days',
      '“Invitation pending” badge until the user accepts',
      'An accept-invitation page where the user sets their password',
    ],
  },
  {
    title: 'Roles & permissions',
    text: 'Spatie roles and permissions with protected system roles, separate permission config files for the central and tenant apps, and menus that respect them.',
    points: [
      'Spatie roles and permissions for the central app and every tenant',
      'Protected system roles, plus any custom roles you add',
      'You define permissions in config/permissions and config/permissions/tenant',
      'The super admin passes every permission check',
      'Routes, menus and buttons all check permissions',
    ],
  },
  {
    title: 'Navigation & layouts',
    text: 'Menus live in the database and you reorder them by drag & drop. Pick a sidebar or header layout, a sidebar style, a sign-in layout and light or dark mode.',
    points: [
      'Menus stored in the database, with a drag & drop builder and Reset Defaults',
      'A menu item hides itself if the user lacks its permission',
      'Sidebar or header (top nav) layout with a Setup dropdown',
      'Inset, sidebar or floating sidebar variants',
      'Icon rail, offcanvas or always-open collapse modes',
      'Card, simple or split sign-in pages',
      'Light, dark and system appearance',
    ],
  },
  {
    title: 'Localization',
    text: '17 languages. Each user picks their own, each domain has a default, and validation messages are translated and shared with the frontend.',
    points: [
      '17 languages, including English, Hindi, Spanish, French, German and Japanese',
      'One translation file per feature in lang/<locale>/modules',
      'Each user picks their own language',
      'Default language per domain, English as the app default',
      'Every Data class has translated validation messages',
      'Vue, React and Svelte read translations through the same __() helper',
    ],
  },
  {
    title: 'Testing & tooling',
    text: 'Pest feature tests, Larastan, Pint, ESLint and Prettier are set up, along with Laravel Boost guidelines and skills for AI coding agents.',
    points: [
      'Pest feature tests for the backend',
      'Larastan static analysis and Pint formatting',
      'ESLint and Prettier for the frontend',
      'Type checking with vue-tsc, tsc or svelte-check',
      'A GitHub Actions workflow runs the test suite',
      'Laravel Boost guidelines and skills for AI coding agents',
    ],
  },
];

export function formatPrice(price: number): string {
  return `$${price}`;
}

/**
 * Countries named in the Offer's delivery and refund markup. The kits sell worldwide, but Google needs
 * explicit two-letter country codes (50 at most), so this lists the main markets.
 */
export const salesCountries = ['US', 'GB', 'CA', 'AU', 'NZ', 'IN', 'DE', 'FR', 'NL', 'ES', 'IT', 'SE', 'CH', 'IE', 'PL', 'PT', 'SG', 'AE', 'JP', 'BR'];

export const paymentFaqs: { question: string; answer: string }[] = [
  {
    question: 'Is this a subscription?',
    answer: 'No. There\'s no recurring subscription and nothing renews. You pay once.',
  },
  {
    question: 'Is it a one-time payment?',
    answer: `Yes. ${kitPriceList} for a single kit, or ${formatPrice(site.bundlePrice)} for all three kits, paid once through GitHub Sponsors.`,
  },
  {
    question: 'Do I get lifetime access?',
    answer: 'Yes. Once you\'ve been invited, you keep access to the kit repository for life.',
  },
  {
    question: 'Are updates included?',
    answer: 'Yes. Every update we push to the kit repository is included at no extra cost.',
  },
  {
    question: 'How often are updates released?',
    answer: 'Weekly. We push updates to the kit repositories, and you pull them into your project whenever you\'re ready.',
  },
  {
    question: 'How do I get repository access?',
    answer:
      'It happens automatically. As soon as your GitHub Sponsors payment goes through, your GitHub account gets an invitation to the kit repository. Accept it on GitHub or from the email GitHub sends you.',
  },
  {
    question: 'Can I get a refund?',
    answer: `No. The full source code is yours the moment your payment goes through, so it can't be given back, and GitHub Sponsors doesn't refund sponsorship payments. If you're not sure which kit fits, read the documentation or email ${site.company.email} before you buy. If you were charged twice or by mistake, contact GitHub Support. If you paid but the repository invitation never arrived, email us and we'll sort it out.`,
  },
  {
    question: 'Can I buy all three kits?',
    answer: `Yes. The All Starter Kits bundle gives you Vue, React and Svelte for ${formatPrice(site.bundlePrice)}, which is ${formatPrice(bundleSavings)} less than buying them separately.`,
  },
  {
    question: 'Can I use a kit for client projects?',
    answer:
      'Yes. The SaaS Laravel Commercial License lets you build as many projects as you like, for yourself or for clients. You can\'t resell, share or publish the kit source code.',
  },
  {
    question: 'Where do I get support?',
    answer: 'On GitHub. Open an issue on the kit repository you have access to.',
  },
];
