---
title: "Central & Tenant Databases"
description: "Central and tenant databases in the kits: migrations, seeders, tenant database naming, what drops a tenant database and the key tables in each."
head:
  - - link
    - rel: canonical
      href: https://saas-laravel.com/docs/core/database.html
  - - meta
    - property: og:title
      content: "Central & Tenant Databases"
  - - meta
    - property: og:description
      content: "Central and tenant databases in the kits: migrations, seeders, tenant database naming, what drops a tenant database and the key tables in each."
  - - meta
    - property: og:url
      content: https://saas-laravel.com/docs/core/database.html
  - - meta
    - name: twitter:title
      content: "Central & Tenant Databases"
  - - meta
    - name: twitter:description
      content: "Central and tenant databases in the kits: migrations, seeders, tenant database naming, what drops a tenant database and the key tables in each."
---

# Database

The kits use two kinds of database on the same server. Each tenant gets its own database, so tenant data is physically separate and one tenant can't query another tenant's rows.

| | Central database | Tenant database |
| --- | --- | --- |
| Name | `DB_DATABASE` | `tenant<id>`, one per tenant |
| Holds | Tenants, domains, central users, global settings, the queue | That tenant's users, roles, menus and sessions |
| Migrations | `database/migrations` | `database/migrations/tenant` |
| Seeder | `DatabaseSeeder` | `tenant\TenantDatabaseSeeder` |

## Migrations

Central and tenant migrations live in different folders and run with different commands.

| Folder | Runs on | Command |
| --- | --- | --- |
| `database/migrations` | Central database | `php artisan migrate` |
| `database/migrations/tenant` | Every tenant database | `php artisan tenants:migrate` (also runs automatically when a tenant is created) |

::: warning Put migrations in the right folder
A migration in `database/migrations` never reaches the tenant databases, and it works the same the other way round. Tables that both contexts need (users, menus, permissions, cache, jobs) exist in both folders.
:::

For example, to add a tenant table:

```bash
php artisan make:migration create_projects_table --path=database/migrations/tenant
php artisan tenants:migrate
```

There are a few more tenant commands. Each one accepts `--tenants=<id>` if you only want to target specific tenants:

| Command | Does |
| --- | --- |
| `tenants:rollback` | Roll back tenant migrations |
| `tenants:migrate-fresh` | Drop and re-run tenant migrations |
| `tenants:seed` | Run the tenant seeder |
| `tenants:list` | List tenants |
| `tenants:run` | Run any artisan command per tenant |

The tenant migration path comes from `migration_parameters` in `config/tenancy.php`.

## Seeders

| Seeder | Context | Calls |
| --- | --- | --- |
| `Database\Seeders\DatabaseSeeder` | Central (`php artisan db:seed`) | `RoleSeeder`, `PermissionSeeder`, `MenuSeeder`, `DefaultUserSeeder` |
| `Database\Seeders\tenant\TenantDatabaseSeeder` | Tenant (`tenants:seed`, tenant creation) | `tenant\RoleSeeder`, `PermissionSeeder`, `tenant\MenuSeeder`, `DefaultUserSeeder` |

`RoleSeeder` and `PermissionSeeder` work in both contexts. They check `tenancy()->initialized` to pick the guard (`web` or `tenant`) and the permission folder. For what ends up in the database, see [Local development → Seeded data](/docs/getting-started/local-development#seeded-data).

## Tenant database naming

stancl builds each tenant database name from prefix + tenant id + suffix. Tenant IDs are auto-increment integers (`App\Models\Tenant`), so you get `tenant1`, `tenant2` and so on.

| Key in `config/tenancy.php` | Vue, Svelte | React |
| --- | --- | --- |
| `database.prefix` | `'tenant'` | `env('TENANCY_DB_PREFIX', 'tenant')` |
| `database.suffix` | `''` | `''` |

::: warning Sharing a MySQL server
If two apps on one server use the same prefix, both will try to create `tenant1`. Pick a unique prefix per app (for example `acme_tenant`) **before** the first tenant is created. In the React kit, set `TENANCY_DB_PREFIX`. In Vue and Svelte, edit `config/tenancy.php`.
:::

What drops a tenant database, and what doesn't:

| Action | Tenant database |
| --- | --- |
| Delete a tenant in the UI | Dropped (`TenantDeleted` → `DeleteDatabase`) |
| `migrate:fresh` on the central database | **Not** dropped |

## Key tables

### Central

| Table | Model | Notes |
| --- | --- | --- |
| `users` | `App\Models\User` | Includes `locale`, `invited_at`, 2FA columns |
| `tenants` | `App\Models\Tenant` | `first_name`, `last_name`, `email`, `phone`, `company`, `team_size` + `data` JSON (industry, status, work week, ...) |
| `domains` | `App\Models\Domain` | `domain` (unique), `tenant_id`, `is_primary`, `locale`, `app_name`, `auth_features` JSON |
| `menus` | `App\Models\Menu` | Central navigation |
| `layout_settings` | `App\Models\LayoutSetting` | `user_id = null` row is the global default |
| `settings` | `App\Models\Setting` | Key/JSON value store (e.g. `tenant_maintenance`) |
| `roles`, `permissions`, `model_has_*`, `role_has_permissions` | spatie | Guard `web` |
| `passkeys` | Fortify | |
| `sessions`, `cache`, `cache_locks`, `password_reset_tokens` | Laravel | |
| `jobs`, `job_batches`, `failed_jobs` | Laravel | Used by all tenants (see [Configuration](/docs/getting-started/configuration#config-queue-php)) |

### Tenant

| Table | Notes |
| --- | --- |
| `users`, `password_reset_tokens`, `sessions` | Tenant accounts |
| `passkeys` | |
| `menus`, `layout_settings` | Tenant navigation and layouts |
| `roles`, `permissions`, pivots | Guard `tenant` |
| `cache`, `cache_locks` | |
| `jobs`, `job_batches`, `failed_jobs` | Created, but the queue writes to the central connection |

## Testing database

Tests never touch MySQL. `phpunit.xml` uses SQLite in memory (`DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`), and Pest applies `RefreshDatabase` to `tests/Feature`. There's more in [Testing](/docs/core/testing).
