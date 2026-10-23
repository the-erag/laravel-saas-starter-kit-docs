---
title: "Laravel Pennant Feature Flags for a Multi-Tenant SaaS"
description: "Laravel Pennant feature flags for a SaaS: per-tenant scopes, plan features vs Lottery rollouts, where the features table lives, Inertia props and Pest tests."
pageClass: blog-page
date: 2026-10-24
author: annu-gupta
category: saas
tags: [Feature Flags, Pennant]
---

# Laravel Pennant Feature Flags: Per-Tenant Rollouts in a SaaS

<BlogPostMeta />

You've built a new reports page. You want three friendly customers to try it this week, 10% of workspaces next week, and everyone the week after. If something breaks, you want to switch it off without a deploy. Laravel Pennant feature flags give you exactly that, and Pennant is a first-party package, so there's no external service to pay for.

Most Pennant examples check flags against the logged-in user. In a SaaS, the unit that buys, upgrades and complains is usually the team or tenant, not one person. Below we set up Pennant with the tenant as the scope, separate real flags from plan features, decide where the `features` table belongs when every tenant has its own database, and send active flags to Vue or React through Inertia.

We're using Laravel 13, PHP 8.4, Inertia v3, laravel/pennant 1.26 and stancl/tenancy 3.10 with a database per tenant. Every API below is from the [Laravel 13 Pennant docs](https://laravel.com/docs/13.x/pennant).

## Feature flag vs plan permission vs config value

Before writing any code, decide what kind of switch you need. Mixing these up is the most common reason a Pennant setup gets messy.

| | Feature flag (Pennant) | Plan permission | Config value |
| --- | --- | --- | --- |
| Question it answers | Should this tenant see the new thing yet? | Has this tenant paid for this? | How does the app behave everywhere? |
| Who changes it | Developers, product people | Billing (upgrade, downgrade) | Developers, through a deploy or `.env` |
| How long it lives | Weeks, then you delete it | As long as the plan exists | As long as the app runs |
| Differs per tenant | Yes | Yes | No |
| Example | New reports page for 10% of workspaces | "Pro plan includes API access" | Max upload size |

A flag is temporary. A plan permission is part of your product and pricing. If a check will still be in the code in two years, it probably isn't a feature flag. We come back to this when we look at plan-based features, because Pennant stores values and that matters for plans.

## Installing Laravel Pennant

```bash
composer require laravel/pennant
php artisan vendor:publish --provider="Laravel\Pennant\PennantServiceProvider"
php artisan migrate
```

This gives you `config/pennant.php` and a `features` table. The `database` store is the default; the other built-in store is `array`, which only lives for one request. The table is simple: `name`, `scope`, `value` and timestamps, with a unique index on `name` plus `scope`.

That table is the heart of Pennant. The first time a feature is checked for a scope, Pennant runs your resolver and stores the result. Every check after that reads the stored value. A customer who got the new dashboard keeps it, even if your random rollout would have said "no" the second time.

## Defining features: closures and classes

The quickest way is a closure in a service provider:

```php
use App\Models\Tenant;
use Illuminate\Support\Lottery;
use Laravel\Pennant\Feature;

public function boot(): void
{
    Feature::define('new-reports', fn (Tenant $tenant) => match (true) {
        $tenant->is_beta_tester => true,
        default => Lottery::odds(1, 10),
    });
}
```

Beta testers always get the new reports. Everyone else has a 1 in 10 chance, decided once and then stored. That's a gradual rollout in four lines.

For anything bigger, we prefer class-based features. Create one with `php artisan pennant:feature AiSummaries`, which lands in `app/Features`. A class only needs a `resolve()` method, gets constructor injection from the container, and doesn't need registering:

```php
<?php

namespace App\Features;

use App\Models\Tenant;
use Illuminate\Support\Lottery;
use Laravel\Pennant\Attributes\Name;

#[Name('ai-summaries')]
class AiSummaries
{
    public function resolve(?Tenant $tenant): mixed
    {
        if ($tenant === null) {
            return false;
        }

        return Lottery::odds(1, 20);
    }
}
```

