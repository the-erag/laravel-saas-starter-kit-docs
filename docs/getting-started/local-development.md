---
title: "Local Development: Run the Kit with Tenants"
description: "First run of a SaaS Laravel kit step by step: environment, database, seeding, composer dev, the queue worker, creating tenants, generated files and tests."
---

# Local development

This guide walks through the whole first run. It uses the Vue kit's values (`vue.test`). In the React, Svelte and Livewire kits, `.env.example` uses `react.test`, `svelte.test` and `livewire.test` instead.

In short: clone the kit, create `.env` and the central database, migrate and seed, install frontend packages, serve the app with `herd link`, run `composer dev`, then create your first tenant.

<KeyIdea title="What you'll have at the end">

The central app running at `http://vue.test` with seeded roles and users, the server, queue worker and Vite running from one `composer dev`, and a first tenant workspace at `http://acme.vue.test`.

</KeyIdea>

## Prerequisites

You need PHP `^8.4`, Composer 2, a current Node LTS with npm, and MySQL with a user that can create databases. We recommend [Laravel Herd](https://herd.laravel.com), because `*.test` domains and wildcard tenant subdomains work with no setup. See [Requirements](/docs/getting-started/requirements) for details.

<DocSteps>

## 1. Clone and install PHP dependencies

```bash
git clone https://github.com/the-erag/saas-laravel-starter-kit-vue.git vue
cd vue
composer install
```

## 2. Create `.env`

```bash
cp .env.example .env
php artisan key:generate
```

Then set these keys in `.env`:

```dotenv
APP_NAME="My SaaS"
APP_URL=http://vue.test
APP_DOMAIN=vue.test

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=saas_laravel_vue
DB_USERNAME=root
DB_PASSWORD=

MAIL_MAILER=log
```

| Key | Why it matters |
| --- | --- |
| `APP_URL` | Base URL of the central app. Passkeys use it, and its scheme decides whether tenant links use `http` or `https`. |
| `APP_DOMAIN` | The central domain. Any other host is treated as a tenant domain. Tenant domains look like `<subdomain>.APP_DOMAIN`. |
| `DB_*` | The central database. Tenant databases are created on the same server. |
| `MAIL_*` | `log` writes emails to `storage/logs/laravel.log`. Set up SMTP if you want invitations and password resets to arrive. |

::: warning Several kits on one MySQL server
Tenant databases are named `<prefix><tenant id>` (for example `tenant1`), so two kits on the same server would both try to create `tenant1`. Give each kit its own prefix **before** you create any tenant:

- In the React kit, set `TENANCY_DB_PREFIX=react_tenant` in `.env`.
- In the Vue, Svelte and Livewire kits, change the literal `'prefix' => 'tenant'` in `config/tenancy.php`, or swap it for `env('TENANCY_DB_PREFIX', 'tenant')`.

See [Database → Tenant database naming](/docs/core/database#tenant-database-naming).
:::

For every key, see the [Environment reference](/docs/reference/environment).

## 3. Create the central database

```bash
mysql -u root -e "CREATE DATABASE saas_laravel_vue"
```

Or create it in TablePlus, DBngin, Herd Pro or any other tool.

## 4. Migrate and seed

```bash
php artisan migrate --seed
```

This runs the central migrations in `database/migrations`, then `Database\Seeders\DatabaseSeeder`.

### Seeded data

| Seeder | What it creates |
| --- | --- |
| `RoleSeeder` | Roles `super-admin`, `admin`, `manager`, `employee`, `user` (guard `web`) |
| `PermissionSeeder` | Every permission listed in `config/permissions/*.php` |
| `MenuSeeder` | The central sidebar menus (Dashboard, Tenants, Users, Roles, Setup) |
| `DefaultUserSeeder` | One verified user per role, with that role's default permissions |

The default users all use the password `password`:

| Email | Role |
| --- | --- |
| `super-admin@gmail.com` | Super Admin |
| `admin@gmail.com` | Admin |
| `manager@gmail.com` | Manager |
| `employee@gmail.com` | Employee |
| `user@gmail.com` | User |

::: danger Change these before going live
`DefaultUserSeeder` uses the constant `DEFAULT_PASSWORD = 'password'`, and it also runs in every new tenant database (through `TenantDatabaseSeeder`). Remove or change it before you go to production.
:::

To start over, run `php artisan migrate:fresh --seed`.

::: warning `migrate:fresh` keeps tenant databases
It only drops the central tables. Tenant databases (`tenant1`, `tenant2`, ...) stay on the server. Delete the tenants from the UI first (this drops their databases), or drop those databases yourself.
:::

## 5. Install frontend dependencies

```bash
npm install
```

## 6. Serve the app

If you use Herd, link the folder to your `APP_DOMAIN`:

```bash
herd link vue          # vue.test and *.vue.test
herd secure vue        # optional: HTTPS, then set APP_URL=https://vue.test
```

::: tip Passkeys need HTTPS
Browsers only allow WebAuthn on secure origins, so run `herd secure` if you want to try passkeys.
:::

## 7. Start the dev processes

```bash
composer dev
```

`composer dev` runs `php artisan dev`, which starts these processes in one terminal:

| Process | Command |
| --- | --- |
| server | `php artisan serve` |
| queue | `php artisan queue:listen --tries=1 --timeout=0` |
| logs | `php artisan pail --timeout=0` (only when the `pcntl` extension is available) |
| vite | `npm run dev` |

::: warning Open APP_URL, not 127.0.0.1
Open `APP_URL` (e.g. `http://vue.test`) in your browser, not `127.0.0.1:8000`. `127.0.0.1` isn't your central domain, so tenancy treats it as an unknown tenant and returns a 404.
:::

Prefer separate terminals? If Herd serves the app, you only need `npm run dev` and `php artisan queue:listen --tries=1`.

</DocSteps>

<DocDone>

**Done.** The central app is running at `APP_URL`. Sign in as `super-admin@gmail.com`, then [create your first tenant](#create-your-first-tenant).

</DocDone>

## Queue worker

The kits use `QUEUE_CONNECTION=database`. These emails are queued and only go out while a worker is running:

- Tenant admin invitation (`TenantInvitationNotification`)
- Tenant admin password reset (`TenantPasswordResetNotification`)
- User invitation (`UserInvitationNotification`)

`composer dev` already runs `queue:listen`. Jobs dispatched inside a tenant also go to the central `jobs` table, so one worker covers every tenant. See [Configuration → `config/queue.php`](/docs/getting-started/configuration#config-queue-php).

::: warning Keep the queue on the central connection
Don't point `DB_QUEUE_CONNECTION` at the `tenant` connection. Jobs would then land in tenant databases, where no worker reads them.
:::

## Create your first tenant

1. Sign in as `super-admin@gmail.com` on `http://vue.test`.
2. Go to **Tenants → Add Tenant**.
3. Fill in the company, the admin's details and a subdomain, e.g. `acme`.
4. Set a password for the tenant admin, or leave the send invitation option on to email them a signed link.

When you save, the kit creates the `tenant<id>` database, runs the tenant migrations and seeder, and creates the tenant admin with the `super-admin` role. This all happens synchronously. [Multi-tenancy → Creating a tenant](/docs/core/multi-tenancy#creating-a-tenant) covers each step.

Now open `http://acme.vue.test` and sign in as the tenant admin. If you sent an invitation, open the link from the email first. With `MAIL_MAILER=log`, it's in `storage/logs/laravel.log`.

### Tenant migrations

When you add or pull new files in `database/migrations/tenant`, run:

```bash
php artisan tenants:migrate
php artisan tenants:seed      # optional: runs TenantDatabaseSeeder for every tenant
```

## Generated files

In the Vue, React and Svelte kits, some frontend files are generated from PHP. Regenerate them when you change the source. The Livewire kit has no generated frontend files.

| Command | Source → output | When |
| --- | --- | --- |
| `php artisan wayfinder:generate --with-form` | Routes and controllers → `resources/js/routes`, `resources/js/actions`, `resources/js/wayfinder` | After adding or renaming routes or controller methods. The Vite plugin also regenerates them during `npm run dev` / `npm run build`. |
| `php artisan typescript:transform` | Data objects marked `#[TypeScript]` and enums in `app/` and `Modules/` → `resources/js/types` | After changing a Data class or enum |
| `php artisan erag:generate-lang` | `lang/<locale>/**/*.php` → `resources/js/lang/<locale>/**/*.json` | After editing translation files |

| Output | In git? |
| --- | --- |
| Wayfinder (`routes`, `actions`, `wayfinder`) | No (git-ignored) |
| `resources/js/types`, `resources/js/lang` | Yes, commit them |

`composer lint` runs Pint, `typescript:transform` and `npm run lint:fix` (the Vue kit also runs `wayfinder:generate --with-form`).

## Tests and checks

```bash
php artisan test --compact     # Pest only
composer test                  # config:clear, lint check, PHPStan, Pest
```

Tests run on in-memory SQLite (`phpunit.xml`), so your MySQL data stays untouched.

In the Vue, React and Svelte kits, `npm run lint` runs ESLint, a Prettier check and your framework's type checker:

| Kit | Type check on its own |
| --- | --- |
| Vue | `npx vue-tsc --noEmit` |
| React | `npx tsc --noEmit` |
| Svelte | `npx svelte-check --tsconfig ./tsconfig.json` |

In the Livewire kit, `npm run lint` checks the Blade views with blade-formatter. See [Testing](/docs/core/testing).

## Production build

```bash
npm run build
```

Assets go to `public/build`. The Vue, React and Svelte kits also have a `build:ssr` script (`vite build && vite build --ssr`), but SSR is off by default.

Seeing `Unable to locate file in Vite manifest`? Run `npm run build` or keep `npm run dev` running. For other problems, see [Troubleshooting](/docs/reference/troubleshooting).

<RelatedPages :links="[
  { text: 'Configuration', link: '/docs/getting-started/configuration', desc: 'What the kit-specific .env keys and config files do.' },
  { text: 'Commands', link: '/docs/reference/commands', desc: 'Every Composer, npm and Artisan command in one place.' },
  { text: 'Troubleshooting', link: '/docs/reference/troubleshooting', desc: 'Fixes for 404s, Vite errors and emails that do not arrive.' },
]" />
