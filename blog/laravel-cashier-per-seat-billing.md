---
title: "Laravel Per Seat Billing: Stripe Quantities with Cashier"
description: "Laravel per seat billing with Cashier and Stripe: one price, quantity = users, seat counts from the tenant database, proration, minimum seats and webhooks."
pageClass: blog-page
date: 2026-11-04
author: erag
category: saas
tags: [Billing, Stripe, Cashier]
---

# Laravel Per Seat Billing: Charge Each Tenant for Every User with Cashier

<BlogPostMeta />

Per-user pricing is the most common model in B2B SaaS: a workspace pays, say, 12 dollars a month for every person in it. The idea is simple, but **Laravel per seat billing** hides a lot of small decisions. What counts as a seat? What happens to the bill when someone joins on day 20? Who stops a workspace from going past its plan's limit? And how do you keep Stripe's number and your app's number the same?

In this post we build per-seat billing with Laravel Cashier for Stripe in a multi-tenant app where the tenant is the customer. We use one Stripe price with a quantity, count seats from the tenant's own database, pick a proration strategy, enforce minimum and maximum seats, and keep everything in sync with webhooks. We use Cashier 16 and Laravel 13. We won't repeat the basic Cashier setup here: making the tenant billable, Checkout and the webhook route are all covered in [Laravel Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing.html).

## How per-seat pricing works in Stripe

