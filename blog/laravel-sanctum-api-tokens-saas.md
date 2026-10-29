---
title: "Laravel Sanctum With stancl/tenancy: Multi-Tenant API Tokens"
description: "Add Sanctum API tokens to a multi-tenant Laravel SaaS with stancl/tenancy: tokens per tenant, abilities, rate limits and the Unauthenticated fix."
pageClass: blog-page
date: 2026-10-29
author: erag
category: security
tags: [API, Security]
---

# Laravel Sanctum With stancl/tenancy: API Tokens for a Multi-Tenant SaaS

<BlogPostMeta />

At some point your customers will ask for an API. They want to sync data with their CRM, pull reports into a spreadsheet, or connect your app to Zapier. In Laravel, Sanctum's personal access tokens are the easiest way to give them that.

Multi-tenancy makes it a bit trickier, though. Where should the tokens live? How do you make sure a token from one company can't read another company's data? And why does every request suddenly return "Unauthenticated"? We'll answer all of that here for a database-per-tenant app built with stancl/tenancy, which is the setup our SaaS starter kit uses.

## Do you even need API tokens?

Your own Inertia pages don't. They talk to Laravel with the normal session cookie, and that keeps working as before. Tokens are only for other programs calling your app, like a customer's script or an integration.

| Who's calling | How they log in | Which routes |
| --- | --- | --- |
| Your own Inertia pages | Session cookie | `routes/web.php`, `routes/tenant.php` |
| Customer scripts and integrations | `Authorization: Bearer <token>` | Tenant API routes |

## Install Sanctum

In Laravel 13 one command installs Sanctum and creates the API route file:

```bash
php artisan install:api
```

Then add the `HasApiTokens` trait to your user model:

```php
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;
}
```

## Keep the tokens in each tenant's database

With one database per tenant, each company's users live in their own database, so their tokens should live there too. Move the migration that `install:api` created into your tenant migrations folder and run it for every tenant:

```bash
mv database/migrations/*_create_personal_access_tokens_table.php database/migrations/tenant/
php artisan tenants:migrate
```

Now a token can only be found in the database of the company it belongs to. When a request comes in for company B, company A's tokens simply don't exist. That's about as strong as isolation gets, and it's one of the big reasons we like [one database per tenant](/blog/multi-tenant-saas-laravel-database-per-tenant.html).

## Add the tenant API routes

Put the API inside your tenant routes, so tenancy is set up before anyone checks the token:

```php
// routes/tenant.php
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;

Route::middleware([
    'api',
    InitializeTenancyByDomain::class,
    PreventAccessFromCentralDomains::class,
])->prefix('api/v1')->group(function () {
    Route::middleware(['auth:sanctum', 'throttle:tenant-api'])->group(function () {
        Route::get('projects', [ProjectApiController::class, 'index'])
            ->middleware('abilities:projects:read');

        Route::post('projects', [ProjectApiController::class, 'store'])
            ->middleware('abilities:projects:write');
    });
});
```

Each customer then calls the API on their own subdomain:

```bash
curl https://acme.your-saas.com/api/v1/projects \
  -H "Authorization: Bearer 3|kF9x...Qe2" \
  -H "Accept: application/json"
```

## Fixing "Unauthenticated" with Sanctum and stancl/tenancy

This is the problem almost everyone hits, so let's deal with it first. You send a valid token and get `{"message": "Unauthenticated."}`. Nearly always, Sanctum looked for the token in the central database because tenancy wasn't set up yet. Check these in order.

**1. Make tenancy run before authentication.** Laravel sorts some middleware by priority, and its authentication middleware is high on that list. Tenancy middleware isn't on it by default, so even if you list tenancy first in your route, auth can still end up running before it. Tell Laravel that tenancy comes first:

```php
// bootstrap/app.php
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;

->withMiddleware(function (Middleware $middleware) {
    $middleware->prependToPriorityList(
        before: AuthenticatesRequests::class,
        prepend: InitializeTenancyByDomain::class,
    );
})
```

**2. Check where the token table is.** If `personal_access_tokens` only exists in the central database, a tenant user's token can't be found once tenancy is on. Move the migration into `database/migrations/tenant` as shown above.

**3. Check which database the token was created in.** A token created in a Tinker session without tenancy lands in the central database. Create tokens inside the tenant, either from the tenant's settings page or with `$tenant->run(fn () => ...)`.

**4. Send `Accept: application/json`.** Without it, a failed login can redirect to the login page instead of returning a clear JSON error, which makes debugging confusing.

**5. Single-domain tenancy.** If you identify tenants by path or by a header instead of a subdomain, the same rule applies. That middleware must also run before authentication.

## Give each token only what it needs

Abilities are Sanctum's version of scopes. Register the middleware aliases once:

