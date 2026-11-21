---
title: "Vue Starter Kit Documentation"
description: "Overview and installation of the Vue 3.5 edition of SaaS Laravel: tech stack, conventions, getting the code and next steps with Inertia v3 and shadcn-vue."
---

# Vue Starter Kit <Badge type="tip" text="Vue" />

This page covers what the Vue kit adds, the packages and naming it uses, and how to get it running. The guide pages linked at the bottom go deeper.

## What's in the kit

You get the full SaaS Laravel backend (multi-tenancy, auth, users, roles, domains, localization) plus a Vue 3 + TypeScript frontend in `resources/js`.

<KeyIdea>

The Laravel code is the same in the Vue, React and Svelte kits. Only the frontend changes.

</KeyIdea>

Every page is a Vue single-file component with `<script setup lang="ts">`, rendered by Inertia v3, so there's no separate API. The forms use our own `Common*` components, built on top of shadcn-vue.

## Tech stack

| Package | Version | Used for |
| --- | --- | --- |
| `vue` | ^3.5 | Single-file components |
| `@inertiajs/vue3` | ^3.9 | Inertia client: `Form`, `Link`, `router`, `usePage`, `useForm`, `useHttp`, `setLayoutProps` |
| `@inertiajs/vite` | ^3.9 | Resolves pages from `resources/js/pages` |
| `reka-ui` | ^2.11 | Primitives behind the shadcn-vue components |
| `@lucide/vue` | ^1.56 | Icons as components |
| `@iconify/vue` | ^5.0 | String icons (`CommonIcon`, menu icons) |
| `vue-sonner` | ^2.0 | Toasts |
| `vue-draggable-plus` | ^0.6 | Drag and drop on Setup → Menus |
| `@vueuse/core` | ^15.0 | Utilities used by the UI primitives |
| `vue-input-otp` | ^0.4 | Two-factor code input |
| `@erag/lang-sync-inertia` | ^3.1 | `vueLang()` translation helper |
| `@laravel/passkeys` | ^0.4 | Passkey registration and login |
| `@laravel/vite-plugin-wayfinder` | ^0.1 | Typed route and controller functions |
| `vite` / `tailwindcss` | ^8 / ^4.1 | Build and styling |
| `vue-tsc` | ^3.3 | Type checking |
| `vite-plugin-vue-devtools` | ^8.2 | Vue DevTools in development |

## Conventions

| Topic | Convention | Example |
| --- | --- | --- |
| Page files | PascalCase `.vue` under a lowercase folder | `pages/tenants/Index.vue` |
| Inertia page name | Path without `.vue` | `Inertia::render('tenants/Index')` |
| Page-only components | `Partials/` next to the page | `pages/users/Partials/UserFormModal.vue` |
| Form components | `Common` prefix | `components/common/CommonSelect.vue` |
| Shared logic | Composables in `composables/useX.ts` | `usePermission`, `useConfirmDialog`, `useLanguage` |
| Layout per page | `defineOptions({ layout })` | See [Layouts](/docs/vue/layouts) |
| Forms | Inertia `<Form>` with `v-slot="{ errors, processing }"` | See [Inertia](/docs/vue/inertia#forms) |
| Translations | `vueLang()` from `@erag/lang-sync-inertia/vue` | `__('modules.user.index.title')` |

## Get the code

After you buy the kit, you get access to the private repository `the-erag/saas-laravel-starter-kit-vue` (see [Repository access](/docs/purchase/repository-access)). Clone it:

```bash
git clone https://github.com/the-erag/saas-laravel-starter-kit-vue.git vue
cd vue
```

## Install

[Local development](/docs/getting-started/local-development) covers the full setup (PHP, database, Herd domains, tenancy). Here's the short version:

::: code-group

```bash [One command]
composer setup
php artisan db:seed
```

```bash [Step by step]
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm install
npm run build
```

:::

`composer setup` runs the migrations but doesn't seed. Run `php artisan db:seed` once to create the roles, permissions, menus and one default user for each role.

`.env.example` ships with `APP_URL=http://vue.test` and `APP_DOMAIN=vue.test`. Change both to your own domain.

Run `composer dev` to start everything. The other frontend commands are in [Development](/docs/vue/development#daily-workflow).

::: tip
The Vite plugin generates the Wayfinder files in `resources/js/routes` and `resources/js/actions`. Git ignores them. Run `npm run dev` or `npm run build` once before you type check, or the imports won't resolve.
:::

## Next steps

<FeatureCards :cols="3" :items="[
  { title: 'Architecture', text: 'How a request flows, the folders, shared props, permissions and translations.', link: '/docs/vue/architecture' },
  { title: 'Components', text: 'The `Common*` form kit, the shadcn-vue primitives and the app shell.', link: '/docs/vue/components' },
  { title: 'Pages', text: 'Every page and the route it lives on.', link: '/docs/vue/pages' },
  { title: 'Layouts', text: 'The sidebar/header app layout and the card/simple/split auth layout.', link: '/docs/vue/layouts' },
  { title: 'Inertia', text: 'Forms, visits, flash toasts and Wayfinder.', link: '/docs/vue/inertia' },
  { title: 'Development', text: 'The commands, and how to add a page and a form.', link: '/docs/vue/development' },
]" />

<RelatedPages :links="[
  { text: 'Local development', link: '/docs/getting-started/local-development', desc: 'The full first run: PHP, database, Herd domains and tenancy.' },
  { text: 'Core architecture', link: '/docs/core/architecture', desc: 'The Laravel side that every kit shares.' },
  { text: 'Updates', link: '/docs/purchase/updates', desc: 'How to pull kit updates into your own project.' },
]" />
