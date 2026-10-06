---
title: "React Starter Kit Documentation"
description: "Overview and installation of the React 19 edition of SaaS Laravel: tech stack, conventions, getting the code and next steps with Inertia v3 and shadcn/ui."
---

# React Starter Kit <Badge type="tip" text="React" />

## What's in the kit

You get the complete SaaS Laravel backend (multi-tenancy, auth, users, roles, domains, localization) paired with a React 19 + TypeScript frontend in `resources/js`.

The Laravel code is the same in all three kits, so only the frontend changes when you pick React. Every page is an Inertia v3 function component and there's no separate API to maintain. Forms, dialogs and toasts are already built, which means a new page is mostly a matter of layout and data.

```text
Laravel route → Controller → Service → Inertia::render('tenants/index') → pages/tenants/index.tsx
```

## Tech stack

| Package | Version | Used for |
| --- | --- | --- |
| `react` / `react-dom` | ^19.2 | Function components (`.tsx`) |
| `@inertiajs/react` | ^3.0 | Inertia client: `Form`, `Link`, `Head`, `router`, `usePage`, `useForm`, `useHttp`, `setLayoutProps` |
| `@inertiajs/vite` | ^3.0 | Resolves pages from `resources/js/pages` |
| `@vitejs/plugin-react` + `babel-plugin-react-compiler` | ^5.2 / ^1.0 | React plugin with the React Compiler enabled |
| `@radix-ui/react-*` | various | Primitives behind the shadcn/ui components in `components/ui` |
| `lucide-react` | ^0.475 | Icon components |
| `@iconify/react` | ^6.0 | String icons rendered by `CommonIcon` (menus use `lucide:*` names) |
| `sonner` | ^2.0 | Toast notifications |
| `sortablejs` | ^1.15 | Drag and drop on Setup → Menus |
| `input-otp` | ^1.4 | Two-factor code input |
| `@erag/lang-sync-inertia` | ^3.1 | `reactLang()` translation helper |
| `@laravel/passkeys` | ^0.2 | Passkey registration and login |
| `@laravel/vite-plugin-wayfinder` | ^0.1 | Typed route and controller functions |
| `vite` / `tailwindcss` | ^8 / ^4 | Build and styling |
| `typescript` | ^5.7 | Type checking with `tsc --noEmit` |

## Conventions

| Topic | React kit convention |
| --- | --- |
| File names | kebab-case `.tsx` everywhere, e.g. `pages/tenants/index.tsx`, `components/common/common-input.tsx` |
| Page names | kebab-case path: `Inertia::render('tenants/index')` |
| Shared logic | Hooks in `hooks/use-x.ts` (`usePermission`, `useConfirmDialog`, `useLanguage`, `useDebounceFn`, …) |
| Layout per page | Static `Page.layout = …` property |
| Forms | Inertia `<Form>` with a render-prop child: `{({ errors, processing }) => …}` |
| App wrapper | `app.tsx` runs in `strictMode` and wraps every page in `TooltipProvider` and the sonner `Toaster` |
| Translations | `reactLang()` from `@erag/lang-sync-inertia/react` |

## Get the code

Once you've bought the kit, we give you access to the private repository `the-erag/saas-laravel-starter-kit-react` (see [Repository access](/docs/purchase/repository-access)).

```bash
git clone https://github.com/the-erag/saas-laravel-starter-kit-react.git react
cd react
```

## Install

For the full walkthrough of PHP, the database, Herd domains and tenancy, read [Local development](/docs/getting-started/local-development). Here's the short version:

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

- `composer setup` runs the migrations but doesn't seed anything. Run `php artisan db:seed` once afterwards to create roles, permissions, menus and one default user for each role.
- In `.env.example` you'll find `APP_URL=https://react.test` and `APP_DOMAIN=react.test`. Set both to the domain you actually serve the app on.

::: tip
The Vite plugin generates the Wayfinder files in `resources/js/routes` and `resources/js/actions`, and git ignores them. You need to run `npm run dev` or `npm run build` at least once before you can import them.
:::

## Next steps

- [Architecture](/docs/react/architecture): how the folders, app entry, shared props, permissions and translations fit together
- [Components](/docs/react/components): the `Common*` form components, dialogs and app shell
- [Pages](/docs/react/pages): a list of every page with its route
- [Layouts](/docs/react/layouts): sidebar/header app layout, card/simple/split auth layout
- [Inertia](/docs/react/inertia): forms, visits, flash toasts, Wayfinder routes
- [Development](/docs/react/development): the commands you'll use every day, and adding a page from route to test
