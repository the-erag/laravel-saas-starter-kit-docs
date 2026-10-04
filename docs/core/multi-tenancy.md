---
title: "Laravel Database-per-Tenant Multi-Tenancy"
description: "Database-per-tenant multi-tenancy with stancl/tenancy: identification by domain, the tenant creation pipeline, workspace status and admin invitations."
head:
  - - link
    - rel: canonical
      href: https://saas-laravel.com/docs/core/multi-tenancy.html
  - - meta
    - property: og:title
      content: "Laravel Database-per-Tenant Multi-Tenancy"
  - - meta
    - property: og:description
      content: "Database-per-tenant multi-tenancy with stancl/tenancy: identification by domain, the tenant creation pipeline, workspace status and admin invitations."
  - - meta
    - property: og:url
      content: https://saas-laravel.com/docs/core/multi-tenancy.html
  - - meta
    - name: twitter:title
      content: "Laravel Database-per-Tenant Multi-Tenancy"
  - - meta
    - name: twitter:description
      content: "Database-per-tenant multi-tenancy with stancl/tenancy: identification by domain, the tenant creation pipeline, workspace status and admin invitations."
---

# Multi-tenancy

The kits run stancl/tenancy (`^3.10`) in multi-database mode. Each tenant (workspace) gets **its own database**, and the request's domain tells the app which tenant it's dealing with. Because the data is split at the database level, your tenant code doesn't need `where tenant_id = ...` filters.

```text
vue.test            → central app  (central DB: saas_laravel_vue)
acme.vue.test       → tenant 1     (DB: tenant1)
globex.vue.test     → tenant 2     (DB: tenant2)
```

## Identification

The host of each request decides which context it runs in:

```text
host == APP_DOMAIN              → central app
host found in domains table     → tenancy initialized for that tenant
unknown host                    → 404
```

- `APP_DOMAIN` is the only central domain (`central_domains` in `config/tenancy.php`).
- `InitializeTenancyIfTenantDomain` runs first on every request and passes any non-central host to stancl's `InitializeTenancyByDomain`.
- Tenant domains are always subdomains of `APP_DOMAIN`. If you enter `acme` as the subdomain, it's stored as `acme.vue.test`. See [Domains](/docs/core/domains).

## What is tenant-aware

As soon as a tenant is identified, the bootstrappers in `config/tenancy.php` point these Laravel services at it:

| Bootstrapper | Effect inside a tenant |
| --- | --- |
| `DatabaseTenancyBootstrapper` | Default connection becomes the tenant database |
| `CacheTenancyBootstrapper` | Cache calls are tagged per tenant |
| `FilesystemTenancyBootstrapper` | `local` and `public` disks and `storage_path()` are suffixed per tenant |
| `QueueTenancyBootstrapper` | Jobs remember the tenant and re-initialize it when processed |

