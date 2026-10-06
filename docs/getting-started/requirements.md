---
title: "Requirements for Laravel SaaS Starter Kits"
description: "What you need to run a SaaS Laravel starter kit: PHP 8.3+, Composer 2, Node.js LTS, MySQL for per-tenant databases and a local server with wildcard subdomains."
---

# Requirements

| Tool | Version | Notes |
| --- | --- | --- |
| PHP | `^8.3` | We build and test the kits on PHP 8.4. You'll need the extensions Laravel 13 needs, plus `pdo_mysql`. |
| Composer | 2.x | Installs the Laravel backend. |
| Node.js + npm | A current Node LTS | `@erag/lang-sync-inertia` declares `node >= 24`. Each kit ships a `package-lock.json`, so stick with **npm**. |
| MySQL (or MariaDB) | Any supported version | Every tenant gets its own database, so your DB user has to be allowed to `CREATE DATABASE` / `DROP DATABASE`. |
| Local web server with wildcard subdomains | — | We recommend [Laravel Herd](https://herd.laravel.com). |
| Git | — | For cloning your kit repository and pulling updates. |

## Why Herd

The app finds each tenant by its domain, so every tenant subdomain has to reach your app:

```text
APP_DOMAIN=vue.test
vue.test        → central app
acme.vue.test   → tenant created with the subdomain "acme"
```

Herd serves `*.test` sites and their subdomains with no extra setup, so each new tenant just works. You don't need DNS changes or hosts-file entries.

::: tip Other setups
You can use any local stack, as long as the central domain and all of its subdomains point to the project's `public/` directory with no port in the URL (tenant links are built as `scheme://<domain>/path`). Laravel Sail is installed as a dev dependency, but we configure and test the kits with Herd.
:::

## Database

`.env.example` uses `DB_CONNECTION=mysql`. `config/tenancy.php` also registers database managers for `sqlite`, `mariadb` and `pgsql`, but MySQL is what we build and test the kits against.

::: warning Database permissions
Creating a tenant runs `CREATE DATABASE` on the central connection. If your DB user can't create databases, tenant creation will fail.
:::

## Production

| Need | Why |
| --- | --- |
| PHP `^8.3` | Same as local |
| Web server routing the central domain and a wildcard subdomain (`*.your-domain.com`) to the app, plus a wildcard DNS record | Every tenant is a subdomain |
| A database user with rights to create tenant databases | Tenant creation runs `CREATE DATABASE` |
| A queue worker (`php artisan queue:work`) | Invitation and password-reset emails are queued |
| A real mailer (`MAIL_MAILER=smtp` or similar) | So those emails actually get delivered |

Next: [Installation](/docs/getting-started/installation).
