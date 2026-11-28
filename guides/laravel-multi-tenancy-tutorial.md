---
title: "Laravel Multi-Tenancy Tutorial"
description: "A Laravel multi-tenancy tutorial with real code: tenant identification, a database per tenant, migrations, auth guards, queues, cache, storage and tests."
breadcrumb: "Laravel multi-tenancy tutorial"
sidebar: false
editLink: false
howTo:
  name: "Set up database-per-tenant multi-tenancy in Laravel"
  steps:
    - name: "Decide the tenancy model"
      text: "Choose between one shared database with a tenant_id column and one database per tenant."
      anchor: "single-database-or-a-database-per-tenant"
    - name: "Identify the tenant from the domain"
      text: "Run a middleware on every request that leaves central domains alone and initializes tenancy for any other host."
      anchor: "how-does-laravel-know-which-tenant-a-request-is-for"
    - name: "Switch the database and other services"
      text: "Enable the database, cache, filesystem and queue bootstrappers so each service points at the current tenant."
      anchor: "what-changes-when-tenancy-starts"
    - name: "Create tenants with a provisioning pipeline"
      text: "On the TenantCreated event, create the database, run tenant migrations, seed it and create the first admin."
      anchor: "how-is-a-new-tenant-created"
    - name: "Separate central and tenant users"
      text: "Give central and tenant users their own guards and providers, and switch the defaults when tenancy starts."
      anchor: "how-do-central-and-tenant-users-sign-in"
    - name: "Keep two sets of migrations"
      text: "Put tenant migrations in database/migrations/tenant and run them for every tenant with tenants:migrate."
      anchor: "how-do-migrations-work-with-many-databases"
    - name: "Make queues, cache and storage tenant-aware"
      text: "Let jobs carry their tenant, use a cache store that supports tags, and keep tenant files in separate folders or prefixes."
      anchor: "queues-and-scheduled-tasks"
    - name: "Test tenant isolation"
      text: "Create tenants in Pest tests, run assertions inside them, and prove one tenant can't sign in to another."
      anchor: "how-do-you-test-a-multi-tenant-laravel-app"
---

# Laravel Multi-Tenancy Tutorial: From the First Request to the Last Test

This tutorial shows you how multi-tenancy works in a real Laravel app, step by step, with code taken from the [SaaS Laravel](/blog/laravel-saas-starter-kit.html) starter kit. It's for Laravel developers building a SaaS where each customer must only ever see their own data. You'll go from "which tenant is this request for?" all the way to tests that prove tenants stay apart.

