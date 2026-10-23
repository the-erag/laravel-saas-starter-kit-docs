---
title: "Laravel Impersonate User: Safe Login as a Customer"
description: "Laravel impersonate user the safe way: a small session-based login as another user, an Inertia stop banner, blocked routes, audit logs and tenant tokens."
pageClass: blog-page
date: 2026-10-24
author: erag
category: permissions
tags: [Impersonation, Security]
---

# Laravel Impersonate User: Let Support Log In as a Customer Safely

<BlogPostMeta />

A customer writes in: "The export button does nothing." You can ask for screenshots for two days, or you can see their screen yourself. That's what a Laravel impersonate user feature gives your support team. A super admin clicks "Log in as", sees exactly what the customer sees, and clicks "Stop" to become themselves again.

It's also one of the most dangerous buttons in your app. Done carelessly, it lets an admin change a customer's password, read things they shouldn't, or forget they're still logged in as someone else. Below we build a small, safe version for Laravel 13 with no package, compare it with lab404/laravel-impersonate, and then look at the multi-tenant case, where the admin and the customer don't even share a database.

We're using Laravel 13, PHP 8.4, Inertia v3, spatie/laravel-permission for roles and stancl/tenancy 3.10 for the multi-tenant part.

## The rules before the code

Impersonation is a support tool, so the rules come first. These are the ones we'd never skip:

| Rule | Why |
| --- | --- |
| Only super admins can start it | Support access is a privilege, not a default |
| Never impersonate another super admin | Otherwise one admin can act as a more trusted one |
| No nesting | You can't start a second impersonation while one is running |
| No "remember me" | The customer's session must never outlive your support visit |
| Block password, 2FA, passkeys and billing | You're there to look, not to take over the account |
| Show a banner on every page | The admin must always know who they are right now |
| Log every start and stop | You need to answer "who did this?" later |

## How login as another user works in Laravel

There's no magic here. Laravel's session guard keeps the logged-in user's ID in the session. To impersonate, we:

1. Store the admin's ID in the session under our own key.
2. Call `Auth::login($customer)`, which swaps the user in the session.
3. To stop, read the admin's ID back and call `Auth::login($admin)`.

Two details make this safer than it looks. First, `Auth::login()` already regenerates the session for you: the session guard calls `regenerate(true)` internally, which gives the session a new ID and a new CSRF token, so a session fixation attack can't ride along. Second, it stores the new user's password hash in the session, so the `auth.session` middleware keeps working. You can still call `$request->session()->regenerate()` yourself, as many login controllers do. It's harmless, just not required.

