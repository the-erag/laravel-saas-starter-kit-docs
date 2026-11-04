---
title: "Laravel SaaS Usage Limits: Enforce Plan Quotas per Tenant"
description: "Laravel SaaS usage limits per tenant: a plan limits config, a UsageLimitService with check and consume, race-safe counters, monthly resets and Inertia meters."
pageClass: blog-page
date: 2026-11-04
author: erag
category: saas
tags: [Billing, Quotas, Multi-Tenancy]
---

# Laravel SaaS Usage Limits: Enforce Plan Quotas for Every Tenant

<BlogPostMeta />

Almost every SaaS pricing page has numbers on it: "up to 5 users", "20 projects", "50,000 API calls a month". Those numbers only mean something if your app enforces them, and **Laravel SaaS usage limits** are harder than an `if` statement. Two requests can both squeeze through the last free slot. Monthly counters have to reset. And a customer who hits a limit should see a way to upgrade, not an error page.

In this post we build plan quotas for a multi-tenant Laravel app where the tenant is the customer: limits per plan in config, a `UsageLimitService` with `check()` and `consume()` that holds up under concurrent requests, monthly resets, Inertia usage meters and upgrade prompts people don't hate, plus two packages that do some of it for you. We use Laravel 13, Inertia v3 and stancl/tenancy.

## Usage limits vs feature flags vs rate limits

Three tools get mixed up here. They answer different questions:

| Tool | Question it answers | Example |
| --- | --- | --- |
| Feature flag | Is this feature on for this tenant? | "Exports are a Business feature" |
| Usage limit (quota) | How much of it may this tenant use? | "20 projects", "50,000 API calls a month" |
| Rate limit | How fast may someone call it? | "60 requests per minute" |

This post is about the middle row. For on/off features, use [Laravel Pennant feature flags](/blog/laravel-pennant-feature-flags.html). For protecting servers from bursts, use Laravel's built-in [rate limiting](https://laravel.com/docs/13.x/rate-limiting). A quota is a business rule tied to what the customer pays for, so it lives next to your plans.

## Two kinds of limits

The most useful idea in this post: plan limits come in two shapes, and they need different code.

| | Standing limits | Consumable quotas |
| --- | --- | --- |
| Examples | Max users, projects, storage | API calls, emails, AI credits per month |
| Current value | Count what exists right now | A counter that only goes up |
| Deleting something | Frees a slot | Gives nothing back |
| Resets | Never | Every period |
| Source of truth | Your tables (`count()` or `sum()`) | A usage counter table |

For a standing limit, don't keep a separate counter. The projects table already knows how many projects there are, and a counter can only drift from it. Storage is the exception: summing file sizes on every upload is slow, so track bytes as a running total and correct it with a nightly recount.

## Define limits per plan in config

Keep the numbers in one config file, next to the payment price IDs. If you read our [SaaS pricing guide](/blog/how-to-price-saas.html), this is the same `config/plans.php`, with more limits:

```php
// config/plans.php
return [
    'free' => [
        'stripe_price' => null,
        'limits' => ['users' => 3, 'projects' => 3, 'storage_bytes' => 500 * 1024 ** 2, 'api_calls' => 0, 'emails' => 500],
    ],
    'team' => [
        'stripe_price' => env('STRIPE_PRICE_TEAM'),
        'limits' => ['users' => 20, 'projects' => 50, 'storage_bytes' => 10 * 1024 ** 3, 'api_calls' => 50_000, 'emails' => 10_000],
    ],
    'business' => [
        'stripe_price' => env('STRIPE_PRICE_BUSINESS'),
        // null means unlimited
        'limits' => ['users' => null, 'projects' => null, 'storage_bytes' => 100 * 1024 ** 3, 'api_calls' => 500_000, 'emails' => 100_000],
    ],
];
```

Two rules make this safe: `null` means unlimited, and a metric missing from a plan means zero, so a typo never gives away free usage.

A small `PlanCatalog` class works out the tenant's plan: the price of its valid Cashier subscription, falling back to `free`, or a `plan` column if you sell plans by hand. The [Stripe billing post](/blog/laravel-saas-stripe-billing.html) covers the subscription side. Add per-tenant overrides early too, because sales will promise someone 30 users on the Team plan: an optional `limit_overrides` JSON value on the tenant, merged over the plan's limits.

## Where usage counters live

With database-per-tenant you can keep counters in each tenant database or in one central table. We use the central database: the plan and subscription already live there, your super admin can see every tenant's usage in one query, and webhooks, jobs and the scheduler can update counters without switching into a tenant.