The kit uses [stancl/tenancy](https://tenancyforlaravel.com) with a separate database per tenant, so that's the model we follow. Where the other model, one shared database, would do something differently, we say so.

<KeyIdea>

The domain picks the tenant, and the tenant picks the database. After that, normal Eloquent code reads and writes only that tenant's data, without a `where tenant_id = ...` anywhere.

</KeyIdea>

## What multi-tenancy means

A **tenant** is one customer account: a company, a school, a clinic. It has its own users and its own data. **Multi-tenancy** means one Laravel app serves many tenants at once, and keeps their data apart.

Your app ends up with two contexts:

- The **central** context is your side of the business: the list of tenants, their domains, your own staff accounts. In the kit it runs on one domain, such as `your-saas.com`.
- The **tenant** context is your customer's side. In the kit it runs on a subdomain, such as `acme.your-saas.com`, and sees only Acme's data.

If the idea is new to you, [What is multi-tenancy in Laravel?](/blog/what-is-multi-tenancy-laravel.html) explains it with a running example. Our [glossary](/glossary.html) defines every term in two to four sentences.

## Single database or a database per tenant?

There are two common ways to keep tenant data apart:

| | One shared database | A database per tenant |
| --- | --- | --- |
| How data is kept apart | A `tenant_id` column on every tenant table, and a scope on every query | Each tenant has its own database, picked at the start of each request |
| A forgotten filter | Shows one tenant's rows to another | Can't happen: other tenants' rows aren't in the database |
| Backing up or exporting one customer | Filter every table | Dump one database |
| Reports across all tenants | One SQL query | A loop over tenants, or a central copy |
| Running it | One migration run, one backup | One migration run and one backup per tenant |

Neither one is always right. Products with many tiny accounts, or features that read across accounts, often suit one database. B2B products whose buyers ask where their data lives often suit a database per tenant. [Single vs multi-database tenancy](/blog/single-vs-multi-database-tenancy-laravel.html) goes deeper, and the [tenancy model quiz](/tools/laravel-tenancy-model-quiz.html) gives you a recommendation for your own product in about a minute.

This tutorial follows the database-per-tenant model. If you want to see it without a package, [multi-tenancy without a package](/blog/laravel-multi-tenancy-without-package.html) builds it by hand. If you're still choosing a package, see [the best Laravel multi-tenancy packages](/blog/laravel-multi-tenancy-packages.html) and [stancl/tenancy vs Spatie Multitenancy](/blog/stancl-tenancy-vs-spatie-multitenancy.html).

## How does Laravel know which tenant a request is for?

This step is called **tenant identification**. The kit identifies tenants by domain. One domain belongs to you, and every other domain belongs to a tenant.

The central domain comes from `APP_DOMAIN` in `.env`:

```php
// config/tenancy.php
'central_domains' => [
    env('APP_DOMAIN'),
],
```

A middleware runs first on every request. On the central domain it makes sure the central sign-in settings are used and stops there. On any other host it hands over to stancl's `InitializeTenancyByDomain`, which looks the host up in the `domains` table:

```php
// app/Http/Middleware/InitializeTenancyIfTenantDomain.php
public function handle(Request $request, Closure $next): Response
{
    $host = $request->getHost();
    $isCentral = in_array($host, config('tenancy.central_domains', []), true);

    if ($isCentral) {
        // Central context: ensure central auth defaults and do NOT initialize tenancy
        config([
            'auth.defaults.guard' => 'web',
            'auth.defaults.passwords' => 'central_users',
            'fortify.guard' => 'web',
            'fortify.passwords' => 'central_users',
        ]);

        auth()->shouldUse('web');

        return $next($request);
    }

    // Tenant context: initialize tenancy by domain
    return $this->initializeTenancyByDomain->handle($request, $next);
}
```

A host that is neither central nor in the `domains` table gets a 404. So the whole decision looks like this:

<FlowDiagram label="How a request finds its tenant" :nodes="['Request for `acme.your-saas.com`', { label: 'Is it `APP_DOMAIN`?', note: 'yes: central app' }, { label: 'Look up the host', note: 'central `domains` table' }, { label: 'Tenant found', note: 'unknown host: 404' }, 'Tenancy starts']" />

### Routes that work in only one context

Because the middleware runs globally, a module's routes answer on both the central domain and tenant domains. The kit handles this in three ways, and you'll use all three:

- **Permission names per context.** The users page allows either the central or the tenant permission: `->middleware('permission:View Users|View Tenant Users')`.
- **Central-only routes.** Tenant management uses the `central.only` middleware, which returns a 404 on any tenant domain.
- **Tenant-only routes.** Routes such as accepting an invitation use stancl's `PreventAccessFromCentralDomains`.

For your own product features, which almost always belong to tenants, put `PreventAccessFromCentralDomains` on the route group. Then a CRM page can't accidentally open on your central domain.

### Subdomains, Herd and custom domains

The kit stores every tenant domain as a subdomain of `APP_DOMAIN`. Enter `acme` and it saves `acme.your-saas.com`. Locally, [Laravel Herd](/blog/laravel-herd-subdomains.html) serves wildcard `*.test` subdomains for you. In production you need wildcard DNS and a wildcard TLS certificate, which [deploying a Laravel SaaS](/blog/deploy-laravel-saas.html) covers.

Bring-your-own domains, such as `app.acme.com`, aren't built into the kit. The domain lookup itself would work, but you'd need DNS verification, TLS per domain and a form that accepts a full domain. [Custom domains for tenants](/blog/laravel-tenant-custom-domains.html) walks through what that involves, and [Laravel multi-tenancy with subdomains](/blog/laravel-multi-tenancy-subdomains.html) covers the subdomain side in more depth.

## What changes when tenancy starts?

Once a tenant is identified, stancl runs **bootstrappers**. Each one points one Laravel service at the current tenant. The kit turns on four:

```php
// config/tenancy.php
'bootstrappers' => [
    DatabaseTenancyBootstrapper::class,
    CacheTenancyBootstrapper::class,
    FilesystemTenancyBootstrapper::class,
    QueueTenancyBootstrapper::class,
    // Stancl\Tenancy\Bootstrappers\RedisTenancyBootstrapper::class, // Note: phpredis is needed
],
```

| Bootstrapper | What it does inside a tenant |
| --- | --- |
| Database | The default connection becomes the tenant's database |
| Cache | Every cache call gets a tag for the tenant |
| Filesystem | The `local` and `public` disks and `storage_path()` get a folder per tenant |
| Queue | Jobs remember which tenant dispatched them |

The kit also listens to stancl's `TenancyInitialized` event to switch the sign-in guard, the Fortify features, the app name and the locale for that tenant's domain. The sections below take each part in turn.

## How is a new tenant created?

Creating a tenant is two inserts: the tenant row and its domain. Here's the kit's service method, shortened to the parts that matter:

```php
// Modules/Tenant/Services/TenantService.php
public function createTenant(TenantRegisterData $data): Tenant
{
    $tenant = Tenant::query()->create([
        'company' => $data->company,
        'email' => $data->email,
        // ...name, phone, team size, industry, status, work week
    ]);

    $tenant->domains()->create([
        'domain' => $data->domain.'.'.config('tenancy.domain'),
        'is_primary' => true,
    ]);

    if ($data->sendInvitation) {
        $this->sendInvitation($tenant);
    }

    return $tenant;
}
```

The heavy work happens on stancl's `TenantCreated` event. A job pipeline creates the database, runs the tenant migrations, seeds roles, permissions and menus, and creates the tenant's first admin:

```php
// app/Providers/TenancyServiceProvider.php
Events\TenantCreated::class => [
    JobPipeline::make([
        Jobs\CreateDatabase::class,
        Jobs\MigrateDatabase::class,
        Jobs\SeedDatabase::class,
        CreateTenantUserJob::class,
    ])->send(function (Events\TenantCreated $event) {
        return $event->tenant;
    })->shouldBeQueued(false),
],
```

Three things are worth knowing here.

**It runs inside the request.** `shouldBeQueued(false)` means the person creating the tenant waits until the database is ready. That's simple, and it means the workspace works the moment the page reloads. As your migrations grow, it gets slower.

**`CreateTenantUserJob` reads the request.** It takes the admin password and the "send invitation" choice from `request()`. A queue worker has no request, so if you queue the pipeline, pass those values to the job first.

**`CREATE DATABASE` can't be rolled back.** In MySQL, creating a database commits immediately, so a transaction around tenant creation won't undo it. Validate everything up front, such as the subdomain being free, before you create the tenant.

Tenant databases are named from a prefix and the tenant ID: `tenant1`, `tenant2` and so on. If two apps share one MySQL server, give each its own prefix before the first tenant exists. The [database docs](/docs/core/database.html#tenant-database-naming) show where.

### Where does each kind of data live?

| Central database | Each tenant database |
| --- | --- |
| `tenants`, `domains` | `users`, `password_reset_tokens`, `sessions` |
| Central `users`, roles and permissions | Tenant roles and permissions |
| Central menus and layout settings | Tenant menus and layout settings |
| `settings` (for example, maintenance mode for all tenants) | `notifications` |
| `jobs`, `failed_jobs` used by every tenant | `cache`, `cache_locks` |

The tenant model keeps a few attributes as real columns and the rest in a JSON `data` column, so `$tenant->industry = 'education'` works without a migration. That's handy for settings, but you can't index or sort on those values in SQL. [Per-tenant settings that don't leak](/blog/laravel-tenant-settings.html) discusses where each kind of setting belongs.

<PricingBlock />

## How do central and tenant users sign in?

Your staff and your customers' users are different people with different passwords, in different databases. The kit gives each its own guard and user provider:

```php
// config/auth.php
'guards' => [
    'web' => [
        'driver' => 'session',
        'provider' => 'central_users',
    ],

    'tenant' => [
        'driver' => 'session',
        'provider' => 'tenant_users',
    ],
],
```

When tenancy starts, a listener makes `tenant` the default for the request:

```php
// app/Listeners/ConfigureTenantAuth.php
public function handle(TenancyInitialized $event): void
{
    config([
        'auth.defaults.guard' => 'tenant',
        'auth.defaults.passwords' => 'tenant_users',
        'fortify.guard' => 'tenant',
        'fortify.passwords' => 'tenant_users',
    ]);

    auth()->shouldUse('tenant');
}
```

So the same login page signs a central admin in on `your-saas.com` and a tenant user in on `acme.your-saas.com`, and neither can use their password on the other side. The kit's tests check exactly that, as you'll see below. [Multiple auth guards](/blog/laravel-multiple-auth-guards.html) explains the pattern, and the [authentication docs](/docs/core/authentication.html) cover the per-domain sign-in options such as turning off registration or passkeys for one tenant.

### Roles and permissions in each context

Each database has its own Spatie roles and permissions, on the `web` guard centrally and the `tenant` guard inside tenants. Tenant permissions are defined in `config/permissions/tenant/*.php`. A user with the `super-admin` role passes every check, thanks to a `Gate::before` in `AppServiceProvider`. The [roles and permissions docs](/docs/core/users-roles-permissions.html) explain the rest.

## How do migrations work with many databases?

Central and tenant migrations live in different folders:

| Folder | Runs on | Command |
| --- | --- | --- |
| `database/migrations` | The central database | `php artisan migrate` |
| `database/migrations/tenant` | Every tenant database | `php artisan tenants:migrate` |

To add a table for tenants:

```bash
php artisan make:migration create_projects_table --path=database/migrations/tenant
php artisan tenants:migrate
```

New tenants get every tenant migration when they're created. Existing tenants get new ones when you run `tenants:migrate`, usually as part of your deploy. With hundreds of tenants that takes a while, so keep tenant migrations quick and safe to run on live data.

Seeders need one warning. `php artisan tenants:seed` runs the whole tenant seeder, which also creates demo users in every tenant. On real tenants, run only the seeder you need:

```bash
php artisan tenants:seed --class="Database\Seeders\PermissionSeeder"
```

A new permission then exists in every tenant, but the kit gives permissions straight to users, so existing users don't have it yet. Tenant super admins pass anyway. Everyone else gets it when an admin assigns it, or when you write a small command that does. [Tenant migrations and seeders](/blog/laravel-tenant-migrations-seeders.html) goes further, and [stancl/tenancy: getting started](/blog/stancl-tenancy-tutorial.html) covers the commands from a fresh install.

## Queues and scheduled tasks

With the queue bootstrapper on, a job dispatched inside a tenant remembers that tenant. When a worker picks it up, tenancy starts again before `handle()` runs, so `User::query()` inside the job reads the right database.

The jobs themselves are stored centrally. The database queue uses the connection named in `DB_CONNECTION`, which stays pointed at the central database even after tenancy switches the default connection:

```php
// config/queue.php
'database' => [
    'driver' => 'database',
    'connection' => env('DB_QUEUE_CONNECTION', env('DB_CONNECTION')),
    'table' => env('DB_QUEUE_TABLE', 'jobs'),
    // ...
],
```

That means one worker serves every tenant. The kit's invitation and password-reset emails implement `ShouldQueue`, so run a worker or they won't be sent.

Two habits keep jobs out of trouble. Pass a job everything it needs as data, because the original request is gone by the time it runs. And for scheduled work, loop over tenants with `tenants:run` or a command that calls `$tenant->run()` for each one. [Queued jobs in a multi-tenant app](/blog/laravel-multi-tenant-queues.html) and [the multi-tenant scheduler](/blog/laravel-multi-tenant-scheduled-tasks.html) cover both.

## Cache: tags, and the store you choose

The cache bootstrapper adds a tag to every cache call inside a tenant, built from this setting and the tenant ID:

```php
// config/tenancy.php
'cache' => [
    'tag_base' => 'tenant',
],
```

So `Cache::remember('stats', ...)` in Acme's workspace and in Globex's workspace never share a value. Clearing one tenant's cache clears only its tag.

There's a catch. Tags only work on cache stores that support them, such as Redis, Memcached and the array store. The kit's `.env.example` sets `CACHE_STORE=database`, and Laravel's database store doesn't support tags. Inside a tenant, a call like `Cache::get()` then throws "This cache store does not support tagging". The kit's own code doesn't call the cache inside tenants, so you won't see this until you do. Before you add caching to tenant features, switch `CACHE_STORE` to Redis in production. [Tenant-aware cache and file storage](/blog/laravel-tenant-cache-filesystem.html) has more on both bootstrappers.

## Storage: a folder per tenant

The filesystem bootstrapper adds a suffix to the `local` and `public` disks and to `storage_path()`, so each tenant writes to its own folder:

```php
// config/tenancy.php
'filesystem' => [
    'suffix_base' => 'tenant',
    'disks' => [
        'local',
        'public',
        // 's3',
    ],
    // ...
    'suffix_storage_path' => true,
    'asset_helper_tenancy' => true,
],
```

`Storage::disk('local')->put('report.csv', ...)` in tenant 1 lands under `storage/tenant1/app`. The kit has no upload feature of its own, so this matters once you add one.

Two production notes. With zero-downtime deploys, make `storage` a shared folder, or each release starts with empty tenant folders. On a platform with an ephemeral disk, such as Laravel Cloud, use object storage instead, and add `s3` to the disk list so each tenant gets its own prefix. [Laravel Cloud vs Forge vs Vapor](/blog/laravel-cloud-vs-forge-vs-vapor.html) compares how each host handles files, and [backups for a multi-database SaaS](/blog/laravel-multi-database-backups.html) covers protecting them.

## How do you test a multi-tenant Laravel app?

The kit's tests run on SQLite in memory, set in `phpunit.xml`, so they never touch your MySQL databases. Tenancy tests create real tenants through the real service, run assertions inside the tenant, and clean up afterwards:

```php
// tests/Feature/Tenancy/TenantCreationTest.php
test('tenant service creates tenant with domain, database, migrations and initial admin user', function () {
    $service = app(TenantService::class);

    $tenant = $service->createTenant(tenantRegisterData());

    expect($tenant->domains->first()->domain)->toBe('acme.'.config('tenancy.domain'));

    $tenant->run(function () {
        $tenantAdmin = User::query()->where('email', 'admin@acme.com')->first();

        expect($tenantAdmin)->not->toBeNull();
        expect(Menu::query()->count())->toBeGreaterThan(0);
    });
});
```

The cleanup matters as much as the test. Without it, tenants and their databases from one test leak into the next:

```php
// tests/Feature/Tenancy/TenantAuthenticationTest.php
afterEach(function () {
    if (tenancy()->initialized) {
        tenancy()->end();
    }

    foreach (Tenant::all() as $tenant) {
        $tenant->delete();
    }

    DB::purge('tenant');
});
```

The same file proves isolation from the outside: central credentials fail on a tenant domain, one tenant's credentials fail on another tenant's domain, and an unknown host returns a 404. When you add a feature, add one test in the same spirit: sign in as tenant A and assert that tenant B's record isn't there. [Testing multi-tenant Laravel apps with Pest](/blog/test-multi-tenant-laravel-pest.html) has more patterns, and the [testing docs](/docs/core/testing.html) list the commands.

## Running tenants in production

Multi-tenancy doesn't stop at the code. A few operational pieces come up in every SaaS:

- **Suspending one tenant.** The kit blocks a suspended workspace with a 403 page and its own message. See [suspending customer accounts](/blog/suspend-tenant-accounts-saas.html) and the [maintenance and suspension docs](/docs/core/maintenance-and-suspension.html).
- **Maintenance for every tenant at once,** with a bypass link and allowed IPs, while the central app stays up. [Maintenance mode for multi-tenant apps](/blog/laravel-multi-tenant-maintenance-mode.html) explains the design.
- **Deleting a tenant** drops its database in the kit. Make that a deliberate step with a backup first, as [deleting tenants safely](/blog/delete-tenant-laravel-safely.html) describes.
- **Health checks** across many databases: [Laravel health checks for multi-tenant apps](/blog/laravel-health-checks-multi-tenant.html).
- **Search, API tokens and feature flags** each need a tenant-aware setup: [Scout](/blog/laravel-scout-multi-tenant-search.html), [Sanctum](/blog/laravel-sanctum-api-tokens-saas.html) and [Pennant](/blog/laravel-pennant-feature-flags.html).
- **Plan limits and branding** per tenant: [usage limits](/blog/laravel-saas-usage-limits.html) and [white-label SaaS](/blog/white-label-saas-laravel.html).

If you're on Livewire rather than Inertia, the tenancy side is the same. [Livewire multi-tenancy](/blog/livewire-multi-tenancy.html) covers the Livewire-specific parts. If your "tenants" are really teams of people inside one account, read [teams vs multi-tenancy](/blog/laravel-teams-vs-multi-tenancy.html) before you build either.

## A checklist before you launch

1. Decide the model: one database, or a database per tenant.
2. Identify tenants by domain, and decide which routes belong to which context.
3. Turn on the database, cache, filesystem and queue bootstrappers.
4. Create tenants through one service, with a pipeline that creates, migrates and seeds the database.
5. Give central and tenant users separate guards.
6. Keep tenant migrations in their own folder and run them on deploy.
7. Use a cache store that supports tags, and shared or object storage for tenant files.
8. Test that one tenant can never see or sign in to another.

For the same topics from the kit's point of view, read the [multi-tenancy](/docs/core/multi-tenancy.html), [domains](/docs/core/domains.html), [database](/docs/core/database.html) and [architecture](/docs/core/architecture.html) docs. The [configuration](/docs/getting-started/configuration.html) page lists every tenancy setting, and [local development](/docs/getting-started/local-development.html) gets you running with subdomains. For a shorter overview of the database-per-tenant model, see [how to build a multi-tenant SaaS with Laravel](/blog/multi-tenant-saas-laravel-database-per-tenant.html).

<NextStep
  title="Start with all of this already working"
  text="The SaaS Laravel kits ship the identification, provisioning pipeline, guards, bootstrappers and tenancy tests shown above, in Vue, React, Svelte or Livewire."
  secondaryText="Read the multi-tenancy docs"
  secondaryLink="/docs/core/multi-tenancy.html"
/>
