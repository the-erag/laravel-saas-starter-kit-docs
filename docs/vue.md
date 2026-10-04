---
title: "Vue Starter Kit Documentation"
description: "Overview and installation of the Vue 3.5 edition of SaaS Laravel: tech stack, conventions, getting the code and next steps with Inertia v3 and shadcn-vue."
head:
  - - link
    - rel: canonical
      href: https://saas-laravel.com/docs/vue.html
  - - meta
    - property: og:title
      content: "Vue Starter Kit Documentation"
  - - meta
    - property: og:description
      content: "Overview and installation of the Vue 3.5 edition of SaaS Laravel: tech stack, conventions, getting the code and next steps with Inertia v3 and shadcn-vue."
  - - meta
    - property: og:url
      content: https://saas-laravel.com/docs/vue.html
  - - meta
    - name: twitter:title
      content: "Vue Starter Kit Documentation"
  - - meta
    - name: twitter:description
      content: "Overview and installation of the Vue 3.5 edition of SaaS Laravel: tech stack, conventions, getting the code and next steps with Inertia v3 and shadcn-vue."
---

# Vue Starter Kit <Badge type="tip" text="Vue" />

## What's in the kit

You get the whole SaaS Laravel backend (multi-tenancy, auth, users, roles, domains, localization) plus a Vue 3 + TypeScript frontend in `resources/js`.

The Laravel code is the same in all three kits; only the frontend changes. Every page is a Vue single-file component using `<script setup lang="ts">`, and Inertia v3 renders it, so you don't need a separate API. For the UI we built our own `Common*` form components on top of shadcn-vue.

## Tech stack

| Package | Version | Used for |
| --- | --- | --- |
| `vue` | ^3.5 | Single-file components |
| `@inertiajs/vue3` | ^3.0 | Inertia client: `Form`, `Link`, `router`, `usePage`, `useForm`, `useHttp`, `setLayoutProps` |
| `@inertiajs/vite` | ^3.0 | Resolves pages from `resources/js/pages` |
| `reka-ui` | ^2.9 | Primitives behind the shadcn-vue components |
| `@lucide/vue` | ^1.17 | Icons as components |
| `@iconify/vue` | ^5.0 | String icons (`CommonIcon`, menu icons) |
| `vue-sonner` | ^2.0 | Toasts |
| `vue-draggable-plus` | ^0.6 | Drag and drop on Setup → Menus |
| `@vueuse/core` | ^12.8 | Utilities used by the UI primitives |
| `vue-input-otp` | ^0.3 | Two-factor code input |
| `@erag/lang-sync-inertia` | ^3.1 | `vueLang()` translation helper |
| `@laravel/passkeys` | ^0.2 | Passkey registration and login |
| `@laravel/vite-plugin-wayfinder` | ^0.1 | Typed route and controller functions |
| `vite` / `tailwindcss` | ^8 / ^4.1 | Build and styling |
| `vue-tsc` | ^2.2 | Type checking |
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

Once you've bought the kit, you'll get access to the private repository `the-erag/saas-laravel-starter-kit-vue` (see [Repository access](/docs/purchase/repository-access)). Clone it like this:

```bash
git clone https://github.com/the-erag/saas-laravel-starter-kit-vue.git vue
cd vue
```

## Install

The full setup (PHP, database, Herd domains, tenancy) is covered in [Local development](/docs/getting-started/local-development). Here's the short version:

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

`composer setup` runs the migrations but doesn't seed, so run `php artisan db:seed` once. That creates the roles, permissions and menus, plus one default user for each role.

As shipped, `.env.example` has `APP_URL=http://vue.test` and `APP_DOMAIN=vue.test`. Change both to your own domain.

To start everything, run `composer dev`. You'll find the rest of the frontend commands in [Development](/docs/vue/development#daily-workflow).

::: tip
The Vite plugin generates the Wayfinder files in `resources/js/routes` and `resources/js/actions`, and git ignores them. Run `npm run dev` or `npm run build` once before you type check, or the imports won't resolve.
:::

## Next steps

- [Architecture](/docs/vue/architecture): how a request flows, the folders, shared props, permissions and translations
- [Components](/docs/vue/components): the `Common*` form kit, the shadcn-vue primitives and the app shell
- [Pages](/docs/vue/pages): every page and the route it lives on
- [Layouts](/docs/vue/layouts): the sidebar/header app layout and the card/simple/split auth layout
- [Inertia](/docs/vue/inertia): forms, visits, flash toasts and Wayfinder
- [Development](/docs/vue/development): the commands, and how to add a page and a form
