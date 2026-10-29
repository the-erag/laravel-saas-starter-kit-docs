---
title: "stancl/tenancy vs Spatie Multitenancy in 2026"
description: "stancl tenancy vs spatie multitenancy, compared neutrally: identification, databases, bootstrappers vs tasks, tenant creation, queues, commands and testing."
pageClass: blog-page
date: 2026-10-24
author: erag
category: multi-tenancy
tags: [Multi-tenancy, stancl/tenancy, Spatie]
---

# stancl/tenancy vs Spatie Laravel Multitenancy: An Honest Comparison

<BlogPostMeta />

If you're choosing between stancl tenancy vs spatie multitenancy, you're choosing between two different ideas of what a package should do. stancl/tenancy tries to make your existing Laravel app tenant-aware automatically: it switches the database, cache, filesystem and queue for you, and it can create and migrate tenant databases. spatie/laravel-multitenancy gives you the bare minimum (find the current tenant, run a few tasks when it changes) and expects you to write the rest.

Both are mature, maintained and free. The most detailed comparison you'll find today is on the stancl/tenancy docs site, written by that package's author. That's useful, but it isn't neutral. We use stancl/tenancy in our own product, so we're not neutral either. What we've tried to do here is describe both packages from their own documentation and source, and say plainly where each one is the better fit.

Versions as of October 2026: stancl/tenancy **v3.10.1** (supports Laravel 10 to 13) and spatie/laravel-multitenancy **4.3.0** (PHP 8.3+, Laravel 12 or 13). We're testing on Laravel 13 and PHP 8.4.

## The two packages at a glance