By default Pennant stores the full class name in the `name` column. The `#[Name]` attribute stores a short, stable name instead, so moving the class to another namespace doesn't orphan your stored values.

## Choosing the scope: user or tenant

Pennant checks the logged-in user by default. You can pass any scope with `for()`:

```php
Feature::for($tenant)->active('new-reports');
```

You'll forget `for(tenant())` somewhere, so set the tenant as the default scope instead:

```php
// AppServiceProvider::boot()
Feature::resolveScopeUsing(fn ($driver) => tenant());
```

Now `Feature::active('new-reports')` means "for the current tenant". Inside a tenant request that's the right answer. On the central domain, in Artisan commands and in queued jobs without a tenant, the scope is `null`.

Pennant handles `null` on purpose: if your resolver's type doesn't allow `null`, the feature simply returns `false` (and fires an `UnexpectedNullScopeEncountered` event). If you do want a value for the central app, make the type nullable, as `AiSummaries` does above.

Use the user as the scope only for truly personal things, like a new editor one person opted into. Half a team seeing a different screen than the other half makes support tickets very confusing.

## Plan-based features vs gradual rollouts

Here is the trap. Say you define a flag like this:

```php
Feature::define('api-access', fn (Tenant $tenant) => $tenant->plan === 'pro');
```

It works on day one. Then a tenant downgrades from Pro to Free, and still has API access. Pennant resolved `true` once, stored it, and never asks again.

There are two clean ways out. The first is to not use Pennant for plans at all. Check the plan directly, through your billing code or a permission, which is what plans are. We cover plan checks in [Laravel SaaS billing with Stripe](/blog/laravel-saas-stripe-billing.html).

The second is the `before()` method on a class-based feature. It runs in memory on every check, and if it returns anything other than `null`, Pennant uses that value for the request and skips the stored one. Nothing from `before()` is written to the table:

```php
#[Name('ai-summaries')]
class AiSummaries
{
    // Runs on every check. Never stored.
    public function before(?Tenant $tenant): mixed
    {
        if ($tenant?->plan === 'enterprise') {
            return true;
        }

        return null; // fall through to the stored rollout value
    }

    // Runs once per tenant. The result is stored.
    public function resolve(?Tenant $tenant): mixed
    {
        return $tenant === null ? false : Lottery::odds(1, 20);
    }
}
```

Enterprise tenants always get AI summaries and lose them the moment they downgrade. Everyone else is in a 1 in 20 beta. The plan rule lives in `before()`, the rollout in `resolve()`.

`before()` is also your kill switch. Return `false` from it when a config value says the feature is broken, and every tenant loses it until you fix the bug, without throwing away who had it.

## Where the features table lives in a multi-tenant app

With a database per tenant, this decision matters more than any other in this post. Look at the default store config:

```php
'database' => [
    'driver' => 'database',
    'connection' => null,
    'table' => 'features',
],
```

`connection => null` means "the default connection". With stancl's database bootstrapper, the default connection inside a tenant request is the tenant's database. So Pennant reads and writes `features` in whatever database is active right now. You have two options:

| | Central `features` table | One `features` table per tenant |
| --- | --- | --- |
| Config | `'connection' => env('DB_CONNECTION')` (your central connection) | Leave `connection` as `null` |
| Migration | The published one, run with `php artisan migrate` | Move it to your tenant migrations, run with `tenants:migrate` |
| Good scope | `Tenant` | Tenant users |
| Central admin can toggle a tenant | Directly, with `Feature::for($tenant)` | Only inside `$tenant->run()` |
| One query to see who has a flag | Yes | No, one per tenant database |

We'd pick the central table and scope by tenant. Your admin panel can turn a feature on for one workspace, you can see every tenant's value in one place, and `pennant:purge` cleans everything in one go.

There's one sharp edge with a central table. Pennant stores an Eloquent scope as the class name plus the key, like `App\Models\Tenant|42`. That's unique for tenants, because they all live in the central `tenants` table. It is not unique for users if central users and tenant users share the same `User` class: user 5 in tenant A, user 5 in tenant B and central user 5 all become `App\Models\User|5`. If you need user-level flags, keep those in per-tenant tables, or make sure user scopes can't collide.

