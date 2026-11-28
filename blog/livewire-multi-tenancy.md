---
title: "Livewire Multi Tenancy with stancl/tenancy: A Setup Guide"
description: "Livewire multi tenancy with stancl/tenancy v3: make the update and upload routes tenant-aware, plus assets, wire:navigate, queued jobs, Pest tests and Flux."
pageClass: blog-page
date: 2026-11-11
author: annu-gupta
category: frontend
tags: [Livewire, Multi-tenancy]
---

# Livewire Multi Tenancy with stancl/tenancy v3: Subdomains, Uploads and Tests

<BlogPostMeta />

**Short answer:** Livewire multi tenancy works well with stancl/tenancy, but every Livewire request has to run your tenancy middleware, not just the first page load. Either register Livewire's update route yourself with `Livewire::setUpdateRoute()` and add the tenancy middleware (plus the upload routes), or initialize tenancy in a global middleware for every non-central host. After that, check assets, `wire:navigate` links between hosts, queued jobs and your tests.

Here's a situation that shows up in forum threads all the time. You've set up stancl/tenancy, `acme.yourapp.test` loads the dashboard, the right company name is in the header, and everything looks perfect. Then someone clicks Save on a Livewire form, and you get a 419 "Page Expired", a 404, or worse, the record quietly lands in the wrong database.

Nothing is wrong with your component. The page ran inside the tenant, but the click didn't. This guide covers a Laravel Livewire multi tenant setup on Laravel 13, Livewire 4 and stancl/tenancy v3, with a database per tenant and tenants on subdomains, including how our own Livewire kit wires it. If you haven't installed tenancy yet, start with our [stancl/tenancy tutorial](/blog/stancl-tenancy-tutorial.html).

## Why Livewire breaks under stancl/tenancy

A Livewire page makes two kinds of requests. The first is a normal GET to your route, say `/invoices`, which goes through whatever middleware you put on that route. If it sits in a tenant route group with `InitializeTenancyByDomain`, tenancy starts, the database switches, and the page renders with the tenant's data.

Every interaction after that is a POST to Livewire's own endpoint. In Livewire 4 that's `/livewire-{hash}/update`, where the hash comes from your `APP_KEY`. Livewire registers this route itself, with the `web` group and its own header check. Your tenancy middleware isn't on it.

So the update request runs in the central context. What happens next depends on your setup:

- With database sessions, the session was written to the tenant database on page load, but the update request looks in the central one. No session means no CSRF token, so you get a 419.
- With file sessions, the session survives, but queries now hit the central database. A model property such as `public Invoice $invoice` fails to rehydrate (a 404), or a `save()` writes to central tables.
- The tenant guard has no logged-in user, so auth middleware may send the user to the login page.

There are two clean ways to fix it.

## Fix 1: make Livewire's update route tenant-aware

This is the approach in stancl's [Livewire integration docs](https://tenancyforlaravel.com/docs/v3/integrations/livewire). You take over the update route with `Livewire::setUpdateRoute()` and add the tenancy middleware to it. In Livewire 4 the callback also receives `$path`, the hash-based path, so keep it rather than hard-coding `/livewire/update` like the older Livewire 3 example does:

```php
// app/Providers/TenancyServiceProvider.php, inside boot()
use Illuminate\Support\Facades\Route;
use Livewire\Livewire;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;

Livewire::setUpdateRoute(function ($handle, $path) {
    return Route::post($path, $handle)->middleware([
        'web',
        'universal',
        InitializeTenancyByDomain::class,
    ]);
});
```

The `universal` flag matters if Livewire also runs on your central domain (sign-up, a super admin area). It comes from stancl's universal routes feature: uncomment `Stancl\Tenancy\Features\UniversalRoutes::class` in `config/tenancy.php` and register an empty group with `$middleware->group('universal', [])` in `bootstrap/app.php`. Requests on a central host then skip tenancy instead of failing.

We use `InitializeTenancyByDomain` here because we store full hostnames like `acme.yourapp.test` on the domain records. If you store only `acme`, use `InitializeTenancyBySubdomain` instead.