**stancl/tenancy**, also called Tenancy for Laravel, lives at [tenancyforlaravel.com](https://tenancyforlaravel.com/docs/v3/). The GitHub repository moved to the `archtechx` organization (`archtechx/tenancy`), but the Composer package is still `stancl/tenancy`. Version 3 is the stable line. Version 4 has its own documentation site and a long changelog (PostgreSQL row-level security, Fortify support, a routing overhaul, pending tenants, parallel migrations), but as of this writing it has no tagged release. Its install guide uses `composer require stancl/tenancy:dev-master` and asks for PHP 8.4 and Laravel 12. We'd treat v4 as something to watch, not something to ship a customer app on, until it's tagged.

**spatie/laravel-multitenancy** is documented at [spatie.be](https://spatie.be/docs/laravel-multitenancy/v4/introduction). Its introduction sums up the approach: the package should "only provide the bare essentials to enable multitenancy." It's on major version 4, with regular releases through 2026.

## Philosophy: automatic vs explicit

This is the difference that drives every other row in the comparison table.

stancl/tenancy has an **automatic mode**. Once a tenant is identified, its bootstrappers change the default database connection, tag cache calls, suffix filesystem paths and attach the tenant to queued jobs. Code like `Order::where('status', 'shipped')->get()` or `Cache::get('stats')` just works per tenant. Most third-party packages work too, because they use the default connection. There's also a manual mode if you'd rather wire things yourself.

spatie/laravel-multitenancy is **explicit**. You get a `Tenant` model, a way to make a tenant "current", and a list of tasks that run when that happens. The docs say it ships only a few tasks on purpose, mostly as examples to copy. Models choose their connection with the `UsesTenantConnection` or `UsesLandlordConnection` trait. If you want something else to change per tenant, you write a task.

Neither is wrong. Automatic is faster to start with and hides more. Explicit is less code to understand and puts you in charge.

## Tenant identification

| Method | stancl/tenancy v3 | spatie/laravel-multitenancy v4 |
| --- | --- | --- |
| Full domain | `InitializeTenancyByDomain` | `DomainTenantFinder` (matches the `domain` column) |
| Subdomain | `InitializeTenancyBySubdomain` | Custom tenant finder |
| Domain or subdomain | `InitializeTenancyByDomainOrSubdomain` | Custom tenant finder |
| Path (`/acme/...`) | `InitializeTenancyByPath` | Custom tenant finder |
| Header or query string | `InitializeTenancyByRequestData` (`X-Tenant` header or `tenant` query parameter) | Custom tenant finder |
| Several domains per tenant | Yes, separate `domains` table | Not by default (one `domain` column), possible with a custom finder |

stancl gives you a middleware per strategy. Spatie gives you one finder and a base class:

```php
use Illuminate\Http\Request;
use Spatie\Multitenancy\Contracts\IsTenant;
use Spatie\Multitenancy\TenantFinder\TenantFinder;

class SubdomainTenantFinder extends TenantFinder
{
    public function findForRequest(Request $request): ?IsTenant
    {
        $subdomain = explode('.', $request->getHost())[0];

        return app(IsTenant::class)::whereSubdomain($subdomain)->first();
    }
}
```

That's a dozen lines, so "custom finder" isn't a big cost. But if you know you'll need custom domains plus a fallback subdomain per tenant, stancl's `domains` table and middleware already model that. See our guide to [custom domains per tenant](/blog/laravel-tenant-custom-domains.html) for what's involved beyond identification.

## Single database vs multi-database

Both packages support both. How much they do for you differs.

**Single database.** stancl ships a `BelongsToTenant` trait that adds a global scope and fills `tenant_id` on create. Spatie's single-database guide is short: publish the `tenants` migration, then add tasks for cache and other things you want separated. Scoping your queries by tenant is up to you, typically with your own global scope.

**Multi-database.** Both switch a connection when a tenant becomes current. Spatie's `SwitchTenantDatabaseTask` sets the `tenant` connection's database to the tenant's `database` attribute. You configure two connections, `landlord` and `tenant`, and your models pick one. stancl's `DatabaseTenancyBootstrapper` makes the tenant connection the *default*, so models without any trait use the tenant database, and it ships database managers for MySQL, PostgreSQL (separate databases or schemas) and SQLite.

If you're still deciding between one database and many, read [Single vs multi-database tenancy](/blog/single-vs-multi-database-tenancy-laravel.html) first. That decision matters more than the package.

## Bootstrappers vs tasks

This is where "automatic" turns into concrete features.

| Concern | stancl/tenancy v3 | spatie/laravel-multitenancy v4 |
| --- | --- | --- |
| Database | `DatabaseTenancyBootstrapper` | `SwitchTenantDatabaseTask` |
| Cache | `CacheTenancyBootstrapper` (tags each call; needs a store with tags) | `PrefixCacheTask` (changes `cache.prefix`; memory stores like Redis or APC) |
| Filesystem | `FilesystemTenancyBootstrapper` (suffixes disks and `storage_path()`) | Write your own task |
| Queue | `QueueTenancyBootstrapper` | Built in, tenant-aware by default |
| Redis | `RedisTenancyBootstrapper` (needs phpredis) | Write your own task |
| Route cache | Not a bootstrapper | `SwitchRouteCacheTask` |

A Spatie task is a small class with two methods:

```php
use Spatie\Multitenancy\Contracts\IsTenant;
use Spatie\Multitenancy\Tasks\SwitchTenantTask;

class SwitchTenantDiskTask implements SwitchTenantTask
{
    public function makeCurrent(IsTenant $tenant): void
    {
        config(['filesystems.disks.tenant.root' => storage_path("app/tenants/{$tenant->getKey()}")]);
    }

    public function forgetCurrent(): void
    {
        config(['filesystems.disks.tenant.root' => null]);
    }
}
```

That's readable and easy to test. The catch is that you'll write several of these, and each one is something you own. The stancl bootstrappers have edge cases too (the cache one only works on stores that support tags, for example), and we wrote up the ones we've hit in [tenant cache and filesystem isolation](/blog/laravel-tenant-cache-filesystem.html).

## Creating tenants: pipeline vs your own code

With stancl, creating a tenant fires a `TenantCreated` event, and the default `TenancyServiceProvider` maps it to a job pipeline:

```php
Events\TenantCreated::class => [
    JobPipeline::make([
        Jobs\CreateDatabase::class,
        Jobs\MigrateDatabase::class,
        // Jobs\SeedDatabase::class,
    ])->send(fn (Events\TenantCreated $event) => $event->tenant)
      ->shouldBeQueued(false),
],
```

So `Tenant::create()` creates the database and runs the tenant migrations. Flip `shouldBeQueued(true)` and it happens on a worker. `TenantDeleted` runs `DeleteDatabase`.

Spatie's docs are direct about it: the package doesn't create tenant databases. You do it in your own code, for example in a `created` event on your tenant model, then run migrations with its Artisan helper:

```bash
php artisan tenants:artisan "migrate --path=database/migrations/tenant --database=tenant"
```

For a SaaS where customers sign up and get a workspace on their own, this is the biggest practical difference. With stancl it's configuration. With Spatie it's a service class, a `CREATE DATABASE` statement, error handling and a migration call you write and test yourself. Not hard, but not free.

## Queues, commands and running code per tenant

Both packages make queued jobs tenant-aware, and both get it right.

- **stancl**: `QueueTenancyBootstrapper` stores the tenant key in the payload and initializes tenancy before the job runs. Our post on [multi-tenant queues](/blog/laravel-multi-tenant-queues.html) goes through it in detail.
- **Spatie**: `queues_are_tenant_aware_by_default` is `true`. You can opt individual jobs in or out with the `TenantAware` and `NotTenantAware` marker interfaces. If the tenant no longer exists when the job runs, the job fails with a clear exception.

For running code in a tenant from elsewhere:

```php
// stancl
$tenant->run(fn () => Report::generate());
tenancy()->runForMultiple(null, fn ($tenant) => PruneExports::dispatch());

// Spatie
$tenant->execute(fn () => Report::generate());
Tenant::all()->eachCurrent(fn ($tenant) => PruneExports::dispatch());
```

Artisan commands per tenant:

| Task | stancl/tenancy v3 | spatie/laravel-multitenancy v4 |
| --- | --- | --- |
| Migrate all tenants | `tenants:migrate` | `tenants:artisan "migrate --database=tenant"` |
| Rollback / fresh | `tenants:rollback`, `tenants:migrate-fresh` | Through `tenants:artisan` |
| Seed | `tenants:seed` | `tenants:artisan "migrate --database=tenant --seed"` |
| Any command | `tenants:run <command>` | `tenants:artisan "<command>"` |
| Your own command per tenant | `--tenants` option on the above | `TenantAware` trait with `{--tenant=*}` |
| List tenants | `tenants:list` | No dedicated command |

## Testing, docs and learning curve

**Testing.** With stancl you create a tenant in your test (which runs the pipeline, so tests are slower unless you set it up carefully) and call `tenancy()->initialize($tenant)`. The v3 docs have a testing page. With Spatie you call `$tenant->makeCurrent()` in your setup, and since you wrote the database creation yourself, you control how heavy it is. Either way, settle on one pattern early and use it in every test file.

**Docs.** Spatie's docs are short, which matches the package: you can read all of them in an afternoon. stancl's v3 docs are much longer, with pages on integrations (Horizon, Passport, Nova, Livewire, Sanctum, Telescope and others), plus extra content for sponsors. More to read, but more of your future questions are already answered.

**Learning curve.** Spatie is easier to understand completely, because there's less of it. stancl is easier to get *working*, but you need to learn what the bootstrappers change, or you'll be surprised when, say, `storage_path()` returns a different folder inside a tenant.

## The full comparison

| | stancl/tenancy v3 | spatie/laravel-multitenancy v4 |
| --- | --- | --- |
| Approach | Automatic (manual mode available) | Minimal and explicit |
| Current version (Oct 2026) | v3.10.1; v4 untagged (`dev-master`) | 4.3.0 |
| Laravel support | 10 to 13 | 12 and 13 |
| Identification | Domain, subdomain, path, request data | Domain; anything else via custom finder |
| Multiple domains per tenant | Yes | Custom |
| Single-database helpers | `BelongsToTenant` trait | Your own scoping |
| Creates tenant databases | Yes (MySQL, PostgreSQL, SQLite) | No |
| Migrations and seeding on create | Job pipeline on `TenantCreated` | Your code |
| Cache isolation | Tags | Prefix |
| Filesystem isolation | Built in | Your task |
| Tenant-aware queues | Yes | Yes, on by default |
| Per-tenant Artisan | Dedicated commands plus `tenants:run` | `tenants:artisan` plus `TenantAware` trait |
| Extras | Impersonation, maintenance mode, resource syncing, universal routes | Session check middleware, route cache task |
| Code you write | Less | More |
| Hidden behaviour | More | Less |

## Choose stancl/tenancy when

- You want a database per tenant and tenants are created by sign-ups, so database creation and migrations need to happen without you.
- You're adding tenancy to an app that already exists, and you'd rather not touch every model and cache call.
- Tenants need several domains, or a mix of subdomains and custom domains.
- You'll use other packages (Horizon, Sanctum, Spatie's own packages) and want documented integration notes.

## Choose spatie/laravel-multitenancy when

- You prefer to see every moving part, and "tasks" you wrote yourself feel safer than bootstrappers you didn't.
- You have a small, fixed number of tenants that you provision by hand or with your own scripts.
- You use a single database and only need the "current tenant" concept, tenant-aware jobs and a cache prefix.
- Your team already uses a lot of Spatie packages and likes their style.

## Build your own when

If "tenant" really means "team" and every row has a `team_id`, you may not need a package at all. A global scope, a `current_team_id` on the user and a middleware go a long way. The stancl docs make the same point: if you only want to scope records to the current user, `auth()->user()->tasks()` is enough. Reach for a package when you need separate databases, per-tenant domains, or isolation in the cache, files and queues.

## Mistakes we see when picking a package

**Choosing by GitHub stars.** Both are widely used. Choose by whether you want automatic or explicit behaviour, and by who creates tenant databases.

**Installing stancl v4 from `dev-master` for production.** The v4 features look good. An untagged branch can still change under you, so pin v3 for client work until v4 is released.

**Forgetting the landlord connection in Spatie.** Models without `UsesLandlordConnection` or `UsesTenantConnection` use your default connection. If the default isn't what you think, a central model can end up reading a tenant database.

**Using a cache store the package can't scope.** stancl's cache bootstrapper needs tags (Redis, Memcached, array), and Spatie's `PrefixCacheTask` is meant for memory stores like Redis and APC. Check before you deploy.

**Expecting either package to fix a missing `tenant_id`.** In single-database mode, every query that skips the scope is a data leak. That risk is the same with both packages.

## Frequently asked questions

### Is stancl/tenancy better than spatie/laravel-multitenancy?

Neither is better in general. stancl/tenancy does more for you, especially creating and migrating tenant databases. spatie/laravel-multitenancy does less on purpose and is easier to read end to end. Pick the one that matches how much you want automated.

### Does stancl/tenancy support Laravel 13?

Yes. Version 3.10.1 lists Laravel 10, 11, 12 and 13 as supported. Version 4 isn't tagged yet as of October 2026, and its docs install it from `dev-master`.

### Can spatie/laravel-multitenancy create tenant databases?

No. Its documentation says the package doesn't handle creating databases. You create them in your own code, for example when a tenant model is created, and then migrate them with `php artisan tenants:artisan "migrate --database=tenant"`.

### What is the best Laravel multi-tenancy package for a SaaS?

For a SaaS with self-service sign-up and a database per tenant, we'd pick stancl/tenancy, because the tenant creation pipeline saves real work. For a single-database app or a handful of hand-provisioned tenants, spatie/laravel-multitenancy is a lighter, perfectly good choice.

## Multi-tenancy in the SaaS Laravel kits

The [SaaS Laravel starter kits](/) use stancl/tenancy `^3.10` (v3.10.1 at the time of writing) with a database per tenant, each tenant on its own subdomain of `APP_DOMAIN`. Requests are identified by domain with `InitializeTenancyByDomain`, and the subdomains live in stancl's `domains` table, so a tenant can have more than one. The kits don't map fully custom domains such as `app.customer.com`; every tenant domain is a subdomain. The database, cache, filesystem and queue bootstrappers are enabled, and creating a tenant runs `CreateDatabase`, `MigrateDatabase`, `SeedDatabase` and a job that creates the tenant admin.

That's why we chose stancl for the kits: a buyer adds a tenant from the admin screen and gets a working, migrated, seeded workspace with no extra code. The details are in the [multi-tenancy docs](/docs/core/multi-tenancy.html), and the [stancl/tenancy tutorial](/blog/stancl-tenancy-tutorial.html) shows the same setup from scratch.

<BlogPostCta title="Database-per-tenant, already wired" text="SaaS Laravel runs stancl/tenancy with a database per workspace, tenant creation and tenant-aware queues, with Vue, React or Svelte." />
