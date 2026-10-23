---
title: "Laravel N+1 Query Problem: Find and Fix It"
description: "Fix the Laravel N+1 query problem: catch it with preventLazyLoading and DB::listen, then fix it with eager loading, withCount, chaperone and Inertia props."
pageClass: blog-page
date: 2026-10-24
author: annu-gupta
category: architecture
tags: [Eloquent, Performance]
---

# The Laravel N+1 Query Problem: How to Detect It and Fix It for Good

<BlogPostMeta />

The Laravel N+1 query problem happens when you load a list of models with one query and then run one extra query for every row to fetch a relationship. Ten users in a table means eleven queries. A hundred tenants means a hundred and one. Nothing breaks, the page just gets slower as your customers add data, which is why it so often slips into production.

The fix is almost always eager loading. The hard part is finding the queries in the first place, because Eloquent makes lazy loading invisible: `$user->roles` looks like a property, not a database call. Below we'll go through a real SaaS example, count the queries before and after, set up detection so N+1 queries fail loudly in development, and cover the places they hide in Inertia apps: Data objects, API resources and shared props.

We're using Laravel 13, PHP 8.4, Inertia v3 and spatie/laravel-permission 8.

## What the Laravel N+1 query problem looks like

Take a users page in a SaaS admin. Each row shows the user's name, email and role. Roles come from spatie/laravel-permission, so `roles` is a relationship on the `User` model.

```php
// UserService
public function getUsers(): LengthAwarePaginator
{
    return User::query()->latest()->paginate(10);
}
```

```php
// Building the props
$users->through(fn (User $user) => [
    'id' => $user->id,
    'name' => $user->name,
    'role' => $user->roles->first()?->name,
]);
```

Here's what hits the database for one page of 10 users:

```sql
select count(*) as aggregate from users
select * from users order by created_at desc limit 10 offset 0
select roles.* from roles inner join model_has_roles ... where model_has_roles.model_id = 1 ...
select roles.* from roles inner join model_has_roles ... where model_has_roles.model_id = 2 ...
-- ...8 more, one per user
```

That's 12 queries. The count query and the users query are fine. The other 10 are the "N" in N+1, and their number grows with your page size.

The same thing happens in the central admin of a multi-tenant app. A tenants list that prints each tenant's primary domain runs one `select * from domains where tenant_id = ?` per tenant. Nobody notices with 5 tenants in development. With 50 per page in production, you'll notice.

## Fix it with eager loading

