---
title: "Laravel Tenant Settings: Per-Tenant Settings That Don't Leak"
description: "Laravel tenant settings for database-per-tenant apps: a tenant settings table, stancl's data column or spatie/laravel-settings, plus caching and Inertia props."
pageClass: blog-page
date: 2026-11-04
author: erag
category: multi-tenancy
tags: [Multi-tenancy, Settings, stancl/tenancy]
---

# Laravel Tenant Settings: Typed, Cached and Safe Per-Tenant Settings

<BlogPostMeta />

Every SaaS grows a settings page. One customer wants invoices numbered `ACME-0001`, another works Sunday to Thursday, a third wants its own time zone and accent color. In a single-tenant app you'd reach for a settings package and be done. In a multi-tenant app, Laravel tenant settings raise harder questions: which database do they live in, who can change them, and how do you cache them without tenant A seeing tenant B's values?

This post is a guide to settings per tenant in a database-per-tenant Laravel app. We compare three ways to store them (a settings table in each tenant database, stancl's tenant `data` column, and spatie/laravel-settings pointed at the tenant connection), then build typed settings with defaults, validation, tenant-aware caching, a settings page and Inertia shared props. Along the way we'll show the one cache setting that quietly leaks settings across tenants.

## Four kinds of settings in a multi-tenant app

First, sort your settings by who owns them:

| Kind | Examples | Who edits | Where it lives |
| --- | --- | --- | --- |
| Central (app-wide) | Plans, global maintenance window, signup on or off | You, the super admin | Central database |
| Tenant (workspace) | Company name, time zone, invoice prefix, work week | The tenant's admin | Tenant database, or the tenant record |
| Per domain | Brand name, default language, which login options show | Super admin or tenant admin | Central `domains` table |
| Per user | Language, layout, notification preferences | Each user | Tenant database |

A simple rule decides most cases: **if the central app needs to read it without entering the tenant, store it centrally.** A tenant's plan, status or billing email belongs on the tenant record, because your admin screens list hundreds of tenants and can't open every database. A tenant's invoice prefix is only ever read inside the tenant, so it can live in the tenant database.

## Option 1: A settings table in each tenant database

The plainest option is a key/value table in every tenant database. Put the migration in `database/migrations/tenant` so it runs for every tenant:

```php
Schema::create('tenant_settings', function (Blueprint $table): void {
    $table->id();
    $table->string('key')->unique();
    $table->json('value')->nullable();
    $table->timestamps();
});
```

The model needs no tenant code at all. With stancl/tenancy, the default connection already points at the tenant database. A service adds defaults and caching:

```php
<?php

namespace Modules\Workspace\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\Workspace\Models\TenantSetting;

final class TenantSettingsService
{
    private const array DEFAULTS = [
        'timezone' => 'UTC',
        'week_starts_on' => 'monday',
        'invoice_prefix' => 'INV',
    ];

    /** @return array<string, mixed> */
    public function all(): array
    {
        return Cache::rememberForever('tenant-settings', fn (): array => array_replace(
            self::DEFAULTS,
            TenantSetting::query()->pluck('value', 'key')->all(), // `value` has a `json` cast
        ));
    }

    public function get(string $key): mixed
    {
        return $this->all()[$key] ?? null;
    }

    /** @param array<string, mixed> $values */
    public function update(array $values): void
    {
        DB::transaction(function () use ($values): void {
            foreach ($values as $key => $value) {
                TenantSetting::query()->updateOrCreate(['key' => $key], ['value' => $value]);
            }
        });

        Cache::forget('tenant-settings');
    }
}
```

The cache key looks global, but it isn't. stancl's `CacheTenancyBootstrapper` tags every call made through the `Cache` facade with the tenant, so each tenant gets its own `tenant-settings` entry. That only works on a store with tags, like Redis or Memcached. We cover the details in [tenant-aware cache and file storage](/blog/laravel-tenant-cache-filesystem.html).

Good for: a handful of settings, no extra package, full control. Weak at: types. Everything comes back as whatever JSON gives you.

## Option 2: stancl's tenant `data` column

stancl/tenancy's `Tenant` model stores every attribute that isn't listed in `getCustomColumns()` in a JSON column called `data`. That makes it a ready-made settings store:

```php
$tenant = tenant();
$tenant->invoice_prefix = 'ACME';
$tenant->save();

tenant('invoice_prefix'); // "ACME"
```

No migration, no new table, and the tenant is already loaded on every tenant request, so reads are free.

The downsides show up as you add more:

- Every setting is loaded on every request, needed or not.
- Writes from inside the tenant go to the **central** database, because the tenant model always uses the central connection.
- One JSON blob is hard to query and easy to overwrite if two requests save the tenant at once.
- Anything in it is visible to anyone who can read the `tenants` table.

We'd keep the `data` column for a few settings the central app also needs, like a status message or work week, and not turn it into the home of every tenant preference.

## Option 3: spatie/laravel-settings on the tenant connection

[spatie/laravel-settings](https://github.com/spatie/laravel-settings) gives you typed settings classes. Each class is a group of public properties, stored as rows in a `settings` table. It works well with database-per-tenant, but only if you set up three things correctly. Install it first (version 3 requires Laravel 12 or 13):

```bash
composer require spatie/laravel-settings
php artisan vendor:publish --provider="Spatie\LaravelSettings\LaravelSettingsServiceProvider" --tag="config"
php artisan vendor:publish --provider="Spatie\LaravelSettings\LaravelSettingsServiceProvider" --tag="migrations"
```

### 1. Point it at the tenant connection by leaving the connection empty

The database repository in `config/settings.php` has a `connection` key. When it's `null`, the package's model uses the default connection, and inside a tenant stancl has made the default connection the tenant database. So the safest value is the one already there:

```php
'repositories' => [
    'database' => [
        'type' => Spatie\LaravelSettings\SettingsRepositories\DatabaseSettingsRepository::class,
        'model' => null,
        'table' => null,
        'connection' => null, // follows the tenant connection
    ],
],
```

Don't set it to `mysql` "to be explicit". That pins every tenant's settings to the central database.

### 2. Run its migrations only in tenant databases

The published `create_settings_table` migration lands in `database/migrations`, so move it into `database/migrations/tenant`. Then look at `migrations_paths`. The package registers those folders with Laravel's migrator, so the default `database/settings` folder runs on a plain `php artisan migrate`, against the **central** database. stancl's `tenants:migrate` passes its own `--path`, which skips them.

Set `'migrations_paths' => []` and write settings migrations straight into the tenant folder:

```bash
php artisan make:settings-migration CreateWorkspaceSettings database/migrations/tenant
```

```php
<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('workspace.timezone', 'UTC');
        $this->migrator->add('workspace.week_starts_on', 'monday');
        $this->migrator->add('workspace.invoice_prefix', 'INV');
        $this->migrator->add('workspace.accent_color', null);
    }
};
```

New tenants get these rows when they're created. Existing tenants get them on the next `php artisan tenants:migrate`.

### 3. Give the cache a tenant prefix

This is the leak. The settings cache is off by default (`SETTINGS_CACHE_ENABLED`). When you turn it on, the package reads and writes through `Cache::store()`, and stancl only tags calls made through the facade's magic methods, not ones that ask for a store directly. So the cache key for `WorkspaceSettings` is shared, and the first tenant to load it wins for everyone.

Since version 3.9, the package lets you add a dynamic prefix. Register it in `AppServiceProvider::boot()`:

```php
use Spatie\LaravelSettings\SettingsCache;

SettingsCache::resolvePrefixUsing(
    fn (): string => tenant() ? 'tenant'.tenant()->getTenantKey() : 'central',
);
```

`settings:clear-cache` uses the same prefix, so to clear tenant caches run it per tenant: `php artisan tenants:run settings:clear-cache`.

### A typed settings class

```php
<?php

namespace Modules\Workspace\Settings;

use Spatie\LaravelSettings\Settings;

final class WorkspaceSettings extends Settings
{
    public string $timezone = 'UTC';

    public string $week_starts_on = 'monday';

    public string $invoice_prefix = 'INV';

    public ?string $accent_color = null;

    public static function group(): string
    {
        return 'workspace';
    }
}
```

The defaults on the properties mean a tenant that hasn't run the migration yet still gets sensible values instead of a `MissingSettings` exception. Register the class in the `settings` array of the config, or let auto-discovery find it.

Settings classes are bound as **scoped** instances, so each request and each queued job gets a fresh one. But a command that loops over tenants in one process keeps the first tenant's instance. Forget it whenever tenancy changes, in `TenancyServiceProvider::events()`:

```php
Events\TenancyBootstrapped::class => [
    fn () => app()->forgetInstance(WorkspaceSettings::class),
],
Events\TenancyEnded::class => [
    fn () => app()->forgetInstance(WorkspaceSettings::class),
],
```

## Comparing the three options

| | Tenant settings table | stancl `data` column | spatie/laravel-settings |
| --- | --- | --- | --- |
| Lives in | Tenant database | Central `tenants` table | Tenant database |
| Types | Whatever JSON returns | Whatever JSON returns | Typed properties, casts, enums |
| Defaults | In your service | In your code | On the class |
| Central app can read it | Only by entering the tenant | Yes, directly | Only by entering the tenant |
| Changes over time | Your code | Your code | Settings migrations |
| Extra setup for tenancy | None | None | Connection, migration paths, cache prefix |
| Best for | A few simple keys | Settings the central app needs | Many settings, typed and grouped |

## Validation and a thin settings controller

Whichever store you pick, the settings page looks the same. Validation goes in a Form Request:

```php
final class UpdateWorkspaceSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('Manage Workspace Settings');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'timezone' => ['required', 'timezone:all'],
            'week_starts_on' => ['required', Rule::in(['monday', 'sunday', 'saturday'])],
            'invoice_prefix' => ['required', 'string', 'max:10', 'alpha_dash'],
            'accent_color' => ['nullable', 'hex_color'],
        ];
    }
}
```

The service saves, and the controller only connects the two:

```php
final class WorkspaceSettingsService
{
    public function __construct(private WorkspaceSettings $settings) {}

    /** @param array<string, mixed> $data */
    public function update(array $data): WorkspaceSettings
    {
        return $this->settings->fill($data)->save(); // also refreshes the cache
    }
}

final class WorkspaceSettingsController extends Controller
{
    public function edit(WorkspaceSettings $settings): Response
    {
        return Inertia::render('Workspace/Settings', ['settings' => $settings->toArray()]);
    }

    public function update(UpdateWorkspaceSettingsRequest $request, WorkspaceSettingsService $service): RedirectResponse
    {
        $service->update($request->validated());

        return back()->with('success', __('Settings saved.'));
    }
}
```

Put the routes in your tenant routes file. A settings page in the central app would save to the wrong database.

## Sharing tenant settings with Inertia

Most pages need a few settings, like the accent color and time zone. Share them from `HandleInertiaRequests` as a lazy closure, only inside a tenant:

```php
'workspace' => fn (): ?array => tenant() ? [
    'timezone' => app(WorkspaceSettings::class)->timezone,
    'accentColor' => app(WorkspaceSettings::class)->accent_color,
] : null,
```

Two rules. Share only what the browser needs, because shared props go into every response and anyone can read them in the page source. Never share encrypted values such as API keys. And use a normal closure, not `Inertia::once()`. Once props are remembered by the client across visits, so a saved change wouldn't show until a full reload. The [Inertia v3 shared data docs](https://inertiajs.com/docs/v3/data-props/shared-data) cover both kinds.

Add the prop to your shared props type, then read it in a component:

```vue
<script setup lang="ts">
import { usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

const page = usePage();
const accent = computed(() => page.props.workspace?.accentColor ?? '#4f46e5');
</script>

<template>
    <header :style="{ borderColor: accent }" class="border-b-4">
        <slot />
    </header>
</template>
```

In React it's `usePage().props.workspace`, and in Svelte 5 `page.props.workspace` from `@inertiajs/svelte`.

## Applying settings at runtime

Some settings change how Laravel itself behaves. Apply those in a `TenancyBootstrapped` listener, so they're set before any controller runs. Changing config values like `app.name` or `mail.from.name` there is fine.

If the values live in the tenant's `data` column, stancl v3 can do this for you. Enable `Stancl\Tenancy\Features\TenantConfig::class` in the `features` array of `config/tenancy.php` and map tenant attributes to config keys:

```php
use Stancl\Tenancy\Features\TenantConfig;

TenantConfig::$storageToConfigMap = [
    'mail_from_name' => 'mail.from.name',
    'mail_from_address' => 'mail.from.address',
];
```

When tenancy starts, each attribute that isn't `null` is copied into config, and the originals come back when the app returns to the central context. Your code then reads `config('mail.from.name')` and doesn't care where the value came from. The [tenant config docs](https://tenancyforlaravel.com/docs/v3/features/tenant-config) have the details.

Be careful with the time zone. Laravel sets PHP's default time zone from `app.timezone` at boot, so changing that config value later doesn't move it. Keep storing dates in UTC and convert them for display with the tenant's setting, for example `$invoice->created_at->timezone($settings->timezone)`.

## Central, tenant and per-domain settings together

If a tenant can have several domains, some settings belong to the domain, not the tenant. A company with `acme.your-app.com` and `acme-eu.your-app.com` may want a different brand name or default language on each. Store those on the central `domains` table and resolve them in order: domain value, then tenant value, then the central default. It's the same lookup chain you'd use for language, which we walk through in [Laravel user language preference](/blog/laravel-user-language-preference.html).

## Common pitfalls

- **Setting the settings connection to your central connection.** All tenants end up reading and writing one shared set of rows.
- **Leaving `database/settings` in `migrations_paths`.** `php artisan migrate` then runs tenant settings migrations against the central database.
- **Turning on the spatie settings cache without a tenant prefix.** One tenant's values are served to everyone.
- **Resolving settings in a service provider.** Providers boot before tenancy is identified, so you'd load the central values, or none.
- **Using a cache store without tags.** stancl's cache bootstrapper needs Redis, Memcached or the array store. With `file` or `database`, Option 1's tagged cache throws an exception.
- **Putting settings the central app needs in the tenant database.** Your tenant list can't show a plan or status it has to open 300 databases to read.

## Frequently asked questions

### How do I store settings per tenant in Laravel?

In a database-per-tenant app, put them in the tenant database: a key/value table, or typed classes with spatie/laravel-settings. Keep settings the central app must read, like plan or status, on the tenant record in the central database. Cache them with a tenant-aware key.

### Does spatie/laravel-settings work with multi-tenancy?

Yes. Leave the database repository's `connection` as `null`, so it follows stancl's tenant connection, run its migrations from your tenant migrations folder, and add a tenant prefix with `SettingsCache::resolvePrefixUsing()` if you enable the cache. The prefix resolver is available from version 3.9.

### Should tenant settings live in the central or the tenant database?

Ask who reads them. If only code running inside the tenant reads a setting, the tenant database is the right place. If the central admin app lists, filters or reports on it, keep it on the central tenant record.

### How do I cache tenant settings safely?

Make the tenant part of the key. With stancl/tenancy, calls through the `Cache` facade are tagged per tenant automatically, as long as your store supports tags. Packages that call `Cache::store()` directly skip that tagging, so give them a tenant prefix yourself.

## Tenant settings in the SaaS Laravel kits

The SaaS Laravel kits don't include a general workspace settings page or spatie/laravel-settings. They do already use the pattern from this post in a few places. [Per-domain settings](/docs/core/domains.html#per-domain-settings) (app name, default language and which auth features are on) are columns on the central `domains` table, and the app name falls back from domain to tenant company to `APP_NAME`. Tenant attributes such as work week and status message live in stancl's `data` column, as the [tenant data docs](/docs/core/multi-tenancy.html#tenant-data) show. Each tenant database has a `layout_settings` table with a workspace default row and per-user rows, and the central database has a key/value `settings` table (note the name if you add spatie/laravel-settings centrally). For workspace settings, we'd add a module in `Modules/` with a tenant migration, a settings service, and a tenant permission such as "Manage Workspace Settings" in `config/permissions/tenant/`. The [database docs](/docs/core/database.html) list every central and tenant table.

<BlogPostCta title="Per-domain settings, already built" text="SaaS Laravel ships database-per-tenant multi-tenancy with per-domain app name, language and auth settings. Workspace settings are yours to add, and the structure shows where they go." />
