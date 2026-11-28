---
title: "Paddle Billing for a Multi-Tenant Laravel SaaS"
description: "Add Paddle subscriptions to the SaaS Laravel kit with Cashier Paddle: bill the tenant, keep billing data central, handle webhooks and gate features."
breadcrumb: "Paddle billing with SaaS Laravel"
sidebar: false
editLink: false
howTo:
  name: "Add Paddle billing to the SaaS Laravel kit"
  steps:
    - name: "Install Cashier Paddle"
      text: "Require laravel/cashier-paddle together with Guzzle 7, and add the Paddle keys to .env."
      anchor: "_1-install-cashier-paddle"
    - name: "Run the migrations on the central database"
      text: "Publish Cashier's migrations into database/migrations and run php artisan migrate."
      anchor: "_2-run-cashier-s-migrations-on-the-central-database"
    - name: "Make the tenant billable"
      text: "Add Cashier's Billable trait to App\\Models\\Tenant."
      anchor: "_3-make-the-tenant-billable"
    - name: "Pin Cashier's models to the central database"
      text: "Extend Cashier's Customer, Subscription, SubscriptionItem and Transaction models with CentralConnection and register them."
      anchor: "_4-pin-cashier-s-models-to-the-central-database"
    - name: "Add a Billing module"
      text: "Add a tenant-only billing page behind a Manage Billing permission that passes Paddle checkout options to the frontend."
      anchor: "_5-add-a-billing-module"
    - name: "Open the checkout with Paddle.js"
      text: "Load Paddle.js in the root Blade view and open the checkout with the options from the server."
      anchor: "_6-open-the-checkout-with-paddle-js"
    - name: "Receive webhooks on the central domain"
      text: "Point Paddle's webhook at the central domain, exclude it from CSRF checks and set the webhook secret."
      anchor: "_7-receive-webhooks-on-the-central-domain"
    - name: "Gate features by subscription"
      text: "Add a middleware that sends tenants without an active subscription to the billing page."
      anchor: "_8-gate-features-by-subscription"
---

# Paddle Billing for a Multi-Tenant Laravel SaaS

This guide shows you how to add Paddle subscriptions to the [SaaS Laravel](/blog/laravel-saas-starter-kit.html) kit with Laravel Cashier Paddle, so each tenant pays for its own plan. It's for kit owners who picked Paddle as their payment provider. The kit has no billing built in, so everything below is code you add.

Paddle is a **merchant of record**: it sells to your customers on your behalf and handles sales tax and VAT. If you're still choosing between Paddle and a payment processor like Stripe, read [Stripe vs Paddle vs Lemon Squeezy](/blog/stripe-vs-paddle-vs-lemon-squeezy-laravel.html) first.

## What we tested, and what we didn't

We built this in a copy of the Vue kit on 27 November 2026, with Cashier Paddle 2.8.1, and ran Pest tests against it. Paddle's API was faked with Laravel's `Http::fake()`, so no real Paddle account was involved. The tests confirm that:

- Starting a checkout inside a tenant creates the Paddle customer row in the central database, linked to the tenant.
- A `subscription.created` webhook on the central domain subscribes the tenant, and `subscribed()` returns `true` both centrally and inside the tenant.
- A webhook with a wrong signature gets a 403, and one signed with the webhook secret is accepted.

We didn't open the Paddle.js checkout against Paddle's sandbox, because that needs a Paddle account. Step 6 follows Paddle's and Cashier's own setup, and you should try it in Paddle's sandbox before you go live. The React and Svelte kits share the same backend as the Vue kit. The Livewire kit has the same tenancy code, but we didn't run these tests on it.

## Who pays: the tenant

In a B2B SaaS the customer is the company, not the person who clicked "subscribe". So the tenant is the billable model. The kit's `App\Models\Tenant` lives in the central `tenants` table and already has an `email` column and a `name` that returns the company name. Cashier Paddle uses exactly those two to create the Paddle customer, so no extra columns are needed.

Billing data lives in the central database, next to the tenants. Paddle's webhooks reach your central domain, outside any tenant, so they can find the tenant without switching databases.

<DocSteps>

## 1. Install Cashier Paddle

