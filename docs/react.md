---
title: "React Starter Kit Documentation"
description: "Overview and installation of the React 19 edition of SaaS Laravel: tech stack, conventions, getting the code and next steps with Inertia v3 and shadcn/ui."
---

# React Starter Kit <Badge type="tip" text="React" />

This page covers what the React kit adds, the packages and naming it uses, and how to get it running. The guide pages linked at the bottom go deeper.

## What's in the kit

You get the full SaaS Laravel backend (multi-tenancy, auth, users, roles, domains, localization) plus a React 19 + TypeScript frontend in `resources/js`.

<KeyIdea>

The Laravel code is the same in the Vue, React and Svelte kits. Only the frontend changes.

</KeyIdea>

Every page is a React function component rendered by Inertia v3, so there's no separate API. Forms, dialogs and toasts are already built, so a new page is mostly layout and data.

<FlowDiagram label="Request flow" :nodes="['Laravel route', 'Controller', 'Service', { label: '`Inertia::render()`', note: '`tenants/index`' }, { label: 'Page', note: '`pages/tenants/index.tsx`' }]" />

## Tech stack

| Package | Version | Used for |
| --- | --- | --- |
| `react` / `react-dom` | ^19.3 | Function components (`.tsx`) |
| `@inertiajs/react` | ^3.9 | Inertia client: `Form`, `Link`, `Head`, `router`, `usePage`, `useForm`, `useHttp`, `setLayoutProps` |
| `@inertiajs/vite` | ^3.9 | Resolves pages from `resources/js/pages` |
| `@vitejs/plugin-react` + `babel-plugin-react-compiler` | ^6.1 / ^1.0 | React plugin with the React Compiler enabled |
| `@radix-ui/react-*` | various | Primitives behind the shadcn/ui components in `components/ui` |
| `lucide-react` | ^1.56 | Icon components |
| `@iconify/react` | ^6.0 | String icons rendered by `CommonIcon` (menus use `lucide:*` names) |
| `sonner` | ^2.0 | Toast notifications |
| `sortablejs` | ^1.15 | Drag and drop on Setup → Menus |
| `input-otp` | ^1.4 | Two-factor code input |
| `@erag/lang-sync-inertia` | ^3.1 | `reactLang()` translation helper |
| `@laravel/passkeys` | ^0.4 | Passkey registration and login |
| `@laravel/vite-plugin-wayfinder` | ^0.1 | Typed route and controller functions |
| `vite` / `tailwindcss` | ^8 / ^4 | Build and styling |
| `typescript` | ^5.9 | Type checking with `tsc --noEmit` |

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

After you buy the kit, you get access to the private repository `the-erag/saas-laravel-starter-kit-react` (see [Repository access](/docs/purchase/repository-access)). Clone it:

```bash
git clone https://github.com/the-erag/saas-laravel-starter-kit-react.git react
cd react
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

`.env.example` ships with `APP_URL=https://react.test` and `APP_DOMAIN=react.test`. Change both to your own domain.

Run `composer dev` to start everything. The other frontend commands are in [Development](/docs/react/development#daily-workflow).

::: tip
The Vite plugin generates the Wayfinder files in `resources/js/routes` and `resources/js/actions`. Git ignores them. Run `npm run dev` or `npm run build` once before you import them, or the imports won't resolve.
:::

## Next steps

<FeatureCards :cols="3" :items="[
  { title: 'Architecture', text: 'The app entry, the folders, shared props, permissions and translations.', link: '/docs/react/architecture' },
  { title: 'Components', text: 'The `Common*` form components, the shadcn/ui primitives and the app shell.', link: '/docs/react/components' },
  { title: 'Pages', text: 'Every page and the route it lives on.', link: '/docs/react/pages' },
  { title: 'Layouts', text: 'The sidebar/header app layout and the card/simple/split auth layout.', link: '/docs/react/layouts' },
  { title: 'Inertia', text: 'Forms, visits, flash toasts and Wayfinder.', link: '/docs/react/inertia' },
  { title: 'Development', text: 'The commands, and how to add a page and a form.', link: '/docs/react/development' },
]" />

<RelatedPages :links="[
  { text: 'Local development', link: '/docs/getting-started/local-development', desc: 'The full first run: PHP, database, Herd domains and tenancy.' },
  { text: 'Core architecture', link: '/docs/core/architecture', desc: 'The Laravel side that every kit shares.' },
  { text: 'Updates', link: '/docs/purchase/updates', desc: 'How to pull kit updates into your own project.' },
]" />