## Fix 2: initialize tenancy for every tenant host

The Livewire kit takes a different route. Instead of patching Livewire's routes one by one, it prepends a small global middleware that checks the host on every request:

```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->prepend(InitializeTenancyIfTenantDomain::class);
})
```

```php
// app/Http/Middleware/InitializeTenancyIfTenantDomain.php (trimmed)
public function handle(Request $request, Closure $next): Response
{
    if (in_array($request->getHost(), config('tenancy.central_domains', []), true)) {
        auth()->shouldUse('web');

        return $next($request);
    }

    return $this->initializeTenancyByDomain->handle($request, $next);
}
```

Global middleware runs before routing. So the update endpoint, the upload and preview endpoints, and anything else Livewire or Flux registers all run in the right tenant without any special setup. An unknown subdomain throws stancl's `TenantCouldNotBeIdentifiedException`, which the kit turns into a 404 in `bootstrap/app.php`.

Here's how the two approaches compare:

| | `setUpdateRoute()` + upload config | Global middleware |
| --- | --- | --- |
| Livewire update requests | Covered once you set the route | Covered |
| File uploads and previews | Need their own middleware config | Covered |
| Route files | Separate central and tenant groups | Shared by default |
| What you must remember | Every new Livewire endpoint | Guarding central-only and tenant-only routes |

The catch with the global approach is that routes are shared by default. The kit guards central-only pages (tenant management, for example) with a `central.only` middleware and tenant-only pages with stancl's `PreventAccessFromCentralDomains`. Forget that on a new route and the other side can reach it. We still prefer it: one rule to remember instead of several Livewire endpoints.

## Persistent middleware: the second gotcha

Once tenancy works, there's a quieter problem. Your page route might have `auth` and `permission:View Invoices` on it. The update request doesn't go through that route, so Livewire re-applies the original route's middleware itself, but only middleware on its persistent list.

The default list includes Laravel's own `Authenticate` and `Authorize`. If you alias `auth` to your own class, or use Spatie's permission middleware, Livewire won't re-run them on clicks unless you add them. The kit does this in `AppServiceProvider`:

```php
Livewire::addPersistentMiddleware([
    TenancyAwareAuthenticate::class,
    PreventAccessFromTenantDomains::class,
    PermissionMiddleware::class,
]);
```

Without it, someone whose permission you just revoked can keep pressing buttons on a page they already had open. We still check permissions inside each action too, and mark IDs the browser shouldn't change with `#[Locked]`.

## File uploads under tenancy

With the `WithFileUploads` trait, a picked file goes straight to `/livewire-{hash}/upload-file` (throttled to 60 a minute by default) and previews come from `/livewire-{hash}/preview-file/{filename}`. Both are separate routes, so with Fix 1 they need tenancy too. stancl's docs show both settings:

```php
// config/livewire.php (php artisan livewire:publish --config)
'temporary_file_upload' => [
    'middleware' => ['throttle:60,1', 'universal', InitializeTenancyByDomain::class],
],
```

```php
// a service provider's boot()
use Livewire\Features\SupportFileUploads\FilePreviewController;

FilePreviewController::$middleware = ['web', 'universal', InitializeTenancyByDomain::class];
```

With the global middleware, you can skip both.

Next, where do temporary files go? Livewire stores them on your default disk (or `LIVEWIRE_TEMPORARY_FILE_UPLOAD_DISK`) in `livewire-tmp/`. If that disk is listed in `tenancy.filesystem.disks`, stancl's filesystem bootstrapper gives it a per-tenant root, so temporary files end up under something like `storage/tenant{id}/app/livewire-tmp`, away from other tenants. If you move temporary uploads to S3, add that disk to the list too. Our post on [tenant-aware cache and file storage](/blog/laravel-tenant-cache-filesystem.html) covers the bootstrapper in more detail.

One honest note: the Livewire kit doesn't ship an upload component today. When you add one, the global middleware already covers the tenancy part.