The kits lock Guzzle 8, and Cashier Paddle 2.8.1 requires Guzzle 7. Laravel 13 accepts either, so install both together and let Composer move Guzzle back to version 7:

```bash
composer require laravel/cashier-paddle "guzzlehttp/guzzle:^7.9" -w
```

The `-w` flag lets Composer update the packages that depend on Guzzle. Check the list it prints before you commit the lock file.

Then add your keys from the Paddle dashboard to `.env`. Use sandbox keys until launch:

```ini
PADDLE_CLIENT_SIDE_TOKEN=your-client-side-token
PADDLE_API_KEY=your-api-key
PADDLE_WEBHOOK_SECRET=your-webhook-secret
PADDLE_SANDBOX=true
```

## 2. Run Cashier's migrations on the central database

Publish the migrations. They go into `database/migrations`, which is the central folder in the kit, and that's where they belong:

```bash
php artisan vendor:publish --tag="cashier-migrations"
php artisan migrate
```

This creates `customers`, `subscriptions`, `subscription_items` and `transactions`. Cashier Paddle links them to the billable model with a polymorphic `billable` column, so unlike Cashier for Stripe, you don't need to edit the migrations for a `Tenant` model. Don't put them in `database/migrations/tenant`.

## 3. Make the tenant billable

Add Cashier's `Billable` trait to the tenant model:

```php
// app/Models/Tenant.php
use Laravel\Paddle\Billable;

class Tenant extends BaseTenant implements TenantWithDatabase
{
    use Billable, HasDatabase, HasDomains;

    // ...
}
```

## 4. Pin Cashier's models to the central database

This is the step that's easy to miss. Inside a tenant request, stancl/tenancy switches the default database connection to the tenant's database. Cashier queries some of its models directly, and those queries then look in the tenant database. In our test, starting a checkout inside a tenant without this step failed with:

```text
SQLSTATE[HY000]: General error: 1 no such table: customers (Connection: tenant, ...)
```

Extend each Cashier model with stancl's `CentralConnection` trait:

```php
// app/Models/Billing/Customer.php
namespace App\Models\Billing;

use Laravel\Paddle\Customer as CashierCustomer;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

class Customer extends CashierCustomer
{
    use CentralConnection;
}
```

Do the same for `Subscription`, `SubscriptionItem` and `Transaction`. Then register all four in `AppServiceProvider::boot()`:

```php
use App\Models\Billing\Customer;
use App\Models\Billing\Subscription;
use App\Models\Billing\SubscriptionItem;
use App\Models\Billing\Transaction;
use Laravel\Paddle\Cashier;

Cashier::useCustomerModel(Customer::class);
Cashier::useSubscriptionModel(Subscription::class);
Cashier::useSubscriptionItemModel(SubscriptionItem::class);
Cashier::useTransactionModel(Transaction::class);
```

## 5. Add a Billing module

Following the kit's [module structure](/docs/core/architecture.html), billing gets its own module with a service, a thin controller and routes. The service builds the options Paddle.js needs:

```php
// Modules/Billing/Services/BillingService.php
public function checkoutOptions(Tenant $tenant, string $priceId): array
{
    return $tenant->subscribe($priceId, 'default')
        ->returnTo(route('billing.show'))
        ->options();
}
```

`subscribe()` creates the Paddle customer the first time, if it doesn't exist yet, and tags the checkout so the webhook knows which subscription type to create.

The billing page belongs to tenants only, and only to people allowed to manage billing:

```php
// Modules/Billing/routes/web.php
Route::middleware(['auth', 'verified', PreventAccessFromCentralDomains::class, 'permission:Manage Billing'])->group(function () {
    Route::get('billing', [BillingController::class, 'show'])->name('billing.show');
});
```

Add the permission to `config/permissions/tenant/billing.php` and give it to the Super Admin role, then create it in existing tenants with `php artisan tenants:seed --class="Database\Seeders\PermissionSeeder"`. Register `BillingServiceProvider` in `bootstrap/providers.php`. Keep the price IDs you sell in config, and never accept a price ID from the browser without checking it against that list.

<PricingBlock />

## 6. Open the checkout with Paddle.js

Cashier Paddle ships a `@paddleJS` Blade directive that loads Paddle.js, switches to the sandbox when `PADDLE_SANDBOX` is on, and initializes it with your client-side token. Add it to the `<head>` of the kit's root view, `resources/views/app.blade.php`.

