---
title: "Laravel Socialite Google Login for Inertia Apps"
description: "Add Laravel Socialite Google login to an Inertia app: Google Cloud setup, a social_accounts table, verified email matching, 2FA, and multi-tenant callbacks."
pageClass: blog-page
date: 2026-10-24
author: erag
category: security
tags: [Socialite, Authentication]
---

# Laravel Socialite Google Login in an Inertia App: Setup, Security and Tenants

<BlogPostMeta />

"Continue with Google" is one of the first things customers ask for in a SaaS app. Laravel Socialite Google login takes care of the OAuth part in a few lines, but the decisions around it are where apps go wrong: how you match a Google account to an existing user, who is allowed to sign up, what happens to two-factor authentication, and how the redirect works in an Inertia app.

Below we'll build the full flow: the Google Cloud console setup, `config/services.php`, two routes with a thin controller, a service that matches users by verified email, and a `social_accounts` table. Then we'll cover the Inertia redirect gotcha and a pattern for multi-tenant apps where every tenant has its own domain.

We're using Laravel 13, PHP 8.4, Inertia v3, `laravel/socialite` 5.31 and Fortify for the normal login, two-factor auth and passkeys.

## Create the OAuth client in Google Cloud console

In the [Google Cloud console](https://console.cloud.google.com/), open **Google Auth Platform**. It has four sections you'll touch:

1. **Branding**: the app name, support email and logo people see on the consent screen.
2. **Audience**: who can sign in. While the app is in testing, only the test users you add here can log in, so publish it before launch.
3. **Data Access**: scopes. Socialite's Google driver asks for `openid`, `profile` and `email` by default, which is all a login needs.
4. **Clients**: create a client with the application type **Web application**.

Under **Authorized redirect URIs**, add the exact callback URL, for example `https://app.example.com/auth/google/callback`. Google is strict about this list:

| Rule | What it means for you |
| --- | --- |
| HTTPS only | `http://` is only accepted for `localhost` |
| No wildcards | `https://*.example.com/...` is rejected, so every host needs its own entry |
| Public top-level domain | Herd's `.test` domains are not accepted; use `http://localhost` or a tunnel locally |
| Exact match | The scheme, host, path and trailing slash must match what Socialite sends |

Copy the client ID and secret into `.env`. The secret is only shown in full once, so save it right away.

## Install Socialite and configure services.php

```bash
composer require laravel/socialite
```

Add a `google` entry to `config/services.php`:

```php
'google' => [
    'client_id' => env('GOOGLE_CLIENT_ID'),
    'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    'redirect' => env('GOOGLE_REDIRECT_URI', '/auth/google/callback'),
],
```

A relative `redirect` is turned into a full URL using the current host. That's convenient on a single domain. On a multi-tenant app it's a trap, which we'll come back to.

## A social_accounts table or columns on users?

The Socialite docs show the quick version: a `github_id` column on `users`. It works for one provider. We'd still use a separate table from day one:

| | Columns on `users` | `social_accounts` table |
| --- | --- | --- |
| Adding GitHub or Microsoft later | New columns and a migration each time | New rows, no schema change |
| One user, several providers | Awkward | Natural |
| Unlinking a provider | Null out columns | Delete a row |
| Keeping `users` clean | No | Yes |

```php
Schema::create('social_accounts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('provider');
    $table->string('provider_id');
    $table->string('email')->nullable();
    $table->timestamps();

    $table->unique(['provider', 'provider_id']);
    $table->unique(['user_id', 'provider']);
});
```

`provider_id` holds Google's `sub` claim, which Socialite exposes as `getId()`. Google says to use `sub` as the unique identifier, not the email, because an email address can change or move to another account.

We don't store the access token. For a login you never call a Google API again, and a token you don't keep is a token that can't leak. Store it (encrypted) only if you need Calendar or Drive access later.

## Routes and a thin controller

Two routes, both for guests:

```php
use App\Http\Controllers\Auth\GoogleLoginController;

Route::middleware('guest')->group(function () {
    Route::get('auth/google/redirect', [GoogleLoginController::class, 'redirect'])
        ->name('google.redirect');

    Route::get('auth/google/callback', [GoogleLoginController::class, 'callback'])
        ->middleware('throttle:10,1')
        ->name('google.callback');
});
```

The controller only talks to Socialite and hands the result to a service:

```php
use Laravel\Socialite\Socialite;
use Laravel\Socialite\Two\InvalidStateException;

class GoogleLoginController extends Controller
{
    public function __construct(private GoogleLoginService $google) {}

    public function redirect(): RedirectResponse
    {
        return Socialite::driver('google')
            ->with(['prompt' => 'select_account'])
            ->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        if ($request->has('error')) {
            return to_route('login');
        }

        try {
            $googleUser = Socialite::driver('google')->user();
            $user = $this->google->resolveUser($googleUser);
        } catch (InvalidStateException) {
            return to_route('login')->withErrors(['email' => __('Google sign-in expired. Please try again.')]);
        } catch (GoogleLoginException $e) {
            return to_route('login')->withErrors(['email' => $e->getMessage()]);
        }

        return $this->google->signIn($request, $user);
    }
}
```

Two details here. When someone clicks "Cancel" on Google's screen, Google sends them back with `?error=access_denied` and no code, so check for that before calling `user()`. And `prompt=select_account` makes Google show the account picker every time, which people on shared computers appreciate.

`GoogleLoginException` is a small exception class of your own. Socialite throws `InvalidStateException` when the `state` value in the session doesn't match the one Google sent back.

## The service: matching users by verified email

This is the part that decides whether your login is safe.

```php
use Laravel\Socialite\Two\User as GoogleUser;

class GoogleLoginService
{
    public function resolveUser(GoogleUser $googleUser): User
    {
        $account = SocialAccount::query()
            ->where('provider', 'google')
            ->where('provider_id', $googleUser->getId())
            ->first();

        if ($account) {
            return $account->user;
        }

        if (($googleUser->getRaw()['email_verified'] ?? false) !== true) {
            throw new GoogleLoginException(__('Your Google email address is not verified.'));
        }

        return DB::transaction(function () use ($googleUser): User {
            $user = User::query()->where('email', $googleUser->getEmail())->first()
                ?? $this->createUser($googleUser);

            $user->socialAccounts()->create([
                'provider' => 'google',
                'provider_id' => $googleUser->getId(),
                'email' => $googleUser->getEmail(),
            ]);

            if (! $user->email_verified_at) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }

            return $user;
        });
    }
}
```

Add a `socialAccounts()` `hasMany` relation to your `User` model for this. The order of the checks matters. First we look up the Google account by `sub`. If it's already linked, the email doesn't matter at all, so a user who changes their Gmail address can still sign in.

If it's not linked, we only fall back to email matching when Google reports `email_verified` as `true`. Linking an existing account to an unverified address would let anyone who types your customer's email into a Google account take over their login.

Marking the email as verified is fine here: Google has just confirmed the person controls that inbox. If you use Fortify's email verification, that saves the user a pointless "check your inbox" step.

## Open sign-up or invited users only

`createUser()` is where a SaaS app has to make a choice:

| Policy | `createUser()` does | Good for |
| --- | --- | --- |
| Open sign-up | Creates the user with a random password and the default role | Self-serve products with a free trial |
| Invite only | Throws `GoogleLoginException` | B2B apps where an admin adds people first |
| Domain restricted | Creates the user only if the `hd` claim matches an allowed Google Workspace domain | Internal tools, one company per tenant |

For an invite-only app the method is one line:

```php
private function createUser(GoogleUser $googleUser): User
{
    throw new GoogleLoginException(__('No account exists for this email. Ask your admin for an invitation.'));
}
```

Invited users then sign in with Google the first time and get linked by email. If you build invitations with [signed URLs](/blog/laravel-user-invitations-signed-urls.html), this fits right on top.

For open sign-up, set `'password' => Str::random(40)` so the column isn't empty, and assign a role. A user with no role usually gets a 403 on the dashboard.

About domain restriction: passing `->with(['hd' => 'acme.com'])` only filters the account picker. Google's own docs say not to rely on it for access control, so check `$googleUser->getRaw()['hd'] ?? null` on the server as well.

## Two-factor authentication and passkeys

Here's something most tutorials skip. Calling `Auth::login($user)` in the callback goes around Fortify's login pipeline, so a user who turned on two-factor authentication never sees the code prompt. We'd rather respect what the user chose:

```php
use Laravel\Fortify\Features;

public function signIn(Request $request, User $user): RedirectResponse
{
    if (Features::enabled(Features::twoFactorAuthentication())
        && $user->hasEnabledTwoFactorAuthentication()) {
        $request->session()->put([
            'login.id' => $user->getKey(),
            'login.remember' => false,
        ]);

        return to_route('two-factor.login');
    }

    Auth::login($user);
    $request->session()->regenerate();

    return redirect()->intended(config('fortify.home'));
}
```

`login.id` and `login.remember` are the session keys Fortify's own two-factor redirect writes, so the normal challenge page takes over from there. They're Fortify internals, so check them again when you upgrade Fortify. If 2FA is new to you, read [two-factor authentication in Laravel](/blog/laravel-two-factor-authentication.html) first.

[Passkeys](/blog/laravel-passkeys.html) don't conflict with Google login. They're just another way into the same user record. One thing to plan for: a user created through Google doesn't know their random password, so any screen behind password confirmation is locked for them until they set a password through "Forgot password" or add a passkey.

## The Inertia gotcha: the redirect must be a full page visit

This one catches nearly everyone using Laravel Socialite with Inertia. If the button is an Inertia `<Link>` or calls `router.visit()`, Inertia sends an XHR request. Your route answers with a 302 to `accounts.google.com`, the XHR tries to follow it, and the browser blocks it with a CORS error.

The fix is to leave Inertia out of it. Use a plain anchor tag so the browser does a normal page load. With Wayfinder:

```vue
<script setup lang="ts">
import { redirect as googleRedirect } from '@/routes/google';
</script>

<template>
    <a :href="googleRedirect.url()" class="btn-outline w-full">
        Continue with Google
    </a>
</template>
```

If the visit has to start from Inertia (say, after a form step), return `Inertia::location()` instead. It accepts Socialite's redirect response, sends a `409` with an `X-Inertia-Location` header, and the client does a full `window.location` visit:

```php
return Inertia::location(Socialite::driver('google')->redirect());
```

The callback is a normal browser request from Google, so returning a regular redirect there is fine. See [Inertia's redirect docs](https://inertiajs.com/docs/v3/the-basics/redirects) for how `Inertia::location()` works.

## Google login with multi-tenant subdomains

In a multi-tenant app each tenant has its own host, like `acme.example.com`. Google doesn't accept wildcard redirect URIs, and you can't add a new URI to the console every time a customer signs up. So use one callback on the central domain and send the user back to their tenant afterwards.

The flow looks like this:

1. The tenant's login page links to `https://app.example.com/auth/google/redirect?tenant=acme`.
2. The central route checks that the tenant exists and is active, stores its key in the session, and redirects to Google.
3. Google calls back to `https://app.example.com/auth/google/callback`.
4. The central callback reads the tenant from the session, finds the user inside that tenant, and creates a one-time token.
5. It redirects to `https://acme.example.com/auth/google/complete/{token}`, where the tenant app signs the user in.

Set an absolute `GOOGLE_REDIRECT_URI` on the central domain. A relative one would resolve to the tenant host, which Google doesn't know.

With stancl/tenancy, steps 4 and 5 can use its `ImpersonationToken` model. Its table lives in the central database, and the tokens are 128 random characters. Publish the migration with `php artisan vendor:publish --tag=impersonation-migrations`.

```php
use Stancl\Tenancy\Database\Models\ImpersonationToken;

public function handoffUrl(Request $request, GoogleUser $googleUser): string
{
    $tenant = Tenant::findOrFail($request->session()->pull('google_login.tenant'));

    $userId = $tenant->run(fn () => $this->google->resolveUser($googleUser)->getKey());

    $token = ImpersonationToken::create([
        'tenant_id' => $tenant->getTenantKey(),
        'user_id' => (string) $userId,
        'redirect_url' => '/dashboard',
    ]);

    $domain = $tenant->domains()->firstOrFail()->domain;

    return "https://{$domain}/auth/google/complete/{$token->token}";
}
```

On the tenant side, check the token yourself instead of calling `UserImpersonation::makeResponse()`. That helper logs the user in directly, which skips the two-factor check above:

```php
public function complete(Request $request, string $token): RedirectResponse
{
    $record = ImpersonationToken::find($token);

    abort_if(! $record || (string) $record->tenant_id !== (string) tenant()->getTenantKey(), 403);
    abort_if($record->created_at->lt(now()->subMinute()), 403);
    abort_if(ImpersonationToken::whereKey($token)->delete() === 0, 403);

    return $this->google->signIn($request, User::findOrFail($record->user_id));
}
```

The security rules for this hand-off:

- **Build the return URL from the tenant's domain record.** Never take a `return_to` URL from the query string, or you've built an open redirect.
- **Read the tenant from the session in the callback**, not from a query parameter. Someone could swap the parameter between the two requests, but they can't change the session.
- **Keep the token short-lived and single-use.** One minute is plenty. The atomic `delete()` makes sure two requests with the same token can't both succeed.
- **Bind the token to the tenant.** The tenant check stops a token made for one tenant from working on another.

More on tenant hosts in [multi-tenancy with subdomains](/blog/laravel-multi-tenancy-subdomains.html).

## Common mistakes with Laravel Google OAuth

- **`redirect_uri_mismatch` from Google.** The callback URL Socialite sends doesn't exactly match the console. Look for `http` vs `https` behind a proxy (configure trusted proxies), a missing trailing slash, or a relative `redirect` resolving to the wrong host.
- **`InvalidStateException` on every login.** The session from the redirect request didn't come back. Usually `SESSION_SAME_SITE=strict` (Google's redirect is cross-site, so `lax` is needed), a session domain mismatch, or starting on one host and calling back on another.
- **Matching on email without checking `email_verified`.** That's an account takeover bug, not a style choice.
- **Using `stateless()` in a web app.** It turns off the state check that protects you from login CSRF. It's meant for APIs without sessions.
- **Forgetting the testing audience.** While the app is in testing mode, only listed test users can sign in. Everyone else gets an error from Google.
- **Creating users with no role.** They sign in and land on a 403. Assign a default role in `createUser()`.

## Frequently asked questions

### Is Laravel Socialite free?

Yes. Socialite is a first-party Laravel package released under the MIT license, and you install it with Composer like any other package. You only need a Google Cloud project with an OAuth client.

### How do I add Google login to Laravel Fortify?

Fortify doesn't ship social login, so you add Socialite next to it. Keep Fortify for passwords, two-factor auth and passkeys, add the two Socialite routes, and in the callback hand users with 2FA enabled to Fortify's challenge by setting the `login.id` session key, as shown above.

### Why does my Inertia Google login button give a CORS error?

The button makes an Inertia XHR request, and the browser won't let XHR follow a redirect to `accounts.google.com`. Use a plain `<a href>` for the button, or return `Inertia::location()` from the route so Inertia does a full page visit.

### Can I use one Google OAuth client for all tenant subdomains?

Yes, but not with wildcard redirect URIs, because Google rejects them. Use one callback on your central domain, then pass the user to their tenant with a short-lived, single-use token.

### Should I link a Google account to an existing user with the same email?

Only when Google says the email is verified. After the first link, match on the Google `sub` ID instead of the email, so the link still works if the user changes their address.

## Google login in the SaaS Laravel kits

The [SaaS Laravel starter kits](/) don't ship Socialite. Authentication runs on Fortify with password login, registration, email verification, two-factor authentication and passkeys, and admins add people through queued, signed invitations. The [authentication docs](/docs/core/authentication.html) cover how that's wired.

If you add Google login, here's where it fits. Put the controller, `GoogleLoginService` and a `SocialAccount` model in a new module, for example `Modules/SocialLogin`, and keep the routes in that module's `routes/web.php`. Central users and tenant users are separate records in separate databases, so the `social_accounts` migration goes in both `database/migrations` and `database/migrations/tenant`. On tenant domains the kit switches the default guard to `tenant` and maps `auth` and `guest` for you, so `Auth::login()` lands in the right database without extra code. Tenant domains are stored as full hosts on `<sub>.APP_DOMAIN`, and a tenant can have several, so build the hand-off URL from the one with `is_primary` set. For the central callback and tenant hand-off, also note that stancl's `UserImpersonation` feature is commented out in `config/tenancy.php` and its token migration isn't published yet. Each tenant domain can already switch Fortify features on and off, so a per-domain "Google login" toggle would follow the same pattern. The button belongs on the `auth/Login` page as a plain anchor, next to the existing passkey option.

<BlogPostCta title="Fortify auth, ready to extend" text="SaaS Laravel ships Fortify login, two-factor codes, passkeys and invitations on a multi-tenant backend, so adding Google sign-in is one module away." />
