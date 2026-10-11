---
title: "Composer, npm & Artisan Commands"
description: "Composer scripts, npm scripts and Artisan commands available in every SaaS Laravel kit, including setup, the dev server, tests, linting and generators."
---

# Commands

Every kit has the same Composer scripts and Artisan commands. If one kit does something differently, the table tells you.

::: tip Most used
Day to day you'll mostly reach for `composer dev` to run everything locally, `composer lint` before you commit, and `php artisan tenants:migrate` after you add a tenant migration.
:::

## Composer scripts

| Command | What it runs |
| --- | --- |
| `composer setup` | `composer install`, copy `.env.example` → `.env` (if missing), `php artisan key:generate`, `php artisan migrate --force`, `npm install`, `npm run build` |
| `composer dev` | `php artisan dev`: `serve`, `queue:listen --tries=1 --timeout=0`, `pail --timeout=0` (when `pcntl` is available), `npm run dev` |
| `composer test` | `config:clear`, `lint:check`, `types:check`, `php artisan test` |
| `composer ci:check` | `composer test` without a process timeout |
| `composer lint` | `pint --parallel`, `typescript:transform`, `npm run lint:fix`. Vue also runs `wayfinder:generate --with-form` first. |
| `composer lint:check` | `pint --parallel --test`, `npm run lint`. Vue also runs `wayfinder:generate --with-form` first. |
| `composer types:check` | `phpstan analyse` |
| `composer update:requirements` | `composer bump`, `npx npm-check-updates -u`. See [Updating dependencies](#updating-dependencies). |

When you run `composer update`, the `post-update-cmd` hook publishes Laravel's assets and then runs `php artisan boost:update`.

## Updating dependencies

`composer update:requirements` raises the version numbers in `composer.json` and `package.json`. It only edits those two files and doesn't install anything:

- `composer bump` sets the minimum version of each PHP package in `composer.json` to the version you have installed, for example `"laravel/pint": "^1.27"` becomes `"^1.30.5"` when 1.30.5 is installed.
- `npx npm-check-updates -u` changes every package in `package.json` to its newest release, including new major versions.

Do it on its own branch, then install and test before you commit:

```bash
git switch -c update-dependencies
composer update:requirements   # raise the versions in composer.json and package.json
composer update                # install the PHP packages and refresh composer.lock
npm install                    # install the npm packages and refresh package-lock.json
composer test                  # Pint, ESLint, Prettier, type check, Larastan and Pest
npm run build                  # make sure the frontend still builds
```

Before you install, check what changed with `git diff composer.json package.json`. A new major version (Vite, ESLint, TypeScript, your frontend framework) can have breaking changes, so read its upgrade guide first.

::: tip
- To stay on your current major versions, run `npx npm-check-updates -u --target minor` instead of the script's npm step.
- `composer bump` uses the versions you have installed now. To bring `composer.json` up to the newest PHP releases, run `composer update` once before `composer update:requirements`.
- If the tests fail, run `git restore composer.json composer.lock package.json package-lock.json`, then `composer install` and `npm install`, to go back to the working versions.
:::

## npm scripts

| Command | Vue | React | Svelte |
| --- | --- | --- | --- |
| `npm run dev` | `vite` | `vite` | `vite` |
| `npm run build` | `vite build` | `vite build` | `vite build` |
| `npm run build:ssr` | `vite build && vite build --ssr` | same | same |
| `npm run lint` | ESLint + Prettier check + `vue-tsc --noEmit` | ESLint + Prettier check + `tsc --noEmit` | ESLint + Prettier check + `svelte-check --tsconfig ./tsconfig.json` |
| `npm run lint:fix` | ESLint `--fix` + Prettier `--write` + `vue-tsc --noEmit` | ESLint `--fix` + Prettier `--write` + `tsc --noEmit` | ESLint `--fix` + Prettier `--write` + `svelte-check --tsconfig ./tsconfig.json` |

In every kit, ESLint runs on `.` and Prettier runs on `resources/`.

## Artisan

### Database

| Command | Purpose |
| --- | --- |
| `php artisan migrate` | Central migrations |
| `php artisan migrate --seed` | Central migrations + `DatabaseSeeder` |
| `php artisan migrate:fresh --seed` | Rebuild the central database (tenant DBs are not dropped) |
| `php artisan db:seed --class=PermissionSeeder` | Sync central permissions from `config/permissions` |
| `php artisan db:seed --class=MenuSeeder` | Restore/add central menus |

### Tenancy (stancl/tenancy)

| Command | Purpose |
| --- | --- |
| `php artisan tenants:list` | List tenants and domains |
| `php artisan tenants:migrate` | Run `database/migrations/tenant` for all tenants |
| `php artisan tenants:migrate --tenants=1` | Only for tenant `1` |
| `php artisan tenants:rollback` | Roll back tenant migrations |
| `php artisan tenants:migrate-fresh` | Drop and re-migrate tenant databases |
| `php artisan tenants:seed` | Run `TenantDatabaseSeeder` for all tenants |
| `php artisan tenants:seed --class="Database\Seeders\PermissionSeeder"` | Run one seeder for all tenants |
| `php artisan tenants:run <command>` | Run any Artisan command per tenant |

### Code generation

| Command | Output |
| --- | --- |
| `php artisan wayfinder:generate --with-form` | `resources/js/routes`, `resources/js/actions`, `resources/js/wayfinder` |
| `php artisan typescript:transform` | `resources/js/types/...` from Data classes and enums |
| `php artisan erag:generate-lang` | `resources/js/lang/<locale>/*.json` from `lang/<locale>/*.php` |

### Development and operations

| Command | Purpose |
| --- | --- |
| `php artisan dev` | Start the dev processes (same as `composer dev`) |
| `php artisan queue:listen --tries=1` | Development queue worker (reloads code) |
| `php artisan queue:work` | Production queue worker |
| `php artisan queue:failed` / `queue:retry all` | Inspect and retry failed jobs |
| `php artisan pail` | Tail logs |
| `php artisan route:list --except-vendor` | List application routes |
| `php artisan test --compact` | Run Pest |
| `php artisan make:test --pest Name` | New feature test |
| `php artisan boost:update` | Refresh Laravel Boost AI guidelines and skills |
| `vendor/bin/pint --dirty` | Format changed PHP files |

## Herd

Use the site name that matches your `APP_DOMAIN`. By default that's `vue`, `react` or `svelte`.

| Command | Purpose |
| --- | --- |
| `herd link vue` | Serve the current folder as `vue.test` (and `*.vue.test`) |
| `herd secure vue` | Enable HTTPS for the site |
