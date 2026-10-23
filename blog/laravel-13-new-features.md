---
title: "Laravel 13 New Features and Upgrade Guide"
description: "Laravel 13 new features from the official release notes: release date, PHP 8.3 minimum, support dates, AI SDK, attributes, queue routing and the upgrade steps."
pageClass: blog-page
date: 2026-10-24
author: annu-gupta
category: architecture
tags: [Laravel 13, Upgrade]
---

# Laravel 13 New Features: What Changed, What Breaks and How to Upgrade

<BlogPostMeta />

Laravel 13 was released on March 17, 2026. It needs PHP 8.3 or newer, and the headline Laravel 13 new features are a first-party AI SDK, JSON:API resources, PHP attributes across the framework, queue routing by class, `Cache::touch()`, vector search in the query builder and a reworked CSRF middleware. The upgrade guide estimates 10 minutes for a typical Laravel 12 app, and for once that's not far off.

A lot of what's online about Laravel 13 was written from pull requests before the release, and some of it never shipped in that form. Everything below comes from the official [release notes](https://laravel.com/docs/13.x/releases) and [upgrade guide](https://laravel.com/docs/13.x/upgrade). If it's not in those, it's not in this post.

Our own starter kits run Laravel 13 with PHP 8.4 and Inertia v3, so we'll also point out which changes matter for a real SaaS codebase and which ones you can skip.

## Laravel 13 release date, PHP version and support

| | Laravel 12 | Laravel 13 |
| --- | --- | --- |
| Released | February 24, 2025 | March 17, 2026 |
| PHP versions | 8.2 to 8.5 | 8.3 to 8.5 |
| Bug fixes until | August 13, 2026 | Q3 2027 |
| Security fixes until | February 24, 2027 | March 17, 2028 |

Laravel gives every major release 18 months of bug fixes and two years of security fixes. Look at the Laravel 12 row: bug fixes ended in August 2026. If you're reading this in late 2026, a Laravel 12 app only gets security patches now, so the upgrade is no longer optional for long.

The Laravel 13 PHP version requirement is the one change most likely to block you. PHP 8.2 is out. Check your servers, your CI image and your Docker base image before you touch `composer.json`.

## What's new in Laravel 13

### Laravel AI SDK

The Laravel AI SDK is a first-party package (`composer require laravel/ai`) with one API for text generation, tool-calling agents, embeddings, images, audio and vector stores, across providers. An agent is a class you prompt:

```php
use App\Ai\Agents\SalesCoach;

$response = SalesCoach::make()->prompt('Analyze this sales transcript...');

return (string) $response;
```

Embeddings work straight from a string:

```php
use Illuminate\Support\Str;

$embeddings = Str::of('Napa Valley has great wine.')->toEmbeddings();
```

It's a separate package, so it doesn't change your app until you install it.

### Semantic and vector search

The query builder can now search by vector similarity. Per the query builder docs, this works on PostgreSQL with the `pgvector` extension and on MariaDB 11.7 or later:

```php
$documents = DB::table('documents')
    ->whereVectorSimilarTo('embedding', 'Best wineries in Napa Valley')
    ->limit(10)
    ->get();
```

Notice the second argument is plain text. When you pass a string, Laravel generates the embedding for it through the AI SDK. You can also pass an embedding you already have, plus a `minSimilarity` threshold.

### JSON:API resources

There's now a `JsonApiResource` class that produces responses following the JSON:API spec, including relationships, sparse fieldsets, includes, links and the `application/vnd.api+json` content type. Generate one with a flag:

```bash
php artisan make:resource PostResource --json-api
```

```php
use Illuminate\Http\Resources\JsonApi\JsonApiResource;

class PostResource extends JsonApiResource
{
    public $attributes = ['title', 'body', 'created_at'];

    public $relationships = [
        // ...
    ];
}
```

If your public API had a hand-rolled JSON:API layer or used a package for it, this is worth a look.

### PHP attributes across the framework

Laravel 13 adds attributes as an alternative to properties and method calls in many places. Controllers get `#[Middleware]` and `#[Authorize]`:

```php
use Illuminate\Routing\Attributes\Controllers\Authorize;
use Illuminate\Routing\Attributes\Controllers\Middleware;

#[Middleware('auth')]
class CommentController
{
    #[Middleware('subscribed')]
    #[Authorize('create', [Comment::class, 'post'])]
    public function store(Post $post)
    {
        // ...
    }
}
```

Queued jobs get `#[Tries]`, `#[Backoff]`, `#[Timeout]` and `#[FailOnTimeout]`:

```php
use Illuminate\Queue\Attributes\Backoff;
use Illuminate\Queue\Attributes\Timeout;
use Illuminate\Queue\Attributes\Tries;

#[Tries(5)]
#[Backoff([1, 5, 10])]
#[Timeout(120)]
class ProcessPodcast implements ShouldQueue
{
    // ...
}
```