## Checking flags in controllers and routes

In PHP, the checks read the way you'd expect:

```php
if (Feature::active(AiSummaries::class)) {
    // ...
}

Feature::when('new-reports',
    fn () => $this->reports->newVersion($request),
    fn () => $this->reports->legacyVersion($request),
);
```

To protect a whole route, use the `EnsureFeaturesAreActive` middleware:

```php
use Laravel\Pennant\Middleware\EnsureFeaturesAreActive;

Route::get('reports', [ReportController::class, 'index'])
    ->middleware(EnsureFeaturesAreActive::using('new-reports'))
    ->name('reports.index');
```

It checks the default scope, which is now the tenant. By default it returns a `400 Bad Request`, which isn't what an Inertia app wants to show. Change it once in a service provider:

```php
EnsureFeaturesAreActive::whenInactive(
    fn (Request $request, array $features) => to_route('dashboard')
);
```

## Sharing Laravel Pennant flags with Inertia

The frontend needs flags to hide buttons and menu items. Add a lazy shared prop in `HandleInertiaRequests`:

```php
'features' => fn (): array => tenant()
    ? Feature::for(tenant())->values([
        'new-reports',
        AiSummaries::class,
    ])
    : [],
```

`values()` returns an array keyed by feature name, so the class above shows up as `ai-summaries`. Rich values come through as they are, so a flag can be `'blue'` instead of `true`.

We list the flags explicitly instead of using `Feature::all()`, for two reasons. `all()` sends the name of every flag to every browser, including the ones for features you haven't announced. And class-based features only appear in `all()` once they've been checked in the current request, unless you call `Feature::discover()` in a service provider.

A small Vue composable keeps the templates tidy:

```ts
import { usePage } from '@inertiajs/vue3';

export function useFeature() {
    const page = usePage();

    const active = (name: string): boolean => {
        const value = page.props.features?.[name];

        return value !== undefined && value !== false;
    };

    return { active };
}
```

```vue
<script setup lang="ts">
import { useFeature } from '@/composables/useFeature';

const { active } = useFeature();
</script>

<template>
    <SidebarItem v-if="active('new-reports')" href="/reports">Reports</SidebarItem>
</template>
```

We treat any value other than `false` as active, because that's Pennant's rule for rich values. In React it's the same with `usePage().props.features` inside a `useFeature` hook.

