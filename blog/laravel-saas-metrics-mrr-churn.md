---
title: "Laravel SaaS Metrics: Calculate MRR, Churn and Activation"
description: "Laravel SaaS metrics from your own data: calculate MRR, ARR, churned and expansion MRR, logo vs revenue churn and activation with daily snapshots."
pageClass: blog-page
date: 2026-11-04
author: erag
category: saas
tags: [Metrics, Billing, Analytics]
---

# Laravel SaaS Metrics: Calculate MRR, ARR and Churn from Your Own Data

<BlogPostMeta />

Sooner or later someone asks how the business is doing. Investors want MRR, you want to know whether last month's price change worked, and support wants to know who is about to leave. Your payment provider has some of these numbers, but it knows nothing about tenants, activation or customers you invoice by hand. **Laravel SaaS metrics** computed from your own data answer all of it in one place.

Below we calculate MRR, ARR, new, expansion, contraction and churned MRR, logo and revenue churn, active tenants and activation in a multi-tenant Laravel app, using a daily snapshot per tenant, a worked example, a super-admin dashboard with Inertia, and the traps: annual plans, trials, refunds and currencies. We use Laravel 13, Cashier for Stripe, Inertia v3 and stancl/tenancy.

## The SaaS metrics worth tracking

Definitions vary between tools, so the most important thing is that yours stay the same from month to month.

| Metric | What it means | Formula |
| --- | --- | --- |
| MRR | Recurring revenue per month right now | Sum of every paying tenant's monthly value |
| ARR | MRR as a yearly figure | MRR × 12 |
| New MRR | From tenants that started paying this period | Sum of their MRR |
| Expansion MRR | Existing tenants paying more | Sum of increases |
| Contraction MRR | Existing tenants paying less | Sum of decreases |
| Churned MRR | Tenants that stopped paying | Sum of their previous MRR |
| Reactivation MRR | Former customers who came back | Sum of their MRR |
| Logo churn | Share of customers lost | Churned tenants ÷ paying tenants at start |
| Gross revenue churn | Share of revenue lost | (Churned + contraction) ÷ MRR at start |
| Net revenue retention | Revenue kept, including growth | (Start + expansion − contraction − churned) ÷ start |
| ARPA | Average revenue per account | MRR ÷ paying tenants |
| LTV (estimate) | Revenue you can expect per account | ARPA ÷ monthly logo churn |
| Activation rate | New tenants that reached first value | Activated ÷ signed up, per cohort |

All of these follow from one fact: **what each tenant was paying per month on each day**. If you store that, every other number is a query.

## Why calculate MRR in Laravel yourself

Stripe's Billing analytics already shows MRR and churn, and its [metric definitions](https://docs.stripe.com/billing/subscriptions/analytics) are a good reference. Tools such as ChartMogul and Baremetrics work across providers. Use them, but your own numbers can also join revenue with product data ("churned tenants that never invited a teammate"), include customers billed by bank transfer, combine Stripe and Paddle, and sit next to the tenants in your admin area. Build your own and check it against the provider's dashboard for a few months. If they disagree, someone has a definition problem worth finding.

## Where the numbers come from

In a database-per-tenant app, data lives in two kinds of places, and metrics should only read one of them:

| Data | Lives in | Used for |
| --- | --- | --- |
| Tenants, sign-up dates, status | Central `tenants` table | Counts, cohorts, activation |
| Subscriptions and items | Central Cashier tables, kept current by webhooks | MRR |
| Prices and intervals | Your config (Cashier doesn't store amounts) | Normalising to monthly |
| Product usage | Each tenant database | Activation and activity |

Never build a dashboard that loops over every tenant database. **Push** the few product facts you need to the central database instead: `activated_at` when a tenant reaches first value, and `last_active_at`, updated at most once an hour. Both become custom columns on the tenant with a `datetime` cast (with stancl/tenancy, add them to `getCustomColumns()`, or they end up in the `data` JSON column).

Provider webhooks keep the subscription tables current; if they fail, your MRR is wrong. See [Laravel Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing.html) for the setup.

## Normalise every subscription to monthly

Cashier's `subscriptions` and `subscription_items` tables store the Stripe price ID and the quantity, but not the amount. Keep a small price catalog in config:

```php
// config/billing.php
return [
    'base_currency' => 'usd',
    'prices' => [
        'price_team_monthly' => ['plan' => 'team', 'amount' => 1200, 'currency' => 'usd', 'interval' => 'month'],
        'price_team_yearly' => ['plan' => 'team', 'amount' => 12000, 'currency' => 'usd', 'interval' => 'year'],
    ],
];
```

Then one class turns a tenant into a monthly amount in cents:

```php
namespace Modules\Metrics\Services;

use App\Models\Tenant;
use Laravel\Cashier\SubscriptionItem;
use RuntimeException;

final class MrrCalculator
{
    /** Monthly recurring value of the tenant's subscription, in cents. */
    public function forTenant(Tenant $tenant): int
    {
        $subscription = $tenant->subscription('default');

        if (! $subscription || ! in_array($subscription->stripe_status, ['active', 'past_due'], true)) {
            return 0; // no subscription, trialing, canceled, unpaid or incomplete
        }

        return $subscription->items->sum(
            fn (SubscriptionItem $item): int => $this->monthly($item->stripe_price, $item->quantity ?? 1),
        );
    }

    private function monthly(string $priceId, int $quantity): int
    {
        $price = config('billing.prices')[$priceId]
            ?? throw new RuntimeException("Unknown price [{$priceId}] in config/billing.php");

        $total = $price['amount'] * $quantity;

        return (int) round(match ($price['interval']) {
            'year' => $total / 12,
            'month' => $total,
            'week' => $total * 52 / 12,
        });
    }
}
```

These decisions match how Stripe defines MRR:

- **Trials are excluded.** A `trialing` subscription is worth nothing until it converts.
- **`past_due` is included.** Stripe is still retrying the card. If the subscription ends up `unpaid` or canceled, it drops out and shows as churn.
- **A cancellation at period end still counts** until the subscription ends, because Stripe keeps it `active` until then.
- **Unknown prices throw.** A silent zero would hide a missing config entry for months.

For tenants billed by hand, use a `manual_mrr_cents` column when there's no subscription.

## A daily snapshot table

MRR "right now" is easy. Movements need history, so we snapshot every tenant once a day:

```php
Schema::create('tenant_metric_snapshots', function (Blueprint $table) {
    $table->id();
    $table->date('date');
    $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
    $table->string('plan')->nullable();
    $table->unsignedInteger('mrr_cents')->default(0);
    $table->boolean('activated')->default(false);
    $table->boolean('active_30d')->default(false);
    $table->timestamps();

    $table->unique(['date', 'tenant_id']);
});
```

Even 2,000 tenants for five years stays under four million narrow rows. Store amounts as integer cents, never floats. Think twice about `cascadeOnDelete()`: deleting a tenant's history rewrites last year's churn, so many teams keep snapshots and drop the foreign key.

## The scheduled snapshot command

A service writes today's rows, and an Artisan command calls it:

```php
final class SnapshotService
{
    public function __construct(private MrrCalculator $mrr) {}

    public function capture(CarbonImmutable $date): void
    {
        Tenant::query()
            ->with('subscriptions.items')
            ->chunkById(500, function ($tenants) use ($date): void {
                TenantMetricSnapshot::query()->upsert(
                    $tenants->map(fn (Tenant $tenant): array => [
                        'date' => $date->toDateString(),
                        'tenant_id' => $tenant->getKey(),
                        'plan' => $tenant->subscription('default')?->stripe_price,
                        'mrr_cents' => $this->mrr->forTenant($tenant),
                        'activated' => $tenant->activated_at !== null,
                        'active_30d' => $tenant->last_active_at?->isAfter($date->subDays(30)) ?? false,
                    ])->all(),
                    uniqueBy: ['date', 'tenant_id'],
                    update: ['plan', 'mrr_cents', 'activated', 'active_30d'],
                );
            });
    }
}
```

`with('subscriptions.items')` avoids an N+1, because Cashier's `subscription()` reads the loaded relation, and `upsert()` makes a second run on the same day harmless. Map the price ID to a plan key if you want "MRR by plan" charts. Schedule it just after midnight UTC:

```php
// routes/console.php
Schedule::command('metrics:snapshot')->dailyAt('00:30')->onOneServer();
```

On day one you can only snapshot "now". If you need older history, backfill it roughly from your provider's invoice data.

## Classify MRR movements

To get new, expansion, contraction, churned and reactivation MRR for a period, compare each tenant's MRR on the first snapshot with the last:

```php
/** @return array{new: int, reactivation: int, expansion: int, contraction: int, churned: int} */
public function movements(CarbonImmutable $from, CarbonImmutable $to): array
{
    $start = $this->mrrOn($from); // [tenant_id => cents]
    $end = $this->mrrOn($to);
    $paidBefore = $this->tenantsThatPaidBefore($from); // [tenant_id => true]

    $moves = ['new' => 0, 'reactivation' => 0, 'expansion' => 0, 'contraction' => 0, 'churned' => 0];

    foreach (array_keys($start + $end) as $tenantId) {
        $before = $start[$tenantId] ?? 0;
        $after = $end[$tenantId] ?? 0;

        if ($before === 0 && $after > 0) {
            $moves[isset($paidBefore[$tenantId]) ? 'reactivation' : 'new'] += $after;
        } elseif ($before > 0 && $after === 0) {
            $moves['churned'] += $before;
        } elseif ($after > $before) {
            $moves['expansion'] += $after - $before;
        } elseif ($after < $before) {
            $moves['contraction'] += $before - $after;
        }
    }

    return $moves;
}
```

`mrrOn()` is a `pluck('mrr_cents', 'tenant_id')` for one date, cast to integers, and `tenantsThatPaidBefore()` finds tenants with any positive snapshot before the period. One check must always hold: **start + new + reactivation + expansion − contraction − churned = end**.

## A worked example

Seven tenants, comparing 31 October with 30 November. Tenant C pays 2,400 dollars a year, which is 200 a month.

| Tenant | 31 Oct | 30 Nov | Movement |
| --- | ---: | ---: | --- |
| A | $200 | $200 | None |
| B | $120 | $180 | Expansion +$60 |
| C | $200 | $200 | None (annual) |
| D | $100 | $40 | Contraction −$60 |
| E | $150 | $0 | Churned −$150 |
| F | $0 | $90 | New +$90 |
| G | $0 | $80 | Reactivation +$80 (left in August) |
| **Total MRR** | **$770** | **$790** | |

From these rows:

| Metric | Calculation | Result |
| --- | --- | ---: |
| MRR | End of November | $790 |
| ARR | 790 × 12 | $9,480 |
| Net new MRR | 90 + 80 + 60 − 60 − 150 | +$20 |
| Logo churn | 1 churned ÷ 5 paying at start | 20% |
| Gross revenue churn | (150 + 60) ÷ 770 | 27.3% |
| Net revenue churn | (150 + 60 − 60) ÷ 770 | 19.5% |
| Net revenue retention | (770 + 60 − 60 − 150) ÷ 770 | 80.5% |
| ARPA | 790 ÷ 6 paying tenants | $131.67 |

With seven tenants, one cancellation is 20% logo churn, which is why we'd report churn monthly but judge it over a rolling three or six months.

## Logo churn vs revenue churn

**Logo churn** counts customers: ten tiny tenants leaving hurts it as much as ten big ones. **Revenue churn** counts money: one large tenant can outweigh ten small ones. High logo churn with low revenue churn means you're losing small customers and keeping big ones, which may be fine. Revenue churn above logo churn means your biggest customers are leaving or downgrading, which needs attention now. When expansion beats churn plus contraction, net revenue churn goes negative and net revenue retention passes 100%: existing customers grow revenue without a single new sign-up.

Stripe's subscriber churn rate divides by subscribers at the start plus new subscribers, so it differs slightly from the simple version above. Neither is wrong. Pick one and write it next to the chart.

## Active tenants and activation rate

Revenue lags behind usage: a tenant that stopped logging in three weeks ago still pays today, but maybe not in two months. Set `activated_at` when the tenant reaches your first-value moment, such as the first project with two teammates. Because the stancl tenant model uses the central connection, a one-line `$tenant->update(['activated_at' => now()])` in an `ActivationService` writes to the central database even inside a tenant request. Only set it when it's still `null`.

Measure activation per sign-up cohort: of the tenants created in October, how many activated within 14 days? Count active tenants as those with `last_active_at` in the last 30 days. A growing gap between "paying" and "active" is your churn forecast. Our [SaaS onboarding guide](/blog/laravel-saas-onboarding-flow.html) covers defining first value.

## A super-admin metrics dashboard with Inertia

The dashboard is a central-context page for your own team, never a tenant page. Protect the route with a central permission such as "View Metrics", and keep the controller thin:

```php
final class MetricsController
{
    public function __invoke(MetricsService $metrics): Response
    {
        $month = CarbonImmutable::now()->subMonthNoOverflow();

        return Inertia::render('metrics/Index', [
            'summary' => $metrics->summary($month->startOfMonth(), $month->endOfMonth()),
            'mrrSeries' => Inertia::defer(fn (): array => $metrics->mrrByMonth(months: 12)),
        ]);
    }
}
```

`summary()` runs a handful of indexed queries on the snapshot table. The 12-month series is deferred, so the page appears immediately and the chart fills in after. Cache both with `Cache::remember()`, since snapshots change once a day.

```vue
<script setup lang="ts">
import { Deferred } from '@inertiajs/vue3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

defineProps<{ summary: { mrr: number; nrr: number }; mrrSeries?: { month: string; mrr: number }[] }>();

const money = (cents: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
</script>

<template>
    <div class="space-y-6">
        <Card>
            <CardHeader><CardTitle class="text-sm">MRR</CardTitle></CardHeader>
            <CardContent class="text-2xl font-semibold">{{ money(summary.mrr) }}</CardContent>
        </Card>
        <!-- ARR, net new MRR, logo churn and NRR use the same card -->

        <Deferred data="mrrSeries">
            <template #fallback><div class="h-64 animate-pulse rounded-xl bg-muted" /></template>
            <MrrChart :points="mrrSeries ?? []" />
        </Deferred>
    </div>
</template>
```

React and Svelte follow the same shape, with a `fallback` prop (React) or snippet (Svelte) on `<Deferred>`. Any chart library works for `MrrChart`; a stacked bar of the five movements per month is the most useful chart here.

## Caveats: annual plans, trials, refunds and currencies

- **Annual plans** count as one twelfth every month. The full payment is cash, not recurring revenue.
- **Refunds** reduce cash, not MRR, unless the subscription is also canceled. Track them on their own from the `charge.refunded` webhook.
- **Discounts**: a permanent discount should lower MRR, a one-off coupon usually shouldn't. Cashier's discount methods call Stripe, so keep discount data on your side for the daily loop.
- **Taxes and usage-based charges** stay out of MRR, as in Stripe's definition.
- **Currencies**: if you sell in several, add a `currency` column to the snapshot, keep MRR in the tenant's currency there, and convert to `base_currency` with one fixed rate per month when reporting. Daily rates make MRR move when nothing happened.
- **Time zones**: define days and months in UTC. Provider dashboards may use your account's time zone, so month-boundary totals can differ slightly.

## Mistakes we see

- **Calculating history from the current subscriptions table.** It only knows the present. Without snapshots you can't tell last month's upgrade from a new customer.
- **Querying every tenant database from the dashboard.** Push the facts you need to the central database.
- **Floats for money.** Integer cents everywhere, formatted only in the view.
- **Changing definitions quietly.** It makes last year incomparable.

## Frequently asked questions

### How do I calculate MRR in Laravel?

Take every active or past-due subscription, look up each item's price and interval, multiply by the quantity and convert to monthly, dividing annual prices by 12. Exclude trials, taxes and usage-based charges and add up the cents. A daily snapshot per tenant gives you the history for growth and churn.

### How do I calculate SaaS churn rate in Laravel?

For logo churn, divide the tenants that stopped paying during the period by the paying tenants at the start. For revenue churn, divide churned plus contraction MRR by the MRR at the start. Both come from comparing two daily snapshots.

### Is there a Laravel package for SaaS metrics?

A few exist, such as `plusinfolab/cashier-saas-metrics` for MRR, churn, LTV and cohorts. Check its supported versions first: when we looked, it listed Laravel 11 and 12. A snapshot table of your own is not much code and lets you join revenue with tenant and product data.

### Should canceled subscriptions still count towards MRR?

Count them until they actually end. A subscription canceled at period end is paid for the current period, so it stays in MRR until it ends and then shows as churned MRR. Track scheduled cancellations separately as an early warning.

## Adding SaaS metrics to SaaS Laravel

SaaS Laravel doesn't include billing or a metrics dashboard, so this is something you add on top. Tenants live in the central `tenants` table with their sign-up dates, the super-admin tenant list already shows counts per [workspace status](/docs/core/multi-tenancy.html#workspace-status), and central and tenant contexts have separate guards. We'd build this as a `Modules/Metrics` module following the [module-based architecture](/docs/core/architecture.html), with a central permission such as "View Metrics" in `config/permissions/` (see [users, roles and permissions](/docs/core/users-roles-permissions.html)) and the snapshot command in the scheduler. Our guides to [Laravel per seat billing](/blog/laravel-cashier-per-seat-billing.html) and [Laravel SaaS usage limits](/blog/laravel-saas-usage-limits.html) feed straight into these numbers.

<BlogPostCta title="A central database ready for your metrics" text="SaaS Laravel gives you a central tenants table, a super-admin area and a modular Laravel 13 backend. Billing and metrics dashboards aren't included, so you build the numbers your business needs." />
