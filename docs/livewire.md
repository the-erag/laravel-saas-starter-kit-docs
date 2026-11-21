---
title: "Livewire Starter Kit Documentation"
description: "Overview and installation of the Livewire 4 edition of SaaS Laravel: tech stack, conventions, getting the code and next steps with Flux UI, Blade and Alpine.js."
---

# Livewire Starter Kit <Badge type="tip" text="Livewire" />

This page covers what the Livewire kit ships with, the conventions it follows, and how to get it running.

<DocShot name="livewire-app-sidebar" alt="The Livewire kit dashboard with the sidebar app layout, light theme" />

## What's in the kit

You get the whole SaaS Laravel backend (multi-tenancy, auth, users, roles, domains, localization) plus a frontend built with Livewire 4, Blade and Alpine.js. There's no Inertia, no TypeScript and no separate JavaScript framework.

Every page is a class-based Livewire component in a Laravel module, with its Blade view in `resources/views`. The UI is the free edition of Flux, wrapped in our own `x-common.*` components and styled with Tailwind CSS 4. Validation uses regular Laravel Form Requests.

## Tech stack

| Package | Version | Used for |
| --- | --- | --- |
| `livewire/livewire` | ^4.1 | Class-based components, `Route::livewire`, `wire:navigate`, `wire:sort` |
| `livewire/flux` | ^2.13 | Flux free edition, used behind the `x-common.*` wrappers and in the app shell |
| Alpine.js | bundled with Livewire | Client-only behaviour (`x-data`, `$wire.entangle`, `Alpine.data()`) |
| `laravel/fortify` | ^1.41 | Login, registration, password reset, two-factor and passkeys |
| `iconify-icon` | ^3.0 | The `<iconify-icon>` web component behind `x-common.icon` |
| `@laravel/passkeys` | ^0.2 | Passkey registration and login (`resources/js/passkeys.js`) |
| `tailwindcss` / `@tailwindcss/vite` | ^4 | Styling |
| `vite-plus` / `laravel-vite-plugin` | 1.4 / ^3.1 | Build (`vp dev`, `vp build`) |
| `blade-formatter` | ^1.44 | Formatting and checking Blade views |
| `pestphp/pest` | ^5.3 | Tests |
| `larastan/larastan` | ^3.13 | Static analysis (`phpstan analyse`) |
| `laravel/pint` | ^1.32 | PHP code style |
| `laravel/boost` | ^2.10 | AI guidelines, skills and MCP server |

## Conventions

| Topic | Convention | Example |
| --- | --- | --- |
| Components | Class-based, in `Modules/<Module>/Livewire` | `Modules\User\Livewire\Index` |
| Full-page routes | `Route::livewire()` in the module's `routes/web.php` | `Route::livewire('users', Index::class)` |
| Nested component tag | `<livewire:<module>::<component> />`, both kebab-case | `<livewire:user::user-form-modal />` |
| Page views | `resources/views/pages/<area>`, rendered by name | `view('pages.users.index')` |
| Page-only modals and pieces | `pages/<area>/partials` | `<x-pages::tenants.partials.status-badge />` |
| UI controls | `x-common.*` wrappers, never Flux tags | `<x-common.input wire:model="name" />` |
| Validation | Form Request + `validateFormRequest()` | `UserRequest` in `Modules/User/Http/Requests` |
| Title and breadcrumbs | `->title()` and `->layoutData()` in `render()` | See [Layouts](/docs/livewire/layouts#page-title-and-breadcrumbs) |
| Translations | PHP lang files, slash keys | `__('modules/user.index.title')` |
| Icons | Iconify names | `lucide:users` |

## Get the code

After purchase, your GitHub account gets access to the private repository `the-erag/saas-laravel-starter-kit-livewire` (see [Repository access](/docs/purchase/repository-access)).

```bash
git clone https://github.com/the-erag/saas-laravel-starter-kit-livewire.git livewire
cd livewire
```

## Install

The short version is below. PHP, the database, Herd domains and tenancy are covered in [Local development](/docs/getting-started/local-development).

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

`.env.example` has `APP_URL=http://livewire.test` and `APP_DOMAIN=livewire.test`. Set both to the domain you serve the app on.

Run `composer dev` to start everything. The other commands are in [Development](/docs/livewire/development#daily-workflow).

::: tip
This kit has no code generation step: no Wayfinder, no TypeScript types and no translation JSON. Blade calls `route()` and `__()` directly, so a new route or translation key works as soon as you save the file.
:::

## Next steps

<FeatureCards :cols="2" :items="[
  { title: 'Architecture', text: 'How a request flows, the folders, module registration, permissions and translations.', link: '/docs/livewire/architecture' },
  { title: 'Components', text: 'The `x-common.*` wrappers, shared Blade components and the app shell.', link: '/docs/livewire/components' },
  { title: 'Pages', text: 'Every page, its component and the route it lives on.', link: '/docs/livewire/pages' },
  { title: 'Layouts', text: 'The sidebar/header app layout, the card/simple/split auth layout and the settings layout.', link: '/docs/livewire/layouts' },
  { title: 'Livewire', text: 'Full-page and nested components, Form Request validation, events, modals and toasts.', link: '/docs/livewire/livewire' },
  { title: 'Development', text: 'The commands, and how to add a page and a form.', link: '/docs/livewire/development' },
]" />

<RelatedPages :links="[
  { text: 'Local development', link: '/docs/getting-started/local-development', desc: 'PHP, the database, Herd domains and tenancy for the first run.' },
  { text: 'Core architecture', link: '/docs/core/architecture', desc: 'The shared backend: tenancy, auth and roles.' },
  { text: 'Repository access', link: '/docs/purchase/repository-access', desc: 'How you get access to the private repository.' },
]" />
