---
title: "Laravel Scout Multi Tenant Search: Shared or Per-Tenant Index"
description: "Laravel Scout multi tenant search with Meilisearch and stancl/tenancy: a shared index with tenant filters and tokens, or one index per tenant, plus reindexing."
pageClass: blog-page
date: 2026-11-04
author: erag
category: multi-tenancy
tags: [Multi-tenancy, Search, Meilisearch]
---

# Laravel Scout Multi Tenant Search: Shared Index or One Index per Tenant

<BlogPostMeta />

Laravel Scout makes full-text search easy: add a trait, run an import, call `Contact::search('acme')`. But Scout has no idea what a tenant is. In a multi-tenant app that's a problem, because one search box must only ever return the current customer's records. With a database per tenant it gets worse: every tenant's `contacts` table starts at ID 1, so a naive setup doesn't just leak results, it overwrites one tenant's documents with another's.

In this post we set up Laravel Scout multi tenant search with Meilisearch and stancl/tenancy. We compare a shared index with a tenant filter against one index per tenant, show how to set a per-tenant Scout prefix that actually works in web requests, queued jobs and Artisan commands, and cover tenant tokens for frontend search, the database driver, Typesense, reindexing every tenant and cleaning up when a tenant is deleted. Meilisearch's own Laravel guide covers a single database with an organization column. Here we also handle database-per-tenant.

## How Scout picks an index

Scout syncs each searchable model to an index. The default name comes from `searchableAs()` in the `Searchable` trait, which is just the configured prefix plus the table name:

```php
// Laravel\Scout\Searchable (Scout 11)
public function searchableAs()
{
    return config('scout.prefix').$this->getTable();
}
```

Two details matter for multi-tenancy. The prefix is read from config **each time** the method runs, not once at boot. And Scout's own commands, like `scout:sync-index-settings` and `scout:delete-index`, resolve model indexes through `indexableAs()`, which calls `searchableAs()`. So if you change `scout.prefix` at runtime, every part of Scout follows. We'll use that below.

## Four ways to do multi tenant search in Laravel

| Approach | Isolation | Works with | Best for |
| --- | --- | --- | --- |
| Shared index + `tenant_id` filter | Filter on every query | Meilisearch, Algolia, Typesense | Many small tenants, one place to tune |
| One index per tenant | Separate index | Meilisearch, Algolia, Typesense | Database-per-tenant apps, easy deletion |
| Scout `database` driver | Tenant's own database | MySQL, PostgreSQL | Small apps, no extra service |
| Typesense with scoped keys | Filter embedded in key | Typesense | Teams already on Typesense |