```php
Schema::create('tenant_usages', function (Blueprint $table) {
    $table->id();
    $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
    $table->string('metric', 50);
    $table->string('period', 7); // "2026-11" for monthly quotas, "total" for storage
    $table->unsignedBigInteger('used')->default(0);
    $table->timestamps();

    $table->unique(['tenant_id', 'metric', 'period']);
});
```

Match `tenant_id` to your `tenants.id` type (stancl/tenancy uses string IDs by default). The `period` column is what makes monthly resets easy: each month gets a new row, and old rows stay as history.

## The UsageLimitService: check and consume

All limit logic goes into one service. Nothing else touches the counters.

```php
namespace Modules\Billing\Services;

use App\Models\Tenant;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Modules\Billing\Exceptions\QuotaExceededException;

final class UsageLimitService
{
    private const CONSUMABLE = ['api_calls', 'emails', 'storage_bytes'];

    public function __construct(
        private PlanCatalog $plans,
        private UsageCounters $counters, // counts users, projects, ... in the tenant database
    ) {}

    public function limit(Tenant $tenant, string $metric): ?int
    {
        $limits = $this->plans->forTenant($tenant)['limits'];

        return array_key_exists($metric, $limits) ? $limits[$metric] : 0;
    }

    public function used(Tenant $tenant, string $metric): int
    {
        if (! in_array($metric, self::CONSUMABLE, true)) {
            return $this->counters->count($tenant, $metric);
        }

        return (int) $this->row($tenant, $metric)->value('used');
    }

    /** On its own, only a soft check for the UI. Enforcement happens below. */
    public function check(Tenant $tenant, string $metric, int $amount = 1): bool
    {
        $limit = $this->limit($tenant, $metric);

        return $limit === null || $this->used($tenant, $metric) + $amount <= $limit;
    }

    private function table(): Builder
    {
        return DB::connection(config('tenancy.database.central_connection'))->table('tenant_usages');
    }

    private function row(Tenant $tenant, string $metric): Builder
    {
        return $this->table()
            ->where('tenant_id', $tenant->getKey())
            ->where('metric', $metric)
            ->where('period', $this->period($metric));
    }

    private function period(string $metric): string
    {
        return $metric === 'storage_bytes' ? 'total' : now()->format('Y-m');
    }
}
```

`UsageCounters` has one `count()` method that runs `$tenant->run(fn () => Project::query()->count())` and similar queries for each standing metric. `check()` is for showing or hiding an "Add project" button. Another request can take the last slot between the check and the action, so enforcement needs the next section.

## Race conditions: making limits hold under load

The classic bug is check-then-act. Two requests arrive together, both read "49 of 50 used", both pass, and the tenant ends up at 51. With an API customer sending parallel requests, this happens every day.

### Consumable quotas: one atomic update

For counters, let the database do the check and the increment in a single statement. The `UPDATE` only matches the row if there's room left, so two requests can never both take the last unit:

```php
public function consume(Tenant $tenant, string $metric, int $amount = 1): void
{
    $limit = $this->limit($tenant, $metric);

    $this->table()->insertOrIgnore([
        'tenant_id' => $tenant->getKey(),
        'metric' => $metric,
        'period' => $this->period($metric),
        'used' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $updated = $this->row($tenant, $metric)
        ->when($limit !== null, fn (Builder $query) => $query->where('used', '<=', $limit - $amount))
        ->increment('used', $amount, ['updated_at' => now()]);

    if ($updated === 0) {
        throw new QuotaExceededException($metric, $limit);
    }
}

public function release(Tenant $tenant, string $metric, int $amount = 1): void
{
    $this->row($tenant, $metric)
        ->where('used', '>=', $amount)
        ->decrement('used', $amount, ['updated_at' => now()]);
}
```

`insertOrIgnore()` creates this period's row the first time, and the unique index makes a race to create it harmless. `increment()` returns the number of rows changed, so `0` means the limit was reached. Call `consume()` before the work and `release()` if it fails, so a failed email doesn't cost a credit. Storage uses the same pair: `consume($tenant, 'storage_bytes', $file->getSize())` before storing an upload, and `release()` when a file is deleted. For API calls, a small route middleware that calls `consume($tenant, 'api_calls')` before `$next($request)` keeps the quota out of every controller.

### Standing limits: lock, count, create

For "max 50 projects" there's no counter to update, so we lock instead. Locking the tenant's row in the central database turns the check and the insert into a queue of one:

```php
public function withinLimit(Tenant $tenant, string $metric, callable $create): mixed
{
    return DB::connection(config('tenancy.database.central_connection'))
        ->transaction(function () use ($tenant, $metric, $create) {
            Tenant::query()->whereKey($tenant->getKey())->lockForUpdate()->first();

            if (! $this->check($tenant, $metric)) {
                throw new QuotaExceededException($metric, $this->limit($tenant, $metric));
            }

            return $create();
        });
}
```

