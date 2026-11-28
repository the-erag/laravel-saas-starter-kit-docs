---
title: "Best Laravel Multi-Tenancy Package in 2026: Options Compared"
description: "Which Laravel multi tenancy package to use in 2026: stancl/tenancy v3 and v4, Spatie, Sprout, tenancy/tenancy, Filament and DIY, with real release dates."
pageClass: blog-page
date: 2026-11-11
author: erag
category: multi-tenancy
tags: [Multi-tenancy, Packages]
---

# The Best Laravel Multi-Tenancy Package in 2026: Every Option, Checked

<BlogPostMeta />

**Short answer:** For most new SaaS apps in 2026, the safest Laravel multi-tenancy package is stancl/tenancy v3, especially if you want a database per tenant that's created and migrated for you. Pick spatie/laravel-multitenancy if you want a small, explicit core, and treat stancl/tenancy v4, Sprout and tenancy/tenancy as options to evaluate carefully rather than defaults.

Search "best Laravel multitenancy package" and you'll find old forum threads, lists recommending packages nobody has released in years, and comparison pages written by one of the packages being compared. Not much help when you're about to commit your app to one.

So we did the boring part. On 11 November 2026 we checked each Laravel multi-tenancy package on Packagist and GitHub (latest stable release, its date, supported Laravel versions) and read each project's own docs. Versions move fast, so check again before you decide.

A quick disclosure: our own product uses stancl/tenancy v3, so we're not neutral. We've tried to be fair anyway, and we'll say where something else is the better choice.

## First, decide what kind of tenancy you need

The package matters less than the model. Before you compare anything, answer one question: does each customer get **their own database**, or do all customers share **one database with a `tenant_id` column**?

If you're not sure what that means yet, read [What is multi-tenancy in Laravel?](/blog/what-is-multi-tenancy-laravel.html) first, then [single vs multi-database tenancy](/blog/single-vs-multi-database-tenancy-laravel.html). That decision rules out half the options below before you've read a single README.

## The big comparison table

| | stancl/tenancy v3 | stancl/tenancy v4 | spatie/laravel-multitenancy | Sprout | tenancy/tenancy | Filament panel tenancy | Build it yourself |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Composer package | `stancl/tenancy` | `stancl/tenancy` (`dev-master`) | `spatie/laravel-multitenancy` | `sprout/sprout` | `tenancy/tenancy` | `filament/filament` | None |
| Latest stable (11 Nov 2026) | v3.10.1, 5 Aug 2026 | No tagged release | 4.3.1, 4 Nov 2026 | v1.2.0, 14 May 2026 | v2.5.0, 9 May 2026 | v5.11.2, 7 Nov 2026 | Your code |
| Laravel support | 10 to 13 | 12 and 13 (PHP 8.4) | 12 and 13 (PHP 8.3+) | 11.32+, 12 and 13 | 10 to 13 | 11.28+, 12 and 13 | Any |
| Single database | Yes (`BelongsToTenant`) | Yes, plus PostgreSQL RLS | Yes, your own scoping | Yes, model scoping | No dedicated helpers we found | Yes (global scope) | Yes |
| Database per tenant | Yes, creates and migrates them | Yes | Switches connection, you create the database | Not in 1.x (planned addon) | Yes | No | Yes, you write it |
| Identification | Domain, subdomain, path, header or query | Same, plus early identification | Domain; custom finder for the rest | Subdomain, path, header, cookie, session | HTTP, console, queue, environment drivers | URL path or `tenantDomain()` | Whatever you write |
| Cache, files, queues | Built-in bootstrappers | More bootstrappers (mail, logs, URLs) | Queue and cache built in; files are your task | Cache store, disk, jobs, cookies | "Affects" for cache, files, config and more | Panel only | Your code |
| Status | Stable, actively maintained | Active development, untagged | Stable, frequent releases | Maintained, small community | Low activity | Very active | Yours to maintain |
| Best for | Self-service SaaS with a DB per tenant | Trying v4 on a side project | Explicit, minimal setups | Path or header tenancy, several tenant models | Existing tenancy/tenancy apps | Admin panels with team switching | Learning, or very simple needs |