Hiding a menu item is only cosmetic. Anyone can type `/reports` into the address bar, so keep the middleware on the route. The [Inertia v3 shared data docs](https://inertiajs.com/docs/v3/data-props/shared-data) explain how shared props are merged and when closures run.

## Rolling out, rolling back and cleaning up

You can change stored values from code, an admin action or Tinker:

```php
Feature::for($tenant)->activate('new-reports');     // one tenant gets it
Feature::for($tenant)->deactivate('new-reports');   // one tenant loses it
Feature::for($tenant)->forget('new-reports');       // resolve again on next check
Feature::activateForEveryone('new-reports');        // every stored value becomes true
```

`activateForEveryone()` only updates values that are already stored, so change the definition too. Otherwise tenants that never checked the flag still go through your Lottery.

When a feature is fully live, delete the flag. Remove the checks from the code, then purge the stored values:

```bash
php artisan pennant:purge new-reports
php artisan pennant:purge --except-registered
```

The second command removes everything except the features registered in your service providers, which makes it a good step for your deploy script. Pennant also fires an `UnknownFeatureResolved` event when code checks a feature that no longer exists. Log it, and you'll find the check you forgot to delete.

## Testing feature flags with Pest

In tests, redefine the feature with a fixed value at the start of the test. It overrides the real definition, Lottery and all:

```php
use App\Features\AiSummaries;
use Laravel\Pennant\Feature;

it('shows AI summaries when the flag is on', function () {
    Feature::define(AiSummaries::class, true);

    expect(Feature::value(AiSummaries::class))->toBeTrue();
});

it('redirects away from reports when the flag is off', function () {
    Feature::define('new-reports', false);

    $user = User::factory()->create(); // inside your tenant test setup

    $this->actingAs($user)->get('/reports')->assertRedirect('/dashboard');
});
```

Set `<env name="PENNANT_STORE" value="array"/>` in `phpunit.xml`, so tests never touch the `features` table. Running requests inside a tenant in Pest is a topic of its own, covered in [testing a multi-tenant Laravel app with Pest](/blog/test-multi-tenant-laravel-pest.html).

## Mistakes we see with Pennant in a SaaS

- **Plan checks stored as flags.** A downgrade doesn't take the feature away, because the old value is stored. Use `before()` or a real plan check.
- **The table on the wrong connection.** With `connection => null`, the same flag is stored in the central database from the admin panel and in the tenant database from the tenant app. Two truths, both wrong half the time.
- **Flags that are always off in jobs.** A queued job without a tenant has a `null` scope, so a non-nullable feature returns `false`. Pass the tenant with `Feature::for($tenant)`, or rely on stancl restoring the tenant before the job runs.
- **Expecting a fresh random result.** A Lottery runs once per scope. Re-checking won't reroll; `forget()` will.
- **Sending every flag to the browser.** List what the frontend needs.
- **Never deleting flags.** Every old flag doubles your code paths. Give each one an owner and a removal date.

## Frequently asked questions

### What is Laravel Pennant?

Pennant is Laravel's first-party feature flag package. You define features with a closure or a class, check them with `Feature::active()`, and Pennant stores each resolved value in an array or database store. It supports any scope, such as a user, a team or a tenant, and rich values beyond `true` and `false`.

### How do I use Laravel Pennant feature flags per tenant?

Pass the tenant as the scope with `Feature::for($tenant)`, or make it the default with `Feature::resolveScopeUsing(fn ($driver) => tenant())`. In a database-per-tenant app, point Pennant's `database` store at your central connection so all tenants' values live in one table.

### Should I use feature flags for subscription plans?

Not on their own. Pennant stores the first value it resolves, so a stored plan flag survives a downgrade. Check plans directly, or put the plan rule in a class-based feature's `before()` method, which runs on every check and is never stored.

### How do I share Pennant flags with Inertia?

Add a shared prop in `HandleInertiaRequests` that returns `Feature::for(tenant())->values([...])` for the flags your frontend needs. Read it with `usePage().props.features` in Vue or React, and keep the `EnsureFeaturesAreActive` middleware on the routes as well.

## Feature flags in the SaaS Laravel kits

The [SaaS Laravel starter kits](/) don't ship Pennant, so there's no `features` table, flag or rollout screen in them today. What they do have is the place where flags plug in. `HandleInertiaRequests` already shares `auth.permissions`, `auth.isSuperAdmin` and the `menus` tree, so a `features` prop sits naturally next to them, and its type goes into `SharedData` in `resources/js/types/global.d.ts`. Menus are stored in the database, and `MenuService` hides items whose `permission` the user doesn't have. If you want flags in the sidebar, the cleanest addition is a nullable `feature` column on `menus` (in both the central and tenant migrations) and one extra check next to the permission check in `MenuService`.

Tenants are `App\Models\Tenant` in the central database, and central and tenant users share one `User` class, so we'd follow the advice above: pin Pennant's store to the central `DB_CONNECTION`, scope by tenant, and set the default scope in `AppServiceProvider`. Permissions stay what they are today, the answer to "is this user allowed?", and flags answer "is this tenant ready for it?". The [navigation and layouts docs](/docs/core/navigation-and-layouts.html) and [permission-aware menus](/blog/laravel-inertia-permission-menus.html) show how the menu tree is built, and [database-per-tenant multi-tenancy](/blog/multi-tenant-saas-laravel-database-per-tenant.html) explains the connection switching behind it.

<BlogPostCta title="Permissions and menus, ready for flags" text="SaaS Laravel ships permission-filtered database menus and typed shared Inertia props, so adding Pennant flags per tenant is a small, contained change." />
