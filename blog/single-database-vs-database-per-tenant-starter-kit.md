---
title: "Single Database vs Database-per-Tenant SaaS Kits"
description: "Which Laravel SaaS starter kits share one database and which give each tenant its own, and what that means for migrations, backups, hosting and reports."
pageClass: blog-page
date: 2026-11-21
author: erag
category: multi-tenancy
tags: [Multi-tenancy, Starter Kits, Database]
---

# Single Database vs Database-per-Tenant Starter Kits: Which One to Pick

<BlogPostMeta />

When you compare Laravel SaaS starter kits, the feature lists look alike: auth, teams, roles, billing, an admin area. The thing that differs most is often one line on the page, or not on the page at all: does the kit keep every customer in **one shared database**, or does it give **each tenant its own database**?

That choice is baked into the kit's migrations, models, routes and tests. You can change it later, but by then you're rewriting a large part of the code you paid for. So it's worth knowing which model a kit uses before you buy it.

Below: which model the common kits use (checked on their own sites in November 2026), what that means day to day, and how hard it is to switch. We make one of these kits, so we only state what each product says. For the theory behind the two models, read [single vs multi-database tenancy in Laravel](/blog/single-vs-multi-database-tenancy-laravel.html) first.

## Which tenancy model each kit uses

### Laravel's official starter kits (with teams)

