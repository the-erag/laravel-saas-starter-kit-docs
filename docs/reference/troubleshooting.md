---
title: "Troubleshooting Laravel SaaS Kits"
description: "Fixes for common problems: Vite manifest errors, tenant subdomains, queued emails, stale translations or types, tenant database clashes and 403 errors."
head:
  - - link
    - rel: canonical
      href: https://saas-laravel.com/docs/reference/troubleshooting.html
  - - meta
    - property: og:title
      content: "Troubleshooting Laravel SaaS Kits"
  - - meta
    - property: og:description
      content: "Fixes for common problems: Vite manifest errors, tenant subdomains, queued emails, stale translations or types, tenant database clashes and 403 errors."
  - - meta
    - property: og:url
      content: https://saas-laravel.com/docs/reference/troubleshooting.html
  - - meta
    - name: twitter:title
      content: "Troubleshooting Laravel SaaS Kits"
  - - meta
    - name: twitter:description
      content: "Fixes for common problems: Vite manifest errors, tenant subdomains, queued emails, stale translations or types, tenant database clashes and 403 errors."
---

# Troubleshooting

| Symptom | Usual cause |
| --- | --- |
| Vite manifest error | Frontend not built / dev server not running |
| 404 on `localhost` or `127.0.0.1` | App opened on a host that is not `APP_DOMAIN` |
| Tenant subdomain does not load | No wildcard DNS or site link |
| Emails not sent | No queue worker, or `MAIL_MAILER=log` |
| Stale translations, routes or types | Generated files not regenerated |
| 403 after registering | Self-registered users have no role |

## `Unable to locate file in Vite manifest`

Either the frontend hasn't been built or the dev server isn't running. While you're developing, run `npm run dev` (or `composer dev`). For a production-like build, run `npm run build`.

## The app shows 404 on `127.0.0.1:8000` or `localhost`

Only `APP_DOMAIN` counts as a central domain. Any other host is treated as a tenant, and a tenant that doesn't exist returns 404. Open the app at `APP_URL` (e.g. `http://vue.test`) instead of the address `php artisan serve` prints.

## Tenant subdomain does not load

- The tenant domain has to resolve to the app. With Herd, link the site using the name that matches `APP_DOMAIN` (`herd link vue` for `vue.test`), and every `*.vue.test` subdomain will work.
- Without Herd, you need wildcard DNS (dnsmasq, for example) and a web server that serves `*.APP_DOMAIN` from `public/`. A plain `/etc/hosts` file can't do wildcards.
- In production, add a `*.your-domain.com` DNS record and a wildcard TLS certificate.
- Make sure the domain actually exists: `php artisan tenants:list`.

## Invitation or password reset emails are not sent

These notifications go through the queue (`QUEUE_CONNECTION=database`), so work through this list:

1. Run a worker, either `composer dev` (it includes `queue:listen`) or `php artisan queue:work`.
2. Leave `DB_QUEUE_CONNECTION` unset so it falls back to `DB_CONNECTION`. That way jobs from tenants end up in the central `jobs` table, which is where the worker looks.
3. With `MAIL_MAILER=log`, emails are written to `storage/logs/laravel.log` instead of being delivered. Set up SMTP to actually send them.
4. Look at `php artisan queue:failed`.

## Translations do not update in the UI

The frontend reads the generated JSON in `resources/js/lang`, not the files in `lang/`. After you change anything in `lang/`, run `php artisan erag:generate-lang`.

Also make sure you import the helper from the framework subpath (`@erag/lang-sync-inertia/vue`, `/react`, `/svelte`).

## Route functions or types are outdated / TypeScript errors after backend changes

These files are generated, so regenerate them:

| Command | Regenerates |
| --- | --- |
| `php artisan wayfinder:generate --with-form` | `@/routes`, `@/actions` |
| `php artisan typescript:transform` | `resources/js/types` |

If your editor still shows old types after that, restart `npm run dev`.

## Creating a tenant fails with a database error

- If you get access denied or the database can't be created, the DB user is missing `CREATE DATABASE` rights. It also needs `DROP DATABASE` to delete tenants.
- If the database already exists, either another app on the same MySQL server has already created `tenant1`, or an earlier `migrate:fresh` left tenant databases behind. Drop the old databases, or use a unique tenant DB prefix: `TENANCY_DB_PREFIX` in the React kit, `'prefix'` in `config/tenancy.php` in Vue and Svelte. See [Database](/docs/core/database#tenant-database-naming).

## New tenant migration did not run

Tenant migrations live in `database/migrations/tenant` and you run them with `php artisan tenants:migrate`. Plain `php artisan migrate` won't pick them up.

## 403 right after registering

Users who sign up on their own get no role and no permissions, but `/dashboard` needs `View Analytics Dashboard` (central) or `View Tenant Dashboard` (tenant). Give them a role or permissions from **Users**, or set a default role in `Modules\Auth\Actions\CreateNewUser`. See [Authentication](/docs/core/authentication#registration-and-permissions).

## A menu item is missing

Menus are filtered by their `permission` column. Usually the user doesn't have that permission, or the item isn't in the current context's `menus` table (central and tenant menus are stored separately). **Setup → Menus → Reset** brings back the seeded defaults.

## Changes to `config/permissions` have no effect

Permissions have to exist in the database before they do anything. Run `php artisan db:seed --class=PermissionSeeder` (central) and `php artisan tenants:seed --class="Database\Seeders\PermissionSeeder"` (tenants), then assign them. spatie caches permissions for 24 hours. The seeders clear that cache for you; if you didn't use them, run `php artisan permission:cache-reset`.

## Passkeys do not work locally

WebAuthn only works on a secure origin (HTTPS). Secure the site (for example `herd secure vue`) and use an `https://` `APP_URL`. The React and Svelte `.env.example` files already use `https://`, but the Vue one uses `http://vue.test`.

## A tenant shows the maintenance or suspended page

- Maintenance: check **Setup → Tenant Settings** on the central domain, or use the bypass link or the IP allow list.
- Suspended: set the tenant's Workspace status back to Active.

See [Maintenance & suspension](/docs/core/maintenance-and-suspension).

## Still stuck

Open an issue on your kit's GitHub repository. Include the error, the steps to reproduce it and your PHP and Node versions.