```php
// bootstrap/app.php
use Laravel\Sanctum\Http\Middleware\CheckAbilities;
use Laravel\Sanctum\Http\Middleware\CheckForAnyAbility;

$middleware->alias([
    'abilities' => CheckAbilities::class,
    'ability' => CheckForAnyAbility::class,
]);
```

`abilities:` needs every ability you list, `ability:` needs at least one. In your own code you can also call `$request->user()->tokenCan('projects:write')`.

One thing to keep in mind: abilities limit what the **token** can do, but your normal permission checks still decide what the **user** can do. If someone loses the "Manage Projects" permission, their old token with `projects:write` should stop working too. So keep your [role and permission checks](/blog/laravel-roles-permissions-spatie.html) in the service or policy, not only in the token.

## A settings page for tokens

Let users create and revoke their own tokens from their settings. Keep the logic in a small service:

```php
final class ApiTokenService
{
    /**
     * @param  array<int, string>  $abilities
     */
    public function create(User $user, string $name, array $abilities): string
    {
        return $user->createToken($name, $abilities, now()->addDays(90))->plainTextToken;
    }

    public function revoke(User $user, int $tokenId): void
    {
        $user->tokens()->whereKey($tokenId)->delete();
    }
}
```

Show the new token once, right after it's created, for example in an Inertia flash message. Sanctum only stores a hash, so you can't show it again later, and that's on purpose.

On the list, show each token's name, abilities, when it was last used and when it expires, with a button to revoke it. People really like seeing which integration used a token last.

## Expire and clean up old tokens

Tokens that never expire are a risk. Set an expiry date when you create each token (the third argument of `createToken`), or set a default in `config/sanctum.php`:

```php
'expiration' => 60 * 24 * 90, // minutes
```

Expired tokens stay in the table until you prune them. With a database per tenant, run the prune command for every tenant from the scheduler:

```php
// routes/console.php
Schedule::command('tenants:run sanctum:prune-expired --option="hours=24"')->daily();
```

We explain this in more detail in [scheduled tasks in a multi-tenant Laravel app](/blog/laravel-multi-tenant-scheduled-tasks.html).

## Rate limit by tenant

Laravel's default API limiter counts requests per user or per IP. For a SaaS you also want a limit per company, so one busy customer can't slow everyone else down:

```php
// AppServiceProvider::boot()
RateLimiter::for('tenant-api', function (Request $request) {
    return [
        Limit::perMinute(600)->by('tenant:'.tenant('id')),
        Limit::perMinute(120)->by('user:'.tenant('id').':'.$request->user()?->id),
    ];
});
```

Both limits apply: one for the whole company and a smaller one per user. Later you can raise the company limit for bigger plans. We use the same idea for logins in [Laravel login rate limiting](/blog/laravel-login-rate-limiting.html).

## Test it with Pest

Sanctum makes token tests short:

```php
use Laravel\Sanctum\Sanctum;

it('lists projects for a token that can read them', function () {
    Sanctum::actingAs(User::factory()->create(), ['projects:read']);

    $this->getJson('/api/v1/projects')->assertOk();
});

it('refuses to create projects with a read-only token', function () {
    Sanctum::actingAs(User::factory()->create(), ['projects:read']);

    $this->postJson('/api/v1/projects', ['name' => 'Apollo'])->assertForbidden();
});
```

Run these inside a tenant, as shown in [testing multi-tenant Laravel with Pest](/blog/test-multi-tenant-laravel-pest.html), and add one more test that a token from one tenant gets a 401 on another tenant's domain.

## Frequently asked questions

### Why does Sanctum return "Unauthenticated" in my multi-tenant app?

Usually Sanctum checked the token before tenancy was set up, so it looked in the central database. Add your tenancy middleware to the priority list before `AuthenticatesRequests`, and make sure the token table and the token itself are in the tenant database.

### Should I use Sanctum or Passport for a SaaS API?

Sanctum, unless you need full OAuth2, where other companies' apps act for your users after a consent screen. For "my customers create a key and call my API", Sanctum is simpler and enough.

### Can a super admin create a token for a tenant?

Yes. Create it inside the tenant with `$tenant->run(fn () => ...)`, so it's saved in that tenant's database. Show it once and never store the plain text.

### How should I version my API?

Put the version in the URL (`api/v1`) from day one. When you need breaking changes, add `api/v2` next to it and keep v1 running until your customers have moved.

## Adding an API to SaaS Laravel

Our [SaaS Laravel](/) starter kit doesn't include a public API, on purpose, but it has everything this guide needs: stancl/tenancy with a database per tenant, tenant routes and tenant migrations, Spatie roles and permissions, a service layer, Pest tests, and a settings area where an "API tokens" page fits right next to Profile and Security. Adding Sanctum is the steps above and an afternoon of work.

<BlogPostCta title="A multi-tenant SaaS kit ready for your API" text="SaaS Laravel gives you database-per-tenant tenancy, permissions, a service layer and tests, so adding tenant-scoped API tokens is a short job." />