Now the detail behind each column.

## stancl/tenancy v3

**What it is.** Also called Tenancy for Laravel, by Samuel Štancl. The repository now lives at `archtechx/tenancy` on GitHub, but the Composer name is still `stancl/tenancy`. Version 3 is the stable line, documented at [tenancyforlaravel.com/docs/v3](https://tenancyforlaravel.com/docs/v3/).

**Models.** Single database (with a `BelongsToTenant` trait that adds the `tenant_id` scope) and multi-database. In multi-database mode it creates tenant databases for MySQL, PostgreSQL (databases or schemas) and SQLite, and runs migrations through a job pipeline when a tenant is created.

**Identification.** A middleware per strategy: `InitializeTenancyByDomain`, `InitializeTenancyBySubdomain`, `InitializeTenancyByDomainOrSubdomain`, `InitializeTenancyByPath` and `InitializeTenancyByRequestData` (header or query string). Tenants can have several domains through a `domains` table.

**Maintenance.** v3.10.1 was tagged on 5 August 2026 and supports Laravel 10, 11, 12 and 13. It's also by far the most installed option: Packagist showed over 12 million total installs when we checked.

**Best for.** A SaaS where customers sign up on their own and each one should get a ready, migrated database without you writing provisioning code. Its "automatic" approach also suits adding tenancy to an existing app, since database, cache, filesystem and queue switching happen without touching every model. The [stancl/tenancy tutorial](/blog/stancl-tenancy-tutorial.html) shows the setup.

**Watch out for.** It does a lot behind the scenes. Learn what each bootstrapper changes, or `storage_path()` pointing somewhere new inside a tenant will surprise you.

## stancl/tenancy v4

This is where most posts get it wrong, so here's exactly what we found on 11 November 2026.

- The [v4 docs site](https://v4.tenancyforlaravel.com/introduction/) says version 4 "was released in 2026", and the GitHub README now points to it.
- But there is **no v4 tag**. The newest tag on GitHub and Packagist is still v3.10.1. Packagist only offers v4 as `dev-master` and `4.x-dev`.
- The v4 getting-started page installs it with `composer require stancl/tenancy:dev-master` and lists PHP 8.4 and Laravel 12 as requirements. The `composer.json` on `master` allows Laravel 12 or 13, and it depends on a release-candidate version of `stancl/jobpipeline`.
- Development is very active: commits landed on `master` as recently as this week.

**Licensing.** The `composer.json` on `master` says MIT, the same as v3. The project's sponsoring page says the core package will always be free and open source. Some extras are paid or sponsor-only: a multi-tenant SaaS boilerplate, an e-book, and a sponsor-only docs section with ready-made recipes (Filament in the tenant app and a Forge integration, for example).

**What's new.** Early identification (tenancy initialized from the kernel middleware stack, with central, tenant or universal routes by default), PostgreSQL row-level security as a new take on single-database tenancy, pending tenants, and extra bootstrappers for things like mail, log channels and URL generation. The upgrade guide is honest that config, service provider and many namespaces change.

**Best for.** Trying it on a new side project, or planning your upgrade path. For a client app or anything paying customers depend on, we'd stay on v3 until v4 has a tagged stable release. A `dev-master` constraint means any `composer update` can pull in breaking changes.

## spatie/laravel-multitenancy

**What it is.** Spatie's deliberately minimal package. Its docs describe the goal as providing only the bare essentials, and they mean it. It's documented at [spatie.be](https://spatie.be/docs/laravel-multitenancy/v4/introduction).

**Models.** Single database and multi-database. In multi-database mode a `SwitchTenantDatabaseTask` points a `tenant` connection at the current tenant's database, and your models pick a connection with `UsesTenantConnection` or `UsesLandlordConnection`. The package doesn't create tenant databases; that's your code.

**Identification.** One built-in `DomainTenantFinder`. For subdomains, paths or headers you write a small finder class, which is about a dozen lines.

**Maintenance.** Version 4.3.1 shipped on 4 November 2026, with several releases in October alone. It needs PHP 8.3+ and Laravel 12 or 13.

**Best for.** Teams who want to see every moving part, single-database apps that only need a "current tenant" and tenant-aware jobs, or a small number of tenants you provision yourself.

We've already compared it with stancl/tenancy line by line (bootstrappers vs tasks, commands, queues, testing), so we won't repeat that here: see [stancl/tenancy vs Spatie multitenancy](/blog/stancl-tenancy-vs-spatie-multitenancy.html).

## Sprout

**What it is.** A newer package by Ollie Read, published as `sprout/sprout` (repository `sprout-laravel/sprout`, MIT). Its pitch is flexibility: it avoids the "reconfigure everything automatically" approach and gives you explicit tenant-aware services instead.

**Models.** In the stable 1.x line, Sprout scopes your models automatically during creation and querying, which makes it a single-database package today. Its README says tenant-specific databases will come through a first-party addon called Seedling, which is still in development, and the same goes for full-domain identification through an addon called Terra. Neither addon had a public release when we checked.

**Identification.** Subdomain, path, header, cookie or session. It can identify the tenant as soon as a route is matched or during the middleware stack. It also supports several "tenancies" at once, meaning more than one model can act as a tenant.

**Tenant-aware services.** A tenant cache store, a tenant storage disk, tenant-aware jobs, cookies and sessions scoped to the tenant when you identify by URL, and tenant-scoped password resets.

**Maintenance.** v1.2.0 was released on 14 May 2026 and supports Laravel 11.32+, 12 and 13. The `main` branch is working towards a 2.0 release with a new repository structure. The community is small: a few thousand total installs on Packagist, compared with millions for stancl/tenancy.

**Best for.** Developers who like its explicit style and identify tenants by path, subdomain or header in one shared database. If you need a database per tenant or custom domains today, it's not there yet.

## tenancy/tenancy (formerly hyn/multi-tenant)

There are two packages from the same team here, and it's easy to mix them up.

**hyn/multi-tenant** was one of the first popular Laravel tenancy packages. Its last release was 5.9.1 on 18 August 2023, it only supports Laravel 9 and 10, and the default branch of its repository (now `tenancy/multi-tenant`) hasn't had a commit since then. Don't start a new project on it.

**tenancy/tenancy** is its successor: a modular "ecosystem" with a framework package plus separate drivers. You configure identification drivers (HTTP, console, queue and environment), database drivers (MySQL and SQLite live in the repository), and "affects" that change parts of Laravel per tenant, such as cache, config, database connections, filesystems, logs, mail, routes, URLs and views. Docs are at tenancy.dev.

**Maintenance.** v2.5.0 arrived on 9 May 2026 and added Laravel 13 support. The release before that was in May 2025, so it's maintained, but slowly. Packagist showed under 3,000 monthly installs when we checked.

**Best for.** Apps that already run on it, or teams who specifically want its driver-based design. For a new SaaS we'd pick something with a faster release pace and a bigger community to ask when things break.

## Filament's built-in panel tenancy

**What it is.** Not a separate package. Filament panels have a tenancy feature you switch on with `->tenant(Team::class)`. The current release is v5.11.2, from 7 November 2026.

**Model.** A shared database. Users belong to **many** tenants through your `HasTenants` implementation and can switch between them. Filament scopes the records in tenant-aware resources with a global scope. There's no database switching.

**Identification.** The tenant ID or slug in the URL after the panel path, or a subdomain or domain with `tenantDomain()`.

**Watch out for.** It only covers the panel. Jobs, commands and any routes outside Filament need their own scoping, and Filament's own docs say plainly that it gives no guarantees about your app's security. Calling `withoutGlobalScopes()` also removes tenant isolation.

**Best for.** An internal or customer-facing admin panel where people switch between teams. If you also have an Inertia or Livewire customer app next to it, read [Filament vs Inertia](/blog/filament-vs-inertia.html), where we compare Filament tenancy with database-per-tenant in detail.

## Building it yourself

You don't need a package to do multi-tenancy. A middleware that finds the tenant, a service that switches the database connection, and a bit of care around queues and cache will get a small app a long way. We wrote a full walkthrough in [Laravel multi-tenancy without a package](/blog/laravel-multi-tenancy-without-package.html).

It's a great way to learn what packages do for you. The downside: every edge case (jobs, scheduled tasks, cache keys, file paths, tests) is yours to find and fix. Our view: build it yourself to learn, or when your needs are genuinely tiny. Use a package once paying customers are involved.

## Packages we left out

Search results also surface smaller or older packages. `miracuthbert/laravel-multi-tenancy` last released in January 2024, `ollieread/laravel-multitenancy` (an earlier package by Sprout's author) in April 2017, and `mpociot/laravel-multi-tenant` hasn't been pushed to since 2015. Fine to read for ideas, not to build on.

## Pick in 30 seconds

- **You want a database per tenant, created automatically on sign-up:** stancl/tenancy v3.
- **You want the smallest possible core and are happy to write the glue:** spatie/laravel-multitenancy.
- **You're curious about stancl v4's new features:** try it on a side project, but ship client work on v3 until v4 is tagged.
- **You identify tenants by path or header in one shared database and like explicit APIs:** look at Sprout.
- **You only need team switching inside an admin panel:** Filament's panel tenancy.
- **Every record just belongs to a user or a team:** you may not need a package at all. A global scope or `auth()->user()->projects()` is enough. See [Laravel teams vs multi-tenancy](/blog/laravel-teams-vs-multi-tenancy.html).
- **Your project still says `hyn/multi-tenant` in `composer.json`:** plan a move.

## Mistakes we see when choosing a package

**Installing from `dev-master` in production.** It's tempting when the docs show the shiny new version. An untagged branch can change under you on the next `composer update`.

**Trusting old lists.** Plenty of "best Laravel multitenancy package" posts still recommend hyn/multi-tenant. Check the latest release date on Packagist first.

**Forgetting everything outside the request.** Whichever package you pick, check what it does for queued jobs, scheduled commands and the cache. That's where tenant data leaks in real apps.

For how one of these packages fits into a full app, see our [Laravel multi-tenancy tutorial](/guides/laravel-multi-tenancy-tutorial.html).

## Frequently asked questions

### What is the best Laravel multi-tenancy package?

For a SaaS with self-service sign-up and a database per tenant, stancl/tenancy v3 is the most complete and most widely used option in 2026. spatie/laravel-multitenancy is the best pick if you want a minimal core and don't mind writing database creation yourself. The right answer depends on your tenancy model more than on the package.

### Is stancl/tenancy v4 stable?

Its docs say v4 was released in 2026, but as of 11 November 2026 there's no tagged v4 release on GitHub or Packagist. You install it from `dev-master`, which can change at any time. We'd use v3.10.1 for production apps until v4 is tagged.

### Is hyn/multi-tenant still maintained?

No. Its last release was 5.9.1 in August 2023, and it only supports Laravel 9 and 10. The same team's successor is tenancy/tenancy, which released v2.5.0 with Laravel 13 support in May 2026.

### Do I need a package for Laravel multitenancy?

Not always. If records belong to users or small teams, scoping by the logged-in user or a `team_id` column is enough. Once you need separate databases, per-tenant domains, or tenant-aware cache, files and queues, a package saves you a lot of careful work.

## Multi-tenancy packages and SaaS Laravel

We chose stancl/tenancy v3 for the [multi-tenant Laravel starter kit](/) because a new tenant needs a working database with no extra code. The kits use a database per tenant, identify tenants by subdomain of `APP_DOMAIN` (several per tenant, one primary), and run separate central and tenant auth guards. Creating a tenant creates and migrates its database and seeds roles, permissions and menus. The [multi-tenancy docs](/docs/core/multi-tenancy.html) show how it's wired.

<BlogPostCta title="The package choice, already made" text="SaaS Laravel runs stancl/tenancy v3 with a database per tenant, subdomains and tenant-aware queues on Laravel 13, so you can start on your product instead of the plumbing." />
