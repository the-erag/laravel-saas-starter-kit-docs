---
title: "Composer & npm Packages Used"
description: "The key Composer and npm packages used by the kits, with their version constraints and what each one is used for in the backend and frontend."
---

# Packages

The main Composer and npm packages in each kit, and what the kit uses them for. The version constraints below come from each kit's `composer.json` and `package.json`. To raise them in your project, see [Updating dependencies](/docs/reference/commands#updating-dependencies).

## Backend (all kits)

| Package | Constraint | Used for |
| --- | --- | --- |
| `laravel/framework` | `^13.35` | Framework |
| `laravel/fortify` | `^1.41.0` | Headless auth: login, registration, reset, verification, 2FA, passkeys |
| `stancl/tenancy` | `^3.10.1` | Multi-database tenancy, domain identification, tenant commands |
| `spatie/laravel-permission` | `^8.3` | Roles and permissions |
| `laravel/chisel` | `^0.1.1` | Toolkit for scripts that remove unwanted code, files and dependencies |
| `laravel/tinker` | `^3.0.2` | REPL |

### Vue, React and Svelte only

| Package | Constraint | Used for |
| --- | --- | --- |
| `inertiajs/inertia-laravel` | `^3.5.1` | Inertia v3 server adapter, shared props, flash data |
| `spatie/laravel-data` | `^4.23` | Data objects for validation and typed props |
| `laravel/wayfinder` | `^0.1.21` | Typed TypeScript route/action functions |
| `erag/laravel-lang-sync-inertia` | `^2.4` | Shares `lang/` translations with Inertia, `erag:generate-lang` |

### Dev

| Package | Constraint | Used for |
| --- | --- | --- |
| `pestphp/pest` + `pestphp/pest-plugin-laravel` | `^5.3.1` / `^5.0.1` | Tests |
| `larastan/larastan` | `^3.13` | Static analysis (`composer types:check`) |
| `laravel/pint` | `^1.32.1` | Code style |
| `laravel/boost` | `^2.10.3` | AI agent guidelines, skills and MCP server |
| `spatie/laravel-typescript-transformer` | `^3.3` | `php artisan typescript:transform` (Vue, React and Svelte only) |
| `laravel/pail` | `^1.2.7` | Log tailing in `composer dev` |
| `laravel/pao` | `^1.1.5` | Agent-optimized output for PHP testing tools |
| `laravel/sail` | `^1.68` | Docker environment (installed, not the default setup) |
| `nunomaduro/collision`, `mockery/mockery`, `fakerphp/faker` | | Testing utilities |

## Frontend (Vue, React and Svelte)

| Package | Constraint | Used for |
| --- | --- | --- |
| `vite` | `^8.3.4` | Bundler |
| `laravel-vite-plugin` | `^3.0.0` | Laravel integration |
| `@inertiajs/vite` | `^3.9.1` | Inertia Vite plugin (page resolution) |
| `@laravel/vite-plugin-wayfinder` | `^0.1.10` | Regenerates Wayfinder files during dev/build |
| `tailwindcss` + `@tailwindcss/vite` | v4 | Styling |
| `typescript` | `^5.9.3` | Types |
| `@erag/lang-sync-inertia` | `^3.1.0` | Translation helpers (`__`, `trans`, `transChoice`) |
| `@laravel/passkeys` | `^0.4.0` | WebAuthn in the browser |
| `eslint`, `prettier` (+ plugins) | `^9`, `^3` | Linting and formatting |

## Per framework

| | <Badge type="tip" text="Vue" /> | <Badge type="tip" text="React" /> | <Badge type="tip" text="Svelte" /> |
| --- | --- | --- | --- |
| Framework | `vue ^3.5.44` | `react ^19.3.1` | `svelte ^5.57.2` |
| Inertia adapter | `@inertiajs/vue3 ^3.9.1` | `@inertiajs/react ^3.9.1` | `@inertiajs/svelte ^3.9.1` |
| Headless UI | `reka-ui ^2.11.0` (shadcn-vue) | `@radix-ui/*` (shadcn/ui) | `bits-ui ^2.19.5` (shadcn-svelte) |
| Icons | `@lucide/vue`, `@iconify/vue` | `lucide-react`, `@iconify/react` | `lucide-svelte`, `@iconify/svelte` |
| Toasts | `vue-sonner` | `sonner` | `svelte-sonner` |
| Drag and drop | `vue-draggable-plus` | `sortablejs` | `sortablejs` |
| OTP input | `vue-input-otp` | `input-otp` | none (own component in `components/ui/input-otp`) |
| Type check | `vue-tsc` | `tsc` | `svelte-check` |

## Livewire kit

The Livewire kit has no Inertia, TypeScript, ESLint or Prettier. On top of the shared backend packages, it uses:

| Package | Constraint | Used for |
| --- | --- | --- |
| `livewire/livewire` | `^4.1` | Livewire components and pages |
| `livewire/flux` | `^2.13.1` | Flux UI (free edition) |
| `livewire/blaze` | `^1.0` | Faster Blade components (folds them into the parent template) |
| `vite-plus` | `1.4.0` | Build (`vp dev`, `vp build`); `vite` is aliased to `@voidzero-dev/vite-plus-core` |
| `laravel-vite-plugin` | `^3.1` | Laravel integration |
| `tailwindcss` + `@tailwindcss/vite` | v4 | Styling |
| `@laravel/passkeys` | `^0.2.0` | WebAuthn in the browser |
| `iconify-icon` | `^3.0.5` | Icons |
| `blade-formatter` | `^1.44.6` | Formatting and checking Blade views |

See the [Livewire guide](/docs/livewire) for how each one is used.

## Translations: erag/laravel-lang-sync-inertia

Vue, React and Svelte kits only. The backend package `erag/laravel-lang-sync-inertia` (`^2.4`) and the frontend package `@erag/lang-sync-inertia` (`^3.1.0`) work as a pair:

<FlowDiagram label="Translation export" :nodes="['`lang/<locale>/**/*.php`', '`php artisan erag:generate-lang`', '`resources/js/lang/<locale>/*.json`', '`__()` in components']" />

| Part | Details |
| --- | --- |
| Config | `config/inertia-lang.php` (`lang_path` = `lang/`, `output_lang` = `resources/js/lang`). The kits ship with it. In a new project, publish it with `php artisan erag:install-lang`. |
| Export | `php artisan erag:generate-lang` converts the PHP files to JSON |
| Sharing | The service provider shares a `lang` Inertia prop for the active locale |
| Frontend helpers | `__()`, `trans()`, `transChoice()`, `trans_choice()` with `:placeholder` replacement and Laravel-style pluralization |

Import the helper from the **framework subpath**, not from the package root:

::: code-group

```ts [Vue]
import { vueLang } from '@erag/lang-sync-inertia/vue';

const { __ } = vueLang();
```

```ts [React]
import { reactLang } from '@erag/lang-sync-inertia/react';

const { __ } = reactLang();
```

```ts [Svelte]
import { svelteLang } from '@erag/lang-sync-inertia/svelte';

const { __ } = svelteLang();
```

:::

The package lists `node >= 24` in its `engines` field. See [Localization](/docs/core/localization).

<RelatedPages :links="[
  { text: 'Commands', link: '/docs/reference/commands#updating-dependencies', desc: 'Raise these version constraints in your project.' },
  { text: 'Localization', link: '/docs/core/localization', desc: 'How the translation packages are used.' },
  { text: 'Architecture', link: '/docs/core/architecture#typed-frontend', desc: 'Where Wayfinder and laravel-data fit in.' },
]" />