Tell Eloquent which relationships you need, and it [eager loads](https://laravel.com/docs/13.x/eloquent-relationships#eager-loading) them for the whole collection in one query:

```php
return User::query()
    ->with('roles')
    ->latest()
    ->paginate(10);
```

Now the database sees this:

```sql
select count(*) as aggregate from users
select * from users order by created_at desc limit 10 offset 0
select roles.*, model_has_roles.model_id as pivot_model_id, ...
  from roles inner join model_has_roles on ...
  where model_has_roles.model_id in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10) ...
```

Three queries, and it stays three whether the page has 10 rows or 100. That's the whole idea: the number of queries should depend on how many relationships you load, not on how many rows you show.

The tenants list gets the same treatment:

```php
Tenant::query()->with('domains')->latest('id')->paginate(10);
```

## Laravel eager loading, beyond the basics

`with('relation')` covers most cases. These variants cover the rest.

**Several and nested relationships.** Pass an array, and use dot syntax for nested ones:

```php
User::with(['roles', 'permissions'])->get();

// roles, and each role's permissions
User::with('roles.permissions')->get();
```

**Constrained eager loading.** Add conditions to the eager load query with a closure. Only the matching rows are loaded:

```php
Tenant::with([
    'domains' => fn ($query) => $query->where('is_primary', true),
])->get();
```

**Specific columns.** `with('author:id,name')` selects fewer columns. Always include `id` and the foreign key, or the relationship can't be matched back to its parent.

**Lazy eager loading.** Sometimes you already have the collection and only then find out you need a relationship. `load()` eager loads it for the whole collection in one query, and `loadMissing()` skips relationships that are already loaded:

```php
$users = User::all();

if ($request->boolean('with_roles')) {
    $users->load('roles');
}

$user->loadMissing('roles');
```

**Counts and aggregates.** If you only need a number, don't load the rows at all. `withCount` adds a `{relation}_count` attribute with a subquery, and `withExists`, `withSum`, `withAvg`, `withMin` and `withMax` work the same way:

```php
$tenants = Tenant::query()
    ->withCount('domains')
    ->withExists(['domains as has_secondary_domain' => fn ($q) => $q->where('is_primary', false)])
    ->paginate(10);

$tenants->first()->domains_count; // int, no extra query
```

We see `$tenant->domains->count()` in a loop all the time. It loads every domain row for every tenant just to count them. `withCount` is one subquery.

## chaperone() for the child-to-parent N+1

There's a sneakier version. You eager load a tenant's domains, then, inside the loop, each domain reads its tenant:

```php
$tenants = Tenant::with('domains')->get();

foreach ($tenants as $tenant) {
    foreach ($tenant->domains as $domain) {
        echo $domain->tenant->company; // one query per domain
    }
}
```

You already have the tenant in memory, but Eloquent doesn't know that `$domain->tenant` is the same model. `chaperone()` sets the parent on each child as it loads them. You can add it to the `hasMany` definition, or opt in when eager loading:

```php
$tenants = Tenant::with([
    'domains' => fn ($domains) => $domains->chaperone(),
])->get();
```

This comes up in Data objects and resources that build a child's payload from its parent, for example a domain resource that includes the tenant's company name.

## Automatic eager loading in Laravel 12.8 and 13

Laravel 12.8 added automatic relationship loading, and it's in Laravel 13 too. Turn it on globally in `AppServiceProvider`:

```php
use Illuminate\Database\Eloquent\Model;

public function boot(): void
{
    Model::automaticallyEagerLoadRelationships();
}
```

With this on, the first time you access `$user->roles` on any user in a collection, Laravel lazy eager loads `roles` for every user in that collection. The loop from the start of this post drops from 12 queries to 3 without touching the query.

You can also enable it for a single collection:

```php
$users = User::where('is_active', true)->get();

return $users->withRelationshipAutoloading();
```

Should you turn it on globally? We'd say it's a good safety net, but we still write `with()` where we know what we need. An explicit `with()` documents the query in the service class, and it lets you add constraints and select columns. Automatic loading guesses from access, so it can't do either.

## Detect N+1 queries before your users do

Fixing an N+1 is easy once you've seen it. These tools make sure you see it.

### preventLazyLoading

This is the one we'd add to every app. In `AppServiceProvider::boot()`:

```php
use Illuminate\Database\Eloquent\Model;

Model::preventLazyLoading(! $this->app->isProduction());
```

Outside production, any lazy loaded relationship now throws `Illuminate\Database\LazyLoadingViolationException`, with the model and relationship name in the message. Your page breaks in development instead of slowing down in production.

If you want the warning in production too, without breaking pages, log the violation instead of throwing:

```php
Model::preventLazyLoading();

Model::handleLazyLoadingViolationUsing(function (Model $model, string $relation) {
    $class = $model::class;

    info("Attempted to lazy load [{$relation}] on model [{$class}].");
});
```

`Model::shouldBeStrict()` is the stricter bundle: it turns on `preventLazyLoading`, `preventSilentlyDiscardingAttributes` and `preventAccessingMissingAttributes` in one call. It's handy, but the last two can surface a lot of unrelated issues in an existing app, so we'd start with lazy loading alone.

### A Laravel N+1 detector with DB::listen

`preventLazyLoading` only catches relationship access. An N+1 can also come from a plain query inside a loop, like `Invoice::where('user_id', $user->id)->sum('total')`. For those, count queries per request:

```php
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;

if ($this->app->isLocal()) {
    DB::listen(function (QueryExecuted $query) {
        logger()->debug($query->toRawSql(), ['ms' => $query->time]);
    });
}
```

Open a page, read the log, and look for the same SQL repeated with different IDs. That repetition is the signature of an N+1.

### Debugbar and Telescope

[Laravel Debugbar](https://github.com/fruitcake/laravel-debugbar) (the package is now `fruitcake/laravel-debugbar`) shows every query for the current request and how many ran. Install it as a dev dependency with `composer require fruitcake/laravel-debugbar --dev`. Laravel Telescope records the queries for each request too, which helps with Inertia partial reloads and API calls that Debugbar's toolbar doesn't make obvious.

You can also make N+1 regressions fail in CI. Our [Pest testing guide](/blog/laravel-saas-testing-pest.html) covers testing a SaaS app, and a feature test that turns on `preventLazyLoading` and visits your index pages with a few records seeded catches most of them.

## Where N+1 queries hide in Inertia apps

In a Blade app you'd spot the loop in the template. In an Inertia app, the loop happens while you build props, so it's easy to miss.

**Data objects and API resources.** A `UserData::fromModel()` or `UserResource::toArray()` that reads `$user->roles` runs once per row. Either eager load in the service, or make the Data object safe by only reading loaded relationships. spatie/laravel-data has `Lazy::whenLoaded()` for this, and plain resources have `$this->whenLoaded('roles')`:

```php
public static function fromModel(User $user): self
{
    return new self(
        name: $user->name,
        email: $user->email,
        role: $user->relationLoaded('roles') ? $user->roles->first()?->name : null,
        roles: Lazy::whenLoaded('roles', $user, fn () => $user->roles->pluck('name')->all()),
    );
}
```

We cover this pattern in more detail in [Laravel Data objects](/blog/laravel-data-objects.html).

**Accessors and appended attributes.** An accessor such as `getPrimaryDomainAttribute()` that queries `domains`, combined with `$appends`, runs for every model you serialize. Move that work into the query (`withCount`, a subquery select, or an eager load) and read the loaded data in the accessor.

**Shared props.** Everything in `HandleInertiaRequests::share()` is built on every request. If a shared prop loops over models, the N+1 runs on every page in the app. Wrap shared props in closures:

```php
'permissions' => fn () => $request->user()?->getAllPermissions()->pluck('name')->all() ?? [],
```

Be clear about what that buys you. Per the [Inertia partial reload docs](https://inertiajs.com/docs/v3/data-props/partial-reloads), a closure is still evaluated on a normal visit. It's skipped on partial reloads that don't ask for it. For data the page only sometimes needs, `Inertia::optional(fn () => ...)` keeps it out of normal visits entirely. Either way, the closure itself must not contain an N+1, because it still runs on every full page load.

**Permission checks in lists.** spatie/laravel-permission's `getRoleNames()` and `hasRole()` call `loadMissing('roles')` on the single model. In a loop over users without `with('roles')`, that's one query per user. And because `loadMissing()` is an explicit load, not a lazy one, `preventLazyLoading` does **not** catch it. Eager load `roles` (and `permissions` if you use them) in the query that builds the list. Our [Spatie roles and permissions guide](/blog/laravel-roles-permissions-spatie.html) covers the rest of that package.

## Symptom to fix

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Same `select ... where id = ?` repeated once per row | Relationship read in a loop | `with('relation')` in the query |
| `LazyLoadingViolationException` in development | Lazy loading with `preventLazyLoading` on | Add the relationship to `with()` |
| Extra query per row just to show a number | `->relation->count()` in a loop | `withCount('relation')` |
| Child reads its parent, one query per child | Missing inverse hydration | `chaperone()` |
| Collection already loaded, need a relation now | Late decision | `$collection->load()` or `loadMissing()` |
| Queries per row from `getRoleNames()` / `hasRole()` | spatie `loadMissing('roles')` per model | Eager load `roles` in the list query |
| Every page is slow, not one | N+1 inside a shared Inertia prop | Fix the query, wrap the prop in a closure |
| Queries per row from a Data object or resource | Relationship read during serialization | Eager load, then `Lazy::whenLoaded` / `whenLoaded` |

## Gotchas we've run into

**preventLazyLoading ignores single models.** Laravel only flags lazy loading on models that were retrieved as part of a result with more than one row. `User::find(1)->roles` won't throw. That's intentional (a single lazy load isn't an N+1), but it means a test that seeds one record will never trip it. Seed at least two.

**Eager loading too much is its own problem.** `with(['roles.permissions', 'tenant.domains', 'invoices'])` on a list that shows names only loads thousands of rows you throw away. Load what the page renders, nothing more.

**`$with` on the model hides costs.** A `protected $with = ['roles']` property loads roles on every query for that model, including the ones that don't need them. If you use it, remember `without('roles')`.

**Loading after you've mapped.** Put `->with()` before `->paginate()`. If you call `load()` later, call it on the models, not on a collection you've already mapped to arrays or Data objects. By then there's nothing left to eager load onto.

**Queued jobs.** Since Laravel 13, when a collection of models is serialized into a job and restored, its eager-loaded relationships are restored too. If an older job relied on relationships being absent after unserializing, check it.

## Frequently asked questions

### What is the N+1 query problem in Laravel?

It's when your code runs one query to fetch a list of models and then one more query per model to fetch a relationship. Ten rows cost eleven queries. You fix it by eager loading the relationship with `with()`, which loads it for all rows in a single query.

### How do I detect N+1 queries in Laravel?

Add `Model::preventLazyLoading(! $this->app->isProduction())` to `AppServiceProvider`, so lazy loading throws an exception in development. For queries that aren't relationships, use Debugbar, Telescope or a `DB::listen` logger and look for the same SQL repeated with different IDs.

### Does automatic eager loading replace with()?

It removes most accidental N+1 queries, but we wouldn't drop `with()`. Explicit eager loading can add constraints and select specific columns, and it documents what a service actually needs. Treat `automaticallyEagerLoadRelationships()` as a safety net.

### Should I enable preventLazyLoading in production?

Not in throwing mode. Use `preventLazyLoading(! $this->app->isProduction())` so production keeps working, or enable it everywhere with a `handleLazyLoadingViolationUsing` callback that logs instead of throwing.

## N+1 queries in the SaaS Laravel kits

The [SaaS Laravel starter kits](/) keep queries in service and repository classes, which makes them easy to audit. `UserService::getUsers()` in `Modules/User` loads users with `with(['roles', 'permissions'])` before paginating, and `UserData::fromModel()` only reads `roles` and `permissions` when they're loaded (`relationLoaded()` and `Lazy::whenLoaded()`), so the Data object can't trigger lazy loads on its own. The tenants list in `Modules/Tenant` uses `with('domains')`, and the menu tree eager loads `children`. Shared Inertia props such as permissions, menus, layout settings and the notification summary are closures in `HandleInertiaRequests`.

What the kits don't do: `AppServiceProvider` doesn't call `preventLazyLoading()`, `shouldBeStrict()` or `automaticallyEagerLoadRelationships()`. If you want N+1 queries to fail during development, add `Model::preventLazyLoading(! app()->isProduction());` to its `configureDefaults()` method. See [Users, roles & permissions](/docs/core/users-roles-permissions.html) for the module itself, and the [service layer pattern](/blog/laravel-service-layer-pattern.html) for why the queries live where they do.

<BlogPostCta title="Lists that load in three queries" text="SaaS Laravel eager loads roles, permissions and tenant domains in its services, with Vue, React or Svelte on the same Laravel backend." />