## Assets on tenant subdomains

The kit's `config/tenancy.php` has `asset_helper_tenancy` turned on. That means `asset()` on a tenant host points at stancl's tenant asset route, which serves that tenant's files, not your `public/` folder. It's a common surprise: `asset('images/logo.svg')` works on the central domain and breaks on `acme.yourapp.test`.

- Vite assets are fine. The kit enables stancl's `ViteBundler` feature, which makes `@vite` use `global_asset()`.
- Livewire's and Flux's JavaScript URLs are built with `url()` (even published Livewire assets), so they load from whatever subdomain you're on.
- For files in `public/`, use `global_asset()` or a plain absolute path. The kit's head partial uses `/favicon.svg` directly.
- For a tenant's own uploads, use `tenant_asset()`.

## wire:navigate and tenant-aware URLs

`wire:navigate` fetches the next page with a normal GET to the same host, so it goes through your routes and middleware like any page load. Inside one workspace, use it everywhere. The kit puts it on the sidebar, breadcrumbs and settings links.

Links that leave the current host are different. With `SESSION_DOMAIN=null`, the session cookie belongs to one host, so `acme.yourapp.test` and the central domain have separate sessions. Use plain links for "go to my workspace" or for jumping between workspaces, and let the browser do a full load.

Two more things change between hosts:

- **Browser storage.** `localStorage` is per origin, so Flux's appearance setting (`flux.appearance`) is remembered per subdomain. Choosing dark mode in one workspace won't carry over to another.
- **Scripts.** Code that should run on every visit belongs in a `livewire:navigated` listener, not `DOMContentLoaded`. Anything wrapped in `@persist` (the kit persists its Flux toast group) survives navigation.

For URLs, `route('invoices.index')` inside a tenant request uses the current host, so it points at the right subdomain. Queued jobs, console commands and the central admin have no tenant host, though. There you have to build the URL from the stored domain. The kit's `TenantService::urlOnDomain()` takes the scheme from `APP_URL` and the tenant's primary domain. Our [Laravel multi-tenancy with subdomains](/blog/laravel-multi-tenancy-subdomains.html) post goes deeper on domains.

## Queued jobs dispatched from components

Say your invoicing app has a "Send reminders" button that dispatches a job from a Livewire action. With stancl's `QueueTenancyBootstrapper` enabled (it is in the kit), a job dispatched inside a tenant remembers that tenant, and tenancy starts again before the worker runs it.

The trap is the jobs table. If you use the `database` queue driver, its connection must point at your central database, or jobs get written into the tenant database where the worker never looks. In the kit, the queue connection uses the central connection name from `DB_CONNECTION`, so jobs stay in the central `jobs` table. The kit's user invitation notification is queued this way.

Inside the job, don't rely on `auth()->user()`, the session or the request. Pass IDs into the constructor and load what you need. [Queued jobs in a multi-tenant Laravel app](/blog/laravel-multi-tenant-queues.html) covers unique jobs, retries and running a job for every tenant.

## Testing Livewire components inside a tenant with Pest

`Livewire::test()` doesn't go through your subdomain, so no middleware sees a tenant host. Start tenancy yourself:

```php
use App\Models\Invoice;
use App\Models\Tenant;
use App\Models\User;
use Livewire\Livewire;

beforeEach(function () {
    $this->tenant = Tenant::create();
    $this->tenant->domains()->create(['domain' => 'acme.yourapp.test']);

    tenancy()->initialize($this->tenant);
});

afterEach(function () {
    tenancy()->end();
    $this->tenant->delete();
});

it('creates an invoice in the tenant database', function () {
    $user = User::factory()->create();

    Livewire::actingAs($user, 'tenant')
        ->test('invoices.create')
        ->set('customer', 'Northwind Ltd')
        ->set('amount', 1200)
        ->call('save')
        ->assertHasNoErrors();

    expect(Invoice::where('customer', 'Northwind Ltd')->exists())->toBeTrue();
});
```

A few things that catch people out:

