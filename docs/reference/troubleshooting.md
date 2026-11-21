---
title: "Troubleshooting Laravel SaaS Kits"
description: "Fixes for common problems: Vite manifest errors, tenant subdomains, queued emails, stale translations or types, tenant database clashes and 403 errors."
---

# Troubleshooting

Find your symptom in the table, then follow the link to the fix.

| Symptom | Usual cause |
| --- | --- |
| [Vite manifest error](#unable-to-locate-file-in-vite-manifest) | Frontend not built / dev server not running |
| [404 on `localhost` or `127.0.0.1`](#the-app-shows-404-on-127-0-0-1-8000-or-localhost) | App opened on a host that is not `APP_DOMAIN` |
| [Tenant subdomain does not load](#tenant-subdomain-does-not-load) | No wildcard DNS or site link |
| [Emails not sent](#invitation-or-password-reset-emails-are-not-sent) | No queue worker, or `MAIL_MAILER=log` |
| [Stale translations](#translations-do-not-update-in-the-ui), [routes or types](#route-functions-or-types-are-outdated-typescript-errors-after-backend-changes) | Generated files not regenerated |
| [Creating a tenant fails](#creating-a-tenant-fails-with-a-database-error) | DB user cannot create databases, or the tenant database already exists |
| [Tenant migration did not run](#new-tenant-migration-did-not-run) | Ran `migrate` instead of `tenants:migrate` |
| [403 after registering](#_403-right-after-registering) | Self-registered users have no role |
| [Menu item missing](#a-menu-item-is-missing) | User lacks the menu's permission |
| [Permission changes do nothing](#changes-to-config-permissions-have-no-effect) | Permissions not seeded into the database yet |
| [Passkeys fail locally](#passkeys-do-not-work-locally) | Site is not on HTTPS |
| [Maintenance or suspended page](#a-tenant-shows-the-maintenance-or-suspended-page) | Maintenance is on in **Setup → Tenant Settings**, or the Workspace status is Suspended |

## `Unable to locate file in Vite manifest`

The frontend hasn't been built, or the dev server isn't running. While developing, run `npm run dev` (or `composer dev`). For a production build, run `npm run build`.

## The app shows 404 on `127.0.0.1:8000` or `localhost`

Only `APP_DOMAIN` counts as a central domain. Any other host is treated as a tenant, and a tenant that doesn't exist returns 404. Open the app at `APP_URL` (e.g. `http://vue.test`) instead of the address `php artisan serve` prints.

## Tenant subdomain does not load

- The tenant domain has to resolve to the app. With Herd, link the site with the name that matches `APP_DOMAIN` (`herd link vue` for `vue.test`), and every `*.vue.test` subdomain works.
- Without Herd, you need wildcard DNS (dnsmasq, for example) and a web server that serves `*.APP_DOMAIN` from `public/`. A plain `/etc/hosts` file can't do wildcards.
- In production, add a `*.your-domain.com` DNS record and a wildcard TLS certificate.
- Make sure the domain actually exists: `php artisan tenants:list`.

## Invitation or password reset emails are not sent

These notifications go through the queue (`QUEUE_CONNECTION=database`). Check these in order:

1. Run a worker, either `composer dev` (it includes `queue:listen`) or `php artisan queue:work`.
2. Leave `DB_QUEUE_CONNECTION` unset so it falls back to `DB_CONNECTION`. Jobs from tenants then go to the central `jobs` table, where the worker looks.
3. With `MAIL_MAILER=log`, emails are written to `storage/logs/laravel.log` instead of being sent. Set up SMTP to send them.
4. Look at `php artisan queue:failed`.

## Translations do not update in the UI

In the Vue, React and Svelte kits, the frontend reads the generated JSON in `resources/js/lang`, not the files in `lang/`. After you change anything in `lang/`, run `php artisan erag:generate-lang`. Also check that you import the helper from the framework subpath (`@erag/lang-sync-inertia/vue`, `/react`, `/svelte`).

The Livewire kit reads `lang/` directly, so there's nothing to regenerate.

## Route functions or types are outdated / TypeScript errors after backend changes

Vue, React and Svelte kits only. These files are generated, so regenerate them:

| Command | Regenerates |
| --- | --- |
| `php artisan wayfinder:generate --with-form` | `@/routes`, `@/actions` |
| `php artisan typescript:transform` | `resources/js/types` |

If your editor still shows old types after that, restart `npm run dev`.

## Creating a tenant fails with a database error

- Access denied, or the database can't be created: the DB user is missing `CREATE DATABASE` rights. It also needs `DROP DATABASE` to delete tenants.
- The database already exists: another app on the same MySQL server already created `tenant1`, or an earlier `migrate:fresh` left tenant databases behind. Drop the old databases, or use a unique tenant DB prefix: `TENANCY_DB_PREFIX` in the React kit, `'prefix'` in `config/tenancy.php` in Vue, Svelte and Livewire. See [Database](/docs/core/database#tenant-database-naming).

## New tenant migration did not run

Tenant migrations live in `database/migrations/tenant` and run with `php artisan tenants:migrate`. Plain `php artisan migrate` doesn't touch them.

## 403 right after registering

Users who sign up on their own get no role and no permissions, but `/dashboard` requires `View Analytics Dashboard` (central) or `View Tenant Dashboard` (tenant). Give them a role or permissions from **Users**, or set a default role in `Modules\Auth\Actions\CreateNewUser`. See [Authentication](/docs/core/authentication#registration-and-permissions).

## A menu item is missing

Menus are filtered by their `permission` column. Usually the user lacks that permission, or the item isn't in the current context's `menus` table (central and tenant menus are stored separately). **Setup → Menus → Reset** brings back the seeded defaults.

## Changes to `config/permissions` have no effect

Permissions only work once they exist in the database. Run `php artisan db:seed --class=PermissionSeeder` (central) and `php artisan tenants:seed --class="Database\Seeders\PermissionSeeder"` (tenants), then assign them. spatie caches permissions for 24 hours. The seeders clear that cache. If you added permissions another way, run `php artisan permission:cache-reset`.

## Passkeys do not work locally

WebAuthn only works on a secure origin (HTTPS). Secure the site (for example `herd secure vue`) and use an `https://` `APP_URL`. The React and Svelte `.env.example` files already use `https://`. The Vue and Livewire ones use `http://`.

## A tenant shows the maintenance or suspended page

- Maintenance: check **Setup → Tenant Settings** on the central domain, or use the bypass link or the IP allow list.
- Suspended: set the tenant's Workspace status back to Active.

See [Maintenance & suspension](/docs/core/maintenance-and-suspension).

## Still stuck

Open an issue on your kit's GitHub repository. Include the error, the steps to reproduce it and your PHP and Node versions.

<RelatedPages :links="[
  { text: 'Local development', link: '/docs/getting-started/local-development', desc: 'The first run, step by step.' },
  { text: 'Commands', link: '/docs/reference/commands', desc: 'Seeders, tenant commands and generators.' },
  { text: 'FAQ', link: '/docs/reference/faq', desc: 'Short answers to common questions.' },
]" />
