---
title: "Requirements for Laravel SaaS Starter Kits"
description: "What you need to run a SaaS Laravel starter kit: PHP 8.4+, Composer 2, Node.js LTS, MySQL for per-tenant databases and a local server with wildcard subdomains."
---

# Requirements

Before you install a kit, make sure these tools are on your machine. It takes a few minutes and saves you from errors halfway through the install.

<div class="req-grid">
  <div class="req-card">
    <div class="req-card-head"><span class="req-card-name">PHP</span><Badge type="tip" text="^8.4" /></div>
    <p class="req-card-text">The kits need PHP 8.4 or newer. You'll need the extensions Laravel 13 needs, plus <code>pdo_mysql</code>.</p>
  </div>
  <div class="req-card">
    <div class="req-card-head"><span class="req-card-name">Composer</span><Badge type="tip" text="2.x" /></div>
    <p class="req-card-text">Installs the Laravel backend.</p>
  </div>
  <div class="req-card">
    <div class="req-card-head"><span class="req-card-name">Node.js + npm</span><Badge type="tip" text="Current LTS" /></div>
    <p class="req-card-text">In the Vue, React and Svelte kits, <code>@erag/lang-sync-inertia</code> declares <code>node &gt;= 24</code>. Each kit ships a <code>package-lock.json</code>, so stick with <strong>npm</strong>.</p>
  </div>
  <div class="req-card">
    <div class="req-card-head"><span class="req-card-name">MySQL (or MariaDB)</span><Badge type="tip" text="Any supported" /></div>
    <p class="req-card-text">Every tenant gets its own database, so your DB user has to be allowed to <code>CREATE DATABASE</code> / <code>DROP DATABASE</code>.</p>
  </div>
  <div class="req-card">
    <div class="req-card-head"><span class="req-card-name">Local server with wildcard subdomains</span></div>
    <p class="req-card-text">We recommend <a href="https://herd.laravel.com" target="_blank" rel="noreferrer">Laravel Herd</a>.</p>
  </div>
  <div class="req-card">
    <div class="req-card-head"><span class="req-card-name">Git</span></div>
    <p class="req-card-text">For cloning your kit repository and pulling updates.</p>
  </div>
</div>

<KeyIdea>

Two of these matter more than the rest: every tenant subdomain has to reach your app, and your database user has to be able to create databases. [Why Herd](#why-herd) and [Database](#database) below cover both.

</KeyIdea>

## Check your setup

Run these in a terminal. Each one should print a version (or `pdo_mysql`) without an error.

```bash
php -v                    # 8.4 or newer
php -m | grep pdo_mysql   # prints pdo_mysql if it's enabled
composer -V               # Composer 2.x
node -v                   # v24+ for Vue, React and Svelte
npm -v                    # comes with Node.js
mysql --version           # MySQL or MariaDB client
git --version             # any recent version
```

On Windows, use `php -m | findstr pdo_mysql` instead of `grep`.

## Why Herd

The app finds each tenant by its domain, so every tenant subdomain has to reach your app. The docs use the Vue kit's local domain, `vue.test`. The other kits use `react.test`, `svelte.test` and `livewire.test`.

```text
APP_DOMAIN=vue.test
vue.test        → central app
acme.vue.test   → tenant created with the subdomain "acme"
```

Herd serves `*.test` sites and their subdomains with no extra setup, so each new tenant works right away. No DNS changes or hosts-file entries.

::: tip Other setups
Any local stack works, as long as the central domain and all of its subdomains point to the project's `public/` directory with no port in the URL (tenant links are built as `scheme://<domain>/path`).

We configure and test the kits with Herd only, and we don't document a specific setup for Windows or Linux. Laravel Sail is installed as a dev dependency, but it isn't the setup we test.
:::

## Database

`.env.example` uses `DB_CONNECTION=mysql`. `config/tenancy.php` also registers database managers for `sqlite`, `mariadb` and `pgsql`, but MySQL is what we build and test the kits against.

::: warning Database permissions
Creating a tenant runs `CREATE DATABASE` on the central connection. If your DB user can't create databases, tenant creation will fail.
:::

`.env.example` connects as `root`, which can already create databases. If you use your own MySQL user, give it rights on the central database and on every tenant database. Tenant databases are named `tenant1`, `tenant2` and so on (see [Tenant database naming](/docs/core/database#tenant-database-naming)):

```sql
CREATE USER 'saas'@'localhost' IDENTIFIED BY 'secret';
GRANT ALL PRIVILEGES ON `saas_laravel_vue`.* TO 'saas'@'localhost';
GRANT ALL PRIVILEGES ON `tenant%`.* TO 'saas'@'localhost';
FLUSH PRIVILEGES;
```

Change `saas_laravel_vue` to your `DB_DATABASE`. If you change the tenant database prefix, change `tenant%` to match.

## Production

Before you deploy, make sure you have:

| Need | Why |
| --- | --- |
| PHP `^8.4` | Same as local |
| Web server routing the central domain and a wildcard subdomain (`*.your-domain.com`) to the app, plus a wildcard DNS record | Every tenant is a subdomain |
| A database user with rights to create tenant databases | Tenant creation runs `CREATE DATABASE` |
| A queue worker (`php artisan queue:work`) | Invitation and password-reset emails are queued |
| A real mailer (`MAIL_MAILER=smtp` or similar) | So those emails actually get delivered |

For the `.env` side, see the [production checklist](/docs/reference/environment#production-checklist). For a full walkthrough, read [Deploying a Laravel SaaS to production](/blog/deploy-laravel-saas).

<RelatedPages :links="[
  { text: 'Installation', link: '/docs/getting-started/installation', desc: 'Clone the kit and install it once these tools are ready.' },
  { text: 'Local development', link: '/docs/getting-started/local-development', desc: 'The full first run, from the database to your first tenant.' },
  { text: 'Environment', link: '/docs/reference/environment#production-checklist', desc: 'The .env values to set before you go live.' },
]" />

<style>
.req-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 24px 0;
}

.req-card {
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}

.req-card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 10px;
}

.req-card-name {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--vp-c-text-1);
}

.req-card-head .VPBadge {
  margin: 0;
  transform: none;
}

.vp-doc .req-card-text {
  margin: 6px 0 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}

.req-card-text code {
  font-size: 12px;
}

@media (max-width: 640px) {
  .req-grid {
    grid-template-columns: 1fr;
  }
}
</style>
