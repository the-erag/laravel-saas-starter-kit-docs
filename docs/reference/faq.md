---
title: "SaaS Laravel Starter Kits FAQ"
description: "Answers to common questions about the SaaS Laravel starter kits: kit differences, features, pricing, repository access, updates and development."
---

# FAQ

## Product

### What is the difference between the Vue, React and Svelte kits?

Just the frontend in `resources/js`. The Laravel backend is the same in all three: modules, tenancy, auth, permissions, migrations, translations and tests. Pick the frontend your team already likes working in. See [Introduction](/docs).

### Is there a billing / Stripe integration?

No. The kits don't include billing, subscriptions or payment processing for your customers.

### Is there a REST API?

No. Every route is an Inertia web route. You won't find API tokens (Sanctum) or API endpoints.

### Does it support teams?

Not as a separate feature. Each tenant is its own workspace with its own users, and spatie's teams mode is turned off in `config/permission.php`.

### Can tenants use their own custom domains?

By default, tenant domains are subdomains of `APP_DOMAIN`, like `acme.your-domain.com`. A tenant can have several subdomains, with one set as primary. See [Domains](/docs/core/domains).

### Single database or one database per tenant?

Each tenant gets its own database (stancl/tenancy's multi-database mode). See [Multi-tenancy](/docs/core/multi-tenancy).

### Which languages are included?

There are 17: English, Hindi, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Turkish, Dutch, Indonesian, Bengali, Polish, Vietnamese and Thai. See [Localization](/docs/core/localization).

### Is SSR enabled?

No. There's a `build:ssr` npm script, but by default the kits run as client-rendered Inertia apps.

### Do I have to use Laravel Herd?

No, but it's the easiest option, because tenant subdomains (`*.vue.test`) just work. Any setup that serves the central domain and its wildcard subdomains will do. See [Requirements](/docs/getting-started/requirements).

### Can I use SQLite or PostgreSQL?

`config/tenancy.php` registers database managers for SQLite, MySQL, MariaDB and PostgreSQL, and the test suite runs on in-memory SQLite. That said, the kits are built and run on MySQL, and that's what we recommend.

## Purchase and access

### How much does it cost?

The Vue kit is $29, React is $30 and Svelte is $33. The All Starter Kits bundle (Vue + React + Svelte) costs $79, so you save $13. Every option is a one-time payment with lifetime access. See [Pricing](/pricing).

### Is it a subscription?

No. You pay once and get lifetime access, with updates every week.

### How do I pay?

Through GitHub Sponsors. The steps are on [How to pay](/how-to-pay).

### How quickly do I get access?

Right away. As soon as the payment goes through, your GitHub account is invited to the repository automatically. See [Repository access](/docs/purchase/repository-access).

### What does the bundle include?

Access to all three kit repositories: Vue, React and Svelte.

### How do I get updates?

We push updates to your kit repository every week. Add it as your `upstream` remote and merge them in. See [Updates](/docs/purchase/updates).

### Where do I get help?

Have a look at [Troubleshooting](/docs/reference/troubleshooting) first. If that doesn't sort it out, open an issue on your kit's GitHub repository.

## Development

### Where do I add a new feature?

Create a module in `Modules/<Name>/` with its own service provider, routes, controllers, Data classes and services, then register the provider in `bootstrap/providers.php`. Pages go in `resources/js/pages`. See [Architecture](/docs/core/architecture).

### How do I add a page that only tenants see?

1. Add the route in a module and protect it with `auth` and a tenant permission from `config/permissions/tenant/*.php`.
2. Add a menu entry in `Database\Seeders\tenant\MenuSeeder`.
3. If the route must be strictly tenant-only, also add stancl's `PreventAccessFromCentralDomains` middleware.

### What are the default logins?

There's one user per role, and they all use the password `password`:

| Role | Email |
| --- | --- |
| Super Admin | `super-admin@gmail.com` |
| Admin | `admin@gmail.com` |
| Manager | `manager@gmail.com` |
| Employee | `employee@gmail.com` |
| User | `user@gmail.com` |

`DefaultUserSeeder` creates them in the central app and again in every new tenant.

::: warning
Change or remove these users before you go to production.
:::

### Do the kits work with AI coding agents?

Yes. Every kit comes with Laravel Boost guidelines (`AGENTS.md`, `CLAUDE.md`), skills in `.agents/skills` and `.claude/skills`, and an MCP configuration (`.mcp.json`). The Vue kit also has project rules in `.ai/rules`.
