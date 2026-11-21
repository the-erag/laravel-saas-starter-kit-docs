---
title: "Svelte Starter Kit Documentation"
description: "Overview and installation of the Svelte 5 edition of SaaS Laravel: tech stack, conventions, getting the code and next steps with Inertia v3 and shadcn-svelte."
---

# Svelte Starter Kit <Badge type="tip" text="Svelte" />

This page covers what the Svelte kit ships with, how it differs from the Vue and React kits, and how to get it running.

<DocShot name="svelte-app-sidebar" alt="The Svelte kit dashboard with the sidebar app layout, light theme" />

## What's in the kit

You get the full SaaS Laravel backend (multi-tenancy, auth, users, roles, domains, localization) with a Svelte 5 and TypeScript frontend in `resources/js`.

The Vue, React and Svelte kits share the same Laravel code. Only the frontend changes, so the pages in this section cover `resources/js`. For the backend, see [Core architecture](/docs/core/architecture).

## Tech stack

| Area | Package | Version | Used for |
| --- | --- | --- | --- |
| Framework | `svelte` | ^5.57 | Runes-based components (`$props`, `$state`, `$derived`, `$effect`) |
| Inertia | `@inertiajs/svelte` | ^3.9 | Client: `Form`, `Link`, `page`, `router`, `useForm`, `useHttp`, `setLayoutProps` |
| Inertia | `@inertiajs/vite` | ^3.9 | Resolves pages from `resources/js/pages` |
| Build | `@sveltejs/vite-plugin-svelte` | ^7.3 | Svelte compilation in Vite |
| Build | `vite` / `tailwindcss` | ^8.3 / ^4.1 | Bundling and styling |
| UI | `bits-ui` | ^2.19 | Primitives behind the shadcn-svelte components in `components/ui` |
| Icons | `lucide-svelte` | ^1.0 | Component icons |
| Icons | `@iconify/svelte` | ^5.2 | String icons rendered by `CommonIcon` (menus use `lucide:*` names) |
| Feedback | `svelte-sonner` | ^1.2 | Toast notifications |
| Drag and drop | `sortablejs` | ^1.15 | Reordering on **Setup → Menus** |
| Translations | `@erag/lang-sync-inertia` | ^3.1 | `svelteLang()` helper |
| Auth | `@laravel/passkeys` | ^0.4 | Passkey registration and login |
| Routes | `@laravel/vite-plugin-wayfinder` | ^0.1 | Typed route and controller functions |
| Tooling | `svelte-check` | ^4.1 | Type checking |

## Conventions

What's different from the Vue and React kits:

| Topic | Svelte kit convention |
| --- | --- |
| File naming | PascalCase `.svelte` files (`pages/tenants/Index.svelte`). The Inertia page name matches: `tenants/Index`. |
| Shared logic | TypeScript modules in `resources/js/lib`. Modules that use runes end in `.svelte.ts` (`lib/theme.svelte.ts`). |
| Per-page layout | `export const layout = …` inside a `<script module>` block |
| Forms | Inertia `<Form>` with a `{#snippet children({ errors, processing })}` block. Common inputs also support `bind:value`. |
| Page title | `AppHead` component (`<svelte:head>`), not Inertia's `Head` |
| Shared props | Reactive `page` object from `@inertiajs/svelte` (`page.props.auth.user`) |
| Translations | `svelteLang()` from `@erag/lang-sync-inertia/svelte` |

## Get the code

After purchase, your GitHub account gets access to the private repository `the-erag/saas-laravel-starter-kit-svelte` (see [Repository access](/docs/purchase/repository-access)).

```bash
git clone https://github.com/the-erag/saas-laravel-starter-kit-svelte.git svelte
cd svelte
```

## Install

```bash
composer setup
php artisan db:seed
```

- `composer setup` installs the dependencies, creates `.env`, generates the app key, runs the migrations and builds the frontend. It doesn't seed anything.
- `php artisan db:seed` adds the roles, permissions and menus, plus one default user for each role. Run it once.
- `.env.example` has `APP_URL=https://svelte.test` and `APP_DOMAIN=svelte.test`. Set both to the domain you serve the app on.

PHP, the database, Herd domains and tenancy are covered in [Local development](/docs/getting-started/local-development).

::: details Step-by-step install (instead of composer setup)
```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm install
npm run build
```
:::

::: tip
The Vite plugin generates the Wayfinder files in `resources/js/routes` and `resources/js/actions`. Git ignores them, and they only exist after a build, so keep `npm run dev` running or run `npm run build` once.
:::

## Next steps

<FeatureCards :cols="2" :items="[
  { title: 'Architecture', text: 'Folder layout, the app entry, shared props and translations.', link: '/docs/svelte/architecture' },
  { title: 'Components', text: 'The `Common*` form kit and the app shell.', link: '/docs/svelte/components' },
  { title: 'Pages', text: 'Each page and the route that serves it.', link: '/docs/svelte/pages' },
  { title: 'Layouts', text: 'The sidebar or header app layout, and the card, simple or split auth layout.', link: '/docs/svelte/layouts' },
  { title: 'Inertia', text: 'Forms, visits, flash toasts and layout props.', link: '/docs/svelte/inertia' },
  { title: 'Development', text: 'Daily commands, and how to add a page from start to finish.', link: '/docs/svelte/development' },
]" />

<RelatedPages :links="[
  { text: 'Local development', link: '/docs/getting-started/local-development', desc: 'PHP, the database, Herd domains and tenancy for the first run.' },
  { text: 'Core architecture', link: '/docs/core/architecture', desc: 'The Laravel side shared by every kit.' },
  { text: 'Repository access', link: '/docs/purchase/repository-access', desc: 'How you get access to the private repository.' },
]" />
