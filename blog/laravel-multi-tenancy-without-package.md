---
title: "Laravel Multi-Tenancy Without a Package: Build It by Hand"
description: "Laravel multi tenancy without a package: subdomain middleware, runtime DB switching, tenant migrations, tenant-aware queues, cache and files, and when to stop."
pageClass: blog-page
date: 2026-11-04
author: erag
category: multi-tenancy
tags: [Multi-tenancy, Architecture, Database]
---

# Laravel Multi-Tenancy Without a Package: A Minimal Database-per-Tenant Build

<BlogPostMeta />

Tenancy packages do a lot of things automatically, and that's exactly why some developers avoid them. You want to know which connection a query hits, when the cache prefix changes and why a queued job ended up in the wrong database. Building Laravel multi tenancy without a package is a good way to find out, and for a small app it can be all you need.

In this post we build a minimal database-per-tenant setup on Laravel 13 by hand: resolve the tenant from the subdomain, switch the `tenant` connection at runtime, create and migrate tenant databases, keep queued jobs, cache and files tenant-aware, and a single-database variant with a global scope. Then we list, honestly, everything you'd still have to build, and when it's time to switch to stancl/tenancy or spatie/laravel-multitenancy.

## What we're building

| Piece | File |
| --- | --- |
| Two connections: `central` and `tenant` | `config/database.php` |
| A `Tenant` model in the central database | `app/Models/Tenant.php` |
| A service that switches database, cache, files and URLs | `app/Tenancy/TenantManager.php` |
| Middleware that finds the tenant from the subdomain | `app/Http/Middleware/IdentifyTenant.php` |
| Database creation and migrations | `app/Tenancy/TenantProvisioner.php`, `tenants:migrate` |
| Tenant-aware queued jobs | two callbacks in `AppServiceProvider` |

One design choice up front: in our version, the **default connection stays `central`**, and tenant models opt in to the `tenant` connection. stancl/tenancy does the opposite and makes the tenant connection the default. Both work. Ours is more explicit, and the trade-off shows up in the pitfalls later.

## Step 1: A central and a tenant connection

Copy your MySQL connection twice in `config/database.php`. The tenant one has no database name yet:

```php
'connections' => [
    'central' => [
        'driver' => 'mysql',
        'host' => env('DB_HOST', '127.0.0.1'),
        'database' => env('DB_DATABASE', 'app_central'),
        'username' => env('DB_USERNAME'),
        'password' => env('DB_PASSWORD'),
        // charset, collation, options...
    ],

    'tenant' => [
        'driver' => 'mysql',
        'host' => env('DB_HOST', '127.0.0.1'),
        'database' => null, // set at runtime
        'username' => env('DB_USERNAME'),
        'password' => env('DB_PASSWORD'),
    ],
],
```

Set `DB_CONNECTION=central`, and add `'domain' => env('APP_DOMAIN')` to `config/app.php`. The central `tenants` table needs only `id`, `name`, a unique `subdomain` and a `database` column. The `Tenant` model sets `protected $connection = 'central';`, and every tenant-owned model (users, projects, invoices) sets `protected $connection = 'tenant';`. On Laravel 13 you can write `#[Connection('tenant')]` on the class instead.

## Step 2: A TenantManager that switches everything

All switching lives in one service. The middleware, the queue and your Artisan commands call it, so the rules exist in one place:

```php
<?php

namespace App\Tenancy;

use App\Models\Tenant;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

final class TenantManager
{
    private ?Tenant $current = null;

    /** @var array<string, mixed> */
    private array $original;

    public function __construct()
    {
        $this->original = [
            'cache.prefix' => config('cache.prefix'),
            'filesystems.disks.local.root' => config('filesystems.disks.local.root'),
        ];
    }

    public function current(): ?Tenant
    {
        return $this->current;
    }

    public function switchTo(Tenant $tenant): void
    {
        if ($this->current?->is($tenant)) {
            return;
        }

        config([
            'database.connections.tenant.database' => $tenant->database,
            'cache.prefix' => $this->original['cache.prefix'].'tenant'.$tenant->id.'_',
            'filesystems.disks.local.root' => storage_path('app/tenants/'.$tenant->id),
        ]);

        DB::purge('tenant');      // drop the old PDO connection
        DB::reconnect('tenant');  // connect now, so a missing database fails here
        Cache::forgetDriver();    // the next cache call rebuilds the store with the new prefix
        Storage::forgetDisk('local');
        URL::defaults(['tenant' => $tenant->subdomain]);

        $this->current = $tenant;
    }

    public function reset(): void
    {
        config($this->original + ['database.connections.tenant.database' => null]);

        DB::purge('tenant');
        Cache::forgetDriver();
        Storage::forgetDisk('local');

        $this->current = null;
    }

    public function run(Tenant $tenant, callable $callback): mixed
    {
        $previous = $this->current;
        $this->switchTo($tenant);

        try {
            return $callback();
        } finally {
            $previous ? $this->switchTo($previous) : $this->reset();
        }
    }
}
```