Meilisearch recommends the shared index. Its [multi-tenancy guide](https://www.meilisearch.com/blog/multi-tenancy-guide) says a large number of indexes degrades performance, especially for multi-index searches, and every settings change has to be applied to each index. That's sound advice for a few thousand tenants. If you have a few hundred tenants with a database each, one index per tenant matches the rest of your isolation and makes deletion trivial. Both work. Pick one per app, not per model.

## Option 1: one shared index with a tenant_id filter

Add the tenant to every document and make it filterable:

```php
final class Contact extends Model
{
    use HasUlids, Searchable;

    /**
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => tenant()->getTenantKey(),
            'name' => $this->name,
            'email' => $this->email,
            'company' => $this->company,
        ];
    }
}
```

```php
// config/scout.php
'meilisearch' => [
    'host' => env('MEILISEARCH_HOST', 'http://localhost:7700'),
    'key' => env('MEILISEARCH_KEY'),
    'index-settings' => [
        Contact::class => [
            'filterableAttributes' => ['tenant_id'],
        ],
    ],
],
```

Run `php artisan scout:sync-index-settings` after changing settings, ideally in your deploy script. Then every query filters:

```php
Contact::search($term)->where('tenant_id', tenant()->getTenantKey())->paginate(20);
```

### Database-per-tenant needs globally unique IDs

Look at the `HasUlids` in the model above. It's not optional here. Meilisearch stores one document per primary key. With auto-increment IDs, tenant A's contact 7 and tenant B's contact 7 are the same document, so whichever was saved last wins, and deleting one deletes the other. Search results are mapped back through `whereIn('id', ...)` on the current tenant's database, so a hit from another tenant can even turn into the wrong local record.

ULID (or UUID) primary keys fix this, because no two tenants ever generate the same ID. If you can't change the primary key, add a unique `search_key` column (like `"{$tenantId}-{$id}"`) and return it from `getScoutKey()` and `getScoutKeyName()`, plus `'string'` from `getScoutKeyType()`, so Scout uses it both in the index and for the database lookup.

### Never forget the filter

One missing `where()` and a customer sees someone else's contacts in a search box. Don't rely on remembering it. Make the scoped search the only one:

```php
use Laravel\Scout\Builder;
use Laravel\Scout\Searchable;

trait TenantSearchable
{
    use Searchable {
        Searchable::search as scoutSearch;
    }

    public static function search($query = '', $callback = null): Builder
    {
        return static::scoutSearch($query, $callback)
            ->where('tenant_id', tenant()->getTenantKey());
    }
}
```

Models use `TenantSearchable` instead of `Searchable`. `tenant()` returns `null` outside a tenant, so this fails loudly in the central context instead of searching across everyone. Good.

### Frontend search with Meilisearch tenant tokens

For instant search, the browser often talks to Meilisearch directly. Never give it a normal search key, because it can search everything. Give it a **tenant token**: a short-lived JWT, signed with a search API key, with the filter baked in. Meilisearch applies the filter to every query made with the token, and the user can't remove it.

```php
final class SearchTokenService
{
    public function forCurrentTenant(): string
    {
        $index = (new Contact)->searchableAs();

        return app(EngineManager::class)->engine('meilisearch')->generateTenantToken(
            config('services.meilisearch.search_key_uid'),
            [$index => ['filter' => 'tenant_id = '.tenant()->getTenantKey()]],
            [
                'apiKey' => config('services.meilisearch.search_key'),
                'expiresAt' => now()->addHour(),
            ],
        );
    }
}
```

If your tenant keys are strings, quote them in the filter (`tenant_id = "acme"`). Scout's Meilisearch engine forwards unknown methods to the Meilisearch PHP client, which has `generateTenantToken($apiKeyUid, $searchRules, $options)`. Use the default search key and its `uid` (from `GET /keys`), not your master key. Share the token as an Inertia prop on the search page, and use it as the API key in Meilisearch's JavaScript client. The details are in Meilisearch's [tenant token guide](https://www.meilisearch.com/docs/capabilities/security/getting_started).

## Option 2: one index per tenant with stancl/tenancy

Now the other approach: `tenant_42_contacts`, `tenant_43_contacts` and so on. Because Scout reads `scout.prefix` at call time, all we need is to set it when tenancy starts and restore it when tenancy ends. stancl/tenancy has exactly the hook for that: a custom bootstrapper.

```php
use Illuminate\Contracts\Config\Repository;
use Stancl\Tenancy\Contracts\TenancyBootstrapper;
use Stancl\Tenancy\Contracts\Tenant;

final class ScoutPrefixBootstrapper implements TenancyBootstrapper
{
    private readonly string $centralPrefix;

    public function __construct(private readonly Repository $config)
    {
        $this->centralPrefix = (string) $config->get('scout.prefix', '');
    }

    public function bootstrap(Tenant $tenant): void
    {
        $this->config->set('scout.prefix', $this->prefixFor($tenant));
    }

    public function revert(): void
    {
        $this->config->set('scout.prefix', $this->centralPrefix);
    }

    public function prefixFor(Tenant $tenant): string
    {
        return $this->centralPrefix.'tenant_'.$tenant->getTenantKey().'_';
    }
}
```

Register it in `config/tenancy.php`:

```php
'bootstrappers' => [
    Stancl\Tenancy\Bootstrappers\DatabaseTenancyBootstrapper::class,
    Stancl\Tenancy\Bootstrappers\CacheTenancyBootstrapper::class,
    Stancl\Tenancy\Bootstrappers\FilesystemTenancyBootstrapper::class,
    Stancl\Tenancy\Bootstrappers\QueueTenancyBootstrapper::class,
    App\Tenancy\ScoutPrefixBootstrapper::class,
],
```

stancl registers every bootstrapper as a singleton, so the instance that saved the central prefix is the one that restores it. Keeping the central prefix in front (for example `SCOUT_PREFIX=prod_`) lets staging and production share one Meilisearch server. The trailing underscore matters too: without it, `tenant_4` would be a prefix of `tenant_42`.

That one class covers all the places a model gets indexed:

- **Web requests.** Tenancy initializes from the domain, so `Contact::search()` hits `tenant_42_contacts`.
- **Queued Scout jobs.** The queue bootstrapper restores the tenant before the job runs, our bootstrapper runs with it, and the job writes to the right index.
- **Artisan commands.** `tenants:run` initializes each tenant in turn, so `scout:import` and `scout:sync-index-settings` act on that tenant's indexes.

No filter is needed in queries, and the ID collision problem disappears, because each tenant's IDs live in their own index. If a model overrides `searchableAs()`, keep the prefix in it, or that model silently goes back to one shared index:

```php
public function searchableAs(): string
{
    return config('scout.prefix').'people';
}
```

### Settings and tokens for per-tenant indexes

`index-settings` in `config/scout.php` are keyed by model class, so they apply to every tenant's index. Meilisearch creates an index the first time a document is added, but without your settings. Sync settings for a new tenant right after it's created, for example as a step in stancl's `TenantCreated` job pipeline that runs `$tenant->run(fn () => Artisan::call('scout:sync-index-settings'))`. For existing tenants, run it through `tenants:run` (below).

Tenant tokens get simpler too. Search rules accept index patterns, so a token that can only see one tenant's indexes needs no filter at all:

```php
$prefix = app(ScoutPrefixBootstrapper::class)->prefixFor(tenant());

$rules = [$prefix.'*' => (object) []];
```

The `(object)` cast matters: an empty PHP array would be sent as `[]`, not `{}`.

## Option 3: the database driver for small apps

If you have a few thousand records per tenant and don't want to run another service, use Scout's `database` driver (`SCOUT_DRIVER=database`). It searches your tables directly with `LIKE` and full-text queries, supports MySQL and PostgreSQL, and needs no indexing step. In a database-per-tenant app it's isolated for free: the query runs on the tenant's own connection.

```php
use Laravel\Scout\Attributes\SearchUsingFullText;
use Laravel\Scout\Attributes\SearchUsingPrefix;

#[SearchUsingPrefix(['email'])]
#[SearchUsingFullText(['notes'])]
public function toSearchableArray(): array
{
    return ['name' => $this->name, 'email' => $this->email, 'notes' => $this->notes];
}
```

`SearchUsingFullText` needs a full-text index on the column in your tenant migration. You lose typo tolerance and relevance ranking, but you can switch to Meilisearch later without changing your `search()` calls. `searchableAs()` and the prefix have no effect with this driver.

## A note on Typesense

Scout's Typesense driver uses the same `searchableAs()` for collection names, so the per-tenant prefix bootstrapper works unchanged. For a shared collection, Typesense has scoped search API keys: you embed a `filter_by` clause in a key derived from a search key, and users can't override it. That's the same idea as Meilisearch tenant tokens. Remember that Typesense collections need a schema in `config/scout.php`. To change it, either run `scout:flush` and `scout:import` for every tenant or update the collection through Typesense's API.

## Queued indexing in tenant context

Scout recommends a queue for any engine other than `database` and `collection`, so saving a model doesn't wait on an HTTP call to Meilisearch:

```php
// config/scout.php
'queue' => ['connection' => 'redis', 'queue' => 'scout'],
'after_commit' => true,
```

With stancl's `QueueTenancyBootstrapper`, the `MakeSearchable` job carries the tenant ID, and the worker initializes that tenant before it restores the models from the tenant's database. Without the bootstrapper the job would look for contact 7 in the central database. `after_commit` makes sure the job isn't dispatched before the transaction commits. Our post on [multi-tenant queues](/blog/laravel-multi-tenant-queues.html) explains how the tenant travels with a job.

A queued `searchable()` call on a big query splits into chunks, one job per chunk. Give Scout its own queue, so a reindex of a large tenant doesn't delay password reset emails.

## Reindexing all tenants with tenants:run

Commands run in the central context. Wrap Scout's commands in `tenants:run` to run them once per tenant:

```bash
# One index per tenant: safe, each run touches one tenant's index
php artisan tenants:run scout:sync-index-settings
php artisan tenants:run scout:import --argument="model=App\Models\Contact"

# A single tenant
php artisan tenants:run scout:import --tenants=42 --argument="model=App\Models\Contact"
```

With a **shared index**, be careful. `scout:flush` and `scout:import --fresh` call `deleteAllDocuments()` on the index, which wipes every tenant, not just the one you're looping over. Reindex a single tenant by deleting its documents with a filter and importing again:

```php
final class SearchIndexService
{
    public function reindexCurrentTenant(): void
    {
        app(EngineManager::class)->engine('meilisearch')
            ->index((new Contact)->searchableAs())
            ->deleteDocuments(['filter' => 'tenant_id = '.tenant()->getTenantKey()]);

        Contact::makeAllSearchable();
    }
}
```

For a large number of tenants, dispatch one queued job per tenant instead of a long-running `tenants:run`, as described in [multi-tenant scheduled tasks](/blog/laravel-multi-tenant-scheduled-tasks.html).

## Delete a tenant's index when the tenant is deleted

stancl drops the tenant database, but it doesn't know about your search engine. Documents for a deleted customer staying in Meilisearch is a data protection problem. Listen to `DeletingTenant`, while the tenant row still exists:

```php
final class DeleteTenantSearchData
{
    /** @var list<class-string<Model>> */
    private const MODELS = [Contact::class, Deal::class];

    public function handle(DeletingTenant $event): void
    {
        $engine = app(EngineManager::class)->engine();

        // Inside run(), searchableAs() returns this tenant's index names
        $event->tenant->run(function () use ($engine) {
            foreach (self::MODELS as $model) {
                $engine->deleteIndex((new $model)->searchableAs());
            }
        });
    }
}
```

With a shared index, call `deleteDocuments(['filter' => 'tenant_id = ...'])` on each index instead. Don't reach for `scout:delete-all-indexes` in the central context: it deletes every index whose name starts with the current prefix, and in the central context that prefix is empty or your environment prefix. That's all tenants. Our guide to [deleting tenants safely](/blog/delete-tenant-laravel-safely.html) covers the rest of the cleanup.

## Mistakes we see

- **Auto-increment IDs in a shared index.** In database-per-tenant apps they collide. Use ULIDs or a per-tenant index.
- **Filtering in the controller.** Sooner or later someone writes a search without it. Put the filter in the model.
- **A plain search key in the browser.** It can query every tenant. Use tenant tokens or scoped keys.
- **Forgetting the queue bootstrapper.** Queued Scout jobs then read the central database and fail, or index nothing.
- **`--fresh` on a shared index.** It flushes everyone's documents.
- **New tenants without index settings.** Filters and sorting fail until the settings are synced.

## Frequently asked questions

### Does Laravel Scout support multi-tenancy?

Not by itself. Scout has no tenant concept, so you add it: a `tenant_id` field and filter in a shared index, or a per-tenant index prefix set when tenancy initializes. Scout reads `scout.prefix` on every call, which makes the second option a small bootstrapper class.

### Should I use one Meilisearch index per tenant?

Meilisearch recommends one shared index with tenant tokens, because many indexes cost performance and every settings change must be applied to each. One index per tenant is still reasonable for a few hundred tenants with database-per-tenant isolation, and it makes deleting a tenant's data a single call.

### How do I keep queued Scout jobs in the right tenant?

Enable stancl/tenancy's `QueueTenancyBootstrapper`. It stores the tenant ID with each queued job and initializes that tenant before the job runs, so Scout's `MakeSearchable` job loads models from the right database and writes to the right index.

### How do I reindex every tenant in Laravel Scout?

Run `php artisan tenants:run scout:import --argument="model=App\Models\Contact"`. With one index per tenant that's safe. With a shared index, don't use `--fresh` or `scout:flush`, which clear all tenants; delete a tenant's documents by filter and import again instead.

## Adding search to SaaS Laravel

The [SaaS Laravel starter kits](/) don't include search, Scout or Meilisearch, so this is something you'd add. They do give you what the per-tenant approach needs: stancl/tenancy v3 with a database per tenant and `QueueTenancyBootstrapper` already enabled, so queued Scout jobs run for the right tenant out of the box. Tenant IDs are auto-increment integers, which is one more reason we'd go with one index per tenant. We'd add the bootstrapper to `config/tenancy.php`, put a `SearchIndexService` in the module that owns the searchable models, add a `DeletingTenant` listener in `TenancyServiceProvider`, and gate search pages with a tenant permission in `config/permissions/tenant/`. The [multi-tenancy docs](/docs/core/multi-tenancy.html#working-in-tenant-context-from-code) show how to run code in a tenant's context, and the [packages reference](/docs/reference/packages.html) lists what's installed.

<BlogPostCta title="Tenant-aware queues and context, ready for search" text="SaaS Laravel ships stancl/tenancy with a database per tenant and tenant-aware queues, so adding Scout comes down to one bootstrapper and your index settings." />