Eloquent models get attributes such as `#[Table]`, `#[Fillable]` and `#[Hidden]`. The old properties still work, so nothing forces you to switch. We like attributes for job settings, because they sit right above the class name where you look first.

### Queue routing by class

`Queue::route()` lets you decide in one place which connection and queue a job uses, instead of calling `onQueue()` at every dispatch:

```php
use Illuminate\Support\Facades\Queue;

public function boot(): void
{
    Queue::route(ProcessPodcast::class, connection: 'redis', queue: 'podcasts');
    Queue::route(RequiresVideo::class, queue: 'video');
}
```

You can also route by interface, trait or parent class, which is the nice part: every job that implements an `Import` interface can go to the `imports` queue.

### Cache::touch()

Extends the TTL of an existing cache item without reading and rewriting its value:

```php
Cache::touch('dashboard.stats', 3600);
Cache::touch('dashboard.stats', now()->addHours(2));
```

It returns `false` if the key doesn't exist, so it won't create anything by accident.

### Request forgery protection

The CSRF middleware is now `PreventRequestForgery`. Before it checks the token, it looks at the browser's `Sec-Fetch-Site` header and lets same-origin requests through. Requests without that header (older browsers, or plain HTTP, since browsers only send it over HTTPS) fall back to the normal token check. You can configure it in `bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->preventRequestForgery(allowSameSite: true);
})
```

`allowSameSite: true` accepts requests from other subdomains of your site, and `originOnly: true` drops the token fallback entirely.

## Laravel 13 breaking changes that actually bite

Most items in the upgrade guide are rated low or very low impact. These are the ones we'd check in any app.

| Change | Impact | What to do |
| --- | --- | --- |
| Dependency versions | High | Update `composer.json` (checklist below) |
| `VerifyCsrfToken` renamed to `PreventRequestForgery` | High | Replace references, especially `withoutMiddleware([VerifyCsrfToken::class])` in tests. The old names are deprecated aliases for now |
| Cache `serializable_classes` defaults to `false` | Medium | If you cache PHP objects, list their classes in `config/cache.php`, or cache arrays instead |
| `upsert()` with an empty `uniqueBy` | Medium | Now throws `InvalidArgumentException`, even on MySQL and MariaDB |
| Session `serialization` is `json` in the new skeleton | Low | Switching from `php` logs every user out. Keep `php` if that's a problem |
| Cache prefix and session cookie defaults use hyphens | Low | Only if you rely on the framework defaults; set `CACHE_PREFIX`, `REDIS_PREFIX` and `SESSION_COOKIE` to keep the old names |
| Domain routes match before non-domain routes | Low | Review apps that mix `Route::domain()` with catch-all routes |
| `JobAttempted::$exceptionOccurred` is now `$exception` | Low | Update queue event listeners |
| `QueueBusy::$connection` is now `$connectionName` | Low | Update listeners |
| `symfony/polyfill-php85` defines `array_first()` and `array_last()` | Low | Use `Arr::first()` if you have old global helpers with those names |
| Eager-loaded relations restored on unserialized model collections | Low | Check jobs that relied on relations being absent |
| Default password reset subject is "Reset your password" | Very low | Update tests that assert the old subject |

The cache one deserves a second look. If something in your app caches an object (a DTO, a Data object, a value object, even a Carbon date), it'll stop coming back as that object after you sync `config/cache.php` with the new skeleton. That's a security hardening against deserialization attacks if your `APP_KEY` leaks, and we'd keep it. Just find those cache calls first.

## Laravel 13 upgrade checklist from Laravel 12

1. Run PHP 8.3 or newer everywhere: local, CI, staging, production, queue workers.
2. Update `composer.json`:

   ```json
   "require": {
       "php": "^8.3",
       "laravel/framework": "^13.0",
       "laravel/tinker": "^3.0"
   },
   "require-dev": {
       "laravel/boost": "^2.0",
       "phpunit/phpunit": "^12.0",
       "pestphp/pest": "^4.0"
   }
   ```

3. Check every other package supports Laravel 13 (`composer why-not laravel/framework 13.0` helps), then run `composer update`.
4. Search for `VerifyCsrfToken` and `ValidateCsrfToken` and replace them with `PreventRequestForgery`.
5. Search for cached objects and decide on `serializable_classes`.
6. Decide on session `serialization` before you deploy, not after your users get logged out.
7. Search for `upsert(` calls with an empty `uniqueBy`, listeners for `JobAttempted` and `QueueBusy`, and any global `array_first` helpers.
8. Compare your config files with the `laravel/laravel` skeleton using GitHub's [12.x...13.x compare view](https://github.com/laravel/laravel/compare/12.x...13.x). Take what you need.
9. Update the Laravel installer with `composer global update laravel/installer`, or update Herd.
10. Run your test suite and click through the app with a queue worker running.

If you use [Laravel Boost](/blog/laravel-boost-ai-agents.html), the upgrade guide offers a shortcut: with Boost `^2.0` installed in a Laravel 12 app, run the `/upgrade-laravel-v13` slash command in Claude Code, Cursor, OpenCode, Gemini or VS Code and the agent walks through these steps. Laravel Shift also automates upgrades if you'd rather pay for it.

## What matters if you run a SaaS

Not every feature changes your week. For a multi-tenant SaaS, these are the ones we'd care about.

**Queue routing.** SaaS apps tend to have a few heavy job types (imports, exports, report generation) that should never block the emails and notifications queue. `Queue::route()` with an interface puts that rule in one place, so a new import job can't land on the default queue because someone forgot `onQueue()`. If you're on a database per tenant, the tenant still travels with the job as before; our [multi-tenant queues guide](/blog/laravel-multi-tenant-queues.html) covers that part.

**Job attributes.** `#[Tries]`, `#[Backoff]` and `#[Timeout]` on the class make retry behaviour visible in code review. For jobs that call payment providers or external APIs, that's where we want to see it.

**The CSRF change on subdomains.** Tenant-per-subdomain apps live on several origins. Same-origin form posts within one tenant's subdomain pass the `Sec-Fetch-Site` check. If something posts across subdomains (a central login form submitting to a tenant, for example), it falls back to the token check, or you opt in with `allowSameSite: true`. Know which one you're relying on before you tighten it with `originOnly`.

**Cache hardening.** Multi-tenant apps cache a lot per tenant: settings, permissions, dashboard numbers. The `serializable_classes` default is the change most likely to break something quietly after the upgrade.

**Session serialization.** Logging out every user of every tenant on deploy day generates support tickets. Plan the switch to `json` on purpose.

**Controller attributes.** `#[Authorize]` and `#[Middleware]` move permission checks next to the method. In apps with many roles, we find that easier to audit than a long route file.

The AI SDK and vector search are the biggest additions, but they only matter if you're building AI features. You can upgrade without touching them.

## Mistakes we've seen during Laravel 13 upgrades

**Upgrading the framework before PHP.** Composer will refuse, but only after you've spent time on it. Upgrade PHP first, deploy, then upgrade Laravel.

**Copying the new skeleton config wholesale.** `config/session.php` and `config/cache.php` both changed defaults that affect live users. Merge them line by line.

**Leaving `VerifyCsrfToken` in tests.** It still works as a deprecated alias, so nothing fails today. It will when the alias goes away. Fix it while you're in there.

**Forgetting queue workers.** Workers keep the old code in memory. Restart them after the deploy with `php artisan queue:restart`, or the first jobs after the upgrade run on Laravel 12 code.

## Frequently asked questions

### When was Laravel 13 released?

Laravel 13 was released on March 17, 2026. It gets bug fixes until Q3 2027 and security fixes until March 17, 2028, according to the support table in the official release notes.

### What PHP version does Laravel 13 require?

Laravel 13 requires PHP 8.3 or newer and supports PHP 8.3, 8.4 and 8.5. Apps still on PHP 8.2 need a PHP upgrade before they can move to Laravel 13.

### How long does it take to upgrade from Laravel 12 to Laravel 13?

The official upgrade guide estimates 10 minutes, and for most apps the real work is updating dependencies and the CSRF middleware name. Budget extra time if you cache PHP objects, rely on framework default cache or session names, or have custom queue event listeners.

### Is Laravel 13 a big breaking release?

No. The release notes say the team focused on keeping breaking changes to a minimum, and most items in the upgrade guide are rated low impact. The high-impact items are the dependency updates and the renamed CSRF middleware.

## Laravel 13 in the SaaS Laravel kits

The [SaaS Laravel starter kits](/) already run Laravel 13: `composer.json` requires `laravel/framework` `^13.35`, `laravel/boost` `^2.10` and `laravel/tinker` `^3.0`, with Pest 5 for tests. The kits need PHP `^8.4`, one step above Laravel 13's minimum, as listed in the [requirements](/docs/getting-started/requirements.html). They already use the new defaults: `config/cache.php` sets `serializable_classes` to `false`, `config/session.php` uses `json` serialization, the `User` model uses the `#[Fillable]` and `#[Hidden]` attributes, and nothing references the old `VerifyCsrfToken` class. Tenant routing is done by stancl/tenancy middleware rather than `Route::domain()`, so the new domain route precedence doesn't change anything there. The kits don't ship the AI SDK, JSON:API resources or `Queue::route()` rules; you'd add those to the module that needs them. If you bought an earlier version, [updating your kit from upstream](/blog/update-laravel-starter-kit-git-upstream.html) explains how to pull in changes.

<BlogPostCta title="Start on Laravel 13 today" text="SaaS Laravel ships a multi-tenant Laravel 13 backend on PHP 8.4 with Vue, React or Svelte and Inertia v3." />