Register it as a singleton in `AppServiceProvider::register()` with `$this->app->singleton(TenantManager::class)`, so it captures the original config once, before any tenant is active.

Why `DB::purge()` and not just `config()`? Laravel builds a connection once and caches it. Changing the config alone does nothing to an open connection. `purge()` disconnects and forgets it, and the next query (or `reconnect()`) builds a fresh one from the new config. The same is true for cache stores and disks, which is why `forgetDriver()` and `forgetDisk()` are there.

## Step 3: Resolve the tenant from the subdomain

Tenant routes get their own file and a domain pattern, so they never match on the central domain. In `bootstrap/app.php`:

```php
->withRouting(
    web: __DIR__.'/../routes/web.php', // wrap these in Route::domain(config('app.domain'))
    then: function (): void {
        Route::domain('{tenant}.'.config('app.domain'))
            ->middleware(['web', IdentifyTenant::class])
            ->group(base_path('routes/tenant.php'));
    },
)
->withMiddleware(function (Middleware $middleware): void {
    // Find the tenant before auth loads the user from the tenant database.
    $middleware->prependToPriorityList(
        before: \Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests::class,
        prepend: IdentifyTenant::class,
    );
})
```

The priority line matters. Laravel sorts route middleware by a priority list, and without it the `auth` middleware or route model binding could query the tenant connection before it has a database. The middleware itself stays small:

```php
<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class IdentifyTenant
{
    public function __construct(private TenantManager $tenants) {}

    public function handle(Request $request, Closure $next): Response
    {
        $tenant = Tenant::query()
            ->where('subdomain', $request->route('tenant'))
            ->first();

        abort_if($tenant === null, 404);

        // Controllers shouldn't receive {tenant} as their first argument.
        $request->route()->forgetParameter('tenant');

        $this->tenants->switchTo($tenant);

        return $next($request);
    }

    public function terminate(): void
    {
        $this->tenants->reset();
    }
}
```

`URL::defaults()` in the manager means `route('projects.index')` fills in the subdomain for you. The `terminate()` reset is for long-running servers like Octane, where the next request reuses the same process. Wildcard DNS, local subdomains and cookies are the same as with any package, and we cover them in [Laravel multi-tenancy with subdomains](/blog/laravel-multi-tenancy-subdomains.html).

## Step 4: Create and migrate tenant databases

Keep tenant migrations in `database/migrations/tenant`. Laravel's `migrate` command only reads the top level of `database/migrations`, so the central database never runs them. Creating a tenant is a service, not a controller method:

```php
<?php

namespace App\Tenancy;

use App\Models\Tenant;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Throwable;

final class TenantProvisioner
{
    public function __construct(private TenantManager $tenants) {}

    public function create(string $name, string $subdomain): Tenant
    {
        $tenant = Tenant::create(['name' => $name, 'subdomain' => $subdomain]);
        $tenant->update(['database' => 'tenant_'.$tenant->id]);

        Schema::connection('central')->createDatabase($tenant->database);

        try {
            $this->tenants->run($tenant, fn () => Artisan::call('migrate', [
                '--database' => 'tenant',
                '--path' => 'database/migrations/tenant',
                '--force' => true,
            ]));
        } catch (Throwable $e) {
            Schema::connection('central')->dropDatabaseIfExists($tenant->database);
            $tenant->delete();

            throw $e;
        }

        return $tenant;
    }
}
```

The database name comes from the ID, never from user input. Your database user needs the `CREATE` privilege, which you may not want for the user the web app runs as. That's a good reason to run provisioning in a queued job with its own credentials once you grow.

For deploys, a `tenants:migrate` command loops over every tenant with the same `migrate` call:

```php
final class MigrateTenants extends Command
{
    protected $signature = 'tenants:migrate {--tenant=* : Only these tenant IDs}';

    protected $description = 'Run tenant migrations in every tenant database';

    public function handle(TenantManager $tenants): int
    {
        $query = Tenant::query()->when($this->option('tenant'), fn ($q, $ids) => $q->whereKey($ids));

        foreach ($query->lazyById() as $tenant) {
            $this->info("Migrating tenant {$tenant->id}");

            $tenants->run($tenant, fn () => $this->call('migrate', [
                '--database' => 'tenant',
                '--path' => 'database/migrations/tenant',
                '--force' => true,
            ]));
        }

        return self::SUCCESS;
    }
}
```

Each tenant database gets its own `migrations` table, so tenants can be at different versions for a while. Rollout order, seeders and failures are covered in [tenant migrations and seeders](/blog/laravel-tenant-migrations-seeders.html).

## Step 5: Tenant-aware queued jobs

A queue worker has no request and no subdomain. Without help, a job dispatched by Acme runs with whatever tenant the worker last used, or none. Laravel 13's [Context](https://laravel.com/docs/13.x/context) solves this neatly: data in the context is stored with every queued job and restored when the job runs. Two callbacks in `AppServiceProvider::boot()`:

```php
use App\Models\Tenant;
use App\Tenancy\TenantManager;
use Illuminate\Log\Context\Repository;
use Illuminate\Support\Facades\Context;

Context::dehydrating(function (Repository $context): void {
    if ($tenant = app(TenantManager::class)->current()) {
        $context->addHidden('tenant_id', $tenant->id);
    }
});

Context::hydrated(function (Repository $context): void {
    $tenants = app(TenantManager::class);

    $context->hasHidden('tenant_id')
        ? $tenants->switchTo(Tenant::findOrFail($context->getHidden('tenant_id')))
        : $tenants->reset();
});
```

`dehydrating` runs when a job is dispatched, `hydrated` runs when a worker picks one up, so every job starts in the right tenant, and jobs without one start in the central context. Keep the `jobs` and `failed_jobs` tables on the central connection (they are, since `central` is the default). If the tenant was deleted, `findOrFail()` throws and the job fails instead of running against the wrong database.

The Laravel docs ask you to change only the `$context` passed in, not call the `Context` facade inside these callbacks. The code above follows that.

## Step 6: Cache and files

The manager already gives each tenant its own cache prefix and its own `local` disk root. Two notes:

- The prefix works for the Redis, Memcached, APC and database stores, which all prepend it to keys. The **file** store ignores the prefix, so with `CACHE_STORE=file` tenants share keys.
- `Cache::flush()` clears the whole store for every tenant, prefix or not. To clear one tenant, track its keys or use a separate Redis database.
- Anything that grabbed a cache repository before the switch, such as a singleton that had one injected, keeps the old prefix. Resolve the cache when you use it.

For public files, give the `public` disk the same treatment and decide how URLs work, since the default `storage:link` symlink only points at one folder. [Tenant-aware cache and file storage](/blog/laravel-tenant-cache-filesystem.html) goes deeper on both.

## The single-database variant

If one database with a `tenant_id` column is enough, the middleware and manager shrink to "remember the current tenant". The isolation moves into a global scope:

```php
<?php

namespace App\Models\Scopes;

use App\Tenancy\TenantManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

final class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenantId = app(TenantManager::class)->current()?->id;

        // No tenant means no rows, never all rows.
        $tenantId === null
            ? $builder->whereRaw('1 = 0')
            : $builder->where($model->qualifyColumn('tenant_id'), $tenantId);
    }
}
```

```php
#[ScopedBy([TenantScope::class])]
final class Project extends Model
{
    protected static function booted(): void
    {
        static::creating(fn (Project $project) => $project->tenant_id ??= app(TenantManager::class)->current()?->id);
    }
}
```

Add `tenant_id` to every unique index (`unique(['tenant_id', 'slug'])`), and remember that `DB::table()`, raw queries and the `exists`/`unique` validation rules skip Eloquent scopes. Use `Rule::exists('projects', 'id')->where('tenant_id', $tenantId)` instead. Choosing between the two models is its own topic: [single vs multi-database tenancy in Laravel](/blog/single-vs-multi-database-tenancy-laravel.html).

## What you'd still have to build

This is the honest part. The code above is maybe 200 lines, and it covers the happy path. A production SaaS also needs:

| Area | What's missing |
| --- | --- |
| Queues | Unique jobs and `WithoutOverlapping` lock keys per tenant, batches, retrying failed jobs for deleted tenants |
| Scheduler | Commands that loop every tenant with `run()`, without one slow tenant blocking the rest |
| Redis | Direct `Redis::` calls ignore the cache prefix, so they need their own per-tenant prefix |
| Storage | Public URLs, S3 prefixes, cleanup when a tenant is deleted |
| Routes | Central-only pages, routes that work on both, custom domains |
| Auth | Separate central and tenant guards if admins log in centrally |
| Databases | Deleting databases, backups and restores per tenant, a naming scheme that won't collide with other apps |
| Tests | `RefreshDatabase` only wraps the default connection, so tenant tests need their own setup |
| Octane | Resetting every piece of state between requests, not just the connection |
| Packages | spatie/laravel-permission's cache key, Telescope, Horizon, Scout, broadcasting channels |

None of these is hard alone. Together they're a few weeks of careful work, plus tests to keep them working.

## When to switch to a package

Hand-rolled tenancy is a good fit for an internal tool, a handful of tenants, or a team that wants to understand every line. We'd move to a package when:

- Customers sign up on their own and need a database created in seconds, reliably.
- You use queues, scheduled tasks, Redis and file uploads in tenant context every day.
- More than one developer works on the app and someone will forget `$connection = 'tenant'`.
- You need features like impersonation, per-tenant maintenance mode or custom domains.

**stancl/tenancy** does the most for you: it creates and migrates databases, and its bootstrappers switch the database, cache, filesystem, queue and Redis. **spatie/laravel-multitenancy** is closer to what we built: you get a tenant finder and tasks that run on switch, and you write database creation yourself. Our [stancl/tenancy vs Spatie comparison](/blog/stancl-tenancy-vs-spatie-multitenancy.html) goes through both, and the [stancl/tenancy tutorial](/blog/stancl-tenancy-tutorial.html) gets you started.

## Mistakes we see

- **Changing config without `DB::purge()`.** The old connection stays open, and tenant B reads tenant A's database.
- **Forgetting the connection on a model.** With `central` as the default, a tenant model without `$connection = 'tenant'` quietly writes tenant data into the central database.
- **Validation rules on the wrong connection.** `exists:projects,id` uses the default connection. Write `exists:tenant.projects,id`.
- **Sharing the session cookie across subdomains.** If `SESSION_DOMAIN` is `.your-app.com`, a session from Acme is valid on Globex, and user ID 5 there is a different person. Leave it empty so each subdomain gets its own cookie.
- **Not resetting state.** Queue workers and Octane reuse processes. If you don't reset at the end of a request or the start of a job, the next one inherits the last tenant.

## Frequently asked questions

### Can you do Laravel multi-tenancy without a package?

Yes. You need a middleware that finds the tenant, a service that switches the database connection with `config()` and `DB::purge()`, separate tenant migrations, and tenant-aware cache, files and queued jobs. It's a good fit for small apps. For a self-serve SaaS, a package saves you a lot of edge cases.

### How do I switch the database connection at runtime in Laravel?

Set the new database name with `config(['database.connections.tenant.database' => $name])`, then call `DB::purge('tenant')`. Laravel builds a fresh connection from the new config on the next query, or right away if you call `DB::reconnect('tenant')`.

### How do I make queued jobs tenant-aware without a package?

Use Laravel's Context. Add the tenant ID as hidden context in a `Context::dehydrating()` callback, and switch to that tenant in a `Context::hydrated()` callback. Laravel stores the context with every job and restores it when a worker runs the job.

### When should I use stancl/tenancy instead of building it myself?

When customers create their own workspaces, when you rely on queues, Redis and file storage in tenant context, or when several developers work on the app. stancl/tenancy creates databases and switches all of these for you. spatie/laravel-multitenancy is the lighter middle ground.

## Multi-tenancy in the SaaS Laravel kits

The SaaS Laravel kits don't hand-roll tenancy. They use stancl/tenancy v3 with a database per tenant, and the pieces we built above map to its parts: tenants are found from a subdomain of `APP_DOMAIN`, the database, cache, filesystem and queue bootstrappers switch everything when a tenant is identified, and a job pipeline creates, migrates and seeds each new tenant database. The kit adds central and tenant guards, per-domain settings, workspace status and per-tenant maintenance mode on top. The [multi-tenancy docs](/docs/core/multi-tenancy.html) show the full setup, and [database](/docs/core/database.html) explains tenant database naming.

<BlogPostCta title="Skip the plumbing, keep the control" text="SaaS Laravel ships database-per-tenant multi-tenancy on stancl/tenancy, with subdomains, separate guards and tenant-aware queues already set up on Laravel 13." />