A project service then calls `$limits->withinLimit(tenant(), 'projects', fn () => Project::create($data))`. The second of two parallel requests waits for the first, then counts again and sees the real number. The lock covers one count and one insert, so it's cheap. We use the same pattern for seats in [Laravel per seat billing](/blog/laravel-cashier-per-seat-billing.html).

## Monthly resets with the scheduler

Because each month gets its own row, there's nothing to reset. On 1 December, `period()` returns `2026-12`, `consume()` creates a fresh row at zero, and November's row stays as history. No midnight reset job means no midnight reset job failing.

You still want the scheduler for three things:

```php
// routes/console.php
use Illuminate\Support\Facades\Schedule;

Schedule::command('usage:warn')->hourly()->onOneServer();
Schedule::command('usage:recount-storage')->dailyAt('02:00')->onOneServer();
Schedule::command('usage:prune --months=13')->monthlyOn(1, '03:00')->onOneServer();
```

- `usage:warn` finds tenants above 80% of a quota and notifies the owner once per period.
- `usage:recount-storage` adds up real file sizes per tenant and corrects the running total.
- `usage:prune` deletes counter rows older than you need. Keep at least a year if you show usage history.

If quotas follow the billing date instead ("your allowance renews on the 14th"), store the current period's start on the tenant from the renewal webhook and build the `period` key from it. Calendar months are simpler to explain and support, so we use them unless the pricing page says otherwise.

## Show usage meters in Inertia

People hit limits far less angrily when they could see them coming. Add a `summary()` method to the service that returns one row per metric: label, used and limit. Send it as a deferred prop on the billing or settings page, so the page renders straight away and the counts load just after:

```php
public function show(UsageLimitService $usage): Response
{
    return Inertia::render('billing/Show', [
        'plan' => $usage->planName(tenant()),
        'usage' => Inertia::defer(fn (): array => $usage->summary(tenant())),
    ]);
}
```

The Vue component is a few bars:

```vue
<script setup lang="ts">
import { Deferred } from '@inertiajs/vue3';

type UsageMeter = { metric: string; label: string; used: number; limit: number | null };

defineProps<{ usage?: UsageMeter[] }>();

const percent = (meter: UsageMeter): number =>
    meter.limit ? Math.min(100, Math.round((meter.used / meter.limit) * 100)) : 0;
</script>

<template>
    <Deferred data="usage">
        <template #fallback>
            <div class="h-16 animate-pulse rounded-md bg-muted" />
        </template>

        <div v-for="meter in usage" :key="meter.metric" class="space-y-1.5">
            <div class="flex justify-between text-sm">
                <span>{{ meter.label }}</span>
                <span class="text-muted-foreground">
                    {{ meter.used.toLocaleString() }} / {{ meter.limit?.toLocaleString() ?? 'Unlimited' }}
                </span>
            </div>
            <div class="h-2 rounded-full bg-muted">
                <div
                    class="h-2 rounded-full"
                    :class="percent(meter) >= 90 ? 'bg-destructive' : 'bg-primary'"
                    :style="{ width: `${percent(meter)}%` }"
                />
            </div>
        </div>
    </Deferred>
</template>
```

In React, `<Deferred data="usage" fallback={...}>` takes the fallback as a prop, and in Svelte 5 it's a `{#snippet fallback()}` block. The bar markup is the same. For a small "3 of 5 users" hint in the sidebar, share just that number as a lazy closure in `HandleInertiaRequests`. In a Livewire app, render the same bars in Blade from the same `summary()`.

## Friendly upgrade prompts

When `consume()` or `withinLimit()` throws, the exception decides what the user sees. Laravel calls an exception's `render()` method if it has one, so controllers stay clean:

```php
namespace Modules\Billing\Exceptions;

use Illuminate\Http\Request;
use Inertia\Inertia;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

final class QuotaExceededException extends RuntimeException
{
    public function __construct(public readonly string $metric, public readonly ?int $limit)
    {
        parent::__construct(__('You have reached your plan limit for :metric.', [
            'metric' => __("plans.metrics.{$metric}"),
        ]));
    }

    public function render(Request $request): Response
    {
        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json(['message' => $this->getMessage(), 'metric' => $this->metric], 429);
        }

        return Inertia::flash('upgrade', [
            'metric' => $this->metric,
            'limit' => $this->limit,
            'message' => $this->getMessage(),
        ])->back();
    }
}
```