The kit also switches the auth guard, Fortify features, app name and locale. [Architecture](/docs/core/architecture#central-vs-tenant-context) explains how.

## Managing tenants

The tenant screens live in `Modules/Tenant` and only exist in the central app (`central.only` middleware):

| Route | Page | Permission |
| --- | --- | --- |
| `GET /tenants` | List with search, status filter and stats (total, active, trial, pending, suspended) | `View Tenants` |
| `GET /tenants/create` | Create form | `Create Tenant` |
| `GET /tenants/{tenant}` | Detail: profile, domains, admin password, invitation | `View Tenants` |
| `PUT /tenants/{tenant}` | Edit | `Edit Tenant` |
| `DELETE /tenants/{tenant}` | Delete (drops the tenant database) | `Delete Tenant` |
| `GET /tenants/domains` | All domains | `View Tenants` |

### Tenant data

Tenants live in the central `tenants` table (`App\Models\Tenant`). A few attributes are real columns, and stancl's virtual columns put the rest in the `data` JSON column. You don't have to care which is which: `$tenant->industry` reads and writes the same way.

| Stored as | Attributes |
| --- | --- |
| Columns | `id`, `first_name`, `last_name`, `email`, `phone`, `company`, `team_size` |
| `data` JSON | `industry`, `registration_number`, `tax_number`, `workspace_status`, `work_week`, `status_message` |

The select options come from enums in `Modules/Tenant/Enums`:

| Enum | Values |
| --- | --- |
| `TeamSizeEnum` | `1-10`, `11-50`, `51-200`, `201-500`, `500+` |
| `IndustryEnum` | `technology`, `fintech`, `healthcare`, `ecommerce`, `agency`, `education`, `other` |
| `WorkWeekEnum` | `mon_fri`, `mon_sat`, `sun_thu` |
| `WorkspaceStatusEnum` | See [Workspace status](#workspace-status) |

## Creating a tenant

When you add a tenant from Tenants → Add Tenant, a single request sets up everything the workspace needs:

```text
TenantController::store()  → validates TenantRegisterData
TenantService::createTenant()
  1. creates the Tenant
  2. creates its primary domain <subdomain>.APP_DOMAIN
  3. sends the invitation, if requested
TenantCreated event        → provisioning pipeline (synchronous)
```

| Pipeline step | Result |
| --- | --- |
| `CreateDatabase` | `CREATE DATABASE tenant<id>` |
| `MigrateDatabase` | Runs `database/migrations/tenant` |
| `SeedDatabase` | Runs `Database\Seeders\tenant\TenantDatabaseSeeder` (roles, tenant permissions, tenant menus, default users) |
| `CreateTenantUserJob` | Creates the tenant admin (tenant's email) with the `super-admin` role and every `tenant` permission |

Deleting a tenant fires `TenantDeleted`, which runs `DeleteDatabase`.

::: details View implementation example
```php
// App\Providers\TenancyServiceProvider::events()
Events\TenantCreated::class => [
    JobPipeline::make([
        Jobs\CreateDatabase::class,
        Jobs\MigrateDatabase::class,
        Jobs\SeedDatabase::class,
        CreateTenantUserJob::class,
    ])->send(fn (Events\TenantCreated $event) => $event->tenant)
      ->shouldBeQueued(false),
],
```
:::

::: warning Queuing the pipeline
The pipeline runs inside the request, so it gets slow once you have a lot of migrations. You can change `shouldBeQueued(false)` to `true`, but then the tenant isn't usable until the worker is done. There's a catch: `CreateTenantUserJob` reads the admin password and the invitation flag from the current request, and a queue worker doesn't have that request. Change the job before you queue it.
:::

## Workspace status

Each tenant has a status, defined in `Modules\Tenant\Enums\WorkspaceStatusEnum`:

| Status | Value | Behaviour |
| --- | --- | --- |
| Active | `active` | Normal access |
| Trial | `trial` | Normal access (label only) |
| Pending Invitation | `pending` | Set automatically when an invitation is sent; becomes `active` when the admin accepts |
| Suspended | `suspended` | Every tenant page renders `auth/Suspended` (HTTP 403) with the optional status message; only logout works |

For what a suspended tenant can and can't do, see [Maintenance & suspension](/docs/core/maintenance-and-suspension).

## Invitations

With an invitation, the tenant admin picks their own password, so you don't have to set one in the create form.

```text
Create tenant with "send invitation" on
  → admin created without a password, workspace = pending
  → queued email with a signed link on the primary domain (/invitation/accept, valid 7 days)
  → admin sets a password (auth/AcceptInvitation)
  → admin is verified and signed in, workspace = active
```

- If a tenant is still pending, you can send the invitation again from the tenant page (`POST /tenants/{tenant}/invitation`, throttled to 3 per minute).
- The email goes through the queue, so you need a [queue worker](/docs/getting-started/local-development#queue-worker) running.

**Related files**: `TenantService::sendInvitation()`, `Modules/Tenant/Notifications/TenantInvitationNotification.php`, `Modules/Tenant/Http/Controllers/TenantInvitationController.php`, `Modules/Tenant/routes/tenant.php`.

## Admin password reset

A central admin with `Edit Tenant` can reset the tenant admin's password from the tenant's domains:

| Option | Route | What happens |
| --- | --- | --- |
| Email a reset link | `POST /tenants/domains/{domain}/password-reset` | Creates a `tenant_users` token and sends `TenantPasswordResetNotification` with a link on that domain |
| Set a password manually | `PUT /tenants/domains/{domain}/password` | Updates the password straight away |

## Working in tenant context from code

In a tenant request, tenancy is already initialized for you. Anywhere else (commands, jobs, central pages), wrap the code in `run()` to execute it for a specific tenant:

```php
$tenant->run(function () {
    User::query()->count(); // tenant database
});

tenancy()->initialized; // true inside a tenant request
tenant();               // current Tenant or null
```

## Tenant migrations and seeders

| What | Location |
| --- | --- |
| Tenant migrations | `database/migrations/tenant` |
| Tenant seeder | `database/seeders/tenant/TenantDatabaseSeeder.php` |

```bash
php artisan tenants:migrate                  # migrate all tenants
php artisan tenants:migrate --tenants=1      # one tenant
php artisan tenants:seed                     # run TenantDatabaseSeeder for all tenants
```

You also get `tenants:list` and `tenants:run <command>`. The [Database](/docs/core/database) page has the details.