The [Laravel authentication docs](https://laravel.com/docs/13.x/authentication) cover `Auth::login()` and guards if you want the full picture.

## Step 1: An ImpersonationService

All the rules live in one service. The controller stays thin, and the rules can't be bypassed by a second route that someone adds later.

```php
<?php

namespace Modules\User\Services;

use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ImpersonationService
{
    public const string SESSION_KEY = 'impersonator';

    public function start(User $admin, User $target, Request $request): void
    {
        if (! $this->canImpersonate($admin, $target, $request)) {
            throw new AuthorizationException('You cannot impersonate this user.');
        }

        $request->session()->put(self::SESSION_KEY, [
            'id' => $admin->getKey(),
            'name' => $admin->name,
        ]);

        Auth::login($target); // new session ID, no remember-me cookie

        Log::info('Impersonation started', $this->context($admin, $target, $request));
    }

    public function stop(Request $request): void
    {
        $impersonator = $request->session()->pull(self::SESSION_KEY);

        abort_if($impersonator === null, 403);

        $target = $request->user();
        $admin = User::findOrFail($impersonator['id']);

        Auth::login($admin);

        Log::info('Impersonation stopped', $this->context($admin, $target, $request));
    }

    public function canImpersonate(User $admin, User $target, Request $request): bool
    {
        return $admin->hasRole('super-admin')
            && ! $target->hasRole('super-admin')
            && ! $admin->is($target)
            && ! $request->session()->has(self::SESSION_KEY);
    }

    /** @return array<string, mixed> */
    private function context(User $admin, User $target, Request $request): array
    {
        return [
            'admin_id' => $admin->getKey(),
            'target_id' => $target->getKey(),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ];
    }
}
```

We store the admin's name next to the ID, so the banner doesn't need a database query on every page.

Notice the check uses `hasRole()`, not `$admin->can('impersonate', $target)`. Many apps give super admins a `Gate::before` that returns `true` for everything. That bypass also skips your policy, so a "never impersonate a super admin" rule written as a policy would never run for the very people it's meant for. We explain that trap in more detail in [the super admin role post](/blog/laravel-super-admin-role.html).

## Step 2: A thin controller and two routes

```php
class ImpersonationController extends Controller
{
    public function __construct(private ImpersonationService $impersonation) {}

    public function store(Request $request, User $user): RedirectResponse
    {
        $this->impersonation->start($request->user(), $user, $request);

        return to_route('dashboard');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $this->impersonation->stop($request);

        return to_route('users.index');
    }
}
```

```php
Route::middleware(['auth', 'throttle:10,1'])->group(function () {
    Route::post('users/{user}/impersonate', [ImpersonationController::class, 'store'])
        ->name('impersonation.start');

    Route::delete('impersonation', [ImpersonationController::class, 'destroy'])
        ->name('impersonation.stop');
});
```

Both routes change who is logged in, so they're `POST` and `DELETE`, never `GET`. A `GET` link can be triggered by an image tag on another site.

The stop route only needs `auth`. Don't put a super admin check on it: while you're impersonating, you are logged in as the customer, so that check would lock you in.

## Step 3: Share the impersonation state with Inertia

The banner needs to know two things: are we impersonating, and as whom. Add a lazy shared prop in `HandleInertiaRequests`:

```php
public function share(Request $request): array
{
    return [
        ...parent::share($request),
        // ...
        'impersonation' => fn (): ?array => $request->session()->has(ImpersonationService::SESSION_KEY)
            ? [
                'impersonatorName' => $request->session()->get(ImpersonationService::SESSION_KEY.'.name'),
                'userName' => $request->user()?->name,
            ]
            : null,
    ];
}
```

Shared data is covered in the [Inertia v3 docs](https://inertiajs.com/docs/v3/data-props/shared-data). Then render the banner in your app layout, above everything else:

```vue
<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

const page = usePage();
const impersonation = computed(() => page.props.impersonation);
</script>

<template>
    <div
        v-if="impersonation"
        class="flex items-center justify-between gap-4 bg-amber-400 px-4 py-2 text-sm text-black"
    >
        <span>
            You are viewing the app as <strong>{{ impersonation.userName }}</strong>
            (signed in as {{ impersonation.impersonatorName }}).
        </span>
        <Link href="/impersonation" method="delete" as="button" class="font-semibold underline">
            Stop impersonating
        </Link>
    </div>
</template>
```

The React version is the same idea:

```tsx
import { Link, usePage } from '@inertiajs/react';

export function ImpersonationBanner() {
    const { impersonation } = usePage().props;

    if (!impersonation) return null;

    return (
        <div className="flex items-center justify-between gap-4 bg-amber-400 px-4 py-2 text-sm text-black">
            <span>You are viewing the app as <strong>{impersonation.userName}</strong>.</span>
            <Link href="/impersonation" method="delete" as="button" className="font-semibold underline">
                Stop impersonating
            </Link>
        </div>
    );
}
```

Add `impersonation` to your shared page props type. And make the banner loud: a subtle grey bar is easy to stop seeing.

## Step 4: Block sensitive routes while impersonating

The banner tells the admin where they are. A middleware makes sure they can't do the dangerous things anyway:

```php
class BlockWhileImpersonating
{
    private const array BLOCKED_ROUTES = [
        'user-password.update',
        'two-factor.*',
        'passkey.*',
        'profile.destroy',
        'billing.*',
        'impersonation.start',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->session()->has(ImpersonationService::SESSION_KEY)
            && $request->routeIs(...self::BLOCKED_ROUTES)) {
            abort(403, 'This action is not available while impersonating.');
        }

        return $next($request);
    }
}
```

Append it to the `web` group in `bootstrap/app.php` with `$middleware->web(append: [BlockWhileImpersonating::class])`. `user-password.update` and `two-factor.*` are Fortify's route names and `passkey.*` comes from Laravel's passkeys package; the others depend on your app, so check yours with `php artisan route:list`. We block by route name rather than URL, so a renamed path doesn't silently open a hole.

Think about email changes too. If changing the email on the profile form can lock the customer out, block that field (or the whole `profile.update` route) as well.

## Step 5: Log every start and stop

The service above writes two log lines with the admin, the target, the IP and the user agent. For many teams, a log channel that ships to your log tool is enough.

If you already keep an audit trail, write impersonation there instead and tag every action taken during the session with the impersonator's ID. Then "the customer deleted this invoice" becomes "support deleted this invoice while impersonating". We show one way to build that trail in [Laravel activity log](/blog/laravel-activity-log.html).

## lab404/laravel-impersonate vs building it yourself

The best-known package is [lab404/laravel-impersonate](https://github.com/404labfr/laravel-impersonate). It's alive and well: version 1.7.8 was released in March 2026, and its Composer constraints cover Laravel 6 through 13. So "it's an old package" isn't a reason to skip it. Here is how it compares with the service above:

| | lab404/laravel-impersonate | Self-built service |
| --- | --- | --- |
| Install | `composer require lab404/laravel-impersonate` plus a trait on `User` | One service, one controller, one middleware |
| Who can impersonate | `canImpersonate()` and `canBeImpersonated()` on the model, both return `true` until you override them | Rules in `canImpersonate()` in the service |
| Built-in routes | `Route::impersonate()` registers `GET /impersonate/take/{id}` and `GET /impersonate/leave` | Your own `POST` and `DELETE` routes |
| Session key | `impersonated_by` (configurable) | Your choice |
| Blocking routes | `impersonate.protect` middleware blocks impersonators from routes you mark | Your middleware, blocking by route name |
| Remember-me cookie | Moves the admin's cookie aside and puts it back on leave | You never set one for the customer |
| Events | `TakeImpersonation` and `LeaveImpersonation` | Log lines or your own events |
| Frontend | Blade directives such as `@impersonating` | An Inertia shared prop |
| Multiple guards | Guard name as a route parameter, default `web` | Uses whatever guard is active |
| Cross-database tenants | Not covered | Use stancl's tokens (next section) |

Our take: on Blade, the package is fine, as long as you override both model methods on day one (the defaults let anyone with the trait impersonate anyone). For an Inertia app, we'd write the service. It's around a hundred lines, the rules sit in one file, and you avoid `GET` routes that change who's logged in.

## Laravel impersonation in a multi-tenant app

With a database per tenant, the session approach stops working across tenants. Your super admin lives in the central database. The customer lives in `tenant42`, on `acme.your-saas.com`, with a different session and often a different guard. You can't `Auth::login()` a user from a database you're not connected to.

stancl/tenancy v3 solves this with its [user impersonation feature](https://tenancyforlaravel.com/docs/v3/features/user-impersonation). The central app creates a short-lived token in the central database, then redirects to the tenant's domain. A route there trades the token for a login.

Enable `Stancl\Tenancy\Features\UserImpersonation::class` in the `features` array of `config/tenancy.php`, then publish and run the migration:

```bash
php artisan vendor:publish --tag=impersonation-migrations
php artisan migrate
```

On the central side, create the token for the tenant's user and redirect:

```php
public function impersonateTenant(User $admin, Tenant $tenant): string
{
    abort_unless($admin->hasRole('super-admin'), 403);

    $userId = $tenant->run(
        fn () => User::query()->where('email', $tenant->email)->value('id')
    );

    $token = tenancy()->impersonate($tenant, (string) $userId, '/dashboard', 'tenant');

    Log::info('Tenant impersonation started', ['admin_id' => $admin->id, 'tenant_id' => $tenant->id]);

    $domain = $tenant->domains()->where('is_primary', true)->value('domain');

    return "https://{$domain}/impersonate/{$token->token}";
}
```

The controller returns `redirect()->away($url)`. On the tenant side, add a route inside your tenant route group:

```php
Route::get('/impersonate/{token}', function (Request $request, string $token) {
    $response = UserImpersonation::makeResponse($token);

    $request->session()->put('impersonated_from_central', true);

    return $response;
})->name('tenant.impersonate');
```

`makeResponse()` checks that the token belongs to the current tenant and hasn't expired, logs the user in with `loginUsingId()` on the stored guard, deletes the token and redirects to the stored URL. The stancl docs recommend a controller instead of a closure, so your routes can be cached. Tokens are 128 random characters and live for 60 seconds by default; change that with `UserImpersonation::$ttl`.

Three things to know before you ship it:

- **Pass the guard explicitly.** If you leave the fourth argument out, the token stores `config('auth.defaults.guard')` at the moment you create it. That's your central guard, not the tenant one. In an app with a separate `tenant` guard, the login would land on the wrong guard.
- **Check the migration's column type.** The published migration declares `tenant_id` as a string with a foreign key to `tenants.id`. If your tenants use auto-increment integer IDs, change the column to `unsignedBigInteger` before you migrate, or MySQL refuses the foreign key.
- **There's no built-in "stop".** The tenant session looks like a normal login. That's why we put our own flag in the session: the banner can read it, and the stop button logs out of the tenant and redirects back to the central admin page.

Unused tokens stay in the table after they expire. A daily scheduled job that deletes rows older than a few minutes keeps it clean.

## Mistakes we see with impersonation

- **Logging in with `remember: true`.** The customer's remember cookie ends up in the admin's browser and outlives the support visit.
- **Firing login side effects.** `Auth::login()` dispatches the `Login` event. If you update `last_login_at` or send "new sign-in" emails from a listener, check for the session key and skip them, or the customer gets a scary email about your support visit.
- **Forgetting queued work.** A job dispatched while impersonating looks exactly like one the customer started. Pass the impersonator's ID along (or write it to the audit entry) so the export or email isn't blamed on them later.
- **Caching per user.** Anything cached under the admin's user ID (menus, permissions) must be read again after the switch. Shared props that run per request, like the permission list, are fine.
- **Assuming read-only.** Impersonation is full access. If support should only look, block more routes.

## Frequently asked questions

### How do I log in as another user in Laravel?

Store your own user ID in the session, then call `Auth::login($otherUser)`. To switch back, read the stored ID and call `Auth::login()` with your original user. Wrap it in a service that checks who may impersonate whom, and log both actions.

### Does lab404/laravel-impersonate support Laravel 13?

Yes. Version 1.7.8, released in March 2026, allows Laravel 6 through 13 in its Composer requirements. Override `canImpersonate()` and `canBeImpersonated()` on your user model, because both return `true` by default.

### Is user impersonation safe?

It's as safe as the rules around it. Limit it to super admins, never allow impersonating another super admin, block password, two-factor and billing routes, never set a remember-me cookie, and log every start and stop. Tell customers in your terms that support may access their account.

### How do I impersonate a tenant user with stancl/tenancy?

Enable the `UserImpersonation` feature, publish its migration, and call `tenancy()->impersonate($tenant, $userId, $redirectUrl, $guard)` from the central app. Redirect to a route on the tenant's domain that calls `UserImpersonation::makeResponse($token)`. The token is single-use and expires after 60 seconds by default.

## Impersonation in the SaaS Laravel kits

The [SaaS Laravel starter kits](/) don't ship an impersonation feature today, so there's no "Log in as" button, banner or route. What's already there makes it a small addition. The central permission config (`config/permissions/users.php`) already defines an `Impersonate User` permission that goes to the Super Admin role by default, but nothing uses it yet. The `super-admin` role passes every check through a `Gate::before`, which is exactly why the "never impersonate a super admin" rule belongs in a service, as shown above. Central and tenant users use separate guards (`web` and `tenant`), and the kit switches the default guard per domain, so `Auth::login()` inside a tenant request logs into the tenant guard.

We'd put `ImpersonationService` in `Modules/User/Services`, add the start action to the users page, share an `impersonation` prop in `HandleInertiaRequests` next to `auth` and `notifications`, and add it to the `SharedData` type in `resources/js/types/global.d.ts`. For jumping from the central admin into a workspace, `Stancl\Tenancy\Features\UserImpersonation` is already listed in `config/tenancy.php`, commented out, and the button would sit on the tenant detail page in `Modules/Tenant`. The [roles and permissions docs](/docs/core/users-roles-permissions.html#super-admin) explain the super admin bypass, and [protecting system roles](/blog/laravel-protect-system-roles.html) covers the other half of keeping admin power in check.

<BlogPostCta title="Super admins and guards, already wired" text="SaaS Laravel ships a super-admin role, separate central and tenant guards and config-driven permissions, so features like impersonation have a clear place to go." />