The official React, Vue, Svelte and Livewire kits [can be generated with team support](https://laravel.com/docs/starter-kits). Users belong to one or more teams, get a personal team on registration, and team routes use `/{current_team}/...`. When we checked in November 2026, the docs didn't mention subdomains or a database per team. It's a shared-database model: team data sits in the app's own tables. The kits are free and MIT licensed.

### Filament's built-in tenancy

Many kits are built on Filament, so its model matters. Filament 5's [tenancy docs](https://filamentphp.com/docs/5.x/users/tenancy) describe users who belong to many tenants (teams or organizations), with a tenant switcher and access checks. The examples scope records with a tenant foreign key, such as `team_id`, on shared tables. That docs page doesn't mention a database per tenant.

### SaaSykit Tenancy

SaaSykit Tenancy is a separate product from the base SaaSykit kit, built on Filament and Livewire. Its [multi-database tenancy docs](https://saasykit.com/docs/multi-tenancy/multi-database-tenancy) recommend that you "stick with single-database tenancy". It also ships a plugin that [enables multi-database tenancy](https://saasykit.com/docs/multi-tenancy/multi-database-tenancy) by integrating Tenancy for Laravel with Filament. So, as of November 2026, you get both options, with single database as the recommended one.

### Tenancy for Laravel SaaS boilerplate

The [SaaS boilerplate](https://tenancyforlaravel.com/saas-boilerplate/) from the authors of stancl/tenancy is "multi-domain multi-database": a database per tenant. Tenants and domains are managed from Laravel Nova. When we checked in November 2026 it was on Laravel 12, with a new Jetstream-based version announced for "the coming months".

### SaaS Laravel

Our kits use stancl/tenancy in multi-database mode: a central database plus one database per tenant (`tenant1`, `tenant2`, and so on). Each tenant is a subdomain of your app domain. There are four kits (Vue, React, Svelte and Livewire) on the same Laravel 13 backend.

### Others

[Electrik](https://github.com/electrikhq/electrik) has teams with a `BelongsToTeam` trait; a database per tenant isn't stated. [Larafast Multi-Tenancy](https://larafast.com/multitenancy) lists "Team-Based Multi-Tenancy" and describes itself as a kit "with database isolation, custom domains and a Filament 5 admin panel". It doesn't say whether that means one database per tenant, so ask them if it matters.

| Kit | Tenancy model (November 2026) | Tenant identified by | Admin UI |
| --- | --- | --- | --- |
| Official kits with teams | Shared database | Team in the URL (`/{current_team}`) | Not included |
| Filament tenancy | Shared tables with a tenant key (per docs examples) | Tenant ID or slug in the URL path, or a [domain or subdomain](https://filamentphp.com/docs/5.x/users/tenancy) | Filament |
| SaaSykit Tenancy | Single database recommended, multi-database plugin | Subdomains or custom domains | Filament |
| Tenancy for Laravel boilerplate | Database per tenant | Domains | Laravel Nova |
| SaaS Laravel | Database per tenant | Subdomains | Built in the kit's own frontend |

## What the model means once the kit is yours

### Data isolation

In a shared-database kit, isolation lives in code: global scopes, policies and every query that touches tenant data. The risk is in the code you add later: a raw query, a report or a queued job that runs without the tenant set. In a database-per-tenant kit, those mistakes can't reach another customer's rows, because the rows are in a different database.

### Migrations

A shared-database kit has one set of migrations and one `php artisan migrate`. A database-per-tenant kit has two: central migrations and tenant migrations, run with a separate command against every tenant database. In SaaS Laravel, tenant migrations live in `database/migrations/tenant` and run with `php artisan tenants:migrate`. Deploys get longer as you grow.

### Backups and restores

One database means one backup, and restoring one customer means picking their rows out of a full dump. With a database per tenant, you back up many databases, but you can restore or export one customer without touching anyone else. Deleting a customer can mean dropping one database (in SaaS Laravel, deleting a tenant drops its database).

### Hosting

Shared-database kits run anywhere Laravel runs, including SQLite on a small server. A database-per-tenant kit asks more of the host. SaaS Laravel needs MySQL or MariaDB ([requirements](/docs/getting-started/requirements.html)) with a database user that can `CREATE` and `DROP` databases, and wildcard subdomains for tenant URLs. Some managed database plans restrict those permissions, so check yours first.

### Reporting across tenants

"How many active users do all customers have?" is one query in a shared database. With a database per tenant, you loop over tenants or write summaries to a central table. If cross-tenant analytics is part of your product, not just an internal report, that points toward a shared database.

| | Shared-database kit | Database-per-tenant kit |
| --- | --- | --- |
| Isolation | Your queries and scopes | The database connection |
| Migrations | One run | Central run plus one per tenant |
| Restore one customer | Hard | One database |
| Hosting needs | Any Laravel host | Create/drop database rights, often wildcard domains |
| Cross-tenant reports | One query | Loop or central summary |
| Many tiny free accounts | Easy | Many small databases to manage |

## How hard it is to switch later

The model isn't just a config value in a kit. It shapes the code you get:

- A team-based kit puts a `team_id` (or similar) on every tenant table, scopes models by it and builds routes around the current team.
- A database-per-tenant kit has a central and a tenant side, often with separate auth guards, separate migration folders, and cache, files and queued jobs that know about the tenant. SaaS Laravel has all of these.

Switching means touching most of those files. And there's a cost specific to buying a kit: once you change something this basic, almost every update from the author touches files you've rewritten, so pulling updates gets much harder.

Going from shared to per-tenant databases can be done tenant by tenant. Going the other way is harder. In SaaS Laravel, for example, records in each tenant database use auto-increment IDs, so two tenants can both have a user with ID 1, and merging them means rewriting keys.

So treat the tenancy model as fixed when you pick a kit.

## A single database is fine for many products

A shared-database kit is the better choice when:

- Your customers are individuals or small teams, and many are on a free plan.
- You expect a very large number of small accounts.
- Cross-tenant data is part of the product: leaderboards, marketplaces, shared catalogs.
- You want the simplest hosting and one migration run per deploy.
- Nobody is asking you where their data is stored.

The official kits with teams, or a kit like SaaSykit Tenancy in its recommended mode, are sensible picks here.

## When database-per-tenant earns its cost

It's worth the extra operations when:

- Your customers are businesses that send security questionnaires or ask about data separation.
- They'll ask for a full export, a restore to yesterday, or "delete everything of ours".
- One customer could grow much larger than the rest, and you might want to move them to their own server.
- You'd rather a missed `where` clause be a bug, not a data leak.

## Decision checklist

Answer these before you compare feature lists:

- [ ] Are my first paying customers individuals or companies?
- [ ] Will a customer ask where their data lives, or for a per-customer restore?
- [ ] Do I need reports across tenants inside the product, or only internally?
- [ ] Does my host give me create/drop database rights and wildcard subdomains?
- [ ] Can I automate tenant migrations and backups in deploys?
- [ ] Does the kit state its model plainly in its docs?
- [ ] Do the kit's migrations show a `tenant_id`/`team_id` pattern or a separate tenant migrations folder?
- [ ] Am I prepared to keep this model for the life of the product?

Not sure which side of the checklist you're on? The [Laravel tenancy model quiz](/tools/laravel-tenancy-model-quiz.html) scores your answers and shows its weights, so you can see why it recommends one model.

## Frequently asked questions

### Do Laravel's official starter kits support multi-tenancy?

They support teams, which is a form of tenancy in one shared database. When we checked in November 2026, the docs didn't describe subdomains or a database per team. Our post on [teams vs multi-tenancy](/blog/laravel-teams-vs-multi-tenancy.html) explains the difference.

### Does Filament support a database per tenant?

Filament's tenancy docs don't mention it. Their examples scope records on shared tables. Kits such as SaaSykit Tenancy add multi-database support on top of Filament with a plugin.

### Can I add a database per tenant to a single-database kit myself?

Yes, with a package like stancl/tenancy, but expect to change models, migrations, routes and tests, and to diverge from the kit's updates. [Comparing tenancy packages](/blog/laravel-multi-tenancy-packages.html) helps if you go that way.

### Is a database per tenant overkill for an MVP?

If your MVP customers are businesses, it's easier to start with it than to move to it later. If they're individuals on free plans, a shared database is usually the simpler call.

## Where SaaS Laravel fits

SaaS Laravel only does database-per-tenant, on subdomains. If that's what your product needs, it gives you the central and tenant sides, separate guards, tenant-aware cache, files and queues, and tenant migrations already wired up. See the [multi-tenancy docs](/docs/core/multi-tenancy.html) and the [database layout](/docs/core/database.html).

It's not the right pick if you want a shared database, a huge number of free accounts, or hosting without create-database rights. It also doesn't include billing (see the [Stripe billing guide](/blog/laravel-saas-stripe-billing.html) to add it). In those cases, look at the official kits with teams or SaaSykit Tenancy. Our [roundup of Laravel SaaS starter kits](/blog/best-laravel-saas-starter-kits.html) and [SaaS Laravel vs SaaSykit](/blog/saas-laravel-vs-saasykit.html) compare them further. If you want to see the code first, read [what clean Laravel code means in a starter kit](/blog/clean-laravel-code-saas-starter-kit.html), then check the [pricing](/pricing.html) and the [Vue](/kits/vue.html), [React](/kits/react.html), [Svelte](/kits/svelte.html) or [Livewire](/kits/livewire.html) kit pages.

<BlogPostCta title="A database per tenant, already set up" text="SaaS Laravel gives each tenant its own database and subdomain, with central and tenant sides wired up, in Vue, React, Svelte or Livewire." />
