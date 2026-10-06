---
title: "Svelte Starter Kit Documentation"
description: "Overview and installation of the Svelte 5 edition of SaaS Laravel: tech stack, conventions, getting the code and next steps with Inertia v3 and shadcn-svelte."
---

# Svelte Starter Kit <Badge type="tip" text="Svelte" />

## What's in the kit

You get the full SaaS Laravel backend (multi-tenancy, auth, users, roles, domains, localization) with a frontend written in Svelte 5 and TypeScript, sitting in `resources/js`.

We ship the same Laravel code in all three kits, and only the frontend changes between them. That's why the pages in this section stick to `resources/js`. If you're looking for the backend, head to [Core architecture](/docs/core/architecture).

## Tech stack

| Area | Package | Version | Used for |
| --- | --- | --- | --- |
| Framework | `svelte` | ^5.16 | Runes-based components (`$props`, `$state`, `$derived`, `$effect`) |
| Inertia | `@inertiajs/svelte` | ^3.0 | Client: `Form`, `Link`, `page`, `router`, `useForm`, `useHttp`, `setLayoutProps` |
| Inertia | `@inertiajs/vite` | ^3.0 | Resolves pages from `resources/js/pages` |
| Build | `@sveltejs/vite-plugin-svelte` | ^7.0 | Svelte compilation in Vite |
| Build | `vite` / `tailwindcss` | ^8 / ^4.1 | Bundling and styling |
| UI | `bits-ui` | ^2.15 | Primitives behind the shadcn-svelte components in `components/ui` |
| Icons | `lucide-svelte` | ^0.468 | Component icons |
| Icons | `@iconify/svelte` | ^5.2 | String icons rendered by `CommonIcon` (menus use `lucide:*` names) |
| Feedback | `svelte-sonner` | ^0.3 | Toast notifications |
| Drag and drop | `sortablejs` | ^1.15 | Reordering on **Setup → Menus** |
| Translations | `@erag/lang-sync-inertia` | ^3.1 | `svelteLang()` helper |
| Auth | `@laravel/passkeys` | ^0.2 | Passkey registration and login |
| Routes | `@laravel/vite-plugin-wayfinder` | ^0.1 | Typed route and controller functions |
| Tooling | `svelte-check` | ^4.1 | Type checking |

## Conventions

These are the things you'll do differently here than in the Vue or React kit:

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

After purchase, your GitHub account gets access to the private repository `the-erag/saas-laravel-starter-kit-svelte` automatically (see [Repository access](/docs/purchase/repository-access)).

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
- `php artisan db:seed` adds the roles, permissions and menus, plus one default user for each role. You only need to run it once.
- In `.env.example` you'll find `APP_URL=https://svelte.test` and `APP_DOMAIN=svelte.test`. Set both to whatever domain you serve the app on.

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
The Vite plugin generates the Wayfinder files in `resources/js/routes` and `resources/js/actions`, and git ignores them. They only exist after a build, so keep `npm run dev` running or run `npm run build` once.
:::

## Next steps

- [Architecture](/docs/svelte/architecture): how the folders are laid out, the app entry, shared props and translations
- [Components](/docs/svelte/components): the `Common*` form kit and the app shell
- [Pages](/docs/svelte/pages): each page and the route that serves it
- [Layouts](/docs/svelte/layouts): the sidebar or header app layout, and the card, simple or split auth layout
- [Inertia](/docs/svelte/inertia): forms, visits, flash toasts and layout props
- [Development](/docs/svelte/development): the commands you'll run every day, and how to add a page from start to finish