- `Livewire::actingAs()` takes a guard as its second argument. Use your tenant guard if that's how tenant users log in.
- stancl's docs say you can't use `RefreshDatabase` or in-memory SQLite with multi-database tenancy in automatic mode, because the default connection switches. Delete tenants in `afterEach` so their databases don't pile up.
- `Event::fake()` with no arguments stops tenancy's own events. Fake only the events you care about.
- In tests, Livewire puts temporary uploads on a fake `tmp-for-tests` disk, so upload tests don't touch tenant storage. Use `UploadedFile::fake()->image('logo.png')` with `->set()` as usual.

[Testing multi-tenant Laravel apps with Pest](/blog/test-multi-tenant-laravel-pest.html) has the full setup, including isolation tests that prove one tenant can't see another's data.

## Flux UI notes

Flux works fine under tenancy, because it's just Blade components and one script. A few practical notes:

- `Flux::toast()` and `Flux::modal()` calls in an action come back on the update request. If toasts never show after a save, check that request first.
- The free `livewire/flux` package covers buttons, inputs, modals, dropdowns, toasts and navigation. Pro components such as the date picker, charts, rich text editor and file upload need a paid license. The kit uses the free edition only, so for uploads you'd use a plain `<input type="file" wire:model="logo">`, which goes through the same tenant-aware upload route.
- The kit wraps Flux in its own `x-common.*` components, so pages never use Flux tags directly. If Flux changes, there's one place to update.

## A checklist before you ship

1. Livewire update, upload and preview requests on a tenant host run tenancy (watch a form save in the network tab).
2. Custom auth and permission middleware are registered as persistent middleware.
3. No `asset()` calls for files in `public/`.
4. Cross-host links don't use `wire:navigate`.
5. The `database` queue connection points at the central database.
6. At least one Pest test runs a component inside a real tenant.

The [Laravel multi-tenancy tutorial](/guides/laravel-multi-tenancy-tutorial.html) shows the shared tenancy backend in more depth.

## Frequently asked questions

### Does stancl/tenancy work with Livewire 4?

Yes. stancl/tenancy v3 works with Livewire 4, but you have to make Livewire's own routes tenant-aware. Use `Livewire::setUpdateRoute()` with your tenancy middleware (keeping the `$path` argument), or initialize tenancy in a global middleware for every non-central host.

### Why do I get "419 Page Expired" on Livewire actions in a tenant?

Usually because the update request runs in the central context. The session was stored in the tenant database on page load, the update request looks in the central one, finds no session and fails the CSRF check. Adding tenancy to the update route fixes it.

### How do I make Livewire file uploads work with tenancy?

Add your tenancy middleware to `temporary_file_upload.middleware` in `config/livewire.php` and to `FilePreviewController::$middleware`, or use a global tenancy middleware. Keep the temporary upload disk in `tenancy.filesystem.disks` so each tenant's temporary files stay separate.

### Can the same Livewire component run on central and tenant domains?

Yes. With stancl's universal routes, or a global middleware that only starts tenancy on tenant hosts, a component runs centrally on the central domain and inside the tenant elsewhere. Once the two sides behave differently, split it into two components rather than adding `if (tenant())` checks.

## Livewire multi tenancy in SaaS Laravel

The SaaS Laravel Livewire kit is a [multi-tenant Laravel starter kit](/) built with Livewire 4, Blade and Flux UI, and it comes wired the way this post describes: global tenancy middleware, persistent auth and permission middleware, tenant-aware queues, and `wire:navigate` throughout. It doesn't include an upload component, billing or tenant-aware Livewire tests out of the box, so those parts are still yours to add. The [Livewire kit docs](/docs/livewire.html) show how its modules and components fit together. Still deciding on a frontend? Read [Livewire vs Inertia](/blog/livewire-vs-inertia.html) first.

<BlogPostCta title="Livewire and tenancy, already wired up" text="The Livewire kit gives you stancl/tenancy with a database per tenant, Fortify auth, roles and permissions, and Flux UI, so you can start on your own features." />