On the frontend, listen for the `upgrade` flash key and open a dialog naming the plan that solves the problem, with one button to go there. Our post on [Inertia flash messages and toasts](/blog/inertia-flash-messages-toasts.html) shows the listener. Rules for wording and behaviour:

- **Say what happened and what fixes it.** "You've used all 50 projects on the Team plan. Business has unlimited projects." beats "Limit exceeded."
- **Warn before the wall.** A banner at 80% and an email at 90% turn a blocked customer into an upgrade.
- **Only block new things.** Reading, exporting and deleting existing data should always work.
- **Handle downgrades.** A tenant moving from Business to Team may have 70 projects. Keep them all, and block new ones until they're under 50.
- **Consider a soft limit for API quotas.** Letting usage run 10% over and warning afterwards is often kinder than cutting off an integration mid-month.

For JSON API clients, a 429 status with a clear message is a common choice.

## Laravel usage limit packages

If you'd rather not build this yourself, two maintained packages cover a lot of it. We checked both on Packagist and GitHub; at the time of writing each supports Laravel 12 and 13 on PHP 8.3+.

| Package | What it does well | Things to know |
| --- | --- | --- |
| [vimatech/laravel-quotas](https://github.com/vimatech-io/laravel-quotas) | Plans with features and limits mapped to Cashier Stripe or Paddle prices, atomic counters under a row lock, allowances that renew on the subscription date | Reads Cashier's local tables and never calls Stripe itself, so it's only as fresh as your webhooks |
| [nabilhassen/laravel-usage-limiter](https://github.com/nabilhassen/laravel-usage-limiter) | Limits per plan stored in the database, `useLimit()` and `unuseLimit()` on any model, reset frequencies with a scheduled command | Not tied to a billing provider; limits are database rows, not config |

Others exist, such as `zaber-dev/laravel-quota` for period budgets and `moneo/laravel-usage-limiter` for metering with overages (when we checked, the latter listed Laravel 11 and 12 only). Both packages in the table attach usage to a model with a trait, which in our setup is the `Tenant` model. In a database-per-tenant app, make sure their migrations run in the central database, next to the tenants table.

## Mistakes we see

- **Keeping counters for things you can count.** A `projects_count` column drifts the first time a delete fails. Count the table.
- **Check-then-act without a lock or an atomic update.** Fine in testing, broken under real traffic.
- **Treating a missing limit as unlimited.** Default to zero, and write `null` on purpose.
- **Checking limits in controllers.** Five controllers end up with five different rules. Use one service.
- **Blocking existing data after a downgrade.** Customers forgive a blocked "Create" button. They don't forgive losing access to their work.
- **Only enforcing in the frontend.** Hiding the button is a courtesy; the service is the rule.

## Frequently asked questions

### How do I limit usage per plan in a Laravel SaaS?

Put each plan's limits in a config file, work out the tenant's plan from its subscription, and route every limited action through one service. Count standing things like users and projects from their tables, and keep a period-based counter for consumables like API calls and emails.

### How do I stop two requests from exceeding a usage limit?

For counters, use a single conditional `UPDATE` that only increments when there's room left, and check how many rows it changed. For count-based limits, lock the tenant's row with `lockForUpdate()` inside a transaction, then count and create.

### How do I reset usage quotas every month in Laravel?

The simplest way is to store a period such as `2026-11` with each counter row. A new month starts with a new row at zero, so nothing has to be reset. Use the scheduler for warnings, cleanup and storage recounts instead.

### Should I use Laravel Pennant for plan limits?

Pennant is great for deciding whether a feature is on for a tenant, but it doesn't count usage. Use Pennant or a plan feature list for on/off features, and a usage service or a quota package for anything with a number attached.

## Adding usage limits to SaaS Laravel

SaaS Laravel doesn't include billing or plan quotas, so this is something you add. The kit gives you the parts it builds on: the `App\Models\Tenant` model in the central database, a separate database per tenant for the data you count (see the [multi-tenancy docs](/docs/core/multi-tenancy.html)), and a [module-based architecture](/docs/core/architecture.html) where a `Modules/Billing` module with `PlanCatalog` and `UsageLimitService` fits naturally. Existing services, such as the one in `Modules/User` that creates and invites users, call the limit service before creating anything, and a tenant permission like "View Billing" in `config/permissions/tenant/` decides who sees the usage page (see [users, roles and permissions](/docs/core/users-roles-permissions.html)).

<BlogPostCta title="A clean place for plans and quotas" text="SaaS Laravel gives you database-per-tenant multi-tenancy, a central tenant model and a modular Laravel 13 backend. Billing and quotas aren't included, so you shape them to your pricing." />