Stripe has no special "per seat" object. A per-seat plan is an ordinary recurring price where one unit means one user, and the subscription item carries a `quantity`. Twelve users means quantity 12 (see Stripe's [per-seat pricing guide](https://docs.stripe.com/subscriptions/pricing-models/per-seat-pricing)). So you don't need a price for every team size, just one price per plan and interval, and a number that follows your user count.

| Pricing model | Stripe setup | What changes when a user is added |
| --- | --- | --- |
| Flat rate | One price, quantity 1 | Nothing |
| Per seat | One price per unit, quantity = seats | The quantity |
| Tiered per seat | One price with graduated or volume tiers | The quantity (Stripe applies the tier) |
| Base fee plus seats | Two prices on one subscription | The quantity of the seat price only |

Tiered prices give you volume discounts, such as cheaper seats after the first 20. Your Laravel code doesn't change: you still send a quantity, and Stripe applies the tiers.

## Two ways to sell seats

Before writing code, decide which of these two models you're building. They need different checks.

| | Pay for what you use | Buy seats up front |
| --- | --- | --- |
| Quantity follows | The real number of users | A number the customer chooses |
| Inviting a user | Raises the bill automatically | Allowed only while a free seat is left |
| Removing a user | Lowers the bill | Leaves an empty, paid seat |
| Who changes the quantity | Your app | The customer, on a billing page |
| Good for | Self-serve products, small teams | Sales-led deals, annual contracts |

We build "pay for what you use" below. The seat check works for both: in the second model, the limit is simply the quantity the customer bought.

## Decide what counts as a seat

The seat counter, the invite screen and the pricing page all need the same answer, so write it down once:

- **Invited but not yet accepted:** counted. Otherwise people invite 50 users "for free" and accept later.
- **Deactivated users:** not counted, if your app can deactivate people without deleting them.
- **Your own support accounts:** never counted.
- **The owner:** counted. Every human who can log in is a seat.

## Count seats from the tenant database

With database-per-tenant, users live in each tenant's own database, while the billing data lives in the central database on the tenant model. A small service bridges the two with stancl/tenancy's `$tenant->run()`, which switches into the tenant's database, runs the callback, returns its result and switches back:

```php
namespace Modules\Billing\Services;

use App\Models\Tenant;
use App\Models\User;

final class SeatCounter
{
    public function count(Tenant $tenant): int
    {
        return $tenant->run(fn (): int => User::query()
            ->whereNull('deactivated_at') // only if you support deactivating users
            ->count());
    }
}
```

This works from a tenant request, a queued job or a webhook in the central context. Don't cache the number: it's a cheap `count()`, and a stale seat count is exactly how billing drifts.

## Plans, minimum seats and maximum seats

Keep the plan rules in config next to the Stripe price IDs:

```php
// config/plans.php
return [
    'team' => [
        'stripe_price' => env('STRIPE_PRICE_TEAM_SEAT'),
        'min_seats' => 3,
        'max_seats' => 50,
    ],
    'business' => [
        'stripe_price' => env('STRIPE_PRICE_BUSINESS_SEAT'),
        'min_seats' => 5,
        'max_seats' => null, // no limit
    ],
];
```

A minimum seat count stops a 1-user workspace from sitting on a plan built for teams. The billable quantity is then `max(real users, min_seats)`. Say so on the pricing page ("from 3 seats") so the first invoice is no surprise.

## Start the subscription with the right quantity

When the tenant subscribes, send the current seat count with the subscription. Cashier's subscription builder has a `quantity()` method, and it works with Checkout too:

```php
final class SeatBillingService
{
    public function __construct(
        private SeatCounter $counter,
        private PlanCatalog $plans,
    ) {}

    public function checkoutUrl(Tenant $tenant, string $planKey): string
    {
        $plan = $this->plans->get($planKey);

        return $tenant->newSubscription('default', $plan['stripe_price'])
            ->quantity($this->billableSeats($tenant, $plan))
            ->checkout([
                'success_url' => route('billing.show'),
                'cancel_url' => route('billing.show'),
            ])->url;
    }

    public function billableSeats(Tenant $tenant, array $plan): int
    {
        return max($this->counter->count($tenant), $plan['min_seats']);
    }
}
```

`PlanCatalog` is a tiny class that reads `config/plans.php` and can also find a plan by its Stripe price ID. The controller stays the same as in the [Stripe billing post](/blog/laravel-saas-stripe-billing.html): validate the plan key in a Form Request, call the service and return `Inertia::location($url)`. If you sell monthly and yearly billing, give each plan two seat prices, one per interval, and map both back to the same plan.

### A base fee plus seats

Some products charge a flat platform fee and then a price per user. In Stripe that's two prices on one subscription. Cashier takes an array of prices, and `quantity()` accepts the price it applies to as a second argument:

```php
$tenant->newSubscription('default', [$plan['base_price'], $plan['stripe_price']])
    ->quantity($seats, $plan['stripe_price'])
    ->checkout([...]);
```

The base price keeps a quantity of 1. From now on, every quantity call for this subscription needs the seat price as its second argument, which we come back to below.

## Laravel Cashier per seat methods

These are Cashier's methods for changing the quantity of an existing subscription, checked against the Cashier 16 source and the [subscription quantity docs](https://laravel.com/docs/13.x/billing#subscription-quantity):

| Method | What it does |
| --- | --- |
| `updateQuantity(10)` | Sets the quantity to an exact number |
| `incrementQuantity()` / `incrementQuantity(5)` | Adds 1 (or 5) to the current quantity |
| `decrementQuantity()` / `decrementQuantity(5)` | Subtracts, but never goes below 1 |
| `incrementAndInvoice()` | Adds seats and invoices the prorated amount right away |
| `noProrate()` | Chain before a change to skip proration |
| `alwaysInvoice()` | Chain before a change to invoice it immediately |
| `prorate()` | Back to the default: prorations on the next invoice |

Details worth knowing:

- Each call goes to Stripe synchronously, then updates the local `subscriptions` and `subscription_items` rows.
- With more than one price on the subscription, pass the seat price as the second argument, `updateQuantity(10, 'price_seat')`, or Cashier throws.
- Cashier refuses to change an `incomplete` subscription (`SubscriptionUpdateFailure`).
- If an immediate invoice fails or needs 3D Secure, Cashier can throw `Laravel\Cashier\Exceptions\IncompletePayment`. Catch it and send the owner to the payment page.

We sync with `updateQuantity()`, not increment and decrement. An exact number is idempotent: if a job runs twice or one is lost, the next run still sets the right value.

## Choose a proration strategy

When the quantity changes mid-period, you decide what happens to the money. Cashier gives you three choices:

| Strategy | Cashier call | What the customer sees |
| --- | --- | --- |
| Prorate (default) | `updateQuantity($n)` | A prorated line on the next invoice |
| Invoice now | `alwaysInvoice()->updateQuantity($n)` | A charge today for the rest of the period |
| No proration | `noProrate()->updateQuantity($n)` | The new quantity applies from the next renewal |

Our usual setup:

- **Adding seats, monthly plan:** prorate on the next invoice. The amounts are small, and one invoice a month is easier to read.
- **Adding seats, annual plan:** invoice now. Otherwise 20 seats added in month 2 become a large surprise invoice ten months later.
- **Removing seats:** no proration. The seat stays paid until renewal, which customers expect, and nobody can remove and re-add users to game the bill.

## Sync the quantity when users change

The sync method compares the real seat count with Stripe's quantity and only calls Stripe when they differ:

```php
public function sync(Tenant $tenant): void
{
    $subscription = $tenant->subscription('default');

    if (! $subscription?->valid()) {
        return;
    }

    $plan = $this->plans->forPrice($subscription->stripe_price);
    $seats = $this->billableSeats($tenant, $plan);

    if ($seats === $subscription->quantity) {
        return;
    }

    if ($seats > $subscription->quantity) {
        $subscription->updateQuantity($seats); // or alwaysInvoice()->updateQuantity() on annual plans
    } else {
        $subscription->noProrate()->updateQuantity($seats);
    }
}
```

With a base fee plus seats, the subscription's own `quantity` column is `null`. Read the seat item instead with `$subscription->findItemOrFail($plan['stripe_price'])->quantity`, and pass the same price to `updateQuantity()`.

Run it from a queued job, so a slow Stripe call never holds up the invite screen:

```php
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

final class SyncTenantSeats implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $tenantId) {}

    public function handle(SeatBillingService $billing): void
    {
        $billing->sync(Tenant::findOrFail($this->tenantId));
    }
}
```

Dispatch it from your user service after a user is created, invited, deactivated or deleted:

```php
SyncTenantSeats::dispatch(tenant()->getKey())->afterCommit();
```

`afterCommit()` waits until the new user is really saved. We pass the tenant ID explicitly and the job reads the central database, so it doesn't depend on tenant-aware queues (see [queued jobs in a multi-tenant Laravel app](/blog/laravel-multi-tenant-queues.html)).

On a trial, the same code runs. Changing the quantity during a trial costs nothing, and the first real invoice uses the right number.

## Check the seat limit before inviting

The plan's `max_seats` has to be enforced in your app. Stripe will happily bill 500 seats on a plan you meant to cap at 50. The check belongs in the service that creates users, before anything is saved:

```php
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class SeatGuard
{
    public function __construct(
        private SeatCounter $counter,
        private PlanCatalog $plans,
    ) {}

    /**
     * @template T
     * @param  callable(): T  $create
     * @return T
     */
    public function withFreeSeat(Tenant $tenant, callable $create): mixed
    {
        $central = config('tenancy.database.central_connection');

        return DB::connection($central)->transaction(function () use ($tenant, $create) {
            // Lock this tenant's row so two invites can't both take the last seat.
            Tenant::query()->whereKey($tenant->getKey())->lockForUpdate()->first();

            $max = $this->plans->forTenant($tenant)['max_seats'];

            if ($max !== null && $this->counter->count($tenant) >= $max) {
                throw ValidationException::withMessages([
                    'email' => __('Your plan includes up to :max users. Upgrade to invite more.', ['max' => $max]),
                ]);
            }

            return $create();
        });
    }
}
```

The row lock matters. Without it, two admins inviting at the same moment both see 49 users and both invites go through. With it, the second request waits for the first and then sees 50.

A `ValidationException` makes Inertia show the message under the email field like any form error. Put an "Upgrade plan" link next to it, never a dead end. In the "buy seats up front" model, swap `$max` for `$subscription->quantity`.

## Webhooks keep Stripe and your app in sync

Your app changes the quantity most of the time, but not always. Someone on your team might edit the subscription in the Stripe dashboard, or a customer might change it in the billing portal. Cashier's webhook handler for `customer.subscription.updated` already writes the new quantity into the local `subscriptions` and `subscription_items` tables, so Cashier's own data stays correct.

What Cashier can't know is whether that quantity still matches your users. Two habits close the gap:

1. **Turn off quantity changes in the Stripe customer portal** if your app owns the seat count. Let the portal handle cards, invoices and cancellation, and keep seat changes inside your app.
2. **Run a daily reconcile.** A scheduled command that calls `sync()` for every subscribed tenant catches anything that slipped through, such as a failed job or a manual change in the dashboard:

```php
// routes/console.php
use Illuminate\Support\Facades\Schedule;

Schedule::command('billing:sync-seats')->dailyAt('03:00')->onOneServer();
```

The command dispatches `SyncTenantSeats` for every subscribed tenant. To react immediately instead, listen for `Laravel\Cashier\Events\WebhookHandled` and dispatch the same job when `$event->payload['type']` is `customer.subscription.updated`. Our [multi-tenant scheduler guide](/blog/laravel-multi-tenant-scheduled-tasks.html) covers running work for many tenants.

## Per seat billing with Paddle

Cashier Paddle follows the same shape. Its `Subscription` model has `incrementQuantity()`, `decrementQuantity()`, `updateQuantity()` and `incrementAndInvoice()`, with proration methods such as `prorate()`, `noProrate()`, `prorateImmediately()` and `doNotBill()`. The billing behaviour comes from Paddle, though, so check the Cashier Paddle docs before copying the strategy table above. Paddle is also a merchant of record that handles sales tax; our [Stripe vs Paddle vs Lemon Squeezy comparison](/blog/stripe-vs-paddle-vs-lemon-squeezy-laravel.html) explains when that's worth it.

## Mistakes we see

- **Using increment and decrement for syncing.** One missed job and the count is wrong forever. Set the exact number with `updateQuantity()`.
- **Calling Stripe inside the invite request.** If Stripe is slow, inviting a colleague is slow. Queue the sync.
- **Forgetting the seat price ID on multi-price subscriptions.** With a base fee plus seats, every quantity call needs the seat price as its second argument.
- **No lock on the seat check.** Two quick invites can both take the last seat.
- **Letting the portal change quantities** while your app also changes them. Pick one owner.

## Frequently asked questions

### How do I do per seat billing with Laravel Cashier?

Create one recurring Stripe price per plan where one unit is one user. Start the subscription with `->quantity($seats)`, and call `updateQuantity()` on the subscription whenever users are added or removed. Count the seats from your users table each time, not from a stored number.

### Does decrementQuantity ever set the quantity to zero?

No. Cashier's `decrementQuantity()` never goes below 1 on a single-price subscription. If a workspace should stop paying, cancel the subscription instead of lowering the quantity to zero.

### Should I prorate when a seat is removed?

Usually not. Most SaaS products keep a removed seat paid until the next renewal, which you get with `noProrate()->updateQuantity()`. Prorating additions is common, and invoicing them immediately makes sense on annual plans.

### Does Laravel Spark support per-seat pricing?

Yes, Spark's docs describe per-seat plans. Spark is a paid billing portal built on Cashier. If you build your own billing pages, or bill a tenant whose users live in a separate database, Cashier's quantity methods give you the same result with full control.

## Adding per-seat billing to SaaS Laravel

SaaS Laravel doesn't include billing, so you choose the provider and the pricing model. The pieces you need for seats are there, though. Each tenant has its own database with its own users, and the `App\Models\Tenant` model in the central database is a natural billable model, as the [multi-tenancy docs](/docs/core/multi-tenancy.html) explain. Users are created and invited through the `UserService` in the `Modules/User` module, and an invited user is already a row in the tenant's users table. That service is where the seat check and the sync job would go. We'd put the rest in a new `Modules/Billing` module, following the [module-based architecture](/docs/core/architecture.html), with a tenant permission such as "Manage Billing" in `config/permissions/tenant/` (see [users, roles and permissions](/docs/core/users-roles-permissions.html)). To limit things other than users, see our guide to [Laravel SaaS usage limits](/blog/laravel-saas-usage-limits.html).

<BlogPostCta title="Tenants and users, ready for seat billing" text="SaaS Laravel gives every tenant its own database, users, roles and invitations on a modular Laravel 13 backend. Billing isn't included, so you add the provider and pricing you want." />