The controller passes the checkout options to the page as a prop. In the Vue kit, the button opens Paddle's overlay with them:

```vue
<script setup lang="ts">
const props = defineProps<{ checkout: Record<string, any> | null }>();

function openCheckout() {
    // window.Paddle is loaded by the @paddleJS directive in app.blade.php.
    (window as any).Paddle.Checkout.open({
        ...props.checkout,
        settings: { ...props.checkout?.settings, displayMode: 'overlay' },
    });
}
</script>
```

The React and Svelte versions are the same call from a click handler. This is the part we couldn't run without a Paddle account, so test it in the sandbox.

## 7. Receive webhooks on the central domain

Cashier registers `POST /paddle/webhook`. In the Paddle dashboard, add a notification destination pointing at your **central** domain, for example `https://your-saas.com/paddle/webhook`, not a tenant subdomain. Paddle can't send a CSRF token, so exclude the path in `bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->preventRequestForgery(except: ['paddle/*']);
    // ...the kit's existing middleware setup
})
```

With `PADDLE_WEBHOOK_SECRET` set, Cashier checks the signature on every webhook and rejects the rest with a 403. Cashier then keeps its `subscriptions` table in step with Paddle, and that table is what the rest of your app should trust. To react in your own code, for example to set the kit's workspace status, listen for Cashier's `WebhookHandled` event.

## 8. Gate features by subscription

A small middleware keeps tenants without an active subscription on the billing page:

```php
// Modules/Billing/Http/Middleware/EnsureTenantIsSubscribed.php
public function handle(Request $request, Closure $next): Response
{
    if (tenant()?->subscribed('default')) {
        return $next($request);
    }

    return redirect()->route('billing.show');
}
```

Put it on your product's routes, but not on the billing page, the profile or logout, so people can always fix their payment.

</DocSteps>

## Test it the way we did

You can keep the tests from this guide in your project. The webhook test posts to the central domain and checks the tenant from both sides:

```php
test('subscription webhook on the central domain subscribes the tenant', function () {
    $tenant = app(TenantService::class)->createTenant(tenantRegisterData());
    $tenant->run(fn () => tenant()->createAsCustomer());

    $this->postJson('http://'.config('tenancy.domain').'/paddle/webhook', subscriptionCreatedPayload())
        ->assertOk();

    expect($tenant->fresh()->subscribed('default'))->toBeTrue();

    $tenant->run(function () {
        expect(tenant()->subscribed('default'))->toBeTrue();
    });
});
```

`subscriptionCreatedPayload()` is a helper that returns a `subscription.created` event with the same customer ID your faked API returned. Fake Paddle's customer endpoints with `Http::fake()` in a `beforeEach`, and delete tenants in `afterEach` like the kit's own tenancy tests do. The [multi-tenancy tutorial](/guides/laravel-multi-tenancy-tutorial.html#how-do-you-test-a-multi-tenant-laravel-app) shows that cleanup.

## Frequently asked questions

### Can I bill per seat with Paddle?

Yes. Pass the price with a quantity when you start the checkout, such as `$tenant->subscribe(['pri_123' => 5])`, and change it later with `$tenant->subscription()->updateQuantity($count)` when users are added or removed. We didn't run this part in our tests. Count users inside the tenant with `$tenant->run()`, because they live in the tenant's database.

### Does this work with the Stripe version of Cashier?

The approach is the same, with two differences: Cashier for Stripe adds columns to the billable model's table, and its subscriptions migration uses a `user_id` you change to `tenant_id`. Our [Stripe subscriptions guide](/blog/laravel-saas-stripe-billing.html) covers it.

### What about Razorpay or another provider?

Neither the kit nor Cashier includes Razorpay. The pattern still applies: bill the tenant, keep billing tables central, receive webhooks on the central domain and gate features with a middleware.

<NextStep
  title="Billing on a tenant model that's ready for it"
  text="SaaS Laravel gives you the tenants, central database, roles and module structure this guide builds on. You add the payment provider that fits your market."
  secondaryText="Read the multi-tenancy tutorial"
  secondaryLink="/guides/laravel-multi-tenancy-tutorial.html"
/>
